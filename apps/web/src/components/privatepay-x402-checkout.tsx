"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { VersionedTransaction } from "@solana/web3.js";
import { ArrowRight, CheckCircle2, Loader2, WalletCards } from "lucide-react";

import { WalletConnectButton } from "@/components/wallet-connect-button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const API_BASE = (process.env.NEXT_PUBLIC_AGENT_EXCHANGE_API_BASE || "https://agents.privatedao.org").replace(/\/$/, "");
const RESOURCE = "https://agents.privatedao.org/api/privatepay/conformance";

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

// x402 HTTP headers use canonical standard Base64, not Base64URL.
function encodeBase64(value: Uint8Array) {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function errorMessage(payload: unknown, status: number) {
  if (payload && typeof payload === "object") {
    const record = payload as { message?: unknown; error?: unknown; code?: unknown; response?: unknown };
    const nested = record.error && typeof record.error === "object" ? record.error as { message?: unknown; code?: unknown } : null;
    const response = record.response && typeof record.response === "object" ? record.response as { message?: unknown; code?: unknown } : null;
    const message = [record.message, typeof record.error === "string" ? record.error : nested?.message, response?.message]
      .find((value): value is string => typeof value === "string" && value.length > 0);
    const code = [record.code, nested?.code, response?.code].find((value): value is string | number => typeof value === "string" || typeof value === "number");
    if (message) return `${message}${code ? ` (${String(code)})` : ""}`;
  }
  return `PrivatePAY request failed (HTTP ${status}).`;
}

export function PrivatePayX402Checkout() {
  const { connected, publicKey, signTransaction } = useWallet();
  const [amount, setAmount] = useState("0.50");
  const [status, setStatus] = useState("Ready. Connect a wallet to request an exact quote.");
  const [busy, setBusy] = useState(false);
  const [settled, setSettled] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  async function pay() {
    if (!publicKey || !signTransaction) {
      setStatus("Choose a Solana wallet that supports transaction signing.");
      return;
    }
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > 1000) {
      setStatus("Enter a USDC amount greater than 0 and no more than 1,000.");
      return;
    }
    const amountBaseUnits = String(Math.round(numericAmount * 1_000_000));
    setBusy(true);
    setSettled(false);
    setPaymentId(null);
    try {
      const request = { payer: publicKey.toBase58(), resource: RESOURCE, provider_id: "privatepay.x402", amount_base_units: amountBaseUnits, pdao_optional: true };
      setStatus("Requesting the exact PrivatePAY challenge...");
      const challengeResponse = await fetch(`${API_BASE}/api/privatepay/x402`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      });
      const challenge = await challengeResponse.json().catch(() => ({}));
      const requiredHeader = challengeResponse.headers.get("PAYMENT-REQUIRED");
      if (challengeResponse.status !== 402 || !requiredHeader) throw new Error(errorMessage(challenge, challengeResponse.status));
      const requirements = JSON.parse(new TextDecoder().decode(decodeBase64Url(requiredHeader))) as {
        resource?: string;
        accepts?: Array<{ scheme?: string; network?: string; amount?: string; extra?: { paymentId?: string; transaction?: string } }>;
      };
      const accepted = requirements.accepts?.[0];
      const transactionBase64 = accepted?.extra?.transaction;
      const paymentId = accepted?.extra?.paymentId;
      if (!accepted || !transactionBase64 || !paymentId) throw new Error("PrivatePAY returned an incomplete payment challenge.");
      setPaymentId(paymentId);
      if (accepted.network !== "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp") throw new Error("The challenge is not for Solana Mainnet.");
      if (accepted.amount !== amountBaseUnits) throw new Error("The returned amount differs from the requested amount.");

      setStatus("Review the exact amount and recipient in your wallet, then approve once...");
      const unsigned = VersionedTransaction.deserialize(decodeBase64Url(transactionBase64));
      const signed = await signTransaction(unsigned);
      const paymentPayload = {
        x402Version: 2,
        resource: requirements.resource || RESOURCE,
        accepted,
        payload: { paymentId, transaction: encodeBase64(signed.serialize()) },
      };
      const paymentSignature = encodeBase64(new TextEncoder().encode(JSON.stringify(paymentPayload)));
      setStatus("Submitting the signed payment for settlement...");
      const settlementResponse = await fetch(`${API_BASE}/api/privatepay/x402`, {
        method: "POST",
        headers: { "content-type": "application/json", "PAYMENT-SIGNATURE": paymentSignature },
        body: JSON.stringify(request),
      });
      const settlement = await settlementResponse.json().catch(() => ({}));
      if (settlementResponse.status === 202) {
        setStatus(`Payment accepted for processing (${paymentId}). Check the service status before retrying; no second payment was created.`);
        return;
      }
      if (!settlementResponse.ok) throw new Error(errorMessage(settlement, settlementResponse.status));
      setSettled(true);
      setStatus(`Payment settled (${paymentId}). The service receipt is ready in the response.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "PrivatePAY could not complete the request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[24px] border border-[#bfe4d2] bg-[#f2fbf6] p-6 shadow-[0_12px_32px_rgba(16,35,63,0.06)] sm:p-8" aria-labelledby="privatepay-checkout-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#087f5b]">PrivatePAY x402 checkout</div>
          <h2 id="privatepay-checkout-title" className="mt-3 text-2xl font-semibold text-[#10233f]">Pay for a PrivateDAO service from your wallet</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#52657c]">The exact Solana Mainnet transaction is built by Agent Exchange, reviewed in your wallet, and signed locally. PrivateDAO never receives a private key.</p>
        </div>
        {settled ? <CheckCircle2 className="h-7 w-7 text-[#16824c]" aria-label="Payment settled" /> : <WalletCards className="h-7 w-7 text-[#175cd3]" aria-hidden="true" />}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <label className="text-sm font-semibold text-[#10233f]">Service amount (USDC)<input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" min="0.01" max="1000" step="0.01" className="mt-2 block w-full rounded-[12px] border border-[#cfe0d8] bg-white px-4 py-3 text-lg font-semibold text-[#10233f] outline-none focus:border-[#175cd3]" disabled={busy} /></label>
        <div className="flex flex-wrap gap-3"><WalletConnectButton className="wallet-connect-light" variant="outline" connectLabel="Choose wallet" connectedLabelPrefix="Connected" /><button type="button" onClick={() => void pay()} disabled={!connected || busy} className={cn(buttonVariants({ size: "default" }), "bg-[#175cd3] hover:bg-[#124eb8]")}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} {busy ? "Processing..." : "Request and pay"}</button></div>
      </div>
      <div role="status" aria-live="polite" className="mt-5 rounded-[14px] border border-[#d6e6df] bg-white px-4 py-3 font-mono text-xs leading-6 text-[#425570]">{status}</div>
      {paymentId ? <div className="mt-3 break-all rounded-[14px] border border-[#d6e6df] bg-white px-4 py-3 font-mono text-[11px] leading-5 text-[#5d6d82]">Payment ID: {paymentId}</div> : null}
    </section>
  );
}
