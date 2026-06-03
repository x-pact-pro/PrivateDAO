import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { BusinessValueSurface } from "@/components/business-value-surface";
import { OperationsShell } from "@/components/operations-shell";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "Why PrivateDAO",
  description: "PrivateDAO is confidential coordination infrastructure for organizations on Solana with public verification.",
  path: "/value",
  keywords: ["why private dao", "private coordination", "public verification", "dao coordination layer"],
});

const beforeAfter = [
  ["Before", "Proposal passed → Telegram → DMs → spreadsheets → unclear accountability."],
  ["With PrivateDAO", "Proposal passed → review → approve → execute → audit."],
] as const;

const simpleFlow = [
  ["1. Understand the decision", "See treasury context, risk signals, and public evidence before signing."],
  ["2. Coordinate privately", "Keep vote momentum, reviewer opinions, and sensitive operating details out of public view."],
  ["3. Approve and execute", "Move from decision to a wallet-signed Solana Testnet action without rebuilding the workflow elsewhere."],
  ["4. Prove the outcome", "Publish the final result, execution receipt, and verification route when the process is complete."],
] as const;

export default function ValuePage() {
  return (
    <OperationsShell
      eyebrow="Why PrivateDAO"
      title="Confidential coordination infrastructure for organizations on Solana."
      description="PrivateDAO helps organizations make better decisions, protect sensitive operations, and prove outcomes without forcing every internal detail into public view."
      navigationMode="guided"
      badges={[
        { label: "Private coordination", variant: "cyan" },
        { label: "Public verification", variant: "success" },
        { label: "Verifiable execution", variant: "violet" },
      ]}
    >
      <section className="rounded-[30px] border border-emerald-300/18 bg-[linear-gradient(135deg,rgba(20,241,149,0.12),rgba(0,194,255,0.08),rgba(153,69,255,0.10))] p-5 md:p-6">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-emerald-100/80">The shift</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-white md:text-4xl">
              Public accountability. Private coordination.
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/66">
              Public blockchains are good at proving outcomes. Organizations still need privacy while reviewing grants,
              planning treasury actions, coordinating payroll, and responding to sensitive events.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/try" className={cn(buttonVariants({ size: "sm" }))}>
                Try the workflow
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/proof" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                View proof reports
              </Link>
            </div>
          </div>
          <div className="grid gap-3">
            {beforeAfter.map(([title, body]) => (
              <div key={title} className="rounded-[22px] border border-white/10 bg-black/22 p-5">
                <div className="text-base font-semibold text-white">{title}</div>
                <p className="mt-2 text-sm leading-7 text-white/62">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <BusinessValueSurface compact />
      <section className="rounded-[30px] border border-white/10 bg-white/[0.035] p-5 md:p-6">
        <div className="text-[11px] uppercase tracking-[0.28em] text-white/50">How it works</div>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-white">One workflow from context to proof.</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {simpleFlow.map(([title, body]) => (
            <article key={title} className="rounded-[20px] border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <CheckCircle2 className="h-4 w-4 text-emerald-100" />
                {title}
              </div>
              <p className="mt-2 text-sm leading-6 text-white/60">{body}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="rounded-[30px] border border-white/10 bg-white/[0.035] p-5 md:p-6">
        <div className="text-[11px] uppercase tracking-[0.28em] text-white/50">For developers and auditors</div>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-white">How it is built</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/62">
          The user sees a simple workflow. Reviewers can inspect the deeper architecture: provider boundaries, Testnet receipts, private rooms, commit-reveal posture, intelligence-before-signing, and proof export.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/developers" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>Developer docs</Link>
          <Link href="/proof" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>Proof center</Link>
          <Link href="/settings/intelligence" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>Advanced providers</Link>
        </div>
      </section>
    </OperationsShell>
  );
}
