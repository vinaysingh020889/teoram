"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../../lib/api";

export default function ArticlesPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await api.get("/articles/all");
        setArticles(res.data.data || []);
      } catch (err) {
        console.error("Failed to fetch articles:", err);
        setError("Failed to load articles");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <main className="p-6">Loading…</main>;
  if (error)
    return (
      <main className="p-6">
        <p className="text-red-500">{error}</p>
      </main>
    );

  return (
    <main className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="h1">Articles</h1>
        <Link href="/articles/new" className="btn btn--primary">
          + New Article
        </Link>
      </div>

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
            {articles.length > 0 ? (
              articles.map((a: any) => (
                <tr key={a.id}>
                  <td>
                    {a.topic?.id ? (
                      <Link href={`/topics/${a.topic.id}`} className="underline">
                        {a.title}
                      </Link>
                    ) : (
                      a.title
                    )}
                  </td>
                  <td>
                    <span className="badge">{a.topic?.status || "—"}</span>
                  </td>
                  <td>{a.contentType || "—"}</td>
                  <td>
                    {a.updatedAt
                      ? new Date(a.updatedAt).toLocaleString()
                      : a.createdAt
                      ? new Date(a.createdAt).toLocaleString()
                      : "—"}
                  </td>
                </tr>
              ))
            ) : (
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
