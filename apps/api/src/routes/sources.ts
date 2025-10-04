import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "db";

const plugin: FastifyPluginAsync = async (app) => {
  app.post("/sources/:id/approve", async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params as any);
    return prisma.source.update({ where: { id }, data: { approved: true } });
  });
};
export default plugin;