import type { FastifyPluginAsync } from "fastify";
import { prisma } from "db";
import { z } from "zod";
import bcrypt from "bcryptjs";

const authRoutes: FastifyPluginAsync = async (app) => {
  // POST /auth/login
  app.post("/auth/login", async (req, reply) => {
    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(6),
      })
      .parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !user.active) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) return reply.code(401).send({ error: "Invalid credentials" });

    // Use @fastify/jwt (already registered in index.ts)
    const token = app.jwt.sign({ id: user.id, role: user.role });

    return reply.send({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        active: user.active,
        name: user.name,
      },
    });
  });

  // POST /auth/logout (client should just drop the token)
  app.post("/auth/logout", async (_req, reply) => {
    return reply.send({ ok: true });
  });

  // GET /auth/me
// GET /auth/me
app.get("/auth/me", { preHandler: (app as any).auth }, async (req: any, reply) => {
  // after jwtVerify, req.user has the JWT payload
  const payload = req.user as { id: string; role: string };
  if (!payload?.id) {
    return reply.code(401).send({ error: "Unauthorized" });
  }

  const me = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!me) return reply.code(404).send({ error: "User not found" });

  return reply.send({
    user: {
      id: me.id,
      email: me.email,
      role: me.role,
      active: me.active,
      name: me.name,
    },
  });
});


  // POST /auth/change-password
  app.post("/auth/change-password", { preHandler: (app as any).auth }, async (req: any, reply) => {
    const body = z
      .object({
        current: z.string().min(6),
        next: z.string().min(8),
      })
      .parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return reply.code(404).send({ error: "User not found" });

    const ok = await bcrypt.compare(body.current, user.passwordHash);
    if (!ok) return reply.code(400).send({ error: "Current password wrong" });

    const hashed = await bcrypt.hash(body.next, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashed },
    });
    return reply.send({ ok: true });
  });
};

export default authRoutes;
