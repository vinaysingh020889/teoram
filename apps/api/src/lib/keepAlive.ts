import { prisma } from "db";

export function startKeepAlive() {
  setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log("✅ DB keep-alive ping");
    } catch (err) {
      console.error("❌ DB keep-alive failed", err);
    }
  }, 1000 * 60 * 4); // every 4 minutes
}
