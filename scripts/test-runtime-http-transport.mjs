import assert from "node:assert/strict";

import {
  HttpExecutionTransport,
  TransportBackedNetworkAdapter,
  findProduct,
} from "../packages/privatedao-runtime/src/index.ts";

const capability = findProduct("treasury").capabilities[0];
const requests = [];
const executionId = "exec-http-1";

const fetchImpl = async (input, init = {}) => {
  const url = String(input);
  requests.push({ url, method: init.method, body: init.body ? JSON.parse(init.body) : undefined });
  if (url.endsWith("/prepare")) {
    return json({
      executionId,
      intent: requests.at(-1).body.intent,
      unsignedPayload: { policy: "approved" },
      requiredSigners: [],
      state: "prepared",
    });
  }
  if (url.endsWith("/submit")) return json({ executionId, signatures: ["observed-signature"] });
  if (url.endsWith("/status")) return json({ executionId, state: "finalized" });
  if (url.endsWith("/receipt")) return json({
    executionId,
    requestId: "request-http-1",
    capability: capability.id,
    network: "solana-devnet",
    state: "finalized",
    signatures: ["observed-signature"],
    createdAt: "2026-09-09T00:00:00.000Z",
  });
  if (url.endsWith("/fee-estimate")) return json({ network: "solana-devnet", atomicAmount: "5000", asset: "lamports" });
  return new Response(JSON.stringify({ error: "unexpected endpoint" }), { status: 404 });
};

const transport = new HttpExecutionTransport({ baseUrl: "https://api.example.test", fetchImpl });
const adapter = new TransportBackedNetworkAdapter({
  id: "http-test-provider",
  network: "solana-devnet",
  capabilities: [capability],
  transport,
});
const intent = {
  context: {
    requestId: "request-http-1",
    idempotencyKey: "idempotency-http-1",
    product: "treasury",
    capability: capability.id,
    network: "solana-devnet",
  },
  payload: { budget: "1000" },
  accounts: [],
};

const prepared = await adapter.prepare(intent);
assert.equal(prepared.executionId, executionId);
assert.deepEqual(await adapter.submit(prepared, prepared.unsignedPayload), { executionId, signatures: ["observed-signature"] });
assert.equal((await adapter.status(executionId)).state, "finalized");
assert.equal((await adapter.receipt(executionId)).state, "finalized");
assert.deepEqual(await adapter.estimateFee(intent), { network: "solana-devnet", atomicAmount: "5000", asset: "lamports" });
assert.deepEqual(requests.map((request) => request.method), ["POST", "POST", "GET", "GET", "POST"]);

const failingTransport = new HttpExecutionTransport({
  baseUrl: "https://api.example.test",
  fetchImpl: async () => new Response("not-json", { status: 502 }),
});
await assert.rejects(() => failingTransport.status(executionId), /non-JSON/);

const crossOriginTransport = new HttpExecutionTransport({
  baseUrl: "https://api.example.test",
  headers: { Authorization: "Bearer test-only" },
  paths: { prepare: "https://attacker.example.test/collect" },
  fetchImpl: async () => { throw new Error("cross-origin request must not be attempted"); },
});
await assert.rejects(
  () => crossOriginTransport.prepare(intent),
  /origin-relative/,
);

console.log("[runtime-http] observed lifecycle mapping and fail-closed validation passed");

function json(value) {
  return new Response(JSON.stringify(value), { status: 200, headers: { "Content-Type": "application/json" } });
}
