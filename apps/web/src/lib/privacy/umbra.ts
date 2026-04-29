export type UmbraSettlementIntent = {
  recipient: string;
  mint: string;
  amountBaseUnits: string;
  memo?: string;
};

export type UmbraSdkReceipt = {
  rail: "umbra";
  mode: "sdk-client-required" | "sdk-ready";
  network: "devnet" | "mainnet";
  recipient: string;
  mint: string;
  amountBaseUnits: string;
  sdkFunctions: string[];
  generatedAt: string;
};

export async function detectUmbraSdkExports() {
  try {
    const sdk = (await import("@umbra-privacy/sdk")) as Record<string, unknown>;
    return {
      sdkLoaded: true,
      exports: Object.keys(sdk).sort().slice(0, 80),
    };
  } catch (error) {
    return {
      sdkLoaded: false,
      exports: [] as string[],
      error: error instanceof Error ? error.message : "Unable to load @umbra-privacy/sdk",
    };
  }
}

export async function getUmbraDevnetRelayerReadiness(apiEndpoint = "https://relayer.api-devnet.umbraprivacy.com") {
  const { getUmbraRelayer } = await import("@umbra-privacy/sdk");
  const relayer = getUmbraRelayer({ apiEndpoint });
  const [address, supportedMints] = await Promise.all([
    relayer.getRelayerAddress(),
    relayer.getSupportedMints(),
  ]);

  return {
    apiEndpoint,
    address: String(address),
    supportedMints: supportedMints.mints.map(String),
    supportedMintCount: Number(supportedMints.count),
    claimSubmitPath: "/v1/claims",
    claimPollPath: "/v1/claims/{request_id}",
    terminalStatuses: ["completed", "failed", "timed_out"],
  };
}

export async function prepareUmbraClientReceipt(intent: UmbraSettlementIntent): Promise<UmbraSdkReceipt> {
  if (!intent.recipient || intent.recipient.length < 20) {
    throw new Error("Umbra recipient is required.");
  }
  if (!intent.mint || intent.mint.length < 20) {
    throw new Error("Umbra mint is required.");
  }
  if (!/^\d+$/.test(intent.amountBaseUnits)) {
    throw new Error("Umbra amount must be expressed as integer base units.");
  }

  return {
    rail: "umbra",
    mode: "sdk-client-required",
    network: "devnet",
    recipient: intent.recipient,
    mint: intent.mint,
    amountBaseUnits: intent.amountBaseUnits,
    sdkFunctions: [
      "getUmbraClient",
      "getUserRegistrationFunction",
      "getPublicBalanceToEncryptedBalanceDirectDepositorFunction",
      "getPublicBalanceToReceiverClaimableUtxoCreatorFunction",
      "getClaimableUtxoScannerFunction",
    ],
    generatedAt: new Date().toISOString(),
  };
}

export function buildScopedUmbraViewingKeyReference(input: {
  operationId: string;
  auditorScope: "employee" | "finance" | "external-auditor";
  validFrom: string;
  validTo: string;
}) {
  const seed = `${input.operationId}:${input.auditorScope}:${input.validFrom}:${input.validTo}`;
  let digest = 0;
  for (let index = 0; index < seed.length; index += 1) {
    digest = (digest * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return {
    scope: input.auditorScope,
    validFrom: input.validFrom,
    validTo: input.validTo,
    viewingKeyReference: `umbra-view-${digest.toString(16).padStart(8, "0")}`,
  };
}
