export type QvacCapabilityState = {
  webGpu: boolean;
  webGl: boolean;
  wasm: boolean;
  workers: boolean;
  language: string;
  platform: string;
  sdk: "loaded" | "not-installed" | "unavailable";
};

export type QvacRuntime = {
  sdkState: QvacCapabilityState["sdk"];
  capabilities: string[];
};

export async function detectQvacCapabilityState(): Promise<QvacCapabilityState> {
  const nav = typeof navigator !== "undefined" ? navigator : null;
  const windowRef = typeof window !== "undefined" ? window : null;

  const webGpu = Boolean((nav as Navigator & { gpu?: unknown } | null)?.gpu);
  const webGl = Boolean(windowRef?.document?.createElement("canvas").getContext("webgl"));
  const wasm = typeof WebAssembly !== "undefined";
  const workers = typeof Worker !== "undefined";

  return {
    webGpu,
    webGl,
    wasm,
    workers,
    language: nav?.language ?? "unknown",
    platform: nav?.platform ?? "unknown",
    sdk: await detectQvacSdkState(),
  };
}

export async function detectQvacSdkState(): Promise<QvacCapabilityState["sdk"]> {
  if (typeof window === "undefined") return "unavailable";

  try {
    const importer = new Function("return import('@qvac/sdk')") as () => Promise<unknown>;
    const loaded = await importer();
    return loaded && typeof loaded === "object" ? "loaded" : "unavailable";
  } catch {
    return "not-installed";
  }
}

export async function loadQvacRuntime(): Promise<QvacRuntime> {
  const sdkState = await detectQvacSdkState();
  return {
    sdkState,
    capabilities:
      sdkState === "loaded"
        ? ["local-llm", "embeddings", "translation", "speech", "ocr"]
        : ["deterministic-local-brief", "device-capability-check", "privacy-preserving-pre-sign-review"],
  };
}

export function buildQvacOperationalBrief(input: {
  operationType: string;
  amount: string;
  asset: string;
  riskNotes: string;
  privacyMode: string;
}) {
  const lines = [
    `Operation: ${input.operationType || "unspecified"}`,
    `Amount: ${input.amount || "unspecified"} ${input.asset || ""}`.trim(),
    `Privacy mode: ${input.privacyMode || "private"}`,
    `Risk notes: ${input.riskNotes || "No extra risk notes provided."}`,
  ];

  const alerts: string[] = [];
  const parsedAmount = Number(input.amount);
  if (Number.isFinite(parsedAmount) && parsedAmount >= 10000) {
    alerts.push("High amount operation: require explicit proposal-policy confirmation before signing.");
  }
  if ((input.riskNotes || "").toLowerCase().includes("new recipient")) {
    alerts.push("New recipient signal detected: run counterparty check before settlement.");
  }
  if ((input.privacyMode || "").toLowerCase().includes("public")) {
    alerts.push("Public execution mode detected: confirm that sensitive recipients and amounts are intentionally visible.");
  }

  return {
    summary: lines.join(" | "),
    alerts,
    safeToProceed: alerts.length === 0,
  };
}
