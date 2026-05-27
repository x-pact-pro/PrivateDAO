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
    title: "Private governance",
    body: "DAO creation, proposal preparation, commit/reveal voting, wallet execution, PDAO governance-token context, and immediate Testnet proof.",
    href: "/govern",
  },
  {
    title: "Encrypted payments",
    body: "Cloak, Umbra, MagicBlock, and stablecoin billing stay grouped as one private money-movement corridor instead of scattered payment pages.",
    href: "/services/confidential-payments",
  },
  {
    title: "Confidential payroll",
    body: "Encrypt, Ika, REFHE, and 2PC-MPC preparation keep payroll instructions private while preserving receipt and proof continuity.",
    href: "/services/encrypt-ika-operations",
  },
  {
    title: "Treasury rails",
    body: "Jupiter route preview, PUSD/AUDD activation paths, policy checks, and wallet signatures connect treasury planning to Testnet execution.",
    href: "/services/jupiter-treasury-route",
  },
  {
    title: "GamingDAO and community rewards",
    body: "Tournament, community, and competition reward operations use the same governance, private payout, and proof rails.",
    href: "/gaming",
  },
  {
    title: "Intelligence before signing",
    body: "QVAC, GoldRush/Covalent, SNS, Zerion, QuickNode, and policy context explain risk before a normal user approves.",
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
  title = "One product surface, four corridors, one proof-backed operating path",
  description = "PrivateDAO is structured around private on-chain governance first. Governance decides, intelligence explains, treasury and private payout rails prepare execution, wallet-first UX keeps the signer in control, and proof records what happened. Integrations are provider rails inside this path, not separate products competing for attention.",
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
