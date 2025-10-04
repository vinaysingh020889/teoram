"use client";
import { useAuth } from "../lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RequireAuth({
  children,
  role,
}: {
  children: React.ReactNode;
  role?: "ADMIN" | "EDITOR" | "ANALYST";
}) {
  const { user, refresh } = useAuth();
  const router = useRouter();

  useEffect(() => {
    refresh();
  }, []);

  if (!user) return <div className="p-6">Checking session…</div>;

  if (!user.active) {
    return <div className="p-6">Your account is disabled.</div>;
  }

  if (role && user.role !== role) {
    return <div className="p-6">Access denied. {role} only.</div>;
  }

  return <>{children}</>;
}
