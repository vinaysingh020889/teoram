//apps/cms/src/lib/auth.tsx
"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "./api";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  email: string;
  role: "ADMIN" | "EDITOR" | "ANALYST";
  active: boolean;
  name?: string | null;
};

const AuthCtx = createContext<{
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
} | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  const refresh = async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
    }
  };

  const login = async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("teoram_jwt", data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("teoram_jwt");
    setUser(null);
    router.replace("/login");
  };

  useEffect(() => {
    if (localStorage.getItem("teoram_jwt")) refresh();
  }, []);

  return (
    <AuthCtx.Provider value={{ user, login, logout, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};
