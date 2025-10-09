// apps/api/src/lib/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Prisma, SourceKind, ContentType } from "db";

// ---------- Init ----------
if (!process.env.GEMINI_API_KEY) {
  throw new Error("❌ GEMINI_API_KEY missing in environment.");
}
console.log("🔑 Using Gemini key prefix:", process.env.GEMINI_API_KEY.slice(0, 8));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// ---------- Embeddings ----------
export async function embedText(text: string): Promise<number[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const res = await model.embedContent(text);
    return res.embedding.values as number[];
  } catch (err) {
    console.error("❌ Embedding failed:", err);
    return []; // safe fallback
  }
}

// ---------- Types ----------
export type SourceInput = {
  title: string;
  url: string;
  kind: SourceKind;
  contentType?: string | null;
};

export type GroupedTopics = {
  topics: {
    master: string;
    children: SourceInput[];
  }[];
};

// ---------- Helpers ----------
function stripCodeFences(s: string) {
  // Remove leading/trailing fences and keep inner JSON
  // Handles ```json ... ``` and ``` ... ```
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) return fenced[1].trim();
  return s.trim();
}

async function callGeminiJSON(prompt: string, model: string): Promise<string> {
  const gModel = genAI.getGenerativeModel({ model });

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await gModel.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.9,
          topK: 40,
        },
      });

      const text =
        result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      if (!text) {
        throw new Error(`❌ Empty Gemini response for model ${model}`);
      }

      const cleaned = stripCodeFences(text);

      if (process.env.NODE_ENV !== "production") {
        console.log(
          `🔎 Gemini(${model}) rawLen=${text.length} cleanedLen=${cleaned.length}`
        );
      }

      return cleaned; // ✅ always returns a string
    } catch (err: any) {
      if (attempt === 3) {
        console.error("❌ Gemini failed after 3 attempts:", err);
        throw err; // rethrow on last attempt
      }
      console.warn(
        `⚠️ Gemini error on attempt ${attempt}/3 — retrying...`,
        err?.message || err
      );
      await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  }

  // TypeScript safety: this should never be reached
  throw new Error("Unexpected fallthrough in callGeminiJSON");
}



// Small wrapper to support a system preamble while preserving your original callGeminiJSON
async function callGeminiJSONWithSystem(userPrompt: string, system: string | undefined, model: string) {
  const combined = system ? `System:\n${system}\n\n${userPrompt}` : userPrompt;
  return callGeminiJSON(combined, model);
}

// =============================================================
// GROUPING (Discovery step) — KEEPING YOUR ORIGINAL FUNCTION
// =============================================================
export async function groupTitlesWithGemini(
  titles: SourceInput[]
): Promise<GroupedTopics> {
  if (!titles?.length) throw new Error("No titles provided for grouping");

  const system = `
You are a technology topic curator.
Only keep items relevant to technology (gadgets, AI, software, hardware, cybersecurity, launches, reviews).
Drop irrelevant items (memes, politics, sports, entertainment).

Tasks:
1) Group items into master topics.
2) For each child, classify its content type into exactly one of:
   Launch, Specification, Comparison, Sales, Review, How-to, Analysis, Rumor.

Rules:
- If all items are irrelevant, return an empty "topics" array.
- Master topic must be concise and entity/event focused (e.g. "iPhone 17 Launch").
- Return strict JSON with this schema:
{
  "topics":[
    { "master": "string",
      "children":[
        {
          "title":"string",
          "url":"string",
          "kind":"NEWS"|"BLOG"|"SPEC"|"YOUTUBE",
          "contentType":"Launch"|"Specification"|"Comparison"|"Sales"|"Review"|"How-to"|"Analysis"|"Rumor"
        }
      ]
    }
  ]
}
`.trim();

  const user = `Input items:\n${titles
    .map((t) => `- [${t.kind}] ${t.title} | ${t.url}`)
    .join("\n")}\nReturn JSON only.`;

  const fullPrompt = `${system}\n\n${user}`;

  try {
    const jsonStr = await callGeminiJSON(fullPrompt, "gemini-2.0-flash");
    const parsed: GroupedTopics = JSON.parse(jsonStr);

    if (!parsed?.topics?.length) {
      throw new Error("Gemini returned empty grouping");
    }

    console.log(`✅ Grouping succeeded with gemini-2.0-flash`);
    return parsed;
  } catch (err) {
    console.warn("❌ Gemini grouping failed:", err);
    throw err;
  }
}

// =============================================================
// NEW HELPERS (Article Pipeline) — KEEPING YOUR ORIGINALS
// =============================================================

// ---------- Merge Titles ----------
export type MergeTitlesInput = {
  titles: string[];
  contentType: string | null;
};

export type MergeTitlesOutput = {
  title: string;
  contentType: string | null;
};

export async function mergeTitlesForArticle(
  input: MergeTitlesInput
): Promise<MergeTitlesOutput> {
  const { titles, contentType } = input;
  if (!titles.length) return { title: "Untitled Article", contentType };

  const system = `
You are a content strategist.
Given a list of source titles and a suggested content type,
produce a clean, merged article title appropriate for that type.

Return strict JSON:
{ "title": "string", "contentType": "string" }
`.trim();

  const user = `Content type: ${contentType || "Unknown"}\n\nTitles:\n${titles
    .map((t) => `- ${t}`)
    .join("\n")}\nReturn JSON only.`;

  const fullPrompt = `${system}\n\n${user}`;

  try {
    const jsonStr = await callGeminiJSON(fullPrompt, "gemini-2.0-flash");
    const parsed = JSON.parse(jsonStr);
    return {
      title: (parsed.title || titles[0] || "Untitled Article").trim(),
      contentType: parsed.contentType || contentType,
    };
  } catch (err) {
    console.warn("⚠️ Title merge fallback:", err);
    return { title: titles[0], contentType };
  }
}

// ---------- Draft Article + Keywords ----------
export type WriteDraftInput = {
  articleTitle: string;
  contentType: string | null;
  citations: { url: string; title?: string; text: string; type: string }[];
};

export type WriteDraftOutput = {
  title: string;
  contentType: string | null;
  tl_dr?: string;
  body_html: string;
  faq_html?: string | null;
  outline_json?: any;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
};

export async function writeDraftWithKeywords(
  input: WriteDraftInput
): Promise<WriteDraftOutput> {
  const { articleTitle, contentType, citations } = input;

 const system = `
You are a senior technology editorial writer.

Write a complete, human-like, research-based article in HTML format using the provided citations and content type.
Maintain a professional editorial tone — analytical, neutral, and data-driven — as if written by a tech journalist for a publication like Wired or The Verge.

Content Type: ${contentType || "General"}

Tasks:
1) **body_html** — Generate the main article body in clean HTML.
   - Use passive voice and a refined, research-backed editorial style (avoid AI-sounding phrasing).
   - Begin with an informative introductory paragraph.
   - Structure the content with <h2> and <h3> subheaders only — never use <h1>.
   - Incorporate <dl><dt><dd> blocks where suitable to explain key terms, comparisons, or highlights.
   - Present insights clearly and concisely; make the content easy to read and evaluate.

2) **tl_dr** — Write a short, factual “too long; didn'’'t read” summary (2–3 sentences).

3) **faq_html** — Provide frequently asked questions in **strict HTML <dl><dt><dd> format** only.
   Each <dt> is a question and each <dd> its corresponding answer.
   Example:
   <dl>
     <dt>What triggered the breach?</dt>
     <dd>The issue was caused by a misconfigured server route impacting multiple users.</dd>
   </dl>

4) **outline_json** — Provide a JSON outline of article sections and their summaries.
   Example:
   {
     "sections": [
       { "heading": "Background and Timeline", "summary": "Overview of the event and its early reports." },
       { "heading": "Impact and Analysis", "summary": "Explains the broader implications and expert insights." }
     ]
   }

5) **metaTitle** & **metaDescription** — Suggest SEO-optimized metadata.
   - metaTitle ≤ 60 characters (include key topic naturally).
   - metaDescription ≤ 160 characters (clear, compelling, and relevant).

6) **keywords** — Suggest 5–10 focused SEO keywords related to the topic.

Formatting Rules:
- Write only clean HTML and valid JSON — no markdown, comments, or code fences.
- Return a **strict JSON object** structured as:

{
  "title": "string",
  "contentType": "string",
  "tl_dr": "string",
  "body_html": "string",
  "faq_html": "string",
  "outline_json": {},
  "metaTitle": "string",
  "metaDescription": "string",
  "keywords": ["string"]
}

Output must be valid JSON only — no extra text or explanations.
`.trim();

  const user = `Article Title: ${articleTitle}\n\nCitations:\n${citations
    .map((c) => `- [${c.type}] ${c.title || ""}: ${c.text.slice(0, 200)}`)
    .join("\n")}\nReturn JSON only.`;

  const fullPrompt = `${system}\n\n${user}`;

  try {
    const jsonStr = await callGeminiJSON(fullPrompt, "gemini-2.0-flash");
    const parsed: WriteDraftOutput = JSON.parse(jsonStr);
    return parsed;
  } catch (err) {
    console.warn("⚠️ Draft fallback:", err);
    return {
      title: articleTitle,
      contentType,
      tl_dr: `Key takeaways about ${articleTitle}.`,
      body_html: `<h2>${articleTitle}</h2><p>No draft generated.</p>`,
      faq_html: "<h3>FAQ</h3><p>Coming soon.</p>",
      outline_json: { sections: ["Intro", "Details", "Conclusion"] },
      metaTitle: articleTitle,
      metaDescription: `Article about ${articleTitle}`,
      keywords: ["tech", "news"],
    };
  }
}

// =============================================================
// ADDITIONS FOR YOUR PIPELINE (compatible with src.lib.pipeline.ts)
// =============================================================

export type DraftInput = {
  masterTitle: string;
  citations: { sourceUrl: string; sourceType: string; title?: string | null; author?: string | null; quoted?: string | null }[];
};

export type DraftOutput = {
  title: string;
  tl_dr?: string | null;
  body_html: string;
  faq_html?: string | null;
  outline_json?: Prisma.JsonValue;
  metaTitle?: string | null;
  metaDescription?: string | null;
  keywords?: string[] | null;
  contentType?: string | null;
};

// Used by pipeline.draftTopic()
export async function draftArticleWithGemini(input: DraftInput): Promise<DraftOutput> {
  const sys = `You are a senior technology journalist. Synthesize across sources without hallucinating.
- Every claim must be traceable to the sources provided.
- Use clear H2/H3s, neutral tone, and include inline numeric/spec facts only if present in sources.
- Return strict JSON per schema.`;

  const srcList = input.citations
    .map((c, i) => `[${i + 1}] ${c.sourceType} — ${c.title || ""} — ${c.sourceUrl}`)
    .join("\n");

  const user = `
Master Topic: ${input.masterTitle}

Sources:
${srcList}

JSON schema:
{
  "title": "string",
  "tl_dr": "string?",
  "body_html": "string (HTML with H2/H3, include [1],[2] markers)",
  "faq_html": "string?",
  "outline_json": "object?",
  "metaTitle": "string?",
  "metaDescription": "string?",
  "keywords": "string[]?",
  "contentType": "string? (one of: news, analysis, tutorial, comparison, launch, review)"
}
Return only JSON.`.trim();

  const jsonStr = await callGeminiJSONWithSystem(user, sys, "gemini-2.0-flash");
  const out = JSON.parse(jsonStr);

  // guard rails defaults
  return {
    title: out.title || input.masterTitle,
    tl_dr: out.tl_dr ?? null,
    body_html: out.body_html || "<p>Draft missing.</p>",
    faq_html: out.faq_html ?? null,
    outline_json: out.outline_json ?? null,
    metaTitle: out.metaTitle ?? null,
    metaDescription: out.metaDescription ?? null,
    keywords: Array.isArray(out.keywords) ? out.keywords : null,
    contentType: typeof out.contentType === "string" ? out.contentType : null,
  };
}

// Used by pipeline.reviewTopic()
export async function qaReviewWithGemini(
  html: string,
  citations: DraftInput["citations"]
): Promise<{ issues: { type: string; message: string }[] }> {
  const sys = `You are a copy editor and fact checker. Find issues in clarity, style, unsupported facts, numbers, or dates. Return JSON: {"issues":[{"type":"FACT","message":"..."}]}`;
  const user = `HTML:\n${html}\n\nCitations:\n${citations.map((c, i) => `[${i + 1}] ${c.sourceUrl}`).join("\n")}\nReturn only JSON.`;

  const jsonStr = await callGeminiJSONWithSystem(user, sys, "gemini-2.0-flash");
  const out = JSON.parse(jsonStr);
  const issues = Array.isArray(out.issues) ? out.issues : [];
  return { issues };
}

export type SubcatItem = { id: string; name: string; categoryId?: string | null; categoryName?: string | null };

// Used by pipeline.categorizeTopic()
export async function categorizeWithLLM(
  article: { title: string; tl_dr?: string | null; body_html?: string | null },
  subs: SubcatItem[],
): Promise<{ label: string; categoryId?: string | null; subcategoryId?: string | null }> {
 const sys = `You map a technology article to the SINGLE best subcategory from a provided taxonomy list.

CRITICAL RULES:
- You MUST return a JSON object with keys: {"label":"...","subcategoryId":"...","categoryId":"..."}.
- "subcategoryId" MUST be EXACTLY one of the IDs from the provided list. Never invent a new ID.
- If unsure, pick the best-fit subcategory from the list (do not return null unless list is empty).
- If you know the categoryId for that subcategory, include it; otherwise leave "categoryId" null and only return a valid "subcategoryId".

Your job: pick the best subcategory for the given article context (title, tl;dr, body if present). Keep "label" short and human-readable. Return JSON only.`;

  const list = subs.map(s => `- ${s.id} | ${s.categoryName || ""} > ${s.name}`).join("\n");
  const user = `Title: ${article.title}
TL;DR: ${article.tl_dr || ""}
Choose from subcategories:
${list}

Return JSON only.`.trim();

  const jsonStr = await callGeminiJSONWithSystem(user, sys, "gemini-2.0-flash");
  const out = JSON.parse(jsonStr);
  const label = typeof out.label === "string" ? out.label : "";
  const subcategoryId = typeof out.subcategoryId === "string" ? out.subcategoryId : null;
  const categoryId = typeof out.categoryId === "string" ? out.categoryId : null;
  return { label, subcategoryId, categoryId };
}
