//appscms/src/app/(protected)/dashboard/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../lib/api";
import DashboardClient from "./DashboardClient";

export default function Dashboard() {
  const router = useRouter();
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("teoram_jwt");
    if (!token) {
      router.push("/login");
      return;
    }

    // fetch topics if logged in
async function loadTopics() {
  try {
    const res = await api.get("/topics");
    setTopics(res.data?.data || []);   // ✅ always array
  } catch (err) {
    console.error("Failed to fetch topics", err);
    setTopics([]);
  } finally {
    setLoading(false);
  }
}

    loadTopics();
  }, [router]);

  if (loading) return <div className="p-6">Loading dashboard…</div>;

  return <DashboardClient topics={topics} />;
}
