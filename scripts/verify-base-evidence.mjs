import { readFile } from "node:fs/promises";

const rpc = "https://sepolia.base.org";
const verification = JSON.parse(await readFile("packages/evm-verification/deployments/phase-2-e2e-base-sepolia.json", "utf8"));
const organizational = JSON.parse(await readFile("packages/evm-verification/deployments/organizational-base-sepolia.json", "utf8"));
const expectedChainId = 84532;

async function call(method, params) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(rpc, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
      const body = await response.json();
      if (!response.ok || body.error) throw new Error(body.error?.message || `RPC ${response.status}`);
      return body.result;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw lastError;
}

const observedChainId = Number.parseInt(await call("eth_chainId", []), 16);
if (observedChainId !== expectedChainId) throw new Error(`Base chain mismatch: ${observedChainId}`);

const source = verification.networks[0];
const transactions = [
  ["Record Verification", source.record.txHash, source.record.blockNumber],
  ["Blind Verification", source.blind.txHash, source.blind.blockNumber],
  ["Private Treasury", organizational.evidence.treasury.executedHash],
  ["Private Governance", organizational.evidence.governance.proposalFinalizeHash],
  ["Confidential Auctions", organizational.evidence.auction.auctionSettleHash],
];
const results = [];
for (const [product, txHash, expectedBlock] of transactions) {
  const receipt = await call("eth_getTransactionReceipt", [txHash]);
  results.push({ product, txHash, status: receipt?.status === "0x1" ? "success" : receipt?.status || "missing", blockNumber: receipt?.blockNumber ? Number.parseInt(receipt.blockNumber, 16) : null, expectedBlock: expectedBlock ? Number(expectedBlock) : null, builderCodeAttribution: "not asserted for historical transaction" });
}
const failed = results.filter((entry) => entry.status !== "success");
console.log(JSON.stringify({ schema: "privatedao.base-evidence-verification.v1", readOnly: true, network: "base-sepolia", chainId: observedChainId, rpcHost: new URL(rpc).host, results }, null, 2));
if (failed.length) process.exit(1);
