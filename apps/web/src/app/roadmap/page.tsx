import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bot, CheckCircle2 } from "lucide-react";

import { OperationsShell } from "@/components/operations-shell";
import { buildRouteMetadata } from "@/lib/route-metadata";

export const metadata: Metadata = buildRouteMetadata({
  title: "PrivateDAO Roadmap",
  description: "The PrivateDAO roadmap across commercial workflows and agents.",
  path: "/roadmap",
  keywords: ["PrivateDAO roadmap", "Agent Marketplace", "commercial privacy products"],
});

const phases = [
  ["Now — prove the commercial core", "Make payroll, treasury, governance, auctions, and verification easy to buy, easy to try, and easy to explain to a non-technical organization."],
  ["Next — grow beyond Web3", "Turn successful workflows into repeatable enterprise packages, partnerships, integrations, and services for data custodians, financial teams, institutions, and Web3 operators."],
  ["Scale — fund the category", "Build an investment path through strategic partners, enterprise revenue, Web3 ecosystem capital, and non-Web3 institutional capital, while keeping product claims tied to real delivery."],
  ["Ecosystem — extend the trust model", "Expand Agent Marketplace and verified integration surfaces as ecosystem products that bring new users, use cases, and distribution back to the PrivateDAO thesis."],
] as const;

export default function RoadmapPage() {
  return (
    <OperationsShell eyebrow="Roadmap" title="A focused path from private work to a broader ecosystem." description="PrivateDAO grows by strengthening the products customers can use today, then extending the same operating model to agents and verified integrations." navigationMode="focused" badges={[{ label: "Product-led", variant: "cyan" }, { label: "Evidence-first", variant: "success" }, { label: "Expandable", variant: "violet" }] }>
      <section className="grid gap-4 lg:grid-cols-4">{phases.map(([title, body], index) => <article key={title} className="enterprise-card rounded-[18px] p-5 sm:p-6"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#edf4ff] text-sm font-bold text-[#175cd3]">0{index + 1}</span><h2 className="text-xl font-semibold text-[#10233f]">{title}</h2></div><p className="mt-5 text-sm leading-7 text-[#5d6d82]">{body}</p></article>)}</section>
      <section className="grid gap-4 sm:grid-cols-2"><Link href="/agents" className="enterprise-card group rounded-[20px] p-6 transition hover:-translate-y-0.5 hover:border-[#175cd3]"><Bot className="h-6 w-6 text-[#175cd3]" /><h2 className="mt-4 text-2xl font-semibold text-[#10233f]">Agent Marketplace</h2><p className="mt-3 text-sm leading-7 text-[#5d6d82]">Discover specialized services, run bounded jobs, and receive a clear result through a machine-ready PrivateDAO surface.</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#175cd3]">Explore Agents <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span></Link><Link href="/developers" className="enterprise-card group rounded-[20px] p-6 transition hover:-translate-y-0.5 hover:border-[#175cd3]"><CheckCircle2 className="h-6 w-6 text-[#175cd3]" /><h2 className="mt-4 text-2xl font-semibold text-[#10233f]">Build with evidence</h2><p className="mt-3 text-sm leading-7 text-[#5d6d82]">Connect verified integration surfaces and build workflows that preserve privacy and proof.</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#175cd3]">Open developer resources <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span></Link></section>
      <section className="rounded-[20px] border border-[#dce5f0] bg-[#f7f9fc] p-6"><div className="flex gap-3"><CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#175cd3]" /><div><h2 className="text-xl font-semibold text-[#10233f]">The rule for every phase</h2><p className="mt-2 text-sm leading-7 text-[#5d6d82]">New infrastructure is added only when it improves a real customer workflow. The public experience stays commercial; technical details remain available to builders and reviewers where needed.</p></div></div></section>
    </OperationsShell>
  );
}
