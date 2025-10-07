// apps/ai-frontend/lib/api.ts
import axios from "axios";

export const api = axios.create({
  baseURL: "/api/proxy", // hits the proxy in app/api/proxy/[...path]/route.ts
  timeout: 20000,
});

// Safely pick an array from { data: [...] } or just [...]
export function arr<T = any>(maybe: any, path?: string[]): T[] {
  let v = maybe;
  for (const k of path || []) v = v?.[k];
  return Array.isArray(v) ? v : Array.isArray(maybe) ? maybe : [];
}

// ✅ Check if an article is considered published
export function isPublished(a: any) {
  return !!a?.publishedAt || a?.topic?.status === "PUBLISHED";
}

// ✅ Keep only published
export function publishedOnly(list: any[]) {
  return (list || []).filter(isPublished);
}

// Convert HTML to plain text
export function htmlToText(html: string = ""): string {
  return (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// Short summary/snippet
export function snippet(a: any, max = 220): string {
  const src = (a?.tl_dr || "").trim() || htmlToText(a?.body_html || "");
  return src.length > max ? src.slice(0, max - 1) + "…" : src;
}

// ✅ Sort newest first
export function byDateDesc(a: any, b: any) {
  const A = new Date(a?.publishedAt || a?.createdAt || 0).getTime();
  const B = new Date(b?.publishedAt || b?.createdAt || 0).getTime();
  return B - A;
}

// normalize keywords from article
export function normalizeKeywords(a: any): string[] {
  if (!a) return [];
  if (Array.isArray(a.keywords)) return a.keywords.filter(Boolean);
  if (typeof a.keywords === "string" && a.keywords.trim()) {
    return a.keywords
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
  }
  return [];
}


