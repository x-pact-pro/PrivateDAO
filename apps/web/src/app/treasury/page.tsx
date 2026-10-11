import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { OperationsShell } from "@/components/operations-shell";
import { SelectedKernelWorkflow } from "@/components/selected-kernel-workflow";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "Treasury Coordination",
  description:
    "Organize spending requests, approvals, and payment decisions in one clear treasury workspace.",
  path: "/private-treasury",
  keywords: ["treasury coordination", "treasury approvals", "spending requests", "treasury audit records"],
});

export default function TreasuryPage() {
  return (
    <OperationsShell
      eyebrow="Treasury"
      title="Treasury coordination and approval trails."
      description="Create spending requests, route them through the right approvals, and keep a clear record of every payment decision."
      badges={[
        { label: "Spending requests", variant: "cyan" },
        { label: "Approval trails", variant: "warning" },
        { label: "Treasury proof", variant: "success" },
      ]}
    >
      <SelectedKernelWorkflow product="treasury">
      <section className="rounded-[28px] border border-emerald-300/18 bg-emerald-300/[0.06] p-5 sm:p-6">
        <h2 className="text-2xl font-semibold text-white">Start a treasury workflow.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/64">
          Prepare a request, route it through review and approval, then keep the decision and payment record together
          for your finance team.
        </p>
        <Link href="/services/jupiter-treasury-route" className={cn(buttonVariants({ size: "lg" }), "mt-5")}>
          Start Treasury Workflow
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        {[
          ["Spending requests", "Prepare a clear request with an owner, amount, purpose, and approval path.", "/services/jupiter-treasury-route"],
          ["Payment decisions", "Review the right payment route before money moves and keep the decision record attached.", "/services/confidential-payments"],
          ["Payroll operations", "Coordinate recurring team payments with privacy and a simple proof of completion.", "/payroll"],
        ].map(([title, body, href]) => (
          <article key={title} className="rounded-[24px] border border-emerald-300/16 bg-emerald-300/[0.055] p-5">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="mt-3 min-h-20 text-sm leading-7 text-white/64">{body}</p>
            <Link href={href} className="mt-4 inline-flex text-sm font-semibold text-emerald-100 hover:text-white">Learn more</Link>
          </article>
        ))}
      </section>
      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 text-sm leading-7 text-white/68">
        Start with the request, review the risk, and continue to payment only when the right people have approved it.
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/treasury" className={cn(buttonVariants({ size: "sm" }))}>
            Review requests
          </Link>
          <Link href="/services/jupiter-treasury-route" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open treasury route
          </Link>
          <Link href="/proof-workflows/blind-policy" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Verify an outcome
          </Link>
        </div>
      </div>

      <section className="rounded-[24px] border border-[#dce5f0] bg-[#f7f9fc] p-5 sm:p-6">
        <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#175cd3]">A clear operating path</div>
        <h2 className="mt-3 text-2xl font-semibold text-[#10233f]">Keep the decision private. Keep the result useful.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#5d6d82]">
          Your team sees the request, the policy, the approval, and the outcome in one place. Technical execution and
          verification details stay behind the workflow for the people who need them.
        </p>
        <Link href="/proof-workflows" className={cn(buttonVariants({ size: "sm", variant: "outline" }), "mt-5")}>
          See verification workflows
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
      </SelectedKernelWorkflow>
    </OperationsShell>
  );
}
