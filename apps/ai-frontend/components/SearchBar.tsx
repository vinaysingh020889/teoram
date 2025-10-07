"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SearchBar() {
  const [q, setQ] = useState("");
  const r = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!q.trim()) return;
        r.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
      className="search-hero"
    >
      <input
        placeholder="Search articles..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <button className="btn btn--primary" type="submit">Go</button>
    </form>
  );
}
