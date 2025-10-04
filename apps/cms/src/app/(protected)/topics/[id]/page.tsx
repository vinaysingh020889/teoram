"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "../../../../lib/api";
import PipelineActions from "./PipelineActions";
import { useAuth } from "../../../../lib/auth";
import RequireAuth from "../../../../components/RequireAuth";

function normalizeKeywords(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function Toast({ msg, type = "success" }: { msg: string; type?: "success" | "error" | "info" }) {
  return (
    <div
      className={`pointer-events-auto rounded-lg px-4 py-2 shadow-md text-sm text-white ${
        type === "success" ? "bg-green-600" : type === "error" ? "bg-red-600" : "bg-slate-700"
      }`}
    >
      {msg}
    </div>
  );
}

function TopicDetailInner() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isEditor = user?.role === "ADMIN" || user?.role === "EDITOR";

  const [topic, setTopic] = useState<any>(null);
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [savingApprove, setSavingApprove] = useState(false);

  // Shared editor states (used by edit mode AND manual create)
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tl_dr, setTlDr] = useState("");
  const [faq, setFaq] = useState("");
  const [outline, setOutline] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [savingArticle, setSavingArticle] = useState(false);
  const [creatingArticle, setCreatingArticle] = useState(false); // ADDED
  const [editMode, setEditMode] = useState(false);

  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(
    null
  );
  function showToast(msg: string, type: "success" | "error" | "info" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function refreshTopic() {
    const res = await api.get(`/topics/${id}`);
    const t = res.data?.data || null;
    setTopic(t);
    if (t?.sources) {
      const chosen: Record<string, boolean> = {};
      t.sources.forEach((s: any) => {
        if (s.approved) chosen[s.url] = true;
      });
      setSelected(chosen);
    }
    const a = t?.article || t?.articles?.[0];
    if (a) {
      setArticle(a);
      setTitle(a.title || "");
      setBody(a.body_html || "");
      setTlDr(a.tl_dr || "");
      setFaq(a.faq_html || "");
      setOutline(JSON.stringify(a.outline_json, null, 2) || "");
      setMetaTitle(a.metaTitle || "");
      setMetaDescription(a.metaDescription || "");
      setKeywords(Array.isArray(a.keywords) ? a.keywords : []);
      setCategoryId(a.category?.id || "");
      setSubcategoryId(a.subcategory?.id || "");
    } else {
      // Ensure clean slate for manual create form if no article exists
      setTitle("");
      setBody("");
      setTlDr("");
      setFaq("");
      setOutline("");
      setMetaTitle("");
      setMetaDescription("");
      setKeywords([]);
      setCategoryId("");
      setSubcategoryId("");
    }
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [_, catRes, subcatRes] = await Promise.all([
        refreshTopic(),
        api.get("/categories").catch(() => ({ data: { data: [] } })),
        api.get("/subcategories").catch(() => ({ data: { data: [] } })),
      ]);
      setCategories(catRes.data?.data || []);
      setSubcategories(subcatRes.data?.data || []);
      setLoading(false);
    }
    if (id) load();
  }, [id]);

  async function saveApprove() {
    try {
      setSavingApprove(true);
      const selectedUrls = Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => k);
      await api.post(`/topics/${id}/approve`, { selectedUrls });
      showToast("Sources approved", "success");
      await refreshTopic();
    } catch (e) {
      showToast("Failed to approve sources", "error");
    } finally {
      setSavingApprove(false);
    }
  }

  async function saveArticle() {
    try {
      setSavingArticle(true);
      const articleId = article?.id;
      if (!articleId) return showToast("No article found", "error");
      const outlineParsed = outline ? JSON.parse(outline) : null;
      await api.patch(`/articles/${articleId}`, {
        title,
        body_html: body,
        tl_dr,
        faq_html: faq,
        outline_json: outlineParsed,
        metaTitle,
        metaDescription,
        keywords,
        categoryId: categoryId || null,
        subcategoryId: subcategoryId || null,
      });
      showToast("Article saved", "success");
      setEditMode(false);
      await refreshTopic();
    } catch (e) {
      showToast("Failed to save article", "error");
    } finally {
      setSavingArticle(false);
    }
  }

  // ADDED: create article manually (when no article exists)
  async function createArticle() {
    try {
      if (!isEditor) return;
      if (!title || !body) return showToast("Title and Body are required", "error");
      setCreatingArticle(true);
      await api.post(`/articles`, {
        topicId: id,
        title,
        body_html: body,
        tl_dr: tl_dr || null,
        faq_html: faq || null,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        // contentType optional; can be inferred later in pipeline
      });
      showToast("Article created", "success");
      await refreshTopic();
      setEditMode(false);
    } catch (e) {
      showToast("Failed to create article", "error");
    } finally {
      setCreatingArticle(false);
    }
  }

  // ADDED: toggle publish ↔ hide (uses publishedAt presence)
  async function togglePublish() {
    try {
      if (!isEditor || !article?.id) return;
      const url = article.publishedAt
        ? `/articles/${article.id}/unpublish`
        : `/articles/${article.id}/publish`;
      await api.post(url);
      showToast(article?.publishedAt ? "Article hidden" : "Article published", "success");
      await refreshTopic();
    } catch (e) {
      showToast("Failed to update publish state", "error");
    }
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (!topic) return <div className="p-6">Topic not found</div>;

  return (
    <main className="grid gap-6">
      {/* Pipeline actions gated by role */}
      {isEditor ? (
        <PipelineActions
          topicId={topic.id}
          status={topic.status}
          articleId={article?.id}
          onUpdated={refreshTopic}
        />
      ) : (
        <div className="card p-4 text-sm text-gray-500">
          Analyst mode: you can view the article but not modify it.
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="h1 truncate">{article?.title || topic.title}</h1>
        <div className="flex items-center gap-3">
          {/* ADDED: hide/unhide (publish/unpublish) button for editors */}
          {isEditor && article?.id && (
            <button onClick={togglePublish} className={`btn ${article?.publishedAt ? "btn--warn" : "btn--primary"}`}>
              {article?.publishedAt ? "Hide Article" : "Publish Article"}
            </button>
          )}
          <span
            className={`badge ${topic.status === "PUBLISHED" ? "badge--ok" : "badge--warn"}`}
          >
            {topic.status}
          </span>
        </div>
      </div>

      {/* Approve sources (only for editors/admins) */}
      {topic.status === "NEW" && isEditor && (
        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="h2">Approve Sources</h2>
            <button onClick={saveApprove} disabled={savingApprove} className="btn btn--primary">
              {savingApprove ? "Saving…" : "Save Approvals"}
            </button>
          </div>
          <div className="grid gap-2">
            {(topic.sources || []).map((s: any) => (
              <label key={s.id} className="flex items-start gap-3 rounded-md p-2 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={!!selected[s.url]}
                  disabled={!isEditor}
                  onChange={(e) => setSelected((prev) => ({ ...prev, [s.url]: e.target.checked }))}
                />
                <div>
                  <a href={s.url} target="_blank" className="font-medium underline">
                    {s.title || s.url}
                  </a>
                  <div className="text-xs text-gray-500">
                    {s.contentType || "unknown"} · {s.approved ? "approved" : "not approved"}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </section>
      )}

      {/* ADDED: Manual Article Creation (shown only when no article exists) */}
      {!article && isEditor && (
        <section className="card p-6 grid gap-4">
          <div className="flex items-center justify-between">
            <h2 className="h2">Create Article Manually</h2>
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full"
            placeholder="Article Title"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className="w-full"
            placeholder="Body (HTML)"
          />
          <textarea
            value={tl_dr}
            onChange={(e) => setTlDr(e.target.value)}
            rows={3}
            className="w-full"
            placeholder="Summary / TL;DR"
          />
          <textarea
            value={faq}
            onChange={(e) => setFaq(e.target.value)}
            rows={5}
            className="w-full"
            placeholder="FAQ (HTML)"
          />
          <input
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            className="w-full"
            placeholder="SEO Meta Title"
          />
          <textarea
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            rows={2}
            className="w-full"
            placeholder="SEO Meta Description"
          />
          <div className="flex justify-end">
            <button onClick={createArticle} disabled={creatingArticle} className="btn btn--primary">
              {creatingArticle ? "Creating…" : "Create Article"}
            </button>
          </div>
        </section>
      )}

      {/* Article section */}
      {article && (
        <section className="card p-6 grid gap-5">
          <div className="flex items-center justify-between">
            <h2 className="h2">Article</h2>
            {isEditor && (
              <button className="btn btn--primary" onClick={() => setEditMode(!editMode)}>
                {editMode ? "Close Editor" : "Edit Article"}
              </button>
            )}
          </div>

          {!editMode ? (
            <div className="grid gap-6">
              <div>
                <h3 className="h3">Summary</h3>
                <p>{article.tl_dr || "—"}</p>
              </div>
              <div>
                <h3 className="h3">Body</h3>
                <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: article.body_html }} />
              </div>
              {article.faq_html && (
                <div>
                  <h3 className="h3">FAQ</h3>
                  <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: article.faq_html }} />
                </div>
              )}
              <div>
                <h3 className="h3">SEO</h3>
                <p>
                  <b>Meta Title:</b> {article.metaTitle || "—"}
                </p>
                <p>
                  <b>Meta Description:</b> {article.metaDescription || "—"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {normalizeKeywords(article.keywords).map((k: string, i: number) => (
                    <span key={i} className="rounded-full bg-gray-200 px-2 py-1 text-xs">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="h3">Category</h3>
                {article.category ? (
                  <p>
                    {article.category.name} → {article.subcategory?.name || "—"}
                  </p>
                ) : (
                  <p>Not categorized</p>
                )}
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              {/* Only editors can see editor mode */}
              {isEditor ? (
                <>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full"
                    placeholder="Article Title"
                  />
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={8}
                    className="w-full"
                    placeholder="Body (HTML)"
                  />
                  <textarea
                    value={tl_dr}
                    onChange={(e) => setTlDr(e.target.value)}
                    rows={3}
                    className="w-full"
                    placeholder="Summary / TL;DR"
                  />
                  <textarea
                    value={faq}
                    onChange={(e) => setFaq(e.target.value)}
                    rows={5}
                    className="w-full"
                    placeholder="FAQ (HTML)"
                  />
                  <textarea
                    value={outline}
                    onChange={(e) => setOutline(e.target.value)}
                    rows={6}
                    className="w-full font-mono text-sm"
                    placeholder="Outline JSON"
                  />
                  <input
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    className="w-full"
                    placeholder="SEO Meta Title"
                  />
                  <textarea
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    rows={2}
                    className="w-full"
                    placeholder="SEO Meta Description"
                  />
                  <input
                    value={keywords.join(", ")}
                    onChange={(e) => setKeywords(e.target.value.split(",").map((k) => k.trim()))}
                    className="w-full"
                    placeholder="Keywords (comma separated)"
                  />
                  <div className="flex gap-3">
                    <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="flex-1">
                      <option value="">Select Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={subcategoryId}
                      onChange={(e) => setSubcategoryId(e.target.value)}
                      className="flex-1"
                    >
                      <option value="">Select Subcategory</option>
                      {subcategories
                        .filter((s) => s.categoryId === categoryId)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button className="btn" onClick={() => setEditMode(false)}>
                      Cancel
                    </button>
                    <button onClick={saveArticle} disabled={savingArticle} className="btn btn--primary">
                      {savingArticle ? "Saving…" : "Save Article"}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-gray-500">Read-only mode for analysts</p>
              )}
            </div>
          )}
        </section>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <Toast msg={toast.msg} type={toast.type} />
        </div>
      )}
    </main>
  );
}

export default function TopicDetail() {
  return (
    <RequireAuth>
      <TopicDetailInner />
    </RequireAuth>
  );
}
