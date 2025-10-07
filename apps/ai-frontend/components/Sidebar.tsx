"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";   // ✅ import this
import { api, arr } from "../lib/api";

type Cat = { id: string; slug: string; name: string };

export default function Sidebar() {
  const [cats, setCats] = useState<Cat[]>([]);
  const pathname = usePathname(); // ✅ current path

  useEffect(() => {
    api
      .get("/categories")
      .then((res) => setCats(arr<Cat>(res.data, ["data"])))
      .catch(() => setCats([]));
  }, []);

  return (
    <aside className="cms-sidebar">
      <div className="cms-sidebar__brand">
        <div className="cms-logo" />
        <span className="cms-brand__text">TEORAM</span>
      </div>
      <nav>
        <ul>
          <li>
            <Link
              href="/"
              className={`cms-nav__link ${pathname === "/" ? "is-active" : ""}`}
            >
              Home
            </Link>
          </li>
          {cats.map((c) => {
            const active = pathname.startsWith(`/categories/${c.slug}`);
            return (
              <li key={c.id}>
                <Link
                  href={`/categories/${c.slug}`}
                  className={`cms-nav__link ${active ? "is-active" : ""}`}
                >
                  {c.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
