import assert from "node:assert/strict";
import fs from "node:fs";
import { EVM_NETWORK_CONFIGS } from "../packages/privatedao-runtime/src/index.ts";
import { createPublicClient, defineChain, http } from "viem";

const network = process.env.PDAO_EVM_NETWORK?.trim() || "hyperliquid-testnet";
const config = EVM_NETWORK_CONFIGS.find((entry) => entry.network === network);
assert.ok(config, `unknown EVM network: ${network}`);
assert.equal(config.environment, "testnet");
const rpc = process.env[config.rpcUrlEnv];
if (!rpc || !/^https:\/\//.test(rpc)) throw new Error(`${config.rpcUrlEnv} must be an HTTPS Testnet RPC URL.`);
const source = `packages/evm-verification/deployments/kernel-organizational-${network}.json`;
const artifact = JSON.parse(fs.readFileSync(source, "utf8"));
assert.equal(artifact.schema, "privatedao.kernel-organizational-e2e.v1");
assert.equal(artifact.network, network);
assert.equal(artifact.chainId, Number(config.chainId));
assert.equal(artifact.gateway, "ProductExecutionGateway");
assert.equal(artifact.results.length, 3);

const chain = defineChain({
  id: Number(config.chainId),
  name: config.label,
  nativeCurrency: { name: config.nativeAsset, symbol: config.nativeAsset, decimals: network === "tempo-testnet" ? 6 : 18 },
  rpcUrls: { default: { http: [rpc] } },
});
const client = createPublicClient({ chain, transport: http(rpc, { timeout: 30_000 }) });
assert.equal(await client.getChainId(), Number(config.chainId));

const receipts = [];
for (const result of artifact.results) {
  assert.ok(result.executionId.startsWith("evm-"));
  const receipt = await client.getTransactionReceipt({ hash: result.txHash });
  assert.equal(receipt.status, "success");
  assert.equal(receipt.blockNumber.toString(), result.blockNumber);
  receipts.push({ product: result.product, capability: result.capability, txHash: result.txHash, blockNumber: result.blockNumber, status: receipt.status });
}
console.log(JSON.stringify({ status: "PASS", network, chainId: Number(config.chainId), gateway: artifact.gateway, receipts, source }, null, 2));
