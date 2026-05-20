"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const technologyLanes = [
  { key: "cloak", label: "Private settlement", summary: "Confidential payroll and treasury settlement rails.", href: "/services/cloak-private-settlement" },
  { key: "umbra", label: "Private payout UX", summary: "Confidential payout-first operating lane.", href: "/services/umbra-confidential-payout" },
  { key: "goldrush", label: "Onchain intelligence", summary: "Structured wallet, stablecoin, and counterparty review.", href: "/intelligence" },
  { key: "covalent", label: "Covalent GoldRush", summary: "GoldRush wallet history and fallback-aware counterparty intelligence in the same review lane.", href: "/intelligence" },
  { key: "jupiter", label: "Treasury route preview", summary: "Quote-aware rebalance and payout-funding route checks.", href: "/services/jupiter-treasury-route" },
  { key: "zerion", label: "Bounded agent policy", summary: "Policy-scoped automation with wallet-safe controls.", href: "/services/zerion-agent-policy" },
  { key: "torque", label: "Growth event loop", summary: "Real custom events tied to real product actions.", href: "/services/torque-growth-loop" },
  { key: "audd", label: "AUDD treasury mode", summary: "AUD-denominated merchant and treasury settlement lane.", href: "/services/audd-stablecoin" },
  { key: "pusd", label: "PUSD treasury mode", summary: "Stable reserve, payroll, grants, and reward pool lane.", href: "/services/pusd-stablecoin" },
  { key: "eitherway", label: "Wallet-first UX", summary: "Live dApp user flow with clear wallet action boundaries.", href: "/services/eitherway-live-dapp" },
  { key: "consumer", label: "Consumer governance UX", summary: "Normal-user operation path across web and Android surfaces.", href: "/services/consumer-governance-ux" },
  { key: "magicblock", label: "Responsive execution", summary: "Challenge/login private payments and low-latency execution corridor.", href: "/services/magicblock-private-payments" },
  { key: "encrypt", label: "Encrypted ops layer", summary: "Confidential planning and policy-bound execution support.", href: "/services/encrypt-ika-operations" },
  { key: "refhe", label: "REFHE payroll proof", summary: "Encrypted payroll computation receipts with Ika custody readiness.", href: "/services/refhe-payroll-proof" },
  { key: "solrouter", label: "Encrypted AI lane", summary: "Deterministic governance intelligence with encrypted brief export.", href: "/services/solrouter-encrypted-ai" },
  { key: "rpc", label: "Runtime infrastructure", summary: "Fast reads, diagnostics, and reviewer-facing runtime evidence.", href: "/services/runtime-infrastructure" },
  { key: "proof", label: "Proof continuity", summary: "One verification surface for feature, receipt, and trust checks.", href: "/proof" },
  { key: "frontier", label: "Main Frontier closure", summary: "Unified integrated route across all shipped lanes.", href: "/services/main-frontier-closure" },
] as const;

export function TrackTechnologyGrid() {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,18,35,0.92),rgba(7,11,24,0.97))] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/70">Technology map</div>
          <h2 className="mt-2 text-2xl font-semibold text-white">What this product actually gives you</h2>
          <p className="mt-2 max-w-4xl text-sm leading-7 text-white/62">
            Pick any card and jump directly to its live route. This keeps the product simple for users and fast for reviewers.
          </p>
        </div>
        <Badge variant="cyan">18 active lanes</Badge>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {technologyLanes.map((lane) => (
          <div key={lane.key} className="rounded-[22px] border border-white/8 bg-black/20 p-4">
            <div className="text-base font-medium text-white">{lane.label}</div>
            <div className="mt-2 text-sm leading-6 text-white/60">{lane.summary}</div>
            <Link href={lane.href} className={cn(buttonVariants({ size: "sm", variant: "outline" }), "mt-4 w-full justify-between")}>
              Open lane
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
