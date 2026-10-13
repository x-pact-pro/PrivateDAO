import type { SignatureStatus } from "@solana/web3.js";

/** A wallet payment that was sent to Solana: its signature and the block height after which it can no longer land. */
export type SentPayment = {
  signature: string;
  lastValidBlockHeight: number;
};

/**
 * `landed`: finalized, ready for order verification. `failed`: executed with an error, nothing was transferred.
 * `dropped`: its blockhash expired before it reached the chain, safe to pay again. `pending`: not known yet.
 */
export type PaymentOutcome = "landed" | "failed" | "pending" | "dropped";

// A transaction signature is 64 bytes in base58: 64 to 88 characters.
const transactionSignaturePattern = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;

/**
 * Classifies a payment from its signature status and the current block height. A payment counts as landed only
 * when finalized, because the order API requires finality, and as dropped only when it has no status after its
 * blockhash expired.
 */
export function paymentOutcome(
  status: Pick<SignatureStatus, "err" | "confirmationStatus"> | null,
  blockHeight: number,
  lastValidBlockHeight: number,
): PaymentOutcome {
  if (status) {
    if (status.err) return "failed";
    return status.confirmationStatus === "finalized" ? "landed" : "pending";
  }
  return blockHeight > lastValidBlockHeight ? "dropped" : "pending";
}

/** Whether a value restored from browser storage can be a Solana transaction signature. */
export function isTransactionSignature(value: unknown): value is string {
  return typeof value === "string" && transactionSignaturePattern.test(value);
}
