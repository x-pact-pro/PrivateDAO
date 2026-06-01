import { createHash } from "crypto";

import type { PrivatePayoutIntent, PrivatePayoutIntentInput, PrivatePayoutProviderId } from "@/lib/providers/private-payout-provider";

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
    .join(",")}}`;
}

export function sha256Hex(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function hashPrivatePayoutIntent(input: PrivatePayoutIntentInput, provider: PrivatePayoutProviderId, network: string) {
  const recipientHash = sha256Hex(input.recipientAddress.trim());
  const metadataHash = sha256Hex(stableStringify(input.recipientMetadata ?? {}));
  const canonical = stableStringify({
    provider,
    network,
    daoId: input.daoId,
    proposalId: input.proposalId,
    operationType: input.operationType,
    payoutMode: input.payoutMode ?? "private-payout",
    asset: input.asset,
    amount: input.amount,
    recipientHash,
    metadataHash,
    privacyMode: input.privacyMode ?? "proof-only",
    publicOutcome: input.publicOutcome ?? "pending-private-payout",
  });

  return {
    recipientHash,
    metadataHash,
    intentHash: sha256Hex(canonical),
  };
}

export function validatePrivatePayoutIntentShape(intent: PrivatePayoutIntent) {
  if (!intent.daoId || !intent.proposalId) return "daoId and proposalId are required.";
  if (!/^\d+(\.\d+)?$/.test(intent.amount)) return "amount must be a numeric string.";
  if (intent.recipientHash.length !== 64 || intent.metadataHash.length !== 64 || intent.intentHash.length !== 64) {
    return "intent hashes must be sha256 hex strings.";
  }
  return null;
}
