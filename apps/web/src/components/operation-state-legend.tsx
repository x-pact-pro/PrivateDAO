type OperationStateLegendProps = {
  title?: string;
  description?: string;
};

const defaultStates = [
  {
    label: "Live execution",
    body: "A route actually prepares or submits a real runtime action on its current rail.",
  },
  {
    label: "Health / status",
    body: "A route checks vendor availability, relayer readiness, or runtime state without moving funds.",
  },
  {
    label: "Intent receipt",
    body: "A route records a review-safe intent or receipt so operators and judges can inspect continuity.",
  },
  {
    label: "Full private settlement",
    body: "A route reaches the actual payout rail and finishes the confidential transfer lifecycle.",
  },
] as const;

export function OperationStateLegend({
  title = "Execution boundaries",
  description = "Every service lane below is tagged so visitors can distinguish real runtime action from readiness checks and reviewer-safe receipts.",
}: OperationStateLegendProps) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
      <div className="text-[11px] uppercase tracking-[0.24em] text-white/44">{title}</div>
      <p className="mt-3 max-w-4xl text-sm leading-7 text-white/66">{description}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {defaultStates.map((state) => (
          <div key={state.label} className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <div className="text-sm font-medium text-white">{state.label}</div>
            <div className="mt-2 text-sm leading-6 text-white/60">{state.body}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
