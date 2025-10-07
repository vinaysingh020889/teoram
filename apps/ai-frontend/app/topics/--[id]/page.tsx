"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import Card from "../../../components/Card";
import AIContent from "../../../components/AIContent";

export default function TopicDetail({ params }: { params: { id: string } }) {
  const [topic, setTopic] = useState<any>(null);

  useEffect(() => {
    api.get(`/topics/view`).then((res) => {
      const found = (res.data || []).find((t: any) => t.id === params.id);
      setTopic(found);
    });
  }, [params.id]);

  if (!topic) return <p>Loading...</p>;
  const article = topic?.articles?.[0] || null;

  return (
    <main className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="h1">{article?.title || topic?.title}</h1>
        <span className="badge">{topic?.status}</span>
      </div>

      {/* Pipeline actions */}
      <Card>
        <div className="flex gap-2">
          <form action={`/api/v1/agents/topics/${topic.id}/collect`} method="post">
            <button className="btn">Collect</button>
          </form>
          <form action={`/api/v1/agents/topics/${topic.id}/draft`} method="post">
            <button className="btn">Draft</button>
          </form>
          <form action={`/api/v1/agents/topics/${topic.id}/review`} method="post">
            <button className="btn">Review</button>
          </form>
          {article?.id && (
            <form action={`/api/v1/articles/${article.id}/publish`} method="post">
              <button className="btn btn--primary">Publish</button>
            </form>
          )}
        </div>
      </Card>

      {/* AI adaptive content */}
      {article && (
        <Card>
          <h2 className="h2 mb-2">Draft Preview</h2>
          <AIContent type={article.contentType} body={article.body_html} />
        </Card>
      )}
    </main>
  );
}
