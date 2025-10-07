// apps/api/src/routes/agents.ts
import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma, TopicStatus } from "db";


// Existing workers (batch jobs)
import { topicDiscovery } from "../../../workers/src/jobs/topicDiscovery.js";
import { sourceCollector } from "../../../workers/src/jobs/sourceCollector.js";
import { processApproved } from "../../../workers/src/jobs/processApproved.js";

// Pipeline step handlers (fine-grained actions)
import { collectContent, draftArticle, reviewDraft, categorizeTopic } from "../lib/pipeline.js";
import { categorizeWithLLM } from "../lib/gemini.js";

// helper: safe logging (never throws)
async function safeAuditLog(data: any) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: null,   // 👈 always safe now, no FK issues
        ...data,
      },
    });
  } catch (err) {
    console.warn("⚠️ Failed to write AuditLog:", err);
  }
}

const plugin: FastifyPluginAsync = async (app) => {
  // === Global agents (batch) ===
  app.post("/agents/topic-discovery", async () => {
    const trends = await topicDiscovery();
    return { trends };
  });

  app.get("/agents/trends", async () => {
    const trends = await topicDiscovery();
    return { trends };
  });

  app.post("/agents/source-collect", async () => {
    const sources = await sourceCollector();
    return { sources };
  });

  app.post("/agents/process-approved", async () => {
    const result = await processApproved();
    return { result };
  });

  // === Per-topic pipeline ===

  // Step 1: Collect approved sources → Citations
  app.post("/agents/topics/:id/collect", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params as any);

    try {
      const topic = await prisma.topic.findUnique({
        where: { id },
        include: { sources: true },
      });
      if (!topic) return reply.code(404).send({ error: "Topic not found" });

      await prisma.topic.update({
        where: { id },
        data: { status: TopicStatus.PROCESSING },
      });

      const res = await collectContent(
        topic,
        topic.sources.filter((s) => s.approved)
      );

      await prisma.topic.update({
        where: { id },
        data: { status: TopicStatus.COLLECTED },
      });

      await safeAuditLog({
        
        action: "collect",
        topicId: id,
        meta: { status: "SUCCESS", topicId: id, message: "Sources collected" },
      });

      return res;
    } catch (err: any) {
      console.error("❌ Collect failed:", err);
      await safeAuditLog({
        
        action: "collect",
        topicId: id,
        meta: { status: "FAILED", topicId: id, message: err.message },
      });
      return reply.code(500).send({ error: "Collect failed", reason: err.message });
    }
  });

  // Step 2: Draft article
  app.post("/agents/topics/:id/draft", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params as any);

    try {
      const topic = await prisma.topic.findUnique({
        where: { id },
        include: { sources: true, articles: true },
      });
      if (!topic) return reply.code(404).send({ error: "Topic not found" });

      const article = await draftArticle(topic);

      // Auto-categorize
      try {
        const subcats = await prisma.subcategory.findMany({ include: { category: true } });
        if (subcats.length) {
          const pick = await categorizeWithLLM(
            {
              title: article.title,
              tl_dr: article.tl_dr ?? null,
              body_html: article.body_html ?? null,
            },
            subcats.map((s) => ({
              id: s.id,
              name: s.name,
              categoryId: s.categoryId,
              categoryName: s.category?.name || null,
            }))
          );

          const matchSub = subcats.find((s) => s.id === (pick?.subcategoryId || ""));
          const chosenCategoryId = pick?.categoryId || matchSub?.categoryId || null;
          const chosenSubcategoryId = matchSub?.id || null;

          await prisma.article.update({
            where: { id: article.id },
            data: {
              ...(chosenCategoryId ? { categoryId: chosenCategoryId } : {}),
              ...(chosenSubcategoryId ? { subcategoryId: chosenSubcategoryId } : {}),
            },
          });
        }
      } catch (err) {
        console.warn("⚠️ categorizeWithLLM failed at draft:", err);
      }

      await prisma.topic.update({
        where: { id },
        data: { status: TopicStatus.DRAFTED },
      });

      await safeAuditLog({
        
        action: "draft",
        topicId: id,
        meta: {
          status: "SUCCESS",
          topicId: id,
          articleId: article.id,
          message: "Draft created successfully",
        },
      });

      return { ok: true, articleId: article.id };
    } catch (err: any) {
      console.error("❌ Draft failed:", err);
      await safeAuditLog({
       
        action: "draft",
        topicId: id,
        meta: { status: "FAILED", topicId: id, message: err.message },
      });
      await prisma.topic.update({
        where: { id },
        data: { status: TopicStatus.APPROVED },
      });
      return reply.code(500).send({ error: "Draft failed", reason: err.message });
    }
  });

  // Step 3: Review draft
  app.post("/agents/topics/:id/review", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params as any);

    try {
      const topic = await prisma.topic.findUnique({
        where: { id },
        include: { articles: true },
      });
      if (!topic) return reply.code(404).send({ error: "Topic not found" });

      const latest = topic.articles[0];
      if (!latest) return reply.code(400).send({ error: "No draft article" });

      const ok = await reviewDraft(latest.id);

      await prisma.topic.update({
        where: { id },
        data: { status: ok ? TopicStatus.READY : TopicStatus.DRAFTED },
      });

      await safeAuditLog({
       
        action: "review",
        topicId: id,
        meta: {
          status: ok ? "SUCCESS" : "FAILED",
          topicId: id,
          message: ok ? "Review passed" : "Review failed",
        },
      });

      return { ok };
    } catch (err: any) {
      console.error("❌ Review failed:", err);
      await safeAuditLog({
        
        action: "review",
        topicId: id,
        meta: { status: "FAILED", topicId: id, message: err.message },
      });
      return reply.code(500).send({ error: "Review failed", reason: err.message });
    }
  });

  // Step 4: Categorize
  app.post("/agents/topics/:id/categorize", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params as any);
    const body = (req.body || {}) as any;
    const categoryId = body.categoryId ? String(body.categoryId) : undefined;
    const subcategoryId = body.subcategoryId ? String(body.subcategoryId) : undefined;

    try {
      const out = await categorizeTopic(id, { categoryId, subcategoryId });

      await safeAuditLog({
       
        action: "categorize",
        topicId: id,
        meta: { status: "SUCCESS", topicId: id, message: "Categorization updated" },
      });

      return { ok: true, ...out };
    } catch (err: any) {
      console.error("❌ categorizeTopic failed:", err);
      await safeAuditLog({
        
        action: "categorize",
        topicId: id,
        meta: { status: "FAILED", topicId: id, message: err.message },
      });
      return reply.code(500).send({ error: "Categorization failed" });
    }
  });
};

export default plugin;
