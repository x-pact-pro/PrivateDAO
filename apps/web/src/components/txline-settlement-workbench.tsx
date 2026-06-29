"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clipboard, ExternalLink, EyeOff, KeyRound, LinkIcon, Play, ShieldCheck, Trophy, XCircle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import type { TxlineMatch, TxlineSettlementProofPackage } from "@/lib/txline-settlement";
import { cn } from "@/lib/utils";

const API_BASE = "/api/v1/txline";
const FALLBACK_API_BASE = "https://api.privatedao.org/api/v1/txline";
const storedTxlineSettlementProofKey = "privatedao-txline-settlement-proof";
const settlementTreasuryWallet = "4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD";

type MatchesResponse = {
  ok: boolean;
  providerMode: "live-txline-provider" | "simulated-txline-provider";
  source: string;
  note: string;
  matches: TxlineMatch[];
};

type ResolveResponse = {
  ok: boolean;
  status: string;
  providerMode?: string;
  providerSource?: string;
  match?: TxlineMatch;
  marketId?: string;
  winner?: string;
  txlineSnapshotHash?: string;
  proofHash?: string;
  publicProofPackage?: TxlineSettlementProofPackage;
  verification?: {
    ok: boolean;
    status: string;
    match: boolean;
    originalHash: string | null;
    recomputedHash: string | null;
    message: string;
  };
  error?: string;
};

type ReceiptResponse = {
  ok: boolean;
  status: string;
  source?: string;
  error?: string;
  onchainReceipt?: {
    storageMode: "solana-memo-receipt";
    cluster: string;
    authority: string;
    signature: string;
    transactionExplorerUrl: string;
  };
};

type VerifyResponse = {
  ok: boolean;
  status: string;
  originalHash: string | null;
  recomputedHash: string | null;
  message: string;
};

type GuestSessionResponse = {
  ok: boolean;
  status: string;
  txlineApiBase?: string;
  guestAuthUrl?: string;
  expiresIn?: string;
  nextStep?: string;
  token?: string;
  error?: string;
};

async function fetchJson(path: string, init?: RequestInit) {
  let response = await fetch(`${API_BASE}${path}`, init);
  const contentType = response.headers.get("content-type") ?? "";
  if (response.status === 404 || response.status === 405 || response.status === 502 || !contentType.includes("application/json")) {
    response = await fetch(`${FALLBACK_API_BASE}${path}`, init);
  }
  return { response, payload: await response.json() };
}

export function TxlineSettlementWorkbench() {
  const [matches, setMatches] = useState<TxlineMatch[]>([]);
  const [providerMode, setProviderMode] = useState<string>("loading");
  const [providerNote, setProviderNote] = useState<string>("");
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [marketId, setMarketId] = useState("worldcup-winner-market");
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [anchoring, setAnchoring] = useState(false);
  const [runningFullSettlement, setRunningFullSettlement] = useState(false);
  const [result, setResult] = useState<ResolveResponse>();
  const [tamper, setTamper] = useState<VerifyResponse>();
  const [receipt, setReceipt] = useState<ReceiptResponse>();
  const [guestSession, setGuestSession] = useState<GuestSessionResponse>();
  const [guestLoading, setGuestLoading] = useState(false);
  const [copiedGuestToken, setCopiedGuestToken] = useState(false);

  const selectedMatch = useMemo(
    () => matches.find((match) => match.matchId === selectedMatchId) ?? matches[0],
    [matches, selectedMatchId],
  );

  async function loadMatches() {
    setLoading(true);
    setResult(undefined);
    setTamper(undefined);
    setReceipt(undefined);
    try {
      const { payload } = await fetchJson("/matches", { headers: { Accept: "application/json" }, cache: "no-store" });
      const response = payload as MatchesResponse;
      setMatches(response.matches ?? []);
      setProviderMode(response.providerMode ?? "unknown");
      setProviderNote(response.note ?? "");
      setSelectedMatchId(response.matches?.[0]?.matchId ?? "");
    } finally {
      setLoading(false);
    }
  }

  async function resolveMarket() {
    if (!selectedMatch) return;
    setResolving(true);
    setResult(undefined);
    setTamper(undefined);
    setReceipt(undefined);
    const { response, payload } = await fetchJson("/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ matchId: selectedMatch.matchId, marketId }),
    });
    const nextResult = { ...(payload as ResolveResponse), ok: response.ok && Boolean((payload as ResolveResponse).ok) };
    if (nextResult.ok && nextResult.publicProofPackage && typeof window !== "undefined") {
      window.localStorage.setItem(storedTxlineSettlementProofKey, JSON.stringify(nextResult.publicProofPackage));
    }
    setResult(nextResult);
    setResolving(false);
  }

  async function runFullSettlement() {
    if (!selectedMatch) return;
    setRunningFullSettlement(true);
    setResolving(true);
    setAnchoring(false);
    setResult(undefined);
    setTamper(undefined);
    setReceipt(undefined);

    const resolvedFetch = await fetchJson("/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ matchId: selectedMatch.matchId, marketId }),
    });
    const nextResult = {
      ...(resolvedFetch.payload as ResolveResponse),
      ok: resolvedFetch.response.ok && Boolean((resolvedFetch.payload as ResolveResponse).ok),
    };
    setResult(nextResult);
    setResolving(false);

    if (!nextResult.ok || !nextResult.publicProofPackage) {
      setRunningFullSettlement(false);
      return;
    }

    setAnchoring(true);
    const receiptFetch = await fetchJson("/onchain-receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ publicProofPackage: nextResult.publicProofPackage }),
    });
    const nextReceipt = receiptFetch.payload as ReceiptResponse;
    if (nextReceipt.ok && nextReceipt.onchainReceipt && typeof window !== "undefined") {
      window.localStorage.setItem(
        storedTxlineSettlementProofKey,
        JSON.stringify({ ...nextResult.publicProofPackage, onchainReceipt: nextReceipt.onchainReceipt }),
      );
    } else if (typeof window !== "undefined") {
      window.localStorage.setItem(storedTxlineSettlementProofKey, JSON.stringify(nextResult.publicProofPackage));
    }
    setReceipt(nextReceipt);
    setAnchoring(false);
    setRunningFullSettlement(false);
  }

  async function simulateTamper() {
    if (!result?.publicProofPackage) return;
    const tampered = {
      ...result.publicProofPackage,
      marketId: `${result.publicProofPackage.marketId}-tampered`,
    };
    const { payload } = await fetchJson("/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ publicProofPackage: tampered }),
    });
    setTamper(payload as VerifyResponse);
  }

  async function storeReceipt() {
    if (!result?.publicProofPackage) return;
    setAnchoring(true);
    setReceipt(undefined);
    const { payload } = await fetchJson("/onchain-receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ publicProofPackage: result.publicProofPackage }),
    });
    const nextReceipt = payload as ReceiptResponse;
    if (nextReceipt.ok && nextReceipt.onchainReceipt && typeof window !== "undefined") {
      window.localStorage.setItem(
        storedTxlineSettlementProofKey,
        JSON.stringify({ ...result.publicProofPackage, onchainReceipt: nextReceipt.onchainReceipt }),
      );
    }
    setReceipt(nextReceipt);
    setAnchoring(false);
  }

  async function startFreeTxlineApi() {
    setGuestLoading(true);
    setCopiedGuestToken(false);
    try {
      const { response, payload } = await fetchJson("/guest/start", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      setGuestSession({ ...(payload as GuestSessionResponse), ok: response.ok && Boolean((payload as GuestSessionResponse).ok) });
    } finally {
      setGuestLoading(false);
    }
  }

  async function copyGuestToken() {
    if (!guestSession?.token || typeof navigator === "undefined") return;
    await navigator.clipboard.writeText(guestSession.token);
    setCopiedGuestToken(true);
  }

  useEffect(() => {
    void loadMatches();
  }, []);

  return (
    <div className="grid gap-5">
      <section className="rounded-[28px] border border-cyan-300/16 bg-cyan-300/[0.055] p-5 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <div className="text-[11px] uppercase tracking-[0.25em] text-cyan-100/76">PrivateDAO Match Settlement</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-white">
              Sell verified World Cup settlement in one click.
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/64">
              Pick a match market, resolve it from TxLINE-compatible data, prove the hidden payout policy, and publish
              a receipt customers can verify. Operators see a clean workflow; buyers see a tamper-proof outcome.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/24 p-4 text-sm leading-6 text-white/62">
                <div className="text-[11px] uppercase tracking-[0.2em] text-white/40">Data mode</div>
                <div className="mt-2 font-semibold text-white">{providerMode}</div>
                <div className="mt-1">{providerNote || "Loading provider status..."}</div>
              </div>
              <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] p-4 text-sm leading-6 text-white/66">
                <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-100/70">What is sold</div>
                <div className="mt-2 font-semibold text-white">Result data + private policy proof + public receipt</div>
                <div className="mt-1">Built for prediction markets, pools, contests, and payout review.</div>
              </div>
            </div>
            <div className="mt-3 grid gap-3 rounded-2xl border border-amber-300/15 bg-amber-300/[0.07] p-4 text-sm leading-6 text-white/68 sm:grid-cols-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-amber-100/70">Official source</div>
                <div className="mt-1 font-semibold text-white">TxLINE txdoc schedule</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-amber-100/70">Soccer catalog</div>
                <div className="mt-1 font-semibold text-white">International Friendlies ID 430</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-amber-100/70">On-chain target</div>
                <div className="mt-1 font-semibold text-white">validate_stat CPI-ready</div>
              </div>
            </div>
            <div className="mt-3 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.07] p-4 text-sm leading-6 text-white/68">
              <div className="font-semibold text-emerald-100">Revenue wallet locked for this product</div>
              <div className="mt-1 break-all">
                All product revenue, receipt fees, and settlement payments route to:{" "}
                <span className="font-mono text-white">{settlementTreasuryWallet}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <label className="grid gap-2 text-sm text-white/70">
              Match
              <select
                value={selectedMatchId}
                onChange={(event) => setSelectedMatchId(event.target.value)}
                className="rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none focus:border-cyan-200/60"
              >
                {matches.map((match) => (
                  <option key={match.matchId} value={match.matchId}>
                    {match.officialFixtureId ?? match.matchId} - {match.homeTeam} vs {match.awayTeam} - {match.status}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm text-white/70">
              Market ID
              <input
                value={marketId}
                onChange={(event) => setMarketId(event.target.value)}
                className="rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none focus:border-cyan-200/60"
              />
            </label>
            <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/64">
              <div className="flex items-center justify-between gap-3">
                <span>Official fixture</span>
                <span className="font-mono text-xs font-semibold text-white">{selectedMatch?.officialFixtureId ?? selectedMatch?.matchId ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Competition</span>
                <span className="text-right font-semibold text-white">{selectedMatch?.fixtureGroup ?? selectedMatch?.competition ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Status</span>
                <span className="font-semibold text-white">{selectedMatch?.status ?? "Loading"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Score</span>
                <span className="font-semibold text-white">
                  {selectedMatch ? `${selectedMatch.score.home}-${selectedMatch.score.away}` : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Odds</span>
                <span className="font-semibold text-white">
                  {selectedMatch?.oddsSnapshot
                    ? `${selectedMatch.oddsSnapshot.home} / ${selectedMatch.oddsSnapshot.draw ?? "-"} / ${selectedMatch.oddsSnapshot.away}`
                    : "Not available"}
                </span>
              </div>
              {selectedMatch?.coverageNote && (
                <div className="rounded-xl border border-cyan-300/12 bg-cyan-300/[0.06] px-3 py-2 text-xs leading-5 text-cyan-50/72">
                  {selectedMatch.coverageNote}
                </div>
              )}
            </div>
            <button
              disabled={runningFullSettlement || resolving || anchoring || !selectedMatch}
              onClick={runFullSettlement}
              className={cn(buttonVariants({ size: "lg" }), "w-full")}
            >
              <Play className="h-4 w-4" />
              {runningFullSettlement ? "Running settlement..." : "Run full settlement"}
            </button>
            <div className="flex flex-wrap gap-3">
              <button disabled={loading} onClick={loadMatches} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                Refresh matches
              </button>
              <button disabled={resolving || !selectedMatch} onClick={resolveMarket} className={cn(buttonVariants({ size: "sm" }))}>
                <Play className="h-4 w-4" />
                {resolving ? "Resolving..." : "Resolve Market"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-200/20 bg-cyan-300/[0.08] text-cyan-100">
              <KeyRound className="h-4 w-4" />
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-white">Activate the free TxLINE API path.</h3>
            <p className="mt-3 text-sm leading-7 text-white/64">
              TxLINE&apos;s free World Cup tier starts with a guest JWT, then a wallet-signed free subscription activation.
              PrivateDAO keeps the product usable now, and switches to live TxLINE as soon as the activated API token is configured.
              Secrets are never displayed in this UI.
            </p>
          </div>
          <div className="grid gap-3">
            <div className="grid gap-2 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/64">
              <div className="font-semibold text-white">Live activation sequence</div>
              <div>1. Start guest session from TxLINE.</div>
              <div>2. Sign the free World Cup subscription on-chain with the revenue wallet.</div>
              <div>3. Activate the subscription and store the returned API token as TXLINE_API_TOKEN.</div>
              <div>4. Match data switches from simulated mode to live TxLINE mode automatically.</div>
            </div>
            <button disabled={guestLoading} onClick={startFreeTxlineApi} className={cn(buttonVariants({ size: "sm" }), "w-fit")}>
              <KeyRound className="h-4 w-4" />
              {guestLoading ? "Starting guest session..." : "Start free TxLINE API"}
            </button>
            {guestSession && (
              <div
                className={`rounded-2xl border p-4 text-sm leading-6 ${
                  guestSession.ok ? "border-emerald-300/18 bg-emerald-300/[0.06] text-white/68" : "border-red-300/18 bg-red-400/[0.06] text-white/68"
                }`}
              >
                <div className="font-semibold text-white">
                  {guestSession.ok ? "Guest JWT issued" : "Guest session failed"}: {guestSession.status}
                </div>
                {guestSession.ok && guestSession.token ? (
                  <>
                    <div className="mt-2 rounded-xl border border-white/10 bg-black/22 px-3 py-2 font-mono text-xs text-white/60">
                      JWT received and hidden from screen.
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button onClick={copyGuestToken} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                        <Clipboard className="h-4 w-4" />
                        {copiedGuestToken ? "Copied" : "Copy JWT"}
                      </button>
                      <a
                        href="https://txline.txodds.com/documentation"
                        target="_blank"
                        rel="noreferrer"
                        className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                      >
                        <ExternalLink className="h-4 w-4" />
                        TxLINE activation docs
                      </a>
                    </div>
                    <p className="mt-3 text-white/60">{guestSession.nextStep}</p>
                  </>
                ) : (
                  <p className="mt-2 text-white/60">{guestSession.error}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {result && (
        <section className={`rounded-[28px] border p-5 sm:p-6 ${result.ok ? "border-emerald-300/18 bg-emerald-300/[0.06]" : "border-red-300/18 bg-red-400/[0.06]"}`}>
          <div className="flex items-start gap-3">
            {result.ok ? <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-100" /> : <XCircle className="mt-1 h-5 w-5 text-red-100" />}
            <div>
              <div className="text-xl font-semibold text-white">
                {result.ok ? "Settlement proof issued" : "Settlement blocked"}
              </div>
              <p className="mt-2 text-sm leading-7 text-white/64">
                {result.ok
                  ? "The match result was checked, the hidden settlement policy passed, Groth16 verification succeeded, and the proof package is ready for public verification."
                  : result.error}
              </p>
            </div>
          </div>

          {result.ok && result.publicProofPackage && (
            <div className="mt-5 grid gap-3 lg:grid-cols-5">
              {[
                ["TxLINE data", "Verified"],
                ["Policy", "Satisfied"],
                ["Groth16", result.verification?.ok ? "Verified" : "Failed"],
                ["Proof hash", result.proofHash?.slice(0, 18) ?? "-"],
                ["Private logic", "Hidden"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-black/22 p-4">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-white/42">{label}</div>
                  <div className="mt-2 text-sm font-semibold text-white">{value}</div>
                </div>
              ))}
            </div>
          )}

          {result.ok && (
            <div className="mt-5 flex flex-wrap gap-3">
              <a href={`/txline-settlement/verify/${result.publicProofPackage?.proofId ?? "demo"}`} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                <ShieldCheck className="h-4 w-4" />
                Open public verify
              </a>
              <button onClick={simulateTamper} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                Simulate Tamper
              </button>
              <button disabled={anchoring} onClick={storeReceipt} className={cn(buttonVariants({ size: "sm" }))}>
                <LinkIcon className="h-4 w-4" />
                {anchoring ? "Storing..." : "Store receipt on Solana"}
              </button>
            </div>
          )}
        </section>
      )}

      {tamper && (
        <section className="rounded-[28px] border border-red-300/18 bg-red-400/[0.06] p-5 sm:p-6">
          <div className="flex items-center gap-2 text-lg font-semibold text-white">
            <XCircle className="h-5 w-5 text-red-100" />
            Tamper rejected: {tamper.status}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/22 p-4">
              <div className="text-[11px] uppercase tracking-[0.2em] text-white/42">Original hash</div>
              <div className="mt-2 break-all font-mono text-xs text-white/70">{tamper.originalHash}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/22 p-4">
              <div className="text-[11px] uppercase tracking-[0.2em] text-white/42">Recomputed hash</div>
              <div className="mt-2 break-all font-mono text-xs text-white/70">{tamper.recomputedHash}</div>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-white/62">{tamper.message}</p>
        </section>
      )}

      {receipt && (
        <section className={`rounded-[28px] border p-5 sm:p-6 ${receipt.ok ? "border-emerald-300/18 bg-emerald-300/[0.06]" : "border-red-300/18 bg-red-400/[0.06]"}`}>
          <div className="flex items-center gap-2 text-lg font-semibold text-white">
            {receipt.ok ? <Trophy className="h-5 w-5 text-emerald-100" /> : <XCircle className="h-5 w-5 text-red-100" />}
            {receipt.ok ? "Solana receipt stored" : "Solana receipt failed"}
          </div>
          {receipt.ok && receipt.onchainReceipt ? (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/22 p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-white/42">Network</div>
                <div className="mt-2 text-sm font-semibold text-white">Solana Mainnet</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/22 p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-white/42">Transaction</div>
                <div className="mt-2 break-all font-mono text-xs font-semibold text-white">{receipt.onchainReceipt.signature}</div>
              </div>
              <a
                href={receipt.onchainReceipt.transactionExplorerUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-white/10 bg-black/22 p-4 transition hover:border-emerald-200/40"
              >
                <div className="text-[11px] uppercase tracking-[0.2em] text-white/42">Explorer</div>
                <div className="mt-2 text-sm font-semibold text-emerald-100">Open transaction</div>
              </a>
              <div className="rounded-2xl border border-white/10 bg-black/22 p-4 md:col-span-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-white/42">Receipt signer and revenue wallet</div>
                <div className="mt-2 break-all font-mono text-xs text-white/70">{receipt.onchainReceipt.authority}</div>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-7 text-white/62">{receipt.error}</p>
          )}
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <EyeOff className="h-4 w-4 text-violet-100" />
            Hidden during settlement
          </div>
          <div className="mt-4 grid gap-2 text-sm leading-6 text-white/62">
            <div>Internal settlement policy</div>
            <div>Risk thresholds</div>
            <div>Payout routing logic</div>
            <div>Operator review notes</div>
          </div>
        </article>
        <article className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <CheckCircle2 className="h-4 w-4 text-emerald-100" />
            Publicly verifiable
          </div>
          <div className="mt-4 grid gap-2 text-sm leading-6 text-white/62">
            <div>TxLINE snapshot hash</div>
            <div>Settlement proof hash</div>
            <div>Groth16 verification result</div>
            <div>Solana receipt link</div>
          </div>
        </article>
      </section>
    </div>
  );
}
