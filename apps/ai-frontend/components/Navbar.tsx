import Link from "next/link";

const menu = [
  { name: "Home", href: "/" },
  { name: "Categories", href: "/categories/tech" },
  { name: "Keywords", href: "/keywords" },
  { name: "About", href: "/about" },
];

export default function Navbar() {
  return (
    <nav className="cms-topbar">
      <h1 className="cms-topbar__title">Teoram News</h1>
      <div className="flex gap-4">
        {menu.map((m) => (
          <Link key={m.href} href={m.href} className="cms-nav__link">
            {m.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}
