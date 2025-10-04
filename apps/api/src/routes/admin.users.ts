import { FastifyPluginAsync } from "fastify";
import { prisma } from "db";
import { z } from "zod";
import bcrypt from "bcryptjs";

const adminUserRoutes: FastifyPluginAsync = async (app) => {
  // Guard: only ADMINs can hit these endpoints
  const adminGuard = async (req: any, reply: any) => {
    await (app as any).auth(req, reply);
    if (req.user.role !== "ADMIN") {
      return reply.code(403).send({ error: "Forbidden" });
    }
  };

  // GET /admin/users — list all users
  app.get("/admin/users", { preHandler: adminGuard }, async () => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        active: true,
        name: true,
        createdAt: true,
      },
    });
    return { data: users };
  });

  // POST /admin/users — create a new user
  app.post("/admin/users", { preHandler: adminGuard }, async (req, reply) => {
    const body = z
      .object({
        email: z.string().email(),
        name: z.string().optional(),
        role: z.enum(["ADMIN", "EDITOR", "ANALYST"]),
        password: z.string().min(8),
      })
      .parse(req.body);

    const hashed = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        role: body.role,
        passwordHash: hashed,
      },
      select: { id: true, email: true, role: true, active: true, name: true },
    });

    reply.send({ user });
  });

  // PATCH /admin/users/:id — update user (role, name, active, password)
  app.patch("/admin/users/:id", { preHandler: adminGuard }, async (req, reply) => {
    const params = z.object({ id: z.string().cuid() }).parse(req.params);
    const body = z
      .object({
        role: z.enum(["ADMIN", "EDITOR", "ANALYST"]).optional(),
        name: z.string().optional(),
        active: z.boolean().optional(),
        newPassword: z.string().min(8).optional(),
      })
      .parse(req.body);

    const data: any = {};
    if (body.role) data.role = body.role;
    if (body.name !== undefined) data.name = body.name;
    if (body.active !== undefined) data.active = body.active;
    if (body.newPassword) {
      data.passwordHash = await bcrypt.hash(body.newPassword, 10);
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, email: true, role: true, active: true, name: true },
    });

    reply.send({ user });
  });

  // DELETE /admin/users/:id — soft delete (set active = false)
  app.delete("/admin/users/:id", { preHandler: adminGuard }, async (req, reply) => {
    const params = z.object({ id: z.string().cuid() }).parse(req.params);
    await prisma.user.update({
      where: { id: params.id },
      data: { active: false },
    });
    reply.send({ ok: true });
  });
};

export default adminUserRoutes;
