import type { Metadata } from "next";
import Link from "next/link";

import { JupiterTreasuryRouteSurface } from "@/components/jupiter-treasury-route-surface";
import { LocalizedRouteSummary } from "@/components/localized-route-summary";
import { OperationsShell } from "@/components/operations-shell";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

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
      title="Governed treasury route preview for execution-quality decisions"
      description="This route productizes Jupiter as a controlled treasury operation lane. Operators preview route quality before signing, then keep the rationale visible for judge and proof verification."
      badges={[
        { label: "Jupiter lane", variant: "cyan" },
        { label: "Treasury execution", variant: "success" },
        { label: "Reviewer-friendly", variant: "violet" },
      ]}
    >
      <LocalizedRouteSummary routeKey="services" />
      <div className="rounded-[28px] border border-cyan-300/16 bg-cyan-300/[0.08] p-6">
        <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/78">Route discipline</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Preview first, sign second, verify third</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/66">
          Jupiter routing is used as an execution-quality layer in treasury context, not as a detached trading widget.
          The operator sees quote posture first, then carries that context into governed actions and proof surfaces.
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
      <JupiterTreasuryRouteSurface />
    </OperationsShell>
  );
}
