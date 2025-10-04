// apps/cms/src/components/ProgressStepper.tsx
export function ProgressStepper({ status }: { status: string }) {
  const order = ["NEW", "APPROVED", "PROCESSING", "COLLECTED", "DRAFTED", "CATEGORIZED", "READY", "PUBLISHED"];
  const idx = order.indexOf(status);
  return (
    <ol className="flex gap-2 text-sm">
      {order.map((s, i) => (
        <li key={s} className={`chip ${i <= idx ? "badge--ok" : ""}`}>{s}</li>
      ))}
    </ol>
  );
}