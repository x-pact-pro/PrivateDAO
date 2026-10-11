import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Mail } from "lucide-react";

import { OperationsShell } from "@/components/operations-shell";
import { buildRouteMetadata } from "@/lib/route-metadata";

export const metadata: Metadata = buildRouteMetadata({
  title: "PrivateDAO Investors",
  description: "PrivateDAO builds commercial privacy products for organizations that need trusted outcomes.",
  path: "/investors",
  keywords: ["PrivateDAO investors", "enterprise privacy", "confidential workflows", "verifiable outcomes"],
});

const market = [
  ["The customer", "Teams and institutions that handle payroll, treasury, approvals, bids, and records that should not be public."],
  ["The problem", "Existing tools often force a choice between private coordination and an outcome others can independently trust."],
  ["The opportunity", "A focused product layer that makes privacy useful to small teams, growing organizations, governments, and financial markets."],
] as const;

const portfolio = [
  ["Confidential Payroll", "Private payroll preparation, policy approval, settlement, and a shareable verified outcome."],
  ["Treasury and Governance", "Controlled spending and organizational decisions with clear authority and evidence."],
  ["Auctions and Verification", "Private bids, blind checks, and record receipts for commercial and operational workflows."],
  ["Agent Marketplace", "A machine-facing marketplace that extends the PrivateDAO ecosystem through bounded services and verifiable receipts."],
] as const;

export default function InvestorsPage() {
  return (
    <OperationsShell eyebrow="Investors" title="Private infrastructure for organizations that cannot afford exposed operations." description="PrivateDAO turns privacy into products: payroll, treasury, governance, auctions, and verification with clear commercial paths and outcomes others can trust." navigationMode="focused" badges={[{ label: "Enterprise-first", variant: "cyan" }, { label: "Product ecosystem", variant: "success" }, { label: "Evidence-led", variant: "violet" }]}>
      <section className="enterprise-dark-panel rounded-[24px] bg-[#10233f] p-6 text-white sm:p-9"><div className="max-w-4xl"><h2 className="text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">The value is not another wallet screen. The value is trusted private work.</h2><p className="mt-5 max-w-3xl text-base leading-8 text-[#d5e2f3]">PrivateDAO gives organizations a simple way to choose a sensitive workflow, set responsibility, complete the work, and share confidence without exposing everything behind the result.</p><a href="mailto:business@privatedao.org?subject=PrivateDAO%20Investor%20Conversation" className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#10233f]">Request an investor conversation <Mail className="h-4 w-4" /></a></div></section>
      <section className="grid gap-4 lg:grid-cols-3">{market.map(([title, body]) => <article key={title} className="enterprise-card rounded-[18px] p-5 sm:p-6"><div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#175cd3]">{title}</div><p className="mt-4 text-sm leading-7 text-[#5d6d82]">{body}</p></article>)}</section>
      <section className="space-y-6"><div><div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#175cd3]">Product portfolio</div><h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#10233f]">A small number of products built on one operating model.</h2></div><div className="grid gap-3 sm:grid-cols-2">{portfolio.map(([title, body]) => <article key={title} className="enterprise-card rounded-[18px] p-5"><div className="flex gap-3"><CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#175cd3]" /><div><h3 className="text-lg font-semibold text-[#10233f]">{title}</h3><p className="mt-2 text-sm leading-7 text-[#5d6d82]">{body}</p></div></div></article>)}</div></section>
      <section className="grid gap-8 border-y border-[#dce5f0] py-10 lg:grid-cols-[0.8fr_1.2fr]"><div><div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#175cd3]">Why this compounds</div><h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#10233f]">The products share policy, workflow, evidence, and distribution.</h2></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-[16px] bg-[#f7f9fc] p-5"><h3 className="font-semibold text-[#10233f]">Customer expansion</h3><p className="mt-2 text-sm leading-7 text-[#5d6d82]">A team can start with one workflow and expand into treasury, governance, and verification.</p></div><div className="rounded-[16px] bg-[#f7f9fc] p-5"><h3 className="font-semibold text-[#10233f]">Infrastructure leverage</h3><p className="mt-2 text-sm leading-7 text-[#5d6d82]">The customer sees one simple experience while the backend selects the appropriate provider and network.</p></div></div></section>
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-[#b9d8f2] bg-[#f1f8ff] p-6"><div><h2 className="text-xl font-semibold text-[#10233f]">Want the commercial materials?</h2><p className="mt-2 text-sm text-[#5d6d82]">Contact the founder for the current product and operating packet.</p></div><Link href="/contact" className="inline-flex items-center gap-2 rounded-full bg-[#175cd3] px-5 py-3 text-sm font-semibold text-white">Contact PrivateDAO <ArrowRight className="h-4 w-4" /></Link></section>
    </OperationsShell>
  );
}
