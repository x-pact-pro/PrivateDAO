import assert from "node:assert/strict";

import {
  createHttpBackedPrivateDaoRuntime,
  KernelError,
} from "../packages/privatedao-runtime/src/index.ts";

const runtime = createHttpBackedPrivateDaoRuntime({
  baseUrl: "https://api.example.test",
  providerId: "http-test-provider",
  network: "solana-devnet",
  capabilities: ["payroll.calculate"],
  fetchImpl: async (input, init = {}) => {
    const url = String(input);
    if (url.endsWith("/prepare")) {
      const body = JSON.parse(init.body);
      return json({
        executionId: "exec-runtime-1",
        intent: body.intent,
        unsignedPayload: { observed: true },
        requiredSigners: [],
        state: "prepared",
      });
    }
    if (url.endsWith("/submit")) return json({ executionId: "exec-runtime-1", signatures: ["observed-signature"] });
    if (url.endsWith("/status")) return json({ executionId: "exec-runtime-1", state: "finalized" });
    if (url.endsWith("/receipt")) return json({
      executionId: "exec-runtime-1",
      requestId: "request-runtime-1",
      capability: "payroll.calculate",
      network: "solana-devnet",
      state: "finalized",
      signatures: ["observed-signature"],
      createdAt: "2026-09-09T00:00:00.000Z",
    });
    throw new Error(`unexpected endpoint: ${url}`);
  },
});

const intent = {
  context: {
    requestId: "request-runtime-1",
    idempotencyKey: "idempotency-runtime-1",
    product: "payroll",
    capability: "payroll.calculate",
    network: "solana-devnet",
  },
  payload: { budget: "1000" },
  accounts: [],
};

const prepared = await runtime.gateway.prepare(intent, "maker");
assert.equal(prepared.executionId, "exec-runtime-1");
assert.deepEqual(await runtime.gateway.submit(prepared, prepared.unsignedPayload, "maker"), {
  executionId: "exec-runtime-1",
  signatures: ["observed-signature"],
});
assert.equal((await runtime.gateway.status(prepared, "maker")).state, "finalized");
assert.equal((await runtime.gateway.receipt(prepared, "maker")).state, "finalized");

assert.throws(
  () => createHttpBackedPrivateDaoRuntime({
    baseUrl: "https://api.example.test",
    providerId: "invalid-provider",
    network: "ethereum-sepolia",
    capabilities: ["payroll.settle"],
    fetchImpl: async () => json({}),
  }),
  /not declared for ethereum-sepolia/,
);

await assert.rejects(
  () => runtime.gateway.prepare({
    ...intent,
    context: {
      ...intent.context,
      product: "governance",
      capability: "governance.proposal.execute",
      idempotencyKey: "idempotency-runtime-unsupported",
    },
  }, "maker"),
  (error) => error instanceof KernelError && error.code === "PROVIDER_NOT_FOUND",
);

console.log("[runtime-http-runtime] HTTP-backed composition and fail-closed capability checks passed");

function json(value) {
  return new Response(JSON.stringify(value), { status: 200, headers: { "Content-Type": "application/json" } });
}
