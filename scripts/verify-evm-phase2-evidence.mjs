import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { EVM_NETWORK_CONFIGS } from "../packages/privatedao-runtime/src/index.ts";

const network = process.env.PDAO_EVM_NETWORK?.trim();
assert.ok(network, "PDAO_EVM_NETWORK is required");
const config = EVM_NETWORK_CONFIGS.find((entry) => entry.network === network);
assert.ok(config, `unknown EVM network: ${network}`);
assert.equal(config.environment, "testnet");
const rpc = process.env[config.rpcUrlEnv];
assert.match(rpc || "", /^https:\/\//, `${config.rpcUrlEnv} must be an HTTPS URL`);
const source = `packages/evm-verification/deployments/phase-2-e2e-${network}.json`;
const artifact = JSON.parse(await readFile(source, "utf8"));
assert.equal(artifact.status, "testnet_verified");
assert.equal(artifact.scope?.length, 1);
const result = artifact.networks?.[0];
assert.equal(result?.network, network);
assert.equal(result?.chainId, Number(config.chainId));
assert.equal(result?.checks?.recordVerified, true);
assert.equal(result?.checks?.blindProofVerified, true);
assert.equal(result?.checks?.wrongChainRejected, true);
assert.equal(result?.checks?.alteredProofRejected, true);
assert.equal(result?.checks?.expiredRecordRejected, true);
assert.equal(result?.checks?.expiredBlindRejected, true);
assert.equal(result?.checks?.recordRevoked, true);
assert.equal(result?.checks?.blindProofRevoked, true);

async function rpcCall(method, params) {
  const response = await fetch(rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error(payload.error?.message || `RPC HTTP ${response.status}`);
  return payload.result;
}

assert.equal(Number.parseInt(await rpcCall("eth_chainId", []), 16), Number(config.chainId));
const receiptEntries = [
  ["record", result.record?.txHash],
  ["blind", result.blind?.txHash],
  ["recordRevocation", result.revocation?.recordTxHash],
  ["blindRevocation", result.revocation?.blindTxHash],
];
const receipts = [];
for (const [label, hash] of receiptEntries) {
  assert.match(hash || "", /^0x[0-9a-f]{64}$/i, `${label} hash is invalid`);
  const receipt = await rpcCall("eth_getTransactionReceipt", [hash]);
  assert.equal(receipt?.status, "0x1", `${label} transaction failed`);
  assert.ok(receipt.blockNumber, `${label} receipt is missing block number`);
  receipts.push({ label, hash, blockNumber: Number.parseInt(receipt.blockNumber, 16), status: "success" });
}
for (const [label, contract] of Object.entries(result.contracts || {})) {
  const bytecode = await rpcCall("eth_getCode", [contract.address, "latest"]);
  assert.ok(bytecode && bytecode !== "0x", `${label} contract has no deployed bytecode`);
}
console.log(JSON.stringify({ status: "PASS", network, chainId: Number(config.chainId), receiptCount: receipts.length, receipts, source }, null, 2));
