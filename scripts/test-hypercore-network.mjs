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
assert.equal(prepared.action.hyperliquidChain, "Testnet");
assert.equal(prepared.requiresSignature, true);
assert.equal(prepared.broadcastEnabled, false);
assert.throws(() => adapter.prepareNativeAction("usdSend", { type: "spotSend" }), /does not match/);
assert.throws(() => adapter.prepareNativeAction("usdSend", { hyperliquidChain: "Mainnet" }), /cannot target Mainnet/);
assert.throws(() => adapter.prepareNativeAction("usdSend", {}, 0), /positive safe integer/);
assert.throws(() => adapter.prepareNativeAction("usdSend", { destination: "0x0000000000000000000000000000000000000001" }), /amount must be a non-empty string/);
assert.throws(() => adapter.prepareNativeAction("spotSend", { destination: "0x0000000000000000000000000000000000000001", amount: "1", token: "" }), /token must be a non-empty string/);
assert.throws(() => adapter.prepareNativeAction("usdClassTransfer", { amount: "1", toPerp: "true", nonce: 1 }), /toPerp must be boolean/);
assert.throws(() => adapter.prepareNativeAction("tokenDelegate", { validator: "not-an-address", wei: 1, isUndelegate: false, nonce: 1 }), /validator must be a valid EVM address/);

assert.throws(
  () => new HyperCoreNetworkAdapter({ apiUrl: "https://api.hyperliquid.xyz/info", fetchImpl }),
  /Testnet API endpoint/,
);

let signedTypedData;
const signer = {
  signTypedData: async (args) => {
    signedTypedData = args;
    return `0x${"11".repeat(65)}`;
  },
};
const signedPrepared = adapter.prepareNativeAction("usdSend", {
  hyperliquidChain: "Testnet",
  destination: "0x0000000000000000000000000000000000000001",
  amount: "1",
  time: 1_700_000_000_000,
});
const signed = await adapter.signNativeAction(signedPrepared, signer, "0x66eee");
assert.equal(signed.broadcastEnabled, false);
assert.equal(signed.signatureChainId, "0x66eee");
assert.equal(signed.action.signatureChainId, "0x66eee");
assert.equal(signedTypedData.primaryType, "HyperliquidTransaction:UsdSend");
assert.equal(signedTypedData.domain.name, "HyperliquidSignTransaction");
assert.equal(signedTypedData.message.hyperliquidChain, "Testnet");
assert.equal(signedTypedData.message.amount, "1");
assert.equal(signedTypedData.message.time, 1_700_000_000_000n);

assert.rejects(
  () => adapter.signNativeAction(adapter.prepareNativeAction("withdraw3", {
    hyperliquidChain: "Testnet",
    destination: "0x0000000000000000000000000000000000000001",
    amount: "1",
    time: 1,
  }), signer, "0x66eee"),
  /no supported user-signed EIP-712 mapping/,
);
assert.rejects(
  () => adapter.signNativeAction(signedPrepared, signer, "not-a-chain-id"),
  /signatureChainId must be a hexadecimal chain ID/,
);

const malformed = new HyperCoreNetworkAdapter({
  apiUrl: "https://api.hyperliquid-testnet.xyz/info",
  fetchImpl: async () => new Response(JSON.stringify({}), { status: 200 }),
});
assert.equal((await malformed.health()).ok, false);
console.log("HYPERCORE_NETWORK_ADAPTER: PASS");
