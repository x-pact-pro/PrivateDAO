import assert from "node:assert/strict";

const { SolanaPayrollSettlementProvider } = await import("../packages/privatedao-runtime/src/solana-payroll-settlement-provider.ts");

const responses = [
  { ok: true, intent: { provider: "umbra", network: "devnet", intentHash: "a".repeat(64), batchId: "batch-1" } },
  { ok: true, stage: "reconciled", execution: { executionId: "umbra-exec-1", status: "confirmed" } },
];
const calls = [];
const fetchImpl = async (_input, init) => {
  calls.push(JSON.parse(init.body));
  return new Response(JSON.stringify(responses.shift()), { status: 200, headers: { "content-type": "application/json" } });
};

const provider = new SolanaPayrollSettlementProvider(fetchImpl, "https://example.test/umbra");
const intent = {
  context: {
    requestId: "kernel-umbra-test",
    idempotencyKey: "kernel-umbra-test-key",
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
    batchId: "batch-1",
  },
  accounts: [],
};

const prepared = await provider.prepare(intent);
assert.equal(prepared.state, "prepared");
assert.equal(prepared.requiredSigners.length, 0);
const submitted = await provider.submit(prepared, prepared.unsignedPayload);
assert.equal(submitted.executionId, prepared.executionId);
assert.deepEqual(calls.map((call) => call.action), ["prepare", "execute"]);
const receipt = await provider.receipt(prepared.executionId);
assert.equal(receipt.network, "solana-devnet");
assert.equal(receipt.environment, "devnet");
assert.equal(receipt.asset, "WSOL");
assert.equal(receipt.state, "reconciled");

await assert.rejects(
  provider.prepare({ ...intent, context: { ...intent.context, capability: "payroll.calculate" } }),
  /does not support/,
);
await assert.rejects(
  provider.prepare({ ...intent, payload: { ...intent.payload, manifestCommitment: "invalid" } }),
  /manifestCommitment/,
);

console.log("SOLANA_PAYROLL_KERNEL_TEST: PASS");
