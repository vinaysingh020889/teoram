import { Metadata } from "next";
import Link from "next/link";
import { arr, isPublished, snippet, byDateDesc } from "../../lib/api";
import AIContent from "../../../components/AIContent";
import Script from "next/script";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api/v1";

// --- Dynamic metadata ---
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { slug } = await params;

  // ✅ fetch by slug from new API
  const res = await fetch(`${API_BASE}/articles/slug/${slug}`, { cache: "no-store" });
  const { data: a } = await res.json();

  // ✅ only published articles
  if (!a || !a.publishedAt) {
    return { title: "Article Not Found | TEORAM" };
  }

  const title = a.metaTitle || a.title || "TEORAM Article";
  const description = a.metaDescription || a.tl_dr || snippet(a);

  return {
    title,
    description,
    alternates: { canonical: `https://teoram.com/articles/${a.slug}` },
    openGraph: {
      title,
      description,
      url: `https://teoram.com/articles/${a.slug}`,
      siteName: "TEORAM",
      images: a.coverImageUrl ? [{ url: a.coverImageUrl }] : [],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: a.coverImageUrl ? [a.coverImageUrl] : [],
    },
  };
}

// --- Article Page ---
export default async function ArticleDetail({ params }: { params: { slug: string } }) {
  const { slug } = await params;

  // 1) Fetch current article by slug
  const res = await fetch(`${API_BASE}/articles/slug/${slug}`, { cache: "no-store" });
  const { data: a } = await res.json();

  // ✅ ensure published only
  if (!a || !a.publishedAt) {
    return (
      <main className="cms-content">
        <p className="text-muted">Article not found.</p>
      </main>
    );
  }

  // 2) Fetch all published articles for prev/next navigation
  const allRes = await fetch(`${API_BASE}/articles`, { cache: "no-store" });
  const allData = await allRes.json();
  const allArticles = arr(allData, ["data"]).filter(isPublished).sort(byDateDesc);

  const index = allArticles.findIndex((art: any) => art.id === a.id);
  const prevArticle = index > 0 ? allArticles[index - 1] : null;
  const nextArticle = index < allArticles.length - 1 ? allArticles[index + 1] : null;

  const title = a.metaTitle || a.title;
  const description = a.metaDescription || a.tl_dr || snippet(a);

  return (
    <main className="cms-content">
      <h1 className="h1">{a.title}</h1>
      {a.author && (
        <p className="text-muted">
          By <strong>{a.author}</strong> ·{" "}
          {a.publishedAt && new Date(a.publishedAt).toLocaleDateString()}
        </p>
      )}
      <AIContent type={a.contentType} body={a.body_html} />

      {/* ✅ Prev / Next Navigation */}
      <div className="flex justify-between mt-8">
        {prevArticle ? (
          <Link href={`/articles/${prevArticle.slug}`} className="btn">
            ← {prevArticle.title}
          </Link>
        ) : (
          <span />
        )}
        {nextArticle ? (
          <Link href={`/articles/${nextArticle.slug}`} className="btn">
            {nextArticle.title} →
          </Link>
        ) : (
          <span />
        )}
      </div>

      {/* ✅ JSON-LD Schema */}
      <Script
        id="article-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            headline: title,
            description,
            url: `https://teoram.com/articles/${a.slug}`,
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `https://teoram.com/articles/${a.slug}`,
            },
            datePublished: a.publishedAt,
            dateModified: a.updatedAt || a.publishedAt,
            author: { "@type": "Person", name: a.author || "TEORAM Team" },
            publisher: {
              "@type": "Organization",
              name: "TEORAM",
              logo: { "@type": "ImageObject", url: "https://teoram.com/logo.png" },
            },
            image: a.coverImageUrl ? [a.coverImageUrl] : [],
          }),
        }}
      />
    </main>
  );
}
