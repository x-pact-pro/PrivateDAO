import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ZCASH_NETWORK_CONFIGS,
  ZalletCliTransport,
  ZcashAdapterError,
  ZcashNetworkAdapter,
} from "../packages/privatedao-runtime/src/index.ts";

const config = ZCASH_NETWORK_CONFIGS[0];
assert.equal(config.network, "zcash-testnet");
assert.equal(config.environment, "testnet");
assert.equal(config.nativeAsset, "TAZ");
assert.equal(config.mainnetEnabled, false);

let mode = "ok";
const transport = {
  async health() {
    if (mode === "timeout") throw new Error("RPC request timed out");
    return { ok: true, network: "zcash-testnet", latencyMs: 5 };
  },
  async prepare(intent) {
    return { executionId: intent.context.requestId, intent, unsignedPayload: { raw: "unsigned-zcash-transaction" }, requiredSigners: [], state: "awaiting_signature" };
  },
  async submit(execution) { return { executionId: execution.executionId, signatures: ["zcash-testnet-txid"] }; },
  async status(executionId) { return { executionId, state: "confirmed" }; },
  async receipt(executionId) {
    if (mode === "malformed-receipt") return { executionId, requestId: executionId, capability: "verification.record.create", network: "zcash-testnet", state: "confirmed", signatures: [], createdAt: new Date().toISOString() };
    return { executionId, requestId: executionId, capability: "verification.record.create", network: "zcash-testnet", state: "confirmed", signatures: ["zcash-testnet-txid"], createdAt: new Date().toISOString(), environment: "testnet", asset: "TAZ" };
  },
  async estimateFee(intent) { return { network: intent.context.network, atomicAmount: "10000", asset: "TAZ" }; },
};

const adapter = new ZcashNetworkAdapter({
  id: "zcash-testnet-foundation",
  config,
  capabilities: ["verification.record.create"],
  transport,
});
const intent = {
  context: { requestId: "zcash-foundation-1", idempotencyKey: "zcash-foundation-1", product: "record-verification", capability: "verification.record.create", network: "zcash-testnet" },
  payload: {},
  accounts: [],
};
const prepared = await adapter.prepare(intent);
assert.equal(prepared.state, "awaiting_signature");
assert.equal((await adapter.submit(prepared, prepared.unsignedPayload)).signatures[0], "zcash-testnet-txid");
assert.equal((await adapter.status(prepared.executionId)).state, "confirmed");
assert.equal((await adapter.receipt(prepared.executionId)).network, "zcash-testnet");
assert.equal((await adapter.estimateFee(intent)).asset, "TAZ");
assert.match(adapter.explorerUrl("zcash-testnet-txid"), /explorer\.testnet\.z\.cash\/tx\//);

await assert.rejects(() => adapter.prepare({ ...intent, context: { ...intent.context, network: "ethereum-sepolia" } }), (error) => error instanceof ZcashAdapterError && error.code === "NETWORK_MISMATCH");
mode = "timeout";
await assert.rejects(() => adapter.health(), (error) => error instanceof ZcashAdapterError && error.code === "RPC_TIMEOUT");
mode = "malformed-receipt";
await assert.rejects(() => adapter.receipt(prepared.executionId), (error) => error instanceof ZcashAdapterError && error.code === "MALFORMED_RECEIPT");
mode = "ok";
transport.receipt = async (executionId) => ({ executionId, requestId: executionId, capability: "verification.record.create", network: "zcash-testnet", state: "confirmed", signatures: ["zcash-testnet-txid"], createdAt: new Date().toISOString(), environment: "mainnet", asset: "ZEC" });
await assert.rejects(() => adapter.receipt(prepared.executionId), (error) => error instanceof ZcashAdapterError && error.code === "MALFORMED_RECEIPT");
assert.throws(() => new ZcashNetworkAdapter({ id: "zcash-mainnet-disabled", config: { ...config, network: "zcash-mainnet", environment: "mainnet", nativeAsset: "ZEC" }, capabilities: ["verification.record.create"], transport }), /Unknown PrivateDAO network|Mainnet execution is disabled/);

const tmp = await mkdtemp(join(tmpdir(), "pdao-zcash-foundation-"));
try {
  const callsPath = join(tmp, "calls.log");
  const fakeZallet = join(tmp, "fake-zallet.mjs");
  const fakeConfig = join(tmp, "zallet.toml");
  await writeFile(fakeConfig, "broadcast = false\n");
  await writeFile(fakeZallet, `#!/usr/bin/env node
import { appendFileSync } from "node:fs";
const rpcIndex = process.argv.indexOf("rpc");
const method = rpcIndex >= 0 ? process.argv[rpcIndex + 1] : "unknown";
appendFileSync(${JSON.stringify(callsPath)}, method + "\\n");
if (method === "getwalletinfo") {
  console.log(JSON.stringify({ locked: false }));
} else if (method === "getwalletstatus") {
  console.log(JSON.stringify({ node_tip: { height: 100 } }));
} else if (method === "z_gettotalbalance") {
  console.log(JSON.stringify({ orchard: "1.0" }));
} else if (method === "z_sendmany") {
  process.stdout.write("opid-testnet-send");
} else if (method === "z_getoperationstatus") {
  console.log(JSON.stringify([{ id: "opid-testnet-send", status: "success", result: { txid: "zcash-testnet-real-shape-txid" } }]));
} else if (method === "getrawtransaction") {
  console.log(JSON.stringify({ confirmations: 2, height: 101 }));
} else {
  console.log(JSON.stringify({ ok: true }));
}
`);
  await chmod(fakeZallet, 0o755);
  const guarded = new ZalletCliTransport({
    binaryPath: fakeZallet,
    dataDirectory: tmp,
    configPath: fakeConfig,
    network: "zcash-testnet",
    explorerBaseUrl: "https://explorer.testnet.z.cash",
  });

  const guardedHealth = await guarded.health();
  assert.equal(guardedHealth.ok, false);
  assert.doesNotMatch(await readFile(callsPath, "utf8"), /z_gettotalbalance/);

  const guardedIntent = {
    context: { requestId: "zcash-guarded-send", idempotencyKey: "zcash-guarded-send", product: "payroll", capability: "payroll.settle", network: "zcash-testnet" },
    payload: { kind: "zallet-send", fromAddress: "utest1source", recipients: [{ address: "utest1recipient", atomicAmount: "10000" }] },
    accounts: [],
  };
  const guardedPrepared = await guarded.prepare(guardedIntent);
  await assert.rejects(() => guarded.submit(guardedPrepared, guardedPrepared.unsignedPayload), /Zcash broadcast is disabled/);
  assert.doesNotMatch(await readFile(callsPath, "utf8"), /z_sendmany/);

  const enabled = new ZalletCliTransport({
    binaryPath: fakeZallet,
    dataDirectory: tmp,
    configPath: fakeConfig,
    network: "zcash-testnet",
    explorerBaseUrl: "https://explorer.testnet.z.cash",
    broadcastEnabled: true,
  });
  const enabledPrepared = await enabled.prepare({
    ...guardedIntent,
    context: { ...guardedIntent.context, requestId: "zcash-enabled-send", idempotencyKey: "zcash-enabled-send" },
  });
  const enabledSubmitted = await enabled.submit(enabledPrepared, enabledPrepared.unsignedPayload);
  assert.deepEqual(enabledSubmitted.signatures, ["zcash-testnet-real-shape-txid"]);
  const enabledReceipt = await enabled.receipt(enabledPrepared.executionId);
  assert.equal(enabledReceipt.state, "finalized");
  assert.equal(enabledReceipt.blockNumber, "101");
} finally {
  await rm(tmp, { recursive: true, force: true });
}

console.log("[zcash-foundation] native UTXO adapter, network isolation, timeout, receipt, fee, Mainnet gate, balance-read guard, and broadcast guard checks passed");
