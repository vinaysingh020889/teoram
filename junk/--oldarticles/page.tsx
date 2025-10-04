// apps/cms/src/app/articles/page.tsx  (aka "cms.src.app.articles.page.tsx")
import Link from "next/link";
import { api } from "../../../lib/api";

type ArticleRow = {
  id: string;
  title: string;
  contentType?: string | null;
  updatedAt?: string;
  status: string;
  topicId?: string | null;
};

export default async function ArticlesPage() {
  const res = await api.get("/articles").catch(() => ({ data: { data: [] } } as any));
  const articles = res.data.data;

  const rows: ArticleRow[] = (articles || []).map((a: any) => ({
    id: a.id,
    title: a.title,
    contentType: a.contentType,
    updatedAt: a.updatedAt ?? a.createdAt,
    status: a.topic?.status || "—",
    topicId: a.topic?.id ?? a.topicId ?? null,
  }));

  return (
    <main className="p-6">
      <h1 className="h1 mb-4">Articles</h1>
      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Type</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.topicId ? (
                    <Link href={`/topics/${r.topicId}`} className="underline">
                      {r.title}
                    </Link>
                  ) : (
                    r.title
                  )}
                </td>
                <td><span className="badge">{r.status}</span></td>
                <td>{r.contentType || "—"}</td>
                <td>{r.updatedAt ? new Date(r.updatedAt).toLocaleString() : "—"}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4} className="text-center text-muted">
                  No articles yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}







