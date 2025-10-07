//appscms/src/app/(protected)/topics/[id]/PipelineAction.tsx
"use client";
import { useMemo, useState } from "react";
import { api } from "../../../../lib/api";
import { CheckIcon } from "@heroicons/react/24/solid";

// Ordered steps we expose in the UI
export type Step = "collect" | "draft" | "review" | "publish";

const STEP_STATUS: Record<Step, string> = {
  collect: "COLLECTED",
  draft: "DRAFTED",
  review: "READY",
  publish: "PUBLISHED",
};

const STEPS: { key: Step; label: string }[] = [
  { key: "collect", label: "Collect" },
  { key: "draft", label: "Draft" },
  { key: "review", label: "Review" },
  { key: "publish", label: "Publish" },
];

// Map Topic.status to a rank so we can gate buttons
const statusRank: Record<string, number> = {
  NEW: 0,
  APPROVED: 0.5, // 👈 half-step between NEW and COLLECTED
  COLLECTED: 1,
  DRAFTED: 2,
  ASSIGNED: 2, // treat as drafted
  READY: 3,
  PUBLISHED: 4,
};

const stepRank: Record<Step, number> = {
  collect: 1,
  draft: 2,
  review: 3,
  publish: 4,
};

// Toast (reused style)
function Toast({ msg, type = "success" }: { msg: string; type?: "success" | "error" | "info" }) {
  return (
    <div
      className={`pointer-events-auto rounded-lg px-4 py-2 shadow-md text-sm text-white ${
        type === "success" ? "bg-green-600" : type === "error" ? "bg-red-600" : "bg-slate-700"
      }`}
    >
      {msg}
    </div>
  );
}

export default function PipelineActions({
  topicId,
  status,
  articleId,
  onUpdated,
}: {
  topicId: string;
  status: string;
  articleId?: string;
  onUpdated?: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<Step | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);

  const currentRank = statusRank[status] ?? 0;

  // compute per-step UI state
  const ui = useMemo(
    () =>
      STEPS.map((s, idx) => {
        const r = stepRank[s.key];
        const completed = currentRank >= r; // already at/after this step's status
        const active = currentRank >= r - 1 && currentRank < r; // 👈 allow APPROVED (0.5) to activate COLLECT
        const locked = currentRank < r - 1; // previous not done yet
        const number = idx + 1;
        return { ...s, r, completed, active, locked, number };
      }),
    [currentRank]
  );

  function showToast(msg: string, type: "success" | "error" | "info" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function notAllowed(step: Step) {
    const needed = stepRank[step] - 1;
    if (currentRank < needed) return true;
    if (step === "publish" && !articleId) return true;
    return false;
  }

  async function run(step: Step) {
    if (notAllowed(step)) {
      showToast("Complete the previous step first", "info");
      return;
    }

    try {
      setBusy(step);
      if (step === "collect") {
        await api.post(`/agents/topics/${topicId}/collect`);
      } else if (step === "draft") {
        await api.post(`/agents/topics/${topicId}/draft`);
      } else if (step === "review") {
        await api.post(`/agents/topics/${topicId}/review`);
      } else if (step === "publish" && articleId) {
        await api.post(`/articles/${articleId}/publish`);
      }

      showToast(`${STEP_STATUS[step]} successfully`, "success");
      if (onUpdated) await onUpdated();
    } catch (err) {
      console.error(err);
      showToast(`Failed to ${step}`, "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="card p-4 grid gap-4">
      {/* Stepper */}
      <div className="relative">
        <div className="flex items-center gap-3">
          {ui.map((s, i) => (
            <div key={s.key} className="flex-1">
              <div className="relative">
                {/* pointer above active */}
                {s.active && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-blue-500" />
                )}

                <div
                  className={`flex items-center justify-between rounded-full px-3 h-10 shadow ${
                    s.completed
                      ? "bg-green-500 text-white"
                      : s.active
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        s.completed ? "bg-green-600" : s.active ? "bg-blue-600" : "bg-gray-300"
                      }`}
                    >
                      {s.completed ? <CheckIcon className="w-4 h-4" /> : s.number}
                    </span>
                    <span className="font-semibold text-sm">{s.label}</span>
                  </div>

                  {/* status chip on the right */}
                  <span className="text-[10px] font-semibold opacity-80">
                    {s.completed ? STEP_STATUS[s.key] : s.active ? "Next" : "Locked"}
                  </span>
                </div>

                {/* connector line */}
                {i < ui.length - 1 && (
                  <div className="absolute top-1/2 right-[-8px] translate-y-[-50%] w-4 h-1 bg-gray-300" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons - gated */}
      <div className="flex gap-2">
        <button
          className="btn"
          disabled={busy === "collect" || notAllowed("collect")}
          onClick={() => run("collect")}
          title={notAllowed("collect") ? "Approve sources first" : "Collect sources"}
        >
          {busy === "collect" ? "Collecting…" : "Collect"}
        </button>

        <button
          className="btn"
          disabled={busy === "draft" || notAllowed("draft")}
          onClick={() => run("draft")}
          title={notAllowed("draft") ? "Run Collect first" : "Draft article"}
        >
          {busy === "draft" ? "Drafting…" : "Draft"}
        </button>

        <button
          className="btn"
          disabled={busy === "review" || notAllowed("review")}
          onClick={() => run("review")}
          title={notAllowed("review") ? "Complete Draft first" : "Run Review"}
        >
          {busy === "review" ? "Reviewing…" : "Review"}
        </button>

        {articleId && (
          <button
            className="btn btn--primary"
            disabled={busy === "publish" || notAllowed("publish")}
            onClick={() => run("publish")}
            title={notAllowed("publish") ? "Ready status required" : "Publish"}
          >
            {busy === "publish" ? "Publishing…" : "Publish"}
          </button>
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
