import Link from "next/link";
import { arr, publishedOnly, byDateDesc } from "../../lib/api";
import ArticleCard from "../../../components/ArticleCard";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api/v1";
const PAGE_SIZE = 99;

export default async function PaginatedPage(
  { params }: { params: Promise<{ page: string }> } // ✅ params is a Promise
) {
  const p = await params;                           // ✅ await it
  const pageNum = parseInt(p.page, 10) || 1;
  const offset = (pageNum - 1) * PAGE_SIZE;

  const res = await fetch(`${API_BASE}/articles`, { cache: "no-store" });
  const articles = publishedOnly(arr(await res.json(), ["data"])).sort(byDateDesc);

  const pageArticles = articles.slice(offset, offset + PAGE_SIZE);
  const total = articles.length;
  const hasPrev = pageNum > 1;
  const hasNext = offset + PAGE_SIZE < total;

  return (
    <main className="cms-content">
      <h1 className="h1">Latest News - Page {pageNum}</h1>

      {pageArticles.length === 0 ? (
        <p className="text-muted">No published articles found.</p>
      ) : (
        <section className="card-grid">
          {pageArticles.map((a: any) => (
            <ArticleCard key={a.id} a={a} />
          ))}
        </section>
      )}

      <nav className="flex justify-between items-center mt-10" aria-label="Pagination">
        {hasPrev ? (
          <Link href={pageNum === 2 ? "/" : `/page/${pageNum - 1}`} className="btn">
            ← Prev
          </Link>
        ) : (
          <span />
        )}

        {hasNext ? (
          <Link href={`/page/${pageNum + 1}`} className="btn btn--primary">
            Next →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </main>
  );
}
