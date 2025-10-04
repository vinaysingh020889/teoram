import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "db";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const plugin: FastifyPluginAsync = async (app) => {
  /**
   * ========================
   *  PUBLIC ROUTES
   * ========================
   */

  // --- List categories (with subcategories)
  app.get("/categories", async () => {
    const cats = await prisma.category.findMany({
      orderBy: { order: "asc" },
      include: { subcategories: { orderBy: { order: "asc" } } },
    });
    return { data: cats };
  });

  // --- List subcategories; optional ?categoryId=...
  app.get("/subcategories", async (req) => {
    const { categoryId } = z
      .object({ categoryId: z.string().optional() })
      .parse(req.query as any);

    const subs = await prisma.subcategory.findMany({
      where: categoryId ? { categoryId } : undefined,
      orderBy: [{ categoryId: "asc" }, { order: "asc" }],
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
    return { data: subs };
  });

  /**
   * ========================
   *  PROTECTED ROUTES
   * ========================
   */
  const protectedRoutes: FastifyPluginAsync = async (instance) => {
    instance.addHook("preHandler", (app as any).auth);

    // --- Create category
    instance.post("/categories", async (req, reply) => {
      const body = z
        .object({
          name: z.string().min(2, "Name too short"),
          slug: z.string().optional(),
        })
        .parse(req.body || {});
      const slug = body.slug?.trim() || slugify(body.name);

      const maxOrder = await prisma.category.aggregate({ _max: { order: true } });

      const cat = await prisma.category.create({
        data: {
          name: body.name.trim(),
          slug,
          order: (maxOrder._max.order ?? 0) + 1,
        },
      });

      return reply.code(201).send({ data: cat });
    });

    // --- Update category
    instance.patch("/categories/:id", async (req, reply) => {
      const params = z.object({ id: z.string() }).parse(req.params as any);
      const body = z
        .object({
          name: z.string().min(2).optional(),
          slug: z.string().optional(),
        })
        .parse(req.body || {});

      const data: any = {};
      if (body.name) data.name = body.name.trim();
      if (body.slug !== undefined)
        data.slug = body.slug.trim() || slugify(body.name ?? "");

      // Support update by id OR slug
      const cat = await prisma.category.updateMany({
        where: { OR: [{ id: params.id }, { slug: params.id }] },
        data,
      });

      if (cat.count === 0) return reply.code(404).send({ error: "Category not found" });
      return reply.send({ ok: true });
    });

    // --- Delete category
    instance.delete("/categories/:id", async (req, reply) => {
      const params = z.object({ id: z.string() }).parse(req.params as any);

      const deleted = await prisma.category.deleteMany({
        where: { OR: [{ id: params.id }, { slug: params.id }] },
      });

      if (deleted.count === 0) return reply.code(404).send({ error: "Category not found" });
      return reply.send({ ok: true });
    });

    // --- Reorder categories
    instance.post("/categories/reorder", async (req, reply) => {
      const body = z
        .object({ ids: z.array(z.string()).nonempty() })
        .parse(req.body || {});
      await prisma.$transaction(
        body.ids.map((id, idx) =>
          prisma.category.update({
            where: { id }, // reorder must use UUIDs
            data: { order: idx + 1 },
          })
        )
      );
      return reply.send({ ok: true });
    });

    // --- Create subcategory (support id or slug)
    instance.post("/categories/:categoryId/subcategories", async (req, reply) => {
      const params = z.object({ categoryId: z.string() }).parse(req.params as any);
      const body = z
        .object({ name: z.string().min(2), slug: z.string().optional() })
        .parse(req.body || {});
      const slug = body.slug?.trim() || slugify(body.name);

      const cat = await prisma.category.findFirst({
        where: { OR: [{ id: params.categoryId }, { slug: params.categoryId }] },
      });
      if (!cat) return reply.code(404).send({ error: "Category not found" });

      const maxOrder = await prisma.subcategory.aggregate({
        _max: { order: true },
        where: { categoryId: cat.id },
      });

      const sub = await prisma.subcategory.create({
        data: {
          name: body.name.trim(),
          slug,
          order: (maxOrder._max.order ?? 0) + 1,
          categoryId: cat.id,
        },
      });
      return reply.code(201).send({ data: sub });
    });

    // --- Update subcategory
    instance.patch("/subcategories/:id", async (req, reply) => {
      const params = z.object({ id: z.string() }).parse(req.params as any);
      const body = z
        .object({
          name: z.string().min(2).optional(),
          slug: z.string().optional(),
          categoryId: z.string().optional(),
        })
        .parse(req.body || {});

      const data: any = {};
      if (body.name) data.name = body.name.trim();
      if (body.slug !== undefined)
        data.slug = body.slug.trim() || slugify(body.name ?? "");

      // If categoryId provided, resolve slug or id
      if (body.categoryId) {
        const cat = await prisma.category.findFirst({
          where: { OR: [{ id: body.categoryId }, { slug: body.categoryId }] },
        });
        if (!cat) return reply.code(404).send({ error: "Category not found" });
        data.categoryId = cat.id;
      }

      const sub = await prisma.subcategory.updateMany({
        where: { id: params.id },
        data,
      });
      if (sub.count === 0) return reply.code(404).send({ error: "Subcategory not found" });
      return reply.send({ ok: true });
    });

    // --- Delete subcategory
    instance.delete("/subcategories/:id", async (req, reply) => {
      const params = z.object({ id: z.string() }).parse(req.params as any);
      const deleted = await prisma.subcategory.deleteMany({ where: { id: params.id } });
      if (deleted.count === 0) return reply.code(404).send({ error: "Subcategory not found" });
      return reply.send({ ok: true });
    });

    // --- Reorder subcategories
    instance.post("/categories/:categoryId/subcategories/reorder", async (req, reply) => {
      const params = z.object({ categoryId: z.string() }).parse(req.params as any);
      const body = z
        .object({ ids: z.array(z.string()).nonempty() })
        .parse(req.body || {});

      const cat = await prisma.category.findFirst({
        where: { OR: [{ id: params.categoryId }, { slug: params.categoryId }] },
      });
      if (!cat) return reply.code(404).send({ error: "Category not found" });

      await prisma.$transaction(
        body.ids.map((id, idx) =>
          prisma.subcategory.update({
            where: { id },
            data: { order: idx + 1, categoryId: cat.id },
          })
        )
      );
      return reply.send({ ok: true });
    });
  };

  app.register(protectedRoutes);
};

export default plugin;
