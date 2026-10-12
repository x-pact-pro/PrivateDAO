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
