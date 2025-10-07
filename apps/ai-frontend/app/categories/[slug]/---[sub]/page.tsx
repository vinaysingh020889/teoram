import { Metadata } from "next";
import SubcategoryClient from "./SubcategoryClient";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api/v1";

// Server-only helper
async function getCatAndSub(slug: string, sub: string) {
  const res = await fetch(`${API_BASE}/categories`, { cache: "no-store" });
  const json = await res.json();
  const cats = Array.isArray(json?.data) ? json.data : [];
  const cat = cats.find((c: any) => c.slug === slug) || null;
  const subcat = cat?.subcategories?.find((s: any) => s.slug === sub) || null;
  return { cat, subcat };
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string; sub: string };
}): Promise<Metadata> {
  const { slug, sub } = params;
  const { cat, subcat } = await getCatAndSub(slug, sub);

  if (!cat || !subcat) return { title: "Subcategory Not Found | TEORAM" };

  const title = `${subcat.name} — ${cat.name} News | TEORAM`;
  const description = `Explore all articles and insights in ${subcat.name}, under ${cat.name}, on TEORAM.`;

  return {
    title,
    description,
    alternates: { canonical: `https://teoram.com/categories/${slug}/${sub}` },
    openGraph: {
      title,
      description,
      url: `https://teoram.com/categories/${slug}/${sub}`,
      siteName: "TEORAM",
      type: "website",
    },
  };
}

// ✅ Server component simply renders the client component
export default function Page({ params, searchParams }: any) {
  return <SubcategoryClient params={params} searchParams={searchParams} />;
}
