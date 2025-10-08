import { Metadata } from "next";
import Link from "next/link";
import { arr, isPublished, snippet, byDateDesc } from "../../lib/api";
import AIContent from "../../../components/AIContent";
import Script from "next/script";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ??
  (process.env.NODE_ENV === "production"
    ? "https://api.teoram.com/api/v1"
    : "http://localhost:4000/api/v1");

/** Parse <dt>/<dd> pairs out of faq_html (works even if there's an <h2> before <dl>) */
function extractFaqPairs(html: string): { question: string; answer: string }[] {
  if (!html) return [];
  const pairs: { question: string; answer: string }[] = [];
  // find every <dt>...</dt> followed by <dd>...</dd> anywhere in the string
  const re = /<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/gi;
  const stripTags = (s: string) => s.replace(/<[^>]*>/g, "").trim();

  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const q = stripTags(m[1] ?? "");
    const a = (m[2] ?? "").trim(); // keep inner HTML for answer
    if (q && a) pairs.push({ question: q, answer: a });
  }
  return pairs;
}

/* --- Dynamic metadata --- */
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { slug } = await params;
  const res = await fetch(`${API_BASE}/articles/slug/${slug}`, { cache: "no-store" });
  const { data: a } = await res.json();

  if (!a || !a.publishedAt) return { title: "Article Not Found | TEORAM" };

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

/* --- Article Page --- */
export default async function ArticleDetail({ params }: { params: { slug: string } }) {
  const { slug } = await params;

  // 1) Fetch current article by slug
  const res = await fetch(`${API_BASE}/articles/slug/${slug}`, { cache: "no-store" });
  const { data: a } = await res.json();

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

  // ✅ Correct: read FAQ from a.faq_html
  const faqPairs = extractFaqPairs(a.faq_html || "");

  return (
    <main className="cms-content fade-in">
      {/* --- Breadcrumb --- */}
      {/* --- Breadcrumb (non-clickable text) --- */}
{a.category && (
  <nav className="breadcrumbs mb-3" aria-label="Breadcrumb">
    <span>Home</span>
    <span>/</span>
    <span>{a.category.name}</span>
    {a.subcategory && (
      <>
        <span>/</span>
        <span>{a.subcategory.name}</span>
      </>
    )}
    <span>/</span>
    <strong>{a.title}</strong>
  </nav>
)}

      {/* --- Article Header --- */}
      <h1 className="h1">{a.title}</h1>
      {a.author && (
        <p className="text-muted">
          By <strong>{a.author}</strong> ·{" "}
          {a.publishedAt && new Date(a.publishedAt).toLocaleDateString()}
        </p>
      )}
      {a.coverImageUrl && (
        <div className="mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={a.coverImageUrl} alt={a.title} />
        </div>
      )}

      {/* --- Main Body --- */}
      <AIContent type={a.contentType} body={a.body_html} />

      {/* --- FAQ Section --- */}
{a.faq_html && (
  <section className=" faqsection mt-8">
    
    {/* Convert DL to collapsible panels dynamically */}
    <div
      className="faq-accordion"
      dangerouslySetInnerHTML={{
        __html: a.faq_html.replace(
          /<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/g,
          `<details class="faq-item">
             <summary class="faq-q">$1</summary>
             <div class="faq-a">$2</div>
           </details>`
        ),
      }}
    />
  </section>
)}


      {/* --- Keywords --- */}
      {a.keywords?.length > 0 && (
        <div className="keyword-list mt-5">
          {a.keywords.map((kw: string, i: number) => (
            <Link
              key={i}
              href={`/keywords/${encodeURIComponent(kw)}`}
              className="keyword-pill"
            >
              {kw}
            </Link>
          ))}
        </div>
      )}

      {/* --- Prev / Next Navigation --- */}
      <div className="flex justify-between mt-8">
        {prevArticle ? (
          <Link href={`/articles/${prevArticle.slug}`} className="btn marg20">
            ← {prevArticle.title}
          </Link>
        ) : (
          <span />
        )}
        {nextArticle ? (
          <Link href={`/articles/${nextArticle.slug}`} className="btn marg20">
            {nextArticle.title} →
          </Link>
        ) : (
          <span />
        )}
      </div>

      {/* --- JSON-LD Schema --- */}
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

      {/* ✅ FAQPage JSON-LD based on faq_html pairs */}
      {faqPairs.length > 0 && (
        <Script
          id="faq-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faqPairs.map((f) => ({
                "@type": "Question",
                name: f.question,
                acceptedAnswer: { "@type": "Answer", text: f.answer },
              })),
            }),
          }}
        />
      )}
    </main>
  );
}
