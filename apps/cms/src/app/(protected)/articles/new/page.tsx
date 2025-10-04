"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../../lib/api";
import { slugify } from "../../../../../../api/src/lib/slugify";

export default function NewArticlePage() {
  const router = useRouter();

  // Topic states
  const [topicTitle, setTopicTitle] = useState("");
  const [topicSlug, setTopicSlug] = useState("");
  const [creatingTopic, setCreatingTopic] = useState(false);
  const [topicId, setTopicId] = useState<string | null>(null);

  // Article states
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tl_dr, setTlDr] = useState("");
  const [faq, setFaq] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [keywords, setKeywords] = useState<string>(""); // comma separated
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [savingArticle, setSavingArticle] = useState(false);

  // Load categories/subcategories
  useEffect(() => {
    async function loadTaxonomy() {
      const [catRes, subcatRes] = await Promise.all([
        api.get("/categories").catch(() => ({ data: { data: [] } })),
        api.get("/subcategories").catch(() => ({ data: { data: [] } })),
      ]);
      setCategories(catRes.data.data || []);
      setSubcategories(subcatRes.data.data || []);
    }
    loadTaxonomy();
  }, []);

  // Auto-generate slug from topic title
  useEffect(() => {
    if (topicTitle) {
      setTopicSlug(`${slugify(topicTitle)}-${Date.now()}`);
    }
  }, [topicTitle]);

  async function createTopic() {
    if (!topicTitle) {
      alert("Topic title is required");
      return;
    }
    try {
      setCreatingTopic(true);
      const res = await api.post("/topics", {
        // Adjust this if you have a dedicated POST /topics
        title: topicTitle,
        slug: topicSlug,
      });
      // assume API returns { data: { id } }
      const newTopic = res.data?.data;
      if (!newTopic?.id) throw new Error("Topic not created");
      setTopicId(newTopic.id);
      alert("Topic created!");
    } catch (e) {
      console.error(e);
      alert("Failed to create topic");
    } finally {
      setCreatingTopic(false);
    }
  }

  async function createArticle() {
    if (!topicId) {
      alert("Please create a topic first.");
      return;
    }
    if (!title || !body) {
      alert("Title and Body are required");
      return;
    }
    try {
      setSavingArticle(true);
      const res = await api.post("/articles", {
        topicId,
        title,
        body_html: body,
        tl_dr: tl_dr || null,
        faq_html: faq || null,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        keywords: keywords
          ? keywords.split(",").map((k) => k.trim()).filter(Boolean)
          : [],
        categoryId: categoryId || null,
        subcategoryId: subcategoryId || null,
      });
      const article = res.data?.data;
      alert("Article created!");
      router.push(`/topics/${topicId}`); // Redirect to topic detail
    } catch (e) {
      console.error(e);
      alert("Failed to create article");
    } finally {
      setSavingArticle(false);
    }
  }

  return (
    <main className="p-6 grid gap-6">
      <h1 className="h1">Create New Article</h1>

      {/* Step 1: Create Topic */}
      <section className="card p-4 grid gap-3">
        <h2 className="h2">Step 1: Create Topic</h2>
        <input
          value={topicTitle}
          onChange={(e) => setTopicTitle(e.target.value)}
          className="input"
          placeholder="Topic Title"
        />
        <input
          value={topicSlug}
          onChange={(e) => setTopicSlug(e.target.value)}
          className="input"
          placeholder="Custom Slug"
        />
        <button
          onClick={createTopic}
          disabled={creatingTopic}
          className="btn btn--primary"
        >
          {creatingTopic ? "Creating Topic…" : "Create Topic"}
        </button>
        {topicId && <p className="text-green-600">✅ Topic created (ID: {topicId})</p>}
      </section>

      {/* Step 2: Create Article */}
      {topicId && (
        <section className="card p-4 grid gap-3">
          <h2 className="h2">Step 2: Create Article</h2>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            placeholder="Article Title"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className="textarea"
            placeholder="Body (HTML)"
          />
          <textarea
            value={tl_dr}
            onChange={(e) => setTlDr(e.target.value)}
            rows={3}
            className="textarea"
            placeholder="Summary (tl;dr)"
          />
          <textarea
            value={faq}
            onChange={(e) => setFaq(e.target.value)}
            rows={3}
            className="textarea"
            placeholder="FAQ (HTML)"
          />
          <input
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            className="input"
            placeholder="SEO Meta Title"
          />
          <input
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            className="input"
            placeholder="SEO Meta Description"
          />
          <input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            className="input"
            placeholder="Keywords (comma separated)"
          />

          {/* Category/Subcategory selection */}
          <div className="flex gap-3">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="flex-1"
            >
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

          <button
            onClick={createArticle}
            disabled={savingArticle}
            className="btn btn--primary"
          >
            {savingArticle ? "Creating Article…" : "Create Article"}
          </button>
        </section>
      )}
    </main>
  );
}
