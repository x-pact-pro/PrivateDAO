"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, DatabaseZap, Radar, WalletCards } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { runGoldRushQuery, type GoldRushQueryRequest } from "@/lib/api/goldrush";
import { persistOperationReceipt } from "@/lib/supabase/operation-receipts";
import { cn } from "@/lib/utils";

type GoldRushTemplateId =
  | "wallet-history"
  | "stablecoin-flows"
  | "counterparty-screen"
  | "token-holdings";

const goldRushTemplates: {
  id: GoldRushTemplateId;
  title: string;
  summary: string;
  payload: (wallet: string) => GoldRushQueryRequest;
}[] = [
  {
    id: "wallet-history",
    title: "Wallet history intelligence",
    summary: "Use structured wallet history as a reviewer-friendly pre-execution check before treasury approval.",
    payload: (wallet) => ({
      queryType: "wallet-history",
      chainName: "solana-mainnet",
      walletAddress: wallet,
      include: ["transactions", "classifications", "token-metadata"],
    }),
  },
  {
    id: "stablecoin-flows",
    title: "Stablecoin flow review",
    summary: "Inspect recent stablecoin movement before approving payroll, vendor, or settlement operations.",
    payload: (wallet) => ({
      queryType: "stablecoin-flows",
      chainName: "solana-mainnet",
      walletAddress: wallet,
      assets: ["USDC", "USDT", "PUSD", "AUDD"],
    }),
  },
  {
    id: "counterparty-screen",
    title: "Counterparty screen",
    summary: "Check whether a treasury recipient or operator wallet has the kind of history that should trigger closer review.",
    payload: (wallet) => ({
      queryType: "counterparty-screen",
      chainName: "solana-mainnet",
      walletAddress: wallet,
      include: ["history", "balances", "labels"],
    }),
  },
  {
    id: "token-holdings",
    title: "Token holdings snapshot",
    summary: "Review asset concentration before proposing a route, rebalance, or payout-funding motion.",
    payload: (wallet) => ({
      queryType: "token-holdings",
      chainName: "solana-mainnet",
      walletAddress: wallet,
      include: ["balances", "prices", "metadata"],
    }),
  },
];

type GoldRushResponse = {
  ok?: boolean;
  sources?: {
    goldRush?: string;
    duneSim?: string;
    zerion?: string;
    solanaRpc?: string;
  };
  summary?: {
    assetCount?: number;
    stableAssetCount?: number;
    totalQuoteUsd?: number;
    previewTransactionCount?: number;
  };
  riskSignals?: string[];
  balances?: Array<{
    symbol?: string;
    name?: string;
    quote?: number | null;
    prettyBalance?: string | null;
  }>;
  stablecoinHoldings?: Array<{
    symbol?: string;
    quote?: number | null;
    prettyBalance?: string | null;
  }>;
};

function formatUsd(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

function buildGoldRushFallbackResponse(payload: GoldRushQueryRequest, reason: string): GoldRushResponse {
  return {
    sources: {
      goldRush: "degraded",
      duneSim: "available-through-read-node",
      zerion: "fallback-pending",
      solanaRpc: "fallback-pending",
    },
    summary: {
      assetCount: 0,
      stableAssetCount: 0,
      totalQuoteUsd: 0,
      previewTransactionCount: 0,
    },
    riskSignals: [
      "Live intelligence request did not complete. Keep the operation in review mode and retry before signing.",
      reason,
      `Prepared fallback packet for ${payload.walletAddress}.`,
    ],
    balances: [],
    stablecoinHoldings: [],
  };
}

export function GoldRushIntelligenceSurface() {
  const [walletAddress, setWalletAddress] = useState("So11111111111111111111111111111111111111112");
  const [activeTemplate, setActiveTemplate] = useState<GoldRushTemplateId>("wallet-history");
  const [deliveryState, setDeliveryState] = useState(
    "Run a live GoldRush intelligence request here. The hosted read-node now forwards configured GoldRush and Dune checks for reviewer-visible pre-sign context.",
  );
  const [responsePreview, setResponsePreview] = useState<string>("");
  const [responseData, setResponseData] = useState<GoldRushResponse | null>(null);
  const [running, setRunning] = useState(false);

  const payload = useMemo<GoldRushQueryRequest>(() => {
    const template = goldRushTemplates.find((entry) => entry.id === activeTemplate) ?? goldRushTemplates[0];
    return template.payload(walletAddress.trim() || "So11111111111111111111111111111111111111112");
  }, [activeTemplate, walletAddress]);

  async function handleRun() {
    setRunning(true);
    setDeliveryState("Sending GoldRush intelligence request...");

    try {
      const body = await runGoldRushQuery(payload);
      setResponseData(body as GoldRushResponse);
      setResponsePreview(JSON.stringify(body, null, 2));
      setDeliveryState("GoldRush intelligence response received.");
      await persistOperationReceipt({
        operationType: "goldrush-pre-sign-intelligence",
        proposalId: `goldrush:${payload.queryType}`,
        approvalState: "live-intelligence",
        executionReference: `${payload.chainName ?? "solana-mainnet"}:${payload.walletAddress}:${Date.now()}`,
        privateSettlementRail: "goldrush",
        stablecoinSymbol: "USDC",
        auditMode: "pre-sign-wallet-intelligence",
        recipientVisibility: "reviewer-visible-summary",
        metadata: body,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "GoldRush request failed.";
      const fallback = buildGoldRushFallbackResponse(payload, message);
      setDeliveryState(`${message} Fallback packet prepared locally so the visitor can continue reviewing without blocking.`);
      setResponseData(fallback);
      setResponsePreview(JSON.stringify({ ok: false, fallback: true, payload, packet: fallback }, null, 2));
      try {
        await persistOperationReceipt({
          operationType: "goldrush-pre-sign-intelligence",
          proposalId: `goldrush:${payload.queryType}`,
          approvalState: "local-fallback",
          executionReference: `goldrush-fallback:${payload.walletAddress}:${Date.now()}`,
          privateSettlementRail: "goldrush",
          stablecoinSymbol: "USDC",
          auditMode: "pre-sign-wallet-intelligence",
          recipientVisibility: "reviewer-visible-summary",
          metadata: { error: message, payload, fallback },
        });
      } catch {
        // The visitor should never be blocked by receipt persistence.
      }
    } finally {
      setRunning(false);
    }
  }

  const topHoldings = (responseData?.balances ?? []).slice(0, 4);
  const stablecoinHoldings = (responseData?.stablecoinHoldings ?? []).slice(0, 4);
  const riskSignals = (responseData?.riskSignals ?? []).slice(0, 4);
  const runtimeMode =
    responseData?.sources?.goldRush === "live"
      ? "Live vendor intelligence"
      : responseData?.sources?.goldRush === "credits-exhausted-fallback"
        ? "Live fallback"
        : "Degraded fallback";

  return (
    <section className="rounded-[28px] border border-amber-300/16 bg-amber-300/[0.08] p-6">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-amber-100/76">
        <DatabaseZap className="h-4 w-4" />
        GoldRush intelligence workbench
      </div>
      <h2 className="mt-3 text-2xl font-semibold text-white">Structured on-chain intelligence for treasury and counterparty review</h2>
      <p className="mt-3 max-w-4xl text-sm leading-7 text-white/68">
        This surface makes GoldRush prominent where it belongs: before signature. It turns wallet history, stablecoin flow,
        counterparty trust, and holdings queries into a pre-execution review lane for normal users and a live evidence lane
        for judges.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {[
          ["Live execution", "This page does not move funds. It prepares signer context only."],
          ["Health / status", "Vendor, fallback, and runtime source states stay visible per request."],
          ["Intent receipt", "Every run can persist a reviewer-visible receipt without claiming settlement."],
          ["Full settlement", "Settlement belongs to Umbra, Cloak, and MagicBlock lanes after review."],
        ].map(([title, body]) => (
          <div key={title} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-sm font-medium text-white">{title}</div>
            <div className="mt-2 text-sm leading-6 text-white/60">{body}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/44">Query template</div>
            <div className="mt-3 grid gap-3">
              {goldRushTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setActiveTemplate(template.id)}
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-left transition",
                    activeTemplate === template.id
                      ? "border-amber-300/24 bg-amber-300/[0.10] text-white"
                      : "border-white/10 bg-black/20 text-white/68 hover:border-white/16 hover:bg-white/[0.04]",
                  )}
                >
                  <div className="text-sm font-medium text-white">{template.title}</div>
                  <div className="mt-1 text-sm leading-6 text-white/60">{template.summary}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/44">Wallet under review</div>
            <input
              value={walletAddress}
              onChange={(event) => setWalletAddress(event.target.value)}
              className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
              placeholder="Solana wallet address"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className={cn(buttonVariants({ size: "sm" }))} onClick={() => void handleRun()} disabled={running}>
                {running ? "Running..." : "Run GoldRush query"}
              </button>
              <Link href="/execute" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
                Continue to execute
              </Link>
              <Link href="/proof" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                Open proof path
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-cyan-100/76">
              <Radar className="h-4 w-4" />
              Delivery state
            </div>
            <div className="mt-3 text-sm leading-7 text-white/72">{deliveryState}</div>
            <div className="mt-3 rounded-2xl border border-cyan-300/16 bg-cyan-300/[0.08] px-3 py-2 text-sm text-cyan-50">
              {runtimeMode}
            </div>
            {responseData?.sources ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white/70">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">GoldRush</div>
                  <div className="mt-1 text-white">{responseData.sources.goldRush ?? "unknown"}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white/70">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">Dune Sim</div>
                  <div className="mt-1 text-white">{responseData.sources.duneSim ?? "unknown"}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white/70">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">Zerion</div>
                  <div className="mt-1 text-white">{responseData.sources.zerion ?? "not-used"}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white/70">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">Solana RPC</div>
                  <div className="mt-1 text-white">{responseData.sources.solanaRpc ?? "not-used"}</div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/44">Portfolio summary</div>
              <div className="mt-3 space-y-2 text-sm text-white/72">
                <div className="flex items-center justify-between gap-4">
                  <span>Assets tracked</span>
                  <span className="font-medium text-white">{responseData?.summary?.assetCount ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Stable positions</span>
                  <span className="font-medium text-white">{responseData?.summary?.stableAssetCount ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Estimated value</span>
                  <span className="font-medium text-white">{formatUsd(responseData?.summary?.totalQuoteUsd)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Preview txns</span>
                  <span className="font-medium text-white">{responseData?.summary?.previewTransactionCount ?? "—"}</span>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/44">Risk signals</div>
              <div className="mt-3 space-y-2 text-sm leading-6 text-white/70">
                {riskSignals.length > 0 ? (
                  riskSignals.map((signal) => (
                    <div key={signal} className="rounded-2xl border border-amber-300/14 bg-amber-300/[0.08] px-3 py-2">
                      {signal}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2">
                    Run a live query to generate reviewer-facing risk hints.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/44">Top holdings</div>
              <div className="mt-3 space-y-2 text-sm text-white/70">
                {topHoldings.length > 0 ? (
                  topHoldings.map((item, index) => (
                    <div key={`${item.symbol ?? item.name ?? "asset"}-${index}`} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/30 px-3 py-2">
                      <div>
                        <div className="font-medium text-white">{item.symbol ?? item.name ?? "Unknown asset"}</div>
                        <div className="text-xs text-white/50">{item.prettyBalance ?? "No pretty balance"}</div>
                      </div>
                      <div className="text-right font-medium text-white">{formatUsd(item.quote)}</div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2">
                    No holdings loaded yet.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/44">Stablecoin review</div>
              <div className="mt-3 space-y-2 text-sm text-white/70">
                {stablecoinHoldings.length > 0 ? (
                  stablecoinHoldings.map((item, index) => (
                    <div key={`${item.symbol ?? "stable"}-${index}`} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/30 px-3 py-2">
                      <div className="font-medium text-white">{item.symbol ?? "Stable asset"}</div>
                      <div className="text-right">
                        <div className="font-medium text-white">{formatUsd(item.quote)}</div>
                        <div className="text-xs text-white/50">{item.prettyBalance ?? "No pretty balance"}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2">
                    No stablecoin positions returned for this wallet.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-white/44">
              <WalletCards className="h-4 w-4 text-amber-100/76" />
              Prepared request payload
            </div>
            <pre className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-xs leading-6 text-white/70">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/44">Latest response preview</div>
            <pre className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-xs leading-6 text-white/70">
              {responsePreview || "Ready for a live GoldRush/Dune query. Run the workbench to populate this reviewer packet with wallet intelligence before signing."}
            </pre>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/services" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              Open services
            </Link>
            <a
              href="https://goldrush.dev/docs"
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            >
              GoldRush docs
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
