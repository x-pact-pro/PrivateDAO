"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CheckCircle2, Clipboard, Coins, Download, FileCheck2, Landmark, ShieldCheck, Wallet } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  buildServiceHandoffQuery,
  readStoredServiceHandoffState,
  type ServiceHandoffAssetSymbol,
  type ServiceHandoffRequestDelivery,
  type ServiceHandoffTreasuryRoutePlan,
  writeStoredServiceHandoffState,
} from "@/lib/service-handoff-state";
import { getProposalById } from "@/lib/site-data";
import { getTreasuryReceiveConfig } from "@/lib/treasury-receive-config";
import { useServiceHandoffSnapshot } from "@/lib/use-service-handoff-snapshot";
import { cn } from "@/lib/utils";

const assetIconMap = {
  SOL: Wallet,
  USDC: Coins,
  AUDD: Landmark,
  PUSD: ShieldCheck,
  USDG: Landmark,
} as const;

const quoteReviewModes = [
  {
    value: "manual-review",
    label: "Manual review",
    summary: "Require an explicit operator review of the route and quote before the request moves into governed delivery.",
  },
  {
    value: "policy-bound",
    label: "Policy-bound review",
    summary: "Accept the route when treasury policy and slippage thresholds already match the approved operating range.",
  },
  {
    value: "operator-fast-path",
    label: "Operator fast path",
    summary: "Use a faster route review when the treasury is moving inside a known operating band and the destination asset is pre-approved.",
  },
] as const;

const executionPreferences = [
  {
    value: "best-price",
    label: "Best price",
    summary: "Optimize for the strongest route outcome when the treasury can tolerate a longer review cycle.",
  },
  {
    value: "stable-settlement",
    label: "Stable settlement",
    summary: "Bias the route toward stable funding and clearer payout settlement behavior.",
  },
  {
    value: "fast-execution",
    label: "Fast execution",
    summary: "Bias the route toward fast operator completion inside a tighter execution window.",
  },
] as const;

const slippageBands = [
  {
    value: "30",
    label: "30 bps",
    summary: "Tighter treasury discipline for payout funding or narrow rebalance motions.",
  },
  {
    value: "75",
    label: "75 bps",
    summary: "Balanced setting for most governed treasury motions.",
  },
  {
    value: "125",
    label: "125 bps",
    summary: "Wider operating range for more flexible treasury rebalances when explicitly reviewed.",
  },
] as const;

const handoffLanes = [
  {
    value: "buyer",
    label: "Buyer lane",
    summary: "Use for pilot funding, treasury top-ups, and commercial onboarding.",
    routes: [
      { label: "Engage", href: "/engage" },
      { label: "Services", href: "/services" },
    ],
  },
  {
    value: "operator",
    label: "Operator lane",
    summary: "Use for infrastructure support, wallet operations, and RPC-backed treasury handling.",
    routes: [
      { label: "Govern", href: "/govern" },
      { label: "Diagnostics", href: "/diagnostics" },
    ],
  },
  {
    value: "support",
    label: "Support lane",
    summary: "Use when the sender needs help validating the right route, asset, or funding context first.",
    routes: [
      { label: "Assistant", href: "/assistant" },
      { label: "Community", href: "/community" },
    ],
  },
] as const;

const destinationProfiles = [
  {
    value: "agentic-micropayment-rail",
    label: "Agentic micropayment rail",
    summary: "Prepare a governed micropayment batch so one approved treasury action can fan out into reviewer-visible Testnet settlement events.",
    defaultAsset: "USDC" as const,
    defaultAmount: "0.01",
    defaultLane: "operator",
    defaultPurpose: "Agentic treasury micropayment batch triggered by DAO approval and carried into runtime proof, judge logs, and analytics.",
    intake: "payments",
    nextRoutes: [
      { label: "Services", href: "/services#jupiter-treasury-route" },
      { label: "Govern", href: "/govern" },
      { label: "Judge", href: "/judge" },
    ],
  },
  {
    value: "treasury-rebalance",
    label: "Treasury rebalance",
    summary: "Prepare a governed asset-motion request so the treasury can rebalance into the right settlement asset with a clear route rationale.",
    defaultAsset: "SOL" as const,
    defaultAmount: "0.25",
    defaultLane: "operator",
    defaultPurpose: "Treasury rebalance request routed through governed asset-motion policy and reviewer-visible settlement discipline.",
    intake: "payments",
    nextRoutes: [
      { label: "Services", href: "/services#jupiter-treasury-route" },
      { label: "Govern", href: "/govern" },
    ],
  },
  {
    value: "treasury-top-up",
    label: "Treasury top-up",
    summary: "Route capital into the treasury for runway, governance execution, and shared operating capacity.",
    defaultAsset: "SOL" as const,
    defaultAmount: "0.02",
    defaultLane: "buyer",
    defaultPurpose: "Treasury top-up for governance runway and shared Testnet operations.",
    intake: "payments",
    nextRoutes: [
      { label: "Services", href: "/services" },
      { label: "Govern", href: "/govern" },
    ],
  },
  {
    value: "pilot-funding",
    label: "Pilot funding",
    summary: "Fund a time-boxed pilot so the buyer path stays tied to a real product and measurable Testnet execution.",
    defaultAsset: "USDC" as const,
    defaultAmount: "250",
    defaultLane: "buyer",
    defaultPurpose: "Pilot funding for PrivateDAO rollout, buyer onboarding, and measured Testnet validation.",
    intake: "pilot",
    nextRoutes: [
      { label: "Engage", href: "/engage" },
      { label: "Services", href: "/services" },
    ],
  },
  {
    value: "audd-merchant-settlement",
    label: "AUDD merchant settlement",
    summary: "Prepare a governed AUDD settlement request for merchant flows, service billing, or Australian-dollar invoice collection.",
    defaultAsset: "AUDD" as const,
    defaultAmount: "150",
    defaultLane: "buyer",
    defaultPurpose: "AUDD merchant settlement request tied to governance review, service delivery, and reviewer-visible payment proof.",
    intake: "payments",
    nextRoutes: [
      { label: "Services", href: "/services#treasury-payment-request" },
      { label: "Judge", href: "/judge" },
      { label: "Proof", href: "/proof?judge=1" },
    ],
  },
  {
    value: "audd-treasury-settlement",
    label: "AUDD treasury settlement",
    summary: "Prepare a governed AUDD treasury request for reserve management, supplier settlement, or programmable Australian-dollar finance.",
    defaultAsset: "AUDD" as const,
    defaultAmount: "500",
    defaultLane: "operator",
    defaultPurpose: "AUDD treasury settlement request approved by governance and attached to routing, settlement, and treasury evidence.",
    intake: "payments",
    nextRoutes: [
      { label: "Govern", href: "/govern" },
      { label: "Services", href: "/services#jupiter-treasury-route" },
      { label: "Documents", href: "/documents/audd-stablecoin-treasury-layer" },
    ],
  },
  {
    value: "pusd-confidential-payroll",
    label: "PUSD confidential payroll",
    summary: "Prepare a governed Palm USD payroll or contributor payment request with stablecoin settlement and privacy-aware approval context.",
    defaultAsset: "PUSD" as const,
    defaultAmount: "25",
    defaultLane: "operator",
    defaultPurpose: "PUSD confidential payroll request approved by DAO governance and attached to proof, privacy, and settlement evidence.",
    intake: "payments",
    nextRoutes: [
      { label: "Govern", href: "/govern" },
      { label: "Services", href: "/services#treasury-payment-request" },
      { label: "Judge", href: "/judge" },
    ],
  },
  {
    value: "pusd-gaming-reward-pool",
    label: "PUSD gaming reward pool",
    summary: "Prepare a governed Palm USD reward distribution request for gaming DAOs, guilds, tournaments, and creator economies.",
    defaultAsset: "PUSD" as const,
    defaultAmount: "100",
    defaultLane: "operator",
    defaultPurpose: "PUSD gaming DAO reward pool funded through governance approval, confidential review, and explorer-visible settlement.",
    intake: "payments",
    nextRoutes: [
      { label: "Products", href: "/products" },
      { label: "Govern", href: "/govern" },
      { label: "Proof", href: "/proof?judge=1" },
    ],
  },
  {
    value: "vendor-payout",
    label: "Vendor payout",
    summary: "Prepare a governed payout for an external service provider with clear operational routing and evidence.",
    defaultAsset: "USDC" as const,
    defaultAmount: "250",
    defaultLane: "operator",
    defaultPurpose: "Vendor payout request routed through governed treasury operations.",
    intake: "payments",
    nextRoutes: [
      { label: "Govern", href: "/govern" },
      { label: "Diagnostics", href: "/diagnostics" },
    ],
  },
  {
    value: "contributor-payout",
    label: "Contributor payout",
    summary: "Issue a governed payout for contributors, builders, or operators while preserving treasury discipline.",
    defaultAsset: "USDC" as const,
    defaultAmount: "50",
    defaultLane: "operator",
    defaultPurpose: "Contributor payout request for governed treasury execution.",
    intake: "payments",
    nextRoutes: [
      { label: "Govern", href: "/govern" },
      { label: "Security", href: "/security" },
    ],
  },
] as const;

const treasuryReviewerLinks = [
  { label: "Canonical custody proof", href: "/documents/canonical-custody-proof" },
  { label: "Custody reviewer packet", href: "/documents/custody-proof-reviewer-packet" },
  { label: "Launch trust packet", href: "/documents/launch-trust-packet" },
  { label: "Mainnet blockers", href: "/documents/mainnet-blockers" },
] as const;

const treasurySendingChecklist = [
  "Confirm the destination profile before sending funds.",
  "Copy the exact public address for the chosen asset rail.",
  "Attach a reference string so the payment request can be matched to the treasury packet.",
  "Open the custody proof and launch trust packet if the sender needs reviewer-grade operating truth.",
] as const;

function buildSolanaExplorerHref(address: string, network: string) {
  const cluster = network.toLowerCase().includes("testnet")
    ? "?cluster=testnet"
    : network.toLowerCase().includes("devnet")
      ? "?cluster=devnet"
      : "";
  return `https://solscan.io/account/${address}${cluster}`;
}

function resolveSupportedAsset(
  assets: Array<{ symbol: "SOL" | "USDC" | "AUDD" | "PUSD" | "USDG" }>,
  requestedAsset: ServiceHandoffAssetSymbol,
) {
  return assets.some((asset) => asset.symbol === requestedAsset)
    ? requestedAsset
    : "SOL";
}

function buildProposalBackedPrefill(
  proposalId: string,
  profileValue: (typeof destinationProfiles)[number]["value"],
) {
  const proposal = getProposalById(proposalId);
  const profile = destinationProfiles.find((item) => item.value === profileValue);
  if (!proposal || !profile) return null;

  const supportedMint =
    proposal.execution.mintSymbol === "SOL" ||
    proposal.execution.mintSymbol === "USDC" ||
    proposal.execution.mintSymbol === "AUDD" ||
    proposal.execution.mintSymbol === "PUSD" ||
    proposal.execution.mintSymbol === "USDG"
      ? proposal.execution.mintSymbol
      : null;
  const assetSymbol: ServiceHandoffAssetSymbol = supportedMint ?? profile.defaultAsset;

  return {
    assetSymbol,
    lane: profile.defaultLane,
    reference: `${proposal.id}-${profile.value}`.toUpperCase(),
    amount:
      proposal.execution.amount !== null && supportedMint === assetSymbol
        ? String(proposal.execution.amount)
        : profile.defaultAmount,
    purpose: `${profile.label} for ${proposal.id} · ${proposal.title}`,
  };
}

function buildTreasuryRoutePlan(params: {
  profile: (typeof destinationProfiles)[number];
  assetSymbol: ServiceHandoffAssetSymbol;
  destinationAsset: ServiceHandoffAssetSymbol;
  amount: string;
  routeFocus: string;
  quoteReviewMode: (typeof quoteReviewModes)[number]["value"];
  executionPreference: (typeof executionPreferences)[number]["value"];
  slippageBandBps: string;
}): ServiceHandoffTreasuryRoutePlan {
  const {
    profile,
    assetSymbol,
    destinationAsset,
    amount,
    routeFocus,
    quoteReviewMode,
    executionPreference,
    slippageBandBps,
  } = params;
  const normalizedAmount = amount.trim();
  const executionMode =
    profile.value === "agentic-micropayment-rail"
      ? "agent-triggered micropayment batch"
      : profile.value === "audd-merchant-settlement"
        ? "AUDD merchant settlement"
      : profile.value === "audd-treasury-settlement"
        ? "AUDD treasury management settlement"
      : profile.value === "pusd-confidential-payroll"
        ? "PUSD confidential payroll settlement"
      : profile.value === "pusd-gaming-reward-pool"
        ? "PUSD gaming DAO reward settlement"
      : profile.value === "vendor-payout" || profile.value === "contributor-payout"
      ? "quote-aware payout funding"
      : profile.value === "treasury-rebalance"
        ? "governed treasury rebalance"
      : profile.value === "pilot-funding"
        ? "pilot funding rebalance"
        : "governed treasury rebalance";

  return {
    routeProvider:
      destinationAsset === "PUSD"
        ? "Palm USD treasury lane"
        : destinationAsset === "AUDD"
          ? "AUDD treasury lane"
          : "Jupiter-backed treasury lane",
    executionMode,
    sourceAssetHint:
      assetSymbol === destinationAsset ? "Treasury active asset mix" : `${assetSymbol} treasury position`,
    destinationAsset,
    quoteReviewMode,
    executionPreference,
    slippageBandBps,
    quotePolicy:
      normalizedAmount.length > 0
        ? profile.value === "agentic-micropayment-rail"
          ? `Prepare a governed micropayment batch for ${normalizedAmount} ${assetSymbol} into ${destinationAsset}, then preserve the route and batch logic before agent execution starts.`
          : destinationAsset === "PUSD"
            ? `Prepare a governed PUSD settlement request for ${normalizedAmount} ${assetSymbol} into Palm USD, then attach privacy, payroll, or reward context before execution.`
            : destinationAsset === "AUDD"
              ? `Prepare a governed AUDD settlement request for ${normalizedAmount} ${assetSymbol} into Australian-dollar stable settlement, then attach merchant, treasury, or invoicing context before execution.`
          : `Prepare route preview for ${normalizedAmount} ${assetSymbol} into ${destinationAsset} under ${quoteReviewMode} before delivery.`
        : `Prepare quote preview once a final ${assetSymbol} amount is attached to the request object.`,
    slippagePolicy:
      profile.value === "agentic-micropayment-rail"
        ? `Keep agent execution inside the ${slippageBandBps} bps band so high-frequency settlement stays readable for operators, reviewers, and treasury audit follow-through.`
        : profile.value === "vendor-payout" || profile.value === "contributor-payout"
        ? `Keep payout funding inside the ${slippageBandBps} bps band and preserve the route rationale beside settlement evidence.`
        : `Use the ${slippageBandBps} bps band with ${executionPreference} preference and preserve the route rationale inside the governed treasury packet.`,
    routeRationale:
      profile.value === "agentic-micropayment-rail"
        ? `${routeFocus} This route keeps policy approval, batch execution, and per-transfer proof inside one reviewer-visible treasury lane.`
        : destinationAsset === "PUSD"
          ? `${routeFocus} This route turns PUSD into a governed stablecoin settlement rail for payroll, grants, commerce, and gaming DAO rewards.`
          : destinationAsset === "AUDD"
            ? `${routeFocus} This route turns AUDD into a governed Australian-dollar settlement rail for merchant tools, treasury reserves, invoices, and programmable finance.`
        : `${routeFocus} This route keeps treasury motion readable for operators and reviewers without breaking the governed execution story.`,
    reviewerPath:
      profile.value === "agentic-micropayment-rail"
        ? "/documents/agentic-treasury-micropayment-rail"
        : destinationAsset === "PUSD"
          ? "/documents/pusd-stablecoin-treasury-layer"
          : destinationAsset === "AUDD"
            ? "/documents/audd-stablecoin-treasury-layer"
        : "/documents/jupiter-treasury-route",
    settlementPath: "/documents/settlement-receipt-closure",
  };
}

function formatSelectionLabel<
  T extends ReadonlyArray<{ value: string; label: string }>
>(options: T, value: string) {
  return options.find((item) => item.value === value)?.label ?? value;
}

function getAllowedDestinationAssets(
  profile: (typeof destinationProfiles)[number]["value"],
  assets: Array<{ symbol: "SOL" | "USDC" | "AUDD" | "PUSD" | "USDG"; name: string }>,
  sourceAsset: ServiceHandoffAssetSymbol,
) {
  if (
    profile === "agentic-micropayment-rail" ||
    profile === "audd-merchant-settlement" ||
    profile === "audd-treasury-settlement" ||
    profile === "pusd-confidential-payroll" ||
    profile === "pusd-gaming-reward-pool" ||
    profile === "vendor-payout" ||
    profile === "contributor-payout" ||
    profile === "pilot-funding"
  ) {
    return assets.filter((asset) => asset.symbol === "USDC" || asset.symbol === "AUDD" || asset.symbol === "PUSD" || asset.symbol === "USDG");
  }

  if (profile === "treasury-top-up") {
    return assets.filter(
      (asset) =>
        asset.symbol === sourceAsset || asset.symbol === "USDC" || asset.symbol === "AUDD" || asset.symbol === "PUSD" || asset.symbol === "USDG",
    );
  }

  return assets;
}

export function TreasuryReceiveSurface() {
  const config = getTreasuryReceiveConfig();
  const [copied, setCopied] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<(typeof config.assets)[number]["symbol"]>("SOL");
  const [profile, setProfile] = useState<(typeof destinationProfiles)[number]["value"]>("treasury-top-up");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [lane, setLane] = useState<(typeof handoffLanes)[number]["value"]>("buyer");
  const [destinationAsset, setDestinationAsset] = useState<ServiceHandoffAssetSymbol>("USDC");
  const [quoteReviewMode, setQuoteReviewMode] = useState<(typeof quoteReviewModes)[number]["value"]>("manual-review");
  const [executionPreference, setExecutionPreference] = useState<(typeof executionPreferences)[number]["value"]>("stable-settlement");
  const [slippageBandBps, setSlippageBandBps] = useState<(typeof slippageBands)[number]["value"]>("75");
  const [requestPreparedAt, setRequestPreparedAt] = useState<string>("pending-client-hydration");
  const handoff = useServiceHandoffSnapshot("services");
  const appliedHandoffKeyRef = useRef<string | null>(null);
  const persistedPayloadSignatureRef = useRef<string | null>(null);
  const requestDeliveryOverrideRef = useRef<ServiceHandoffRequestDelivery["state"] | null>(null);
  const [localDeliveryState, setLocalDeliveryState] = useState<ServiceHandoffRequestDelivery["state"] | null>(null);
  const activeAsset = config.assets.find((asset) => asset.symbol === selectedAsset) ?? config.assets[0];
  const activeProfile = destinationProfiles.find((item) => item.value === profile) ?? destinationProfiles[0];
  const activeLane = handoffLanes.find((item) => item.value === lane) ?? handoffLanes[0];
  const allowedDestinationAssets = useMemo(
    () => getAllowedDestinationAssets(activeProfile.value, config.assets, activeAsset.symbol),
    [activeAsset.symbol, activeProfile.value, config.assets],
  );
  const normalizedDestinationAsset = useMemo(
    () =>
      allowedDestinationAssets.some((asset) => asset.symbol === destinationAsset)
        ? destinationAsset
        : (allowedDestinationAssets[0]?.symbol ?? activeAsset.symbol),
    [activeAsset.symbol, allowedDestinationAssets, destinationAsset],
  );
  const persistedHandoff = handoff ?? readStoredServiceHandoffState();
  const handoffProfile = handoff?.payoutProfile ?? null;
  const allowStoredServicesHydration = Boolean(handoff?.payoutIntent);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (handoff?.payoutProfile === activeProfile.value) {
      return;
    }

    const defaultAsset = resolveSupportedAsset(config.assets, activeProfile.defaultAsset);
    setLane(activeProfile.defaultLane);
    setSelectedAsset(defaultAsset);
    setDestinationAsset(defaultAsset === "SOL" ? "USDC" : defaultAsset);
    setReference(`${activeProfile.value.toUpperCase()}-REQUEST-READY`);
    setAmount(activeProfile.defaultAmount);
    setPurpose(activeProfile.defaultPurpose);
    setQuoteReviewMode(
      activeProfile.value === "treasury-rebalance" || activeProfile.value === "agentic-micropayment-rail"
        ? "policy-bound"
        : "manual-review",
    );
    setExecutionPreference(
      activeProfile.value === "treasury-rebalance"
        ? "best-price"
        : activeProfile.value === "agentic-micropayment-rail"
          ? "fast-execution"
          : "stable-settlement",
    );
    setSlippageBandBps(
      activeProfile.value === "vendor-payout" ||
      activeProfile.value === "contributor-payout" ||
      activeProfile.value === "agentic-micropayment-rail"
        ? "30"
        : "75",
    );
  }, [activeProfile, config.assets, handoff?.payoutProfile]);

  useEffect(() => {
    setRequestPreparedAt(new Date().toISOString());
  }, []);

  useEffect(() => {
    if (!handoff) return;

    const handoffKey = `${handoff.proposalId}:${handoff.payoutProfile}:${handoff.telemetryMode}`;
    if (appliedHandoffKeyRef.current === handoffKey) return;
    const proposalBackedPrefill = buildProposalBackedPrefill(handoff.proposalId, handoff.payoutProfile);
    const handoffProfileConfig =
      destinationProfiles.find((item) => item.value === handoff.payoutProfile) ??
      destinationProfiles[0];

    setProfile(handoff.payoutProfile);

    const shouldUseProposalBackedPrefill =
      Boolean(proposalBackedPrefill) &&
      (
        !handoff.payoutIntent ||
        handoff.payoutIntent.reference.endsWith("REQUEST-PENDING") ||
        handoff.payoutIntent.reference.endsWith("REQUEST-READY") ||
        !handoff.payoutIntent.amount ||
        handoff.payoutIntent.purpose === handoffProfileConfig.defaultPurpose ||
        handoff.payoutIntent.executionTarget.startsWith("Treasury receive rail")
      );

    if (shouldUseProposalBackedPrefill && proposalBackedPrefill) {
      setSelectedAsset(resolveSupportedAsset(config.assets, proposalBackedPrefill.assetSymbol));
      setLane(proposalBackedPrefill.lane);
      setDestinationAsset(proposalBackedPrefill.assetSymbol === "SOL" ? "USDC" : proposalBackedPrefill.assetSymbol);
      setReference(proposalBackedPrefill.reference);
      setPurpose(proposalBackedPrefill.purpose);
      setAmount(proposalBackedPrefill.amount);
    } else if (handoff.payoutIntent && allowStoredServicesHydration) {
      setSelectedAsset(resolveSupportedAsset(config.assets, handoff.payoutIntent.assetSymbol));
      setLane(handoff.payoutIntent.lane);
      setDestinationAsset(handoff.payoutIntent.assetSymbol === "SOL" ? "USDC" : handoff.payoutIntent.assetSymbol);
      setReference(handoff.payoutIntent.reference);
      setPurpose(handoff.payoutIntent.purpose);
      setAmount(handoff.payoutIntent.amount);
    } else {
      setSelectedAsset(
        resolveSupportedAsset(config.assets, handoffProfileConfig.defaultAsset),
      );
      setLane(handoffProfileConfig.defaultLane);
      setDestinationAsset(handoffProfileConfig.defaultAsset === "SOL" ? "USDC" : handoffProfileConfig.defaultAsset);
      setReference(`${handoffProfileConfig.value.toUpperCase()}-REQUEST-READY`);
      setAmount(handoffProfileConfig.defaultAmount);
      setPurpose(handoffProfileConfig.defaultPurpose);
    }

    persistedPayloadSignatureRef.current = null;
    setLocalDeliveryState(null);
    appliedHandoffKeyRef.current = handoffKey;
  }, [allowStoredServicesHydration, config.assets, handoff]);

  const requestPacket = useMemo(
    () =>
      [
        "PrivateDAO Treasury Request",
        `Destination profile: ${activeProfile.label}`,
        `Network: ${config.network}`,
        `Lane: ${activeLane.label}`,
        `Asset: ${activeAsset.symbol}`,
        `Reference: ${reference || "Not provided"}`,
        `Amount: ${amount || "Not provided"}`,
        `Purpose: ${purpose || "Not provided"}`,
        `Receive address: ${activeAsset.receiveAddress}`,
        `Mint: ${activeAsset.mint ?? "Configured at deployment through NEXT_PUBLIC_TREASURY_* env."}`,
        `Explorer: ${buildSolanaExplorerHref(activeAsset.receiveAddress, config.network)}`,
        "Recommended next routes:",
        ...activeProfile.nextRoutes.map((route) => `- ${route.label}: ${route.href}`),
      ].join("\n"),
    [activeAsset, activeLane.label, activeProfile, amount, config.network, purpose, reference],
  );
  const executionPayload = useMemo(
    () => ({
      proposalId: persistedHandoff?.proposalId ?? "services-treasury-intake",
      profile: activeProfile.value,
      profileLabel: activeProfile.label,
      lane,
      laneLabel: activeLane.label,
      assetSymbol: activeAsset.symbol,
      assetMint: activeAsset.mint ?? "env-configured",
      amount: amount || null,
      reference: reference || null,
      purpose: purpose || null,
      receiveAddress: activeAsset.receiveAddress,
      routeFocus: persistedHandoff?.payoutIntent?.routeFocus ?? activeProfile.summary,
      executionTarget: persistedHandoff?.payoutIntent?.executionTarget ?? `Treasury receive rail · ${activeAsset.symbol}`,
      telemetryMode: persistedHandoff?.telemetryMode ?? "packet",
    }),
    [activeAsset, activeLane.label, activeProfile, amount, lane, persistedHandoff, purpose, reference],
  );
  const persistedPayoutIntent = useMemo(() => {
    return {
      assetSymbol: activeAsset.symbol,
      amount,
      amountDisplay: amount ? `${amount} ${activeAsset.symbol}` : `${activeAsset.symbol} amount ready`,
      reference: reference || `${activeProfile.value.toUpperCase()}-REQUEST-READY`,
      purpose: purpose || activeProfile.defaultPurpose,
      lane,
      routeFocus: persistedHandoff?.payoutIntent?.routeFocus ?? activeProfile.summary,
      recipient: activeAsset.receiveAddress,
      mintAddress: activeAsset.mint ?? null,
      executionTarget: persistedHandoff?.payoutIntent?.executionTarget ?? `Treasury receive rail · ${activeAsset.symbol}`,
      evidenceRoute: persistedHandoff?.payoutIntent?.evidenceRoute ?? "/documents/treasury-reviewer-packet",
    };
  }, [activeAsset, activeProfile, amount, lane, persistedHandoff, purpose, reference]);
  const persistedStateSignature = useMemo(
    () =>
      persistedHandoff && persistedPayoutIntent
        ? JSON.stringify({
            proposalId: persistedHandoff.proposalId,
            payoutProfile: activeProfile.value,
            telemetryMode: persistedHandoff.telemetryMode,
            payoutIntent: persistedPayoutIntent,
          })
        : null,
    [activeProfile.value, persistedHandoff, persistedPayoutIntent],
  );
  const isRequestReady = Boolean(amount.trim() && purpose.trim() && reference.trim());
  const requestPayloadSeed = useMemo(
    () => {
      const routeFocus = persistedHandoff?.payoutIntent?.routeFocus ?? activeProfile.summary;
      return {
        kind: "privatedao.treasury.request",
        state: isRequestReady ? "ready-for-delivery" : "draft-pending-input",
        requestId: `${activeProfile.value}:${reference || "reference-pending"}`.toUpperCase(),
        preparedAt: requestPreparedAt,
        proposalId: persistedHandoff?.proposalId ?? "services-treasury-intake",
        proposalTitle: persistedHandoff?.proposalTitle ?? activeProfile.label,
        network: config.network,
        payoutProfile: activeProfile.value,
        payoutTitle: activeProfile.label,
        lane,
        telemetryMode: persistedHandoff?.telemetryMode ?? "packet",
        asset: {
          symbol: activeAsset.symbol,
          mint: activeAsset.mint ?? "env-configured",
          receiveAddress: activeAsset.receiveAddress,
        },
        amount: amount || null,
        amountDisplay: amount ? `${amount} ${activeAsset.symbol}` : `${activeAsset.symbol} amount pending`,
        reference: reference || null,
        purpose: purpose || null,
        routeFocus,
        executionTarget: persistedHandoff?.payoutIntent?.executionTarget ?? `Treasury receive rail · ${activeAsset.symbol}`,
        evidenceRoute: persistedHandoff?.payoutIntent?.evidenceRoute ?? "/documents/treasury-reviewer-packet",
        treasuryRoutePlan: buildTreasuryRoutePlan({
          profile: activeProfile,
          assetSymbol: activeAsset.symbol,
          destinationAsset: normalizedDestinationAsset,
          amount,
          routeFocus,
          quoteReviewMode,
          executionPreference,
          slippageBandBps,
        }),
      };
    },
    [
      activeAsset.mint,
      activeAsset.receiveAddress,
      activeAsset.symbol,
      activeProfile,
      amount,
      config.network,
      destinationAsset,
      executionPreference,
      isRequestReady,
      lane,
      persistedHandoff,
      purpose,
      quoteReviewMode,
      reference,
      requestPreparedAt,
      slippageBandBps,
    ],
  );
  const continueHandoffQuery = useMemo(
    () =>
      persistedHandoff && persistedPayoutIntent
        ? buildServiceHandoffQuery({
            proposalId: persistedHandoff.proposalId,
            payoutProfile: activeProfile.value,
            telemetryMode: persistedHandoff.telemetryMode,
            requestDelivery: persistedHandoff.requestDelivery,
            requestPayloadSeed,
          })
        : "",
    [activeProfile.value, persistedHandoff, persistedPayoutIntent, requestPayloadSeed],
  );
  const buildRouteWithDelivery = useCallback(
    (
      basePath: "/services" | "/govern" | "/network",
      state: ServiceHandoffRequestDelivery["state"],
      deliveredAt: string | null,
    ) => {
      if (!continueHandoffQuery) {
        return basePath === "/services"
          ? "/services#treasury-payment-request"
          : basePath === "/govern"
            ? "/govern#proposal-review-action"
            : "/network";
      }

      const params = new URLSearchParams(continueHandoffQuery);
      if (state === "staged" || state === "delivered") {
        params.set("deliveryState", state);
      }
      if (state === "delivered" && deliveredAt) {
        params.set("deliveredAt", deliveredAt);
      }

      if (basePath === "/services") {
        return `/services?${params.toString()}#treasury-payment-request`;
      }
      if (basePath === "/govern") {
        return `/govern?${params.toString()}#proposal-review-action`;
      }
      return `/network?${params.toString()}`;
    },
    [continueHandoffQuery],
  );

  useEffect(() => {
    if (isRequestReady) return;
    setLocalDeliveryState(null);
  }, [isRequestReady]);

  const buildRequestDelivery = useCallback((
    state: ServiceHandoffRequestDelivery["state"],
    deliveredAtOverride?: string | null,
  ): ServiceHandoffRequestDelivery => {
    const deliveredAt = state === "delivered" ? deliveredAtOverride ?? new Date().toISOString() : null;
    return {
      state,
      stateDetail:
        state === "delivered"
          ? "Request object delivered into the govern execution lane with the exact treasury payload attached."
          : state === "staged"
            ? "Request object submitted in the services lane and ready for governed delivery."
            : isRequestReady
              ? "Structured request object is ready to be submitted or delivered into the execution lane."
              : "Complete amount, reference, and purpose before staging the request for delivery.",
      requestRoute: buildRouteWithDelivery("/services", state, deliveredAt),
      deliveryRoute: buildRouteWithDelivery("/govern", state, deliveredAt),
      telemetryRoute: buildRouteWithDelivery("/network", state, deliveredAt),
      deliveredAt,
    };
  }, [buildRouteWithDelivery, isRequestReady]);

  const activeRequestDelivery = useMemo(() => {
    if (localDeliveryState === "staged" || localDeliveryState === "delivered") {
      return buildRequestDelivery(localDeliveryState);
    }

    const storedState = persistedHandoff?.requestDelivery;
    if (storedState && (storedState.state === "staged" || storedState.state === "delivered")) {
      return {
        ...storedState,
        requestRoute: buildRouteWithDelivery("/services", storedState.state, storedState.deliveredAt),
        deliveryRoute: buildRouteWithDelivery("/govern", storedState.state, storedState.deliveredAt),
        telemetryRoute: buildRouteWithDelivery("/network", storedState.state, storedState.deliveredAt),
      };
    }

    return buildRequestDelivery("draft");
  }, [buildRequestDelivery, buildRouteWithDelivery, localDeliveryState, persistedHandoff?.requestDelivery]);

  async function copyValue(key: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
  }

  function downloadRequest() {
    const blob = new Blob([requestPacket], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `privatedao-${activeAsset.symbol.toLowerCase()}-${lane}-request.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    setCopied("request-download");
  }

  function downloadStructuredRequest() {
    const blob = new Blob([JSON.stringify(structuredRequestObject, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `privatedao-${activeAsset.symbol.toLowerCase()}-${lane}-request.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setCopied("structured-request-download");
  }

  const encodedPurpose = encodeURIComponent(purpose);
  const encodedAmount = encodeURIComponent(amount);
  const encodedProfile = encodeURIComponent(activeProfile.value);
  const engagePrimaryHref = `/engage?intake=${activeProfile.intake}&asset=${activeAsset.symbol}&amount=${encodedAmount}&purpose=${encodedPurpose}&lane=${lane}&profile=${encodedProfile}`;
  const structuredRequestObject = useMemo(
    () => ({
      ...requestPayloadSeed,
      requestRoute: activeRequestDelivery.requestRoute,
      deliveryRoute: activeRequestDelivery.deliveryRoute,
      telemetryRoute: activeRequestDelivery.telemetryRoute,
    }),
    [
      activeRequestDelivery.deliveryRoute,
      activeRequestDelivery.requestRoute,
      activeRequestDelivery.telemetryRoute,
      requestPayloadSeed,
    ],
  );
  const routePlan = structuredRequestObject.treasuryRoutePlan;
  const quoteReviewSurface = useMemo(() => {
    if (!routePlan) return null;

    const normalizedAmount = amount.trim();
    const amountDisplay = normalizedAmount.length > 0
      ? `${normalizedAmount} ${activeAsset.symbol}`
      : `${activeAsset.symbol} amount pending`;
    const destinationSummary =
      activeAsset.symbol === destinationAsset
        ? `Keep the treasury motion inside ${destinationAsset} while preserving governed review and settlement visibility.`
        : `Move from ${activeAsset.symbol} into ${destinationAsset} with a reviewer-readable route rationale before the treasury request is delivered.`;
    const settlementExpectation =
      activeProfile.value === "agentic-micropayment-rail"
        ? "Carry the route and batch assumptions into the same proof corridor so the judge can inspect individual settlement events instead of a single payout summary."
        : activeProfile.value === "vendor-payout" || activeProfile.value === "contributor-payout"
        ? "Carry the same route assumptions into payout funding so the settlement record can be read without reconstructing the asset-motion path."
        : activeProfile.value === "treasury-rebalance"
          ? "Preserve the same rebalance rationale beside reviewer evidence so operators can explain why the treasury ended in the target asset."
          : "Keep the route explanation attached to the treasury packet so commercial or pilot funding remains easy to review after execution.";

    return {
      amountDisplay,
      destinationSummary,
      reviewModeLabel: formatSelectionLabel(quoteReviewModes, quoteReviewMode),
      executionPreferenceLabel: formatSelectionLabel(executionPreferences, executionPreference),
      slippageLabel: formatSelectionLabel(slippageBands, slippageBandBps),
      operatorPosture:
        activeProfile.value === "agentic-micropayment-rail"
          ? "Policy-bound operator review before the agent fans one approved treasury instruction into many low-value settlement events."
          : quoteReviewMode === "operator-fast-path"
          ? "Fast-path operator review with a pre-approved treasury corridor."
          : quoteReviewMode === "policy-bound"
            ? "Policy-bound review that keeps the route inside a governed treasury band."
            : "Manual operator review before the route is delivered into govern.",
      nextAction:
        activeProfile.value === "agentic-micropayment-rail" && normalizedAmount.length > 0
          ? `Review the batch assumptions for ${amountDisplay}, then deliver the request so the agent can execute many small transfers inside the same ${slippageBandBps} bps policy band.`
          : normalizedAmount.length > 0
          ? `Review the route assumptions for ${amountDisplay}, then stage or deliver the treasury request with the same ${slippageBandBps} bps operating band.`
          : `Attach the final ${activeAsset.symbol} amount so the route can move from review posture to an actionable treasury request.`,
      settlementExpectation,
      reviewChecklist: [
        `Confirm the treasury is moving from ${activeAsset.symbol} toward ${normalizedDestinationAsset} for the intended ${activeProfile.label.toLowerCase()} motion.`,
        `Confirm the route uses ${formatSelectionLabel(quoteReviewModes, quoteReviewMode)} with ${formatSelectionLabel(executionPreferences, executionPreference)} posture.`,
        `Confirm the ${slippageBandBps} bps band matches the treasury risk tolerance for this request.`,
        "Confirm the route rationale is readable enough to carry forward into reviewer evidence and settlement follow-through.",
      ],
    };
  }, [
    activeAsset.symbol,
    activeProfile.label,
    activeProfile.value,
    amount,
    executionPreference,
    normalizedDestinationAsset,
    quoteReviewMode,
    routePlan,
    slippageBandBps,
  ]);
  const executionPlanningSurface = useMemo(() => {
    if (!routePlan) return null;

    const profileExecutionSummary =
      activeProfile.value === "treasury-rebalance"
        ? "Treasury rebalance should preserve the asset-motion reason, the policy band, and the post-route settlement story in one governed packet."
        : activeProfile.value === "agentic-micropayment-rail"
          ? "Agentic micropayment execution should preserve one approved policy, one route posture, and many reviewer-visible settlement events in the same treasury record."
        : activeProfile.value === "treasury-top-up"
          ? "Treasury top-up should land in an approved treasury asset so incoming capital stays aligned with later governance and payout motions."
          : "Payout-oriented funding should finish in a settlement-friendly asset before the downstream treasury action moves into execution.";
    const settlementMode =
      normalizedDestinationAsset === "USDC" ||
      normalizedDestinationAsset === "AUDD" ||
      normalizedDestinationAsset === "PUSD" ||
      normalizedDestinationAsset === "USDG"
        ? "Stable-asset settlement posture"
        : "Treasury-asset rebalance posture";

    return {
      destinationPolicy:
        activeProfile.value === "agentic-micropayment-rail"
          ? `This profile is intentionally narrowed to ${allowedDestinationAssets.map((asset) => asset.symbol).join(" / ")} so agent settlement stays in a stable-value payout asset.`
          : activeProfile.value === "pusd-confidential-payroll" || activeProfile.value === "pusd-gaming-reward-pool"
            ? "This profile is PUSD-first because the track fit is strongest when Palm USD is the core settlement asset, not a secondary display option."
          : activeProfile.value === "audd-merchant-settlement" || activeProfile.value === "audd-treasury-settlement"
            ? "This profile is AUDD-first because the operating goal is Australian-dollar settlement, merchant tooling, and treasury finance rather than a generic USD payout rail."
          : allowedDestinationAssets.length === config.assets.length
            ? "This profile can target any supported treasury asset when the operator keeps the route rationale readable."
          : `This profile is narrowed to ${allowedDestinationAssets.map((asset) => asset.symbol).join(" / ")} so the treasury lands in an asset that matches the operating goal.`,
      settlementMode,
      profileExecutionSummary,
      executionChecklist: [
        `Confirm ${normalizedDestinationAsset} is the correct destination asset for ${activeProfile.label.toLowerCase()}.`,
        `Confirm the request should move under ${routePlan.executionPreference} with ${routePlan.quoteReviewMode}.`,
        activeProfile.value === "agentic-micropayment-rail"
          ? "Confirm the batch should fan out into many low-value transfers that remain visible in proof, analytics, and judge logs."
          : "Confirm the request should preserve one settled treasury outcome after delivery.",
        "Confirm the reviewer packet and settlement packet will stay attached to the same treasury request after delivery.",
      ],
    };
  }, [
    activeProfile.label,
    activeProfile.value,
    allowedDestinationAssets,
    config.assets.length,
    normalizedDestinationAsset,
    routePlan,
  ]);

  useEffect(() => {
    if (!handoff || !persistedPayoutIntent || !persistedStateSignature) return;
    if (persistedPayloadSignatureRef.current === persistedStateSignature) return;

    const storedState = readStoredServiceHandoffState();
    const matchingStoredDelivery =
      storedState?.proposalId === handoff.proposalId &&
      storedState?.payoutProfile === activeProfile.value
        ? storedState.requestDelivery
        : undefined;
    const deliveryOverride = requestDeliveryOverrideRef.current;

    const requestDelivery =
      deliveryOverride === "staged" || deliveryOverride === "delivered"
        ? buildRequestDelivery(deliveryOverride)
        : matchingStoredDelivery &&
            (matchingStoredDelivery.state === "staged" || matchingStoredDelivery.state === "delivered")
          ? {
              ...matchingStoredDelivery,
              requestRoute: buildRouteWithDelivery("/services", matchingStoredDelivery.state, matchingStoredDelivery.deliveredAt),
              deliveryRoute: buildRouteWithDelivery("/govern", matchingStoredDelivery.state, matchingStoredDelivery.deliveredAt),
              telemetryRoute: buildRouteWithDelivery("/network", matchingStoredDelivery.state, matchingStoredDelivery.deliveredAt),
            }
          : handoff.requestDelivery &&
              (handoff.requestDelivery.state === "staged" || handoff.requestDelivery.state === "delivered")
            ? {
                ...handoff.requestDelivery,
                requestRoute: buildRouteWithDelivery("/services", handoff.requestDelivery.state, handoff.requestDelivery.deliveredAt),
                deliveryRoute: buildRouteWithDelivery("/govern", handoff.requestDelivery.state, handoff.requestDelivery.deliveredAt),
                telemetryRoute: buildRouteWithDelivery("/network", handoff.requestDelivery.state, handoff.requestDelivery.deliveredAt),
              }
            : buildRequestDelivery("draft");

    writeStoredServiceHandoffState({
      ...handoff,
      payoutProfile: activeProfile.value,
      payoutTitle: activeProfile.label,
      updatedAt: new Date().toISOString(),
      source: "services",
      payoutIntent: persistedPayoutIntent,
      requestDelivery,
      requestPayload: structuredRequestObject,
    });
    if (deliveryOverride && requestDelivery.state === deliveryOverride) {
      requestDeliveryOverrideRef.current = null;
    }
    persistedPayloadSignatureRef.current = persistedStateSignature;
  }, [
    activeProfile.label,
    activeProfile.value,
    buildRequestDelivery,
    buildRouteWithDelivery,
    handoff,
    persistedPayoutIntent,
    persistedStateSignature,
    structuredRequestObject,
  ]);

  function handleDeliveryNavigation(state: "staged" | "delivered") {
    if (!isRequestReady || !persistedHandoff || !persistedPayoutIntent) return;
    const requestDelivery = buildRequestDelivery(state);
    requestDeliveryOverrideRef.current = state;
    setLocalDeliveryState(state);
    writeStoredServiceHandoffState({
      ...persistedHandoff,
      payoutProfile: activeProfile.value,
      payoutTitle: activeProfile.label,
      updatedAt: new Date().toISOString(),
      source: "services",
      payoutIntent: persistedPayoutIntent,
      requestDelivery,
      requestPayload: structuredRequestObject,
    });
    setCopied(state === "staged" ? "request-staged" : "request-delivered");
    window.location.assign(state === "staged" ? requestDelivery.requestRoute : requestDelivery.deliveryRoute);
  }

  if (!isMounted) {
    return (
      <Card id="treasury-receive-surface">
        <CardHeader>
          <CardTitle>Treasury receive surface</CardTitle>
          <p className="mt-2 text-sm leading-7 text-white/60">
            Loading the live treasury execution lane with the current proposal, payout profile, and telemetry continuity.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="rounded-3xl border border-cyan-300/16 bg-cyan-300/[0.08] p-5 text-sm leading-7 text-white/62">
            Interactive treasury controls are mounting client-side so the request payload, wallet continuity, and governed delivery state stay aligned with live Testnet execution.
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            {config.assets.map((asset) => {
              const Icon = assetIconMap[asset.symbol];
              return (
                <div key={asset.symbol} className="rounded-3xl border border-white/8 bg-white/4 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl border border-white/8 bg-black/20 p-3 text-emerald-200">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-lg font-medium text-white">{asset.symbol}</div>
                        <div className="mt-1 text-sm text-white/56">{asset.name}</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/46">Receive address</div>
                    <div className="mt-2 break-all font-mono text-sm leading-7 text-white/74">{asset.receiveAddress}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="treasury-receive-surface">
      <CardHeader>
        <CardTitle>Treasury receive surface</CardTitle>
        <p className="mt-2 text-sm leading-7 text-white/60">
          Accept public treasury support and pilot funding through explicit Testnet rails. This surface exposes only public receive addresses and asset metadata.
        </p>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="rounded-3xl border border-cyan-300/16 bg-cyan-300/[0.08] p-5">
          <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/76">Primary treasury route</div>
          <div className="mt-3 text-lg font-medium text-white">{config.network}</div>
          <div className="mt-3 break-all rounded-2xl border border-white/8 bg-black/20 p-4 font-mono text-sm leading-7 text-white/74">
            {config.treasuryAddress}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={() => copyValue("treasury", config.treasuryAddress)} className={cn(buttonVariants({ size: "sm" }))}>
              <Clipboard className="h-4 w-4" />
              Copy treasury address
            </button>
            <Link href={buildSolanaExplorerHref(config.treasuryAddress, config.network)} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              Open explorer
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/62">
              Accepted assets: SOL / USDC / AUDD / PUSD / USDG
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div id="treasury-payment-request" className="rounded-3xl border border-white/8 bg-white/4 p-5">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-emerald-200/78">
              <FileCheck2 className="h-4 w-4" />
              Treasury operating standard
            </div>
            <div className="mt-3 text-sm leading-7 text-white/62">
              This surface is intentionally public-address only. It supports treasury intake, reviewer truth, and buyer-safe payment routing without exposing signer material or hidden operator state.
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm leading-7 text-white/62">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/46">What is public</div>
                <div className="mt-2">Receive addresses, mint references, routing context, and the reviewer-safe trust packet.</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm leading-7 text-white/62">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/46">What stays private</div>
                <div className="mt-2">Signer keys, treasury seeds, multisig ceremony inputs, and any authority-transfer secrets remain outside the frontend.</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/8 bg-white/4 p-5">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-white/58">
              <ShieldCheck className="h-4 w-4 text-cyan-200" />
              Reviewer truth and payment discipline
            </div>
            <div className="mt-4 grid gap-3">
              {treasuryReviewerLinks.map((item) => (
                <Link key={item.href} href={item.href} className={cn(buttonVariants({ size: "sm", variant: "outline" }), "justify-between")}>
                  {item.label}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/46">Sender checklist</div>
              <div className="mt-3 grid gap-2 text-sm leading-7 text-white/62">
                {treasurySendingChecklist.map((item) => (
                  <div key={item}>{item}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {config.assets.map((asset) => {
            const Icon = assetIconMap[asset.symbol];
            return (
              <div key={asset.symbol} className="rounded-3xl border border-white/8 bg-white/4 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-white/8 bg-black/20 p-3 text-emerald-200">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-lg font-medium text-white">{asset.symbol}</div>
                      <div className="mt-1 text-sm text-white/56">{asset.name}</div>
                    </div>
                  </div>
                  {copied === asset.symbol ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : null}
                </div>

                <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/46">Receive address</div>
                  <div className="mt-2 break-all font-mono text-sm leading-7 text-white/74">{asset.receiveAddress}</div>
                </div>

                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm leading-7 text-white/62">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/46">Network</div>
                    <div className="mt-2">{asset.network}</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm leading-7 text-white/62">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/46">Mint</div>
                    <div className="mt-2 break-all font-mono text-xs text-white/70">
                      {asset.mint ?? "Configured at deployment through NEXT_PUBLIC_TREASURY_* env."}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm leading-7 text-white/62">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/46">Use</div>
                    <div className="mt-2">{asset.note}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => copyValue(asset.symbol, asset.receiveAddress)}
                  className={cn(buttonVariants({ size: "sm", variant: "secondary" }), "mt-4")}
                >
                  <Clipboard className="h-4 w-4" />
                  Copy {asset.symbol} route
                </button>
                <Link
                  href={buildSolanaExplorerHref(asset.receiveAddress, asset.network)}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ size: "sm", variant: "outline" }), "mt-3")}
                >
                  Open {asset.symbol} explorer
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            );
          })}
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-3xl border border-white/8 bg-white/4 p-5">
            <div className="text-lg font-medium text-white">Treasury payment request</div>
            <p className="mt-3 text-sm leading-7 text-white/60">
              Pick the asset, amount, purpose, and handoff lane. The product returns a ready request packet tied to the correct public receive route.
            </p>
            {handoffProfile ? (
              <div className="mt-4 rounded-2xl border border-emerald-300/18 bg-emerald-300/[0.08] px-4 py-3 text-sm leading-7 text-white/72">
                Applied from service handoff: <span className="font-medium text-white">{activeProfile.label}</span>
                {handoff?.proposalId ? (
                  <span className="text-white/56"> · {handoff.proposalId}</span>
                ) : null}
              </div>
            ) : null}

            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm text-white/70">
                <span className="text-[11px] uppercase tracking-[0.24em] text-white/46">Destination profile</span>
                <select
                  value={profile}
                  onChange={(event) => setProfile(event.target.value as typeof profile)}
                  className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-white outline-none"
                >
                  {destinationProfiles.map((item) => (
                    <option key={item.value} value={item.value} className="bg-[#0b1020]">
                      {item.label}
                    </option>
                  ))}
                </select>
                <span className="text-xs leading-6 text-white/46">{activeProfile.summary}</span>
              </label>

              <label className="grid gap-2 text-sm text-white/70">
                <span className="text-[11px] uppercase tracking-[0.24em] text-white/46">Asset</span>
                <select
                  value={selectedAsset}
                  onChange={(event) => setSelectedAsset(event.target.value as typeof selectedAsset)}
                  className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-white outline-none"
                >
                  {config.assets.map((asset) => (
                    <option key={asset.symbol} value={asset.symbol} className="bg-[#0b1020]">
                      {asset.symbol} · {asset.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm text-white/70">
                <span className="text-[11px] uppercase tracking-[0.24em] text-white/46">Destination asset</span>
                <select
                  value={normalizedDestinationAsset}
                  onChange={(event) => setDestinationAsset(event.target.value as ServiceHandoffAssetSymbol)}
                  className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-white outline-none"
                >
                  {allowedDestinationAssets.map((asset) => (
                    <option key={`destination-${asset.symbol}`} value={asset.symbol} className="bg-[#0b1020]">
                      {asset.symbol} · {asset.name}
                    </option>
                  ))}
                </select>
                <span className="text-xs leading-6 text-white/46">
                  Choose the asset the treasury is trying to reach before the payout or rebalance settles.
                  {allowedDestinationAssets.length !== config.assets.length
                    ? ` This profile is narrowed to ${allowedDestinationAssets.map((asset) => asset.symbol).join(" / ")}.`
                    : ""}
                </span>
              </label>

              <label className="grid gap-2 text-sm text-white/70">
                <span className="text-[11px] uppercase tracking-[0.24em] text-white/46">Reference</span>
                <input
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="PILOT-APR-001 / OPS-REQUEST-042"
                  className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-white outline-none placeholder:text-white/34"
                />
                <span className="text-xs leading-6 text-white/46">Use a stable reference so treasury ops can match the sender, packet, and support lane without guesswork.</span>
              </label>

              <label className="grid gap-2 text-sm text-white/70">
                <span className="text-[11px] uppercase tracking-[0.24em] text-white/46">Amount</span>
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder={`Amount in ${activeAsset.symbol}`}
                  className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-white outline-none placeholder:text-white/34"
                />
              </label>

              <label className="grid gap-2 text-sm text-white/70">
                <span className="text-[11px] uppercase tracking-[0.24em] text-white/46">Purpose</span>
                <textarea
                  value={purpose}
                  onChange={(event) => setPurpose(event.target.value)}
                  placeholder="Treasury top-up, pilot funding, payout request, operator support..."
                  rows={4}
                  className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-white outline-none placeholder:text-white/34"
                />
              </label>

              <label className="grid gap-2 text-sm text-white/70">
                <span className="text-[11px] uppercase tracking-[0.24em] text-white/46">Handoff lane</span>
                <select
                  value={lane}
                  onChange={(event) => setLane(event.target.value as typeof lane)}
                  className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-white outline-none"
                >
                  {handoffLanes.map((item) => (
                    <option key={item.value} value={item.value} className="bg-[#0b1020]">
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm text-white/70">
                <span className="text-[11px] uppercase tracking-[0.24em] text-white/46">Quote review mode</span>
                <select
                  value={quoteReviewMode}
                  onChange={(event) => setQuoteReviewMode(event.target.value as (typeof quoteReviewModes)[number]["value"])}
                  className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-white outline-none"
                >
                  {quoteReviewModes.map((mode) => (
                    <option key={mode.value} value={mode.value} className="bg-[#0b1020]">
                      {mode.label}
                    </option>
                  ))}
                </select>
                <span className="text-xs leading-6 text-white/46">
                  {quoteReviewModes.find((mode) => mode.value === quoteReviewMode)?.summary}
                </span>
              </label>

              <label className="grid gap-2 text-sm text-white/70">
                <span className="text-[11px] uppercase tracking-[0.24em] text-white/46">Execution preference</span>
                <select
                  value={executionPreference}
                  onChange={(event) => setExecutionPreference(event.target.value as (typeof executionPreferences)[number]["value"])}
                  className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-white outline-none"
                >
                  {executionPreferences.map((mode) => (
                    <option key={mode.value} value={mode.value} className="bg-[#0b1020]">
                      {mode.label}
                    </option>
                  ))}
                </select>
                <span className="text-xs leading-6 text-white/46">
                  {executionPreferences.find((mode) => mode.value === executionPreference)?.summary}
                </span>
              </label>

              <label className="grid gap-2 text-sm text-white/70">
                <span className="text-[11px] uppercase tracking-[0.24em] text-white/46">Slippage band</span>
                <select
                  value={slippageBandBps}
                  onChange={(event) => setSlippageBandBps(event.target.value as (typeof slippageBands)[number]["value"])}
                  className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-white outline-none"
                >
                  {slippageBands.map((band) => (
                    <option key={band.value} value={band.value} className="bg-[#0b1020]">
                      {band.label}
                    </option>
                  ))}
                </select>
                <span className="text-xs leading-6 text-white/46">
                  {slippageBands.find((band) => band.value === slippageBandBps)?.summary}
                </span>
              </label>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl border border-emerald-300/16 bg-emerald-300/[0.08] p-5">
              <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-100/76">Structured treasury packet</div>
              <pre className="mt-4 whitespace-pre-wrap text-sm leading-7 text-white/72">{requestPacket}</pre>
            </div>

            <div className="rounded-3xl border border-cyan-300/16 bg-cyan-300/[0.08] p-5">
              <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/76">Execution payload continuity</div>
              <pre className="mt-4 whitespace-pre-wrap text-xs leading-6 text-white/72">{JSON.stringify(executionPayload, null, 2)}</pre>
              {continueHandoffQuery ? (
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href={`/services?${continueHandoffQuery}#service-handoff`} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                    Refresh services continuity
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href={`/govern?${continueHandoffQuery}#proposal-review-action`} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                    Continue to govern
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href={`/network?${continueHandoffQuery}`} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                    Continue to network
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : null}
            </div>

            {routePlan ? (
              <div className="rounded-3xl border border-cyan-300/16 bg-cyan-300/[0.08] p-5">
                <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/76">Jupiter route preview</div>
                <div className="mt-3 text-base font-medium text-white">{routePlan.executionMode}</div>
                <div className="mt-2 text-sm leading-7 text-white/62">{routePlan.routeRationale}</div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm leading-7 text-white/62">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/46">Source asset hint</div>
                    <div className="mt-2 text-white">{routePlan.sourceAssetHint}</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm leading-7 text-white/62">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/46">Destination asset</div>
                    <div className="mt-2 text-white">{routePlan.destinationAsset}</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm leading-7 text-white/62">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/46">Quote review mode</div>
                    <div className="mt-2 text-white">{routePlan.quoteReviewMode}</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm leading-7 text-white/62">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/46">Execution preference</div>
                    <div className="mt-2 text-white">{routePlan.executionPreference}</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm leading-7 text-white/62">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/46">Quote policy</div>
                    <div className="mt-2">{routePlan.quotePolicy}</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm leading-7 text-white/62">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/46">Slippage policy</div>
                    <div className="mt-2">{routePlan.slippagePolicy}</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm leading-7 text-white/62 md:col-span-2">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/46">Slippage band</div>
                    <div className="mt-2 text-white">{routePlan.slippageBandBps} bps</div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href={routePlan.reviewerPath} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                    Open route brief
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                  <Link href={routePlan.settlementPath} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                    Open settlement path
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ) : null}

            {quoteReviewSurface ? (
              <div className="rounded-3xl border border-sky-300/16 bg-sky-300/[0.08] p-5">
                <div className="text-[11px] uppercase tracking-[0.24em] text-sky-100/76">Quote-backed review surface</div>
                <div className="mt-3 text-base font-medium text-white">{quoteReviewSurface.amountDisplay}</div>
                <div className="mt-2 text-sm leading-7 text-white/62">{quoteReviewSurface.destinationSummary}</div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm leading-7 text-white/62">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/46">Review posture</div>
                    <div className="mt-2 text-white">{quoteReviewSurface.reviewModeLabel}</div>
                    <div className="mt-2">{quoteReviewSurface.operatorPosture}</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm leading-7 text-white/62">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/46">Execution posture</div>
                    <div className="mt-2 text-white">{quoteReviewSurface.executionPreferenceLabel}</div>
                    <div className="mt-2">{quoteReviewSurface.slippageLabel}</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm leading-7 text-white/62 md:col-span-2">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/46">Next operator action</div>
                    <div className="mt-2">{quoteReviewSurface.nextAction}</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm leading-7 text-white/62 md:col-span-2">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/46">Settlement expectation</div>
                    <div className="mt-2">{quoteReviewSurface.settlementExpectation}</div>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/46">Review checklist</div>
                  <div className="mt-3 grid gap-2 text-sm leading-7 text-white/62">
                    {quoteReviewSurface.reviewChecklist.map((item) => (
                      <div key={item}>{item}</div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {executionPlanningSurface ? (
              <div className="rounded-3xl border border-indigo-300/16 bg-indigo-300/[0.08] p-5">
                <div className="text-[11px] uppercase tracking-[0.24em] text-indigo-100/76">Execution planning lane</div>
                <div className="mt-3 text-base font-medium text-white">{executionPlanningSurface.settlementMode}</div>
                <div className="mt-2 text-sm leading-7 text-white/62">{executionPlanningSurface.profileExecutionSummary}</div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm leading-7 text-white/62 md:col-span-2">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/46">Destination policy</div>
                    <div className="mt-2">{executionPlanningSurface.destinationPolicy}</div>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/46">Execution checklist</div>
                  <div className="mt-3 grid gap-2 text-sm leading-7 text-white/62">
                    {executionPlanningSurface.executionChecklist.map((item) => (
                      <div key={item}>{item}</div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="rounded-3xl border border-emerald-300/16 bg-emerald-300/[0.08] p-5">
              <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-100/76">Delivery-ready request object</div>
              <pre className="mt-4 whitespace-pre-wrap text-xs leading-6 text-white/72">{JSON.stringify(structuredRequestObject, null, 2)}</pre>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => copyValue("structured-request", JSON.stringify(structuredRequestObject, null, 2))}
                  className={cn(buttonVariants({ size: "sm" }), !isRequestReady && "pointer-events-none opacity-50")}
                  disabled={!isRequestReady}
                >
                  <Clipboard className="h-4 w-4" />
                  Copy request object
                </button>
                <button
                  type="button"
                  onClick={downloadStructuredRequest}
                  className={cn(buttonVariants({ size: "sm", variant: "secondary" }), !isRequestReady && "pointer-events-none opacity-50")}
                  disabled={!isRequestReady}
                >
                  <Download className="h-4 w-4" />
                  Download request JSON
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-emerald-300/16 bg-emerald-300/[0.08] p-5">
              <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-100/76">Governed delivery lane</div>
              <div className="mt-3 text-base font-medium text-white">
                {activeRequestDelivery.state === "delivered"
                  ? "Delivered into govern"
                  : activeRequestDelivery.state === "staged"
                    ? "Submitted in services"
                    : isRequestReady
                      ? "Ready to submit"
                      : "Draft pending input"}
              </div>
              <div className="mt-2 text-sm leading-7 text-white/62">
                {activeRequestDelivery.stateDetail}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm leading-7 text-white/62">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/46">Request object ID</div>
                  <div className="mt-2 text-white">{structuredRequestObject.requestId}</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm leading-7 text-white/62">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/46">Request object state</div>
                  <div className="mt-2 text-white">{structuredRequestObject.state}</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm leading-7 text-white/62">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/46">Request route</div>
                  <div className="mt-2 text-white">{activeRequestDelivery.requestRoute}</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm leading-7 text-white/62">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/46">Delivery route</div>
                  <div className="mt-2 text-white">{activeRequestDelivery.deliveryRoute}</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm leading-7 text-white/62">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/46">Telemetry route</div>
                  <div className="mt-2 text-white">{activeRequestDelivery.telemetryRoute}</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm leading-7 text-white/62">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/46">Submit progression</div>
                  <div className="mt-2 text-white">
                    Draft in services → submitted in services → delivered into govern → runtime continuity on network.
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleDeliveryNavigation("staged")}
                  disabled={!isRequestReady}
                  className={cn(buttonVariants({ size: "sm", variant: "secondary" }), !isRequestReady && "pointer-events-none opacity-50")}
                >
                  Submit authoritative request object
                </button>
                <button
                  type="button"
                  onClick={() => handleDeliveryNavigation("delivered")}
                  disabled={!isRequestReady}
                  className={cn(buttonVariants({ size: "sm" }), !isRequestReady && "pointer-events-none opacity-50")}
                >
                  Deliver authoritative request object
                </button>
                <Link
                  href={activeRequestDelivery.telemetryRoute}
                  className={cn(buttonVariants({ size: "sm", variant: "outline" }), !isRequestReady && "pointer-events-none opacity-50")}
                  aria-disabled={!isRequestReady}
                >
                  Continue authoritative telemetry lane
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-white/8 bg-white/4 p-5">
              <div className="text-[11px] uppercase tracking-[0.24em] text-white/46">Profile and lane summary</div>
              <div className="mt-3 text-base font-medium text-white">{activeProfile.label}</div>
              <p className="mt-3 text-sm leading-7 text-white/60">{activeProfile.summary}</p>
              <div className="mt-4 text-sm font-medium text-white">{activeLane.label}</div>
              <p className="mt-2 text-sm leading-7 text-white/60">{activeLane.summary}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {activeProfile.nextRoutes.map((route) => (
                  <Link key={`${activeProfile.value}-${route.href}`} href={route.href} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                    {route.label}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ))}
              </div>
              {handoff?.payoutIntent ? (
                <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4 text-sm leading-7 text-white/62">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/46">Handoff continuity</div>
                  <div className="mt-2">
                    {handoff.payoutIntent.routeFocus} · {handoff.payoutIntent.assetSymbol}
                    {handoff.payoutIntent.amount ? ` · ${handoff.payoutIntent.amount}` : " · sender amount still required"}
                  </div>
                  <div className="mt-2 text-white/54">
                    {handoff.payoutIntent.reference} · {handoff.payoutIntent.executionTarget}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => copyValue("treasury-request", requestPacket)}
                disabled={!isRequestReady}
                className={cn(buttonVariants({ size: "sm" }), !isRequestReady && "pointer-events-none opacity-50")}
              >
                <Clipboard className="h-4 w-4" />
                Copy request packet
              </button>
              <button
                type="button"
                onClick={downloadRequest}
                disabled={!isRequestReady}
                className={cn(buttonVariants({ size: "sm", variant: "secondary" }), !isRequestReady && "pointer-events-none opacity-50")}
              >
                <Download className="h-4 w-4" />
                Download request
              </button>
              <Link
                href={engagePrimaryHref}
                className={cn(buttonVariants({ size: "sm", variant: "outline" }), !isRequestReady && "pointer-events-none opacity-50")}
                aria-disabled={!isRequestReady}
              >
                Continue to {activeProfile.intake === "pilot" ? "pilot" : "payments"} intake
                <ArrowRight className="h-4 w-4" />
              </Link>
              {continueHandoffQuery ? (
                <Link
                  href={`/govern?${continueHandoffQuery}#proposal-review-action`}
                  className={cn(buttonVariants({ size: "sm", variant: "outline" }), !isRequestReady && "pointer-events-none opacity-50")}
                  aria-disabled={!isRequestReady}
                >
                  Continue to governed execution
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-amber-300/16 bg-amber-300/[0.08] p-5 text-sm leading-7 text-white/66">
          <div className="flex items-center gap-2 text-white">
            <ShieldCheck className="h-4 w-4 text-amber-200" />
            Secure configuration
          </div>
          <div className="mt-3">{config.securityNote}</div>
        </div>
      </CardContent>
    </Card>
  );
}
