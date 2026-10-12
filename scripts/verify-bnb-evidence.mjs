import { readFile } from "node:fs/promises";

const artifactPath = "packages/evm-verification/deployments/phase-2-e2e-bnb-testnet.json";
const rpcUrl = process.env.PDAO_EVM_BNB_TESTNET_RPC_URL || "https://bsc-testnet-dataseed.bnbchain.org";
const artifact = JSON.parse(await readFile(artifactPath, "utf8"));

if (artifact.status !== "testnet_verified") throw new Error("BNB evidence is not marked testnet_verified.");
const network = artifact.networks?.[0];
if (!network || network.network !== "bnb-testnet" || network.chainId !== 97) throw new Error("BNB evidence has an invalid network boundary.");

async function rpc(method, params) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = await response.json();
  if (!response.ok || body.error) throw new Error(body.error?.message || `HTTP ${response.status}`);
  return body.result;
}

const chainId = Number.parseInt(await rpc("eth_chainId", []), 16);
if (chainId !== 97) throw new Error(`BNB RPC chain mismatch: ${chainId}`);

const hashes = [network.record?.txHash, network.blind?.txHash, network.revocation?.recordTxHash, network.revocation?.blindTxHash].filter(Boolean);
const receipts = [];
for (const hash of hashes) {
  const receipt = await rpc("eth_getTransactionReceipt", [hash]);
  if (!receipt || receipt.status !== "0x1" || !receipt.blockNumber) throw new Error(`BNB receipt failed: ${hash}`);
  receipts.push({ hash, blockNumber: Number.parseInt(receipt.blockNumber, 16), status: "success" });
}

console.log(JSON.stringify({ status: "PASS", network: "bnb-testnet", chainId, receiptCount: receipts.length, receipts, source: artifactPath }, null, 2));
