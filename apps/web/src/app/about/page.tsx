import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, LockKeyhole, Network, ShieldCheck } from "lucide-react";

import { OperationsShell } from "@/components/operations-shell";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { companyLocation, contactEmails, founderName } from "@/lib/site-brand";

export const metadata: Metadata = buildRouteMetadata({
  title: "About PrivateDAO",
  description: "PrivateDAO is a software and Web3 infrastructure project for private organizational workflows and verifiable outcomes.",
  path: "/about",
  keywords: ["PrivateDAO", "Web3 infrastructure", "privacy software", "verifiable workflows"],
});

const products = [
  ["Confidential Payroll", "Prepare payroll workflows with private salary and deduction data, approvals, settlement options, and shareable verification.", LockKeyhole],
  ["Private Treasury", "Coordinate spending requests, budgets, approvals, and reviewable execution records.", ShieldCheck],
  ["Private Governance", "Run organizational decisions with configurable rooms, proposals, approvals, and outcome records.", Network],
  ["Private Auctions", "Support sealed commercial bids and verifiable outcomes for procurement and allocation workflows.", ShieldCheck],
  ["Blind and Record Verification", "Verify selected claims or records without publishing the underlying sensitive material.", LockKeyhole],
  ["Agent Marketplace", "Discover and connect to bounded software services through explicit capabilities and receipts.", Network],
] as const;

export default function AboutPage() {
  return (
    <OperationsShell
      eyebrow="About PrivateDAO"
      title="Private work should stay private. The outcome should still be trusted."
      description="PrivateDAO is a software and Web3 infrastructure project for organizations that need to coordinate sensitive work without turning every internal detail into public data."
      navigationMode="focused"
      badges={[{ label: "Software project", variant: "cyan" }, { label: "Web3 infrastructure", variant: "violet" }, { label: "Privacy and proof", variant: "success" }]}
    >
      <section className="enterprise-card rounded-[24px] p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div>
            <div className="commercial-eyebrow">What PrivateDAO is</div>
            <h2 className="mt-3 text-2xl font-semibold text-[#10233f] sm:text-3xl">A product ecosystem for private organizational work.</h2>
            <p className="mt-4 max-w-3xl text-base leading-8 text-[#5d6d82]">The project brings together workflow software, privacy-preserving execution paths, and verification surfaces. The technical infrastructure stays behind the experience so a team can focus on its work, its rules, and the result.</p>
          </div>
          <div className="rounded-2xl border border-[#dce5f0] bg-[#f7f9fc] p-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#175cd3]">Founder and owner</div>
            <div className="mt-3 text-xl font-semibold text-[#10233f]">{founderName}</div>
            <p className="mt-2 text-sm leading-6 text-[#5d6d82]">Founder and Owner of the PrivateDAO project.</p>
            <p className="mt-2 text-sm font-medium text-[#5d6d82]">{companyLocation}</p>
            <a className="mt-4 inline-flex text-sm font-semibold text-[#175cd3]" href={`mailto:${contactEmails.business}`}>{contactEmails.business} <ArrowRight className="ml-2 h-4 w-4" /></a>
          </div>
        </div>
      </section>

      <section>
        <div className="commercial-eyebrow">Real product surfaces</div>
        <h2 className="mt-3 text-2xl font-semibold text-[#10233f] sm:text-3xl">Products built around privacy, control, and proof.</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map(([title, body, Icon]) => (
            <article key={title} className="enterprise-card rounded-[20px] p-5">
              <Icon className="h-5 w-5 text-[#175cd3]" aria-hidden="true" />
              <h3 className="mt-4 text-base font-semibold text-[#10233f]">{title}</h3>
              <p className="mt-2 text-sm leading-7 text-[#5d6d82]">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="enterprise-card rounded-[24px] p-6 sm:p-8">
        <div className="commercial-eyebrow">How to explore</div>
        <h2 className="mt-3 text-2xl font-semibold text-[#10233f]">Start with the workflow, not the protocol.</h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-[#5d6d82]">Organizations can begin with a product, define the people and rules involved, run the workflow, and share the outcome that others need to verify. Developers and reviewers can then inspect the supporting infrastructure and evidence.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/products" className="inline-flex items-center gap-2 rounded-full bg-[#175cd3] px-5 py-3 text-sm font-semibold text-white">Explore products <ArrowRight className="h-4 w-4" /></Link>
          <Link href="/contact" className="inline-flex items-center gap-2 rounded-full border border-[#c8d7e8] px-5 py-3 text-sm font-semibold text-[#175cd3]">Contact PrivateDAO</Link>
        </div>
      </section>
    </OperationsShell>
  );
}
