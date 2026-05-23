import { readRepoJson } from "@/lib/repo-docs";

type RealDeviceRuntimeJson = {
  generatedAt: string;
  summary: {
    targetCount: number;
    completedTargetCount: number;
    pendingTargets: string[];
  };
  targets: Array<{
    id: string;
    walletLabel: string;
    environmentType: string;
    status: string;
  }>;
};

type RealDeviceCaptureRegistry = {
  captures: Array<{
    id: string;
    connectResult?: string;
    signingResult?: string;
    submissionResult?: string;
    txSignature?: string | null;
    errorMessage?: string | null;
    evidenceRefs?: string[];
  }>;
};

export type RealDeviceClosureTarget = {
  id: string;
  walletLabel: string;
  environmentType: string;
  status: string;
  nextAction: string;
  requiredEvidence: string[];
  captureSignals: string[];
};

export type RealDeviceCaptureClosureSnapshot = {
  generatedAt: string;
  completionLabel: string;
  pendingCount: number;
  targets: RealDeviceClosureTarget[];
};

function readJson<T>(relativePath: string): T {
  return readRepoJson<T>(relativePath);
}

function getTargetPlan(targetId: string) {
  switch (targetId) {
    case "phantom-desktop":
      return {
        nextAction: "Capture connect, diagnostics, and one signed Testnet submission from Phantom on desktop.",
        requiredEvidence: [
          "wallet version visible in extension or popup",
          "connect result and diagnostics visibility",
          "signed Testnet transaction signature or explicit wallet error",
          "screenshot or short recording reference",
        ],
      };
    case "solflare-desktop":
      return {
        nextAction: "Capture the full governance submit path from Solflare, including the signature prompt and explorer-visible outcome.",
        requiredEvidence: [
          "wallet version and browser",
          "proposal or DAO submission result",
          "explorer URL or transaction signature",
          "evidence refs for the success or failure boundary",
        ],
      };
    case "backpack-desktop":
      return {
        nextAction: "Capture Backpack desktop connect and one governed wallet action on Testnet.",
        requiredEvidence: [
          "connect result",
          "signing result",
          "submission result",
          "diagnostics snapshot or error transcript",
        ],
      };
    case "glow-desktop":
      return {
        nextAction: "Capture Glow desktop compatibility for the same minimum Testnet flow used elsewhere.",
        requiredEvidence: [
          "wallet and browser identification",
          "connect and signing result",
          "submission signature or explicit failure",
          "evidence refs",
        ],
      };
    case "android-runtime":
      return {
        nextAction: "Capture Android-native or mobile browser wallet flow with diagnostics and one signed Testnet transaction.",
        requiredEvidence: [
          "device and OS build",
          "wallet client name",
          "connect/signing/submission result",
          "screenshot or log evidence",
        ],
      };
    default:
      return {
        nextAction: "Capture connect, diagnostics, and one signed Testnet transaction for this target.",
        requiredEvidence: [
          "connect result",
          "signing result",
          "submission result",
          "evidence refs",
        ],
      };
  }
}

export function getRealDeviceCaptureClosureSnapshot(): RealDeviceCaptureClosureSnapshot {
  const runtime = readJson<RealDeviceRuntimeJson>("docs/runtime/real-device.generated.json");
  const registry = readJson<RealDeviceCaptureRegistry>("docs/runtime/real-device-captures.json");

  const targets = runtime.targets.map((target) => {
    const plan = getTargetPlan(target.id);
    const capture = registry.captures.find((item) => item.id === target.id);
    const captureSignals = [
      capture?.connectResult ? `connect: ${capture.connectResult}` : "connect: pending",
      capture?.signingResult ? `signing: ${capture.signingResult}` : "signing: pending",
      capture?.submissionResult ? `submission: ${capture.submissionResult}` : "submission: pending",
      capture?.txSignature ? `tx: ${capture.txSignature}` : capture?.errorMessage ? `error: ${capture.errorMessage}` : "tx/error: pending",
    ];

    return {
      id: target.id,
      walletLabel: target.walletLabel,
      environmentType: target.environmentType,
      status: target.status,
      nextAction: plan.nextAction,
      requiredEvidence: plan.requiredEvidence,
      captureSignals,
    };
  });

  return {
    generatedAt: runtime.generatedAt,
    completionLabel: `${runtime.summary.completedTargetCount}/${runtime.summary.targetCount} targets closed`,
    pendingCount: runtime.summary.pendingTargets.length,
    targets,
  };
}
