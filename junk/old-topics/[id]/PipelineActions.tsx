"use client";
import { useState } from "react";
import { api } from "../../../lib/api";

type Step = "collect" | "draft" | "review" | "publish";

// Map API steps to topic status values
const STEP_STATUS: Record<Step, string> = {
  collect: "COLLECTED",
  draft: "DRAFTED",
  review: "READY",
  publish: "PUBLISHED",
};

export default function PipelineActions({
  topicId,
  status,
}: {
  topicId: string;
  status: string;
}) {
  const [busy, setBusy] = useState<Step | null>(null);

  async function run(step: Step) {
    try {
      setBusy(step);
      await api.post(`/agents/topics/${topicId}/${step}`, {});
      alert(`${step.toUpperCase()} done`);
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert(`Failed at ${step}`);
    } finally {
      setBusy(null);
    }
  }

  // Compute active step index
  const steps: Step[] = ["collect", "draft", "review", "publish"];
  const currentIndex = steps.findIndex(
    (s) => STEP_STATUS[s] === status.toUpperCase()
  );

  return (
    <section className="card p-4 grid gap-4">
      <h3 className="h3">Pipeline Progress</h3>

      {/* Visual stepper */}
      <div className="flex justify-between items-center relative">
        {steps.map((s, i) => {
          const isDone = currentIndex >= i;
          const isActive = STEP_STATUS[s] === status.toUpperCase();

          return (
            <div key={s} className="flex flex-col items-center flex-1">
              <div
                className={`w-8 h-8 flex items-center justify-center rounded-full border-2 
                  ${isActive ? "bg-blue-600 border-blue-600 text-white" : ""}
                  ${isDone && !isActive ? "bg-green-500 border-green-500 text-white" : ""}
                  ${!isDone && !isActive ? "bg-gray-200 border-gray-300 text-gray-500" : ""}`}
              >
                {i + 1}
              </div>
              <span className="text-xs mt-1 uppercase">{s}</span>
            </div>
          );
        })}
        {/* connector line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-300 -z-10"></div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {steps.map((step) => {
          const nextStatus = STEP_STATUS[step];
          const disabled =
            !!busy ||
            // only enable the "next" step, unless already done
            (status.toUpperCase() !== nextStatus &&
              steps.findIndex((s) => STEP_STATUS[s] === status.toUpperCase()) + 1 !==
                steps.indexOf(step));

          return (
            <button
              key={step}
              onClick={() => run(step)}
              disabled={disabled}
              className={`btn ${
                disabled ? "btn--disabled" : "btn--primary"
              } min-w-[100px]`}
            >
              {busy === step ? "Processing…" : step.toUpperCase()}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-500">
        Current Status: <strong>{status}</strong>  
        <br />
        Steps must be followed in order: COLLECT → DRAFT → REVIEW → PUBLISH.
      </p>
    </section>
  );
}
