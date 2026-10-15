import assert from "node:assert/strict";
import fs from "node:fs";
import { createPublicClient, defineChain, http } from "viem";

const source = "packages/evm-verification/deployments/kernel-organizational-hyperliquid-testnet.json";
const artifact = JSON.parse(fs.readFileSync(source, "utf8"));
assert.equal(artifact.schema, "privatedao.kernel-organizational-e2e.v1");
assert.equal(artifact.network, "hyperliquid-testnet");
assert.equal(artifact.chainId, 998);
assert.equal(artifact.gateway, "ProductExecutionGateway");
assert.equal(artifact.results.length, 3);

const rpc = process.env.PDAO_EVM_HYPERLIQUID_TESTNET_RPC_URL || "https://rpc.hyperliquid-testnet.xyz/evm";
const chain = defineChain({
  id: 998,
  name: "Hyperliquid Testnet",
  nativeCurrency: { name: "HYPE", symbol: "HYPE", decimals: 18 },
  rpcUrls: { default: { http: [rpc] } },
});
const client = createPublicClient({ chain, transport: http(rpc, { timeout: 30_000 }) });
assert.equal(await client.getChainId(), 998);

const receipts = [];
for (const result of artifact.results) {
  assert.ok(result.executionId.startsWith("evm-"));
  const receipt = await client.getTransactionReceipt({ hash: result.txHash });
  assert.equal(receipt.status, "success");
  assert.equal(receipt.blockNumber.toString(), result.blockNumber);
  receipts.push({ product: result.product, capability: result.capability, txHash: result.txHash, blockNumber: result.blockNumber, status: receipt.status });
}
console.log(JSON.stringify({ status: "PASS", network: artifact.network, chainId: artifact.chainId, gateway: artifact.gateway, receipts, source }, null, 2));
