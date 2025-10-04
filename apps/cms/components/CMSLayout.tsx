"use client";
import Link from "next/link";
import { ReactNode } from "react";
import { useAuth } from "../src/lib/auth"; // ✅ hook for login/logout

const menuItems = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Topic Discovery", href: "/topics/discovery" },
  { name: "Topics", href: "/topics" },
  { name: "Articles", href: "/articles" },
  { name: "Categories", href: "/categories" },
  { name: "Users", href: "/admin/users" },
  { name: "Keywords", href: "/keywords" },
  { name: "Topic Health Score", href: "/scores/topics" },
  { name: "Title Health Score", href: "/scores/titles" },
  { name: "Sentiment Analysis", href: "/scores/sentiment" },
  { name: "Review Management", href: "/reviews" },
  { name: "Settings", href: "/settings" },
  { name: "Logs", href: "/logs" },
];

export default function CMSLayout({ children }: { children: ReactNode }) {
  const { logout } = useAuth(); // ✅ get logout function

  return (
    <div className="cms-shell">
      {/* Sidebar */}
      <aside className="cms-sidebar">
        <div className="cms-sidebar__brand">
          <span className="cms-logo" />
          <span className="cms-brand__text">LOGO</span>
        </div>
        <nav className="cms-nav">
          <ul>
            {menuItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="cms-nav__link">
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main Column */}
      <div className="cms-main">
        <header className="cms-topbar">
          <h1 className="cms-topbar__title">CMS</h1>
          <div className="cms-topbar__actions">
            {/* ✅ Global logout */}
            <button className="btn btn--danger" onClick={logout}>
              Logout
            </button>
          </div>
        </header>
        <main className="cms-content">{children}</main>
      </div>
    </div>
  );
}
