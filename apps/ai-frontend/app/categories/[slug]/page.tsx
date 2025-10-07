import CategoryClient from "./CategoryClient";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const p = await params;
  const sp = await searchParams;

  const slug = p.slug;
  const page = parseInt(sp.page || "1", 10);

  return <CategoryClient slug={slug} page={page} />;
}
