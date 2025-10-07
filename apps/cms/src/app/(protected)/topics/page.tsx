//appscms/src/app/(protected)/topics/page.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../../lib/api";
import Link from "next/link";

const STAGES = ["NEW","APPROVED","COLLECTED","DRAFTED","ASSIGNED","READY","PUBLISHED"] as const;
type Stage = typeof STAGES[number];

export default function TopicsPage() {
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<Stage | "ALL">("ALL");

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/topics");
        setTopics(res.data?.data || []); 
      } catch (e) {
        console.error(e);
        setTopics([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const base = stage === "ALL" ? topics : topics.filter((t: any) => t.status === stage);
    if (!q.trim()) return base;
    const s = q.toLowerCase();
    return base.filter((t: any) =>
      (t.title || "").toLowerCase().includes(s) ||
      (t.article?.title || "").toLowerCase().includes(s)
    );
  }, [topics, q, stage]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    STAGES.forEach(s => (c[s] = 0));
    (topics || []).forEach((t: any) => { c[t.status] = (c[t.status] || 0) + 1; });
    return c;
  }, [topics]);

  if (loading) return <div>Loading topics…</div>;

  function statusClass(status: string) {
    switch (status) {
      case "NEW": return "badge--warn";
      case "APPROVED":
      case "COLLECTED":
      case "DRAFTED":
      case "ASSIGNED":
      case "READY":
        return "badge--ok";
      case "PUBLISHED": return "badge--ok";
      default: return "badge--err";
    }
  }

  return (
    <main className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="h1">Topics</h1>
        <Link href="/topics/discovery" className="btn btn--primary">Discovery</Link>
      </div>

      {/* Stats */}
      <div className="grid grid-3">
        <div className="card stat">
          <div className="stat__value">{topics.length}</div>
          <div className="stat__label">Total</div>
        </div>
        <div className="card stat">
          <div className="stat__value">{counts["PUBLISHED"] || 0}</div>
          <div className="stat__label">Published</div>
        </div>
        <div className="card stat">
          <div className="stat__value">{topics.length - (counts["PUBLISHED"] || 0)}</div>
          <div className="stat__label">Pending</div>
        </div>
      </div>

      {/* Controls */}
      <div className="card p-4 grid gap-3 md:flex md:items-center md:justify-between">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by topic or article title…"
          className="w-full md:w-1/2"
        />
        <div className="flex gap-2 overflow-auto">
          <button onClick={() => setStage("ALL")}
                  className={`badge ${stage==="ALL"?"badge--ok":""}`}>ALL</button>
          {STAGES.map(s => (
            <button key={s}
                    onClick={() => setStage(s)}
                    className={`badge ${stage===s?"badge--ok":""}`}>
              {s} ({counts[s] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="grid gap-2">
        {filtered.map((t: any) => (
          <Link
            key={t.id}
            href={`/topics/${t.id}`}
            className="card p-4 flex items-center justify-between hover:bg-gray-50"
          >
            <div className="grid">
              <span className="font-medium">{t.article?.title || t.title}</span>
              {t.article?.category?.name && (
                <span className="text-xs text-gray-500">
                  {t.article?.category?.name} → {t.article?.subcategory?.name || "—"}
                </span>
              )}
            </div>
            <span className={`badge ${statusClass(t.status)}`}>{t.status}</span>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="empty">Nothing matches your filters.</div>
        )}
      </div>
    </main>
  );
}
