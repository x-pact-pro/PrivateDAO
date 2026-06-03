import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const outcomes = [
  {
    pain: "Sensitive strategy leaks before a decision is finished.",
    value: "Keep vote momentum, reviewer opinions, payroll details, and treasury intent private until disclosure is useful.",
  },
  {
    pain: "Approvals disappear across chats, spreadsheets, and trusted operators.",
    value: "Connect review, approval, execution, and proof in one workflow that survives contributor and leadership changes.",
  },
  {
    pain: "Public wallets expose operating patterns to competitors and counterparties.",
    value: "Reduce unnecessary operational exposure while preserving public accountability after completion.",
  },
  {
    pain: "Teams spend time rebuilding context for auditors, grants, and stakeholders.",
    value: "Export proof-linked outcomes and execution receipts instead of reconstructing the decision after the fact.",
  },
] as const;

const audiences = [
  ["DAO operators", "Run governance, grants, treasury requests, and emergency approvals with less coordination leakage."],
  ["Protocol and foundation teams", "Protect sensitive operational work while keeping final actions verifiable on Solana."],
  ["Grant and review committees", "Preserve reviewer independence, then publish the award outcome and proof."],
  ["Contributor-led organizations", "Coordinate payroll, rewards, and vendor payouts without exposing every internal detail."],
] as const;

export function BusinessValueSurface({ compact = false }: { compact?: boolean }) {
  return (
    <section className="border-y border-white/10 py-7 sm:py-9">
      <div className="max-w-4xl">
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-100/76">Business value</div>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-white sm:text-3xl">
          Privacy is not the product outcome. Better organizational decisions are.
        </h2>
        <p className="mt-3 text-sm leading-7 text-white/66">
          PrivateDAO helps organizations reduce strategy leakage, shorten operational handoffs, preserve institutional
          memory, and produce evidence that stakeholders can verify.
        </p>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {outcomes.map((item) => (
          <article key={item.pain} className="border-l border-emerald-300/30 py-1 pl-4">
            <h3 className="text-sm font-semibold leading-6 text-white">{item.pain}</h3>
            <p className="mt-1 text-sm leading-6 text-white/60">{item.value}</p>
          </article>
        ))}
      </div>

      {!compact ? (
        <>
          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {audiences.map(([title, body]) => (
              <article key={title} className="rounded-[20px] border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <CheckCircle2 className="h-4 w-4 text-emerald-100" />
                  {title}
                </div>
                <p className="mt-2 text-sm leading-6 text-white/60">{body}</p>
              </article>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/try" className={cn(buttonVariants({ size: "sm" }))}>
              Try the Testnet workflow
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/pricing" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
              View pricing
            </Link>
            <Link href="/investors" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              Investor overview
            </Link>
          </div>
        </>
      ) : null}
    </section>
  );
}
