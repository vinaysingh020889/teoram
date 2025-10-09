//apps/api/src/routes/logs.ts
import { FastifyPluginAsync } from "fastify";
import { prisma } from "db";

const plugin: FastifyPluginAsync = async (app) => {
  // 🔹 Default unified logs view (as before)
  app.get("/logs", async () => {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 150,
      include: {
        topic: { select: { id: true, title: true, status: true } },
      },
    });
    return { data: logs };
  });

  // 🔹 Topic Discovery Pipeline logs only
  app.get("/logs/topics", async () => {
    const logs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { action: "TOPIC_DISCOVERY_RUN" },
          { action: "TOPIC_CREATED" },
          { action: "TOPIC_REUSED" },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 150,
      include: {
        topic: { select: { id: true, title: true, status: true } },
      },
    });
    return { data: logs };
  });

  // 🔹 Article Generation / Pipeline logs only
  // 🔹 Article / Editorial pipeline logs only (collect → draft → review → publish)
app.get("/logs/articles", async () => {
  const logs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { action: "collect" },
        { action: "draft" },
        { action: "review" },
        { action: "publish" },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 150,
    include: {
      topic: { select: { id: true, title: true, status: true } },
    },
  });
  return { data: logs };
});

};

export default plugin;
