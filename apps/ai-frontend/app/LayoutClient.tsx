"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const loader = document.querySelector(".page-loader");
    if (!loader) return;
    loader.classList.add("active");
    const timer = setTimeout(() => loader.classList.remove("active"), 700);
    return () => clearTimeout(timer);
  }, [pathname]);

  return <div className="cms-content">{children}</div>;
}
