import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { OperationsShell } from "@/components/operations-shell";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "PrivateDAO Pricing",
  description:
    "Clear PrivateDAO pricing for open Testnet access, fixed-scope pilots, managed organizational operations, and sovereign deployments.",
  path: "/pricing",
  keywords: ["PrivateDAO pricing", "DAO pilot pricing", "confidential governance pricing", "Solana organization infrastructure"],
});

const plans = [
  {
    name: "Open Testnet",
    price: "Free",
    summary: "For teams evaluating the product, developers inspecting the code, and communities testing the workflow.",
    includes: ["Public product access", "Solana Testnet execution", "Proof review", "Open-source inspection"],
    cta: "Try Testnet",
    href: "/try",
  },
  {
    name: "Fixed Pilot",
    price: "$2,500",
    cadence: "four weeks",
    summary: "For a DAO, grant committee, protocol team, or Web3 organization proving one sensitive workflow.",
    includes: ["One configured workflow", "One Testnet operating run", "Wallet onboarding", "Proof packet and success report"],
    cta: "Request a pilot",
    href: "mailto:Fahd.kotb@tuta.io?subject=PrivateDAO%20Fixed%20Pilot",
  },
  {
    name: "Managed Operations",
    price: "$750/month",
    cadence: "starting point",
    summary: "For teams repeating governance, payroll, payout, treasury, or proof workflows after a successful pilot.",
    includes: ["Hosted reads and telemetry", "Proof exports", "Operator support", "Monthly readiness review"],
    cta: "Discuss managed operations",
    href: "mailto:Fahd.kotb@tuta.io?subject=PrivateDAO%20Managed%20Operations",
  },
  {
    name: "Sovereign Deployment",
    price: "Custom",
    summary: "For organizations that need dedicated infrastructure, customer-cloud deployment, or custom controls.",
    includes: ["Dedicated deployment", "Custom retention policy", "White-label posture", "High-touch support scope"],
    cta: "Request a scope",
    href: "mailto:Fahd.kotb@tuta.io?subject=PrivateDAO%20Sovereign%20Deployment",
  },
] as const;

const pricingPrinciples = [
  "The first purchase is a bounded operational outcome, not an open-ended infrastructure promise.",
  "Open Testnet access remains available for ecosystem learning, inspection, and adoption.",
  "Teams pay when a workflow consumes real configuration, execution, review, or operator effort.",
  "Exact scope and deliverables are agreed before work begins.",
] as const;

export default function PricingPage() {
  return (
    <OperationsShell
      eyebrow="Pricing"
      title="Start with one workflow. Expand when it proves value."
      description="PrivateDAO pricing is designed around operational outcomes: a free evaluation path, a fixed-scope pilot, managed recurring operations, and sovereign deployments for organizations that need dedicated controls."
      navigationMode="guided"
      badges={[
        { label: "Free Testnet access", variant: "success" },
        { label: "Fixed pilot", variant: "cyan" },
        { label: "Managed operations", variant: "violet" },
      ]}
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => {
          const isExternal = plan.href.startsWith("mailto:");
          return (
            <article key={plan.name} className="flex h-full flex-col rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
              <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/68">{plan.name}</div>
              <div className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">{plan.price}</div>
              {"cadence" in plan ? <div className="mt-1 text-xs text-white/46">{plan.cadence}</div> : null}
              <p className="mt-4 text-sm leading-6 text-white/62">{plan.summary}</p>
              <div className="mt-5 grid gap-2">
                {plan.includes.map((item) => (
                  <div key={item} className="flex gap-2 text-sm leading-6 text-white/64">
                    <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-100" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-6">
                {isExternal ? (
                  <a href={plan.href} className={cn(buttonVariants({ size: "sm" }), "w-full")}>
                    {plan.cta}
                    <ArrowRight className="h-4 w-4" />
                  </a>
                ) : (
                  <Link href={plan.href} className={cn(buttonVariants({ size: "sm" }), "w-full")}>
                    {plan.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <section className="rounded-[28px] border border-emerald-300/16 bg-emerald-300/[0.06] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-emerald-100/76">Pricing principles</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Clear scope before commitment.</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {pricingPrinciples.map((item) => (
            <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-black/22 p-4">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-100" />
              <span className="text-sm leading-6 text-white/66">{item}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/business-model" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            View business model
          </Link>
          <Link href="/services/testnet-billing-rehearsal" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Try billing rehearsal
          </Link>
          <Link href="/documents/pricing-model" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Read detailed pricing model
          </Link>
        </div>
      </section>
    </OperationsShell>
  );
}
