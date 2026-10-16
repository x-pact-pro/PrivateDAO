import assert from "node:assert/strict";
import fs from "node:fs";
import { createPublicClient, defineChain, http } from "viem";

const artifactPath = "packages/evm-verification/deployments/organizational-hyperliquid-testnet.json";
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
assert.equal(artifact.network, "hyperliquid-testnet");
assert.equal(artifact.chainId, 998);

const rpc = process.env.PDAO_EVM_HYPERLIQUID_TESTNET_RPC_URL || "https://rpc.hyperliquid-testnet.xyz/evm";
const chain = defineChain({
  id: 998,
  name: "Hyperliquid Testnet",
  nativeCurrency: { name: "HYPE", symbol: "HYPE", decimals: 18 },
  rpcUrls: { default: { http: [rpc] } },
});
const client = createPublicClient({ chain, transport: http(rpc, { timeout: 30_000 }) });
assert.equal(await client.getChainId(), 998);

const txHashes = Object.values(artifact.evidence)
  .flatMap((section) => Object.entries(section))
  .filter(([key, value]) => key.toLowerCase().endsWith("hash") && typeof value === "string" && /^0x[0-9a-f]{64}$/i.test(value))
  .map(([, value]) => value);
assert.ok(txHashes.length > 0, "organizational artifact must contain transaction hashes");

const receipts = [];
for (const hash of txHashes) {
  const receipt = await client.getTransactionReceipt({ hash });
  assert.equal(receipt.status, "success", `receipt failed for ${hash}`);
  receipts.push({ hash, blockNumber: receipt.blockNumber.toString(), status: receipt.status });
}

assert.equal(artifact.evidence.treasury.status, "executed");
assert.equal(artifact.evidence.governance.status, "passed");
assert.equal(artifact.evidence.auction.status, "settled");
console.log(JSON.stringify({
  status: "PASS",
  network: artifact.network,
  chainId: artifact.chainId,
  receiptCount: receipts.length,
  statuses: {
    treasury: artifact.evidence.treasury.status,
    governance: artifact.evidence.governance.status,
    auction: artifact.evidence.auction.status,
  },
  receipts,
  source: artifactPath,
}, null, 2));
