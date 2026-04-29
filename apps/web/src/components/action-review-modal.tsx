"use client";

import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { CheckCircle2, Signature, Wallet, X } from "lucide-react";

import { OnchainParityPanel } from "@/components/onchain-parity-panel";
import { ProposalAnalyzerInline } from "@/components/proposal-analyzer-inline";
import type { GovernanceExecutionIntent } from "@/components/governance-session";
import { TreasuryRiskInline } from "@/components/treasury-risk-inline";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { buildPreparedActionSummary } from "@/lib/onchain-parity";
import type { CoreGovernanceInstructionName } from "@/lib/onchain-parity.generated";
import type { ServiceHandoffRequestDelivery, ServiceHandoffRequestPayload } from "@/lib/service-handoff-state";
import type { ProposalCardModel } from "@/lib/site-data";
import { SOLANA_NETWORK_LABEL } from "@/lib/solana-network";
import { cn } from "@/lib/utils";

type ActionReviewModalProps = {
  action: CoreGovernanceInstructionName | null;
  daoName?: string;
  proposalTitle?: string;
  proposalId?: string;
  voteChoice?: string;
  proposal?: ProposalCardModel;
  executionIntent?: GovernanceExecutionIntent | null;
  requestPayload?: ServiceHandoffRequestPayload | null;
  requestDelivery?: ServiceHandoffRequestDelivery | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function ActionReviewModal({
  action,
  daoName,
  proposalTitle,
  proposalId,
  voteChoice,
  proposal,
  executionIntent,
  requestPayload,
  requestDelivery,
  onClose,
  onConfirm,
}: ActionReviewModalProps) {
  const { wallet, publicKey, connected } = useWallet();

  if (!action) return null;

  const summary = buildPreparedActionSummary({
    action,
    daoName,
    proposalTitle,
    proposalId,
    voteChoice,
    proposal,
  });
  const payload = requestPayload ?? executionIntent?.requestPayload ?? null;
  const delivery = requestDelivery ?? executionIntent?.requestDelivery ?? null;
  const deliveryState = delivery?.state ?? payload?.state ?? "draft";
  const usesPayloadContinuity = action === "execute_proposal" && Boolean(executionIntent);
  const payloadAlreadySubmitted =
    usesPayloadContinuity && deliveryState === "executed";
  const summaryProposalId = usesPayloadContinuity ? payload?.requestId ?? summary.proposalId : summary.proposalId;
  const summaryBeneficiary = usesPayloadContinuity
    ? payload?.executionTarget ?? executionIntent?.executionTarget ?? summary.beneficiary
    : summary.beneficiary;
  const summaryAmountOrAsset = usesPayloadContinuity
    ? payload?.amountDisplay ?? executionIntent?.amountDisplay ?? summary.amountOrAsset
    : summary.amountOrAsset;
  const summaryTimelock =
    usesPayloadContinuity
      ? payload
        ? `Authoritative request object loaded · ${delivery?.state ?? payload.state} · telemetry ${payload.telemetryMode}`
        : `Execution continuity loaded · telemetry ${executionIntent?.telemetryMode ?? "packet"}`
      : summary.timelock;
  const confirmLabel = usesPayloadContinuity
    ? action === "execute_proposal"
      ? payloadAlreadySubmitted
        ? "Payload already submitted"
        : "Sign and submit delivered payload"
      : "Continue with payload-driven signing shell"
    : action === "initialize_dao"
      ? "Sign and submit DAO bootstrap"
      : action === "create_proposal"
        ? "Sign and submit proposal create"
      : action === "commit_vote"
        ? "Sign and submit vote commit"
        : action === "reveal_vote"
          ? "Sign and submit vote reveal"
          : action === "finalize_proposal"
            ? "Sign and submit proposal finalize"
            : action === "execute_proposal"
              ? "Sign and submit standard execute"
              : "Continue in UI";
  const connectedWalletName = wallet?.adapter.name ?? "No wallet selected";
  const connectedAddress = publicKey?.toBase58() ?? null;
  const connectedAccountLabel = connectedAddress ? `${connectedAddress.slice(0, 4)}…${connectedAddress.slice(-4)}` : "No account connected";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#03050e]/84 px-4 py-4 backdrop-blur-md sm:flex sm:items-center sm:justify-center sm:py-6">
      <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-[32px] border border-white/12 bg-[linear-gradient(180deg,rgba(12,16,30,0.97),rgba(6,8,20,0.99))] shadow-[0_30px_120px_rgba(0,0,0,0.48)]">
        <div className="max-h-[calc(100vh-2rem)] overflow-y-auto overscroll-contain p-6 sm:max-h-[calc(100vh-3rem)] sm:p-8">
        <div className="sticky top-0 z-10 -mx-6 -mt-6 mb-6 border-b border-white/8 bg-[linear-gradient(180deg,rgba(12,16,30,0.98),rgba(12,16,30,0.94))] px-6 py-6 backdrop-blur-md sm:-mx-8 sm:-mt-8 sm:px-8 sm:py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.32em] text-cyan-200/72">Pre-sign review</div>
            <h3 className="mt-2 text-2xl font-semibold text-white">{summary.displayName}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/60">
              Review the exact operation type, signer role, program path, field order, accounts, and validation boundary before continuing in the UI workflow.
            </p>
          </div>
          <button
            aria-label="Close review modal"
            className="rounded-full border border-white/10 p-2 text-white/60 transition hover:bg-white/8 hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
            <div className="text-[11px] uppercase tracking-[0.28em] text-white/40">Operation</div>
            <div className="mt-2 text-sm font-medium text-white">{summary.operationType}</div>
          </div>
          <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
            <div className="text-[11px] uppercase tracking-[0.28em] text-white/40">Proposal ID</div>
            <div className="mt-2 text-sm font-medium text-white">{summaryProposalId}</div>
          </div>
          <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
            <div className="text-[11px] uppercase tracking-[0.28em] text-white/40">Network</div>
            <div className="mt-2 text-sm font-medium text-white">{summary.network}</div>
          </div>
          <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
            <div className="text-[11px] uppercase tracking-[0.28em] text-white/40">Signer role</div>
            <div className="mt-2 text-sm font-medium text-white">{summary.signerRole}</div>
          </div>
          <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
            <div className="text-[11px] uppercase tracking-[0.28em] text-white/40">Beneficiary / path</div>
            <div className="mt-2 text-sm font-medium text-white">{summaryBeneficiary}</div>
          </div>
          <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
            <div className="text-[11px] uppercase tracking-[0.28em] text-white/40">Amount / asset</div>
            <div className="mt-2 text-sm font-medium text-white">{summaryAmountOrAsset}</div>
          </div>
          <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
            <div className="text-[11px] uppercase tracking-[0.28em] text-white/40">Governance mint</div>
            <div className="mt-2 break-all text-sm font-medium text-white">{summary.governanceMint}</div>
          </div>
          <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
            <div className="text-[11px] uppercase tracking-[0.28em] text-white/40">Timelock / gate</div>
            <div className="mt-2 text-sm font-medium text-white">{summaryTimelock}</div>
          </div>
          {usesPayloadContinuity ? (
            <div className="rounded-3xl border border-white/8 bg-white/4 p-4 md:col-span-2 xl:col-span-4">
              <div className="text-[11px] uppercase tracking-[0.28em] text-white/40">Execution route</div>
              <div className="mt-2 text-sm font-medium text-white">{summaryBeneficiary}</div>
            </div>
          ) : proposal?.execution ? (
            <div className="rounded-3xl border border-white/8 bg-white/4 p-4 md:col-span-2 xl:col-span-4">
              <div className="text-[11px] uppercase tracking-[0.28em] text-white/40">Execution target</div>
              <div className="mt-2 text-sm font-medium text-white">{proposal.execution.executionTarget}</div>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Badge variant="cyan">{summary.instructionName}</Badge>
          <Badge variant="success">Program {summary.programId.slice(0, 8)}…</Badge>
          <Badge variant="violet">Token {summary.governanceTokenProgram.slice(0, 8)}…</Badge>
        </div>

        <div className="mt-6 rounded-3xl border border-cyan-300/16 bg-cyan-300/[0.08] p-5">
          <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/80">Review → Sign → Verify</div>
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-white/68">
              <div className="flex items-center gap-2 text-white">
                <Wallet className="h-4 w-4 text-cyan-100" />
                <span className="font-medium">Current wallet context</span>
              </div>
              <div className="mt-3 space-y-1 leading-7">
                <div>Wallet: <span className="text-white">{connectedWalletName}</span></div>
                <div>Account: <span className="text-white">{connectedAccountLabel}</span></div>
                <div>Network: <span className="text-white">{SOLANA_NETWORK_LABEL}</span></div>
                <div>Status: <span className="text-white">{connected ? "Connected" : "Not connected yet"}</span></div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-white/68">
              <div className="flex items-center gap-2 text-white">
                <Signature className="h-4 w-4 text-cyan-100" />
                <span className="font-medium">What happens after Sign</span>
              </div>
              <div className="mt-3 leading-7">
                The wallet prompt opens for this exact action only. If you approve it, the app returns to the same flow and records the resulting signature or error state here.
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-white/68">
              <div className="flex items-center gap-2 text-white">
                <CheckCircle2 className="h-4 w-4 text-cyan-100" />
                <span className="font-medium">What happens after Verify</span>
              </div>
              <div className="mt-3 leading-7">
                After submission, move into Proof and runtime logs to confirm the receipt, explorer hash, and continuity lane without leaving the product shell.
              </div>
            </div>
          </div>
        </div>

        {usesPayloadContinuity ? (
          <div className="mt-6 rounded-3xl border border-emerald-300/18 bg-emerald-300/[0.08] p-5">
            <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-100/80">Execution continuity packet</div>
            <div className="mt-3 text-base font-medium text-white">
              {payload?.payoutTitle ?? executionIntent?.payoutTitle ?? "Execution continuity"} · {summaryAmountOrAsset}
            </div>
            <div className="mt-2 text-sm leading-7 text-white/62">
              {(payload?.reference ?? executionIntent?.reference) || "Reference ready"} · {(payload?.purpose ?? executionIntent?.purpose) || "Purpose ready"}
            </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-black/20 p-3 text-sm text-white/68">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Payout profile</div>
                <div className="mt-2 text-white">{executionIntent?.payoutProfile ?? "continuity-ready"}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-3 text-sm text-white/68">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Telemetry mode</div>
                <div className="mt-2 text-white">{executionIntent?.telemetryMode ?? "packet"}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-3 text-sm text-white/68">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Request ID</div>
                <div className="mt-2 text-white">{payload?.requestId ?? executionIntent?.reference ?? "request-ready"}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-3 text-sm text-white/68">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Delivery state</div>
                <div className="mt-2 text-white">{delivery?.state ?? payload?.state ?? "draft-pending-input"}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-3 text-sm text-white/68">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Submit lane</div>
                <div className="mt-2 text-white">{payload?.deliveryRoute ?? executionIntent?.evidenceRoute ?? "delivery-route-pending"}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-3 text-sm text-white/68">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Runtime lane</div>
                <div className="mt-2 text-white">{payload?.telemetryRoute ?? executionIntent?.evidenceRoute ?? "telemetry-route-pending"}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-3 text-sm text-white/68 sm:col-span-2">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Execution target</div>
                <div className="mt-2 text-white">{summaryBeneficiary}</div>
              </div>
              {payload ? (
                <div className="rounded-2xl border border-white/8 bg-black/20 p-3 text-sm text-white/68 sm:col-span-2">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Authoritative request object</div>
                  <div className="mt-2 text-white">{payload.kind}</div>
                  <div className="mt-1 text-white/72">{payload.requestId}</div>
                  <div className="mt-1 text-white/72">{payload.requestRoute}</div>
                  <div className="mt-1 text-white/72">{payload.deliveryRoute}</div>
                  <div className="mt-1 text-white/72">{payload.telemetryRoute}</div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {proposal && !usesPayloadContinuity ? (
          <div className="mt-6 grid gap-4">
            <ProposalAnalyzerInline proposal={proposal} />
            <TreasuryRiskInline proposal={proposal} />
          </div>
        ) : null}

        {usesPayloadContinuity ? (
          <div className="mt-6 rounded-3xl border border-cyan-300/16 bg-cyan-300/[0.08] p-5">
            <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/80">Execution continuity checks</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-black/20 p-3 text-sm text-white/68">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Payload source</div>
                <div className="mt-2 text-white">{payload?.requestId ?? executionIntent?.reference ?? "request-ready"}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-3 text-sm text-white/68">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Review posture</div>
                <div className="mt-2 text-white">Execution packet loaded from governed services continuity.</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-3 text-sm text-white/68">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Commercial route</div>
                <div className="mt-2 text-white">{executionIntent?.payoutTitle ?? "continuity-ready"}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-3 text-sm text-white/68">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Signing and proof route</div>
                <div className="mt-2 text-white">{payload?.deliveryRoute ?? executionIntent?.evidenceRoute ?? "delivery-route-pending"}</div>
              </div>
            </div>
          </div>
        ) : null}

        {usesPayloadContinuity && payload ? (
          <div className="mt-6 rounded-3xl border border-amber-300/16 bg-amber-300/[0.08] p-5">
            <div className="text-[11px] uppercase tracking-[0.28em] text-amber-100/80">Final signing payload</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-black/20 p-3 text-sm text-white/68">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Request state</div>
                <div className="mt-2 text-white">{delivery?.state ?? payload.state ?? "draft"}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-3 text-sm text-white/68">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Telemetry mode</div>
                <div className="mt-2 text-white">{payload.telemetryMode}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-3 text-sm text-white/68 sm:col-span-2">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Purpose</div>
                <div className="mt-2 text-white">{payload.purpose}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-3 text-sm text-white/68 sm:col-span-2">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Route binding</div>
                <div className="mt-2 text-white/72">{payload.requestRoute}</div>
                <div className="mt-1 text-white/72">{payload.deliveryRoute}</div>
                <div className="mt-1 text-white/72">{payload.telemetryRoute}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-3 text-sm text-white/68 sm:col-span-2">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Submit controls</div>
                <div className="mt-2 text-white/72">
                  Final signing now stays bound to the same authoritative request object before submit, delivery, and runtime review.
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href={payload.deliveryRoute} className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
                Open final delivery lane
              </Link>
              <Link href={payload.telemetryRoute} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                Open authoritative telemetry lane
              </Link>
              <Link href="/documents/monitoring-alert-rules" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                Open alert rules
              </Link>
              <Link href="/documents/real-device-runtime" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                Open real-device runtime
              </Link>
            </div>
          </div>
        ) : null}

        <div className="mt-6">
          <OnchainParityPanel action={action} preparedSummary={summary} />
        </div>

        <div className="sticky bottom-0 z-10 -mx-6 -mb-6 mt-6 border-t border-white/8 bg-[linear-gradient(180deg,rgba(12,16,30,0.92),rgba(6,8,20,0.98))] px-6 py-5 backdrop-blur-md sm:-mx-8 sm:-mb-8 sm:px-8 sm:py-6">
        <div className="mb-4 rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm leading-7 text-white/68">
          If the wallet prompt does not appear, reconnect the wallet and retry once. If the prompt appears but you reject it, the action will return here with a clear failure state instead of pretending it succeeded.
        </div>
        <div className="flex flex-wrap gap-3">
          <Button disabled={payloadAlreadySubmitted} onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Go back
          </Button>
        </div>
        </div>
        </div>
      </div>
    </div>
  );
}
