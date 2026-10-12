"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Copy, ShieldCheck, Wallet } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Buffer } from "buffer";
import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { createTransferCheckedInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createSolanaBrowserConnection, sendBrowserTransaction } from "@/lib/network-adapters/solana-browser";
import { getSolanaRpcEndpoint } from "@/lib/solana-network";

type LicenseType = "COMMUNITY" | "PROFESSIONAL" | "ORGANIZATION" | "ENTERPRISE";
type PaymentAsset = "USDC_SOL" | "PDAO_SOL" | "USDC_ETH" | "SOL" | "ETH" | "BTC" | "WBTC" | "ZEC" | "USDT" | "DAI";

type CheckoutResponse = {
  ok: boolean;
  checkout?: {
    checkoutId: string;
    organizationId: string;
    organizationName: string;
    licenseType: string;
    priceUsd: number | null;
    cadence: string;
    trialDays: number;
    paymentAsset: PaymentAsset;
    paymentAssetLabel: string;
    network: string;
    treasuryAddress: string;
    memo: string;
  };
  error?: string;
};

type OrderResponse = { ok: boolean; order?: { orderId: string; organizationId: string; organizationName: string; plan: string; asset: PaymentAsset; network: string; treasuryAddress: string; amountAtomic: string; amountDisplay: number; memo: string; expiresAt: string }; payment?: { tokenMint: string | null; decimals: number; exactAtomicAmount: string }; error?: string };

type VerifyResponse = {
  ok: boolean;
  status?: string;
  receipt?: {
    receiptId: string;
    organizationId: string;
    licenseType: string;
    paymentAsset: string;
    paymentHash: string;
    verificationStatus: string;
    subscriptionActivation: string;
    licenseStart: string;
    licenseEnd: string;
  };
  signedLicense?: {
    licenseId: string;
    licenseType: string;
    expiresAt: string;
    signature: string;
  };
  organizationRecord?: Record<string, string>;
  verification?: string;
  error?: string;
  orderId?: string;
  customerId?: string;
  activationCode?: string;
  license?: { payload: { licenseId: string; organizationId: string; plan: string; expiresAt: string; offlineGraceUntil: string; enabledPlugins?: string[] }; signature: string };
  delivery?: { downloadPackage: string; deploymentGuide: string; activationEndpoint: string };
  subscription?: { status: string; expiresAt: string; graceUntil: string; readOnlyAfterExpiry: boolean };
};

const planOptions: Array<{ value: LicenseType; label: string }> = [
  { value: "PROFESSIONAL", label: "Starter - $1,000/month" },
  { value: "ORGANIZATION", label: "Business - $3,500/month" },
  { value: "ENTERPRISE", label: "Enterprise - $25,000/year" },
];

const assetOptions: Array<{ value: PaymentAsset; label: string }> = [
  { value: "USDC_SOL", label: "USDC on Solana" },
  { value: "PDAO_SOL", label: "PDAO on Solana" },
  { value: "SOL", label: "SOL" },
];

const commercialCheckoutApiBase = "https://api.privatedao.org/api/v1/commercial/orders";
const commercialControlPlaneBase = "https://api.privatedao.org";
const solanaConnection = createSolanaBrowserConnection(getSolanaRpcEndpoint(), "confirmed");
const checkoutStorageKey = "privatedao:commercial-checkout:v2";

type PaymentState = "idle" | "submitted" | "confirming" | "pending" | "verified" | "failed";

const contactLinks = [
  { label: "Telegram", href: "https://t.me/privateDAOOS" },
  { label: "Founder Telegram", href: "https://t.me/Fahdkotb" },
  { label: "X", href: "https://x.com/privateDAOOS" },
  { label: "Email", href: "mailto:business@privatedao.org?subject=PrivateDAO%20commercial%20activation" },
] as const;

export function CommercialCheckout() {
  const { connected, publicKey, sendTransaction } = useWallet();
  const [organizationName, setOrganizationName] = useState("PrivateDAO pilot organization");
  const [plan, setPlan] = useState<LicenseType>("PROFESSIONAL");
  const [asset, setAsset] = useState<PaymentAsset>("USDC_SOL");
  const [paymentHash, setPaymentHash] = useState("");
  const [checkout, setCheckout] = useState<CheckoutResponse["checkout"]>();
  const [order, setOrder] = useState<OrderResponse["order"]>();
  const [payment, setPayment] = useState<OrderResponse["payment"]>();
  const [receipt, setReceipt] = useState<VerifyResponse>();
  const [error, setError] = useState("");
  const [paymentState, setPaymentState] = useState<PaymentState>("idle");
  const [loading, setLoading] = useState<"prepare" | "pay" | "verify" | null>(null);

  function persistCheckoutState(next: {
    order?: OrderResponse["order"];
    payment?: OrderResponse["payment"];
    paymentHash?: string;
    paymentState?: PaymentState;
  }) {
    try {
      window.localStorage.setItem(checkoutStorageKey, JSON.stringify(next));
    } catch {
      // The in-memory state remains usable when browser storage is unavailable.
    }
  }

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(checkoutStorageKey) || "null") as {
        order?: OrderResponse["order"];
        payment?: OrderResponse["payment"];
        paymentHash?: string;
        paymentState?: PaymentState;
      } | null;
      if (!saved?.order) return;
      setOrder(saved.order);
      setPayment(saved.payment);
      setPaymentHash(saved.paymentHash || "");
      setPaymentState(saved.paymentState || (saved.paymentHash ? "pending" : "idle"));
      setCheckout({ checkoutId: saved.order.orderId, organizationId: saved.order.organizationId, organizationName: saved.order.organizationName, licenseType: saved.order.plan, priceUsd: null, cadence: "monthly", trialDays: 14, paymentAsset: saved.order.asset, paymentAssetLabel: saved.order.asset, network: saved.order.network, treasuryAddress: saved.order.treasuryAddress, memo: saved.order.memo });
    } catch {
      window.localStorage.removeItem(checkoutStorageKey);
    }
  }, []);

  useEffect(() => {
    if (!order) return;
    try {
      window.localStorage.setItem(checkoutStorageKey, JSON.stringify({ order, payment, paymentHash, paymentState }));
    } catch {
      // Checkout can still be verified from the current page when storage is unavailable.
    }
  }, [order, payment, paymentHash, paymentState]);

  const canVerify = useMemo(() => Boolean(order?.orderId && paymentHash.trim()), [order, paymentHash]);

  async function prepareCheckout() {
    setLoading("prepare");
    setError("");
    setReceipt(undefined);
    try {
      const response = await fetch(`${commercialCheckoutApiBase}/prepare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationName, plan, asset }),
      });
      const payload = (await response.json()) as OrderResponse;
      if (!response.ok || !payload.ok || !payload.order) throw new Error(payload.error || "Checkout preparation failed.");
      setOrder(payload.order);
      setPayment(payload.payment);
      setPaymentHash("");
      setPaymentState("idle");
      setCheckout({ checkoutId: payload.order.orderId, organizationId: payload.order.organizationId, organizationName: payload.order.organizationName, licenseType: payload.order.plan, priceUsd: null, cadence: "monthly", trialDays: 14, paymentAsset: payload.order.asset, paymentAssetLabel: payload.order.asset, network: payload.order.network, treasuryAddress: payload.order.treasuryAddress, memo: payload.order.memo });
    } catch (prepareError) {
      setError(prepareError instanceof Error ? prepareError.message : "Checkout preparation failed.");
    } finally {
      setLoading(null);
    }
  }

  async function verifyPayment(signatureOverride = paymentHash) {
    if (!order) return;
    setLoading("verify");
    setError("");
    setPaymentState("confirming");
    try {
      const response = await fetch(`${commercialCheckoutApiBase}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.orderId,
          signature: signatureOverride,
        }),
      });
      const payload = (await response.json()) as VerifyResponse;
      if (!response.ok || !payload.ok) {
        const pending = payload.status === "payment-not-verified";
        setPaymentState(pending ? "pending" : "failed");
        throw new Error(pending ? "Payment is submitted but not confirmed by the verification service yet. Keep this hash and retry; do not pay again." : payload.error || "Payment verification failed.");
      }
      setReceipt(payload);
      setPaymentState("verified");
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Payment verification failed.");
    } finally {
      setLoading(null);
    }
  }

  async function waitForConfirmation(signature: string, timeoutMs = 120_000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const status = (await solanaConnection.getSignatureStatuses([signature], { searchTransactionHistory: true })).value[0];
      if (status?.err) throw new Error(`Solana transaction failed: ${JSON.stringify(status.err)}`);
      if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") return status;
      await new Promise((resolve) => setTimeout(resolve, 1_500));
    }
    throw new Error("Transaction submitted, but confirmation is still pending. The hash has been saved; retry verification later and do not pay again.");
  }

  async function payFromWallet() {
    if (!publicKey || !order || !payment) { setError("Connect a Solana wallet and prepare an order first."); return; }
    setLoading("pay"); setError(""); setReceipt(undefined); setPaymentState("submitted");
    try {
      const transaction = new Transaction();
      if (order.asset === "SOL") {
        transaction.add(SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: new PublicKey(order.treasuryAddress), lamports: Number(order.amountAtomic) }));
      } else {
        if (!payment.tokenMint) throw new Error("The order did not include a token mint.");
        const mint = new PublicKey(payment.tokenMint);
        const source = await getAssociatedTokenAddress(mint, publicKey, false, TOKEN_PROGRAM_ID);
        const destination = await getAssociatedTokenAddress(mint, new PublicKey(order.treasuryAddress), true, TOKEN_PROGRAM_ID);
        transaction.add(createTransferCheckedInstruction(source, mint, destination, publicKey, BigInt(order.amountAtomic), payment.decimals, [], TOKEN_PROGRAM_ID));
      }
      transaction.add(new TransactionInstruction({ keys: [], programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"), data: Buffer.from(order.memo, "utf8") }));
      const signature = await sendBrowserTransaction(solanaConnection, transaction, sendTransaction);
      setPaymentHash(signature);
      setPaymentState("confirming");
      // Persist the signature synchronously before any confirmation wait. A reload
      // must never turn an already-submitted payment back into an empty form.
      persistCheckoutState({ order, payment, paymentHash: signature, paymentState: "confirming" });
      await waitForConfirmation(signature);
      await verifyPayment(signature);
    } catch (paymentError) {
      const message = paymentError instanceof Error ? paymentError.message : "Wallet payment failed.";
      setPaymentState(message.includes("submitted") ? "pending" : "failed");
      setError(message);
      setLoading(null);
    }
  }

  async function copyTreasuryAddress() {
    if (!checkout?.treasuryAddress) return;
    await navigator.clipboard.writeText(checkout.treasuryAddress);
  }

  return (
    <section className="rounded-[28px] border border-cyan-300/16 bg-cyan-300/[0.06] p-5 sm:p-6">
      <div className="text-[11px] uppercase tracking-[0.25em] text-cyan-100/76">Commercial activation</div>
      <h2 className="mt-3 text-2xl font-semibold text-white">Start a trial, then activate a paid PrivateDAO workspace.</h2>
      <p className="mt-3 max-w-4xl text-sm leading-7 text-white/64">
        Choose a plan and payment path. Crypto activation can produce a receipt and organization license record from
        this page. Bank transfer and enterprise procurement are invoice-led through official PrivateDAO contacts.
      </p>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {[
          ["Crypto transfer", "PDAO, USDC, or SOL on Solana. The order verifies the exact mint, amount, treasury, memo, and finality before licensing."],
          ["Bank transfer", "Request an invoice and bank instructions for monthly or fixed-scope pilot activation."],
          ["Enterprise procurement", "Use discovery for private deployment, SLA, support, and custom capacity."],
        ].map(([title, body]) => (
          <div key={title} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-sm font-semibold text-white">{title}</div>
            <p className="mt-2 text-sm leading-6 text-white/58">{body}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-3">
        <label className="grid gap-2 text-sm text-white/72">
          Organization
          <input
            value={organizationName}
            onChange={(event) => setOrganizationName(event.target.value)}
            className="rounded-2xl border border-white/10 bg-black/28 px-3 py-3 text-sm text-white outline-none focus:border-cyan-200/60"
          />
        </label>
        <label className="grid gap-2 text-sm text-white/72">
          Plan
          <select
            value={plan}
            onChange={(event) => setPlan(event.target.value as LicenseType)}
            className="rounded-2xl border border-white/10 bg-black/28 px-3 py-3 text-sm text-white outline-none focus:border-cyan-200/60"
          >
            {planOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm text-white/72">
          Payment asset
          <select
            value={asset}
            onChange={(event) => setAsset(event.target.value as PaymentAsset)}
            className="rounded-2xl border border-white/10 bg-black/28 px-3 py-3 text-sm text-white outline-none focus:border-cyan-200/60"
          >
            {assetOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={prepareCheckout} className={cn(buttonVariants({ size: "sm" }))} disabled={loading !== null}>
          {loading === "prepare" ? "Preparing..." : "Prepare checkout"}
          <ArrowRight className="h-4 w-4" />
        </button>
        <a href="mailto:business@privatedao.org?subject=PrivateDAO%20bank%20transfer%20invoice" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          Request bank invoice
        </a>
      </div>

      {checkout ? (
        <div className="mt-6 grid gap-3 rounded-[22px] border border-white/10 bg-black/24 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/44">Treasury address</div>
              <div className="mt-2 break-all font-mono text-sm text-white">{checkout.treasuryAddress}</div>
            </div>
            <button type="button" onClick={copyTreasuryAddress} className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
              <Copy className="h-4 w-4" />
              Copy
            </button>
          </div>
          <div className="grid gap-2 text-sm text-white/62 md:grid-cols-2">
            <div>Network: {checkout.network}</div>
            <div>Memo: {checkout.memo}</div>
            <div>Trial: {checkout.trialDays} days</div>
            <div>Checkout ID: {checkout.checkoutId}</div>
            {order ? <div>Exact amount: {order.amountAtomic} atomic units</div> : null}
            {order ? <div>Order expiry: {order.expiresAt}</div> : null}
          </div>
          <label className="grid gap-2 text-sm text-white/72">
            Transaction hash
            <input
              value={paymentHash}
              onChange={(event) => setPaymentHash(event.target.value)}
              className="rounded-2xl border border-white/10 bg-black/28 px-3 py-3 font-mono text-sm text-white outline-none focus:border-cyan-200/60"
              placeholder="Paste transaction hash after payment"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={payFromWallet} className={cn(buttonVariants({ size: "sm" }))} disabled={!connected || !order || loading !== null}><Wallet className="h-4 w-4" />Pay from wallet</button>
            <button type="button" onClick={() => verifyPayment()} className={cn(buttonVariants({ size: "sm" }), "w-fit")} disabled={!canVerify || loading !== null}>
              {loading === "verify" ? "Verifying..." : paymentState === "pending" ? "Retry verification" : "Verify and issue license"}
              <CheckCircle2 className="h-4 w-4" />
            </button>
          </div>
          {paymentHash ? <div className="rounded-xl border border-cyan-200/15 bg-cyan-200/[0.05] p-3 text-sm text-cyan-50">Payment state: <strong>{paymentState}</strong>. The transaction hash is retained locally for recovery after refresh.</div> : null}
        </div>
      ) : null}

      {receipt?.license || receipt?.receipt ? (
        <div className="mt-5 rounded-[22px] border border-emerald-300/20 bg-emerald-300/[0.08] p-4">
          <div className="text-sm font-semibold text-white">Payment verified and organization license issued</div>
          <div className="mt-3 grid gap-2 text-sm text-white/66 md:grid-cols-2">
            <div>Order: {receipt.orderId || receipt.receipt?.receiptId}</div>
            <div>Customer: {receipt.customerId || "-"}</div>
            <div>License: {receipt.license?.payload.licenseId || receipt.receipt?.licenseType}</div>
            <div>Status: {receipt.subscription?.status || receipt.receipt?.verificationStatus}</div>
            <div>Expires: {receipt.license?.payload.expiresAt || receipt.receipt?.licenseEnd}</div>
            <div>Grace until: {receipt.subscription?.graceUntil || "-"}</div>
            {receipt.activationCode ? <div className="font-mono">Activation: {receipt.activationCode}</div> : null}
          </div>
          {receipt.license ? (
            <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs leading-6 text-white/58">
              <div className="font-semibold text-white">Signed Ed25519 license</div>
              <div>License ID: {receipt.license.payload.licenseId}</div>
              <div>Enabled plugins: {receipt.license.payload.enabledPlugins?.join(", ") || "configured by plan"}</div>
              <div className="break-all">Signature: {receipt.license.signature}</div>
            </div>
          ) : null}
          {receipt.delivery ? <div className="mt-3 grid gap-2 text-sm text-cyan-100"><a href={receipt.delivery.deploymentGuide} target="_blank" rel="noreferrer">Open deployment guide</a><a href={`${commercialControlPlaneBase}${receipt.delivery.downloadPackage}`} target="_blank" rel="noreferrer" download>Download license package</a></div> : null}
          {receipt.verification ? <p className="mt-3 text-sm leading-6 text-white/62">{receipt.verification}</p> : null}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 rounded-[22px] border border-white/10 bg-black/20 p-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="flex gap-3 text-sm leading-6 text-white/62">
          <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-cyan-100" />
          <span>
            Paid modules use signed, organization-bound license records. If a license is modified or fails validation,
            paid features fail closed and the event can be reviewed; customer data is not damaged or destructively altered.
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {contactLinks.map((link) => (
            <a key={link.href} href={link.href} className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/70 hover:border-cyan-200/40 hover:text-white">
              {link.label}
            </a>
          ))}
        </div>
      </div>

      {error ? <div className="mt-4 rounded-2xl border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-100">{error}</div> : null}
    </section>
  );
}
