import { FastifyPluginAsync } from "fastify";
import { prisma } from "db";

const plugin: FastifyPluginAsync = async (app) => {
  app.get("/logs", async () => {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        topic: { select: { id: true, title: true, status: true } }
      }
    });
    return { data: logs };
  });
};

export default plugin;
