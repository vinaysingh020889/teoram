import Link from "next/link";
import { Metadata } from "next";
import { arr, publishedOnly, byDateDesc } from "./lib/api";
import ArticleCard from "../components/ArticleCard";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api/v1";
const PAGE_SIZE = 99;

// --- SEO Metadata for home page ---
export const metadata: Metadata = {
  title: "Latest Tech News | TEORAM",
  description:
    "Stay updated with the latest technology news, AI updates, and gadgets on TEORAM.",
  alternates: { canonical: "https://teoram.com/" },
};

export default async function HomePage() {
  const res = await fetch(`${API_BASE}/articles`, { cache: "no-store" });
  const articles = publishedOnly(arr(await res.json(), ["data"])).sort(byDateDesc);

  const pageArticles = articles.slice(0, PAGE_SIZE);
  const hasNext = articles.length > PAGE_SIZE;

  return (
    <main className="cms-content">
      <h1 className="h1">Latest News</h1>

      {pageArticles.length === 0 ? (
        <p className="text-muted">No published articles yet.</p>
      ) : (
        <section className="card-grid">
          {pageArticles.map((a: any) => (
            <ArticleCard key={a.id} a={a} />
          ))}
        </section>
      )}

      {/* ✅ Pagination Nav */}
      <nav
        className="flex justify-between items-center mt-10"
        aria-label="Pagination"
      >
        <span /> {/* no prev on page 1 */}
        {hasNext && (
          <Link
            href="/page/2"
            className="btn btn--primary"
            prefetch={false}
          >
            Next →
          </Link>
        )}
      </nav>
    </main>
  );
}
