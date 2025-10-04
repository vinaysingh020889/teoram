// apps/api/src/lib/pipeline.ts
import { prisma } from "db";
import {
  Prisma,           // needed for JsonNull/InputJsonValue
  TopicStatus,      // enum for status transitions
  type SourceKind,
  type ContentType,
  type Topic,
  type Source,
} from "@prisma/client";
import { fetchGoogleTrends } from "./trends/googleTrends.js";
import {
  groupTitlesWithGemini,
  mergeTitlesForArticle,
  writeDraftWithKeywords,
  categorizeWithLLM,
  qaReviewWithGemini,
} from "./gemini.js";
import { slugify } from "./slugify.js";
import { scrapeUrl, fetchYouTubeTranscript } from "./scrape.js";

// ---------- Types ----------
type InputItem = {
  title: string;
  url: string;
  kind: SourceKind;
  contentType?: ContentType | null;
};

// ---------- JSON input helper (fixes outline_json typing) ----------
function toInputJSON(
  val: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (val === undefined || val === null) {
    // Use JSON null (not DB null) for "no JSON" to satisfy Prisma type.
    return Prisma.JsonNull;
  }
  // Ensure it’s serializable
  try {
    return JSON.parse(JSON.stringify(val)) as Prisma.InputJsonValue;
  } catch {
    return Prisma.JsonNull;
  }
}

// =============================================================
// 1) DISCOVERY (unchanged logic; enum-safe status)
// =============================================================
export async function runDiscoveryPipeline() {
  const gnews = await fetchGoogleTrends();
  const items: InputItem[] = [...gnews];

  if (!items.length) {
    console.warn("⚠️ No trending items fetched");
    return [];
  }

  const grouped = await groupTitlesWithGemini(items);
  let clusters = grouped.topics || [];

  if (!clusters.length) {
    console.warn("⚠️ Gemini returned no topics — using fallback (Ungrouped)");
    clusters = [
      { master: "Ungrouped", children: items.filter((i) => i.title && i.url) },
    ];
  }

  const createdTopics: any[] = [];

  for (const cluster of clusters) {
    const { master, children } = cluster as { master: string; children: InputItem[] };
    if (!master) continue;

    const slug = slugify(master);
    const topic = await prisma.topic.upsert({
      where: { slug },
      update: { title: master },
      create: { slug, title: master, status: TopicStatus.NEW },
    });

    for (const src of children) {
      if (!src.title || !src.url) continue;

      const exists = await prisma.source.findFirst({
        where: { url: src.url, topicId: topic.id },
        select: { id: true },
      });

      if (!exists) {
        await prisma.source.create({
          data: {
            url: src.url,
            title: src.title,
            kind: src.kind,
            contentType: src.contentType ?? null,
            topicId: topic.id,
            approved: false,
          },
        });
      }
    }

    console.log(`📌 Saved topic: ${topic.title}`);
    createdTopics.push(topic);
  }

  return createdTopics;
}

// =============================================================
// Helpers (Article pipeline) — KEPT from your base
// =============================================================

/** Safely pick a ContentType from approved sources (or null). */
function deriveContentTypeFromSources(sources: Source[]): ContentType | null {
  const hit = sources.find((s) => !!s.contentType);
  return (hit?.contentType as ContentType) ?? null;
}

/** Build TS-safe create data for Article, only attaching fields if present in client. */
function buildArticleCreateData(base: {
  topicId: string;
  slug: string;
  title?: string;
  body_html?: string;
  tl_dr?: string;
  contentType?: ContentType | null;
}) {
  const data: any = {
    topicId: base.topicId,
    slug: base.slug,
    title: base.title ?? "",
    body_html: base.body_html ?? "",
    tl_dr: base.tl_dr ?? "",
  };
  // Guard optional fields; keep compatibility with your client types
  if (base.contentType !== undefined) data.contentType = base.contentType;
  return data;
}

/** Build TS-safe update data for Article, guarded for optional fields like contentType/keywords. */
function buildArticleUpdateData(base: {
  title?: string;
  tl_dr?: string;
  body_html?: string;
  faq_html?: string | null;
  outline_json?: any;
  metaTitle?: string;
  metaDescription?: string;
  contentType?: ContentType | null;
  keywords?: string[] | null;
}) {
  const data: any = {};
  if (base.title !== undefined) data.title = base.title;
  if (base.tl_dr !== undefined) data.tl_dr = base.tl_dr;
  if (base.body_html !== undefined) data.body_html = base.body_html;
  if (base.faq_html !== undefined) data.faq_html = base.faq_html;
  if (base.outline_json !== undefined) data.outline_json = toInputJSON(base.outline_json);
  if (base.metaTitle !== undefined) data.metaTitle = base.metaTitle;
  if (base.metaDescription !== undefined) data.metaDescription = base.metaDescription;

  // Guard optional fields to avoid TS errors if client types lag
  if (base.contentType !== undefined) data.contentType = base.contentType;
  if (base.keywords !== undefined) data.keywords = base.keywords;

  return data;
}

/** Compute the merged master title & inferred content type from approved sources. */
async function computeMasterTitleAndType(topic: Topic, approved: Source[]) {
  const inferredType = deriveContentTypeFromSources(approved);
  const titles = approved.map((s) => s.title).filter(Boolean) as string[];

  console.log("🧩 Approved source titles:", titles);

  let mergedTitle = topic.title;
  let mergedType: ContentType | null = inferredType ?? null;

  if (titles.length) {
    try {
      const merged = await mergeTitlesForArticle({
        titles,
        contentType: inferredType ?? null,
      });
      mergedTitle = (merged?.title || titles[0] || topic.title).trim();
      mergedType = (merged?.contentType as ContentType | null) ?? inferredType ?? null;
      console.log("✅ Gemini merged title/type:", mergedTitle, mergedType);
    } catch (err) {
      console.warn("⚠️ Title merge failed, fallback to topic.title:", err);
    }
  } else {
    console.log("ℹ️ No titles to merge, fallback:", mergedTitle);
  }

  return { mergedTitle, mergedType };
}

// Utility: ensure one article exists for topic (idempotent)
export async function ensureArticle(topicId: string) {
  const existing = await prisma.article.findFirst({ where: { topicId }, orderBy: { createdAt: "desc" } });
  if (existing) return existing;
  const topic = await prisma.topic.findUnique({ where: { id: topicId } });
  const created = await prisma.article.create({
    data: {
      topicId,
      slug: slugify(`${topic?.title || "untitled"}-${Date.now()}`),
      title: topic?.title || "Untitled",
      body_html: "",
      tl_dr: "",
    },
  });
  return created;
}

// =============================================================
// 2) COLLECT — ensure ONE article exists + create citations
//      ⬅️ Keeps your scraping + transcript logic
// =============================================================
export async function collectContent(topic: Topic, approved: Source[]) {
  console.log("➡️ collectContent() for:", topic.title, "| approved sources:", approved.length);

  // 1) Compute master title + type
  const { mergedTitle, mergedType } = await computeMasterTitleAndType(topic, approved);
  console.log("🎯 Computed master title/type:", mergedTitle, mergedType);

  // 2) Find or create article
  let article = await prisma.article.findFirst({
    where: { topicId: topic.id },
    orderBy: { createdAt: "desc" },
  });
  console.log("🔎 Found existing article?", !!article);

  if (!article) {
    const slug = slugify(`${topic.title}-${Date.now()}`);
    const createData = buildArticleCreateData({
      topicId: topic.id,
      slug,
      title: mergedTitle,
      body_html: "",
      tl_dr: "",
      contentType: mergedType ?? null,
    });

    console.log("🆕 Creating new article with data:", createData);

    article = await prisma.article.create({ data: createData });
    console.log("✅ Created article:", article.id, "| title:", article.title);
  } else {
    console.log("✏️ Updating existing article:", article.id);
    const updatePatch: any = {};
    if (!article.title || !article.title.trim()) updatePatch.title = mergedTitle;
    if (!(article as any).contentType) updatePatch.contentType = mergedType ?? null;

    if (Object.keys(updatePatch).length) {
      console.log("➡️ Patching article with:", updatePatch);
      article = await prisma.article.update({
        where: { id: article.id },
        data: updatePatch,
      });
      console.log("✅ Updated article:", article.id, "| title:", article.title);
    } else {
      console.log("ℹ️ Article already had title + type, skipping update.");
    }
  }

  // 3) Build citations (with scraping/transcripts)
  const existing = await prisma.citation.findMany({ where: { articleId: article.id } });
  const seen = new Set(existing.map(c => c.sourceUrl));
  const toCreate: any[] = [];

  for (const s of approved) {
    try {
      if (seen.has(s.url)) {
        console.log("↩️ Skipping existing citation:", s.url);
        continue;
      }
      console.log("📚 Fetching citation for:", s.url, "| kind:", s.kind);
      if (s.kind === "YOUTUBE") {
        const tr = await fetchYouTubeTranscript(s.url);
        toCreate.push({
          sourceUrl: s.url,
          sourceType: s.kind,
          quote: tr?.slice(0, 1500),
        });
      } else {
        const page = await scrapeUrl(s.url);
        toCreate.push({
          sourceUrl: s.url,
          sourceType: s.kind,
          title: page?.title,
          quote: page?.text?.slice(0, 2000),
        });
      }
    } catch (err) {
      console.warn("⚠️ Failed to fetch citation for:", s.url, err);
    }
  }

  if (toCreate.length) {
    console.log("📥 Saving citations:", toCreate.length);
    await prisma.citation.createMany({
      data: toCreate.map((c) => ({ ...c, articleId: article!.id })),
      skipDuplicates: true,
    });
  } else {
    console.log("ℹ️ No new citations to save.");
  }

  return {
    ok: true,
    articleId: article.id,
    masterTitle: article.title,
    contentType: (article as any).contentType ?? null,
    citations: toCreate.length,
  };
}

// Wrapper used by routes: /agents/topics/:id/collect
export async function collectTopic(topicId: string) {
  const topic = await prisma.topic.findUnique({ where: { id: topicId } });
  if (!topic) throw new Error("Topic not found");
  await prisma.topic.update({
    where: { id: topicId },
    data: { status: { set: TopicStatus.PROCESSING } },
  });

  const approved = await prisma.source.findMany({ where: { topicId, approved: true } });
  const res = await collectContent(topic, approved);

  await prisma.topic.update({
    where: { id: topicId },
    data: { status: { set: TopicStatus.COLLECTED } },
  });
  return res;
}

// =============================================================
// 3) DRAFT — write draft + keywords (LLM)
// =============================================================
export async function draftArticle(topic: Topic) {
  console.log("➡️ draftArticle() called for topic:", topic.title);

  const [article, sources] = await Promise.all([
    prisma.article.findFirst({
      where: { topicId: topic.id },
      orderBy: { createdAt: "desc" },
      include: { citations: true },
    }),
    prisma.source.findMany({ where: { topicId: topic.id, approved: true } }),
  ]);

  if (!article) {
    console.error("❌ No article found for this topic. Run COLLECT first.");
    throw new Error("No article found for this topic. Run COLLECT first.");
  }

  console.log("📝 Base article:", article.id, "| citations:", article.citations.length);

  // Prefer the master title saved during Collect; else re-merge now
  let baseTitle = (article.title || "").trim();
  let inferredType: ContentType | null =
    ((article as any)?.contentType as ContentType | null) ?? deriveContentTypeFromSources(sources);

  if (!baseTitle) {
    const titles = sources.map((s) => s.title).filter(Boolean) as string[];
    try {
      const merged = await mergeTitlesForArticle({
        titles,
        contentType: inferredType ?? null,
      });
      baseTitle = merged.title || titles[0] || topic.title;
      inferredType = (merged.contentType as ContentType | null) ?? inferredType ?? null;
      console.log("✅ Re-merged title for draft:", baseTitle);
    } catch (err) {
      console.warn("⚠️ Re-merge failed in draft; using topic.title:", err);
      baseTitle = topic.title;
    }
  } else {
    console.log("✅ Using pre-saved master title for draft:", baseTitle);
  }

  // Draft with Gemini (or fallback)
  const drafted = await writeDraftWithKeywords({
    articleTitle: baseTitle,
    contentType: inferredType ?? null,
    citations: (article.citations || []).map((c) => ({
      url: c.sourceUrl,
      title: c.title ?? undefined,
      text: c.quote ?? "",
      type: c.sourceType,
    })),
  });

  console.log("✅ Draft generated:", {
    title: drafted.title,
    hasBody: !!drafted.body_html,
    keywords: drafted.keywords?.length,
  });

  // Persist (TS-safe, only attach optional fields if present)
  const updateData = buildArticleUpdateData({
    title: drafted.title || baseTitle,
    contentType: (drafted.contentType as ContentType | null) ?? inferredType ?? null,
    tl_dr: drafted.tl_dr ?? "",
    body_html: drafted.body_html ?? "",
    faq_html: drafted.faq_html ?? null,
    outline_json: drafted.outline_json ?? undefined,
    metaTitle: drafted.metaTitle ?? drafted.title ?? baseTitle,
    metaDescription: drafted.metaDescription ?? undefined,
    keywords: drafted.keywords ?? undefined,
  });

  try {
    const updated = await prisma.article.update({
      where: { id: article.id },
      data: updateData as any,
    });
    console.log("✅ Article updated with draft:", updated.id);
    return updated;
  } catch (err) {
    console.error("❌ Prisma update failed (draft save):", err, "data:", updateData);
    throw err;
  }
}

// Wrapper used by routes: /agents/topics/:id/draft
export async function draftTopic(topicId: string) {
  const topic = await prisma.topic.findUnique({ where: { id: topicId } });
  if (!topic) throw new Error("Topic not found");
  const updated = await draftArticle(topic);
  await prisma.topic.update({
    where: { id: topicId },
    data: { status: { set: TopicStatus.DRAFTED } },
  });
  return { articleId: updated.id };
}

// =============================================================
// 4) REVIEW — simple QA + LLM QA (outline_json.qaIssues)
// =============================================================
export async function reviewDraft(articleId: string) {
  const a = await prisma.article.findUnique({ where: { id: articleId } });
  return !!(a?.body_html && a.body_html.length > 500);
}

// Wrapper with LLM QA used by routes: /agents/topics/:id/review
export async function reviewTopic(topicId: string) {
  const article = await prisma.article.findFirst({ where: { topicId }, orderBy: { createdAt: "desc" } });
  if (!article) throw new Error("Article not found");
  const citations = await prisma.citation.findMany({ where: { articleId: article.id } });

  // LLM QA (non-breaking: attaches to outline_json.qaIssues)
  const qa = await qaReviewWithGemini(
    article.body_html || "",
    citations.map(c => ({ sourceUrl: c.sourceUrl, sourceType: c.sourceType, title: c.title || "", author: "", quoted: c.quote || "" }))
  );

  const merged: any = article.outline_json ?? {};
  merged.qaIssues = qa.issues;

  await prisma.article.update({
    where: { id: article.id },
    data: { outline_json: toInputJSON(merged) },
  });

  await prisma.topic.update({
    where: { id: topicId },
    data: { status: { set: TopicStatus.READY } },
  });

  return { articleId: article.id, issues: qa.issues };
}

// =============================================================
// 5) CATEGORIZE — map to DB subcategories via LLM with overrides
// =============================================================
async function fetchSubcategories() {
  try {
    const subs = await prisma.subcategory.findMany({
      select: { id: true, name: true, categoryId: true, category: { select: { name: true } } },
      orderBy: { name: "asc" },
    });
    return subs.map((s: any) => ({
      id: s.id,
      name: s.name,
      categoryId: s.categoryId || null,
      categoryName: s.category?.name || null,
    }));
  } catch {
    return [];
  }
}

export async function categorizeTopic(
  topicId: string,
  overrides?: { categoryId?: string | null; subcategoryId?: string | null }
) {
  const article = await prisma.article.findFirst({ where: { topicId }, orderBy: { createdAt: "desc" } });
  if (!article) throw new Error("Article not found");

  const subs = await fetchSubcategories();
  const sug = await categorizeWithLLM(
    { title: article.title, tl_dr: (article as any).tl_dr ?? null, body_html: article.body_html },
    subs
  );

  const finalCategoryId = overrides?.categoryId ?? (sug as any).categoryId ?? null;
  const finalSubcategoryId = overrides?.subcategoryId ?? (sug as any).subcategoryId ?? null;

  const merged: any = article.outline_json ?? {};
  merged.categorySuggestion = {
    label: (sug as any).label,
    categoryId: finalCategoryId,
    subcategoryId: finalSubcategoryId,
  };

  try {
    await prisma.article.update({
      where: { id: article.id },
      data: {
        outline_json: toInputJSON(merged),
        // optional fields; ignore if not in schema
        // @ts-ignore
        categoryId: finalCategoryId ?? undefined,
        // @ts-ignore
        subcategoryId: finalSubcategoryId ?? undefined,
      },
    });
  } catch {
    await prisma.article.update({
      where: { id: article.id },
      data: { outline_json: toInputJSON(merged) },
    });
  }

  await prisma.topic.update({
    where: { id: topicId },
    data: { status: { set: TopicStatus.ASSIGNED } },
  });

  return { categoryId: finalCategoryId, subcategoryId: finalSubcategoryId, label: (sug as any).label };
}

// =============================================================
// 6) PUBLISH — flip topic status and set publishedAt
// =============================================================
export async function publishArticle(articleId: string) {
  const article = await prisma.article.update({
    where: { id: articleId },
    data: { publishedAt: new Date() },
    select: { topicId: true }, // only what we need
  });

  const topicId = article.topicId ?? undefined;
  if (!topicId) {
    throw new Error("Article has no topicId; cannot update topic status.");
  }

  await prisma.topic.update({
    where: { id: topicId }, // now a string
    data: { status: { set: TopicStatus.PUBLISHED } },
  });

  return { ok: true };
}

