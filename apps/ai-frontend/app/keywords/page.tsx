"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, arr, publishedOnly, normalizeKeywords } from "../../lib/api";

export default function KeywordsPage() {
  const [arts, setArts] = useState<any[]>([]);

useEffect(() => {
  api
    .get("/articles")
    .then((r) => {
      const list = publishedOnly(arr(r.data, ["data"]));
      console.log("Fetched articles:", list);  // 👈 ADD THIS
      setArts(list);
    })
    .catch(() => setArts([]));
}, []);


  const counts = useMemo(() => {
    const map = new Map<string, number>();
    arts.forEach((a) => {
      normalizeKeywords(a).forEach((k) => {
        const clean = k.toLowerCase();
        map.set(clean, (map.get(clean) || 0) + 1);
      });
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [arts]);

  return (
    <main className="grid gap-6">
      <h1 className="h1">Keywords</h1>
      {counts.length === 0 ? (
        <p className="text-muted">No keywords yet.</p>
      ) : (
       <div className="keyword-list mt-5 flex">
  {counts.map(([k, n]) => {
    const size = Math.min(12 + n * 2, 34);
    return (
      <Link key={k} href={`/keywords/${encodeURIComponent(k)}`}>
        <span className="keyword-pill" style={{ fontSize: `${size}px` }}>
          {k}
        </span>
      </Link>
    );
  })}
</div>
      )}
    </main>
  );
}
