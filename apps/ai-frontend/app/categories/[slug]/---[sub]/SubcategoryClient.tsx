"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, arr, publishedOnly, byDateDesc } from "../../../lib/api";
import ArticleCard from "../../../../components/ArticleCard";

const PAGE_SIZE = 6;

export default function SubcategoryClient({
  params,
  searchParams,
}: {
  params: { slug: string; sub: string };
  searchParams: { page?: string };
}) {
  const { slug, sub } = params;

  const [cats, setCats] = useState<any[]>([]);
  const [arts, setArts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const page = parseInt(searchParams?.page || "1", 10);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get("/categories").then((r) => arr(r.data, ["data"])).catch(() => []),
      api
        .get("/articles")
        .then((r) => publishedOnly(arr(r.data, ["data"])))
        .catch(() => []),
    ])
      .then(([c, a]) => {
        setCats(c);
        setArts(a);
      })
      .finally(() => setLoading(false));
  }, [slug, sub]);

  const cat = useMemo(
    () => cats.find((c: any) => c.slug === slug) || null,
    [cats, slug]
  );
  const subcat = useMemo(
    () => cat?.subcategories?.find((s: any) => s.slug === sub) || null,
    [cat, sub]
  );

  if (!subcat) {
    return (
      <main className="cms-content">
        <h1 className="h1">{sub}</h1>
        <p className="text-muted">Subcategory not found under {slug}.</p>
      </main>
    );
  }

  const itemsAll = useMemo(() => {
    return arts
      .filter((a: any) => String(a.subcategoryId) === String(subcat.id))
      .sort(byDateDesc);
  }, [arts, subcat]);

  const total = itemsAll.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const items = itemsAll.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <main className="cms-content">
      <h1 className="h1">{subcat.name}</h1>

      {loading ? (
        <p className="text-muted">Loading articles…</p>
      ) : items.length === 0 ? (
        <p className="text-muted">No published articles in this subcategory.</p>
      ) : (
        <section className="card-grid">
          {items.map((a: any) => (
            <ArticleCard key={a.id} a={a} />
          ))}
        </section>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="flex justify-between mt-6">
          {page > 1 ? (
            <Link href={`/categories/${slug}/${sub}?page=${page - 1}`} className="btn">
              ← Prev
            </Link>
          ) : (
            <span />
          )}
          {page < totalPages ? (
            <Link href={`/categories/${slug}/${sub}?page=${page + 1}`} className="btn">
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
