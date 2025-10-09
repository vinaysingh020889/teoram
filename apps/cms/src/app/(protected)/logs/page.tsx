"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import RequireAuth from "../../../components/RequireAuth";

function LogRow({ log }: { log: any }) {
  const statusColor =
    log.meta?.status === "FAILED" ? "text-red-600" : "text-green-600";

  // 🧠 Summarize topic pipeline stats if available
  const isSummary =
    log.action === "TOPIC_DISCOVERY_RUN" && log.meta?.fetchedCount !== undefined;
  const summaryLine = isSummary
    ? `🧾 ${new Date(log.createdAt).toLocaleString()} — ${log.meta?.fetchedCount || 0} fetched, ${
        log.meta?.skippedDuplicates || 0
      } duplicates, ${log.meta?.groupedCount || 0} grouped, ${log.meta?.topicsCreated || 0} created, ${
        log.meta?.topicsReused || 0
      } reused`
    : null;

  return (
    <>
      {isSummary ? (
        <tr className="border-b bg-blue-50">
          <td className="p-2 font-mono text-xs">{log.action}</td>
          <td className="p-2 text-sm text-gray-800" colSpan={4}>
            {summaryLine}
          </td>
        </tr>
      ) : (
        <tr className="border-b">
          <td className="p-2 font-mono text-xs">{log.action}</td>
          <td className={`p-2 font-semibold ${statusColor}`}>
            {log.meta?.status || "—"}
          </td>
          <td className="p-2">{log.meta?.message || log.meta?.title || "—"}</td>
          <td className="p-2">{log.topic?.title || "—"}</td>
          <td className="p-2 text-xs text-gray-500">
            {new Date(log.createdAt).toLocaleString()}
          </td>
        </tr>
      )}
    </>
  );
}

function LogsTable({ endpoint }: { endpoint: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await api.get(endpoint);
        setLogs(res.data?.data || []);
      } catch (err) {
        console.error("Failed to fetch logs:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [endpoint]);

  if (loading) return <p>Loading logs...</p>;
  if (logs.length === 0) return <p>No logs found.</p>;

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-gray-100">
          <th className="p-2 text-left">Action</th>
          <th className="p-2 text-left">Status</th>
          <th className="p-2 text-left">Message / Summary</th>
          <th className="p-2 text-left">Topic</th>
          <th className="p-2 text-left">Time</th>
        </tr>
      </thead>
      <tbody>
        {logs.map((log) => (
          <LogRow key={log.id} log={log} />
        ))}
      </tbody>
    </table>
  );
}

function LogsPageInner() {
  const [activeTab, setActiveTab] = useState<"topics" | "articles">("topics");

  return (
    <main className="p-6">
      <h1 className="h1 mb-4">Pipeline Logs</h1>

      {/* 🔹 Tabs */}
      <div className="mb-4 flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("topics")}
          className={`pb-2 text-sm font-semibold ${
            activeTab === "topics"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          🧩 Topic Pipeline
        </button>
        <button
          onClick={() => setActiveTab("articles")}
          className={`pb-2 text-sm font-semibold ${
            activeTab === "articles"
              ? "border-b-2 border-green-500 text-green-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          📰 Article Pipeline
        </button>
      </div>

      {/* 🔹 Table Switcher */}
      {activeTab === "topics" ? (
        <LogsTable endpoint="/logs/topics" />
      ) : (
        <LogsTable endpoint="/logs/articles" />
      )}
    </main>
  );
}

export default function LogsPage() {
  return (
    <RequireAuth>
      <LogsPageInner />
    </RequireAuth>
  );
}
