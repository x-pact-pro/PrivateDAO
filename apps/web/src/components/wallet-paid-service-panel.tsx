"use client";

import { useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import { ArrowRight, CheckCircle2, FileCheck2, Loader2, ReceiptText } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const API_BASE = (process.env.NEXT_PUBLIC_AGENT_EXCHANGE_API_BASE || "https://agents.privatedao.org").replace(/\/$/, "");
type Service = { id: string; title: string; price?: number; currency?: string; input_schema?: unknown };
type JobResponse = { job_id?: string; status?: string; receipt?: { receipt_id?: string }; payment_required?: Record<string, unknown>; payment_required_header?: string; request_id?: string; message?: string; error?: string };

function decodeHeader(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0)))) as { resource?: { url?: string }; accepts?: Array<{ scheme?: string; network?: string; amount?: string; extra?: Record<string, string> }> };
}

function decodeBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0));
}

function encodeBytes(value: Uint8Array) {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function transactionFromBase64(value: string) {
  const bytes = decodeBytes(value);
  try {
    return VersionedTransaction.deserialize(bytes);
  } catch {
    return Transaction.from(bytes);
  }
}

function errorMessage(payload: JobResponse, status: number) {
  return payload.message || payload.error || `PrivateDAO service request failed (HTTP ${status}).`;
}

export function WalletPaidServicePanel({ wallet, services }: { wallet: string; services: Service[] }) {
  const { connection } = useConnection();
  const { signTransaction, sendTransaction } = useWallet();
  const paidServices = useMemo(() => services.filter((service) => Number(service.price || 0) > 0), [services]);
  const [serviceId, setServiceId] = useState("");
  const [input, setInput] = useState('{"record":{"wallet":""},"network":"solana-mainnet-beta"}');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Choose a paid service to create an exact quote. No payment is requested during quote creation.");
  const [receiptId, setReceiptId] = useState<string | null>(null);

  const selected = paidServices.find((service) => service.id === serviceId) || paidServices[0];

  async function run() {
    if (!wallet || !signTransaction || !sendTransaction) {
      setStatus("Connect a Solana wallet that supports signing first.");
      return;
    }
    if (!selected) {
      setStatus("No paid Agent Exchange service is available right now.");
      return;
    }
    let parsedInput: Record<string, unknown>;
    try {
      const value = JSON.parse(input.replaceAll("\"\"", `\"${wallet}\"`));
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Service input must be a JSON object.");
      parsedInput = value as Record<string, unknown>;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Enter valid service input JSON.");
      return;
    }
    setBusy(true);
    setReceiptId(null);
    try {
      setStatus("Creating the quote-bound PrivatePAY job...");
      const createResponse = await fetch(`${API_BASE}/api/jobs`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ service_id: selected.id, input: parsedInput, payment_mode: "privatepay", payer: wallet }),
      });
      const created = await createResponse.json().catch(() => ({})) as JobResponse;
      const header = createResponse.headers.get("PAYMENT-REQUIRED") || created.payment_required_header;
      if (createResponse.status !== 402 || !header) throw new Error(errorMessage(created, createResponse.status));
      const requirements = created.payment_required || decodeHeader(header);
      const accepted = (requirements as { accepts?: Array<{ scheme?: string; network?: string; amount?: string; extra?: Record<string, string> }> }).accepts?.[0];
      const resourceUrl = (requirements as { resource?: { url?: string } }).resource?.url || "";
      const jobId = created.job_id || resourceUrl.match(/\/api\/jobs\/([^/]+)\/privatepay(?:$|\?)/)?.[1];
      const paymentId = accepted?.extra?.paymentId;
      const transactionBase64 = accepted?.extra?.transaction;
      if (!jobId || !accepted || !paymentId || !transactionBase64) throw new Error("The service returned an incomplete payment challenge.");
      if (accepted.network !== "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp") throw new Error("The quote is not for Solana Mainnet.");

      let pdaoFeeSignature: string | undefined;
      const pdaoFeeUnits = accepted.extra?.pdao_fee_base_units;
      if (pdaoFeeUnits) {
        setStatus("Review the exact PDAO access fee in your wallet, then approve it...");
        const feeResponse = await fetch(`${API_BASE}/api/privatepay/x402/pdao-fee/transaction`, {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ payer: wallet, resource: resourceUrl || `job:${jobId}`, provider_id: selected.id, amount_base_units: accepted.amount, request_id: created.request_id || accepted.extra?.request_id, pdao_fee_base_units: pdaoFeeUnits }),
        });
        const fee = await feeResponse.json().catch(() => ({})) as { transaction_base64?: string; recent_blockhash?: string; last_valid_block_height?: number; message?: string; error?: string };
        if (!feeResponse.ok || !fee.transaction_base64) throw new Error(fee.message || fee.error || "PDAO fee transaction is unavailable.");
        const feeTransaction = transactionFromBase64(fee.transaction_base64);
        const feeSignature = await sendTransaction(feeTransaction, connection, { preflightCommitment: "confirmed" });
        await connection.confirmTransaction({ signature: feeSignature, blockhash: fee.recent_blockhash || "", lastValidBlockHeight: fee.last_valid_block_height || 0 }, "confirmed");
        pdaoFeeSignature = feeSignature;
      }

      setStatus("Review the exact service amount and recipient in your wallet, then approve once...");
      const unsigned = transactionFromBase64(transactionBase64);
      const signed = await signTransaction(unsigned);
      const paymentPayload = { x402Version: 2, resource: (requirements as { resource?: { url?: string } }).resource, accepted, payload: { paymentId, transaction: encodeBytes(signed.serialize()) } };
      const paymentSignature = encodeBytes(new TextEncoder().encode(JSON.stringify(paymentPayload)));
      setStatus("Submitting the signed payment to the quoted service job...");
      const settledResponse = await fetch(`${API_BASE}/api/jobs/${encodeURIComponent(jobId)}/privatepay`, {
        method: "POST",
        headers: { "content-type": "application/json", "PAYMENT-SIGNATURE": paymentSignature, accept: "application/json" },
        body: JSON.stringify({ payer: wallet, pdao_fee_signature: pdaoFeeSignature }),
      });
      const settled = await settledResponse.json().catch(() => ({})) as JobResponse;
      if (!settledResponse.ok) throw new Error(errorMessage(settled, settledResponse.status));
      const completedReceipt = settled.receipt?.receipt_id;
      if (completedReceipt) setReceiptId(completedReceipt);
      setStatus(settled.status === "recovery_required" ? "Payment was accepted, but execution needs non-replaying recovery. Do not sign again." : "Service completed and the receipt is ready.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The paid service could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return <Card aria-labelledby="wallet-paid-service-title">
    <CardHeader>
      <CardTitle id="wallet-paid-service-title" className="flex items-center gap-2"><FileCheck2 className="h-5 w-5 text-[#087f5b]" /> Buy an Agent Exchange service</CardTitle>
      <CardDescription>Create a quote first, review every transaction locally, and receive the service result and receipt in the wallet.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_150px]">
        <label className="text-sm font-semibold text-[#10233f]">Paid service<select value={serviceId || selected?.id || ""} onChange={(event) => setServiceId(event.target.value)} disabled={busy} className="mt-2 block w-full rounded-[10px] border border-[#cfe0d8] bg-white px-3 py-2.5"><option value="" disabled>Select a service</option>{paidServices.map((service) => <option key={service.id} value={service.id}>{service.title} · {service.price} {service.currency || "USDC"}</option>)}</select></label>
        <div className="rounded-[10px] border border-[#d6e6df] bg-[#f2fbf6] px-3 py-2.5 text-sm text-[#16824c]"><div className="text-xs uppercase tracking-[0.12em]">Payer</div><div className="mt-1 truncate font-mono text-xs">{wallet}</div></div>
      </div>
      <label className="block text-sm font-semibold text-[#10233f]">Service input JSON<textarea value={input} onChange={(event) => setInput(event.target.value)} disabled={busy} rows={4} className="mt-2 block w-full rounded-[10px] border border-[#cfe0d8] bg-white px-3 py-2.5 font-mono text-xs" /></label>
      <button type="button" onClick={() => void run()} disabled={busy || !selected} className={cn(buttonVariants({ size: "default" }), "w-full justify-center bg-[#087f5b] hover:bg-[#066e4f]")}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}{busy ? "Processing quote and payment..." : "Get quote and pay"}</button>
      <div role="status" aria-live="polite" className="rounded-[12px] border border-[#d6e6df] bg-white px-4 py-3 text-sm leading-6 text-[#425570]">{status}</div>
      {receiptId ? <a href={`${API_BASE}/api/receipts/${encodeURIComponent(receiptId)}`} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}><CheckCircle2 className="h-4 w-4 text-[#16824c]" /><ReceiptText className="h-4 w-4" /> Open verified receipt</a> : null}
    </CardContent>
  </Card>;
}
