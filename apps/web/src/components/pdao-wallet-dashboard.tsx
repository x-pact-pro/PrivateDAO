"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Activity, ArrowUpRight, Bot, CheckCircle2, CircleDollarSign, Clock3, Coins, ExternalLink, RefreshCw, ShieldCheck, WalletCards } from "lucide-react";

import { WalletConnectButton } from "@/components/wallet-connect-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { buildSolanaAccountUrl, buildSolanaTxUrl, SOLANA_NETWORK_LABEL } from "@/lib/solana-network";
import { aggregateTokenBalances, formatTokenAmount, MAINNET_PDAO_MINT, MAINNET_USDC_MINT, tokenBalanceForMint, type WalletTokenBalance } from "@/lib/pdao-wallet-assets";
import { cn } from "@/lib/utils";

type ActivityItem = { signature: string; blockTime: number | null; err: unknown };

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
        connection.getBalance(publicKey, "confirmed"),
        connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID }, "confirmed"),
        connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_2022_PROGRAM_ID }, "confirmed"),
        connection.getSignaturesForAddress(publicKey, { limit: 10 }, "confirmed"),
      ]);
      const parsedAccounts = [...classicAccounts.value, ...token2022Accounts.value].flatMap((entry) => {
        const info = (entry.account.data as { parsed?: { info?: { mint?: unknown; tokenAmount?: { amount?: unknown; decimals?: unknown } } } }).parsed?.info;
        return info?.mint && info.tokenAmount ? [{ mint: info.mint, amount: info.tokenAmount.amount, decimals: info.tokenAmount.decimals }] : [];
      });
      setSolBalance(BigInt(lamports));
      setTokens(aggregateTokenBalances(parsedAccounts));
      setActivity(signatures.map(({ signature, blockTime, err }) => ({ signature, blockTime, err })));
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

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] border border-[#dce5f0] bg-[#10233f] p-6 text-white shadow-[0_18px_44px_rgba(16,35,63,0.14)] sm:p-8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
          <div>
            <Badge variant="cyan">Non-custodial wallet</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">Your PrivateDAO Wallet</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">Connect a Solana wallet to view real Mainnet assets and activity, then continue to Agent Exchange or PrivatePAY without handing over a private key.</p>
          </div>
          <WalletConnectButton variant="secondary" connectLabel="Choose wallet" connectedLabelPrefix="Connected" />
        </div>
        <div className="mt-7 flex flex-wrap items-center gap-3 text-xs text-white/60">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1.5 text-emerald-100"><CheckCircle2 className="h-3.5 w-3.5" /> Solana {SOLANA_NETWORK_LABEL}</span>
          {connected && address ? <a className="inline-flex items-center gap-2 underline-offset-4 hover:underline" href={buildSolanaAccountUrl(address)} target="_blank" rel="noreferrer">{address.slice(0, 6)}...{address.slice(-6)} <ExternalLink className="h-3.5 w-3.5" /></a> : <span>Wallet stays in your browser</span>}
        </div>
      </section>

      {error ? <div role="alert" className="flex items-start justify-between gap-4 rounded-[16px] border border-[#f0c9cd] bg-[#fff7f7] px-4 py-3 text-sm text-[#9b3038]"><span>{error}</span><button className="shrink-0 underline" type="button" onClick={() => void refresh()}>Retry</button></div> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <BalanceCard icon={Coins} label="SOL" value={solBalance === null ? "—" : `${(Number(solBalance) / 1e9).toLocaleString("en-US", { maximumFractionDigits: 6 })} SOL`} detail="Native Mainnet balance" />
        <BalanceCard icon={CircleDollarSign} label="USDC" value={formatTokenAmount(usdc.amountBaseUnits, usdc.decimals)} detail="Mainnet USDC" />
        <BalanceCard icon={ShieldCheck} label="PDAO" value={formatTokenAmount(pdao.amountBaseUnits, pdao.decimals)} detail="Mainnet utility token" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4"><div><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-[#175cd3]" /> Recent activity</CardTitle><CardDescription>{updatedAt ? `Updated ${updatedAt.toLocaleTimeString("en")}` : "Connect a wallet to load confirmed activity."}</CardDescription></div><button type="button" aria-label="Refresh wallet data" title="Refresh wallet data" onClick={() => void refresh()} disabled={loading} className={cn(buttonVariants({ size: "sm", variant: "outline" }), "shrink-0")}>{loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}<span className="hidden sm:inline">Refresh</span></button></CardHeader>
          <CardContent>{activity.length === 0 ? <div className="rounded-[14px] border border-dashed border-[#dce5f0] px-4 py-8 text-center text-sm text-[#5d6d82]">{connected ? "No confirmed activity returned for this wallet." : "Choose a wallet to see its confirmed activity."}</div> : <div className="divide-y divide-[#edf1f6]">{activity.map((item) => <a key={item.signature} href={buildSolanaTxUrl(item.signature)} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"><span className="flex min-w-0 items-center gap-3"><span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", item.err ? "bg-[#c53d49]" : "bg-[#079669]")} /><span className="truncate font-mono text-xs text-[#425570]">{item.signature}</span></span><span className="flex shrink-0 items-center gap-2 text-xs text-[#7a8ba0]"><Clock3 className="h-3.5 w-3.5" />{formatDate(item.blockTime)}<ArrowUpRight className="h-3.5 w-3.5" /></span></a>)}</div>}</CardContent>
        </Card>
        <Card><CardHeader><CardTitle>Continue in PrivateDAO</CardTitle><CardDescription>Use the connected wallet in the service that matches your next action.</CardDescription></CardHeader><CardContent className="space-y-3"><ActionLink href="/agents" icon={Bot} title="Agent Exchange" detail="Discover and run services" /><ActionLink href="/privatepay" icon={WalletCards} title="PrivatePAY x402" detail="Review a quote and pay" /><ActionLink href="/token" icon={ShieldCheck} title="PDAO utility" detail="View official token information" /></CardContent></Card>
      </div>

      <div className="rounded-[16px] border border-[#f0d29d] bg-[#fffaf0] px-4 py-3 text-sm leading-6 text-[#73531a]">Mainnet asset balances are read from Solana RPC. PrivateDAO governance remains a separate Testnet workflow until its program and deployment are verified for Mainnet.</div>
    </div>
  );
}

function BalanceCard({ icon: Icon, label, value, detail }: { icon: typeof Coins; label: string; value: string; detail: string }) {
  return <Card><CardContent className="p-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#f1f8ff] text-[#175cd3]"><Icon className="h-5 w-5" /></span><div><div className="text-xs uppercase tracking-[0.18em] text-[#7a8ba0]">{label}</div><div className="mt-1 text-xl font-semibold text-[#10233f]">{value}</div></div></div><div className="mt-4 text-xs text-[#7a8ba0]">{detail}</div></CardContent></Card>;
}

function ActionLink({ href, icon: Icon, title, detail }: { href: string; icon: typeof Bot; title: string; detail: string }) {
  const external = href.startsWith("http");
  return <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className="flex items-center gap-3 rounded-[12px] border border-[#dce5f0] px-3 py-3 transition hover:border-[#175cd3] hover:bg-[#f7faff]"><Icon className="h-4 w-4 shrink-0 text-[#175cd3]" /><span className="min-w-0"><span className="block text-sm font-semibold text-[#10233f]">{title}</span><span className="block text-xs text-[#7a8ba0]">{detail}</span></span><ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-[#7a8ba0]" /></a>;
}
