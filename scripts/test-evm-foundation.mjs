import assert from "node:assert/strict";
import {
  DeploymentRegistry,
  EVM_NETWORK_CONFIGS,
  EvmAdapterError,
  EvmNetworkAdapter,
  ViemEvmTransport,
  getNetwork,
} from "../packages/privatedao-runtime/src/index.ts";

const config = EVM_NETWORK_CONFIGS.find((entry) => entry.network === "ethereum-sepolia");
assert.ok(config);
assert.equal(config.environment, "testnet");
assert.equal(config.chainId, "11155111");
const hyperliquidConfig = EVM_NETWORK_CONFIGS.find((entry) => entry.network === "hyperliquid-testnet");
assert.ok(hyperliquidConfig);
assert.equal(hyperliquidConfig.chainId, "998");
assert.equal(hyperliquidConfig.nativeAsset, "HYPE");
assert.ok(EVM_NETWORK_CONFIGS.every((entry) => entry.mainnetEnabled === false));
assert.equal(EVM_NETWORK_CONFIGS.filter((entry) => entry.environment === "mainnet").length, 6);
const testnetAdapterIds = EVM_NETWORK_CONFIGS
  .filter((entry) => entry.environment === "testnet")
  .map((entry) => getNetwork(entry.network).adapterId);
assert.equal(new Set(testnetAdapterIds).size, testnetAdapterIds.length, "testnet adapters must be uniquely identified");
assert.ok(EVM_NETWORK_CONFIGS
  .filter((entry) => entry.environment === "testnet")
  .every((entry) => getNetwork(entry.network).stage === "available"), "configured testnet adapters must be available");
assert.ok(EVM_NETWORK_CONFIGS
  .filter((entry) => entry.environment === "mainnet")
  .every((entry) => getNetwork(entry.network).stage === "planned"), "mainnet adapters must remain planned");

let mode = "ok";
const transport = {
  async health() {
    if (mode === "timeout") throw new Error("RPC request timed out");
    return { ok: true, chainId: "11155111", latencyMs: 4 };
  },
  async prepare(intent) {
    return { executionId: intent.context.requestId, intent, unsignedPayload: { to: "0xabc" }, requiredSigners: [], state: "prepared" };
  },
  async submit(execution) { return { executionId: execution.executionId, signatures: ["0xreceipt"] }; },
  async status(executionId) { return { executionId, state: "confirmed" }; },
  async receipt(executionId) {
    if (mode === "malformed-receipt") return { executionId, requestId: executionId, capability: "verification.record.create", network: "ethereum-sepolia", state: "confirmed", signatures: [], createdAt: new Date().toISOString() };
    return { executionId, requestId: executionId, capability: "verification.record.create", network: "ethereum-sepolia", chainId: "11155111", state: "confirmed", signatures: ["0xreceipt"], createdAt: new Date().toISOString(), environment: "testnet", asset: "ETH" };
  },
  async estimateFee(intent) { return { network: intent.context.network, atomicAmount: "21000", asset: "ETH" }; },
};

const adapter = new EvmNetworkAdapter({
  id: "evm-ethereum-sepolia-test",
  config,
  capabilities: ["verification.record.create"],
  transport,
});

const intent = {
  context: { requestId: "evm-foundation-1", idempotencyKey: "evm-foundation-1", product: "record-verification", capability: "verification.record.create", network: "ethereum-sepolia" },
  payload: {},
  accounts: [],
};
const prepared = await adapter.prepare(intent);
assert.equal(prepared.state, "prepared");
assert.equal((await adapter.submit(prepared, prepared.unsignedPayload)).signatures.length, 1);
assert.equal((await adapter.status(prepared.executionId)).state, "confirmed");
assert.equal((await adapter.receipt(prepared.executionId)).chainId, "11155111");
assert.equal((await adapter.estimateFee(intent)).asset, "ETH");
assert.equal((await adapter.health()).chainId, "11155111");

await assert.rejects(() => adapter.prepare({ ...intent, context: { ...intent.context, network: "base-sepolia" } }), (error) => error instanceof EvmAdapterError && error.code === "NETWORK_MISMATCH");
mode = "timeout";
await assert.rejects(() => adapter.health(), (error) => error instanceof EvmAdapterError && error.code === "RPC_TIMEOUT");
mode = "malformed-receipt";
await assert.rejects(() => adapter.receipt(prepared.executionId), (error) => error instanceof EvmAdapterError && error.code === "MALFORMED_RECEIPT");
assert.throws(() => new EvmNetworkAdapter({ id: "mainnet-disabled", config: EVM_NETWORK_CONFIGS.find((entry) => entry.network === "ethereum-mainnet"), capabilities: ["verification.record.create"], transport }), /Mainnet execution is disabled/);

const deployments = new DeploymentRegistry();
deployments.register({ product: "record-verification", network: "ethereum-sepolia", environment: "testnet", chainId: "11155111", explorerVerified: false, buildReference: "test", status: "testnet" });
assert.throws(() => deployments.register({ product: "record-verification", network: "ethereum-mainnet", environment: "mainnet", chainId: "1", explorerVerified: false, buildReference: "test", status: "mainnet_live" }), /explicit release gate/);
assert.throws(() => deployments.register({ product: "record-verification", network: "ethereum-sepolia", environment: "testnet", chainId: "11155111", explorerVerified: false, buildReference: "test", status: "testnet" }), /already registered/);

let submittedPayload;
const viemTransport = new ViemEvmTransport(
  {
    async getChainId() { return 11155111; },
    async waitForTransactionReceipt() { return { status: "success", blockNumber: 42n }; },
    async estimateContractGas() { return 50_000n; },
    async getGasPrice() { return 2n; },
  },
  {
    account: { address: "0x0000000000000000000000000000000000000002" },
    async writeContract(payload) { submittedPayload = payload; return "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; },
  },
  "ethereum-sepolia",
  "11155111",
  "testnet",
  "https://sepolia.etherscan.io/",
  "ETH",
);
const contractWriteIntent = {
  context: { requestId: "evm-payload-binding", idempotencyKey: "evm-payload-binding", product: "record-verification", capability: "verification.record.create", network: "ethereum-sepolia" },
  payload: {
    kind: "contract-write",
    address: "0x0000000000000000000000000000000000000001",
    abi: [{ type: "function", name: "anchorRecord", inputs: [] }],
    functionName: "anchorRecord",
    args: [7n],
    account: "0x0000000000000000000000000000000000000002",
    value: 0n,
  },
  accounts: [{ role: "payer", address: "0x0000000000000000000000000000000000000002", network: "ethereum-sepolia" }],
};
const contractWritePrepared = await viemTransport.prepare(contractWriteIntent);
await assert.rejects(
  () => viemTransport.prepare({ ...contractWriteIntent, idempotencyKey: "evm-payer-mismatch", payload: { ...contractWriteIntent.payload, account: "0x0000000000000000000000000000000000000003" } }),
  /payer account does not match/,
);
await assert.rejects(
  () => viemTransport.submit(contractWritePrepared, { ...contractWritePrepared.unsignedPayload, functionName: "drain" }),
  /does not match the prepared transaction intent/,
);
await viemTransport.submit(contractWritePrepared, contractWritePrepared.unsignedPayload);
assert.equal(submittedPayload.functionName, "anchorRecord");
assert.equal(submittedPayload.account.address, contractWriteIntent.payload.account);
const viemAdapter = new EvmNetworkAdapter({
  id: "evm-ethereum-sepolia-viem-test",
  config,
  capabilities: ["verification.record.create"],
  transport: viemTransport,
});
const viemAdapterPrepared = await viemAdapter.prepare(contractWriteIntent);
await viemAdapter.submit(viemAdapterPrepared, viemAdapterPrepared.unsignedPayload);
const viemAdapterReceipt = await viemAdapter.receipt(viemAdapterPrepared.executionId);
assert.equal(viemAdapterReceipt.provider, "evm-ethereum-sepolia-viem-test", "EVM adapter must bind transport receipts to its provider identity");

// Every configured testnet must pass the same lifecycle contract. This is a
// local adapter test only; it does not imply deployed contracts or on-chain
// evidence for any network.
for (const networkConfig of EVM_NETWORK_CONFIGS.filter((entry) => entry.environment === "testnet")) {
  const networkTransport = {
    async health() { return { ok: true, chainId: networkConfig.chainId, latencyMs: 1 }; },
    async prepare(networkIntent) {
      return { executionId: networkIntent.context.requestId, intent: networkIntent, unsignedPayload: { network: networkConfig.network }, requiredSigners: [], state: "prepared" };
    },
    async submit(execution) { return { executionId: execution.executionId, signatures: [`${networkConfig.network}-signature`] }; },
    async status(executionId) { return { executionId, state: "confirmed" }; },
    async receipt(executionId) {
      return { executionId, requestId: executionId, capability: "verification.record.create", network: networkConfig.network, chainId: networkConfig.chainId, state: "confirmed", signatures: [`${networkConfig.network}-signature`], createdAt: new Date().toISOString(), environment: networkConfig.environment, asset: networkConfig.nativeAsset };
    },
    async estimateFee(networkIntent) { return { network: networkIntent.context.network, atomicAmount: "21000", asset: networkConfig.nativeAsset }; },
  };
  const networkAdapter = new EvmNetworkAdapter({
    id: `evm-${networkConfig.network}-test`,
    config: networkConfig,
    capabilities: ["verification.record.create"],
    transport: networkTransport,
  });
  const networkIntent = {
    context: { requestId: `${networkConfig.network}-foundation`, idempotencyKey: `${networkConfig.network}-foundation`, product: "record-verification", capability: "verification.record.create", network: networkConfig.network },
    payload: {},
    accounts: [],
  };
  const networkPrepared = await networkAdapter.prepare(networkIntent);
  await networkAdapter.submit(networkPrepared, networkPrepared.unsignedPayload);
  assert.equal((await networkAdapter.status(networkPrepared.executionId)).state, "confirmed");
  assert.equal((await networkAdapter.receipt(networkPrepared.executionId)).chainId, networkConfig.chainId);
  assert.equal((await networkAdapter.health()).chainId, networkConfig.chainId);
}

console.log("[evm-foundation] config, lifecycle, wrong-chain, RPC timeout, receipt, deployment, and Mainnet gate checks passed");
