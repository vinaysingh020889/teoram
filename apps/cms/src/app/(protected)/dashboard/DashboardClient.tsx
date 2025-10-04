"use client";
import { api } from "../../../lib/api";
import { useState, useMemo } from "react";
import Link from "next/link";
import {
  PlayIcon,
  ClockIcon,
  CheckCircleIcon,
  DocumentIcon,
} from "@heroicons/react/24/outline";
import { ArrowPathIcon } from "@heroicons/react/24/solid";

// include DISAPPROVED stage
const PIPELINE_STAGES = [
  "NEW",
  "APPROVED",
  "COLLECTED",
  "DRAFTED",
  "ASSIGNED",
  "READY",
  "PUBLISHED",
  "DISAPPROVED",
];

// Toast component
function Toast({ msg, type = "success" }: { msg: string; type?: "success" | "error" | "info" }) {
  return (
    <div
      className={`pointer-events-auto rounded-lg px-4 py-2 shadow-md text-sm text-white ${
        type === "success"
          ? "bg-green-600"
          : type === "error"
          ? "bg-red-600"
          : "bg-slate-700"
      }`}
    >
      {msg}
    </div>
  );
}

export default function DashboardClient({ topics }: { topics: any[] }) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(
    null
  );

  function showToast(msg: string, type: "success" | "error" | "info" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Compute counts per stage
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    PIPELINE_STAGES.forEach((s) => (counts[s] = 0));
    (topics || []).forEach((t: any) => {
      counts[t.status] = (counts[t.status] || 0) + 1;
    });
    return counts;
  }, [topics]);

  const total = topics?.length || 0;
  const pending = total - (stageCounts["PUBLISHED"] || 0);

  async function runDiscovery() {
    try {
      setLoading(true);
      await api.post("/topics/discover", {});
      showToast("Topic discovery triggered successfully!", "success");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error(err);
      showToast("Failed to run topic discovery", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack gap-lg fade-in">
      <h1 className="h1">📊 Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-3">
        <div className="card stat hover:scale-[1.02] transition">
          <div className="flex items-center gap-2">
            <DocumentIcon className="w-6 h-6 text-blue-600" />
            <div className="stat__value">{total}</div>
          </div>
          <div className="stat__label">Topics Total</div>
        </div>

        <div className="card stat hover:scale-[1.02] transition">
          <div className="flex items-center gap-2">
            <ClockIcon className="w-6 h-6 text-amber-500" />
            <div className="stat__value">{pending}</div>
          </div>
          <div className="stat__label">Pending</div>
        </div>

        <div className="card stat hover:scale-[1.02] transition">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-6 h-6 text-green-500" />
            <div className="stat__value">{stageCounts["PUBLISHED"] || 0}</div>
          </div>
          <div className="stat__label">Published</div>
        </div>
      </div>

      {/* Pipeline Progress */}
      <section className="card">
        <h2 className="h2 mb-3">Pipeline Progress</h2>
        <div className="flex gap-2 items-center">
         {PIPELINE_STAGES.map((stage) => {
  const count = stageCounts[stage] || 0;
  const pct = total > 0 ? (count / total) * 100 : 0;

  let bg = "linear-gradient(145deg, #9ca3af, #6b7280)";
  let textColor = "text-white";

  switch (stage) {
    case "NEW":
      bg = "linear-gradient(145deg, #fbbf24, #f59e0b)";
      textColor = "text-black";
      break;
    case "APPROVED":
      bg = "linear-gradient(145deg, #facc15, #eab308)";
      textColor = "text-black";
      break;
    case "COLLECTED":
      bg = "linear-gradient(145deg, #06b6d4, #0891b2)";
      textColor = "text-black";
      break;
    case "DRAFTED":
      bg = "linear-gradient(145deg, #3b82f6, #2563eb)";
      textColor = "text-black";
      break;
    case "ASSIGNED":
      bg = "linear-gradient(145deg, #f472b6, #ec4899)";
      textColor = "text-black"; // 👈 better on pink
      break;
    case "READY":
      bg = "linear-gradient(145deg, #8b5cf6, #7c3aed)";
      textColor = "text-black";
      break;
    case "PUBLISHED":
      bg = "linear-gradient(145deg, #22c55e, #16a34a)";
      textColor = "text-black";
      break;
    case "DISAPPROVED":
      bg = "linear-gradient(145deg, #ef4444, #b91c1c)";
      textColor = "text-black";
      break;
  }

  return (
    <div
      key={stage}
      className="flex-1 h-6 rounded-full relative overflow-hidden"
      style={{
        background: "var(--bg-elev-2)",
        boxShadow: "var(--sh-elev-sm)",
      }}
    >
      <div
        className="h-full"
        style={{
          width: `${pct}%`,
          background: bg,
          transition: "width 0.3s ease",
        }}
      />
      <span
        className={`absolute inset-0 flex items-center justify-center text-[11px] font-semibold ${textColor}`}
      >
        {stage} ({count})
      </span>
    </div>
  );
})}

        </div>
      </section>

      {/* Discovery Action */}
      <div className="actions">
        <button
          onClick={runDiscovery}
          disabled={loading}
          className="btn btn--primary flex items-center gap-2"
        >
          {loading ? (
            <>
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <PlayIcon className="w-4 h-4" /> Run Topic Discovery
            </>
          )}
        </button>
      </div>

      {/* Recent Topics */}
      <section className="card">
        <h2 className="h2 mb-3">Recent Topics</h2>
        {topics?.slice(0, 5).map((t: any) => (
          <Link
            key={t.id}
            href={`/topics/${t.id}`}
            className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-md transition"
          >
            <span>{t.title}</span>
            <span
              className={`badge ${
                t.status === "PUBLISHED"
                  ? "badge--ok"
                  : t.status === "NEW"
                  ? "badge--warn"
                  : t.status === "DISAPPROVED"
                  ? "badge--err"
                  : "badge--err"
              }`}
            >
              {t.status}
            </span>
          </Link>
        ))}
        {topics.length === 0 && (
          <div className="empty">No topics yet. Run discovery to get started.</div>
        )}
      </section>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <Toast msg={toast.msg} type={toast.type} />
        </div>
      )}
    </div>
  );
}
