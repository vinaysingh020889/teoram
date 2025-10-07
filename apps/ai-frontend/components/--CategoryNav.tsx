"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, arr } from "../lib/api";
import { usePathname } from "next/navigation";

type Sub = { id: string; slug: string; name: string };
type Cat = { id: string; slug: string; name: string; subcategories?: Sub[] };

export default function CategoryNav() {
  const pathname = usePathname();
  const [cats, setCats] = useState<Cat[]>([]);

  useEffect(() => {
    api.get("/categories")
      .then((r) => setCats(arr<Cat>(r.data, ["data"])))
      .catch(() => setCats([]));
  }, []);

  const current = useMemo(() => {
    const match = pathname?.split("/") || [];
    const i = match.indexOf("categories");
    if (i >= 0 && match[i + 1]) {
      return cats.find((c) => c.slug === match[i + 1]) || null;
    }
    return null;
  }, [pathname, cats]);

  if (!current) return null;

  return (
    <div className="cms-subnav flex items-center gap-2 px-3 py-2">
      <Link href={`/categories/${current.slug}`} className="chip is-active">
        All News
      </Link>
      {current.subcategories?.map((s) => (
        <Link key={s.id} href={`/categories/${current.slug}/${s.slug}`} className="chip">
          {s.name}
        </Link>
      ))}
    </div>
  );
}
