"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Cpu, Languages, Mic, ScanText, ShieldCheck, Sparkles } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { persistOperationReceipt } from "@/lib/supabase/operation-receipts";
import {
  buildQvacOperationalBrief,
  detectQvacCapabilityState,
  generateQvacFabricBrief,
  loadQvacRuntime,
  type QvacLocalBrief,
  type QvacModelProgress,
  type QvacCapabilityState,
  type QvacRuntime,
} from "@/lib/ai/qvac";
import { cn } from "@/lib/utils";

const defaultCapability: QvacCapabilityState = {
  webGpu: false,
  webGl: false,
  wasm: false,
  workers: false,
  language: "unknown",
  platform: "unknown",
  sdk: "installed-browser-model-runtime",
};

const defaultRuntime: QvacRuntime = {
  sdkState: "optional-browser-model-runtime",
  capabilities: ["@qvac/sdk-installed", "optional-local-model-runtime", "deterministic-local-brief"],
};

type QvacBackendProof = {
  sdkPackage?: string;
  sdkVersion?: string;
  sdkLoaded?: boolean;
  exportedCapabilities?: string[];
  generatedAt?: string;
  productUse?: string[];
};

type QvacReceiptState = "idle" | "saved" | "failed";

export function QvacSovereignAiSurface({ compact = false }: { compact?: boolean }) {
  const [capability, setCapability] = useState<QvacCapabilityState>(defaultCapability);
  const [runtime, setRuntime] = useState<QvacRuntime>(defaultRuntime);
  const [backendProof, setBackendProof] = useState<QvacBackendProof | null>(null);
  const [operationType, setOperationType] = useState("private_treasury_execution");
  const [amount, setAmount] = useState("1250");
  const [asset, setAsset] = useState("USDT");
  const [privacyMode, setPrivacyMode] = useState("shielded");
  const [riskNotes, setRiskNotes] = useState("new recipient + rebalance path");
  const [localBrief, setLocalBrief] = useState<QvacLocalBrief>(() =>
    buildQvacOperationalBrief({
      operationType: "private_treasury_execution",
      amount: "1250",
      asset: "USDT",
      riskNotes: "new recipient + rebalance path",
      privacyMode: "shielded",
    }),
  );
  const [modelProgress, setModelProgress] = useState<QvacModelProgress | null>(null);
  const [inferenceState, setInferenceState] = useState<"idle" | "loading" | "ready" | "fallback">("idle");
  const [receiptState, setReceiptState] = useState<QvacReceiptState>("idle");

  useEffect(() => {
    void detectQvacCapabilityState().then(setCapability).catch(() => {
      setCapability(defaultCapability);
    });
    void loadQvacRuntime().then(setRuntime).catch(() => {
      setRuntime(defaultRuntime);
    });
    void fetch("https://api.privatedao.org/api/v1/qvac/runtime-proof", { cache: "no-store" })
      .then((response) => response.json())
      .then((body: unknown) => {
        if (typeof body === "object" && body !== null) {
          const record = body as { proof?: QvacBackendProof } & QvacBackendProof;
          setBackendProof(record.proof ?? record);
        }
      })
      .catch(() => {
        setBackendProof(null);
      });
  }, []);

  const qvacSdkStatus = backendProof?.sdkLoaded
    ? "loaded via runtime proof"
    : runtime.sdkState === "installed-browser-model-runtime"
      ? "installed; browser model runtime active"
      : runtime.sdkState;
  const qvacCapabilities =
    backendProof?.sdkLoaded && backendProof.exportedCapabilities?.length
      ? backendProof.exportedCapabilities.slice(0, 12)
      : runtime.capabilities;

  const deterministicBrief = useMemo(
    () => buildQvacOperationalBrief({ operationType, amount, asset, riskNotes, privacyMode }),
    [amount, asset, operationType, privacyMode, riskNotes],
  );

  async function handleRunLocalInference() {
    setInferenceState("loading");
    setModelProgress({ status: "preparing-local-runtime", file: "qvac/fabric-llm-finetune", progress: 0 });
    const generated = await generateQvacFabricBrief(
      {
        operationType,
        amount,
        asset,
        riskNotes,
        privacyMode,
      },
      setModelProgress,
    );
    setLocalBrief(generated);
    setInferenceState(generated.provider === "qvac-fabric-transformers" ? "ready" : "fallback");
    try {
      await persistOperationReceipt({
        operationType: "qvac-local-ai-brief",
        proposalId: `qvac:${operationType}`,
        approvalState: generated.provider === "qvac-fabric-transformers" ? "local-inference" : "local-fallback",
        executionReference: `${generated.model}:${Date.now()}`,
        privateSettlementRail: "qvac",
        stablecoinSymbol: asset,
        auditMode: "local-pre-sign-intelligence",
        recipientVisibility: privacyMode,
        metadata: {
          provider: generated.provider,
          model: generated.model,
          operationType,
          amount,
          asset,
          privacyMode,
          riskNotes,
          runtimeProof: {
            sdkLoaded: backendProof?.sdkLoaded ?? null,
            sdkPackage: backendProof?.sdkPackage ?? "@qvac/sdk",
            sdkVersion: backendProof?.sdkVersion ?? null,
            capabilities: qvacCapabilities,
          },
        },
      });
      setReceiptState("saved");
    } catch {
      setReceiptState("failed");
    }
  }

  const activeBrief = inferenceState === "idle" ? deterministicBrief : localBrief;

  return (
    <section className="rounded-[28px] border border-emerald-300/16 bg-emerald-300/[0.08] p-6">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.26em] text-emerald-100/78">
        <Cpu className="h-4 w-4" />
        QVAC sovereign AI layer
      </div>
      <h2 className="mt-3 text-2xl font-semibold text-white">Local-first decision layer for sensitive DAO operations</h2>
      <p className="mt-3 max-w-4xl text-sm leading-7 text-white/68">
        QVAC is used where disclosure would hurt the operator: private payroll, confidential treasury proposals, compliance review,
        and high-value votes. It prepares the brief locally before signing so sensitive governance intent does not need a centralized
        model endpoint.
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/46">On-device capability</div>
          <div className="mt-3 grid gap-2 text-sm text-white/72">
            <div className="flex items-center justify-between"><span>WebGPU</span><span className="font-medium text-white">{capability.webGpu ? "available" : "not detected"}</span></div>
            <div className="flex items-center justify-between"><span>WebGL</span><span className="font-medium text-white">{capability.webGl ? "available" : "not detected"}</span></div>
            <div className="flex items-center justify-between"><span>WASM</span><span className="font-medium text-white">{capability.wasm ? "available" : "not detected"}</span></div>
            <div className="flex items-center justify-between"><span>Workers</span><span className="font-medium text-white">{capability.workers ? "available" : "not detected"}</span></div>
            <div className="flex items-center justify-between"><span>Language</span><span className="font-medium text-white">{capability.language}</span></div>
            <div className="flex items-center justify-between"><span>QVAC SDK</span><span className="font-medium text-white">{qvacSdkStatus}</span></div>
            <div className="flex items-center justify-between"><span>Runtime package</span><span className="font-medium text-white">{backendProof?.sdkPackage ?? "@qvac/sdk + @xenova/transformers"}</span></div>
            <div className="flex items-center justify-between"><span>Runtime version</span><span className="font-medium text-white">{backendProof?.sdkVersion ?? "runtime proof"}</span></div>
            <div className="flex items-center justify-between"><span>Local model</span><span className="font-medium text-white">qvac/fabric-llm-finetune</span></div>
          </div>
        </div>

        <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/46">Operational local brief</div>
          <div className="mt-3 grid gap-3">
            <input value={operationType} onChange={(event) => setOperationType(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none" />
            <div className="grid gap-3 md:grid-cols-2">
              <input value={amount} onChange={(event) => setAmount(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none" />
              <input value={asset} onChange={(event) => setAsset(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none" />
            </div>
            <input value={privacyMode} onChange={(event) => setPrivacyMode(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none" />
            <textarea value={riskNotes} onChange={(event) => setRiskNotes(event.target.value)} rows={3} className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none" />
            <button type="button" onClick={() => void handleRunLocalInference()} disabled={inferenceState === "loading"} className={cn(buttonVariants({ size: "sm" }))}>
              {inferenceState === "loading" ? "Loading local QVAC model..." : "Run local QVAC brief"}
            </button>
            <div className="rounded-2xl border border-cyan-300/18 bg-cyan-300/[0.08] px-3 py-2 text-xs leading-6 text-cyan-50/76">
              Powered by QVAC fabric-llm running locally — zero cloud dependency. No API key. No centralized model call.
              {modelProgress ? (
                <span className="mt-1 block text-cyan-50/62">
                  {modelProgress.status}
                  {typeof modelProgress.progress === "number" ? ` · ${Math.round(modelProgress.progress)}%` : ""}
                  {modelProgress.file ? ` · ${modelProgress.file}` : ""}
                </span>
              ) : null}
              {receiptState !== "idle" ? (
                <span className="mt-1 block text-cyan-50/62">
                  Receipt {receiptState === "saved" ? "saved to Supabase proof timeline" : "could not be saved; local brief remains visible"}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[22px] border border-white/10 bg-black/20 p-4">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/46">
          <ShieldCheck className="h-4 w-4 text-emerald-200/80" />
          Local execution brief
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="rounded-full border border-emerald-300/18 bg-emerald-300/[0.08] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-emerald-50/78">
            {activeBrief.provider === "qvac-fabric-transformers" ? "QVAC fabric local inference" : "Local deterministic fallback"}
          </span>
          <span className="rounded-full border border-cyan-300/18 bg-cyan-300/[0.08] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-cyan-50/78">
            {activeBrief.model}
          </span>
        </div>
        <div className="mt-3 text-sm leading-7 text-white/72">{activeBrief.summary}</div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/72">
            <span className="block text-[11px] uppercase tracking-[0.16em] text-white/42">Operation type</span>
            {activeBrief.operationType}
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/72">
            <span className="block text-[11px] uppercase tracking-[0.16em] text-white/42">Privacy mode</span>
            {activeBrief.privacyModeRecommendation}
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/72">
            <span className="block text-[11px] uppercase tracking-[0.16em] text-white/42">Counterparty</span>
            {activeBrief.counterpartyCheckResult}
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {activeBrief.riskNotes.map((item) => (
            <div key={item} className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/72">
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-[22px] border border-white/10 bg-black/20 p-4">
        <div className="text-[11px] uppercase tracking-[0.2em] text-white/46">Runtime capabilities</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {qvacCapabilities.map((item) => (
            <span key={item} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white/62">
              {item}
            </span>
          ))}
        </div>
        {backendProof?.generatedAt ? (
          <div className="mt-3 text-xs text-white/45">Runtime proof generated at {new Date(backendProof.generatedAt).toLocaleString()}</div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/72"><Sparkles className="mb-2 h-4 w-4 text-cyan-200" />Local LLM policy brief before sign</div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/72"><Languages className="mb-2 h-4 w-4 text-cyan-200" />Offline translation for multilingual ops teams</div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/72"><Mic className="mb-2 h-4 w-4 text-cyan-200" />Speech-to-text command capture on device</div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/72"><ScanText className="mb-2 h-4 w-4 text-cyan-200" />OCR of invoice / payroll attachments locally</div>
      </div>

      {!compact ? (
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/intelligence" className={cn(buttonVariants({ size: "sm" }))}>Open Intelligence</Link>
          <Link href="/execute" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>Open Execute</Link>
          <Link href="/proof" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>Open Proof</Link>
        </div>
      ) : null}
    </section>
  );
}
