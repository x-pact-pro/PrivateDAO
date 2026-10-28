import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bot, CheckCircle2, ExternalLink, LockKeyhole, WalletCards, Zap } from "lucide-react";

import { LocalizedRouteSummary } from "@/components/localized-route-summary";
import { MagicBlockPrivatePaymentsStatus } from "@/components/magicblock-private-payments-status";
import { OperationsShell } from "@/components/operations-shell";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "MagicBlock Private Payments",
  description:
    "PrivatePAY x402 gives people and agents a simple way to request a service, approve a private Solana payment, and receive a verifiable receipt.",
  path: "/services/magicblock-private-payments",
  keywords: ["magicblock", "private payments", "ephemeral rollups", "solana payments", "private balance"],
});

export default function MagicBlockPrivatePaymentsPage() {
  return (
    <OperationsShell
      eyebrow="PrivatePAY x402"
      title="Private payments for real AI commerce"
      description="Let people and agents discover a service, approve a quote, pay with their wallet, and receive a clear receipt. MagicBlock supplies the private settlement rail behind the experience."
      badges={[
        { label: "Built on Solana", variant: "cyan" },
        { label: "MagicBlock settlement", variant: "success" },
        { label: "Agent-ready", variant: "violet" },
      ]}
    >
      <LocalizedRouteSummary routeKey="services" />

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[24px] border border-[#cfe0f2] bg-[#f4f8fc] p-6 sm:p-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#175cd3]"><Zap className="h-4 w-4" /> A checkout that works for humans and software</div>
          <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-[-0.035em] text-[#10233f]">One private payment rail. Two simple entry points.</h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[#5d6d82]">Use the service directly from a wallet, or let an agent discover and call it through the Agent Exchange.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/agents" className={cn(buttonVariants({ size: "lg" }))}>Explore services <ArrowRight className="h-4 w-4" /></Link>
            <a href="https://quests.magicblock.app/" target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>Open Questline <ExternalLink className="h-4 w-4" /></a>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Link href="/agents" className="group rounded-[20px] border border-[#dce5f0] bg-white p-5 transition hover:border-[#175cd3]">
            <WalletCards className="h-5 w-5 text-[#175cd3]" />
            <h3 className="mt-3 font-semibold text-[#10233f]">For people</h3>
            <p className="mt-2 text-sm leading-6 text-[#5d6d82]">Connect a wallet, choose a service, and approve the exact payment.</p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#175cd3]">Start with a service <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
          </Link>
          <Link href="/agents" className="group rounded-[20px] border border-[#dce5f0] bg-white p-5 transition hover:border-[#175cd3]">
            <Bot className="h-5 w-5 text-[#175cd3]" />
            <h3 className="mt-3 font-semibold text-[#10233f]">For agents</h3>
            <p className="mt-2 text-sm leading-6 text-[#5d6d82]">Discover machine-ready tools, request access, and return a payment receipt.</p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#175cd3]">Browse Agent Exchange <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
          </Link>
        </div>
      </section>

      <section className="border-y border-[#dce5f0] py-8">
        <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#175cd3]">The PrivatePAY flow</div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            ["01", "Discover", "Find a useful service through the marketplace or an agent."],
            ["02", "Approve", "Review the recipient, amount, and purpose before signing."],
            ["03", "Verify", "Receive a settlement receipt that can be checked later."],
          ].map(([number, title, body]) => <div key={number} className="flex gap-4 border-l-2 border-[#b9d8f2] pl-4">
            <div className="text-sm font-bold text-[#175cd3]">{number}</div>
            <div><h3 className="font-semibold text-[#10233f]">{title}</h3><p className="mt-1 text-sm leading-6 text-[#5d6d82]">{body}</p></div>
          </div>)}
        </div>
      </section>

      <section className="rounded-[24px] border border-[#dce5f0] bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#175cd3]">Live settlement rail</div><h2 className="mt-3 text-2xl font-semibold text-[#10233f]">Powered by MagicBlock private settlement</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-[#5d6d82]">The experience stays simple at the surface while the payment corridor keeps a clear, verifiable record underneath.</p></div>
          <CheckCircle2 className="h-8 w-8 text-emerald-500" aria-hidden="true" />
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[[LockKeyhole, "Private by design"], [CheckCircle2, "Receipt-backed"], [Zap, "Agent-ready"]].map(([Icon, label]) => <div key={label as string} className="flex items-center gap-3 rounded-[14px] bg-[#f7f9fc] px-4 py-3 text-sm font-semibold text-[#425570]"><Icon className="h-4 w-4 text-[#175cd3]" />{label as string}</div>)}
        </div>
      </section>

      <MagicBlockPrivatePaymentsStatus />
    </OperationsShell>
  );
}
