"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Activity, ArrowUpRight, Bot, Check, ChevronDown, CircleDollarSign, Clock3, Coins, Copy, ExternalLink, LayoutGrid, ListFilter, RefreshCw, Send, ShieldCheck, Sparkles, WalletCards } from "lucide-react";

import { WalletConnectButton } from "@/components/wallet-connect-button";
import { PrivyLoginButton } from "@/components/privy-login-button";
import { WalletOperationsPanel } from "@/components/wallet-operations-panel";
import { WalletFreeServicePanel } from "@/components/wallet-free-service-panel";
import { WalletTransferPanel } from "@/components/wallet-transfer-panel";
import { EvmWalletSessionPanel } from "@/components/evm-wallet-session-panel";
import { ShieldedBalancePanel } from "@/components/shielded-balance-panel";
import { readBalance, readParsedTokenAccountsByOwner, readSignaturesForAddress } from "@/lib/network-adapters/solana-browser";
import { buildSolanaAccountUrl, buildSolanaTxUrl, SOLANA_NETWORK_LABEL } from "@/lib/solana-network";
import { aggregateTokenBalances, formatTokenAmount, MAINNET_PDAO_MINT, MAINNET_USDC_MINT, tokenBalanceForMint, type WalletTokenBalance } from "@/lib/pdao-wallet-assets";
import { cn } from "@/lib/utils";

type ActivityItem = { signature: string; blockTime: number | null; err: unknown };
type WalletView = "overview" | "transfer" | "exchange" | "activity";

function formatDate(blockTime: number | null) {
  return blockTime ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(blockTime * 1000) : "Time unavailable";
}

export function PdaoWalletDashboard() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [solBalance, setSolBalance] = useState<bigint | null>(null);
  const [tokens, setTokens] = useState<WalletTokenBalance[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [view, setView] = useState<WalletView>("overview");
  const [addressCopied, setAddressCopied] = useState(false);

  const refresh = useCallback(async () => {
    if (!publicKey) {
      setSolBalance(null);
      setTokens([]);
      setActivity([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [lamports, classicAccounts, token2022Accounts, signatures] = await Promise.all([
        readBalance(connection, publicKey, "confirmed"),
        readParsedTokenAccountsByOwner(connection, publicKey, { programId: TOKEN_PROGRAM_ID }, "confirmed"),
        readParsedTokenAccountsByOwner(connection, publicKey, { programId: TOKEN_2022_PROGRAM_ID }, "confirmed"),
        readSignaturesForAddress(connection, publicKey, { limit: 10 }, "confirmed"),
      ]);
      const parsedAccounts = [...classicAccounts.value, ...token2022Accounts.value].flatMap((entry) => {
        const info = (entry.account.data as { parsed?: { info?: { mint?: unknown; tokenAmount?: { amount?: unknown; decimals?: unknown } } } }).parsed?.info;
        return info?.mint && info.tokenAmount ? [{
          mint: info.mint,
          amount: info.tokenAmount.amount,
          decimals: info.tokenAmount.decimals,
          program: entry.account.owner.equals(TOKEN_2022_PROGRAM_ID) ? "token-2022" : "spl-token",
        }] : [];
      });
      setSolBalance(BigInt(lamports));
      setTokens(aggregateTokenBalances(parsedAccounts));
      setActivity(signatures.map(({ signature, blockTime, err }) => ({ signature, blockTime: blockTime ?? null, err })));
      setUpdatedAt(new Date());
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Unable to load wallet data from Solana.");
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey]);

  useEffect(() => { void refresh(); }, [refresh]);

  const usdc = useMemo(() => tokenBalanceForMint(tokens, MAINNET_USDC_MINT), [tokens]);
  const pdao = useMemo(() => tokenBalanceForMint(tokens, MAINNET_PDAO_MINT), [tokens]);
  const address = publicKey?.toBase58() ?? "";

  async function copyAddress() {
    if (!address || !navigator.clipboard) return;
    await navigator.clipboard.writeText(address);
    setAddressCopied(true);
    window.setTimeout(() => setAddressCopied(false), 1600);
  }

  const tabs: Array<{ id: WalletView; label: string; icon: typeof LayoutGrid }> = [
    { id: "overview", label: "Overview", icon: LayoutGrid },
    { id: "transfer", label: "Transfer", icon: Send },
    { id: "exchange", label: "Agent Exchange", icon: Sparkles },
    { id: "activity", label: "Activity", icon: ListFilter },
  ];

  return (
    <div className="wallet-shell -mx-4 min-h-[calc(100vh-5rem)] sm:-mx-6 lg:-mx-8">
      <div className="wallet-app-bar sticky top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <a href="/wallet" className="flex min-w-0 items-center gap-3" aria-label="PrivateDAO Wallet home"><Image src="/assets/wallet/privatedao-symbol.png" alt="" width={32} height={32} priority className="h-8 w-8 object-contain" /><span className="truncate text-sm font-semibold tracking-[0.04em]">PrivateDAO Wallet</span></a>
          <div className="flex items-center gap-2"><PrivyLoginButton className="!border-[var(--wallet-line)] !bg-[var(--wallet-elevated)] !text-[var(--wallet-text)] !shadow-none hover:!bg-[#252a2f]" /><WalletConnectButton variant="secondary" className="!border-[var(--wallet-line)] !bg-[var(--wallet-elevated)] !text-[var(--wallet-text)] !shadow-none hover:!bg-[#252a2f]" connectLabel="Connect wallet" connectedLabelPrefix="Connected" /></div>
        </div>
        <nav className="mx-auto hidden max-w-7xl gap-1 px-4 sm:flex sm:px-6 lg:px-8" aria-label="Wallet sections">{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" className="wallet-tab inline-flex items-center gap-2 px-3 text-sm" data-active={view === id} onClick={() => setView(id)}><Icon className="h-4 w-4" />{label}</button>)}</nav>
      </div>

      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 pb-28 sm:px-6 sm:py-8 sm:pb-10 lg:px-8">
        <section className="wallet-hero p-5 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--wallet-secondary)]"><span className="wallet-status-dot" /> Non-custodial Mainnet wallet</div><h1 className="mt-3 max-w-3xl text-2xl font-semibold tracking-[-0.025em] sm:text-4xl">Institutional services, user-controlled assets.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--wallet-secondary)]">Use PrivateDAO services and Agent Exchange from the same wallet while every Mainnet action stays locally approved.</p></div><div className="flex shrink-0 flex-wrap gap-2"><button type="button" onClick={() => setView("transfer")} className="inline-flex min-h-11 items-center gap-2 bg-[var(--wallet-text)] px-4 text-sm font-semibold text-[var(--wallet-bg)] transition hover:bg-white"><Send className="h-4 w-4" /> Transfer</button><button type="button" onClick={() => setView("exchange")} className="inline-flex min-h-11 items-center gap-2 border border-[var(--wallet-line)] px-4 text-sm font-semibold text-[var(--wallet-text)] transition hover:bg-white/[0.05]"><Sparkles className="h-4 w-4" /> Agents</button></div></div>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--wallet-secondary)]"><span className="inline-flex items-center gap-2"><span className="wallet-status-dot" /> Solana {SOLANA_NETWORK_LABEL}</span>{connected && address ? <span className="inline-flex items-center gap-2"><button type="button" onClick={() => void copyAddress()} className="font-mono text-[var(--wallet-text)] underline-offset-4 hover:underline" title="Copy wallet address">{address.slice(0, 6)}...{address.slice(-6)}</button>{addressCopied ? <Check className="h-3.5 w-3.5 text-[var(--wallet-success)]" /> : <Copy className="h-3.5 w-3.5" />}<a href={buildSolanaAccountUrl(address)} target="_blank" rel="noreferrer" aria-label="Open wallet on Solscan"><ExternalLink className="h-3.5 w-3.5" /></a></span> : <span>Connect a wallet to load live Mainnet balances.</span>}</div>
        </section>

        {error ? <div role="alert" className="flex items-start justify-between gap-4 border border-[rgba(184,121,121,0.42)] bg-[rgba(184,121,121,0.1)] px-4 py-3 text-sm text-[#e3b8b8]"><span>{error}</span><button className="shrink-0 underline" type="button" onClick={() => void refresh()}>Retry</button></div> : null}

        {view === "overview" ? <><div className="grid gap-px overflow-hidden border border-[var(--wallet-line)] bg-[var(--wallet-line)] sm:grid-cols-3"><BalanceMetric icon={Coins} label="SOL" value={solBalance === null ? "—" : `${(Number(solBalance) / 1e9).toLocaleString("en-US", { maximumFractionDigits: 6 })} SOL`} detail="Native Mainnet balance" /><BalanceMetric icon={CircleDollarSign} label="USDC" value={formatTokenAmount(usdc.amountBaseUnits, usdc.decimals)} detail="Mainnet USDC" /><BalanceMetric icon={ShieldCheck} label="PDAO" value={formatTokenAmount(pdao.amountBaseUnits, pdao.decimals)} detail="Mainnet utility token" /></div><div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]"><ActivityPanel activity={activity} connected={connected} loading={loading} updatedAt={updatedAt} onRefresh={() => void refresh()} /><section className="wallet-data-panel p-5 sm:p-6"><div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-[var(--wallet-success)]" /> Security posture</div><p className="mt-3 text-sm leading-6 text-[var(--wallet-secondary)]">Your wallet remains in the browser. Every transaction requires an explicit wallet signature.</p><div className="mt-5 border-t border-[var(--wallet-line)] pt-4 text-xs text-[var(--wallet-muted)]">Risk analysis is shown when evidence is available. No finding is treated as a guarantee of safety.</div></section></div><details className="wallet-data-panel group"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6"><span><span className="block text-sm font-semibold text-[var(--wallet-text)]">More capabilities</span><span className="mt-1 block text-xs text-[var(--wallet-muted)]">Token holdings, networks, services, and PrivatePAY</span></span><ChevronDown className="h-4 w-4 text-[var(--wallet-secondary)] transition group-open:rotate-180" aria-hidden="true" /></summary><div className="space-y-5 border-t border-[var(--wallet-line)] p-5 sm:p-6"><TokenHoldings tokens={tokens} loading={loading} compact /><section aria-labelledby="wallet-additional-networks-title"><div className="flex items-start justify-between gap-4"><div><h2 id="wallet-additional-networks-title" className="text-sm font-semibold">Additional network sessions</h2><p className="mt-2 text-xs leading-5 text-[var(--wallet-secondary)]">EVM sessions can read native balances on selected Mainnets and testnets. Execution remains behind verified adapters and an explicit wallet signature.</p></div><span className="text-[11px] uppercase tracking-[0.14em] text-[var(--wallet-secondary)]">Mainnet + testnet</span></div><div className="mt-5"><EvmWalletSessionPanel /></div></section><div className="grid gap-3 sm:grid-cols-3"><ActionLinkDark href="/agents" icon={Bot} title="Agent Exchange" detail="Discover services" /><ActionLinkDark href="/privatepay" icon={WalletCards} title="PrivatePAY x402" detail="Review a quote" /><ActionLinkDark href="/token" icon={ShieldCheck} title="PDAO utility" detail="Official token information" /></div></div></details></> : null}
        {view === "transfer" ? <div className="space-y-5"><section className="wallet-legacy-panel p-1 sm:p-2"><WalletTransferPanel /></section><ShieldedBalancePanel /></div> : null}
        {view === "exchange" ? <div className="space-y-5"><section className="wallet-data-panel p-5 sm:p-6"><div className="flex items-center gap-3"><Sparkles className="h-5 w-5 text-[var(--wallet-success)]" /><div><h2 className="text-lg font-semibold">Agent Exchange</h2><p className="mt-1 text-sm text-[var(--wallet-secondary)]">Review read-only services first. Paid actions keep their existing quote, authorization, signing, and receipt gates.</p></div></div></section>{connected && address ? <WalletFreeServicePanel wallet={address} /> : <div className="wallet-data-panel px-5 py-8 text-center text-sm text-[var(--wallet-secondary)]">Connect a wallet to inspect wallet-aware services.</div>}<WalletOperationsPanel wallet={address} /></div> : null}
        {view === "activity" ? <ActivityPanel activity={activity} connected={connected} loading={loading} updatedAt={updatedAt} onRefresh={() => void refresh()} expanded /> : null}
        <div className="text-xs leading-6 text-[var(--wallet-muted)]">Balances and confirmed activity are read from Solana Mainnet RPC. Institutional governance and other service workflows open through their verified product routes; this wallet never signs without your explicit approval.</div>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-[var(--wallet-line)] bg-[rgba(12,14,16,0.96)] pb-[env(safe-area-inset-bottom)] sm:hidden" aria-label="Wallet sections">{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" className="wallet-mobile-tab" data-active={view === id} onClick={() => setView(id)}><Icon className="h-4 w-4" /><span>{label === "Agent Exchange" ? "Agents" : label}</span></button>)}</nav>
    </div>
  );
}

function BalanceMetric({ icon: Icon, label, value, detail }: { icon: typeof Coins; label: string; value: string; detail: string }) {
  return <div className="wallet-data-panel p-5"><div className="flex items-start justify-between gap-3"><div><div className="text-xs uppercase tracking-[0.16em] text-[var(--wallet-muted)]">{label}</div><div className="wallet-number mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--wallet-text)]">{value}</div></div><Icon className="h-4 w-4 text-[var(--wallet-secondary)]" /></div><div className="mt-5 text-xs text-[var(--wallet-muted)]">{detail}</div></div>;
}

function TokenHoldings({ tokens, loading, compact = false }: { tokens: WalletTokenBalance[]; loading: boolean; compact?: boolean }) {
  return (
    <section className={compact ? "border-b border-[var(--wallet-line)] pb-5" : "wallet-data-panel p-5 sm:p-6"} aria-labelledby="wallet-token-holdings-title"><div className="flex items-start justify-between gap-4"><div><h2 id="wallet-token-holdings-title" className="flex items-center gap-2 text-sm font-semibold"><WalletCards className="h-4 w-4 text-[var(--wallet-secondary)]" /> Token holdings</h2><p className="mt-2 text-xs leading-5 text-[var(--wallet-muted)]">Non-zero SPL Token and Token-2022 balances returned by Solana Mainnet RPC.</p></div><span className="text-xs text-[var(--wallet-muted)]">{tokens.length} assets</span></div>{loading && tokens.length === 0 ? <div className="mt-5 text-sm text-[var(--wallet-secondary)]">Loading token accounts...</div> : null}{!loading && tokens.length === 0 ? <div className="mt-5 border border-dashed border-[var(--wallet-line)] px-4 py-6 text-center text-sm text-[var(--wallet-secondary)]">No SPL token balances found for this wallet.</div> : null}{tokens.length > 0 ? <div className="mt-5 divide-y divide-[var(--wallet-line)]">{tokens.map((token) => <div key={token.mint} className="flex flex-col gap-2 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="font-mono text-xs text-[var(--wallet-secondary)]">{token.mint}</div><div className="mt-1 text-[11px] text-[var(--wallet-muted)]">{token.programs.map((program) => program === "token-2022" ? "Token-2022" : "SPL Token").join(" / ")}</div></div><div className="wallet-number text-left text-sm font-semibold text-[var(--wallet-text)] sm:text-right">{formatTokenAmount(token.amountBaseUnits, token.decimals)}<span className="ml-1 text-xs font-normal text-[var(--wallet-muted)]">{token.decimals} decimals</span></div></div>)}</div> : null}</section>
  );
}

function ActivityPanel({ activity, connected, loading, updatedAt, onRefresh, expanded = false }: { activity: ActivityItem[]; connected: boolean; loading: boolean; updatedAt: Date | null; onRefresh: () => void; expanded?: boolean }) {
  const items = expanded ? activity : activity.slice(0, 4);
  return <section className="wallet-data-panel p-5 sm:p-6" aria-labelledby="wallet-activity-title"><div className="flex items-start justify-between gap-4"><div><h2 id="wallet-activity-title" className="flex items-center gap-2 text-sm font-semibold"><Activity className="h-4 w-4 text-[var(--wallet-secondary)]" /> {expanded ? "Transaction history" : "Recent activity"}</h2><p className="mt-2 text-xs text-[var(--wallet-muted)]">{updatedAt ? `Updated ${updatedAt.toLocaleTimeString("en")}` : "Confirmed activity from Solana RPC"}</p></div><button type="button" aria-label="Refresh wallet data" title="Refresh wallet data" onClick={onRefresh} disabled={loading} className="inline-flex min-h-9 items-center gap-2 border border-[var(--wallet-line)] px-3 text-xs text-[var(--wallet-secondary)] transition hover:bg-white/[0.05] disabled:opacity-50"><RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh</button></div>{items.length === 0 ? <div className="mt-5 border border-dashed border-[var(--wallet-line)] px-4 py-8 text-center text-sm text-[var(--wallet-secondary)]">{connected ? "No confirmed activity returned for this wallet." : "Connect a wallet to see confirmed activity."}</div> : <div className="mt-5 divide-y divide-[var(--wallet-line)]">{items.map((item) => <a key={item.signature} href={buildSolanaTxUrl(item.signature)} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"><span className="flex min-w-0 items-center gap-3"><span className={cn("h-2 w-2 shrink-0 rounded-full", item.err ? "bg-[var(--wallet-danger)]" : "bg-[var(--wallet-success)]")} /><span className="truncate font-mono text-xs text-[var(--wallet-secondary)]">{item.signature}</span></span><span className="flex shrink-0 items-center gap-2 text-xs text-[var(--wallet-muted)]"><Clock3 className="h-3.5 w-3.5" />{formatDate(item.blockTime)}<ArrowUpRight className="h-3.5 w-3.5" /></span></a>)}</div>}</section>;
}

function ActionLinkDark({ href, icon: Icon, title, detail }: { href: string; icon: typeof Bot; title: string; detail: string }) {
  const external = href.startsWith("http");
  return <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className="wallet-data-panel flex items-center gap-3 p-4 transition hover:bg-[var(--wallet-elevated)]"><Icon className="h-4 w-4 shrink-0 text-[var(--wallet-secondary)]" /><span className="min-w-0"><span className="block text-sm font-semibold text-[var(--wallet-text)]">{title}</span><span className="block text-xs text-[var(--wallet-muted)]">{detail}</span></span><ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-[var(--wallet-muted)]" /></a>;
}
