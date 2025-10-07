import Link from "next/link";
import { snippet } from "../lib/api";

export default function ArticleCard({ a }: { a: any }) {
  return (
    <article className="card">
      {a.coverImageUrl && (
        <div className="card__image">
          <img src={a.coverImageUrl} alt={a.title} />
        </div>
      )}
      <div className="card__meta">
        {a.category?.name && <span className="badge">{a.category.name}</span>}
      </div>
      <h3 className="card__title">
        <Link href={`/articles/${a.slug}`}>{a.title}</Link>
      </h3>
      <p className="card__excerpt">{snippet(a)}</p>
    </article>
  );
}
