"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { api, arr } from "../lib/api";

type Cat = { id: string; slug: string; name: string };

export default function Sidebar() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Fetch categories
  useEffect(() => {
    api
      .get("/categories")
      .then((res) => setCats(arr<Cat>(res.data, ["data"])))
      .catch(() => setCats([]));
  }, []);

  // Close sidebar when navigating
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {/* --- Mobile top bar --- */}
      <div className="cms-topbar show-mobile">
        <button
          className="sidebar-toggle"
          aria-label="Toggle menu"
          onClick={() => setIsOpen(!isOpen)}
        >
          ☰
        </button>
        <h1 className="cms-topbar__title">TEORAM</h1>
      </div>

      {/* --- Sidebar --- */}
      <aside className={`cms-sidebar ${isOpen ? "is-open" : ""}`}>
        {/* ✕ Close button visible only on mobile */}
        <button
          className="sidebar-close show-mobile"
          aria-label="Close menu"
          onClick={() => setIsOpen(false)}
        >
          ✕
        </button>

       <div className="cms-sidebar__brand">
  <Link href="/" className="flex items-center gap-3">
    <img
      src="/teoram-logo.webp"
      alt="TEORAM Logo"
      width={120}
      height={32}
      className="object-contain"
      style={{ borderRadius: "8px" }}
    />
  </Link>
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

      {/* --- Backdrop (click to close) --- */}
      {isOpen && (
        <div
          className="drawer-backdrop is-open"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
