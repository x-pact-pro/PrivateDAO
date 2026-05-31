"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Banknote, BrainCircuit, CheckCircle2, KeyRound, LockKeyhole, ReceiptText, Route, ShieldCheck, Zap } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const integrationRows = [
  {
    claim: "metadao-grant-review-workflow",
    rail: "PrivateDAO Grant Review Workflow",
    pain: "A market-passed decision still needs private reviewer assignment, private scoring, treasury approval, payout execution, and a public audit receipt.",
    treatment: "PrivateDAO turns the post-governance path into one confidential coordination graph: Market Decision -> Grant Review -> Treasury Approval -> Payroll Allocation -> Execution -> Prove -> Audit Proof.",
    proof: "Open the PrivateDAO workflow, encrypt the private scoring room, sign the Testnet digest, export public attestation, then verify who reviewed, approved, executed, and proved the outcome without exposing the private notes.",
    route: "/services?claim=metadao-grant-review-workflow#privacy-claim-console",
    api: "https://api.privatedao.org/api/v1/privacy-execution-claims/prepare?claim=metadao-grant-review-workflow",
    icon: BrainCircuit,
  },
  {
    claim: "confidential-treasury-request",
    rail: "Confidential Treasury Request",
    pain: "Treasury requests leak strategy, vendor terms, and negotiation context before the DAO is ready to execute.",
    treatment: "PrivateDAO encrypts the request body, stages Discuss -> Review -> Approve -> Execute -> Audit, and anchors only a digest commitment on Solana Testnet.",
    proof: "Open the claim console, select Confidential Treasury Request, encrypt the request, sign the memo digest, then verify the explorer receipt.",
    route: "/services?claim=confidential-treasury-request#privacy-claim-console",
    api: "https://api.privatedao.org/api/v1/privacy-execution-claims/prepare?claim=confidential-treasury-request",
    icon: Banknote,
  },
  {
    claim: "confidential-payroll-request",
    rail: "Confidential Payroll Request",
    pain: "Public payroll exposes contributor salaries, bonus reasons, and internal compensation strategy.",
    treatment: "Payroll rows become encrypted selective-disclosure receipts while the organization keeps a public-safe batch digest and REFHE proof path.",
    proof: "Run Confidential Payroll Request, sign the Testnet memo, export public attestation, and keep the private disclosure receipt for authorized reviewers.",
    route: "/payroll?claim=confidential-payroll-request#privacy-claim-console",
    api: "https://api.privatedao.org/api/v1/privacy-execution-claims/prepare?claim=confidential-payroll-request",
    icon: LockKeyhole,
  },
  {
    claim: "security-incident-room-request",
    rail: "Security Incident Room",
    pain: "Security teams cannot reveal exploit details while they are still investigating and patching.",
    treatment: "Incident findings, responder notes, and mitigation plans stay encrypted until disclosure; the decision path still leaves a signed digest trail.",
    proof: "Open Security Incident Room, encrypt the response context, anchor the digest, and route reviewers to the mitigation proof.",
    route: "/security?claim=security-incident-room-request#privacy-claim-console",
    api: "https://api.privatedao.org/api/v1/privacy-execution-claims/prepare?claim=security-incident-room-request",
    icon: ShieldCheck,
  },
  {
    claim: "emergency-governance-request",
    rail: "Emergency Governance",
    pain: "Exploit, oracle, or key-loss decisions need speed and privacy without losing accountability.",
    treatment: "PrivateDAO gives the council a private evidence lane, fast approval claim, execution handoff, and postmortem audit surface.",
    proof: "Select Emergency Governance, sign the encrypted decision digest, then verify the final action and public-safe postmortem trail.",
    route: "/govern?claim=emergency-governance-request#privacy-claim-console",
    api: "https://api.privatedao.org/api/v1/privacy-execution-claims/prepare?claim=emergency-governance-request",
    icon: Zap,
  },
  {
    claim: "confidential-grant-review-request",
    rail: "Confidential Grant Review",
    pain: "Grant reviewers influence each other when notes, scores, and committee debate are public too early.",
    treatment: "PrivateDAO separates intake, blind review, award approval, grant execution, and outcome audit with encrypted review packets.",
    proof: "Anchor a Confidential Grant Review claim, export the public attestation, then inspect the final award proof surface.",
    route: "/review?claim=confidential-grant-review-request#privacy-claim-console",
    api: "https://api.privatedao.org/api/v1/privacy-execution-claims/prepare?claim=confidential-grant-review-request",
    icon: ReceiptText,
  },
  {
    claim: "organizational-memory-vault",
    rail: "Institutional Memory Vault",
    pain: "Organizations lose decision context across sessions, teams, and reviewer handoffs, or they expose too much too early.",
    treatment: "PrivateDAO stores why decisions happened, who objected, what alternatives were rejected, and what happened later, with progressive disclosure and digest continuity.",
    proof: "Capture the decision as an encrypted memory-vault claim, sign the digest, and keep public/private receipts separated.",
    route: "/services?claim=organizational-memory-vault#privacy-claim-console",
    api: "https://api.privatedao.org/api/v1/privacy-execution-claims/prepare?claim=organizational-memory-vault",
    icon: BrainCircuit,
  },
  {
    claim: "agent-governance-request",
    rail: "Agent Governance Request",
    pain: "AI agents can prepare work, but organizations need human approval, private context, and auditable execution lineage.",
    treatment: "Agent intent, human review, approval, execution, and outcome are connected through encrypted context plus a wallet-signed Testnet digest.",
    proof: "Select Agent Governance Request, encrypt the agent intent, sign the approval digest, and verify the lineage attestation.",
    route: "/intelligence?claim=agent-governance-request#privacy-claim-console",
    api: "https://api.privatedao.org/api/v1/privacy-execution-claims/prepare?claim=agent-governance-request",
    icon: BrainCircuit,
  },
  {
    claim: "private-governance",
    rail: "Governance + ZK",
    pain: "Strategic votes become public before the organization is ready.",
    treatment: "Commit/reveal governance, local Groth16 proof artifacts, and standalone Testnet verifier receipts turn private voting into a verifiable workflow.",
    proof: "Create DAO, create proposal, commit, reveal, finalize, execute, then open Solscan and proof.",
    route: "/govern",
    api: "/documents/zk-capability-matrix",
    icon: ShieldCheck,
  },
  {
    claim: "zk-commit-reveal-governance",
    rail: "ZK Commit/Reveal",
    pain: "Private votes lose credibility if the proof path is hidden from normal reviewers.",
    treatment: "The governance rail binds commit, reveal, Groth16 proof context, and a visitor-signed Testnet digest claim into one verifiable path.",
    proof: "Open Govern, run the governance flow, anchor the ZK commit/reveal claim, then inspect readiness and Explorer links.",
    route: "/services?claim=zk-commit-reveal-governance#privacy-claim-console",
    api: "https://api.privatedao.org/api/v1/privacy-execution-claims/prepare?claim=zk-commit-reveal-governance",
    icon: ShieldCheck,
  },
  {
    claim: "confidential-payroll",
    rail: "REFHE / Encrypt Payroll",
    pain: "Salary rows, bonus reasons, and payroll strategy leak when teams operate from public wallets and spreadsheets.",
    treatment: "Encrypted payroll manifests, REFHE envelope settlement, and wallet-signed payout rehearsal bind private payroll context to public-safe proof.",
    proof: "Encrypt payroll payload, anchor a confidential-payroll claim, run payout rehearsal, export proof.",
    route: "/payroll?claim=confidential-payroll#privacy-claim-console",
    api: "/viewer/refhe-security-model",
    icon: LockKeyhole,
  },
  {
    claim: "refhe-payroll-computation",
    rail: "REFHE Payroll Computation",
    pain: "Payroll privacy is not enough unless encrypted computation receipts and payout evidence stay connected.",
    treatment: "REFHE payroll proof produces ciphertext-safe receipts, then the visitor anchors a digest claim on Solana Testnet.",
    proof: "Open REFHE payroll proof, generate the receipt, anchor the REFHE claim, export public attestation.",
    route: "/services?claim=refhe-payroll-computation#privacy-claim-console",
    api: "https://api.privatedao.org/api/v1/privacy-execution-claims/prepare?claim=refhe-payroll-computation",
    icon: LockKeyhole,
  },
  {
    claim: "browser-encrypt-manifest",
    rail: "Encrypt Manifest",
    pain: "Sensitive operational plans should be encrypted before they enter review, automation, or payment rails.",
    treatment: "Browser AES-GCM encryption creates a local encrypted packet, hashes ciphertext, and signs only the digest on Testnet.",
    proof: "Open Services, pick Encrypt Manifest, anchor a claim, verify locally, export public attestation.",
    route: "/services?claim=browser-encrypt-manifest#privacy-claim-console",
    api: "https://api.privatedao.org/api/v1/privacy-execution-claims/prepare?claim=browser-encrypt-manifest",
    icon: LockKeyhole,
  },
  {
    claim: "private-payments",
    rail: "MagicBlock Private Payments",
    pain: "Reward and payout corridors expose timing, recipients, and operational intent.",
    treatment: "MagicBlock corridor receipts and visitor-signed encrypted claims make private payments testable while preserving a visible execution trail.",
    proof: "Open the private payments service, anchor a claim, and inspect corridor evidence.",
    route: "/services/magicblock-private-payments",
    api: "/services/magicblock-private-payments",
    icon: Zap,
  },
  {
    claim: "magicblock-private-payments",
    rail: "MagicBlock Claim",
    pain: "Private payment UX needs a single route from payment corridor to explorer-visible proof.",
    treatment: "MagicBlock corridor evidence, health checks, and visitor-signed encrypted payment claims become one Testnet-verifiable lane.",
    proof: "Open MagicBlock, inspect on-chain proof, anchor the MagicBlock claim, verify the digest transaction.",
    route: "/services?claim=magicblock-private-payments#privacy-claim-console",
    api: "https://api.privatedao.org/api/v1/privacy-execution-claims/prepare?claim=magicblock-private-payments",
    icon: Zap,
  },
  {
    claim: "umbra-confidential-payout",
    rail: "Umbra / Cloak Settlement",
    pain: "Vendor and contributor payments reveal counterparties before the organization wants disclosure.",
    treatment: "Recipient-private settlement intent, rail health, and selective-disclosure receipts keep the operation private but reviewable.",
    proof: "Prepare settlement intent, forward through the rail, anchor the encrypted claim, verify receipt.",
    route: "/execute#vendor-payment",
    api: "/services/umbra-confidential-payout",
    icon: ReceiptText,
  },
  {
    claim: "ika-custody-and-interoperability",
    rail: "Ika / 2PC-MPC Custody",
    pain: "Treasury operations need stronger signing control than a single hot-wallet action.",
    treatment: "Ika readiness, Solana pre-alpha final approval, and custody preparation expose the threshold-signing path as an execution rail.",
    proof: "Open Encrypt/Ika operations, inspect readiness, prepare custody, anchor an Ika claim.",
    route: "/services/encrypt-ika-operations",
    api: "https://api.privatedao.org/api/v1/ika/solana-prealpha/final-approval",
    icon: KeyRound,
  },
  {
    claim: "ika-2pc-mpc-final-approval",
    rail: "Ika 2PC-MPC Approval",
    pain: "Treasury custody claims are weak unless the approval, readiness, and signing boundary are inspectable.",
    treatment: "Ika readiness, Solana pre-alpha final approval, custody preparation, and a visitor Testnet claim form one reviewable path.",
    proof: "Open Encrypt/Ika operations, inspect final approval, prepare custody, anchor the Ika 2PC-MPC claim.",
    route: "/services?claim=ika-2pc-mpc-final-approval#privacy-claim-console",
    api: "https://api.privatedao.org/api/v1/privacy-execution-claims/prepare?claim=ika-2pc-mpc-final-approval",
    icon: KeyRound,
  },
  {
    claim: "treasury-routing-and-growth",
    rail: "Jupiter + Torque Treasury",
    pain: "Treasury moves lose context when routing, approval, and growth/accounting events live in separate tools.",
    treatment: "Jupiter route review and Torque event delivery connect treasury execution with operational telemetry.",
    proof: "Preview the route, run the claim or event lane, then inspect provider status.",
    route: "/services/jupiter-treasury-route",
    api: "https://api.privatedao.org/api/v1/provider-integrations/status",
    icon: Route,
  },
  {
    claim: "torque-mcp-growth-loop",
    rail: "Torque MCP Growth Loop",
    pain: "Growth rewards become untrustworthy when product activity, treasury policy, and event delivery are split.",
    treatment: "Torque MCP/event delivery is tied to governed treasury context and an on-chain digest claim for reviewer-visible proof.",
    proof: "Open Torque, inspect provider status, trigger/prepare event delivery, anchor the Torque MCP claim.",
    route: "/services?claim=torque-mcp-growth-loop#privacy-claim-console",
    api: "https://api.privatedao.org/api/v1/privacy-execution-claims/prepare?claim=torque-mcp-growth-loop",
    icon: Route,
  },
  {
    claim: "pusd-stablecoin-treasury",
    rail: "Palm USD Utility Layer",
    pain: "Stablecoin payroll, grants, and rewards usually expose operational context or sit outside governance proof.",
    treatment: "PUSD becomes a governed settlement rail: prepare private payroll/grant/reward context, encrypt the claim, sign from wallet, and verify public-safe evidence.",
    proof: "Open the PUSD route, anchor the PUSD utility claim, inspect the utility API, then verify the matrix anchor.",
    route: "/services/pusd-stablecoin?claim=pusd-stablecoin-treasury#privacy-claim-console",
    api: "https://api.privatedao.org/api/v1/pusd/utility-layer",
    icon: Banknote,
  },
  {
    claim: "intelligence-and-risk",
    rail: "QVAC + GoldRush Intelligence",
    pain: "Signers approve proposals without enough risk, history, counterparty, or treasury context.",
    treatment: "QVAC local reasoning plus GoldRush/Covalent, Zerion, QuickNode, and provider status create the pre-sign intelligence gate.",
    proof: "Open Intelligence, review Operational Gravity, then continue to Execute.",
    route: "/intelligence",
    api: "https://api.privatedao.org/api/v1/provider-integrations/status",
    icon: BrainCircuit,
  },
] as const;

type MatrixAnchorStatus = {
  ok?: boolean;
  source?: string;
  latest?: {
    tx?: string | null;
    slot?: number | null;
    digest?: string | null;
    anchoredAt?: string | null;
    explorer?: string | null;
    solscan?: string | null;
  } | null;
  currentDigestPreview?: string;
};

export function EndToEndIntegrationClaimMatrix() {
  const [anchorStatus, setAnchorStatus] = useState<MatrixAnchorStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("https://api.privatedao.org/api/v1/integration-matrix/anchor", { cache: "no-store" })
      .then((response) => response.json())
      .then((json: MatrixAnchorStatus) => {
        if (!cancelled) setAnchorStatus(json);
      })
      .catch(() => {
        if (!cancelled) setAnchorStatus({ ok: false, source: "unavailable" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const latestAnchor = anchorStatus?.latest;

  return (
    <section className="solana-claim-shell max-w-full rounded-[24px] p-4 sm:rounded-[30px] md:p-6">
      <div className="solana-scanline" />
      <div className="relative z-10">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-emerald-300/22 bg-emerald-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-emerald-100">
          End-to-end Testnet claim matrix
        </span>
        <span className="rounded-full border border-cyan-300/18 bg-cyan-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-cyan-100">
          Pain → Treatment → Proof
        </span>
      </div>
      <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] xl:items-start">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white md:text-3xl">
            Every integration is part of one confidential coordination graph
          </h2>
          <p className="mt-3 text-sm leading-7 text-white/66">
            Organizations need privacy because payroll, votes, vendors, treasury routes, and internal operations leak by
            default. Blockchains need verifiability because trust collapses when execution cannot be checked. PrivateDAO
            connects both: private preparation, wallet-controlled Testnet execution, and public-safe proof.
          </p>
          <div className="mt-4 rounded-[22px] border border-emerald-300/14 bg-emerald-300/[0.055] p-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-100/70">PrivateDAO-native workflow</div>
            <div className="mt-3 grid min-w-0 grid-cols-1 gap-2 text-xs text-white/62 sm:grid-cols-2 lg:grid-cols-3">
              {["Market passes", "Grant reviewers assigned", "Private review room", "Private scoring", "Treasury approval", "Grant payout", "Prove", "Public audit receipt"].map((node, index) => (
                <span key={node} className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 flex-1 rounded-full border border-white/10 bg-black/24 px-3 py-1 text-center leading-5 break-words">{node}</span>
                  {index < 7 ? <span className="hidden shrink-0 text-cyan-100/50 sm:inline">→</span> : null}
                </span>
              ))}
            </div>
          </div>
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
            <a href="https://api.privatedao.org/api/v1/integration-matrix/anchor" target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              Matrix anchor
            </a>
          </div>
          <div className="solana-rail-card mt-5 rounded-[22px] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-100/66">Live matrix anchor</div>
                <div className="mt-1 text-sm font-semibold text-white">
                  {latestAnchor?.tx ? "Integration matrix is anchored on Solana Testnet" : "Waiting for live matrix anchor"}
                </div>
              </div>
              <span className="rounded-full border border-emerald-300/18 bg-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-emerald-100">
                {anchorStatus?.source || "loading"}
              </span>
            </div>
            <div className="mt-3 grid gap-2 font-mono text-[11px] leading-5 text-white/58">
              <div className="break-all">digest: {latestAnchor?.digest || anchorStatus?.currentDigestPreview || "loading"}</div>
              <div>slot: {latestAnchor?.slot ?? "pending"}</div>
              {latestAnchor?.anchoredAt ? <div>anchored: {latestAnchor.anchoredAt}</div> : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {latestAnchor?.solscan ? (
                <a href={latestAnchor.solscan} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
                  Verify anchor
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              ) : null}
              <a href="https://api.privatedao.org/api/v1/readiness" target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                Readiness API
              </a>
            </div>
          </div>
        </div>
        <div className="grid gap-3">
          {integrationRows.map((row) => {
            const Icon = row.icon;
            const external = row.api.startsWith("https://");
            return (
              <div key={row.rail} className="solana-matrix-card rounded-[24px] border border-white/10 bg-black/22 p-4 transition duration-300 hover:border-emerald-300/24 hover:bg-white/[0.045]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-300/16 bg-[linear-gradient(135deg,rgba(20,241,149,0.12),rgba(153,69,255,0.13))] text-emerald-100 shadow-[0_0_24px_rgba(20,241,149,0.08)]">
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
                  <Link href={`/services?claim=${row.claim}#privacy-claim-console`} className={cn(buttonVariants({ size: "sm" }))}>
                    Claim rail
                    <ReceiptText className="h-4 w-4" />
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
      </div>
    </section>
  );
}
