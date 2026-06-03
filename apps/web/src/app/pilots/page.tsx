import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { OperationsShell } from "@/components/operations-shell";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "PrivateDAO Pilot Program",
  description:
    "Run a fixed-scope PrivateDAO pilot for confidential governance, grant review, treasury coordination, payroll, or sensitive organizational approvals.",
  path: "/pilots",
  keywords: ["PrivateDAO pilot", "DAO governance pilot", "confidential treasury pilot", "Solana organization pilot"],
});

const workflows = [
  ["Grant review", "Assign reviewers, preserve independent scoring, approve an award, and publish a proof-linked outcome."],
  ["Treasury approval", "Coordinate a sensitive treasury request, route authority, execute a Testnet action, and export the receipt."],
  ["Contributor payroll", "Prepare payroll or rewards without exposing every recipient detail during coordination."],
  ["Emergency coordination", "Run a bounded response workflow with private review, scoped authority, and a public-safe audit trail."],
] as const;

const successMeasures = [
  "A normal operator can complete the selected workflow without code or terminal steps.",
  "Sensitive coordination remains bounded during the decision window.",
  "The final outcome and execution evidence are understandable to a non-technical stakeholder.",
  "The organization leaves with a repeatable operating recommendation and proof packet.",
] as const;

const deliverables = [
  "One configured workflow",
  "Wallet onboarding and Testnet operating run",
  "Proof packet and verification links",
  "Success report and adoption recommendation",
] as const;

export default function PilotsPage() {
  return (
    <OperationsShell
      eyebrow="Pilot program"
      title="Prove one sensitive organizational workflow in four weeks."
      description="PrivateDAO pilots start with a real operational pain, not a broad platform rollout. Select one workflow, run it on Solana Testnet, measure the result, and decide whether repeated use is justified."
      navigationMode="guided"
      badges={[
        { label: "$2,500 fixed scope", variant: "cyan" },
        { label: "Four weeks", variant: "success" },
        { label: "Proof packet included", variant: "violet" },
      ]}
    >
      <section className="rounded-[28px] border border-emerald-300/16 bg-emerald-300/[0.06] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-emerald-100/76">Choose one workflow</div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {workflows.map(([title, body]) => (
            <article key={title} className="rounded-[20px] border border-white/10 bg-black/22 p-4">
              <div className="text-base font-semibold text-white">{title}</div>
              <p className="mt-2 text-sm leading-6 text-white/62">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-[28px] border border-cyan-300/16 bg-cyan-300/[0.06] p-5 sm:p-6">
          <div className="text-[11px] uppercase tracking-[0.25em] text-cyan-100/76">Success measures</div>
          <div className="mt-5 grid gap-3">
            {successMeasures.map((item) => (
              <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-black/22 p-4">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-100" />
                <span className="text-sm leading-6 text-white/66">{item}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[28px] border border-violet-300/16 bg-violet-300/[0.06] p-5 sm:p-6">
          <div className="text-[11px] uppercase tracking-[0.25em] text-violet-100/76">What the team receives</div>
          <div className="mt-5 grid gap-3">
            {deliverables.map((item) => (
              <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-black/22 p-4">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-100" />
                <span className="text-sm leading-6 text-white/66">{item}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-white/46">From pilot to case study</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Evidence first. Public story second.</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/64">
          A case study is published only when the participating organization approves the disclosure scope. The public
          story can show the operational problem, the workflow used, the measurable result, and the verification route
          without exposing sensitive internal context.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="mailto:Fahd.kotb@tuta.io?subject=PrivateDAO%20Pilot" className={cn(buttonVariants({ size: "sm" }))}>
            Request a pilot
            <ArrowRight className="h-4 w-4" />
          </a>
          <Link href="/try" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Try the workflow first
          </Link>
          <Link href="/pricing" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            View pricing
          </Link>
        </div>
      </section>
    </OperationsShell>
  );
}
