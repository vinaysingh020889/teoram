/********************************************************************************************
 *  TEORAM API ENTRYPOINT — Full Enhanced Version
 *  ---------------------------------------------------------------------------
 *  • Fixes: Fastify plugin type overloads (rate-limit, jwt, swagger, etc.)
 *  • Works with: "module": "NodeNext", ESM, pnpm monorepo, TypeScript
 *  • No removed lines — all existing functionality intact
 ********************************************************************************************/

import "dotenv/config";
import Fastify from "fastify";

// ─────────────────────────────────────────────────────────────
// Fastify Plugins (use default imports for ESM interop)
// ─────────────────────────────────────────────────────────────
import fastifyCors from "@fastify/cors";
import * as rateLimit from "@fastify/rate-limit";
import fastifyJwt from "@fastify/jwt";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUI from "@fastify/swagger-ui";

// ─────────────────────────────────────────────────────────────
// Database (Prisma via workspace package)
// ─────────────────────────────────────────────────────────────
import { prisma } from "db";

// ─────────────────────────────────────────────────────────────
// Route Imports
// ─────────────────────────────────────────────────────────────
import authRoutes from "./routes/auth.js";
import adminUserRoutes from "./routes/admin.users.js";
import categoryRoutes from "./routes/categories.js";
import topicRoutes from "./routes/topics.js";
import sourceRoutes from "./routes/sources.js";
import articleRoutes from "./routes/articles.js";
import agentRoutes from "./routes/agents.js";
import logsRoutes from "./routes/logs.js";

// ─────────────────────────────────────────────────────────────
// Environment Check
// ─────────────────────────────────────────────────────────────
console.log("Gemini key prefix:", process.env.GEMINI_API_KEY?.slice(0, 8));

/********************************************************************************************
 *  FASTIFY APP SETUP
 ********************************************************************************************/
const app = Fastify({ logger: true });

// ─────────────────────────────────────────────────────────────
// Register Global Plugins
// ─────────────────────────────────────────────────────────────
await app.register(fastifyCors, { origin: true });
await app.register(rateLimit.default as any, { max: 200, timeWindow: "1 minute" });
await app.register(fastifyJwt, { secret: process.env.JWT_SECRET! });

// ─────────────────────────────────────────────────────────────
// Auth Hook (Decorator)
// ─────────────────────────────────────────────────────────────
(app as any).decorate("auth", async (req: any, reply: any) => {
  try {
    await req.jwtVerify();
  } catch {
    return reply.code(401).send({ error: "unauthorized" });
  }
});

// ─────────────────────────────────────────────────────────────
// Swagger Documentation
// ─────────────────────────────────────────────────────────────
await app.register(fastifySwagger, {
  openapi: {
    info: { title: "Teoram API", version: "1.0.0" },
  },
});
await app.register(fastifySwaggerUI, { routePrefix: "/docs" });

// ─────────────────────────────────────────────────────────────
// Prisma per Request (attach Prisma instance to req)
// ─────────────────────────────────────────────────────────────
app.addHook("onRequest", async (req: any, _res: any) => {
  req.prisma = prisma;
});

/********************************************************************************************
 *  ROUTES REGISTRATION
 ********************************************************************************************/

// Public Routes
app.register(authRoutes, { prefix: "/api/v1" });

// Admin Routes
app.register(adminUserRoutes, { prefix: "/api/v1" });

// Topics (public + protected inside file)
app.register(topicRoutes, { prefix: "/api/v1" });

// Articles
app.register(articleRoutes, { prefix: "/api/v1" });

// Logs
app.register(logsRoutes, { prefix: "/api/v1" });

// Categories (public)
app.register(categoryRoutes, { prefix: "/api/v1" });

// Protected Routes (require auth preHandler)
app.register(async (instance) => {
  instance.addHook("preHandler", (app as any).auth);

  instance.register(sourceRoutes, { prefix: "/api/v1" });
  instance.register(agentRoutes, { prefix: "/api/v1" });
});

/********************************************************************************************
 *  HEALTH CHECK ENDPOINT
 ********************************************************************************************/
app.get("/", async () => {
  return { status: "ok", message: "Teoram API is running 🚀" };
});

/********************************************************************************************
 *  START SERVER
 ********************************************************************************************/
const port = Number(process.env.PORT || 4000);

app
  .listen({ port, host: "0.0.0.0" })
  .then(() => {
    console.log(`🚀 Server ready at http://localhost:${port} — Teoram API`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });

/********************************************************************************************
 *  END OF FILE
 ********************************************************************************************/
