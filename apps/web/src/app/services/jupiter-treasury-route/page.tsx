import type { Metadata } from "next";
import Link from "next/link";

import { JupiterTreasuryRouteSurface } from "@/components/jupiter-treasury-route-surface";
import { LocalizedRouteSummary } from "@/components/localized-route-summary";
import { OperationsShell } from "@/components/operations-shell";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

const executionSteps = [
  ["Pain", "Public swaps expose treasury intent, timing, size, and operational pressure before the organization can explain the decision."],
  ["Preview", "Jupiter quote data is fetched only when the operator clicks Run route preview, keeping first load light and inspectable."],
  ["Govern", "The route becomes a governed treasury decision instead of an isolated swap, with slippage and route quality visible before signing."],
  ["Verify", "The decision path points back to Judge, Proof, and the route brief so reviewers can inspect why the move made sense."],
] as const;

export const metadata: Metadata = buildRouteMetadata({
  title: "Jupiter Treasury Route",
  description:
    "Run governed treasury route previews with Jupiter inside PrivateDAO and keep route quality visible for judge and proof review.",
  path: "/services/jupiter-treasury-route",
  keywords: ["jupiter", "treasury route", "rebalance", "swap preview", "dao execution"],
});

export default function JupiterTreasuryRoutePage() {
  return (
    <OperationsShell
      eyebrow="Jupiter track"
      title="Your treasury moves are public. The decision process should be controlled."
      description="PrivateDAO uses Jupiter as a governed route-preview layer for Solana treasury operations: preview quote quality, decide inside policy, then keep the reason and proof visible without turning treasury work into an exposed trading dashboard."
      navigationMode="guided"
      badges={[
        { label: "Jupiter lane", variant: "cyan" },
        { label: "Treasury execution", variant: "success" },
        { label: "Reviewer-friendly", variant: "violet" },
      ]}
    >
      <LocalizedRouteSummary routeKey="services" />
      <div className="rounded-[28px] border border-cyan-300/16 bg-cyan-300/[0.08] p-6">
        <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/78">Route discipline</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Preview first. Govern the route. Prove the reason.</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/66">
          Jupiter routing is used as an execution-quality layer in treasury context, not as a detached trading widget.
          The operator sees quote posture first, then carries that context into governed actions and proof surfaces.
          A normal visitor can click the preview button, see live route data, then understand why the treasury action is
          private in process but verifiable in outcome.
          When the server key is configured, this lane uses Jupiter Developer Platform /order through the PrivateDAO
          backend; the public Lite Quote route remains as a safe fallback for static review.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/execute#treasury-rebalance" className={cn(buttonVariants({ size: "sm" }))}>
            Open execute lane
          </Link>
          <Link href="/judge" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open judge lane
          </Link>
          <Link href="/proof" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Open proof lane
          </Link>
        </div>
      </div>
      <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6">
        <div className="text-[11px] uppercase tracking-[0.28em] text-white/44">Execution path</div>
        <h2 className="mt-3 max-w-4xl text-2xl font-semibold text-white">
          A treasury route should explain itself before a wallet signs it
        </h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {executionSteps.map(([label, detail]) => (
            <div key={label} className="rounded-[22px] border border-white/8 bg-black/22 p-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-100/62">{label}</div>
              <p className="mt-3 text-sm leading-6 text-white/62">{detail}</p>
            </div>
          ))}
        </div>
      </section>
      <JupiterTreasuryRouteSurface />
    </OperationsShell>
  );
}
