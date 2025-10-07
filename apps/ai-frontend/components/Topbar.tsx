"use client";
import Link from "next/link";
import SearchBar from "./SearchBar";

export default function Topbar() {
  return (
    <header className="cms-topbar">
      {/* Left Nav (hidden on mobile) */}
      <nav className="hidden md:flex items-center gap-2">
        <Link className="cms-topnav__link" href="/keywords">Keywords</Link>
       {/*  <Link className="cms-topnav__link" href="/trending">Latest News</Link>*/}
      </nav>

      {/* Right actions */}
      <div className="cms-topbar__actions ml-auto">
        <SearchBar />
      </div>
    </header>
  );
}
