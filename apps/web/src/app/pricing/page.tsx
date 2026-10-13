import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { CommercialCheckout } from "@/components/commercial-checkout";
import { OperationsShell } from "@/components/operations-shell";
import { buttonVariants } from "@/components/ui/button";
import { commercialAddOns } from "@/lib/commercial-readiness";
import { blindPolicyVerificationPricing } from "@/lib/proof-workflows";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "Pricing",
  description:
    "Simple PrivateDAO pricing for proof workflows, private governance, treasury coordination, pilots, and enterprise deployments.",
  path: "/pricing",
  keywords: ["PrivateDAO pricing", "proof workflow pricing", "private governance pricing", "treasury workflow pricing"],
});

const plans = [
  {
    name: "Starter",
    price: "$1,000/month",
    note: "or start with a fixed pilot",
    summary: "For teams validating one proof workflow, private room, or treasury approval process.",
    includes: ["7-day trial", "1 organization", "3 active workflows or rooms", "250 proof events/month", "Basic verification pages", "Email support"],
    cta: "Request Pilot",
    href: "/pilots",
  },
  {
    name: "Business",
    price: "$3,500/month",
    note: "recommended for operating teams",
    summary: "For organizations running recurring workflows, governance rooms, approvals, and audit-ready verification.",
    includes: ["7-day trial", "10 active workflows or rooms", "5,000 proof events/month", "Proof Workflows", "Private Governance", "Treasury Coordination", "Intelligence add-on available"],
    cta: "Start Business Pilot",
    href: "/pilots",
  },
  {
    name: "Enterprise",
    price: "From $25,000/year",
    note: "private deployment or dedicated support",
    summary: "For dedicated deployments, custom integrations, compliance workflows, white-label, and higher capacity.",
    includes: ["Private deployment option", "Custom data connectors", "Custom proof packages", "SLA and support", "Security review support", "Organization-bound license"],
    cta: "Book Discovery Call",
    href: "mailto:fahd@privatedao.org?subject=PrivateDAO%20Enterprise%20Discovery",
  },
] as const;

const pilots = [
  ["Proof Workflows Pilot", "$2,500 fixed scope", "Credit, underwriting, compliance, vendor approval, or audit workflow."],
  ["Blind Policy Verification Pilot", "$10,000 setup + $3,500/month", "Groth16 policy proofs that prove a private policy was satisfied without exposing policy inputs."],
  ["Private Governance Pilot", "$5,000 fixed scope", "Private rooms, committee voting, DAO decisions, or foundation governance."],
  ["Treasury Coordination Pilot", "$7,500 fixed scope", "Treasury requests, approval paths, spending controls, and audit trails."],
] as const;

export default function PricingPage() {
  return (
    <OperationsShell
      eyebrow="Pricing"
      title="Simple pricing for private decisions and verifiable outcomes."
      description="Start with a focused pilot, then move into a monthly plan or private deployment when the workflow is proven."
      navigationMode="guided"
      badges={[]}
    >
      <section className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const external = plan.href.startsWith("mailto:");
          const cta = (
            <>
              {plan.cta}
              <ArrowRight className="h-4 w-4" />
            </>
          );
          return (
            <article key={plan.name} className="flex h-full flex-col rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
              <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/68">{plan.name}</div>
              <div className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white">{plan.price}</div>
              <div className="mt-1 text-xs text-white/46">{plan.note}</div>
              <p className="mt-4 text-sm leading-7 text-white/64">{plan.summary}</p>
              <div className="mt-5 grid gap-2">
                {plan.includes.map((item) => (
                  <div key={item} className="flex gap-2 text-sm leading-6 text-white/66">
                    <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-100" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-6">
                {external ? (
                  <a href={plan.href} className={cn(buttonVariants({ size: "sm" }), "w-full")}>{cta}</a>
                ) : (
                  <Link href={plan.href} className={cn(buttonVariants({ size: "sm" }), "w-full")}>{cta}</Link>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <section className="rounded-[28px] border border-emerald-300/16 bg-emerald-300/[0.06] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-emerald-100/76">Fixed-scope pilots</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">A clear first purchase path.</h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-4">
          {pilots.map(([title, price, body]) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-black/22 p-4">
              <div className="text-base font-semibold text-white">{title}</div>
              <div className="mt-2 text-sm font-semibold text-emerald-100">{price}</div>
              <p className="mt-2 text-sm leading-6 text-white/62">{body}</p>
            </div>
          ))}
        </div>
        <Link href="/pilots" className={cn(buttonVariants({ size: "sm" }), "mt-5")}>
          Request Pilot
        </Link>
      </section>

      <section className="rounded-[28px] border border-violet-300/16 bg-violet-300/[0.06] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-violet-100/76">Blind Policy Verification</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">ZK policy proofs as a focused paid product.</h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {blindPolicyVerificationPricing.map((plan) => (
            <div key={plan.plan} className="rounded-2xl border border-white/10 bg-black/22 p-4">
              <div className="text-base font-semibold text-white">{plan.plan}</div>
              <div className="mt-2 text-sm font-semibold text-violet-100">{plan.price}</div>
              <div className="mt-4 grid gap-2">
                {plan.includes.map((item) => (
                  <div key={item} className="text-sm leading-6 text-white/62">{item}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <Link href="/proof-workflows/blind-policy" className={cn(buttonVariants({ size: "sm" }), "mt-5")}>
          Open Blind Policy product
        </Link>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-white/44">Deployment options</div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/22 p-4">
            <h2 className="text-base font-semibold text-white">Cloud SaaS</h2>
            <p className="mt-2 text-sm leading-6 text-white/62">
              PrivateDAO hosts the product, verification pages, pilot workflows, and operational proof records.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/22 p-4">
            <h2 className="text-base font-semibold text-white">Private Deployment</h2>
            <p className="mt-2 text-sm leading-6 text-white/62">
              Annual license, setup fee, maintenance, support, and organization-bound activation for private environments.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-white/44">Add-ons and capacity</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Scale by intelligence, proof volume, deployment, and connectors.</h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-4">
          {commercialAddOns.map((addon) => (
            <div key={addon.label} className="rounded-2xl border border-white/10 bg-black/22 p-4">
              <div className="text-sm font-semibold text-white">{addon.label}</div>
              <div className="mt-2 text-sm font-semibold text-cyan-100">{addon.price}</div>
              <p className="mt-2 text-sm leading-6 text-white/60">{addon.summary}</p>
            </div>
          ))}
        </div>
      </section>

      <CommercialCheckout />

      <section className="rounded-[28px] border border-cyan-300/16 bg-cyan-300/[0.06] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-cyan-100/76">Commercial protection</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Paid modules are license-gated and tamper-evident.</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/64">
          PrivateDAO paid workspaces use signed organization-bound licenses, activation records, feature gates,
          server-side verification, usage limits, and audit logs. If a license is modified or cannot be verified, paid
          capabilities fail closed and require reactivation through official support.
        </p>
      </section>
    </OperationsShell>
  );
}
