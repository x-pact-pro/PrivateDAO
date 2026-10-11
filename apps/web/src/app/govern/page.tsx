import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { GovernWorkbenchClient } from "@/components/govern/govern-workbench-client";
import { GuidedOperationRail } from "@/components/guided-operation-rail";
import { OperationsShell } from "@/components/operations-shell";
import { SelectedKernelWorkflow } from "@/components/selected-kernel-workflow";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "Private Governance",
  description:
    "Private rooms, private voting, committee decisions, DAO coordination, and verifiable governance outcomes for organizations.",
  path: "/private-governance",
  keywords: ["private governance", "private rooms", "committee voting", "DAO coordination", "verifiable outcomes"],
});

export default function GovernPage() {
  return (
    <OperationsShell
      eyebrow="Govern"
      title="Private organizational decisions with verifiable outcomes."
      description="Use PrivateDAO for private rooms, committee decisions, DAO votes, internal board decisions, and community governance. Sensitive intent stays private while the outcome and proof become verifiable."
      navigationMode="focused"
      badges={[
        { label: "Private rooms", variant: "cyan" },
        { label: "Private voting", variant: "success" },
        { label: "Verifiable results", variant: "violet" },
      ]}
    >
      <SelectedKernelWorkflow product="governance">
      <section className="rounded-[28px] border border-cyan-300/18 bg-cyan-300/[0.06] p-5 sm:p-6">
        <h2 className="text-2xl font-semibold text-white">Start with a private room.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/64">
          Create one controlled space for a committee, DAO, foundation, community, or internal team to decide privately
          and reveal the outcome when the process is ready.
        </p>
        <Link href="/rooms/new" className={cn(buttonVariants({ size: "lg" }), "mt-5")}>
          Create Private Room
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        {[
          ["Private rooms", "Invite members, keep discussion and vote intent private, then reveal the outcome when the policy allows.", "/rooms/new"],
          ["Private vote", "Experience the simple governance path: proposal, private vote, reveal, verify, and execute.", "/try"],
          ["Governance pilot", "Map a committee, foundation, DAO, or community decision workflow into a repeatable private process.", "/pilots"],
        ].map(([title, body, href]) => (
          <article key={title} className="rounded-[24px] border border-cyan-300/16 bg-cyan-300/[0.055] p-5">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="mt-3 min-h-20 text-sm leading-7 text-white/64">{body}</p>
            <Link href={href} className="mt-4 inline-flex text-sm font-semibold text-cyan-100 hover:text-white">Learn more</Link>
          </article>
        ))}
      </section>
      <details className="enterprise-advanced-details rounded-[24px] border border-[#dce5f0] bg-[#f7f9fc] p-5 sm:p-6">
        <summary className="cursor-pointer text-sm font-semibold text-[#10233f]">Open the governance workspace</summary>
        <div className="mt-5 space-y-8">
          <GovernWorkbenchClient />
          <GuidedOperationRail current="review" reviewHref="/intelligence" verifyHref="/proof" />
        </div>
      </details>
      <div className="enterprise-card rounded-[24px] p-5 text-sm leading-7 text-[#5d6d82]">
        Start with one decision, invite the people who should be involved, and keep the final outcome clear for everyone who needs to trust it.
      </div>
      </SelectedKernelWorkflow>
    </OperationsShell>
  );
}
