import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const artifactPath = "packages/evm-verification/deployments/phase-2-e2e-hyperliquid-testnet.json";
const artifact = JSON.parse(await readFile(artifactPath, "utf8"));
const network = artifact.networks?.[0];
assert.equal(artifact.status, "testnet_verified");
assert.equal(network?.network, "hyperliquid-testnet");
assert.equal(network?.chainId, 998);
assert.equal(network?.record?.status, "success");
assert.equal(network?.blind?.status, "success");
assert.equal(network?.checks?.recordVerified, true);
assert.equal(network?.checks?.blindProofVerified, true);
assert.equal(network?.checks?.recordRevoked, true);
assert.equal(network?.checks?.blindProofRevoked, true);

const rpc = process.env.PDAO_EVM_HYPERLIQUID_TESTNET_RPC_URL || "https://rpc.hyperliquid-testnet.xyz/evm";
const call = async (method, params) => {
  const response = await fetch(rpc, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error.message || "RPC error");
  return payload.result;
};
assert.equal(Number.parseInt(await call("eth_chainId", []), 16), 998);
const txs = [
  ["record", network.record.txHash],
  ["blind", network.blind.txHash],
  ["recordRevocation", network.revocation.recordTxHash],
  ["blindRevocation", network.revocation.blindTxHash],
];
const receipts = [];
for (const [label, hash] of txs) {
  assert.match(hash, /^0x[0-9a-f]{64}$/i, `${label} hash is invalid`);
  const receipt = await call("eth_getTransactionReceipt", [hash]);
  assert.ok(receipt?.blockNumber, `${label} receipt is missing`);
  assert.equal(receipt.status, "0x1", `${label} transaction failed`);
  receipts.push({ label, hash, blockNumber: Number.parseInt(receipt.blockNumber, 16), status: "success" });
}
for (const [label, contract] of Object.entries(network.contracts)) {
  const bytecode = await call("eth_getCode", [contract.address, "latest"]);
  assert.ok(bytecode && bytecode !== "0x", `${label} contract has no deployed bytecode`);
}
console.log(JSON.stringify({ status: "PASS", network: "hyperliquid-testnet", chainId: 998, receiptCount: receipts.length, receipts, source: artifactPath }, null, 2));
