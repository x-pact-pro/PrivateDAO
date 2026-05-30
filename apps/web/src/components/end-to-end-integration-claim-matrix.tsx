import Link from "next/link";
import { ArrowUpRight, BrainCircuit, CheckCircle2, KeyRound, LockKeyhole, ReceiptText, Route, ShieldCheck, Zap } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const integrationRows = [
  {
    rail: "Governance + ZK",
    pain: "Strategic votes become public before the organization is ready.",
    treatment: "Commit/reveal governance, local Groth16 proof artifacts, and standalone Testnet verifier receipts turn private voting into a verifiable workflow.",
    proof: "Create DAO, create proposal, commit, reveal, finalize, execute, then open Solscan and proof.",
    route: "/govern",
    api: "/documents/zk-capability-matrix",
    icon: ShieldCheck,
  },
  {
    rail: "REFHE / Encrypt Payroll",
    pain: "Salary rows, bonus reasons, and payroll strategy leak when teams operate from public wallets and spreadsheets.",
    treatment: "Encrypted payroll manifests, REFHE envelope settlement, and wallet-signed payout rehearsal bind private payroll context to public-safe proof.",
    proof: "Encrypt payroll payload, anchor a confidential-payroll claim, run payout rehearsal, export proof.",
    route: "/payroll?claim=confidential-payroll#privacy-claim-console",
    api: "/viewer/refhe-security-model",
    icon: LockKeyhole,
  },
  {
    rail: "MagicBlock Private Payments",
    pain: "Reward and payout corridors expose timing, recipients, and operational intent.",
    treatment: "MagicBlock corridor receipts and visitor-signed encrypted claims make private payments testable while preserving a visible execution trail.",
    proof: "Open the private payments service, anchor a claim, and inspect corridor evidence.",
    route: "/services/magicblock-private-payments",
    api: "/services/magicblock-private-payments",
    icon: Zap,
  },
  {
    rail: "Umbra / Cloak Settlement",
    pain: "Vendor and contributor payments reveal counterparties before the organization wants disclosure.",
    treatment: "Recipient-private settlement intent, rail health, and selective-disclosure receipts keep the operation private but reviewable.",
    proof: "Prepare settlement intent, forward through the rail, anchor the encrypted claim, verify receipt.",
    route: "/execute#vendor-payment",
    api: "/services/umbra-confidential-payout",
    icon: ReceiptText,
  },
  {
    rail: "Ika / 2PC-MPC Custody",
    pain: "Treasury operations need stronger signing control than a single hot-wallet action.",
    treatment: "Ika readiness, Solana pre-alpha final approval, and custody preparation expose the threshold-signing path as an execution rail.",
    proof: "Open Encrypt/Ika operations, inspect readiness, prepare custody, anchor an Ika claim.",
    route: "/services/encrypt-ika-operations",
    api: "https://api.privatedao.org/api/v1/ika/solana-prealpha/final-approval",
    icon: KeyRound,
  },
  {
    rail: "Jupiter + Torque Treasury",
    pain: "Treasury moves lose context when routing, approval, and growth/accounting events live in separate tools.",
    treatment: "Jupiter route review and Torque event delivery connect treasury execution with operational telemetry.",
    proof: "Preview the route, run the claim or event lane, then inspect provider status.",
    route: "/services/jupiter-treasury-route",
    api: "https://api.privatedao.org/api/v1/provider-integrations/status",
    icon: Route,
  },
  {
    rail: "QVAC + GoldRush Intelligence",
    pain: "Signers approve proposals without enough risk, history, counterparty, or treasury context.",
    treatment: "QVAC local reasoning plus GoldRush/Covalent, Zerion, QuickNode, and provider status create the pre-sign intelligence gate.",
    proof: "Open Intelligence, review Operational Gravity, then continue to Execute.",
    route: "/intelligence",
    api: "https://api.privatedao.org/api/v1/provider-integrations/status",
    icon: BrainCircuit,
  },
] as const;

export function EndToEndIntegrationClaimMatrix() {
  return (
    <section className="rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_12%_0%,rgba(20,241,149,0.16),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(0,194,255,0.14),transparent_30%),linear-gradient(180deg,rgba(7,14,27,0.96),rgba(4,7,16,0.98))] p-5 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-emerald-300/22 bg-emerald-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-emerald-100">
          End-to-end Testnet claim matrix
        </span>
        <span className="rounded-full border border-cyan-300/18 bg-cyan-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-cyan-100">
          Pain → Treatment → Proof
        </span>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[0.86fr_1.14fr] xl:items-start">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white md:text-3xl">
            Every integration has a job in the operating flow
          </h2>
          <p className="mt-3 text-sm leading-7 text-white/66">
            Organizations need privacy because payroll, votes, vendors, treasury routes, and internal operations leak by
            default. Blockchains need verifiability because trust collapses when execution cannot be checked. PrivateDAO
            connects both: private preparation, wallet-controlled Testnet execution, and public-safe proof.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/services#privacy-claim-console" className={cn(buttonVariants({ size: "sm" }))}>
              Anchor a claim
            </Link>
            <Link href="/documents/privacy-execution-matrix-2026-05-26" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
              Open matrix
            </Link>
            <a href="https://api.privatedao.org/api/v1/privacy-execution-matrix" target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              Matrix JSON
            </a>
          </div>
        </div>
        <div className="grid gap-3">
          {integrationRows.map((row) => {
            const Icon = row.icon;
            const external = row.api.startsWith("https://");
            return (
              <div key={row.rail} className="rounded-[24px] border border-white/10 bg-black/22 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-emerald-100">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="text-base font-semibold text-white">{row.rail}</div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-emerald-100">
                    <CheckCircle2 className="h-3 w-3" />
                    Testnet path
                  </span>
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-3">
                  <div className="rounded-2xl border border-rose-300/12 bg-rose-300/[0.055] p-3">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-rose-100/70">Pain</div>
                    <p className="mt-2 text-sm leading-6 text-white/62">{row.pain}</p>
                  </div>
                  <div className="rounded-2xl border border-cyan-300/12 bg-cyan-300/[0.055] p-3">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-100/70">PrivateDAO treatment</div>
                    <p className="mt-2 text-sm leading-6 text-white/62">{row.treatment}</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-300/12 bg-emerald-300/[0.055] p-3">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-100/70">Proof action</div>
                    <p className="mt-2 text-sm leading-6 text-white/62">{row.proof}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link href={row.route} className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
                    Run route
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                  {external ? (
                    <a href={row.api} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                      Open proof
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  ) : (
                    <Link href={row.api} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                      Open proof
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
