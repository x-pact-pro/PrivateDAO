import Link from "next/link";
import { ArrowUpRight, BrainCircuit, Gamepad2, Gavel, LockKeyhole, ReceiptText, ShieldCheck, WalletCards } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const capabilityLanes = [
  {
    icon: Gavel,
    title: "1. Private on-chain governance",
    body: "Create a DAO, prepare a proposal, commit, reveal, execute, inspect PDAO governance-token context, and verify the action on Solana Testnet.",
    href: "/govern",
  },
  {
    icon: ShieldCheck,
    title: "2. Treasury and private money movement",
    body: "Run encrypted payments, confidential payroll, stablecoin billing, Jupiter treasury routing, and receipt-backed settlement from one execution path.",
    href: "/execute",
  },
  {
    icon: Gamepad2,
    title: "3. Communities, competitions, and GamingDAO",
    body: "Use the same governance and treasury rails for communities, prize pools, tournaments, rewards, and reviewer-visible competition flows.",
    href: "/gaming",
  },
  {
    icon: BrainCircuit,
    title: "4. Intelligence before every signature",
    body: "Use QVAC, GoldRush/Covalent, SNS, Zerion, QuickNode status, and policy context before approving governance or treasury operations.",
    href: "/intelligence",
  },
  {
    icon: ReceiptText,
    title: "Proof and judge route",
    body: "Open live API evidence, explorer signatures, ZK/Groth16 proof packets, Token-2022/PDAO context, and repository evidence from one route.",
    href: "/judge",
  },
  {
    icon: LockKeyhole,
    title: "Encrypted provider stack",
    body: "Ika, Encrypt, REFHE, 2PC-MPC, MagicBlock, Umbra, Cloak, Torque, Zerion, and GoldRush are provider rails inside the four product corridors.",
    href: "/services",
  },
  {
    icon: WalletCards,
    title: "Wallet-first web + Android",
    body: "Start from a browser or APK, connect a Testnet wallet, sign, verify, and keep normal users away from terminal-only operations.",
    href: "/start",
  },
] as const;

export function ProductCommandCenter({ compact = false }: { compact?: boolean }) {
  return (
    <section className="rounded-[32px] border border-cyan-300/16 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.15),transparent_34%),radial-gradient(circle_at_92%_8%,rgba(20,241,149,0.13),transparent_30%),linear-gradient(180deg,rgba(7,12,24,0.96),rgba(4,7,16,0.98))] p-5 shadow-[0_26px_90px_rgba(0,0,0,0.30)] md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-100/78">One product operating layer</div>
          <h2 className="mt-3 max-w-4xl text-2xl font-semibold tracking-[-0.035em] text-white md:text-3xl">
            PrivateDAO is an on-chain private governance system, not a crowded integration directory.
          </h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-white/64">
            The product path is simple: a normal visitor connects a Solana Testnet wallet, reviews a governance or treasury
            action, prepares the private operation, signs from the wallet, and verifies the receipt on-chain, through the API,
            or in reviewer documents. Provider integrations only stay visible when they make that path easier to run or verify.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/start" className={cn(buttonVariants({ size: "sm" }))}>
            Start product
          </Link>
          <Link href="/judge" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Judge evidence
          </Link>
          <Link href="/pricing" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Business model
          </Link>
        </div>
      </div>

      <div className={cn("mt-5 grid gap-3", compact ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2 xl:grid-cols-4")}>
        {capabilityLanes.map((lane) => {
          const Icon = lane.icon;
          return (
            <Link key={lane.title} href={lane.href} className="group rounded-[24px] border border-white/9 bg-black/22 p-4 transition hover:-translate-y-0.5 hover:border-cyan-300/26 hover:bg-black/30">
              <div className="flex items-center justify-between gap-3">
                <div className="rounded-2xl border border-cyan-300/16 bg-cyan-300/[0.09] p-2.5 text-cyan-100">
                  <Icon className="h-4 w-4" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-white/32 transition group-hover:text-cyan-100" />
              </div>
              <div className="mt-3 text-base font-semibold text-white">{lane.title}</div>
              <p className="mt-2 text-sm leading-6 text-white/58">{lane.body}</p>
            </Link>
          );
        })}
      </div>

      {!compact ? (
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {[
            ["Live evidence", "Explorer signatures, API receipts, ZK/Groth16 proof, Squads timelock, PDAO/Token-2022 context", "/judge"],
            ["Trust and security", "Custody gates, remediation, audit packets, monitoring surfaces", "/security"],
            ["Learn by doing", "Short lessons that open the matching live product route", "/learn"],
            ["Colosseum entry", "Three-minute purpose, demo video, test paths, repo, proof, and route inventory", "/judge"],
          ].map(([title, detail, href]) => (
            <Link key={title} href={href} className="rounded-2xl border border-white/8 bg-white/[0.045] p-4 transition hover:border-emerald-300/20 hover:bg-white/[0.065]">
              <div className="text-sm font-semibold text-white">{title}</div>
              <p className="mt-2 text-xs leading-5 text-white/54">{detail}</p>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
