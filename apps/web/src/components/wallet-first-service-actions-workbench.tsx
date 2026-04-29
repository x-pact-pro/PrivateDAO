"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Radar,
  ReceiptText,
  WalletCards,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  type PayoutRouteOption,
  type ProposalReviewOption,
  type TelemetryInspectorMode,
  type WalletFirstServiceAction,
  type WalletFirstServiceActionContext,
  type WalletFirstServiceWorkbenchData,
} from "@/lib/wallet-first-service-actions";
import {
  type ServiceHandoffAssetSymbol,
  buildServiceHandoffQuery,
  readServiceHandoffState,
  readStoredServiceHandoffState,
  SERVICE_HANDOFF_EVENT,
  SERVICE_HANDOFF_STORAGE_KEY,
  type ServiceHandoffState,
  writeStoredServiceHandoffState,
} from "@/lib/service-handoff-state";
import { cn } from "@/lib/utils";

type WalletFirstServiceActionsWorkbenchProps = {
  context: WalletFirstServiceActionContext;
  data: WalletFirstServiceWorkbenchData;
};

type LaneSlug = WalletFirstServiceAction["slug"];

const laneMeta = {
  "proposal-review": {
    icon: ReceiptText,
    eyebrow: "Proposal review",
  },
  "payout-route-selection": {
    icon: WalletCards,
    eyebrow: "Payout route selection",
  },
  "telemetry-inspection": {
    icon: Radar,
    eyebrow: "Telemetry inspection",
  },
} as const;

const copy = {
  start: {
    title: "Wallet-first service workbench",
    description:
      "Run the first three product loops from the UI itself: choose the proposal context, select the governed payout corridor, and inspect telemetry mode without dropping into documents or terminal-first operations.",
  },
  services: {
    title: "Commercial service workbench",
    description:
      "Keep the commercial path executable. Buyers should be able to choose the proposal context, pick the payout corridor, and inspect telemetry posture from the services surface itself.",
  },
  "command-center": {
    title: "Operator service workbench",
    description:
      "The command shell should not only point to routes. It should let operators stage proposal review, choose payout paths, and switch telemetry mode before taking the next action.",
  },
} as const;

function subscribeToStorage(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = (event: StorageEvent) => {
    if (event.key === SERVICE_HANDOFF_STORAGE_KEY) {
      callback();
    }
  };
  const customHandler = () => callback();
  window.addEventListener("storage", handler);
  window.addEventListener(SERVICE_HANDOFF_EVENT, customHandler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(SERVICE_HANDOFF_EVENT, customHandler);
  };
}

function getStoredSnapshot() {
  return readStoredServiceHandoffState();
}

function buildStoredHandoffState(
  context: WalletFirstServiceActionContext,
  proposal: ProposalReviewOption,
  payout: PayoutRouteOption,
  telemetry: TelemetryInspectorMode,
): ServiceHandoffState {
  const assetSymbol = resolvePayoutAssetSymbol(proposal, payout);
  const amount = resolvePayoutAmount(proposal, assetSymbol);
  const amountDisplay = buildPayoutAmountDisplay(amount, assetSymbol);
  const reference = buildPayoutReference(proposal, payout);
  const purpose = `${payout.title} for ${proposal.id} · ${proposal.title}`;

  return {
    proposalId: proposal.id,
    proposalTitle: proposal.title,
    proposalStatus: proposal.status,
    payoutProfile: payout.slug,
    payoutTitle: payout.title,
    telemetryMode: telemetry.slug,
    updatedAt: new Date().toISOString(),
    source: context,
    proposalReview: {
      proposalAccount: proposal.proposalAccount,
      window: proposal.window,
      treasury: proposal.treasury,
      executionTarget: proposal.executionTarget,
      evidenceRoute: proposal.evidenceRoute,
      proofHref: proposal.proofHref,
      proofLabel: proposal.proofLabel,
    },
    payoutIntent: {
      assetSymbol,
      amount,
      amountDisplay,
      reference,
      purpose,
      lane: payout.defaultLane,
      routeFocus: payout.routeFocus,
      recipient: proposal.recipient,
      mintAddress: proposal.mintAddress,
      executionTarget: proposal.executionTarget,
      evidenceRoute: proposal.evidenceRoute,
    },
    telemetrySelection: {
      title: telemetry.title,
      summary: telemetry.summary,
      state: telemetry.state,
      stateDetail: telemetry.stateDetail,
      primaryHref: telemetry.primaryHref,
      proofHref: telemetry.proofHref,
    },
  };
}

function resolvePayoutAssetSymbol(
  proposal: ProposalReviewOption,
  payout: PayoutRouteOption,
): ServiceHandoffAssetSymbol {
  if (proposal.mintSymbol === "SOL") return "SOL";
  if (proposal.mintSymbol === "USDC") return "USDC";
  if (proposal.mintSymbol === "USDG") return "USDG";
  return payout.defaultAssetSymbol;
}

function resolvePayoutAmount(
  proposal: ProposalReviewOption,
  assetSymbol: ServiceHandoffAssetSymbol,
) {
  if (proposal.amount === null) return "";
  if (assetSymbol === "SOL" && proposal.mintSymbol === "SOL") {
    return String(proposal.amount);
  }
  if (assetSymbol === proposal.mintSymbol) {
    return String(proposal.amount);
  }
  return "";
}

function buildPayoutAmountDisplay(
  amount: string,
  assetSymbol: ServiceHandoffAssetSymbol,
) {
  if (amount.trim().length > 0) {
    return `${amount} ${assetSymbol}`;
  }

  return `${assetSymbol} sender amount ready for review`;
}

function buildPayoutReference(
  proposal: ProposalReviewOption,
  payout: PayoutRouteOption,
) {
  return `${proposal.id}-${payout.slug}`.toUpperCase();
}

function LaneButtons({
  actions,
  activeLane,
  onChange,
}: {
  actions: WalletFirstServiceAction[];
  activeLane: LaneSlug;
  onChange: (value: LaneSlug) => void;
}) {
  return (
    <div className="grid gap-3 xl:grid-cols-3">
      {actions.map((action) => {
        const Icon = laneMeta[action.slug].icon;
        const isActive = action.slug === activeLane;

        return (
          <button
            key={action.slug}
            type="button"
            onClick={() => onChange(action.slug)}
            className={cn(
              "rounded-[24px] border p-4 text-left transition",
              isActive
                ? "border-fuchsia-300/28 bg-fuchsia-300/[0.12] text-white"
                : "border-white/8 bg-white/[0.03] text-white/82 hover:bg-white/[0.05]",
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-2xl border",
                  isActive
                    ? "border-fuchsia-300/35 bg-black/25 text-fuchsia-100"
                    : "border-white/10 bg-black/20 text-fuchsia-200",
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-white/42">
                  {laneMeta[action.slug].eyebrow}
                </div>
                <div className="mt-1 text-base font-medium">{action.title}</div>
              </div>
            </div>
            <div className="mt-3 text-sm leading-7 text-white/58">{action.summary}</div>
            <div className="mt-4 rounded-[18px] border border-white/8 bg-black/20 p-3">
              <div className="text-[11px] uppercase tracking-[0.2em] text-white/38">Current state</div>
              <div className="mt-2 text-sm font-medium text-white">{action.state}</div>
              <div className="mt-2 text-sm leading-7 text-white/54">{action.stateDetail}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ProposalReviewForm({
  proposals,
  selectedId,
  onChange,
}: {
  proposals: ProposalReviewOption[];
  selectedId: string;
  onChange: (value: string) => void;
}) {
  const selected = useMemo(
    () => proposals.find((item) => item.id === selectedId) ?? proposals[0],
    [proposals, selectedId],
  );

  if (!selected) return null;

  return (
    <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
      <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
        <div className="text-[11px] uppercase tracking-[0.24em] text-white/40">Prefilled review context</div>
        <div className="mt-4 grid gap-2">
          {proposals.map((proposal) => (
            <button
              key={proposal.id}
              type="button"
              onClick={() => onChange(proposal.id)}
              className={cn(
                "rounded-2xl border px-4 py-3 text-left text-sm transition",
                proposal.id === selected.id
                  ? "border-cyan-300/30 bg-cyan-300/12 text-cyan-100"
                  : "border-white/8 bg-black/20 text-white/68 hover:bg-white/[0.05]",
              )}
            >
              <div className="font-medium">{proposal.id}</div>
              <div className="mt-1 text-white/54">{proposal.title}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-[24px] border border-white/8 bg-black/20 p-5">
        <div className="text-[11px] uppercase tracking-[0.24em] text-white/40">Selected proposal</div>
        <div className="mt-3 text-xl font-medium text-white">{selected.title}</div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/38">Status</div>
            <div className="mt-2 text-sm font-medium text-white">{selected.status}</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/38">Window</div>
            <div className="mt-2 text-sm font-medium text-white">{selected.window}</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/38">Treasury</div>
            <div className="mt-2 text-sm font-medium text-white">{selected.treasury}</div>
          </div>
        </div>
        <div className="mt-4 text-sm leading-7 text-white/58">{selected.summary}</div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link href={selected.primaryHref} className={cn(buttonVariants({ variant: "secondary" }), "justify-between")}>
            {selected.primaryLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href={selected.proofHref} className={cn(buttonVariants({ variant: "outline" }), "justify-between")}>
            {selected.proofLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function PayoutRouteForm({
  payouts,
  selectedSlug,
  handoffQuery,
  onChange,
}: {
  payouts: PayoutRouteOption[];
  selectedSlug: PayoutRouteOption["slug"] | "";
  handoffQuery: string;
  onChange: (value: PayoutRouteOption["slug"]) => void;
}) {
  const selected = useMemo(
    () => payouts.find((item) => item.slug === selectedSlug) ?? payouts[0],
    [payouts, selectedSlug],
  );

  if (!selected) return null;

  const continueHref =
    selected.slug === "pilot-funding"
      ? `/services${handoffQuery ? `?${handoffQuery}` : ""}#service-handoff`
      : `/govern${handoffQuery ? `?${handoffQuery}` : ""}#service-handoff`;
  const continueLabel =
    selected.slug === "pilot-funding" ? "Continue with funded services flow" : "Continue with governed payout flow";

  return (
    <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
      <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
        <div className="text-[11px] uppercase tracking-[0.24em] text-white/40">Governed profile selection</div>
        <div className="mt-4 grid gap-2">
          {payouts.map((item) => (
            <button
              key={item.slug}
              type="button"
              onClick={() => onChange(item.slug)}
              className={cn(
                "rounded-2xl border px-4 py-3 text-left text-sm transition",
                item.slug === selected.slug
                  ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
                  : "border-white/8 bg-black/20 text-white/68 hover:bg-white/[0.05]",
              )}
            >
              <div className="font-medium">{item.title}</div>
              <div className="mt-1 text-white/54">{item.routeFocus}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-[24px] border border-white/8 bg-black/20 p-5">
        <div className="text-[11px] uppercase tracking-[0.24em] text-white/40">Selected payout corridor</div>
        <div className="mt-3 text-xl font-medium text-white">{selected.title}</div>
        <div className="mt-3 text-sm leading-7 text-white/58">{selected.summary}</div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/38">Readiness</div>
            <div className="mt-2 text-sm font-medium text-white">{selected.state}</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/38">Route focus</div>
            <div className="mt-2 text-sm font-medium text-white">{selected.routeFocus}</div>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm leading-7 text-white/58">
          {selected.stateDetail}
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link href={continueHref} className={cn(buttonVariants({ variant: "secondary" }), "justify-between")}>
            {continueLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href={selected.proofHref} className={cn(buttonVariants({ variant: "outline" }), "justify-between")}>
            {selected.proofLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function TelemetryInspectorForm({
  modes,
  selectedSlug,
  onChange,
}: {
  modes: TelemetryInspectorMode[];
  selectedSlug: TelemetryInspectorMode["slug"] | "";
  onChange: (value: TelemetryInspectorMode["slug"]) => void;
}) {
  const selected = useMemo(
    () => modes.find((item) => item.slug === selectedSlug) ?? modes[0],
    [modes, selectedSlug],
  );

  if (!selected) return null;

  return (
    <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
      <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
        <div className="text-[11px] uppercase tracking-[0.24em] text-white/40">Live mode switch</div>
        <div className="mt-4 grid gap-2">
          {modes.map((mode) => (
            <button
              key={mode.slug}
              type="button"
              onClick={() => onChange(mode.slug)}
              className={cn(
                "rounded-2xl border px-4 py-3 text-left text-sm transition",
                mode.slug === selected.slug
                  ? "border-cyan-300/30 bg-cyan-300/12 text-cyan-100"
                  : "border-white/8 bg-black/20 text-white/68 hover:bg-white/[0.05]",
              )}
            >
              <div className="font-medium">{mode.title}</div>
              <div className="mt-1 text-white/54">{mode.summary}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-[24px] border border-white/8 bg-black/20 p-5">
        <div className="text-[11px] uppercase tracking-[0.24em] text-white/40">Selected telemetry mode</div>
        <div className="mt-3 text-xl font-medium text-white">{selected.title}</div>
        <div className="mt-3 text-sm leading-7 text-white/58">{selected.summary}</div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/38">State</div>
            <div className="mt-2 text-sm font-medium text-white">{selected.state}</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/38">Mode detail</div>
            <div className="mt-2 text-sm font-medium text-white">{selected.stateDetail}</div>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link href={selected.primaryHref} className={cn(buttonVariants({ variant: "secondary" }), "justify-between")}>
            {selected.primaryLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href={selected.proofHref} className={cn(buttonVariants({ variant: "outline" }), "justify-between")}>
            {selected.proofLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function WalletFirstServiceActionsWorkbench({
  context,
  data,
}: WalletFirstServiceActionsWorkbenchProps) {
  const searchParams = useSearchParams();
  const storedState = useSyncExternalStore(subscribeToStorage, getStoredSnapshot, () => null);
  const sectionCopy = copy[context];
  const queryState = readServiceHandoffState(searchParams);
  const initialState = useMemo(() => queryState ?? storedState, [queryState, storedState]);
  const [manualLane, setManualLane] = useState<LaneSlug | "">("");
  const [selectedProposalId, setSelectedProposalId] = useState("");
  const [selectedPayoutSlug, setSelectedPayoutSlug] = useState<PayoutRouteOption["slug"] | "">("");
  const [selectedTelemetrySlug, setSelectedTelemetrySlug] = useState<TelemetryInspectorMode["slug"] | "">("");

  const activeLane = useMemo<LaneSlug>(() => {
    if (manualLane) return manualLane;

    if (context === "services" && initialState && data.payouts.some((item) => item.slug === initialState.payoutProfile)) {
      return "payout-route-selection";
    }

    if (context === "command-center" && initialState && data.proposals.some((item) => item.id === initialState.proposalId)) {
      return "proposal-review";
    }

    if (initialState && data.telemetryModes.some((item) => item.slug === initialState.telemetryMode)) {
      return "telemetry-inspection";
    }

    return "proposal-review";
  }, [context, data.payouts, data.proposals, data.telemetryModes, initialState, manualLane]);

  const selectedProposal = useMemo(
    () =>
      data.proposals.find((item) => item.id === selectedProposalId) ??
      (initialState && data.proposals.find((item) => item.id === initialState.proposalId)) ??
      data.proposals[0],
    [data.proposals, initialState, selectedProposalId],
  );
  const selectedPayout = useMemo(
    () =>
      data.payouts.find((item) => item.slug === selectedPayoutSlug) ??
      (initialState && data.payouts.find((item) => item.slug === initialState.payoutProfile)) ??
      data.payouts[0],
    [data.payouts, initialState, selectedPayoutSlug],
  );
  const selectedTelemetry = useMemo(
    () =>
      data.telemetryModes.find((item) => item.slug === selectedTelemetrySlug) ??
      (initialState && data.telemetryModes.find((item) => item.slug === initialState.telemetryMode)) ??
      data.telemetryModes[0],
    [data.telemetryModes, initialState, selectedTelemetrySlug],
  );

  const handoffState = useMemo(() => {
    if (!selectedProposal || !selectedPayout || !selectedTelemetry) return null;
    return buildStoredHandoffState(context, selectedProposal, selectedPayout, selectedTelemetry);
  }, [context, selectedPayout, selectedProposal, selectedTelemetry]);

  useEffect(() => {
    if (!handoffState || typeof window === "undefined") return;
    const storedState = readStoredServiceHandoffState();
    const sameSelection =
      storedState?.proposalId === handoffState.proposalId &&
      storedState?.payoutProfile === handoffState.payoutProfile &&
      storedState?.telemetryMode === handoffState.telemetryMode;

    if (sameSelection && storedState) {
      const preserveStoredPayoutIntent =
        Boolean(storedState.payoutIntent?.amount?.trim()) ||
        storedState.requestDelivery?.state === "staged" ||
        storedState.requestDelivery?.state === "delivered";
      const preserveStoredRequestPayload =
        storedState.requestDelivery?.state === "staged" ||
        storedState.requestDelivery?.state === "delivered" ||
        Boolean(storedState.requestPayload);
      const mergedState: ServiceHandoffState = {
        ...handoffState,
        proposalReview: storedState.proposalReview ?? handoffState.proposalReview,
        payoutIntent: preserveStoredPayoutIntent
          ? storedState.payoutIntent ?? handoffState.payoutIntent
          : handoffState.payoutIntent,
        telemetrySelection: storedState.telemetrySelection ?? handoffState.telemetrySelection,
        requestDelivery: storedState.requestDelivery ?? handoffState.requestDelivery,
        requestPayload: preserveStoredRequestPayload
          ? storedState.requestPayload ?? handoffState.requestPayload
          : handoffState.requestPayload,
        source: preserveStoredPayoutIntent ? storedState.source : handoffState.source,
        updatedAt: preserveStoredPayoutIntent ? storedState.updatedAt : handoffState.updatedAt,
      };

      if (JSON.stringify(mergedState) !== JSON.stringify(storedState)) {
        writeStoredServiceHandoffState(mergedState);
      }
      return;
    }

    writeStoredServiceHandoffState(handoffState);
  }, [handoffState]);

  const handoffQuery = handoffState ? buildServiceHandoffQuery(handoffState) : "";

  return (
    <Card className="border-fuchsia-300/14 bg-[linear-gradient(180deg,rgba(19,12,34,0.95),rgba(11,9,24,0.98))]">
      <CardHeader className="gap-3">
        <div className="text-[11px] uppercase tracking-[0.3em] text-fuchsia-200/80">Wallet-first actions</div>
        <CardTitle>{sectionCopy.title}</CardTitle>
        <div className="max-w-4xl text-sm leading-7 text-white/58">{sectionCopy.description}</div>
      </CardHeader>
      <CardContent className="space-y-5">
        <LaneButtons actions={data.actions} activeLane={activeLane} onChange={setManualLane} />

        {handoffState ? (
          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
              <div className="text-[11px] uppercase tracking-[0.24em] text-white/40">Payout intent summary</div>
              <div className="mt-3 text-base font-medium text-white">{selectedPayout.title}</div>
              <div className="mt-2 text-sm leading-7 text-white/58">{selectedPayout.summary}</div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-white/38">Proposal context</div>
                  <div className="mt-2 text-sm font-medium text-white">{selectedProposal.id}</div>
                  <div className="mt-1 text-sm text-white/54">{selectedProposal.title}</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-white/38">Telemetry persistence</div>
                  <div className="mt-2 text-sm font-medium text-white">{selectedTelemetry.title}</div>
                  <div className="mt-1 text-sm text-white/54">Stored for services and govern handoff</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-white/38">Prefilled request</div>
                  <div className="mt-2 text-sm font-medium text-white">
                    {handoffState.payoutIntent?.assetSymbol ?? "SOL"}
                    {handoffState.payoutIntent?.amount
                      ? ` · ${handoffState.payoutIntent.amount}`
                      : " · amount left open for sender input"}
                  </div>
                  <div className="mt-1 text-sm text-white/54">
                    {handoffState.payoutIntent?.reference ?? "Reference ready"}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-white/38">Execution target</div>
                  <div className="mt-2 text-sm text-white/68">
                    {handoffState.payoutIntent?.executionTarget ?? selectedProposal.executionTarget}
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/20 p-5">
              <div className="text-[11px] uppercase tracking-[0.24em] text-white/40">Selected route payload</div>
              <div className="mt-3 break-all rounded-2xl border border-white/8 bg-white/[0.03] p-4 font-mono text-xs leading-6 text-white/64">
                proposal={handoffState.proposalId}&amp;profile={handoffState.payoutProfile}&amp;telemetryMode={handoffState.telemetryMode}&amp;handoff=1
              </div>
              <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-xs leading-6 text-white/62">
                request.asset={handoffState.payoutIntent?.assetSymbol ?? "SOL"} · request.reference=
                {handoffState.payoutIntent?.reference ?? "pending"} · lane={handoffState.payoutIntent?.lane ?? "buyer"}
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link href={`/services?${handoffQuery}#service-handoff`} className={cn(buttonVariants({ variant: "secondary" }), "justify-between")}>
                  Continue in services
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href={`/govern?${handoffQuery}#service-handoff`} className={cn(buttonVariants({ variant: "outline" }), "justify-between")}>
                  Continue in govern
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href={`/analytics?${handoffQuery}#telemetry-inspection`} className={cn(buttonVariants({ variant: "outline" }), "justify-between")}>
                  Continue telemetry inspection
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href={`/diagnostics?${handoffQuery}`} className={cn(buttonVariants({ variant: "outline" }), "justify-between")}>
                  Continue diagnostics
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href={`/network?${handoffQuery}`} className={cn(buttonVariants({ variant: "outline" }), "justify-between")}>
                  Continue network
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {activeLane === "proposal-review" ? (
          <ProposalReviewForm proposals={data.proposals} selectedId={selectedProposalId} onChange={setSelectedProposalId} />
        ) : null}
        {activeLane === "payout-route-selection" ? (
          <PayoutRouteForm
            payouts={data.payouts}
            selectedSlug={selectedPayoutSlug}
            handoffQuery={handoffQuery}
            onChange={setSelectedPayoutSlug}
          />
        ) : null}
        {activeLane === "telemetry-inspection" ? (
          <TelemetryInspectorForm modes={data.telemetryModes} selectedSlug={selectedTelemetrySlug} onChange={setSelectedTelemetrySlug} />
        ) : null}
      </CardContent>
    </Card>
  );
}
