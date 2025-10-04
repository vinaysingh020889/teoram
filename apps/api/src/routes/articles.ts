import { FastifyPluginAsync } from "fastify";
import { prisma } from "db";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { ContentType } from "@prisma/client";
import { slugify } from "../lib/slugify";
// NOTE: This file assumes your Prisma `Article` model has relations:
//   category   Category?   @relation(fields: [categoryId], references: [id])
//   subcategory Subcategory? @relation(fields: [subcategoryId], references: [id])
//
// and (commonly) a Postgres text[] for keywords:
//   keywords   String[]?
// If your `keywords` is Json instead, see the comment in the PATCH handler.

const plugin: FastifyPluginAsync = async (app) => {

  // ───────────────────────────────────────────────────────────
// GET all articles (with parent topic) — PUBLIC
// ───────────────────────────────────────────────────────────
// Public list: only published
app.get("/articles", async () => {
  const articles = await prisma.article.findMany({
    where: { publishedAt: { not: null } },   // ✅ only published
    include: { topic: true },
    orderBy: { createdAt: "desc" },
  });
  return { data: articles };
});

// ───────────────────────────────────────────────────────────
// GET all articles (for CMS) — shows any with APPROVED or PUBLISHED topic
// ───────────────────────────────────────────────────────────
app.get(
  "/articles/all",
  { preHandler: (app as any).auth }, // ✅ keep auth for CMS protection
  async (req, reply) => {
    try {
      const articles = await prisma.article.findMany({
        where: {
          topic: {
            status: {
              in: ["APPROVED", "PUBLISHED"], // ✅ show approved + published topics
            },
          },
        },
        include: {
          topic: true,
          category: { select: { id: true, name: true } },
          subcategory: {
            select: {
              id: true,
              name: true,
              category: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return { data: articles };
    } catch (err) {
      req.log.error(err, "Failed to fetch articles for CMS");
      return reply.code(500).send({ error: "Failed to fetch articles" });
    }
  }
);



  // ───────────────────────────────────────────────────────────
  // GET one article (with friendly names for category/subcategory)
  // ───────────────────────────────────────────────────────────
  app.get("/articles/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params as any);

    const article = await prisma.article.findUnique({
      where: { id },
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
    });

    if (!article) return reply.code(404).send({ error: "Article not found" });
    return { data: article };
  });

  // ───────────────────────────────────────────────────────────
  // PATCH (edit) article — title, tl_dr, body, faq, meta, keywords,
  // contentType (enum), category/subcategory (nested writes).
  // Allowed even after publish.
  // ───────────────────────────────────────────────────────────
  app.patch(
    "/articles/:id",
    { preHandler: (app as any).auth },
    async (req, reply) => {
      const { id } = z.object({ id: z.string() }).parse(req.params as any);

      const body = z
        .object({
          title: z.string().min(3).max(200).optional(),
          tl_dr: z.string().nullable().optional(),
          body_html: z.string().optional(),
          faq_html: z.string().nullable().optional(),
          metaTitle: z.string().nullable().optional(),
          metaDescription: z.string().nullable().optional(),

          // If your Prisma schema uses Postgres text[] for keywords:
          keywords: z.array(z.string()).optional(),
          // If your Prisma schema uses Json for keywords, replace the line above with:
          // keywords: z.any().optional(),

          contentType: z.nativeEnum(ContentType).nullable().optional(),

          // Taxonomy
          categoryId: z.string().nullable().optional(),
          subcategoryId: z.string().nullable().optional(),
        })
        .parse((req.body || {}) as any);

      // If subcategoryId provided but categoryId missing, derive category from DB
      let derivedCategoryId: string | null | undefined = undefined;
      if (body.subcategoryId !== undefined && body.categoryId === undefined) {
        const sub = await prisma.subcategory.findUnique({
          where: { id: body.subcategoryId ?? "" },
          select: { categoryId: true },
        });
        derivedCategoryId = sub?.categoryId ?? null;
      }

      // Build a Prisma-safe update object
      const data: Prisma.ArticleUpdateInput = {};

      if (body.title !== undefined) data.title = body.title;
      if (body.tl_dr !== undefined) data.tl_dr = body.tl_dr;
      if (body.body_html !== undefined) data.body_html = body.body_html;
      if (body.faq_html !== undefined) data.faq_html = body.faq_html;
      if (body.metaTitle !== undefined) data.metaTitle = body.metaTitle;
      if (body.metaDescription !== undefined) data.metaDescription = body.metaDescription;

      // keywords — choose ONE branch matching your schema:
      if (body.keywords !== undefined) {
        // If keywords is String[] (text[]) in Prisma:
        (data as any).keywords = { set: body.keywords };

        // If keywords is Json in Prisma, use this instead:
        // (data as any).keywords = body.keywords;
      }

      if (body.contentType !== undefined) {
        data.contentType = body.contentType;
      }

      // Nested relation writes for taxonomy (type-safe)
      // Category: from explicit body OR derived from subcategory
      if (body.categoryId !== undefined || derivedCategoryId !== undefined) {
        const cid = body.categoryId !== undefined ? body.categoryId : derivedCategoryId;
        if (cid === null) {
          data.category = { disconnect: true };
        } else if (cid) {
          data.category = { connect: { id: cid } };
        }
      }

      // Subcategory: use explicit value from body only
      if (body.subcategoryId !== undefined) {
        if (body.subcategoryId === null) {
          data.subcategory = { disconnect: true };
        } else if (body.subcategoryId) {
          data.subcategory = { connect: { id: body.subcategoryId } };
        }
      }

      const updated = await prisma.article.update({
        where: { id },
        data,
        include: {
          category: { select: { id: true, name: true} },
          subcategory: {
            select: {
              id: true,
              name: true,
              category: { select: { id: true, name: true } },
            },
          },
        },
      });

      return { data: updated };
    }
  );

  // ───────────────────────────────────────────────────────────
  // PUBLISH (sets publishedAt = now)
  // ───────────────────────────────────────────────────────────
  app.post(
  "/articles/:id/publish",
  { preHandler: (app as any).auth },
  async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params as any);

    const updated = await prisma.article.update({
      where: { id },
      data: { publishedAt: new Date() },
      include: {
        topic: true,
        category: { select: { id: true, name: true } },
        subcategory: {
          select: {
            id: true,
            name: true,
            category: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!updated.topicId) {
      return reply.code(400).send({ error: "Article has no topicId" });
    }

    await prisma.topic.update({
      where: { id: updated.topicId },
      data: { status: "PUBLISHED" },
    });

    return { ok: true, data: updated };
  }
);

// ───────────────────────────────────────────────────────────
// GET one article by slug
// ───────────────────────────────────────────────────────────
app.get("/articles/slug/:slug", async (req, reply) => {
  const { slug } = z.object({ slug: z.string() }).parse(req.params as any);

  const article = await prisma.article.findUnique({
    where: { slug },
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
  });

  if (!article) return reply.code(404).send({ error: "Article not found" });
  return { data: article };
});


// CREATE article manually
app.post(
  "/articles",
  { preHandler: (app as any).auth },
  async (req, reply) => {
    const body = z.object({
      topicId: z.string(), // required
      title: z.string().min(3).max(200),
      tl_dr: z.string().nullable().optional(),
      body_html: z.string(),
      faq_html: z.string().nullable().optional(),
      metaTitle: z.string().nullable().optional(),
      metaDescription: z.string().nullable().optional(),
      contentType: z.nativeEnum(ContentType).nullable().optional(),
    }).parse(req.body as any);

    const data: Prisma.ArticleCreateInput = {
      slug: slugify(body.title), // ✅ required field
      title: body.title,
      body_html: body.body_html,
      tl_dr: body.tl_dr ?? null,
      faq_html: body.faq_html ?? null,
      metaTitle: body.metaTitle ?? null,
      metaDescription: body.metaDescription ?? null,
      contentType: body.contentType ?? null,
      topic: { connect: { id: body.topicId } }, // ✅ relation
    };

    const article = await prisma.article.create({ data });
    return { data: article };
  }
);



  // (Optional) UNPUBLISH (sets publishedAt = null)
  app.post(
    "/articles/:id/unpublish",
    { preHandler: (app as any).auth },
    async (req, reply) => {
      const { id } = z.object({ id: z.string() }).parse(req.params as any);

      const updated = await prisma.article.update({
        where: { id },
        data: { publishedAt: null },
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
      });

      return { ok: true, data: updated };
    }
  );
};

export default plugin;
