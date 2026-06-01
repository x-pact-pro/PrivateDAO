export type PrivatePayoutProviderId = "umbra" | "sandbox-testnet";

export type PrivatePayoutPrivacyMode =
  | "proof-only"
  | "selective-disclosure"
  | "private-room"
  | "vip-private-room";

export type PrivatePayoutIntentInput = {
  provider?: PrivatePayoutProviderId | "default";
  daoId: string;
  proposalId: string;
  operationType: "payroll" | "vendor" | "reward" | "treasury";
  asset: "USDC" | "USDT" | "SOL" | "PUSD" | "AUDD";
  amount: string;
  recipientAddress: string;
  recipientMetadata?: Record<string, unknown>;
  privacyMode?: PrivatePayoutPrivacyMode;
  publicOutcome?: string;
};

export type PrivatePayoutIntent = {
  provider: PrivatePayoutProviderId;
  network: string;
  daoId: string;
  proposalId: string;
  operationType: PrivatePayoutIntentInput["operationType"];
  asset: PrivatePayoutIntentInput["asset"];
  amount: string;
  recipientHash: string;
  metadataHash: string;
  intentHash: string;
  privacyMode: PrivatePayoutPrivacyMode;
  publicOutcome: string;
  createdAt: string;
  sandbox: boolean;
};

export type PrivatePayoutExecutionResult = {
  executionId: string;
  status: "prepared" | "submitted" | "confirmed" | "sandbox-confirmed";
  proofUrl?: string;
  explorerUrl?: string;
  raw?: unknown;
};

export type PrivatePayoutReceipt = {
  provider: PrivatePayoutProviderId;
  network: string;
  intentHash: string;
  proposalId: string;
  daoId: string;
  timestamp: string;
  privacyMode: PrivatePayoutPrivacyMode;
  publicOutcome: string;
  proofUrl?: string;
  explorerUrl?: string;
  sandbox: boolean;
};

export type PrivatePayoutProviderStatus = {
  provider: PrivatePayoutProviderId;
  enabled: boolean;
  configured: boolean;
  network: string;
  sandbox: boolean;
  receiptMode: string;
  reason?: string;
};

export type PrivatePayoutProvider = {
  id: PrivatePayoutProviderId;
  prepareIntent(input: PrivatePayoutIntentInput): Promise<PrivatePayoutIntent>;
  validateIntent(intent: PrivatePayoutIntent): Promise<{ ok: true } | { ok: false; error: string }>;
  executeTestnet(intent: PrivatePayoutIntent): Promise<PrivatePayoutExecutionResult>;
  buildReceipt(intent: PrivatePayoutIntent, executionResult: PrivatePayoutExecutionResult): Promise<PrivatePayoutReceipt>;
  getProviderStatus(): Promise<PrivatePayoutProviderStatus>;
};

export function assertKnownPrivatePayoutProvider(value: unknown): asserts value is PrivatePayoutProviderId | "default" | undefined {
  if (value === undefined || value === "default" || value === "umbra" || value === "sandbox-testnet") {
    return;
  }
  throw new Error("Unknown private payout provider.");
}
