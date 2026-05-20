import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ProjectOperatingMapProps = {
  title?: string;
  description?: string;
  compact?: boolean;
};

const platformLanes = [
  {
    title: "Governance",
    body: "Private proposals, selective disclosure, and signer-safe decision flow for organizations that cannot expose every internal coordination step.",
    href: "/govern",
  },
  {
    title: "Intelligence",
    body: "Covalent GoldRush, QVAC, SNS, Zerion, and SolRouter turn wallet data, treasury context, and proposal signals into review-grade operational context before approval.",
    href: "/intelligence",
  },
  {
    title: "Confidential payments",
    body: "Cloak, Umbra, and MagicBlock cover shielded settlement, recipient-private payouts, and high-frequency private payment execution.",
    href: "/services/confidential-payments",
  },
  {
    title: "Private payroll",
    body: "Encrypt, IKA, and REFHE keep payroll instructions encrypted before execution while preserving commitment-safe proof continuity.",
    href: "/services/encrypt-ika-operations",
  },
  {
    title: "Treasury rails",
    body: "Jupiter, stablecoin routes, and governed payout selection connect treasury planning with execution-ready movement on Solana.",
    href: "/services/jupiter-treasury-route",
  },
  {
    title: "Wallet-first execution",
    body: "Users still review, sign, and verify through a clean wallet-first path instead of being forced into opaque automation.",
    href: "/services/consumer-governance-ux",
  },
] as const;

const intelligenceFeeds = [
  "Governance receives proposal review, risk framing, and policy context before a signer approves.",
  "Payments receive counterparty review, settlement lane selection, and private rail clarity before funds move.",
  "Payroll receives encrypted operational preparation so payout metadata stays out of shared review surfaces.",
  "Treasury receives wallet history, stablecoin visibility, and route comparison before rebalance or disbursement.",
  "Wallet-first flows receive simpler user context so normal operators can act safely without losing technical truth.",
] as const;

export function ProjectOperatingMap({
  title = "One product surface, multiple operational lanes, one intelligence core",
  description = "PrivateDAO is structured as an operating layer: governance decides, intelligence explains, treasury routes prepare, confidential rails execute, payroll stays encrypted, and wallet-first flows keep users in control. This keeps the site coherent because every route plays a distinct role inside the same system.",
  compact = false,
}: ProjectOperatingMapProps) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
      <div className="text-[11px] uppercase tracking-[0.24em] text-white/42">Operating map</div>
      <h2 className={cn("mt-3 text-2xl font-semibold text-white", compact ? "text-xl" : "")}>{title}</h2>
      <p className="mt-3 max-w-5xl text-sm leading-7 text-white/66">{description}</p>

      <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {platformLanes.map((lane) => (
          <Link
            key={lane.title}
            href={lane.href}
            className="rounded-[22px] border border-white/8 bg-black/20 p-4 transition hover:border-cyan-200/30"
          >
            <div className="text-base font-medium text-white">{lane.title}</div>
            <div className="mt-2 text-sm leading-6 text-white/62">{lane.body}</div>
          </Link>
        ))}
      </div>

      <div className="mt-4 rounded-[22px] border border-emerald-300/16 bg-emerald-300/[0.07] p-4">
        <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-100/76">How intelligence feeds every lane</div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {intelligenceFeeds.map((item) => (
            <div key={item} className="rounded-2xl border border-white/8 bg-black/20 p-3 text-sm leading-6 text-white/64">
              {item}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/intelligence" className={cn(buttonVariants({ size: "sm" }))}>
            Open intelligence core
          </Link>
          <Link href="/services/confidential-payments" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Open payment rails
          </Link>
          <Link href="/proof" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Open proof continuity
          </Link>
        </div>
      </div>
    </section>
  );
}
