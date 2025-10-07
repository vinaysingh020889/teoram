"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Head from "next/head";
import { api, arr, publishedOnly, byDateDesc } from "../../lib/api";
import ArticleCard from "../../../components/ArticleCard";

const PAGE_SIZE = 100;

export default function CategoryClient({ slug, page }: { slug: string; page: number }) {
  const [cats, setCats] = useState<any[]>([]);
  const [arts, setArts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSub, setActiveSub] = useState<string>("all");

  useEffect(() => {
    Promise.all([
      api.get("/categories").then((r) => arr(r.data, ["data"])).catch(() => []),
      api.get("/articles").then((r) => publishedOnly(arr(r.data, ["data"]))).catch(() => []),
    ])
      .then(([c, a]) => {
        setCats(c);
        setArts(a);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const cat = useMemo(() => cats.find((c: any) => c.slug === slug) || null, [cats, slug]);

  const subs = useMemo(() => {
    if (!cat) return [];
    return [{ id: "all", name: "All News", slug: "all" }, ...(cat.subcategories || [])];
  }, [cat]);

  const itemsAll = useMemo(() => {
    if (!cat) return [];
    let filtered = arts.filter((a: any) => String(a.categoryId) === String(cat.id));
    if (activeSub !== "all") {
      filtered = filtered.filter((a: any) => String(a.subcategoryId) === String(activeSub));
    }
    return filtered.sort(byDateDesc);
  }, [arts, cat, activeSub]);

  const total = itemsAll.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const items = itemsAll.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <main className="cms-content">
      <Head>
        <title>{cat ? `${cat.name} News & Insights | TEORAM` : "Category | TEORAM"}</title>
        <meta
          name="description"
          content={cat ? `Explore the latest in ${cat.name} on TEORAM.` : "TEORAM Category Page"}
        />
      </Head>

      <h1 className="h1">{cat?.name || slug}</h1>

      {subs.length > 0 && (
        <div className="flex gap-3 flex-wrap mb-4">
          {subs.map((s: any) => (
            <button
              key={s.id}
              onClick={() => setActiveSub(s.id)}
              className={`sub-btn ${activeSub === s.id ? "active" : ""}`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-muted">Loading articles…</p>
      ) : items.length === 0 ? (
        <p className="text-muted">No published articles found.</p>
      ) : (
        <section className="card-grid">
          {items.map((a: any) => (
            <ArticleCard key={a.id} a={a} />
          ))}
        </section>
      )}

      {totalPages > 1 && (
        <nav className="flex justify-between mt-6">
          {page > 1 ? (
            <Link href={`/categories/${slug}?page=${page - 1}`} className="btn">
              ← Prev
            </Link>
          ) : (
            <span />
          )}
          {page < totalPages ? (
            <Link href={`/categories/${slug}?page=${page + 1}`} className="btn">
              Next →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </main>
  );
}
