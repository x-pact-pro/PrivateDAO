import assert from "node:assert/strict";
import {
  SOLANA_NETWORK_CONFIGS,
  SolanaAdapterError,
  SolanaNetworkAdapter,
} from "../packages/privatedao-runtime/src/index.ts";

const config = SOLANA_NETWORK_CONFIGS.find((entry) => entry.network === "solana-devnet");
assert.ok(config);
assert.equal(config.environment, "devnet");
assert.equal(config.cluster, "devnet");
assert.equal(config.broadcastEnabled, false);
assert.throws(
  () => new SolanaNetworkAdapter({
    id: "solana-mainnet-disabled",
    config: SOLANA_NETWORK_CONFIGS.find((entry) => entry.network === "solana-mainnet-beta"),
    capabilities: ["governance.proposal.execute"],
    transport: {},
  }),
  (error) => error instanceof SolanaAdapterError && error.code === "NETWORK_MISMATCH",
);

const intent = {
  context: {
    requestId: "solana-kernel-foundation",
    idempotencyKey: "solana-kernel-foundation",
    product: "governance",
    capability: "governance.proposal.execute",
    network: "solana-devnet",
  },
  payload: { kind: "proposal-execution-intent" },
  accounts: [{ role: "authority", address: "authority-devnet", network: "solana-devnet" }],
};

const mode = { health: "ok", receipt: "ok" };
const transport = {
  async health() {
    if (mode.health === "timeout") throw new Error("RPC request timed out");
    return { ok: true, network: "solana-devnet", cluster: "devnet", latencyMs: 2 };
  },
  async prepare(value) {
    return { executionId: value.context.requestId, intent: value, unsignedPayload: { kind: "unsigned-solana-proposal" }, requiredSigners: value.accounts, state: "awaiting_signature" };
  },
  async submit(execution) { return { executionId: execution.executionId, signatures: ["solana-devnet-signature"] }; },
  async status(executionId) { return { executionId, state: "confirmed" }; },
  async receipt(executionId) {
    if (mode.receipt === "malformed") return { executionId, requestId: executionId, capability: intent.context.capability, network: "solana-devnet", state: "confirmed", signatures: [], createdAt: new Date().toISOString(), environment: "devnet", asset: "SOL" };
    return { executionId, requestId: intent.context.requestId, capability: intent.context.capability, network: "solana-devnet", state: "confirmed", signatures: ["solana-devnet-signature"], createdAt: new Date().toISOString(), environment: "devnet", asset: "SOL", metadata: { cluster: "devnet" } };
  },
  async estimateFee(value) { return { network: value.context.network, atomicAmount: "5000", asset: "SOL" }; },
};

const adapter = new SolanaNetworkAdapter({
  id: "solana-devnet-kernel",
  config,
  capabilities: ["governance.proposal.execute"],
  transport,
});

const prepared = await adapter.prepare(intent);
assert.equal(prepared.state, "awaiting_signature");
assert.equal(prepared.unsignedPayload.kind, "unsigned-solana-proposal");
await assert.rejects(
  () => adapter.submit(prepared, prepared.unsignedPayload),
  (error) => error instanceof SolanaAdapterError && error.code === "BROADCAST_DISABLED",
);
assert.equal((await adapter.status(prepared.executionId)).state, "confirmed");
assert.equal((await adapter.estimateFee(intent)).asset, "SOL");
assert.equal(adapter.explorerUrl("solana-devnet-signature"), "https://explorer.solana.com/tx/solana-devnet-signature?cluster=devnet");
assert.equal((await adapter.receipt(prepared.executionId)).environment, "devnet");

mode.health = "timeout";
await assert.rejects(() => adapter.prepare(intent), (error) => error instanceof SolanaAdapterError && error.code === "RPC_TIMEOUT");
mode.health = "ok";
mode.receipt = "malformed";
await assert.rejects(() => adapter.receipt(prepared.executionId), (error) => error instanceof SolanaAdapterError && error.code === "MALFORMED_RECEIPT");
await assert.rejects(
  () => adapter.prepare({ ...intent, context: { ...intent.context, network: "base-sepolia" } }),
  (error) => error instanceof SolanaAdapterError && error.code === "NETWORK_MISMATCH",
);

console.log("[solana-kernel] PASS devnet boundary, mainnet gate, health timeout, receipt validation, explorer URL, and broadcast guard");
