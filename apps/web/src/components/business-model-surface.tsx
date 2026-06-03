"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const revenueStreams = [
  {
    title: "Fixed pilot activation",
    summary:
      "A four-week paid pilot gives buyers a clear first purchase: configure one DAO workflow, run one privacy-sensitive operation, and leave with a proof packet and success report.",
  },
  {
    title: "Managed operating plans",
    summary:
      "Recurring revenue comes from hosted reads, operator support, proof exports, payroll and payout playbooks, telemetry, and readiness reviews for teams that keep using the workflow.",
  },
  {
    title: "Developer and sovereign deployments",
    summary:
      "API access, integration kits, white-label deployments, customer-cloud installs, and custom controls create the high-value route without forcing every buyer into the same plan.",
  },
] as const;

const buyerPath = [
  "Free Testnet product builds trust and developer adoption.",
  "Paid pilot proves one buyer workflow with founder-guided support.",
  "Managed plan monetizes repeated governance, payroll, payout, and proof operations.",
  "Sovereign deployment captures enterprise teams that need dedicated infrastructure and controls.",
] as const;

const internalModules = [
  {
    title: "Usability engine",
    summary:
      "Community feedback, wallet friction reduction, language clarity, and route simplification stay tied to the live product instead of a separate growth deck.",
  },
  {
    title: "Pricing watch",
    summary:
      "Keep pricing hypotheses visible, compare rails, and adjust entry points without changing the truth boundary around what is already live.",
  },
  {
    title: "Security and review automation",
    summary:
      "Coverage, fuzzing, runtime evidence, and review tooling support a stronger business posture because the service must remain auditable while it scales.",
  },
  {
    title: "Scalable service packaging",
    summary:
      "The same infrastructure must serve a normal user, a grant reviewer, a DAO operator, and later an institutional buyer without breaking the wallet-first flow.",
  },
] as const;

export function BusinessModelSurface() {
  return (
    <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 sm:p-7">
      <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-200/82">Business model</div>
      <h2 className="mt-3 max-w-4xl text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        Turn a live Testnet product into a sustainable infrastructure business
      </h2>
      <p className="mt-4 max-w-4xl text-sm leading-7 text-white/66">
        The commercial model stays simple and defensible: open-source adoption creates trust, a fixed pilot creates the
        first paid conversion, managed plans create recurring revenue, and sovereign deployments capture teams that need
        dedicated controls.
      </p>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        {revenueStreams.map((item) => (
          <div key={item.title} className="rounded-[24px] border border-white/8 bg-black/20 p-5">
            <div className="text-base font-semibold text-white">{item.title}</div>
            <div className="mt-3 text-sm leading-7 text-white/62">{item.summary}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-[24px] border border-cyan-300/16 bg-cyan-300/[0.08] p-5 text-sm leading-7 text-white/70">
        The current commercial proof rail is a <span className="font-semibold text-white">Testnet billing rehearsal</span>:
        a visitor with Testnet SOL can pay a small on-chain amount from the same wallet-first product, then inspect the
        signature and logs in the explorer. This connects business logic, wallet UX, and public payment evidence in one
        inspectable flow.
      </div>

      <div className="mt-6 rounded-[24px] border border-emerald-300/16 bg-emerald-300/[0.075] p-5">
        <div className="text-sm font-semibold text-white">Buyer conversion ladder</div>
        <div className="mt-4 grid gap-3 lg:grid-cols-4">
          {buyerPath.map((item, index) => (
            <div key={item} className="rounded-2xl border border-white/8 bg-black/18 p-4 text-sm leading-6 text-white/64">
              <div className="mb-2 text-[11px] uppercase tracking-[0.24em] text-emerald-200/76">Step {index + 1}</div>
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {internalModules.map((item) => (
          <div key={item.title} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
            <div className="text-base font-semibold text-white">{item.title}</div>
            <div className="mt-3 text-sm leading-7 text-white/60">{item.summary}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/services/testnet-billing-rehearsal" className={cn(buttonVariants({ size: "sm" }))}>
          Open Testnet billing rehearsal
        </Link>
        <Link href="/documents/pricing-model" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
          Open pricing model
        </Link>
        <Link href="/documents/service-catalog" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          Open service catalog
        </Link>
      </div>
    </section>
  );
}
