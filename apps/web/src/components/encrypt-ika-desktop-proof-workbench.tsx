
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StepState = "idle" | "running" | "done" | "review";

type Step = {
  id: string;
  label: string;
  state: StepState;
  detail: string;
};

type ExecutionOperationStats = {
  operationId: string;
  label: string;
  total: number;
  success: number;
  review: number;
  uniqueSessions: number;
  latestAt: string | null;
  latestReceiptHash: string | null;
  latestSource: string | null;
};

type ExecutionStats = {
  totalExecutions: number;
  totalSuccess: number;
  uniqueSessions: number;
  operations: ExecutionOperationStats[];
};

const API_BASE = process.env.NEXT_PUBLIC_PRIVATE_DAO_API_BASE || "https://api.privatedao.org";
const VISITOR_SESSION_KEY = "privatedao.execution-counter.session.v1";

const trackedOperations = [
  { operationId: "browser-encryption", label: "Browser encryption" },
  { operationId: "refhe-payroll-proof", label: "REFHE payroll receipt" },
  { operationId: "ika-sui-readiness", label: "Ika Sui network read" },
  { operationId: "ika-solana-prealpha-readiness", label: "Ika Solana program read" },
  { operationId: "ika-approval-prepare", label: "Ika approval route" },
];

function pretty(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function stateClass(state: StepState) {
  if (state === "done") return "border-emerald-300/24 bg-emerald-300/[0.08] text-emerald-50";
  if (state === "running") return "border-cyan-300/24 bg-cyan-300/[0.08] text-cyan-50";
  if (state === "review") return "border-amber-300/24 bg-amber-300/[0.08] text-amber-50";
  return "border-white/10 bg-black/22 text-white/70";
}

function getVisitorSessionId() {
  if (typeof window === "undefined") return "server-render";
  const existing = window.localStorage.getItem(VISITOR_SESSION_KEY);
  if (existing) return existing;
  const generated = crypto.randomUUID ? crypto.randomUUID() : `visitor-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(VISITOR_SESSION_KEY, generated);
  return generated;
}

export function EncryptIkaDesktopProofWorkbench() {
  const [steps, setSteps] = useState<Step[]>([
    { id: "browser-encryption", label: "Browser encryption", state: "idle", detail: "WebCrypto payload encryption runs locally before proof." },
    { id: "refhe-receipt", label: "REFHE receipt", state: "idle", detail: "Build encrypted payroll receipt and commitment continuity." },
    { id: "ika-sui", label: "Ika Sui readiness", state: "idle", detail: "Read Ika network encryption key and packages through @ika.xyz/sdk." },
    { id: "ika-solana", label: "Ika Solana pre-alpha", state: "idle", detail: "Read executable program and funded Testnet/pre-alpha operator wallet." },
    { id: "ika-approval", label: "Ika approval route", state: "idle", detail: "Prepare the governed approval route for the confidential payroll message." },
  ]);
  const [preview, setPreview] = useState("Run an encrypted proof action to see live output.");
  const [networkExecutions, setNetworkExecutions] = useState(0);
  const [executionStats, setExecutionStats] = useState<ExecutionStats | null>(null);
  const [running, setRunning] = useState(false);

  const statsByOperation = useMemo(() => {
    return new Map((executionStats?.operations || []).map((item) => [item.operationId, item]));
  }, [executionStats]);

  async function refreshExecutionStats() {
    const stats = await fetch(`${API_BASE}/api/v1/execution-events/stats`, { cache: "no-store" }).then((response) => response.json());
    if (stats?.ok) setExecutionStats(stats as ExecutionStats);
  }

  async function recordExecution(operationId: string, operationLabel: string, status: "success" | "review", receiptHash?: string | null, metadata?: Record<string, unknown>) {
    const response = await fetch(`${API_BASE}/api/v1/execution-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operationId,
        operationLabel,
        status,
        receiptHash: receiptHash || undefined,
        page: window.location.pathname,
        network: "review-live",
        source: "encrypted-capital-markets-proof",
        sessionId: getVisitorSessionId(),
        metadata,
      }),
    }).then((item) => item.json());
    if (response?.stats) setExecutionStats(response.stats as ExecutionStats);
    return response;
  }

  useEffect(() => {
    void refreshExecutionStats();
  }, []);

  function updateStep(id: string, state: StepState, detail?: string) {
    setSteps((current) => current.map((step) => (step.id === id ? { ...step, state, detail: detail ?? step.detail } : step)));
  }

  async function runDesktopProof() {
    setRunning(true);
    setPreview("Running Encrypt / Ika / REFHE proof checks...");
    setNetworkExecutions(0);
    try {
      updateStep("browser-encryption", "running");
      const encoder = new TextEncoder();
      const payroll = JSON.stringify([
        { recipient: "desktop-reviewer-01.sol", amount: 1250, asset: "USDC" },
        { recipient: "desktop-reviewer-02.sol", amount: 950, asset: "USDC" },
      ]);
      const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(payroll));
      const ciphertextHex = Array.from(new Uint8Array(ciphertext), (byte) => byte.toString(16).padStart(2, "0")).join("");
      updateStep("browser-encryption", "done", "Browser encrypted payroll payload with AES-GCM-256.");
      await recordExecution("browser-encryption", "Browser encryption", "success", null, { ciphertextBytes: ciphertext.byteLength });

      updateStep("refhe-receipt", "running");
      const refhe = await fetch(`${API_BASE}/api/v1/refhe/payroll/proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ciphertext: ciphertextHex,
          inputCommitment: "review-input-commitment",
          computationCommitment: "review-sum-2200-usdc",
          policyHash: "review-policy-confidential-payroll",
          totalAmountCommitment: "review-total-2200",
          recipientCount: 2,
        }),
      }).then((response) => response.json());
      if (refhe?.ok) setNetworkExecutions((count) => count + 1);
      await recordExecution("refhe-payroll-proof", "REFHE payroll receipt", refhe?.ok ? "success" : "review", refhe?.receiptHash, { recipientCount: 2 });
      updateStep("refhe-receipt", refhe?.ok ? "done" : "review", refhe?.ok ? `Live receipt ${refhe.receiptHash}` : "Receipt service returned a review state.");

      updateStep("ika-sui", "running");
      const ikaSui = await fetch(`${API_BASE}/api/v1/ika/sui/readiness`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ network: "testnet" }),
      }).then((response) => response.json());
      if (ikaSui?.ok) setNetworkExecutions((count) => count + 1);
      await recordExecution("ika-sui-readiness", "Ika Sui network read", ikaSui?.ok ? "success" : "review", ikaSui?.liveNetwork?.latestNetworkEncryptionKey?.id || null, { network: "testnet" });
      updateStep("ika-sui", ikaSui?.ok ? "done" : "review", ikaSui?.ok ? "Ika SDK initialized and network key read." : "Ika Sui route returned a review state.");

      updateStep("ika-solana", "running");
      const ikaSolana = await fetch(`${API_BASE}/api/v1/ika/solana-prealpha/readiness`).then((response) => response.json());
      const solanaReady = Boolean(ikaSolana?.solanaPreAlpha?.operator?.funded && ikaSolana?.solanaPreAlpha?.program?.executable);
      if (solanaReady) setNetworkExecutions((count) => count + 1);
      await recordExecution("ika-solana-prealpha-readiness", "Ika Solana program read", solanaReady ? "success" : "review", ikaSolana?.solanaPreAlpha?.latestBlockhash || null, { programId: ikaSolana?.solanaPreAlpha?.programId });
      updateStep("ika-solana", solanaReady ? "done" : "review", solanaReady ? "Solana pre-alpha program executable and operator funded." : "Solana pre-alpha returned a review state.");

      updateStep("ika-approval", "running");
      const approval = await fetch(`${API_BASE}/api/v1/ika/solana-prealpha/approval/prepare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "PrivateDAO confidential payroll approval",
          operationType: "confidential-payroll",
          curve: "ED25519",
          signatureScheme: "EddsaSha512",
        }),
      }).then((response) => response.json());
      if (approval?.ok) setNetworkExecutions((count) => count + 1);
      await recordExecution("ika-approval-prepare", "Ika approval route", approval?.ok ? "success" : "review", approval?.routeId || null, { operationType: "confidential-payroll" });
      updateStep("ika-approval", approval?.ok ? "done" : "review", approval?.ok ? "Governed approval route prepared for the payroll message." : "Approval route returned a review state.");

      setPreview(pretty({ browser: { encrypted: true, ciphertextBytes: ciphertext.byteLength }, refhe, ikaSui, ikaSolana, approval }));
    } catch (error) {
      setPreview(error instanceof Error ? error.message : "Encrypted proof run failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-cyan-300/16 bg-cyan-300/[0.07] p-6">
      <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/78">Encrypted execution proof runner</div>
      <h2 className="mt-3 text-2xl font-semibold text-white">Encrypt / Ika / 2PC-MPC / REFHE execution truth board</h2>
      <p className="mt-3 max-w-4xl text-sm leading-7 text-white/66">
        This route lets a visitor run the encrypted payroll proof path directly: browser encryption, REFHE receipt generation,
        Ika SDK network read, Solana pre-alpha program read, and governed approval-route preparation. The counters below are
        stored by the backend so attempts from different devices increase the same public totals.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={() => void runDesktopProof()} disabled={running} className={cn(buttonVariants({ size: "sm" }))}>
          {running ? "Running..." : "Run encrypted proof"}
        </button>
        <Link href="/services/encrypt-ika-operations" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
          Open Encrypt / Ika
        </Link>
        <Link href="/proof" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          Open Proof Center
        </Link>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[20px] border border-emerald-300/16 bg-emerald-300/[0.08] p-4">
          <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-100/76">Live execution attempts</div>
          <div className="mt-2 text-3xl font-semibold text-white">{executionStats?.totalExecutions ?? networkExecutions}</div>
          <div className="mt-2 text-xs leading-5 text-white/58">Total visitor-triggered executions recorded by the backend counter.</div>
        </div>
        <div className="rounded-[20px] border border-cyan-300/16 bg-cyan-300/[0.08] p-4">
          <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/76">Unique sessions</div>
          <div className="mt-2 text-3xl font-semibold text-white">{executionStats?.uniqueSessions ?? 0}</div>
          <div className="mt-2 text-xs leading-5 text-white/58">Different browser sessions that tried the encrypted execution route.</div>
        </div>
        <div className="rounded-[20px] border border-white/10 bg-black/24 p-4">
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/44">Visitor proof mode</div>
          <div className="mt-2 text-xl font-semibold text-white">Try it live</div>
          <div className="mt-2 text-xs leading-5 text-white/58">The JSON output shows the exact receipts and live read results returned by the network routes.</div>
        </div>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-5">
        {trackedOperations.map((operation) => {
          const stats = statsByOperation.get(operation.operationId);
          return (
            <div key={operation.operationId} className="rounded-[20px] border border-white/10 bg-black/24 p-4">
              <div className="text-[11px] uppercase tracking-[0.2em] text-white/44">Recorded tries</div>
              <div className="mt-2 text-2xl font-semibold text-white">{stats?.total ?? 0}</div>
              <div className="mt-1 text-sm font-medium text-white/84">{operation.label}</div>
              <div className="mt-2 text-xs leading-5 text-white/52">{stats?.uniqueSessions ?? 0} unique sessions</div>
            </div>
          );
        })}
      </div>
      <div className="mt-6 grid gap-3 lg:grid-cols-5">
        {steps.map((step) => (
          <div key={step.id} className={cn("rounded-[20px] border p-4", stateClass(step.state))}>
            <div className="text-[11px] uppercase tracking-[0.2em] opacity-70">{step.state}</div>
            <div className="mt-2 text-sm font-semibold text-white">{step.label}</div>
            <div className="mt-2 text-xs leading-5 text-white/62">{step.detail}</div>
          </div>
        ))}
      </div>
      <pre className="mt-5 max-h-[620px] overflow-auto rounded-[24px] border border-white/10 bg-black/30 p-4 text-xs leading-6 text-cyan-100/82">
        {preview}
      </pre>
    </section>
  );
}
