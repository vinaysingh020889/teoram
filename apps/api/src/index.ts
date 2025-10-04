import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import rate from "@fastify/rate-limit";
import jwt from "@fastify/jwt";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import { prisma } from "db";


import authRoutes from "./routes/auth";
import adminUserRoutes from "./routes/admin.users";
import categoryRoutes from "./routes/categories";
import topicRoutes from "./routes/topics";
import sourceRoutes from "./routes/sources";
import articleRoutes from "./routes/articles";
import agentRoutes from "./routes/agents";
import logsRoutes from "./routes/logs.js";
console.log("Gemini key prefix:", process.env.GEMINI_API_KEY?.slice(0, 8));

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(rate, { max: 200, timeWindow: "1 minute" });
await app.register(jwt, { secret: process.env.JWT_SECRET! });

// auth hook: attaches req.user if token valid
(app as any).decorate("auth", async (req: any, reply: any) => {
  try {
    await req.jwtVerify();
  } catch {
    return reply.code(401).send({ error: "unauthorized" });
  }
});

// swagger docs
await app.register(swagger, {
  openapi: { info: { title: "Teoram API", version: "1.0.0" } },
});
await app.register(swaggerUI, { routePrefix: "/docs" });

// prisma per request
app.addHook("onRequest", async (req: any, _res: any) => {
  req.prisma = prisma;
});


// Public routes
app.register(authRoutes, { prefix: "/api/v1" });

// Admin-only routes
app.register(adminUserRoutes, { prefix: "/api/v1" });

// Topics (public + protected inside file)
app.register(topicRoutes, { prefix: "/api/v1" });

// Articles
app.register(articleRoutes, { prefix: "/api/v1" });

app.register(logsRoutes, { prefix: "/api/v1" });
// Public GET category routes
app.register(categoryRoutes, { prefix: "/api/v1" });

// Protected (require auth via preHandler)
app.register(async (instance) => {
  instance.addHook("preHandler", (app as any).auth);
 
  instance.register(sourceRoutes, { prefix: "/api/v1" });
  instance.register(agentRoutes, { prefix: "/api/v1" });
});

// Health check
app.get("/", async () => {
  return { status: "ok", message: "Teoram API is running 🚀" };
});

const port = Number(process.env.PORT || 4000);
app.listen({ port, host: "0.0.0.0" });
