import assert from "node:assert/strict";

const { SolanaBrowserExecutionProvider } = await import("../packages/privatedao-runtime/src/solana-browser-execution-provider.ts");

const programId = "EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva";
const account = "11111111111111111111111111111111";
const calls = [];
const fetchImpl = async (_input, init) => {
  const request = JSON.parse(init.body);
  calls.push(request.method);
  return new Response(JSON.stringify({
    jsonrpc: "2.0",
    id: request.id,
    result: request.method === "getTransaction"
      ? { slot: 123, meta: { err: null }, transaction: { message: { accountKeys: [{ pubkey: programId, signer: false }, { pubkey: account, signer: true }] } } }
      : null,
  }), { status: 200, headers: { "content-type": "application/json" } });
};

const provider = new SolanaBrowserExecutionProvider(fetchImpl, "https://devnet.example.test");
const intent = {
  context: {
    requestId: "solana-browser-test",
    idempotencyKey: "solana-browser-test-key",
    product: "governance",
    capability: "governance.proposal.execute",
    network: "solana-devnet",
  },
  payload: { kind: "solana-browser-transaction", operation: "governance.proposal.execute", account, programId },
  accounts: [],
};

const prepared = await provider.prepare(intent);
assert.equal(prepared.state, "awaiting_signature");
assert.equal(prepared.signingMode, "browser");
const repeated = await provider.prepare(intent);
assert.equal(repeated.executionId, prepared.executionId);
const submitted = await provider.submit(prepared, { kind: "browser-solana-transaction", signature: "5Vf4n9qK2q8m6p7x8s9t2u3v4w5y6z7A8B9C" });
assert.deepEqual(submitted.signatures, ["5Vf4n9qK2q8m6p7x8s9t2u3v4w5y6z7A8B9C"]);
const receipt = await provider.receipt(prepared.executionId);
assert.equal(receipt.state, "confirmed");
assert.equal(receipt.network, "solana-devnet");
assert.equal(receipt.blockNumber, "123");
assert.deepEqual(calls, ["getTransaction"]);

await assert.rejects(
  provider.prepare({ ...intent, payload: { ...intent.payload, programId: "11111111111111111111111111111111" } }),
  /unapproved program/,
);

const mismatchProvider = new SolanaBrowserExecutionProvider(async (_input, init) => {
  const request = JSON.parse(init.body);
  return new Response(JSON.stringify({
    jsonrpc: "2.0",
    id: request.id,
    result: request.method === "getTransaction"
      ? { slot: 124, meta: { err: null }, transaction: { message: { accountKeys: [{ pubkey: programId, signer: false }] } } }
      : null,
  }), { status: 200, headers: { "content-type": "application/json" } });
}, "https://devnet.example.test");
const mismatchIntent = { ...intent, context: { ...intent.context, requestId: "solana-browser-mismatch", idempotencyKey: "solana-browser-mismatch-key" } };
const mismatchPrepared = await mismatchProvider.prepare(mismatchIntent);
await mismatchProvider.submit(mismatchPrepared, { kind: "browser-solana-transaction", signature: "5Vf4n9qK2q8m6p7x8s9t2u3v4w5y6z7A8B9C" });
await assert.rejects(() => mismatchProvider.receipt(mismatchPrepared.executionId), /prepared wallet account/);

console.log("SOLANA_BROWSER_PROVIDER: PASS");
