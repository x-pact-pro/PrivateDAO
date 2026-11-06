"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { clusterApiUrl, type Transaction, type VersionedTransaction } from "@solana/web3.js";
import { ArrowDownToLine, ArrowUpFromLine, Eye, Loader2, ShieldCheck, Shuffle } from "lucide-react";

import { MAINNET_USDC_MINT } from "@/lib/pdao-wallet-assets";
import { buildMagicBlockAction, deserializeMagicBlockTransaction, getMagicBlockBalance, getMagicBlockChallenge, loginMagicBlock, type MagicBlockCluster } from "@/lib/magicblock-private-payments";
import { confirmBrowserTransaction, createSolanaBrowserConnection, latestBlockhash, submitSignedTransaction } from "@/lib/network-adapters/solana-browser";

type Action = "deposit" | "transfer" | "withdraw";

export function ShieldedBalancePanel() {
  const { connection } = useConnection();
  const { connected, publicKey, signMessage, signTransaction } = useWallet();
  const [cluster, setCluster] = useState<MagicBlockCluster>("mainnet");
  const [mint, setMint] = useState(MAINNET_USDC_MINT);
  const [amount, setAmount] = useState("100000");
  const [recipient, setRecipient] = useState("");
  const [privateToken, setPrivateToken] = useState<string | null>(null);
  const [baseBalance, setBaseBalance] = useState<string | number | null>(null);
  const [privateBalance, setPrivateBalance] = useState<string | number | null>(null);
  const [status, setStatus] = useState("Connect a wallet to authorize private-balance reads and shielded actions.");
  const [busy, setBusy] = useState(false);

  function actionConnection() {
    return cluster === "devnet" ? createSolanaBrowserConnection(clusterApiUrl("devnet"), "confirmed") : connection;
  }

  async function signBuiltTransaction(built: { transactionBase64: string; recentBlockhash?: string; lastValidBlockHeight?: number }) {
    if (!publicKey || !signTransaction) throw new Error("A wallet with transaction signing is required.");
    const transaction = deserializeMagicBlockTransaction(built.transactionBase64);
    const sign = signTransaction as (value: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>;
    const signed = await sign(transaction);
    const actionRpc = actionConnection();
    const signature = await submitSignedTransaction(actionRpc, signed, { skipPreflight: false, maxRetries: 3 });
    const latest = await latestBlockhash(actionRpc, "confirmed");
    await confirmBrowserTransaction(actionRpc, { signature, blockhash: built.recentBlockhash || latest.blockhash, lastValidBlockHeight: built.lastValidBlockHeight || latest.lastValidBlockHeight }, "confirmed");
    return signature;
  }

  async function authorizePrivateRead() {
    if (!publicKey || !signMessage) throw new Error("This wallet does not support message signing for private reads.");
    const challenge = await getMagicBlockChallenge(publicKey.toBase58(), cluster);
    const message = new TextEncoder().encode(challenge.message || challenge.challenge);
    const signature = await signMessage(message);
    const login = await loginMagicBlock(publicKey.toBase58(), challenge.challenge, signature, cluster);
    setPrivateToken(login.token);
    return login.token;
  }

  async function refreshBalances() {
    if (!publicKey) throw new Error("Connect a wallet first.");
    setStatus("Reading public and wallet-authorized private balances...");
    const token = privateToken || await authorizePrivateRead();
    const [base, hidden] = await Promise.all([
      getMagicBlockBalance(publicKey.toBase58(), mint, cluster),
      getMagicBlockBalance(publicKey.toBase58(), mint, cluster, token),
    ]);
    setBaseBalance(base.balance);
    setPrivateBalance(hidden.balance);
    setStatus(`Balances refreshed on ${cluster}. Private balance was read after wallet authorization.`);
  }

  async function runAction(action: Action) {
    if (!publicKey) {
      setStatus("Connect a Solana wallet first.");
      return;
    }
    if (!/^\d+$/.test(amount) || BigInt(amount) <= BigInt(0)) {
      setStatus("Amount must be a positive integer in token base units.");
      return;
    }
    if (action === "transfer" && !recipient.trim()) {
      setStatus("Enter the recipient wallet address for the private transfer.");
      return;
    }
    setBusy(true);
    try {
      setStatus("Preparing the exact shielded transaction...");
      const common = { cluster, mint, amount, initIfMissing: true, initAtasIfMissing: true, initVaultIfMissing: true, idempotent: true };
      const body = action === "deposit"
        ? { ...common, owner: publicKey.toBase58() }
        : action === "withdraw"
          ? { ...common, owner: publicKey.toBase58() }
          : { ...common, from: publicKey.toBase58(), to: recipient.trim(), visibility: "private", fromBalance: "ephemeral", toBalance: "ephemeral" };
      const built = await buildMagicBlockAction(`/v1/spl/${action}`, body);
      setStatus("Review the exact network, asset, amount, and destination in your wallet, then approve once...");
      const signature = await signBuiltTransaction(built);
      setStatus(`Shielded ${action} confirmed: ${signature}`);
      setPrivateToken(null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Shielded action failed.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="wallet-data-panel p-5 sm:p-6" aria-labelledby="shielded-balance-title">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><h2 id="shielded-balance-title" className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-[var(--wallet-success)]" /> Shielded balances</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-[var(--wallet-secondary)]">Deposit from the public wallet, transfer privately, or withdraw back. Private reads require a wallet-signed challenge; private keys never leave the wallet, and the session token stays in this browser session.</p></div><span className="text-[11px] uppercase tracking-[0.14em] text-[var(--wallet-warning)]">Wallet approval required</span></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-3"><label className="text-xs text-[var(--wallet-secondary)]">Network<select value={cluster} onChange={(event) => setCluster(event.target.value as MagicBlockCluster)} disabled={busy} className="mt-2 min-h-10 w-full border border-[var(--wallet-line)] bg-[var(--wallet-elevated)] px-3 text-sm text-[var(--wallet-text)]"><option value="mainnet">Solana Mainnet</option><option value="devnet">Solana Devnet</option></select></label><label className="text-xs text-[var(--wallet-secondary)]">Token mint<input value={mint} onChange={(event) => setMint(event.target.value)} disabled={busy} spellCheck={false} className="mt-2 min-h-10 w-full border border-[var(--wallet-line)] bg-[var(--wallet-elevated)] px-3 font-mono text-xs text-[var(--wallet-text)]" /></label><label className="text-xs text-[var(--wallet-secondary)]">Amount (base units)<input value={amount} onChange={(event) => setAmount(event.target.value)} disabled={busy} inputMode="numeric" className="mt-2 min-h-10 w-full border border-[var(--wallet-line)] bg-[var(--wallet-elevated)] px-3 font-mono text-sm text-[var(--wallet-text)]" /></label></div>
    <label className="mt-3 block text-xs text-[var(--wallet-secondary)]">Private transfer recipient<input value={recipient} onChange={(event) => setRecipient(event.target.value)} disabled={busy} spellCheck={false} placeholder="Solana address" className="mt-2 min-h-10 w-full border border-[var(--wallet-line)] bg-[var(--wallet-elevated)] px-3 font-mono text-xs text-[var(--wallet-text)]" /></label>
    <div className="mt-4 grid gap-3 border border-[var(--wallet-line)] bg-[var(--wallet-elevated)] p-4 sm:grid-cols-3"><div><div className="text-[11px] uppercase tracking-[0.14em] text-[var(--wallet-muted)]">Base balance</div><div className="mt-1 font-mono text-sm text-[var(--wallet-text)]">{baseBalance ?? "Not read"}</div></div><div><div className="text-[11px] uppercase tracking-[0.14em] text-[var(--wallet-muted)]">Private balance</div><div className="mt-1 font-mono text-sm text-[var(--wallet-text)]">{privateBalance ?? "Wallet authorization required"}</div></div><button type="button" onClick={() => void refreshBalances().catch((error) => setStatus(error instanceof Error ? error.message : "Balance read failed."))} disabled={!connected || busy} className="inline-flex min-h-10 items-center justify-center gap-2 border border-[var(--wallet-line)] px-3 text-xs text-[var(--wallet-text)] disabled:opacity-50"><Eye className="h-4 w-4" /> Read balances</button></div>
    <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => void runAction("deposit")} disabled={!connected || busy} className="inline-flex min-h-10 items-center gap-2 bg-[var(--wallet-text)] px-3 text-xs font-semibold text-[var(--wallet-bg)] disabled:opacity-50"><ArrowDownToLine className="h-4 w-4" /> Deposit to shielded</button><button type="button" onClick={() => void runAction("transfer")} disabled={!connected || busy} className="inline-flex min-h-10 items-center gap-2 border border-[var(--wallet-line)] px-3 text-xs text-[var(--wallet-text)] disabled:opacity-50"><Shuffle className="h-4 w-4" /> Private transfer</button><button type="button" onClick={() => void runAction("withdraw")} disabled={!connected || busy} className="inline-flex min-h-10 items-center gap-2 border border-[var(--wallet-line)] px-3 text-xs text-[var(--wallet-text)] disabled:opacity-50"><ArrowUpFromLine className="h-4 w-4" /> Withdraw to wallet</button></div>
    <div role="status" aria-live="polite" className="mt-4 border border-[var(--wallet-line)] bg-[var(--wallet-bg)] px-4 py-3 font-mono text-xs leading-5 text-[var(--wallet-secondary)]">{busy ? <Loader2 className="mr-2 inline h-3.5 w-3.5 animate-spin" /> : null}{status}</div>
  </section>;
}
