import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Database, GraduationCap, KeyRound, LockKeyhole, ReceiptText, ShieldCheck, TimerReset } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const proofRows = [
  {
    icon: ShieldCheck,
    label: "ZK on-chain verification",
    status: "Program deployed",
    claim: "A standalone Anchor verifier program is live on Solana Testnet and emits a reviewer-visible Groth16 receipt through the native BN254 pairing syscall path.",
    evidence: "Program 5H7Afy...AW1j · receipt tx zwqNsA3k...cdEah67 · upgrade authority moved to the Squads vault.",
    href: "/documents/zk-standalone-verifier-testnet-2026-05-23",
  },
  {
    icon: TimerReset,
    label: "Squads multisig custody",
    status: "2-of-3 approved",
    claim: "The current Testnet proposal index 3 reached threshold approval, and execution remains blocked until the enforced 48-hour timelock release.",
    evidence: "Vault CALHr...PqBv · signer approvals 4rcv9Eyf... and 3giWXof... · execution unlock 2026-05-27T02:25:39Z.",
    href: "/documents/squads-current-binary-upgrade-proposal-2026-05-25",
  },
  {
    icon: KeyRound,
    label: "PDAO Token-2022",
    status: "Deployed and frozen",
    claim: "The PDAO governance mint is live on Solana Testnet with fixed supply and disabled mint authority.",
    evidence: "Mint DFYvBdiv...37Bie · 1,000,000 PDAO · Token-2022 metadata and fixed-supply attestation are published.",
    href: "/documents/pdao-token-surface",
  },
  {
    icon: CheckCircle2,
    label: "On-chain governance",
    status: "Testnet executed",
    claim: "DAO creation, proposal creation, voting lifecycle, execution, and treasury delta are verified on Solana Testnet.",
    evidence: "Standard Testnet lifecycle packet with program, DAO, proposal, treasury, and transaction signatures.",
    href: "/documents/testnet-lifecycle-rehearsal-2026-04-19",
  },
  {
    icon: LockKeyhole,
    label: "Privacy and secrecy",
    status: "Program enforced",
    claim: "Votes stay private during commit and become auditable only at the reveal stage.",
    evidence: "Commit-reveal instructions, proposal-bound commitments, reveal checks, and runtime proof surfaces.",
    href: "/proof",
  },
  {
    icon: ShieldCheck,
    label: "ZK and integrity",
    status: "Proof-bound",
    claim: "ZK proof records are bound to proposal payloads and reject substitution or stale interpretation.",
    evidence: "V2 proof-policy snapshot tests and V3 governance-policy tests are passing on Testnet.",
    href: "/documents/final-closure-workplan-2026-04-19",
  },
  {
    icon: ReceiptText,
    label: "Confidential treasury",
    status: "Settlement hardened",
    claim: "Confidential payout execution is gated by settlement evidence, policy snapshots, and payout caps.",
    evidence: "V2/V3 settlement hardening tests cover SOL and token-asset branches plus negative recipient/mint/authority cases.",
    href: "/documents/settlement-hardening-v3",
  },
  {
    icon: Database,
    label: "Backend and live reads",
    status: "Runtime visible",
    claim: "The UI does not stop at a toast; it exposes signatures, runtime status, RPC-backed freshness, and reviewer logs.",
    evidence: "Runtime metrics, judge logs, RPCFast infrastructure plan, and generated runtime evidence packets.",
    href: "/services",
  },
  {
    icon: KeyRound,
    label: "Tokens, metadata, and pairs",
    status: "Metadata surfaced",
    claim: "Treasury routes expose SOL, USDC, AUDD, PUSD, and USDG metadata with governed receive context and stablecoin settlement lanes.",
    evidence: "Treasury receive surface, AUDD merchant/treasury profiles, PUSD payroll/reward profiles, and stablecoin reviewer briefs for context.",
    href: "/services#treasury-receive-surface",
    externalHref: "https://www.biconomy.com/exchange/PUSD_USDT",
  },
  {
    icon: GraduationCap,
    label: "Education corridor",
    status: "Bootcamp live",
    claim: "A frontend developer can move from wallet UX to governance UI, RPC state, private payments, assignments, and quizzes.",
    evidence: "Four lecture routes, toolkit, assignments, quizzes, and route sandboxes for wallet/governance/runtime/payment templates.",
    href: "/learn",
  },
] as const;

export function TestnetProofMatrix() {
  return (
    <Card className="border-cyan-300/16 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_34%),rgba(7,12,20,0.94)]">
      <CardHeader className="space-y-3">
        <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-100/78">Testnet proof matrix</div>
        <CardTitle className="text-2xl">Every product claim is tied to a working surface, evidence packet, or executable route</CardTitle>
        <p className="max-w-4xl text-sm leading-7 text-white/62">
          This is the operating boundary as a product surface: not hidden text, not vague disclaimers. Each row shows what the
          Testnet product currently proves, where a reviewer can inspect it, and which route a user can open next.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 xl:grid-cols-2">
        {proofRows.map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.label} className="rounded-[28px] border border-white/8 bg-white/[0.045] p-5">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl border border-cyan-300/18 bg-cyan-300/[0.1] p-3 text-cyan-100">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-lg font-semibold text-white">{row.label}</div>
                    <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-emerald-100">
                      {row.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-white/68">{row.claim}</p>
                  <p className="mt-3 rounded-2xl border border-white/8 bg-black/20 p-4 text-sm leading-7 text-white/58">{row.evidence}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link href={row.href} className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
                      Open evidence
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                    {"externalHref" in row ? (
                      <a
                        href={row.externalHref}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                      >
                        Open market reference
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
