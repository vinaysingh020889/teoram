"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "../../../lib/api";
import PipelineActions from "./PipelineActions";

export default function TopicDetail() {
  const { id } = useParams<{ id: string }>();
  const [topic, setTopic] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [savingApprove, setSavingApprove] = useState(false);

  // Article editing state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tl_dr, setTlDr] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [savingArticle, setSavingArticle] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/topics/${id}`);
        const t = res.data?.data || null;
        setTopic(t);

        if (t?.sources) {
          const chosen: Record<string, boolean> = {};
          t.sources.forEach((s: any) => { if (s.approved) chosen[s.url] = true; });
          setSelected(chosen);
        }

        const a = t?.article || t?.articles?.[0];
        if (a) {
          setTitle(a.title || "");
          setBody(a.body_html || "");
          setTlDr(a.tl_dr || "");
          setCategoryId(a.category?.id || "");
          setSubcategoryId(a.subcategory?.id || "");
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  async function saveApprove() {
    try {
      setSavingApprove(true);
      const selectedUrls = Object.entries(selected)
        .filter(([,v]) => v).map(([k]) => k);
      await api.post(`/topics/${id}/approve`, { selectedUrls });
      alert("Approved sources saved, article ensured/updated");
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert("Failed to approve sources");
    } finally {
      setSavingApprove(false);
    }
  }

  async function saveArticle() {
    try {
      setSavingArticle(true);
      const articleId = topic?.article?.id || topic?.articles?.[0]?.id;
      if (!articleId) return alert("No article found");
      await api.patch(`/articles/${articleId}`, {
        title, body_html: body, tl_dr,
        categoryId: categoryId || null,
        subcategoryId: subcategoryId || null,
      });
      alert("Article updated");
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert("Failed to update article");
    } finally {
      setSavingArticle(false);
    }
  }

  if (loading) return <div>Loading topic…</div>;
  if (!topic) return <div>Topic not found</div>;

  return (
    <main className="grid gap-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="h1">{title || topic.title}</h1>
        <span className={`badge ${topic.status === "PUBLISHED" ? "badge--ok" : topic.status === "NEW" ? "badge--warn" : "badge--err"}`}>
          {topic.status}
        </span>
      </div>

      {/* Approve sources */}
      <section className="card p-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="h2">Sources</h2>
          <button onClick={saveApprove} disabled={savingApprove} className="btn btn--primary">
            {savingApprove ? "Saving…" : "Save Approvals"}
          </button>
        </div>
        {(topic.sources || []).map((s: any) => (
          <label key={s.id} className="flex gap-3 items-start p-2 hover:bg-gray-50">
            <input
              type="checkbox"
              checked={!!selected[s.url]}
              onChange={e => setSelected(prev => ({ ...prev, [s.url]: e.target.checked }))}
            />
            <div>
              <a href={s.url} target="_blank" className="underline">{s.title || s.url}</a>
              <div className="text-xs text-gray-500">{s.contentType || "unknown"} · {s.approved ? "approved" : "not approved"}</div>
            </div>
          </label>
        ))}
      </section>

      {/* Article editor */}
      <section className="card p-4 grid gap-3">
        <h2 className="h2">Article</h2>
        <input value={title} onChange={e => setTitle(e.target.value)} className="w-full" placeholder="Title" />
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={6} className="w-full" placeholder="Body HTML" />
        <textarea value={tl_dr} onChange={e => setTlDr(e.target.value)} rows={3} className="w-full" placeholder="Summary / TL;DR" />
        <div className="flex gap-2">
          <input value={categoryId} onChange={e => setCategoryId(e.target.value)} placeholder="Category ID" className="flex-1" />
          <input value={subcategoryId} onChange={e => setSubcategoryId(e.target.value)} placeholder="Subcategory ID" className="flex-1" />
        </div>
        <button onClick={saveArticle} disabled={savingArticle} className="btn btn--primary">
          {savingArticle ? "Saving…" : "Save Article"}
        </button>
      </section>

      {/* Pipeline */}
      <PipelineActions topicId={topic.id} status={topic.status} />
    </main>
  );
}
