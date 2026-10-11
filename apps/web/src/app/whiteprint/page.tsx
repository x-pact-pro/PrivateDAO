import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownToLine, ArrowRight, CheckCircle2 } from "lucide-react";

import { OperationsShell } from "@/components/operations-shell";
import { buildRouteMetadata } from "@/lib/route-metadata";

export const metadata: Metadata = buildRouteMetadata({
  title: "PrivateDAO Whitepaper",
  description: "The PrivateDAO thesis, product model, and operating principles for private work with trusted outcomes.",
  path: "/whitepaper",
  keywords: ["PrivateDAO whitepaper", "confidential workflows", "verifiable outcomes", "privacy infrastructure"],
});

const principles = [
  ["Privacy first", "Sensitive operational details stay with the organization that owns them."],
  ["Clear responsibility", "Policies define who can prepare, review, approve, and execute each workflow."],
  ["Trusted outcomes", "Organizations can share the evidence needed to confirm a result without publishing the source."],
  ["Practical integration", "Wallets, networks, and providers are selected behind the workflow when execution requires them."],
] as const;

const products = [
  ["Private operations", "Payroll, treasury coordination, and governance for organizations handling sensitive work."],
  ["Private transactions", "Auctions and settlement workflows that protect commercial intent until the right moment."],
  ["Verification", "Blind and record verification that turns private work into evidence others can trust."],
  ["Ecosystem products", "Agent services and verified integrations extend the same ideas to software and organizational audiences."],
] as const;

const workflow = ["Choose a solution", "Set policies and access", "Run the workflow", "Approve when ready", "Share the outcome"] as const;

const adoption = [
  ["Business first", "A company can use PrivateDAO for sensitive work without changing its identity, operating model, or customer-facing language."],
  ["Web3 when useful", "Organizations that provide data, payments, or services to Web3 teams can add verifiable capability without forcing every user to understand the underlying stack."],
  ["Investment-ready focus", "The commercial opportunity is the workflow layer: repeatable products, enterprise delivery, integrations, and expansion across organizations inside and outside Web3."],
] as const;

export default function WhitepaperPage() {
  return (
    <OperationsShell eyebrow="Whitepaper" title="Private work should still produce trusted outcomes." description="PrivateDAO is a product ecosystem for organizations that need confidentiality, control, and evidence in the same workflow." navigationMode="focused" badges={[{ label: "Commercial thesis", variant: "cyan" }, { label: "Product-led", variant: "success" }, { label: "Evidence-oriented", variant: "violet" }]}>
      <section className="enterprise-card rounded-[24px] p-6 sm:p-8"><div className="flex flex-wrap gap-3"><a href="/assets/private-dao-founder-whiteprint.md" download className="inline-flex items-center gap-2 rounded-full bg-[#175cd3] px-5 py-3 text-sm font-semibold text-white"><ArrowDownToLine className="h-4 w-4" /> Download whitepaper</a><Link href="/products" className="inline-flex items-center gap-2 rounded-full border border-[#dce5f0] px-5 py-3 text-sm font-semibold text-[#10233f]">Explore solutions <ArrowRight className="h-4 w-4 text-[#175cd3]" /></Link></div><p className="mt-7 max-w-4xl text-lg leading-8 text-[#5d6d82]">Organizations should not have to choose between keeping sensitive work private and giving partners, auditors, boards, or communities a result they can trust.</p></section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{principles.map(([title, body]) => <article key={title} className="enterprise-card rounded-[18px] p-5"><CheckCircle2 className="h-5 w-5 text-[#175cd3]" /><h2 className="mt-4 text-lg font-semibold text-[#10233f]">{title}</h2><p className="mt-2 text-sm leading-7 text-[#5d6d82]">{body}</p></article>)}</section>
      <section className="grid gap-8 border-y border-[#dce5f0] py-10 lg:grid-cols-[0.75fr_1.25fr]"><div><div className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#175cd3]">The product model</div><h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#10233f]">Sell the outcome. Keep the infrastructure behind it.</h2></div><div className="grid gap-3 sm:grid-cols-2">{products.map(([title, body]) => <article key={title} className="rounded-[16px] border border-[#dce5f0] bg-[#f7f9fc] p-5"><h3 className="font-semibold text-[#10233f]">{title}</h3><p className="mt-2 text-sm leading-7 text-[#5d6d82]">{body}</p></article>)}</div></section>
      <section className="grid gap-8 lg:grid-cols-2"><div><div className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#175cd3]">One operating flow</div><h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#10233f]">From private input to a result others can rely on.</h2><p className="mt-4 text-base leading-8 text-[#5d6d82]">The customer chooses the work. PrivateDAO coordinates the policy, approvals, execution path, and evidence. A wallet or network appears only when the operation requires a signature or settlement.</p></div><div className="grid gap-3 sm:grid-cols-2">{workflow.map((item, index) => <div key={item} className="flex gap-3 rounded-[16px] border border-[#dce5f0] bg-[#f7f9fc] p-4"><span className="text-sm font-bold text-[#175cd3]">0{index + 1}</span><span className="text-sm font-semibold text-[#10233f]">{item}</span></div>)}</div></section>
      <section className="enterprise-card rounded-[24px] p-6 sm:p-8"><div className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#175cd3]">Adoption and market</div><h2 className="mt-3 max-w-4xl text-2xl font-semibold tracking-[-0.03em] text-[#10233f] sm:text-4xl">Web3 capability without a Web3-only customer.</h2><p className="mt-4 max-w-4xl text-base leading-8 text-[#5d6d82]">PrivateDAO is designed for organizations inside Web3 and for established businesses that simply need better privacy and proof. The workflow remains familiar; the infrastructure becomes available when it is useful.</p><div className="mt-7 grid gap-3 md:grid-cols-3">{adoption.map(([title, body]) => <article key={title} className="rounded-[16px] border border-[#dce5f0] bg-[#f7f9fc] p-5"><h3 className="font-semibold text-[#10233f]">{title}</h3><p className="mt-2 text-sm leading-7 text-[#5d6d82]">{body}</p></article>)}</div></section>
      <details className="enterprise-advanced-details rounded-[18px] border border-[#dce5f0] bg-[#f7f9fc] p-5"><summary className="cursor-pointer text-sm font-semibold text-[#10233f]">Architecture and delivery principles</summary><div className="mt-5 grid gap-3 text-sm leading-7 text-[#5d6d82] sm:grid-cols-2"><p>Products use shared policy, authorization, receipt, verification, and network-provider boundaries.</p><p>Each integration is presented only when it is genuinely available for the selected workflow and environment.</p><p>Client interfaces do not serve as the source of truth for approvals, settlement, or economically meaningful records.</p><p>Technical claims remain separated from commercial messaging and are documented for implementers and reviewers.</p></div></details>
      <section className="enterprise-dark-panel rounded-[20px] bg-[#10233f] p-6 text-white sm:p-8"><h2 className="text-2xl font-semibold">Build a private workflow around your organization.</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-[#d5e2f3]">Start with the process that needs confidentiality and accountability most.</p><Link href="/contact" className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#10233f]">Talk to PrivateDAO <ArrowRight className="h-4 w-4" /></Link></section>
    </OperationsShell>
  );
}
