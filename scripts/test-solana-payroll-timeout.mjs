import assert from "node:assert/strict";

const { SolanaPayrollSettlementProvider } = await import("../packages/privatedao-runtime/src/solana-payroll-settlement-provider.ts");

const hangingFetch = (_input, init) => new Promise((_resolve, reject) => {
  init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
});

const provider = new SolanaPayrollSettlementProvider(hangingFetch, "https://example.test/umbra", 250);
const intent = {
  context: {
    requestId: "solana-timeout",
    idempotencyKey: "solana-timeout",
    product: "payroll",
    capability: "payroll.settle",
    network: "solana-devnet",
  },
  payload: {
    kind: "umbra-payroll",
    manifestCommitment: "a".repeat(64),
    recipientHash: "b".repeat(64),
    recipientCount: 1,
    totalAmount: "0.001",
    asset: "WSOL",
    batchId: "timeout",
  },
  accounts: [],
};

await assert.rejects(() => provider.prepare(intent), /timed out after 250ms/i);
console.log("SOLANA_PAYROLL_TIMEOUT: PASS bounded_request=250ms");
