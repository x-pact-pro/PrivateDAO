import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createPublicClient, defineChain, http } from "viem";

const evidencePath = new URL("../packages/evm-verification/deployments/organizational-robinhood-testnet.json", import.meta.url);
const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
const chain = defineChain({
  id: 46630,
  name: "robinhood-testnet",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.chain.robinhood.com"] } },
});
const client = createPublicClient({ chain, transport: http(chain.rpcUrls.default.http[0], { timeout: 20_000 }) });

assert.equal(evidence.network, "robinhood-testnet");
assert.equal(evidence.chainId, 46630);
assert.equal(await client.getChainId(), 46630);

const contractEntries = Object.values(evidence.contracts);
assert.equal(contractEntries.length, 3);
for (const contract of contractEntries) {
  const code = await client.getBytecode({ address: contract.address });
  assert.ok(code && code !== "0x", `missing bytecode at ${contract.address}`);
}

const transactionHashes = [];
for (const contract of contractEntries) transactionHashes.push(contract.hash);
for (const section of Object.values(evidence.evidence)) {
  for (const [key, value] of Object.entries(section)) {
    if (key.endsWith("Hash") && typeof value === "string" && /^0x[0-9a-f]{64}$/i.test(value)) transactionHashes.push(value);
  }
}
const uniqueHashes = [...new Set(transactionHashes)];
assert.equal(uniqueHashes.length, 17, "Robinhood artifact must contain 17 transaction hashes");

const receipts = [];
for (const hash of uniqueHashes) {
  const receipt = await client.getTransactionReceipt({ hash });
  assert.equal(receipt.status, "success", `Robinhood transaction reverted: ${hash}`);
  receipts.push({ hash, blockNumber: receipt.blockNumber.toString() });
}

console.log(JSON.stringify({
  schema: "privatedao.robinhood-organizational-evidence.v1",
  readOnly: true,
  network: evidence.network,
  chainId: evidence.chainId,
  contracts: contractEntries.length,
  successfulTransactions: receipts.length,
  receipts,
  status: "verified",
}, null, 2));
