"use client";

import { useEffect, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import { ArrowRight, CheckCircle2, FileCheck2, Loader2, ReceiptText } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { confirmBrowserTransaction, sendBrowserTransaction } from "@/lib/network-adapters/solana-browser";
import { assertExactSolanaPaymentChallenge, assertExactSolanaPaymentTransaction, assertLocalFeePayer } from "@/lib/solana-transaction-safety";

const API_BASE = (process.env.NEXT_PUBLIC_AGENT_EXCHANGE_API_BASE || "https://agents.privatedao.org").replace(/\/$/, "");
type ServiceInputSchema = { required?: string[]; properties?: Record<string, { type?: string; description?: string; enum?: string[] }> };
type Service = { id: string; title: string; price?: number; currency?: string; input_schema?: ServiceInputSchema };
type JobResponse = { job_id?: string; status?: string; recovery_required?: boolean; receipt?: { receipt_id?: string }; payment_required?: Record<string, unknown>; payment_required_header?: string; request_id?: string; message?: string; error?: string };
const USDC_DECIMALS = 6;

function catalogPriceBaseUnits(service: Service) {
  if (service.currency?.toUpperCase() !== "USDC" || typeof service.price !== "number" || !Number.isFinite(service.price) || service.price <= 0) return null;
  const normalized = service.price.toFixed(USDC_DECIMALS);
  const [whole, fraction = ""] = normalized.split(".");
  return (BigInt(whole) * (BigInt(10) ** BigInt(USDC_DECIMALS))) + BigInt(fraction.padEnd(USDC_DECIMALS, "0"));
}

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
  if (status === 503) {
    return `${payload.message || payload.error || "The paid service is temporarily unavailable."} No wallet transaction was created.`;
  }
  return payload.message || payload.error || `PrivateDAO service request failed (HTTP ${status}).`;
}

function hydrateWalletFields(value: unknown, wallet: string): unknown {
  if (Array.isArray(value)) return value.map((item) => hydrateWalletFields(item, wallet));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    key === "wallet" && item === "" ? wallet : hydrateWalletFields(item, wallet),
  ]));
}

function walletInputKey(service: Service | undefined) {
  const properties = service?.input_schema?.properties;
  if (!properties) return null;
  if ("wallet" in properties) return "wallet";
  if ("address" in properties) return "address";
  return null;
}

function defaultInputForService(service: Service | undefined, wallet: string) {
  const properties = service?.input_schema?.properties || {};
  const required = service?.input_schema?.required || [];
  const networkOptions = properties.network?.enum || [];
  const result: Record<string, unknown> = networkOptions.length > 0 ? { network: networkOptions[0] } : {};
  for (const key of required) {
    if (key === "network") continue;
    if (key === "wallet" || key === "address") {
      result[key] = wallet;
    } else {
      result[key] = properties[key]?.type === "array" ? [] : "";
    }
  }
  return JSON.stringify(result, null, 2);
}

function networkOptionsForService(service: Service | undefined) {
  return service?.input_schema?.properties?.network?.enum || [];
}

export function WalletPaidServicePanel({ wallet, services }: { wallet: string; services: Service[] }) {
  const { connection } = useConnection();
  const { signTransaction, sendTransaction } = useWallet();
  const paidServices = useMemo(() => services.filter((service) => Number(service.price || 0) > 0), [services]);
  const [serviceId, setServiceId] = useState("");
  const [input, setInput] = useState("{}");
  const [busy, setBusy] = useState(false);
  const [recoveryRequired, setRecoveryRequired] = useState(false);
  const [status, setStatus] = useState("Choose a paid service to create an exact quote. No payment is requested during quote creation.");
  const [receiptId, setReceiptId] = useState<string | null>(null);

  const selected = paidServices.find((service) => service.id === serviceId) || paidServices[0];
  const connectedWalletField = walletInputKey(selected);
  const networkOptions = networkOptionsForService(selected);

  useEffect(() => {
    if (!selected) return;
    setInput((current) => current === "{}" ? defaultInputForService(selected, wallet) : current);
    setReceiptId(null);
  }, [selected, wallet]);

  async function run() {
    if (!wallet || !signTransaction || !sendTransaction) {
      setStatus("Connect a Solana wallet that supports signing first.");
      return;
    }
    if (recoveryRequired) return;
    if (!selected) {
      setStatus("No paid Agent Exchange service is available right now.");
      return;
    }
    let parsedInput: Record<string, unknown>;
    try {
      const value = hydrateWalletFields(JSON.parse(input), wallet);
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
      const accepted = (requirements as { accepts?: Array<{ scheme?: string; network?: string; asset?: string; amount?: string; payTo?: string; extra?: { paymentId?: string; transaction?: string; pdao_fee_base_units?: string; request_id?: string } }> }).accepts?.[0];
      const resourceUrl = (requirements as { resource?: { url?: string } }).resource?.url || "";
      const jobId = created.job_id || resourceUrl.match(/\/api\/jobs\/([^/]+)\/privatepay(?:$|\?)/)?.[1];
      const paymentId = accepted?.extra?.paymentId;
      const transactionBase64 = accepted?.extra?.transaction;
      if (!jobId || !accepted || !paymentId || !transactionBase64) throw new Error("The service returned an incomplete payment challenge.");
      const expectedAmount = catalogPriceBaseUnits(selected);
      if (expectedAmount === null) throw new Error("The selected service has no supported exact USDC payment price.");
      assertExactSolanaPaymentChallenge(accepted, expectedAmount.toString());

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
        assertLocalFeePayer(feeTransaction, wallet);
        const feeSignature = await sendBrowserTransaction(connection, feeTransaction, sendTransaction, { preflightCommitment: "confirmed" });
        await confirmBrowserTransaction(connection, { signature: feeSignature, blockhash: fee.recent_blockhash || "", lastValidBlockHeight: fee.last_valid_block_height || 0 }, "confirmed");
        pdaoFeeSignature = feeSignature;
      }

      setStatus("Review the exact service amount and recipient in your wallet, then approve once...");
      const unsigned = transactionFromBase64(transactionBase64);
      assertLocalFeePayer(unsigned, wallet);
      assertExactSolanaPaymentTransaction(unsigned, accepted, wallet, expectedAmount.toString());
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
      if ((settledResponse.status === 202 || settledResponse.status === 409) && (settled.status === "recovery_required" || settled.recovery_required === true || settledResponse.status === 202)) {
        setRecoveryRequired(true);
        setStatus("Payment was accepted for processing or recovery. Do not sign or submit it again; follow the service recovery status.");
        return;
      }
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
        <label className="text-sm font-semibold text-[#10233f]">Paid service<select value={serviceId || selected?.id || ""} onChange={(event) => { const next = paidServices.find((service) => service.id === event.target.value); setServiceId(event.target.value); setRecoveryRequired(false); setReceiptId(null); setInput(defaultInputForService(next, wallet)); }} disabled={busy} className="mt-2 block w-full rounded-[10px] border border-[#cfe0d8] bg-white px-3 py-2.5"><option value="" disabled>Select a service</option>{paidServices.map((service) => <option key={service.id} value={service.id}>{service.title} · {service.price} {service.currency || "USDC"}</option>)}</select></label>
        <div className="rounded-[10px] border border-[#d6e6df] bg-[#f2fbf6] px-3 py-2.5 text-sm text-[#16824c]"><div className="text-xs uppercase tracking-[0.12em]">Payer</div><div className="mt-1 truncate font-mono text-xs">{wallet}</div></div>
      </div>
      <label className="block text-sm font-semibold text-[#10233f]">Service input JSON<textarea value={input} onChange={(event) => setInput(event.target.value)} disabled={busy} rows={4} className="mt-2 block w-full rounded-[10px] border border-[#cfe0d8] bg-white px-3 py-2.5 font-mono text-xs" /></label>
      {networkOptions.length > 0 ? <label className="block text-sm font-semibold text-[#10233f]">Target network<select value={(() => { try { const parsed = JSON.parse(input) as { network?: string }; return networkOptions.includes(parsed.network || "") ? parsed.network : networkOptions[0]; } catch { return networkOptions[0]; } })()} onChange={(event) => { try { const parsed = JSON.parse(input) as Record<string, unknown>; parsed.network = event.target.value; setInput(JSON.stringify(parsed, null, 2)); } catch { setInput(JSON.stringify({ network: event.target.value }, null, 2)); } }} disabled={busy} className="mt-2 block w-full rounded-[10px] border border-[#cfe0d8] bg-white px-3 py-2.5"><option value="" disabled>Select a network</option>{networkOptions.map((network) => <option key={network} value={network}>{network}</option>)}</select></label> : null}
      {connectedWalletField ? <button type="button" onClick={() => { try { const current = JSON.parse(input) as Record<string, unknown>; current[connectedWalletField] = wallet; setInput(JSON.stringify(current, null, 2)); } catch { setInput(JSON.stringify({ [connectedWalletField]: wallet }, null, 2)); } }} disabled={busy} className="inline-flex min-h-9 items-center gap-2 border border-[#cfe0d8] px-3 text-xs font-semibold text-[#087f5b] hover:bg-[#f2fbf6]">Use connected wallet for this analysis</button> : null}
      <button type="button" onClick={() => void run()} disabled={busy || !selected || recoveryRequired} className={cn(buttonVariants({ size: "default" }), "w-full justify-center bg-[#087f5b] hover:bg-[#066e4f]")}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}{busy ? "Processing quote and payment..." : recoveryRequired ? "Recovery required" : "Get quote and pay"}</button>
      <div role="status" aria-live="polite" className="rounded-[12px] border border-[#d6e6df] bg-white px-4 py-3 text-sm leading-6 text-[#425570]">{status}</div>
      {receiptId ? <a href={`${API_BASE}/api/receipts/${encodeURIComponent(receiptId)}`} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}><CheckCircle2 className="h-4 w-4 text-[#16824c]" /><ReceiptText className="h-4 w-4" /> Open verified receipt</a> : null}
    </CardContent>
  </Card>;
}
