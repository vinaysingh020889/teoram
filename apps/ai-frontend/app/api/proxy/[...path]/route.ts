// apps/ai-frontend/app/api/proxy/[...path]/route.ts
import { NextRequest } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api/v1";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }   // 👈 make it a Promise
) {
  const { path } = await context.params;             // 👈 await it
  const url = new URL(req.url);
  const target = `${BACKEND}/${path.join("/")}${url.search}`;

  const r = await fetch(target, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });

  const body = await r.text();
  return new Response(body, {
    status: r.status,
    headers: { "content-type": r.headers.get("content-type") || "application/json" },
  });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const url = new URL(req.url);
  const target = `${BACKEND}/${path.join("/")}${url.search}`;

  const r = await fetch(target, {
    method: "POST",
    body: req.body as any,
    headers: { "content-type": req.headers.get("content-type") || "application/json" },
  });

  const body = await r.text();
  return new Response(body, {
    status: r.status,
    headers: { "content-type": r.headers.get("content-type") || "application/json" },
  });
}
