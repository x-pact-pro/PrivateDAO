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
    title: "Coordination core",
    body: "DAO creation, proposal preparation, commit/reveal voting, wallet authorization, PDAO governance-token context, and immediate Testnet proof.",
    href: "/govern",
  },
  {
    title: "Encryption payment lane",
    body: "Cloak, Umbra, MagicBlock, and stablecoin billing stay grouped as one private money-movement corridor instead of scattered payment pages.",
    href: "/services/confidential-payments",
  },
  {
    title: "Confidential operations",
    body: "Encrypt, Ika, REFHE, and 2PC-MPC preparation keep payroll instructions private while preserving receipt and proof continuity.",
    href: "/services/encrypt-ika-operations",
  },
  {
    title: "Treasury rails",
    body: "Jupiter route preview, PUSD/AUDD activation paths, policy checks, and wallet signatures connect treasury planning to Testnet execution.",
    href: "/services/jupiter-treasury-route",
  },
  {
    title: "Intelligence before authorization",
    body: "QVAC, GoldRush/Covalent, SNS, Zerion, QuickNode, and policy context explain risk before a normal user or agent approves.",
    href: "/intelligence",
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
  title = "Private processes. Verifiable outcomes.",
  description = "Your votes, salaries, treasury activity, and internal operations should not be exposed by default. PrivateDAO turns that pain into six executable lanes: private governance, encrypted treasury coordination, private payments, confidential payroll, intelligence, and agent execution lineage. Wallet-first UX keeps the signer in control, and proof records what happened.",
  compact = false,
}: ProjectOperatingMapProps) {
  return (
    <section className="min-w-0 max-w-full overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] p-4 sm:rounded-[28px] sm:p-5">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/42 sm:tracking-[0.24em]">Operating map</div>
      <h2 className={cn("mt-3 text-2xl font-semibold text-white", compact ? "text-xl" : "")}>{title}</h2>
      <p className="mt-3 max-w-5xl text-sm leading-7 text-white/66 [overflow-wrap:anywhere]">{description}</p>

      <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-[repeat(2,minmax(0,1fr))] xl:grid-cols-[repeat(3,minmax(0,1fr))]">
        {platformLanes.map((lane) => (
          <Link
            key={lane.title}
            href={lane.href}
            className="min-w-0 rounded-[20px] border border-white/8 bg-black/20 p-4 transition hover:border-cyan-200/30 sm:rounded-[22px]"
          >
            <div className="text-base font-medium text-white [overflow-wrap:anywhere]">{lane.title}</div>
            <div className="mt-2 text-sm leading-6 text-white/62 [overflow-wrap:anywhere]">{lane.body}</div>
          </Link>
        ))}
      </div>

      <div className="mt-4 min-w-0 rounded-[20px] border border-emerald-300/16 bg-emerald-300/[0.07] p-4 sm:rounded-[22px]">
        <div className="text-[11px] uppercase tracking-[0.16em] text-emerald-100/76 sm:tracking-[0.24em]">How intelligence feeds every lane</div>
        <div className="mt-3 grid min-w-0 gap-3 md:grid-cols-[repeat(2,minmax(0,1fr))] xl:grid-cols-[repeat(5,minmax(0,1fr))]">
          {intelligenceFeeds.map((item) => (
            <div key={item} className="min-w-0 rounded-2xl border border-white/8 bg-black/20 p-3 text-sm leading-6 text-white/64 [overflow-wrap:anywhere]">
              {item}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/intelligence" className={cn(buttonVariants({ size: "sm" }))}>
            Open intelligence core
          </Link>
          <Link href="/govern" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Start governance
          </Link>
          <Link href="/proof" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Open proof continuity
          </Link>
        </div>
      </div>
    </section>
  );
}
