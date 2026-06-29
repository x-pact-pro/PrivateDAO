import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { OperationsShell } from "@/components/operations-shell";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "Products",
  description:
    "PrivateDAO products: Proof Workflows, Private Governance, Treasury Coordination, Sealed Auctions, TxLINE Match Settlement, and Runtime/API Infrastructure.",
  path: "/products",
  keywords: ["PrivateDAO products", "proof workflows", "private governance", "treasury coordination", "sealed auctions", "TxLINE settlement", "runtime API"],
});

const products = [
  {
    title: "Proof Workflows",
    href: "/proof-workflows",
    cta: "Run Workflow Demo",
    purpose: "Prove a process happened correctly without exposing how it works.",
    useCases: ["underwriting", "credit-limit decisions", "compliance reviews", "grant reviews", "vendor onboarding", "internal approvals"],
  },
  {
    title: "Private Governance",
    href: "/govern",
    cta: "Create Private Room",
    purpose: "Run private rooms, votes, committees, and organizational decisions with verifiable outcomes.",
    useCases: ["committee voting", "private governance rooms", "grant committees", "board decisions", "DAO coordination", "community governance"],
  },
  {
    title: "Treasury Coordination",
    href: "/treasury",
    cta: "Create Treasury Request",
    purpose: "Coordinate treasury requests, approvals, treasury-token decisions, and audit trails.",
    useCases: ["spending requests", "multi-step approvals", "grant disbursements", "treasury committees", "audit records", "token coordination"],
  },
  {
    title: "Sealed Auctions",
    href: "/auctions",
    cta: "Run Auction Demo",
    purpose: "Run public or private-room auctions without exposing bidding intent during the auction.",
    useCases: ["grant allocation", "vendor bids", "GamingDAO rewards", "private rooms", "sealed commercial bidding", "proof after reveal"],
  },
  {
    title: "TxLINE Match Settlement",
    href: "/txline-settlement",
    cta: "Open Settlement Desk",
    purpose: "Settle World Cup prediction markets from official TxLINE fixture data with private policy proof and public receipts.",
    useCases: ["World Cup markets", "prediction settlement", "score validation", "hidden payout policy", "Solana receipts", "reviewer proof"],
  },
  {
    title: "Runtime/API Infrastructure",
    href: "/developers",
    cta: "Open API Docs",
    purpose: "Expose health, proof, receipt, and product APIs through the AWS read-node and public verification surfaces.",
    useCases: ["api.privatedao.org", "AWS read-node", "Supabase receipts", "QuickNode reads", "public health", "developer integration"],
  },
] as const;

export default function ProductsPage() {
  return (
    <OperationsShell
      eyebrow="Products"
      title="Private decisions. Verifiable outcomes."
      description="PrivateDAO now centers on six product lines: Proof Workflows, Private Governance, Treasury Coordination, Sealed Auctions, TxLINE Match Settlement, and Runtime/API Infrastructure. Advanced modules and integrations support these products instead of competing with them."
      navigationMode="guided"
      badges={[
        { label: "Commercial product lines", variant: "cyan" },
        { label: "Commercial pilots", variant: "success" },
        { label: "Audit-ready proof", variant: "violet" },
      ]}
    >
      <section className="grid gap-4 lg:grid-cols-3">
        {products.map((product) => (
          <article key={product.title} className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
            <h2 className="text-2xl font-semibold text-white">{product.title}</h2>
            <p className="mt-3 min-h-20 text-sm leading-7 text-white/64">{product.purpose}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {product.useCases.map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-black/24 px-3 py-1 text-xs text-white/58">
                  {item}
                </span>
              ))}
            </div>
            <Link href={product.href} className={cn(buttonVariants({ size: "sm" }), "mt-6")}>
              {product.cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </article>
        ))}
      </section>

      <section className="rounded-[28px] border border-cyan-300/16 bg-cyan-300/[0.06] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-cyan-100/76">Supporting infrastructure</div>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/64">
          Payroll, encrypted payments, Android, raw integrations, network pages, judge tools, and research reports remain
          available as Advanced Modules, Developer Infrastructure, Ecosystem Integrations, and evidence systems.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/services" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>Advanced</Link>
          <Link href="/documents" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>Docs</Link>
          <Link href="/pilots" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>Request Pilot</Link>
        </div>
      </section>
    </OperationsShell>
  );
}
