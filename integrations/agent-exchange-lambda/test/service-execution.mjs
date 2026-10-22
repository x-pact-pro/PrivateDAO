import assert from "node:assert/strict";
import test from "node:test";

process.env.AGENT_EXCHANGE_RPC_FIXTURE = "true";
const { executeService } = await import("../src/handler.mjs");

const solanaAddress = "11111111111111111111111111111111";

test("specialized Solana services keep their execution boundaries", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options = {}) => {
    const request = JSON.parse(options.body || "{}");
    const results = {
      getSignaturesForAddress: [{ signature: "2".repeat(88), slot: 42, err: null, blockTime: 1700000000 }],
      getAccountInfo: { value: { owner: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", executable: true, data: { parsed: { info: { mintAuthority: null, freezeAuthority: null } } } } },
      getTokenSupply: { value: { amount: "1000000", decimals: 6 } },
      getTokenLargestAccounts: { value: [] },
    };
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: request.id, result: results[request.method] ?? null }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const trace = await executeService("forensics.trace", { network: "solana-mainnet-beta", wallet: solanaAddress, limit: 1 });
    assert.equal(trace.evidence_confidence, "rpc-confirmed");
    assert.equal(trace.signatures.length, 1);
    assert.equal(trace.recent_activity, undefined);

    const inspection = await executeService("contract.inspect", { network: "solana-mainnet-beta", program: solanaAddress });
    assert.equal(inspection.exists, true);
    assert.equal(inspection.executable, true);
    assert.equal(inspection.signatures, undefined);

    const launch = await executeService("launch.check", { network: "solana-mainnet-beta", mint: solanaAddress });
    assert.equal(launch.valid, true);
    assert.ok(launch.authority_flags);
    assert.equal(launch.signatures, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
