"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import Link from "next/link";

export default function DiscoveryClient() {
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const res = await api.get("/topics/discovery");
      setTopics(res.data?.data || []);
    } catch (e) {
      console.error(e);
      setTopics([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function runDiscovery() {
    try {
      setBusy(true);
      await api.post("/topics/discover", {}); // your manual trigger (public)
      await load();
      alert("Discovery triggered.");
    } catch (e) {
      console.error(e);
      alert("Failed to trigger discovery");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div>Loading discovery…</div>;

  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between">
        <h2 className="h2">New Topics</h2>
        <button onClick={runDiscovery} className="btn btn--primary" disabled={busy}>
          {busy ? "Running…" : "Run Discovery"}
        </button>
      </div>

      <div className="grid gap-2">
        {topics.map((t: any) => (
          <Link
            key={t.id}
            href={`/protected/topics/${t.id}`}
            className="card p-4 flex items-center justify-between hover:bg-gray-50"
          >
            <span>{t.title}</span>
            <span className="badge badge--warn">{t.status}</span>
          </Link>
        ))}
        {topics.length === 0 && (
          <div className="empty">No NEW topics. Try Run Discovery.</div>
        )}
      </div>
    </section>
  );
}
