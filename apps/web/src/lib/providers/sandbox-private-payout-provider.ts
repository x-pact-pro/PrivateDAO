import type {
  PrivatePayoutExecutionResult,
  PrivatePayoutIntent,
  PrivatePayoutIntentInput,
  PrivatePayoutProvider,
  PrivatePayoutReceipt,
} from "@/lib/providers/private-payout-provider";
import { hashPrivatePayoutIntent, validatePrivatePayoutIntentShape } from "@/lib/providers/private-payout-utils";

export const sandboxPrivatePayoutProvider: PrivatePayoutProvider = {
  id: "sandbox-testnet",

  async prepareIntent(input: PrivatePayoutIntentInput): Promise<PrivatePayoutIntent> {
    const network = process.env.UMBRA_NETWORK?.trim() || "testnet";
    const hashes = hashPrivatePayoutIntent(input, "sandbox-testnet", network);
    return {
      provider: "sandbox-testnet",
      network,
      daoId: input.daoId,
      proposalId: input.proposalId,
      operationType: input.operationType,
      payoutMode: input.payoutMode ?? "private-payout",
      asset: input.asset,
      amount: input.amount,
      recipientHash: hashes.recipientHash,
      metadataHash: hashes.metadataHash,
      intentHash: hashes.intentHash,
      privacyMode: input.privacyMode ?? "proof-only",
      publicOutcome: input.publicOutcome ?? "sandbox private payout rehearsal",
      createdAt: new Date(0).toISOString(),
      sandbox: true,
    };
  },

  async validateIntent(intent: PrivatePayoutIntent) {
    const error = validatePrivatePayoutIntentShape(intent);
    return error ? { ok: false, error } : { ok: true };
  },

  async executeTestnet(intent: PrivatePayoutIntent): Promise<PrivatePayoutExecutionResult> {
    return {
      executionId: `sandbox-${intent.intentHash.slice(0, 24)}`,
      status: "sandbox-confirmed",
      proofUrl: `/proof/?privatePayout=${intent.intentHash}`,
    };
  },

  async buildReceipt(intent: PrivatePayoutIntent, executionResult: PrivatePayoutExecutionResult): Promise<PrivatePayoutReceipt> {
    return {
      provider: "sandbox-testnet",
      network: intent.network,
      intentHash: intent.intentHash,
      proposalId: intent.proposalId,
      daoId: intent.daoId,
      timestamp: intent.createdAt,
      privacyMode: intent.privacyMode,
      publicOutcome: intent.publicOutcome,
      labels: [
        intent.payoutMode === "public-payout" ? "Recipient visible in execution review" : "Recipient hidden during coordination",
        "Execution proof public after completion",
        "Sandbox testnet mode",
      ],
      proofUrl: executionResult.proofUrl,
      explorerUrl: executionResult.explorerUrl,
      sandbox: true,
    };
  },

  async getProviderStatus() {
    return {
      provider: "sandbox-testnet",
      enabled: true,
      configured: true,
      network: process.env.UMBRA_NETWORK?.trim() || "testnet",
      sandbox: true,
      receiptMode: "sandbox-deterministic-proof-only",
      reason: "Umbra env is not fully configured, so PrivateDAO uses a clearly labeled sandbox fallback.",
    };
  },
};
