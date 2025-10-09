import { PrismaClient, Prisma, TopicStatus, SourceKind, ContentType } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["query", "error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// ✅ Re-export everything cleanly (this is what AWS build liked)
export { PrismaClient, Prisma, TopicStatus, SourceKind, ContentType };
export type { Prisma as PrismaTypes };
