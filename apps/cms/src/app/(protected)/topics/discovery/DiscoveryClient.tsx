"use client";
import { useEffect, useState } from "react";
import { api } from "../../../../lib/api";
import Link from "next/link";

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

export default function DiscoveryClient() {
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [approving, setApproving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(
    null
  );

  function showToast(msg: string, type: "success" | "error" | "info" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    try {
      const res = await api.get("/topics/discovery");
      setTopics(res.data?.data || []);
    } catch (e) {
      console.error(e);
      setTopics([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function runDiscovery() {
    try {
      setBusy(true);
      await api.post("/topics/discover", {});
      await load();
      showToast("Discovery triggered", "success");
    } catch (e) {
      console.error(e);
      showToast("Failed to trigger discovery", "error");
    } finally {
      setBusy(false);
    }
  }

  async function approve(topicId: string) {
    try {
      setApproving(topicId);
      const urls = selected[topicId] || [];
      if (urls.length === 0) {
        showToast("Please select at least one source", "info");
        return;
      }
      await api.post(`/topics/${topicId}/approve`, { selectedUrls: urls });
      showToast("Approved successfully", "success");
      await load();
    } catch (e) {
      console.error(e);
      showToast("Approve failed", "error");
    } finally {
      setApproving(null);
    }
  }

async function disapprove(topicId: string) {
  try {
    await api.post(`/topics/${topicId}/disapprove`);
    setTopics((prev) => prev.filter((t) => t.id !== topicId));
    showToast("Topic disapproved & removed from discovery", "info");
  } catch (e) {
    console.error(e);
    showToast("Failed to disapprove", "error");
  }
}

async function duplicate(topicId: string) {
  try {
    await api.post(`/topics/${topicId}/duplicate`);
    setTopics((prev) => prev.filter((t) => t.id !== topicId));
    showToast("Topic marked as duplicate & removed from discovery", "info");
  } catch (e) {
    console.error(e);
    showToast("Failed to mark duplicate", "error");
  }
}


  function toggleSource(topicId: string, url: string, checked: boolean) {
    setSelected((prev) => {
      const cur = prev[topicId] || [];
      return {
        ...prev,
        [topicId]: checked ? [...cur, url] : cur.filter((u) => u !== url),
      };
    });
  }

  function statusClass(status: string) {
    switch (status) {
      case "NEW":
        return "badge--warn";
      case "APPROVED":
      case "COLLECTED":
      case "DRAFTED":
      case "ASSIGNED":
      case "READY":
      case "PUBLISHED":
        return "badge--ok";
      default:
        return "badge--err";
    }
  }

  if (loading) return <div>Loading discovery…</div>;

  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between">
        <h2 className="h2">New Topics</h2>
        <button onClick={runDiscovery} className="btn btn--primary" disabled={busy}>
          {busy ? "Running…" : "Run Discovery"}
        </button>
      </div>

      <div className="grid gap-2">
        {topics.map((t: any) => (
          <div key={t.id} className="card p-4 grid gap-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{t.title}</span>
              <span className={`badge ${statusClass(t.status)}`}>{t.status}</span>
            </div>

            {/* Sources with checkboxes */}
            <div className="grid gap-2">
              {(t.sources || []).map((s: any) => (
                <label key={s.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={(selected[t.id] || []).includes(s.url)}
                    onChange={(e) => toggleSource(t.id, s.url, e.target.checked)}
                  />
                  <span className="chip">
                    <b>{s.kind}</b> {s.title || s.url}
                  </span>
                </label>
              ))}
            </div>

            {/* Actions row */}
            <div className="flex gap-2 justify-end">
              {t.status === "NEW" ? (
                <>
                  <button
                    onClick={() => approve(t.id)}
                    disabled={approving === t.id}
                    className="btn btn--primary"
                  >
                    {approving === t.id ? "Approving…" : "Approve"}
                  </button>
                  <button
                    onClick={() => disapprove(t.id)}
                    className="btn btn--danger"
                  >
                    Disapprove
                  </button>
                  <button
        onClick={() => duplicate(t.id)}
        className="btn"
      >
        Duplicate
      </button>
                </>
              ) : (
                <Link href={`/protected/topics/${t.id}`} className="btn">
                  Go to Topic →
                </Link>
              )}
            </div>
          </div>
        ))}
        {topics.length === 0 && (
          <div className="empty">No NEW topics. Try Run Discovery.</div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <Toast msg={toast.msg} type={toast.type} />
        </div>
      )}
    </section>
  );
}
