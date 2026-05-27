import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const executionCommands = [
  {
    label: "Governance treasury",
    action: "Move from governance token intent to treasury policy, private intent, wallet approval, and Anchor 1.0.1 proof.",
    runHref: "/govern",
    verifyHref: "/documents/anchor-1-migration-evidence-2026-04-30",
    proof: "Governance token + treasury + Anchor 1.0.1",
  },
  {
    label: "Intelligence",
    action: "Review wallet, proposal, RPC, provider context, and QVAC local-first risk before signing.",
    runHref: "/intelligence",
    verifyHref: "https://api.privatedao.org/api/v1/provider-integrations/status",
    proof: "GoldRush, Zerion, QuickNode provider status",
  },
  {
    label: "QVAC",
    action: "Run local-first sensitive decision intelligence before any treasury or governance signature.",
    runHref: "/services/qvac-sovereign-ai",
    verifyHref: "https://api.privatedao.org/api/v1/qvac/runtime-proof",
    proof: "QVAC runtime proof + local-first boundary",
  },
  {
    label: "Privacy claims",
    action: "Generate a visitor-repeatable encrypted claim and prepare a Solana Testnet memo.",
    runHref: "/services?claim=private-payments#privacy-claim-console",
    verifyHref: "https://api.privatedao.org/api/v1/privacy-execution-claims",
    proof: "AES-GCM packet + Testnet memo commitment",
  },
  {
    label: "Encrypt / Ika",
    action: "Open REFHE receipts, Ika Solana final approval, and custody preparation.",
    runHref: "/services/encrypt-ika-operations",
    verifyHref: "https://api.privatedao.org/api/v1/ika/solana-prealpha/final-approval",
    proof: "Ika Solana final approval signature",
  },
  {
    label: "Execute",
    action: "Run wallet-first payroll, settlement, treasury, or reward operations.",
    runHref: "/execute",
    verifyHref: "/proof",
    proof: "Wallet signature, receipt, proof route",
  },
  {
    label: "Growth + stablecoin",
    action: "Use Torque, Jupiter, Zerion, Supabase receipts, and PUSD-ready rails.",
    runHref: "/services",
    verifyHref: "https://api.privatedao.org/api/v1/readiness",
    proof: "AWS read-node + Supabase counters",
  },
] as const;

export function ExecutionCommandSurface({ compact = false }: { compact?: boolean }) {
  return (
    <section className="rounded-[30px] border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(20,241,149,0.07),rgba(8,13,28,0.96))] p-6">
      <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/78">Execution command surface</div>
      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="max-w-4xl text-2xl font-semibold tracking-[-0.03em] text-white">
            Every major route must lead to review, execution, or verification
          </h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-white/66">
            PrivateDAO is organized as an operating path: intelligence reviews the action, privacy rails prepare the
            protected packet, the user signs from the wallet, and proof routes expose the receipt or blockchain evidence.
            The normal user should not need code or a terminal; the interface carries governance, treasury, private
            intent, encrypted claims, wallet-first signing, and verification as one browser flow.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/execute" className={cn(buttonVariants({ size: "sm" }))}>
            Open execute
          </Link>
          <Link href="/proof" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Verify proof
          </Link>
        </div>
      </div>
      <div className={cn("mt-5 grid gap-3", compact ? "md:grid-cols-2 xl:grid-cols-5" : "md:grid-cols-2 xl:grid-cols-5")}>
        {executionCommands.map((command) => (
          <div key={command.label} className="rounded-[22px] border border-white/10 bg-black/22 p-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-100/64">{command.label}</div>
            <p className="mt-3 text-sm leading-6 text-white/68">{command.action}</p>
            <div className="mt-3 text-xs leading-5 text-white/46">{command.proof}</div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={command.runHref} className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
                Run
              </Link>
              <Link href={command.verifyHref} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                Verify
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
