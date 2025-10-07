import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api/v1",
  timeout: 20000,
});

// Safely return an array from { data: [...] } or [...]
export function arr<T = any>(maybe: any, path?: string[]): T[] {
  let v = maybe;
  for (const k of path || []) v = v?.[k];
  return Array.isArray(v) ? v : Array.isArray(maybe) ? maybe : [];
}

// ✅ Add this helper — used by keywords/page.tsx and homepage
export function publishedOnly(list: any[]) {
  return (list || []).filter(
    (a) =>
      a?.topic?.status === "APPROVED" ||
      a?.topic?.status === "PUBLISHED"
  );
}


// Strip HTML tags to plain text
export function htmlToText(html: string = ""): string {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// Simple snippet from either tl_dr or body_html
export function snippet(a: any, max = 220): string {
  const src = a?.tl_dr?.trim() || htmlToText(a?.body_html || "");
  return src.length > max ? src.slice(0, max - 1) + "…" : src;
}

// apps/ai-frontend/lib/api.ts
export function normalizeKeywords(a: any): string[] {
  if (!a) return [];
  if (Array.isArray(a.keywords)) return a.keywords.filter(Boolean);
  if (typeof a.keywords === "string") {
    return a.keywords
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
  }
  return [];
}

