import { Metadata } from "next";
import { arr, publishedOnly, htmlToText, byDateDesc } from "../lib/api";
import ArticleCard from "../../components/ArticleCard";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api/v1";

// --- Dynamic metadata for SEO ---
export async function generateMetadata(
  { searchParams }: { searchParams: Promise<{ q?: string }> } // ✅ make it Promise
): Promise<Metadata> {
  const params = await searchParams; // ✅ await it
  const q = decodeURIComponent(params.q || "").trim();

  if (!q) {
    return {
      title: "Search | TEORAM",
      description: "Search technology news and insights on TEORAM.",
    };
  }

  return {
    title: `Search: ${q} | TEORAM`,
    description: `Results for “${q}” on TEORAM. Explore articles, insights, and the latest tech updates.`,
    alternates: { canonical: `https://teoram.com/search?q=${encodeURIComponent(q)}` },
  };
}

// --- Page component ---
export default async function SearchPage(
  { searchParams }: { searchParams: Promise<{ q?: string }> } // ✅ make it Promise
) {
  const params = await searchParams; // ✅ await it
  const q = decodeURIComponent(params.q || "").toLowerCase().trim();

  if (!q) {
    return (
      <main className="cms-content">
        <h1 className="h1">Search</h1>
        <p className="text-muted">Please enter a search term.</p>
      </main>
    );
  }

  // Fetch articles on server
  const res = await fetch(`${API_BASE}/articles`, { cache: "no-store" });
  const pub = publishedOnly(arr(await res.json(), ["data"]));

  const filtered = pub.filter((a: any) =>
    (a.title || "").toLowerCase().includes(q) ||
    htmlToText(a.body_html || "").toLowerCase().includes(q)
  );

  const items = filtered.sort(byDateDesc);

  return (
    <main className="cms-content">
      <h1 className="h1">Search: “{q}”</h1>

      {items.length === 0 ? (
        <p className="text-muted">No matching published articles.</p>
      ) : (
        <section className="card-grid">
          {items.map((a: any) => (
            <ArticleCard key={a.id} a={a} />
          ))}
        </section>
      )}
    </main>
  );
}
