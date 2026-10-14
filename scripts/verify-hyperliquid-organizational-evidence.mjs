import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { decodeFunctionResult, encodeFunctionData, parseAbi } from "viem";

const artifactPath = "packages/evm-verification/deployments/organizational-hyperliquid-testnet.json";
const artifact = JSON.parse(await readFile(artifactPath, "utf8"));

assert.equal(artifact.network, "hyperliquid-testnet");
assert.equal(artifact.chainId, 998);
assert.equal(artifact.environment, "testnet");
assert.ok(
  artifact.contracts?.treasury?.address
    && artifact.contracts?.payroll?.address
    && artifact.contracts?.governance?.address
    && artifact.contracts?.auction?.address,
  "missing HyperEVM organizational contract addresses",
);
assert.equal(artifact.evidence?.treasury?.status, "executed");
assert.equal(artifact.evidence?.payroll?.status, "settled");
assert.equal(artifact.evidence?.governance?.status, "passed");
assert.equal(artifact.evidence?.auction?.status, "settled");

const rpc = process.env.PDAO_EVM_HYPERLIQUID_TESTNET_RPC_URL || "https://rpc.hyperliquid-testnet.xyz/evm";
const call = async (method, params) => {
  const response = await fetch(rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error.message || "RPC error");
  return payload.result;
};

assert.equal(Number.parseInt(await call("eth_chainId", []), 16), 998);

const transactionEntries = [
  ["treasury.checkerFundingHash", artifact.evidence.treasury.checkerFundingHash],
  ["treasury.treasuryFundingHash", artifact.evidence.treasury.treasuryFundingHash],
  ["treasury.requestedHash", artifact.evidence.treasury.requestedHash],
  ["treasury.approvedHash", artifact.evidence.treasury.approvedHash],
  ["treasury.executedHash", artifact.evidence.treasury.executedHash],
  ["payroll.payrollFundingHash", artifact.evidence.payroll.payrollFundingHash],
  ["payroll.payrollCreateHash", artifact.evidence.payroll.payrollCreateHash],
  ["payroll.payrollApproveHash", artifact.evidence.payroll.payrollApproveHash],
  ["payroll.payrollSettleHash", artifact.evidence.payroll.payrollSettleHash],
  ["governance.proposalHash", artifact.evidence.governance.proposalHash],
  ["governance.voteCommitHash", artifact.evidence.governance.voteCommitHash],
  ["governance.voteRevealHash", artifact.evidence.governance.voteRevealHash],
  ["governance.proposalFinalizeHash", artifact.evidence.governance.proposalFinalizeHash],
  ["auction.auctionCreateHash", artifact.evidence.auction.auctionCreateHash],
  ["auction.bidCommitHash", artifact.evidence.auction.bidCommitHash],
  ["auction.bidRevealHash", artifact.evidence.auction.bidRevealHash],
  ["auction.auctionFinalizeHash", artifact.evidence.auction.auctionFinalizeHash],
  ["auction.auctionSettleHash", artifact.evidence.auction.auctionSettleHash],
];
assert.equal(new Set(transactionEntries.map(([, hash]) => hash)).size, transactionEntries.length, "duplicate organizational transaction hash");

const receipts = [];
for (const [label, hash] of transactionEntries) {
  assert.match(hash, /^0x[0-9a-f]{64}$/i, `${label} hash is invalid`);
  const receipt = await call("eth_getTransactionReceipt", [hash]);
  assert.ok(receipt?.blockNumber, `${label} receipt is missing`);
  assert.equal(receipt.status, "0x1", `${label} transaction failed`);
  receipts.push({ label, hash, blockNumber: Number.parseInt(receipt.blockNumber, 16), status: "success" });
}

const contracts = [];
for (const [label, address] of Object.entries({
  treasury: artifact.contracts.treasury.address,
  payroll: artifact.contracts.payroll.address,
  governance: artifact.contracts.governance.address,
  auction: artifact.contracts.auction.address,
})) {
  const bytecode = await call("eth_getCode", [address, "latest"]);
  assert.ok(bytecode && bytecode !== "0x", `${label} contract has no deployed bytecode`);
  contracts.push({ label, address, deployed: true });
}

const payrollAbi = parseAbi([
  "function batches(bytes32) view returns (bytes32 batchCommitment, address recipient, uint256 netAmount, uint8 status, uint64 createdAt, uint64 approvedAt, uint64 settledAt)",
]);
const treasuryAbi = parseAbi([
  "function payments(bytes32) view returns (address recipient, uint256 amount, bytes32 budgetId, uint8 status, uint64 createdAt, uint64 approvedAt, uint64 executedAt)",
]);
const governanceAbi = parseAbi([
  "function proposals(bytes32) view returns (bytes32 actionHash, uint64 commitEnd, uint64 revealEnd, uint256 quorum, uint256 yesVotes, uint256 noVotes, uint256 revealedVotes, uint8 status)",
]);
const auctionAbi = parseAbi([
  "function auctions(bytes32) view returns (address seller, uint64 biddingEnd, uint64 revealEnd, uint256 highestBid, address highestBidder, uint8 status)",
  "function settleAuction(bytes32 auctionId)",
]);
const replayAbi = {
  payroll: parseAbi(["function settlePayroll(bytes32 batchId)"]),
  treasury: parseAbi(["function executePayment(bytes32 paymentId)"]),
  governance: parseAbi(["function finalizeProposal(bytes32 proposalId)"]),
};
const readCall = async (address, abi, functionName, args) => {
  const data = await call("eth_call", [{ to: address, data: encodeFunctionData({ abi, functionName, args }) }, "latest"]);
  return decodeFunctionResult({ abi, functionName, data });
};

const payrollState = await readCall(artifact.contracts.payroll.address, payrollAbi, "batches", [artifact.evidence.payroll.payrollBatchId]);
assert.equal(Number(payrollState[3]), 3, "Payroll readback did not return Settled");
const treasuryState = await readCall(artifact.contracts.treasury.address, treasuryAbi, "payments", [artifact.evidence.treasury.paymentId]);
assert.equal(Number(treasuryState[3]), 3, "Treasury readback did not return Executed");
const governanceState = await readCall(artifact.contracts.governance.address, governanceAbi, "proposals", [artifact.evidence.governance.proposalId]);
assert.equal(Number(governanceState[7]), 2, "Governance readback did not return Passed");
const auctionState = await readCall(artifact.contracts.auction.address, auctionAbi, "auctions", [artifact.evidence.auction.auctionId]);
assert.equal(Number(auctionState[5]), 3, "Auction readback did not return Settled");

const expectReplayRejected = async (address, abi, functionName, args) => {
  try {
    await call("eth_call", [{ from: artifact.deployer, to: address, data: encodeFunctionData({ abi, functionName, args }) }, "latest"]);
  } catch {
    return true;
  }
  return false;
};
const replayProtection = {
  treasury: await expectReplayRejected(
    artifact.contracts.treasury.address,
    replayAbi.treasury,
    "executePayment",
    [artifact.evidence.treasury.paymentId],
  ),
  payroll: await expectReplayRejected(
    artifact.contracts.payroll.address,
    replayAbi.payroll,
    "settlePayroll",
    [artifact.evidence.payroll.payrollBatchId],
  ),
  governance: await expectReplayRejected(
    artifact.contracts.governance.address,
    replayAbi.governance,
    "finalizeProposal",
    [artifact.evidence.governance.proposalId],
  ),
  auction: await expectReplayRejected(
    artifact.contracts.auction.address,
    auctionAbi,
    "settleAuction",
    [artifact.evidence.auction.auctionId],
  ),
};
assert.deepEqual(replayProtection, { treasury: true, payroll: true, governance: true, auction: true }, "organizational replay protection failed");

console.log(JSON.stringify({
  status: "PASS",
  network: "hyperliquid-testnet",
  chainId: 998,
  productCount: 6,
  receiptCount: receipts.length,
  receipts,
  contracts,
  recoveryReadback: { treasury: "PASS", payroll: "PASS", governance: "PASS", auction: "PASS" },
  replayProtection: { treasury: "PASS", payroll: "PASS", governance: "PASS", auction: "PASS" },
  source: artifactPath,
}, null, 2));
