//packages/core/src/utils/url.ts
import crypto from "node:crypto";

export function normalizeUrl(u: string): string {
  try {
    const url = new URL(u);
    url.hash = "";
    // Drop common trackers
    const drop = new Set(["utm_source","utm_medium","utm_campaign","utm_term","utm_content","gclid","fbclid"]);
    const params = new URLSearchParams();
    [...url.searchParams.entries()].sort(([a],[b]) => a.localeCompare(b)).forEach(([k,v]) => {
      if (!drop.has(k)) params.append(k,v);
    });
    url.search = params.toString() ? `?${params.toString()}` : "";
    url.hostname = url.hostname.toLowerCase();
    // remove trailing slash (except root)
    url.pathname = url.pathname !== "/" ? url.pathname.replace(/\/$/, "") : "/";
    return url.toString();
  } catch {
    return u.trim();
  }
}

export function sha1(s: string): string {
  return crypto.createHash("sha1").update(s).digest("hex");
}