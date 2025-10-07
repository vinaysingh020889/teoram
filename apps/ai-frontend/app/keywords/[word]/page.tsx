import { Metadata } from "next";
import {
  arr,
  publishedOnly,
  normalizeKeywords,
  htmlToText,
  byDateDesc,
  snippet,
} from "../../lib/api";
import ArticleCard from "../../../components/ArticleCard";
import Script from "next/script";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api/v1";

// --- Dynamic metadata ---
export async function generateMetadata({
  params,
}: {
  params: Promise<{ word: string }>;
}): Promise<Metadata> {
  const { word } = await params;
  const decoded = decodeURIComponent(word);

  const title = `Keyword: ${decoded} | TEORAM`;
  const description = `Explore articles tagged with "${decoded}" on TEORAM. Discover insights, news, and analysis around ${decoded}.`;
  const canonical = `https://teoram.com/keywords/${encodeURIComponent(decoded)}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "TEORAM",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

// --- Page ---
export default async function KeywordResults({
  params,
}: {
  params: Promise<{ word: string }>;
}) {
  const { word } = await params;
  const rawWord = decodeURIComponent(word);
  const normalized = rawWord.toLowerCase();

  // fetch published articles
  const res = await fetch(`${API_BASE}/articles`, { cache: "no-store" });
  const pub = publishedOnly(arr(await res.json(), ["data"]));

  // safe filtering
  const filtered = pub.filter((a: any) => {
    const kws: string[] = normalizeKeywords(a).map((k: any) =>
      String(k || "").toLowerCase()
    );

    return (
      kws.includes(normalized) ||
      (a.title || "").toLowerCase().includes(normalized) ||
      htmlToText(a.body_html || "").toLowerCase().includes(normalized)
    );
  });

  const items = filtered.sort(byDateDesc);

  // --- JSON-LD structured data ---
  const canonical = `https://teoram.com/keywords/${encodeURIComponent(rawWord)}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Articles about ${rawWord}`,
    description: `Explore news and insights related to ${rawWord}`,
    url: canonical,
    itemListElement: items.map((a: any, index: number) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `https://teoram.com/articles/${a.slug}`,
      name: a.title,
    })),
  };

  return (
    <main className="cms-content">
      {/* SEO H1 */}
      <h1 className="h1">Keyword: {rawWord}</h1>

      {items.length === 0 ? (
        <p className="text-muted">No matching published articles.</p>
      ) : (
        <section className="card-grid">
          {items.map((a: any) => (
            <ArticleCard
              key={a.id}
              a={a}
              
              
            />
          ))}
        </section>
      )}

      {/* ✅ Inject JSON-LD for SEO */}
      <Script
        id="keyword-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}
