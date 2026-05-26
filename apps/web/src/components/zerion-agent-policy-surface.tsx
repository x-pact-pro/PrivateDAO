"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { WalletOrSnsInput } from "@/components/wallet-or-sns-input";
import { persistOperationReceipt } from "@/lib/supabase/operation-receipts";
import { cn } from "@/lib/utils";

const policyTemplates = [
  {
    id: "stablecoin-payroll-agent",
    title: "Stablecoin payroll agent",
    action: "Prepare PUSD or USDC payroll settlement after DAO approval.",
    spendLimit: "25 PUSD per execution",
    expiry: "48h",
    allowed: ["Solana only", "SPL stablecoin transfer", "memo-coded payroll proof"],
    blocked: ["unbounded swaps", "unknown recipients", "execution without governance approval"],
  },
  {
    id: "treasury-rebalance-agent",
    title: "Treasury rebalance agent",
    action: "Prepare a governed rebalance instruction when treasury policy requests it.",
    spendLimit: "5% of route allocation",
    expiry: "24h",
    allowed: ["Solana only", "quote-aware rebalance", "operator review before signing"],
    blocked: ["cross-chain bridge without policy", "slippage above policy", "recurring execution without renewal"],
  },
  {
    id: "gaming-reward-agent",
    title: "Gaming reward agent",
    action: "Prepare reward distribution after tournament or guild proposal finalization.",
    spendLimit: "100 PUSD reward pool",
    expiry: "72h",
    allowed: ["reward pool transfer", "ranked recipient list", "memo-coded reward proof"],
    blocked: ["anonymous recipient expansion", "post-expiry payout", "wallet-draining batch"],
  },
];

function buildPolicyPayload(template: (typeof policyTemplates)[number]) {
  return {
    project: "PrivateDAO",
    integration: "zerion-cli-agent-policy",
    agentId: template.id,
    chainLock: "solana",
    executionMode: "approve-before-execute",
    action: template.action,
    spendLimit: template.spendLimit,
    expiryWindow: template.expiry,
    requiredProof: ["dao-proposal", "wallet-signature", "memo-label", "explorer-signature"],
    allowedActions: template.allowed,
    blockedActions: template.blocked,
    productRoutes: {
      govern: "https://privatedao.org/govern/",
      billing: "https://privatedao.org/services/testnet-billing-rehearsal/",
      judge: "https://privatedao.org/judge/",
      proof: "https://privatedao.org/proof/?judge=1",
    },
  };
}

type ZerionPortfolioResponse = {
  ok?: boolean;
  source?: string;
  status?: number;
  walletAddress?: string;
  currency?: string;
  positionsFilter?: string;
  summary?: {
    totalPositionsUsd?: number | null;
    absoluteChange1d?: number | null;
    percentChange1d?: number | null;
  };
  positionsDistributionByType?: Record<string, number>;
  positionsDistributionByChain?: Record<string, number>;
  cache?: {
    hit?: boolean;
    cachedAt?: string;
    staleBecause?: string;
    upstreamStatus?: number;
  };
  error?: string;
};

function formatUsd(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

export function ZerionAgentPolicySurface() {
  const [activeId, setActiveId] = useState(policyTemplates[0].id);
  const [walletAddress, setWalletAddress] = useState("");
  const [portfolioState, setPortfolioState] = useState(
    "Load a live wallet portfolio summary here before allowing an autonomous agent lane to be treated as safe enough for operator review.",
  );
  const [portfolio, setPortfolio] = useState<ZerionPortfolioResponse | null>(null);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const activePolicy = policyTemplates.find((policy) => policy.id === activeId) ?? policyTemplates[0];
  const payload = useMemo(() => buildPolicyPayload(activePolicy), [activePolicy]);
  const payloadText = JSON.stringify(payload, null, 2);
  const topChains = Object.entries(portfolio?.positionsDistributionByChain ?? {})
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4);
  const topTypes = Object.entries(portfolio?.positionsDistributionByType ?? {})
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4);

  async function handleLoadPortfolio() {
    const endpoint = process.env.NEXT_PUBLIC_ZERION_PORTFOLIO_ENDPOINT?.trim() || "https://api.privatedao.org/api/v1/zerion/portfolio";
    const defaultWallet = "4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD";
    const walletRef = walletAddress.trim() || defaultWallet;
    const reference = `zerion-${Date.now()}`;

    setLoadingPortfolio(true);
    setPortfolioState("Requesting Zerion wallet portfolio...");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: walletRef,
          currency: "usd",
          positionsFilter: "only_simple",
          sync: false,
        }),
      });
      const body = (await response.json().catch(() => null)) as ZerionPortfolioResponse | null;
      setPortfolio(body);
      const cacheNote = body?.cache?.hit ? ` Cache used${body.cache.staleBecause ? ` after ${body.cache.staleBecause}` : ""}.` : "";
      setPortfolioState(response.ok ? `Zerion portfolio summary received.${cacheNote}` : body?.error ?? `Zerion endpoint responded ${response.status}.`);

      await persistOperationReceipt({
        operationType: "zerion-policy-portfolio-check",
        proposalId: `zerion:${activePolicy.id}`,
        approvalState: response.ok ? "verified" : "failed",
        executionReference: reference,
        privateSettlementRail: "zerion-policy",
        stablecoinSymbol: "USDC",
        auditMode: "policy-bound-check",
        recipientVisibility: "n/a",
        metadata: {
          wallet: walletRef,
          endpoint,
          policyId: activePolicy.id,
          responseStatus: response.ok ? "ok" : "failed",
        },
      });
    } catch (error) {
      setPortfolio(null);
      setPortfolioState(error instanceof Error ? error.message : "Zerion portfolio request failed.");

      await persistOperationReceipt({
        operationType: "zerion-policy-portfolio-check",
        proposalId: `zerion:${activePolicy.id}`,
        approvalState: "failed",
        executionReference: reference,
        privateSettlementRail: "zerion-policy",
        stablecoinSymbol: "USDC",
        auditMode: "policy-bound-check",
        recipientVisibility: "n/a",
        metadata: {
          wallet: walletRef,
          endpoint,
          policyId: activePolicy.id,
          responseStatus: "error",
          error: error instanceof Error ? error.message : "unknown error",
        },
      });
    } finally {
      setLoadingPortfolio(false);
    }
  }

  return (
    <section className="rounded-[32px] border border-white/10 bg-[#06111f]/88 p-6 shadow-2xl shadow-cyan-950/20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.34em] text-cyan-200/78">Zerion CLI track surface</div>
          <h2 className="mt-3 max-w-3xl text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">
            Policy-bound autonomous execution, with no god-mode agent
          </h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-white/64">
            PrivateDAO treats the agent as an execution assistant, not an unchecked trader. The policy object locks the
            agent to Solana, caps spend, expires authority, blocks unsafe actions, and requires a DAO-approved route
            before any wallet execution layer is allowed to move value.
          </p>
        </div>
        <Badge variant="cyan">Scoped policies</Badge>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {policyTemplates.map((policy) => (
          <button
            key={policy.id}
            type="button"
            onClick={() => setActiveId(policy.id)}
            className={cn(
              "rounded-3xl border p-5 text-left transition",
              activeId === policy.id
                ? "border-cyan-300/45 bg-cyan-300/[0.10]"
                : "border-white/8 bg-white/[0.03] hover:border-white/16 hover:bg-white/[0.05]",
            )}
          >
            <div className="text-base font-semibold text-white">{policy.title}</div>
            <p className="mt-3 text-sm leading-7 text-white/58">{policy.action}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em] text-white/54">
              <span className="rounded-full border border-white/10 px-3 py-1">{policy.spendLimit}</span>
              <span className="rounded-full border border-white/10 px-3 py-1">{policy.expiry}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-emerald-300/14 bg-emerald-300/[0.06] p-5">
          <div className="text-sm font-semibold text-emerald-100">Execution guardrails</div>
          <div className="mt-4 space-y-4">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-white/44">Allowed</div>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-white/64">
                {activePolicy.allowed.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-white/44">Blocked</div>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-white/64">
                {activePolicy.blocked.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/govern" className={cn(buttonVariants({ size: "sm" }))}>
              Open govern
            </Link>
            <Link href="/services/testnet-billing-rehearsal" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
              Run billing route
            </Link>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-3xl border border-cyan-300/16 bg-cyan-300/[0.08] p-5">
            <div className="text-sm font-semibold text-cyan-100">Live wallet portfolio check</div>
              <div className="mt-2 text-sm leading-7 text-white/64">
              Before treating the agent as operationally useful, review the live wallet portfolio that the policy is supposed to protect. Empty input uses the funded PrivateDAO Testnet operator wallet.
            </div>
            <div className="mt-4">
              <WalletOrSnsInput
                label="Wallet protected by the policy"
                value={walletAddress}
                onChange={setWalletAddress}
                placeholder="wallet.sol, EVM address, or leave empty to use project wallet"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={() => void handleLoadPortfolio()} className={cn(buttonVariants({ size: "sm" }))} disabled={loadingPortfolio}>
                {loadingPortfolio ? "Loading..." : "Load Zerion portfolio"}
              </button>
              <Link href="/documents/zerion-autonomous-agent-policy" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                Open policy packet
              </Link>
            </div>
            <div className="mt-4 text-sm leading-7 text-white/68">{portfolioState}</div>
            {portfolio?.cache?.hit ? (
              <div className="mt-3 rounded-2xl border border-emerald-300/16 bg-emerald-300/[0.08] px-3 py-2 text-xs leading-6 text-emerald-50/82">
                Zerion cache hit: {portfolio.cache.cachedAt ?? "recent"}{portfolio.cache.staleBecause ? ` · ${portfolio.cache.staleBecause}` : ""}
              </div>
            ) : null}
            {portfolio ? (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/68">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/46">Total portfolio</div>
                  <div className="mt-2 text-base font-medium text-white">{formatUsd(portfolio.summary?.totalPositionsUsd)}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/68">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/46">1d absolute</div>
                  <div className="mt-2 text-base font-medium text-white">{formatUsd(portfolio.summary?.absoluteChange1d)}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/68">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/46">1d percent</div>
                  <div className="mt-2 text-base font-medium text-white">
                    {typeof portfolio.summary?.percentChange1d === "number" ? `${portfolio.summary.percentChange1d.toFixed(2)}%` : "N/A"}
                  </div>
                </div>
              </div>
            ) : null}
            {portfolio ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/46">Top chains</div>
                  <div className="mt-3 space-y-2 text-sm text-white/68">
                    {topChains.map(([chain, value]) => (
                      <div key={chain} className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-black/20 px-3 py-2">
                        <span className="text-white">{chain}</span>
                        <span>{formatUsd(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/46">Position types</div>
                  <div className="mt-3 space-y-2 text-sm text-white/68">
                    {topTypes.map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-black/20 px-3 py-2">
                        <span className="text-white">{label}</span>
                        <span>{formatUsd(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/24 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-white">Policy payload for Zerion CLI fork</div>
              <div className="mt-1 text-xs text-white/46">Use this as the agent policy object before wallet execution.</div>
            </div>
            <button
              type="button"
              onClick={() => void navigator.clipboard?.writeText(payloadText)}
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            >
              Copy JSON
            </button>
          </div>
          <pre className="mt-4 max-h-[420px] overflow-auto rounded-2xl border border-white/8 bg-black/40 p-4 text-xs leading-6 text-cyan-100/82">
            {payloadText}
          </pre>
        </div>
        </div>
      </div>
    </section>
  );
}
