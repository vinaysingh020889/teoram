// apps/api/src/routes/topics.ts
import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "db";
import { TopicStatus, ContentType } from "db";
// ✅ keep your worker-based discovery intact
import { runTopicDiscovery } from "../agents/topicDiscovery.js";

// ⬇️ NEW: helpers we need for approve → merged title + article save
import { mergeTitlesForArticle, categorizeWithLLM } from "../lib/gemini.js";

import { slugify } from "../lib/slugify.js";

const plugin: FastifyPluginAsync = async (app) => {
// === List NEW topics for discovery board ===
app.get("/topics/view", { preHandler: [] }, async () => {
  const topics = await prisma.topic.findMany({
    include: { sources: true },
    orderBy: { createdAt: "desc" },
  });
  return { data: topics };
});


app.get("/topics/discovery", { preHandler: [] }, async () => {
  const topics = await prisma.topic.findMany({
    where: { status: TopicStatus.NEW },
    include: { sources: true, articles: true },
    orderBy: { createdAt: "desc" },
  });
  return { data: topics };
});

  // === Manual discovery trigger (uses your worker path) ===
app.post("/topics/discover", { preHandler: [] }, async () => {
  const topics = await runTopicDiscovery();
  return { data: topics, count: topics.length };
});

  // === All topics (protected, includes articles for pipeline) ===
  app.get("/topics", { preHandler: (app as any).auth }, async () => {
    const topics = await prisma.topic.findMany({
      include: { sources: true, articles: true },
      orderBy: { createdAt: "desc" },
    });
    return { data: topics };
  });

// === Single topic detail (protected) — returns latest article as `article` with category/subcategory names ===
app.get("/topics/:id", { preHandler: (app as any).auth }, async (req) => {
  const { id } = z.object({ id: z.string() }).parse(req.params as any);
  const t = await prisma.topic.findUnique({
    where: { id },
    include: {
      sources: true,
      articles: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          // names for display
          category: { select: { id: true, name: true } },
          subcategory: {
            select: {
              id: true,
              name: true,
              category: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });
  if (!t) return { data: null };
  const article = t.articles?.[0] || null;
  return { data: { ...t, article } };
});

// === Single topic detail (PUBLIC view) — same shape ===
app.get("/topics/:id/view", { preHandler: [] }, async (req) => {
  const { id } = z.object({ id: z.string() }).parse(req.params as any);
  const t = await prisma.topic.findUnique({
    where: { id },
    include: {
      sources: true,
      articles: {
        where: { publishedAt: { not: null } }, 
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          category: { select: { id: true, name: true } },
          subcategory: {
            select: {
              id: true,
              name: true,
              category: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });
  if (!t) return { data: null };
  const article = t.articles?.[0] || null;
  return { data: { ...t, article } };
});



  // --- helper: normalize selected urls from form or json ---
  function getSelectedUrls(body: any): string[] {
    // support application/x-www-form-urlencoded (selectedUrls[])
    if (body && body["selectedUrls[]"] !== undefined) {
      const v = body["selectedUrls[]"];
      return Array.isArray(v) ? v : [v];
    }
    // support JSON shape { selectedUrls: [...] }
    if (body && Array.isArray(body.selectedUrls)) {
      return body.selectedUrls as string[];
    }
    return [];
  }

  // --- helper: infer content type from approved sources ---
  function inferContentType(approved: { contentType: any }[]): ContentType | null {
    const hit = approved.find((s) => !!s.contentType);
    return (hit?.contentType as ContentType) ?? null;
  }

  // === Approve topic & mark selected sources (protected) ===
// === Approve topic & mark selected sources (protected) — now with safe auto-categorize ===
app.post(
  "/topics/:id/approve",
  { preHandler: (app as any).auth },
  async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params as any);

    const body = (req.body || {}) as any;

    // Normalize selected URLs from form or JSON
    function getSelectedUrls(b: any): string[] {
      if (b && b["selectedUrls[]"] !== undefined) {
        const v = b["selectedUrls[]"];
        return Array.isArray(v) ? v : [v];
      }
      if (b && Array.isArray(b.selectedUrls)) {
        return b.selectedUrls as string[];
      }
      return [];
    }

    const selectedUrls = getSelectedUrls(body);
    if (!selectedUrls.length) {
      return reply.code(400).send({ error: "No sources selected" });
    }

    // 1) Fetch topic + sources
    const topic = await prisma.topic.findUnique({
      where: { id },
      include: {
        sources: true,
        articles: true,
        auditLogs: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });
    if (!topic) return reply.code(404).send({ error: "Topic not found" });

    console.log("➡️ Approving topic:", topic.title, "| selected:", selectedUrls.length);

    // 2) Flip approvals (true only for selected)
    const urls = new Set(selectedUrls);
    await Promise.all(
      topic.sources.map((s) =>
        prisma.source.update({
          where: { id: s.id },
          data: { approved: urls.has(s.url) },
        })
      )
    );

    // 3) Update topic status → APPROVED (pipeline will move it forward)
    await prisma.topic.update({
      where: { id },
      data: { status: TopicStatus.APPROVED },
    });

    // 4) Re-fetch with updated approvals
    const refreshed = await prisma.topic.findUnique({
      where: { id },
      include: {
        sources: true,
        articles: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!refreshed) {
      return reply.code(404).send({ error: "Topic not found after approve" });
    }

    const approved = refreshed.sources.filter((s) => s.approved);
    const titles = approved.map((s) => s.title).filter(Boolean) as string[];

    // Helper: infer content type from approved sources (if you had this helper, keep it)
    function inferContentType(approvedItems: { contentType: any }[]): ContentType | null {
      const hit = approvedItems.find((s) => !!s.contentType);
      return (hit?.contentType as ContentType) ?? null;
    }

    // --- infer content type from approved ---
    let mergedType: ContentType | null = inferContentType(approved);
    // --- default merged title is topic title (fallback) ---
    if (!mergedType) {
  mergedType = ContentType.NEWS; // default when null
}
    let mergedTitle = refreshed.title;

    // 5) Merge master title + content type using Gemini (robust)
    if (titles.length) {
      try {
        const merged = await mergeTitlesForArticle({
          titles,
          contentType: mergedType, // may be null
        });
        mergedTitle = (merged.title || titles[0] || refreshed.title).trim();
        mergedType = (merged.contentType as ContentType | null) ?? mergedType ?? null;
        console.log("✅ Approve-step merged title/type:", mergedTitle, mergedType);
      } catch (err) {
        console.warn("⚠️ mergeTitlesForArticle failed at approve:", err);
        console.log("↪︎ Fallback to topic title + inferred type:", mergedTitle, mergedType);
      }
    } else {
      console.log("ℹ️ No approved source titles; fallback to topic title:", mergedTitle);
    }

    // 5.1) 🔎 Auto-categorize at APPROVE (VALIDATE strictly to avoid FK errors)
    let chosenCategoryId: string | null = null;
    let chosenSubcategoryId: string | null = null;

    try {
      const subcats = await prisma.subcategory.findMany({
        include: { category: true },
      });

      if (subcats.length) {
        const pick = await categorizeWithLLM(
          { title: mergedTitle },
          subcats.map((s) => ({
            id: s.id,
            name: s.name,
            categoryId: s.categoryId,
            categoryName: s.category?.name || null,
          }))
        );

        // Prefer a real subcategory match from DB
        const pickedSub = pick?.subcategoryId
          ? subcats.find((x) => x.id === pick.subcategoryId)
          : undefined;

        if (pickedSub) {
          chosenSubcategoryId = pickedSub.id;        // ✅ exists
          chosenCategoryId = pickedSub.categoryId;   // ✅ derived from DB
        } else if (pick?.categoryId) {
          // If model returned only a categoryId, validate it exists
          const cat = await prisma.category.findUnique({
            where: { id: pick.categoryId },
            select: { id: true },
          });
          if (cat) {
            chosenCategoryId = cat.id;
          } else {
            console.warn("⚠️ LLM returned unknown categoryId:", pick.categoryId);
          }
        }

        console.log("✅ Approve-step category:", {
          label: pick?.label,
          categoryId: chosenCategoryId,
          subcategoryId: chosenSubcategoryId,
          raw: { fromModel: pick },
        });
      } else {
        console.log("ℹ️ No subcategories in DB; skipping auto-categorization at approve.");
      }
    } catch (err) {
      console.warn("⚠️ categorizeWithLLM failed at approve:", err);
    }

    // 6) Ensure an Article exists; set title + contentType immediately
    let article = await prisma.article.findFirst({
      where: { topicId: refreshed.id },
      orderBy: { createdAt: "desc" },
    });

    if (!article) {
      const slug = slugify(`${refreshed.title}-${Date.now()}`);
      try {
        article = await prisma.article.create({
  data: {
    // use nested relation connects instead of scalar FKs
    topic: { connect: { id: refreshed.id } },

    slug,
    title: mergedTitle,
    body_html: "",
    tl_dr: "",
    contentType: mergedType,

    // ✅ Connect relations only if IDs are VALID
    ...(chosenCategoryId
      ? { category: { connect: { id: chosenCategoryId } } }
      : {}),
    ...(chosenSubcategoryId
      ? { subcategory: { connect: { id: chosenSubcategoryId } } }
      : {}),
  },
});
        console.log("🆕 Article created at approve:", article.id, "| title:", article.title);
      } catch (err) {
        console.error("❌ prisma.article.create failed at approve:", err);
        return reply.code(500).send({ error: "Failed to create article at approve" });
      }
    } else {
      try {
        article = await prisma.article.update({
          where: { id: article.id },
          data: {
            title: mergedTitle,
            contentType: mergedType,

            // ✅ Only connect when IDs are valid (no raw scalar assignment)
            ...(chosenCategoryId ? { category: { connect: { id: chosenCategoryId } } } : {}),
            ...(chosenSubcategoryId ? { subcategory: { connect: { id: chosenSubcategoryId } } } : {}),
          },
        });
        console.log("✏️ Article updated at approve:", article.id, "| title:", article.title);
      } catch (err) {
        console.error("❌ prisma.article.update failed at approve:", err);
        return reply.code(500).send({ error: "Failed to update article at approve" });
      }
    }

    // 7) Return topic with sources + latest article (with category/subcategory names)
    const out = await prisma.topic.findUnique({
      where: { id: refreshed.id },
      include: {
        sources: true,
        articles: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            category: { select: { id: true, name: true } },
            subcategory: {
              select: {
                id: true,
                name: true,
                category: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    return { data: out };
  }
);

// === Disapprove topic (protected) ===
app.post("/topics/:id/disapprove", { preHandler: (app as any).auth }, async (req, reply) => {
  const { id } = z.object({ id: z.string() }).parse(req.params as any);

  try {
    const updated = await prisma.topic.update({
      where: { id },
      data: { status: TopicStatus.DISAPPROVED },
    });

    return { success: true, data: updated };
  } catch (err) {
    req.log.error(err, "Failed to disapprove topic");
    return reply.code(500).send({ success: false, error: "Failed to disapprove topic" });
  }
});

// === Create topic manually (protected) ===
app.post(
  "/topics",
  { preHandler: (app as any).auth },
  async (req, reply) => {
    const body = z
      .object({
        title: z.string().min(3),
        slug: z.string().optional(),
      })
      .parse(req.body as any);

    // Generate slug if not provided
    const slug = body.slug ? slugify(body.slug) : slugify(`${body.title}-${Date.now()}`);

    try {
      const topic = await prisma.topic.create({
        data: {
          title: body.title,
          slug,
          status: TopicStatus.NEW,
        },
      });
      return { data: topic };
    } catch (err) {
      req.log.error(err, "Failed to create topic");
      return reply.code(500).send({ error: "Failed to create topic" });
    }
  }
);


// === Mark topic as duplicate (protected) ===
app.post("/topics/:id/duplicate", { preHandler: (app as any).auth }, async (req, reply) => {
  const { id } = z.object({ id: z.string() }).parse(req.params as any);

  try {
    const updated = await prisma.topic.update({
      where: { id },
      data: { status: TopicStatus.DUPLICATE },
    });

    return { success: true, data: updated };
  } catch (err) {
    req.log.error(err, "Failed to mark topic as duplicate");
    return reply.code(500).send({ success: false, error: "Failed to mark topic as duplicate" });
  }
});


      // === Delete a topic (and cascade related data) ===
app.delete("/topics/:id", { preHandler: (app as any).auth }, async (req, reply) => {
  const { id } = z.object({ id: z.string() }).parse(req.params as any);

  try {
    // Optional: clean up children first (citations, articles, sources)
    await prisma.citation.deleteMany({ where: { article: { topicId: id } } });
    await prisma.article.deleteMany({ where: { topicId: id } });
    await prisma.source.deleteMany({ where: { topicId: id } });

    // Finally delete the topic itself
    await prisma.topic.delete({ where: { id } });

    return { success: true };
  } catch (err) {
    req.log.error(err, "Failed to delete topic");
    return reply.code(500).send({ success: false, error: "Failed to delete topic" });
  }
});

};

export default plugin;
