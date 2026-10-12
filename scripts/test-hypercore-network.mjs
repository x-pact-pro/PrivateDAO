import assert from "node:assert/strict";
import { HyperCoreNetworkAdapter } from "../packages/privatedao-runtime/src/index.ts";

const calls = [];
const fetchImpl = async (_url, init) => {
  calls.push({ url: _url, init });
  return new Response(JSON.stringify({ universe: [{ name: "BTC" }, { name: "ETH" }] }), { status: 200 });
};

const adapter = new HyperCoreNetworkAdapter({
  apiUrl: "https://api.hyperliquid-testnet.xyz/info",
  fetchImpl,
});
const meta = await adapter.readMeta();
assert.equal(meta.network, "hypercore-testnet");
assert.equal(meta.universeSize, 2);
assert.equal(JSON.parse(calls[0].init.body).type, "meta");
assert.equal((await adapter.health()).ok, true);

const prepared = adapter.prepareNativeAction("usdSend", {
  hyperliquidChain: "Testnet",
  destination: "0x0000000000000000000000000000000000000001",
  amount: "1",
});
assert.equal(prepared.network, "hypercore-testnet");
assert.equal(prepared.endpoint, "https://api.hyperliquid-testnet.xyz/exchange");
assert.equal(prepared.action.type, "usdSend");
assert.equal(prepared.requiresSignature, true);
assert.equal(prepared.broadcastEnabled, false);
assert.throws(() => adapter.prepareNativeAction("usdSend", { type: "spotSend" }), /does not match/);
assert.throws(() => adapter.prepareNativeAction("usdSend", {}, 0), /positive safe integer/);

assert.throws(
  () => new HyperCoreNetworkAdapter({ apiUrl: "https://api.hyperliquid.xyz/info", fetchImpl }),
  /Testnet API endpoint/,
);

const malformed = new HyperCoreNetworkAdapter({
  apiUrl: "https://api.hyperliquid-testnet.xyz/info",
  fetchImpl: async () => new Response(JSON.stringify({}), { status: 200 }),
});
assert.equal((await malformed.health()).ok, false);
console.log("HYPERCORE_NETWORK_ADAPTER: PASS");
