//appscms/src/app/(protected)/logs/page.tsx
"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import RequireAuth from "../../../components/RequireAuth";

function LogRow({ log }: { log: any }) {
  const statusColor =
    log.meta?.status === "FAILED" ? "text-red-600" : "text-green-600";

  return (
    <tr className="border-b">
      <td className="p-2 font-mono text-xs">{log.action}</td>
      <td className={`p-2 font-semibold ${statusColor}`}>
        {log.meta?.status}
      </td>
      <td className="p-2">{log.meta?.message}</td>
      <td className="p-2">{log.topic?.title || "—"}</td>
      <td className="p-2 text-xs text-gray-500">
        {new Date(log.createdAt).toLocaleString()}
      </td>
    </tr>
  );
}

function LogsPageInner() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await api.get("/logs");
        setLogs(res.data?.data || []);
      } catch (err) {
        console.error("Failed to fetch logs:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  return (
    <main className="p-6">
      <h1 className="h1 mb-4">Pipeline Logs</h1>
      {loading ? (
        <p>Loading logs...</p>
      ) : logs.length === 0 ? (
        <p>No logs found.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Action</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Message</th>
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
