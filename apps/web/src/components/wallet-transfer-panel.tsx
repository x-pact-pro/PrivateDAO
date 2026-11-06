"use client";

import { useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { ArrowRight, CheckCircle2, Loader2, Send, ShieldCheck } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildSolanaTxUrl, SOLANA_NETWORK } from "@/lib/solana-network";
import { confirmBrowserTransaction, latestBlockhash, readAccountInfo, readParsedTokenAccountsByOwner, sendBrowserTransaction } from "@/lib/network-adapters/solana-browser";
import { MAINNET_USDC_MINT } from "@/lib/pdao-wallet-assets";
import { cn } from "@/lib/utils";

type AssetChoice = "SOL" | "USDC";
type TokenAccount = { address: PublicKey; mint: PublicKey; amount: string; decimals: number; programId: PublicKey };

function parseUnits(value: string, decimals: number): bigint {
  const normalized = value.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) throw new Error("Enter a valid positive amount.");
  const [whole, fraction = ""] = normalized.split(".");
  if (fraction.length > decimals) throw new Error(`This asset supports at most ${decimals} decimal places.`);
  const units = BigInt(whole) * (BigInt(10) ** BigInt(decimals)) + BigInt(fraction.padEnd(decimals, "0") || "0");
  if (units <= BigInt(0)) throw new Error("Amount must be greater than zero.");
  return units;
}

function parseRecipient(value: string): PublicKey {
  try { return new PublicKey(value.trim()); } catch { throw new Error("Recipient must be a valid Solana address."); }
}

function findTokenAccounts(payload: Awaited<ReturnType<ReturnType<typeof useConnection>["connection"]["getParsedTokenAccountsByOwner"]>>): TokenAccount[] {
  return payload.value.flatMap((entry) => {
    const parsed = (entry.account.data as { parsed?: { info?: { mint?: unknown; tokenAmount?: { amount?: unknown; decimals?: unknown } } } }).parsed?.info;
    if (typeof parsed?.mint !== "string" || typeof parsed.tokenAmount?.amount !== "string" || typeof parsed.tokenAmount.decimals !== "number") return [];
    const programId = entry.account.owner;
    if (!programId.equals(TOKEN_PROGRAM_ID) && !programId.equals(TOKEN_2022_PROGRAM_ID)) return [];
    return [{ address: entry.pubkey, mint: new PublicKey(parsed.mint), amount: parsed.tokenAmount.amount, decimals: parsed.tokenAmount.decimals, programId }];
  });
}

export function WalletTransferPanel() {
  const { connection } = useConnection();
  const { connected, publicKey, sendTransaction } = useWallet();
  const [asset, setAsset] = useState<AssetChoice>("USDC");
  const [amount, setAmount] = useState("0.50");
  const [recipient, setRecipient] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Review the recipient and amount before requesting a wallet signature.");
  const [signature, setSignature] = useState<string | null>(null);

  const networkReady = SOLANA_NETWORK === "mainnet-beta";
  const review = useMemo(() => ({ asset, amount: amount.trim() || "0", recipient: recipient.trim() || "Not set" }), [amount, asset, recipient]);

  async function submit() {
    if (!publicKey || !sendTransaction) {
      setStatus("Connect a Solana wallet that supports transaction signing first.");
      return;
    }
    if (!networkReady) {
      setStatus("Wallet transfers are disabled because this build is not configured for Solana Mainnet.");
      return;
    }
    setBusy(true);
    setSignature(null);
    try {
      const destination = parseRecipient(recipient);
      const transaction = new Transaction();
      if (asset === "SOL") {
        transaction.add(SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: destination, lamports: parseUnits(amount, 9) }));
      } else {
        const mint = new PublicKey(MAINNET_USDC_MINT);
        const [classic, token2022] = await Promise.all([
          readParsedTokenAccountsByOwner(connection, publicKey, { programId: TOKEN_PROGRAM_ID }, "confirmed"),
          readParsedTokenAccountsByOwner(connection, publicKey, { programId: TOKEN_2022_PROGRAM_ID }, "confirmed"),
        ]);
        const source = findTokenAccounts(classic).concat(findTokenAccounts(token2022)).find((account) => account.mint.equals(mint) && BigInt(account.amount) > BigInt(0));
        if (!source) throw new Error("No funded USDC token account was found for this wallet.");
        const amountBaseUnits = parseUnits(amount, source.decimals);
        if (BigInt(source.amount) < amountBaseUnits) throw new Error("The wallet balance is lower than the requested amount.");
        const destinationAta = getAssociatedTokenAddressSync(mint, destination, false, source.programId, ASSOCIATED_TOKEN_PROGRAM_ID);
        if (!(await readAccountInfo(connection, destinationAta, "confirmed"))) {
          transaction.add(createAssociatedTokenAccountInstruction(publicKey, destinationAta, destination, mint, source.programId, ASSOCIATED_TOKEN_PROGRAM_ID));
        }
        transaction.add(createTransferCheckedInstruction(source.address, mint, destinationAta, publicKey, amountBaseUnits, source.decimals, [], source.programId));
      }
      const { blockhash, lastValidBlockHeight } = await latestBlockhash(connection, "confirmed");
      transaction.feePayer = publicKey;
      transaction.recentBlockhash = blockhash;
      setStatus("Review the exact transaction in your wallet, then approve it to broadcast.");
      const nextSignature = await sendBrowserTransaction(connection, transaction, sendTransaction, { preflightCommitment: "confirmed" });
      setStatus("Transaction submitted. Waiting for Mainnet confirmation...");
      await confirmBrowserTransaction(connection, { signature: nextSignature, blockhash, lastValidBlockHeight }, "confirmed");
      setSignature(nextSignature);
      setStatus("Transaction confirmed on Solana Mainnet.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The wallet transaction could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card aria-labelledby="wallet-transfer-title">
      <CardHeader>
        <CardTitle id="wallet-transfer-title" className="flex items-center gap-2"><Send className="h-5 w-5 text-[#175cd3]" /> Send from wallet</CardTitle>
        <CardDescription>Build and sign a direct Solana Mainnet transfer locally. PrivateDAO never receives a private key.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[150px_1fr]">
          <label htmlFor="wallet-transfer-asset" className="text-sm font-semibold text-[#10233f]">Asset<select id="wallet-transfer-asset" value={asset} onChange={(event) => setAsset(event.target.value as AssetChoice)} disabled={busy} className="mt-2 block w-full rounded-[10px] border border-[#cfe0ef] bg-white px-3 py-2.5 font-medium"><option value="USDC">USDC</option><option value="SOL">SOL</option></select></label>
          <label htmlFor="wallet-transfer-amount" className="text-sm font-semibold text-[#10233f]">Amount<input id="wallet-transfer-amount" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" disabled={busy} className="mt-2 block w-full rounded-[10px] border border-[#cfe0ef] bg-white px-3 py-2.5" /></label>
        </div>
        <label htmlFor="wallet-transfer-recipient" className="block text-sm font-semibold text-[#10233f]">Recipient<input id="wallet-transfer-recipient" value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="Solana wallet address" spellCheck={false} disabled={busy} className="mt-2 block w-full rounded-[10px] border border-[#cfe0ef] bg-white px-3 py-2.5 font-mono text-sm" /></label>
        <div className="rounded-[12px] border border-[#dce5f0] bg-[#f7faff] p-4 text-sm"><div className="flex items-center gap-2 font-semibold text-[#10233f]"><ShieldCheck className="h-4 w-4 text-[#175cd3]" /> Review before signing</div><dl className="mt-3 grid gap-2 text-xs sm:grid-cols-3"><div><dt className="text-[#52647d]">Asset</dt><dd className="font-medium text-[#10233f]">{review.asset}</dd></div><div><dt className="text-[#52647d]">Amount</dt><dd className="font-medium text-[#10233f]">{review.amount}</dd></div><div className="min-w-0"><dt className="text-[#52647d]">Recipient</dt><dd className="truncate font-mono text-[#10233f]">{review.recipient}</dd></div></dl></div>
        <button type="button" onClick={() => void submit()} disabled={!connected || busy || !recipient.trim()} className={cn(buttonVariants({ size: "default" }), "w-full justify-center bg-[#175cd3] hover:bg-[#124eb8]")}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : signature ? <CheckCircle2 className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />} {busy ? "Confirming..." : signature ? "Confirmed" : "Review and send"}</button>
        <div role="status" aria-live="polite" className="rounded-[12px] border border-[#dce5f0] bg-white px-4 py-3 font-mono text-xs leading-5 text-[#425570]">{status}</div>
        {signature ? <a className="block truncate text-xs font-medium text-[#175cd3] underline-offset-4 hover:underline" href={buildSolanaTxUrl(signature)} target="_blank" rel="noreferrer">View confirmed transaction: {signature}</a> : null}
      </CardContent>
    </Card>
  );
}
