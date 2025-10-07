//apps/cms/src/lib/useAuth.ts
"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Redirects to /login if token missing */
export function useAuth() {
  const router = useRouter();
  useEffect(() => {
    const t = localStorage.getItem("teoram_jwt");
    if (!t) router.replace("/login");
  }, [router]);
}
