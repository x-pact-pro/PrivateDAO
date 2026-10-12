import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { decodeFunctionResult, encodeFunctionData, parseAbi } from "viem";

const artifactPath = "packages/evm-verification/deployments/organizational-bnb-testnet.json";
const artifact = JSON.parse(await readFile(artifactPath, "utf8"));
assert.equal(artifact.network, "bnb-testnet");
assert.equal(artifact.chainId, 97);
assert.equal(artifact.environment, "testnet");
assert.ok(artifact.contracts?.treasury?.address && artifact.contracts?.payroll?.address && artifact.contracts?.governance?.address && artifact.contracts?.auction?.address, "missing organizational contract addresses");
assert.equal(artifact.evidence?.treasury?.status, "executed");
assert.equal(artifact.evidence?.payroll?.status, "settled");
assert.equal(artifact.evidence?.governance?.status, "passed");
assert.equal(artifact.evidence?.auction?.status, "settled");

const rpc = process.env.PDAO_EVM_BNB_TESTNET_RPC_URL || "https://bsc-testnet-dataseed.bnbchain.org";
const call = async (method, params) => {
  const response = await fetch(rpc, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error.message || "RPC error");
  return payload.result;
};
const observedChainId = Number.parseInt(await call("eth_chainId", []), 16);
assert.equal(observedChainId, 97);

const transactions = [
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
assert.equal(new Set(transactions.map(([, hash]) => hash)).size, transactions.length, "duplicate organizational transaction hash");
const receipts = [];
for (const [label, hash] of transactions) {
  const receipt = await call("eth_getTransactionReceipt", [hash]);
  assert.ok(receipt?.blockNumber, `${label} receipt is missing`);
  assert.equal(receipt.status, "0x1", `${label} transaction failed`);
  receipts.push({ label, hash, blockNumber: Number.parseInt(receipt.blockNumber, 16), status: "success" });
}
const contracts = [];
for (const [label, address] of Object.entries({ treasury: artifact.contracts.treasury.address, payroll: artifact.contracts.payroll.address, governance: artifact.contracts.governance.address, auction: artifact.contracts.auction.address })) {
  const bytecode = await call("eth_getCode", [address, "latest"]);
  assert.ok(bytecode && bytecode !== "0x", `${label} contract has no deployed bytecode`);
  contracts.push({ label, address, deployed: true });
}
const payrollAbi = parseAbi([
  "function batches(bytes32) view returns (bytes32 batchCommitment, address recipient, uint256 netAmount, uint8 status, uint64 createdAt, uint64 approvedAt, uint64 settledAt)",
  "function settlePayroll(bytes32 batchId)",
]);
const treasuryAbi = parseAbi([
  "function payments(bytes32) view returns (address recipient, uint256 amount, bytes32 budgetId, uint8 status, uint64 createdAt, uint64 approvedAt, uint64 executedAt)",
  "function executePayment(bytes32 paymentId)",
]);
const governanceAbi = parseAbi([
  "function proposals(bytes32) view returns (bytes32 actionHash, uint64 commitEnd, uint64 revealEnd, uint256 quorum, uint256 yesVotes, uint256 noVotes, uint256 revealedVotes, uint8 status)",
  "function finalizeProposal(bytes32 proposalId)",
]);
const auctionAbi = parseAbi([
  "function auctions(bytes32) view returns (address seller, uint64 biddingEnd, uint64 revealEnd, uint256 highestBid, address highestBidder, uint8 status)",
  "function settleAuction(bytes32 auctionId)",
]);
const readCall = async (address, abi, functionName, args) => {
  const data = await call("eth_call", [{ to: address, data: encodeFunctionData({ abi, functionName, args }) }, "latest"]);
  return decodeFunctionResult({ abi, functionName, data });
};
const expectReplayRejected = async (address, abi, functionName, args) => {
  try {
    await call("eth_call", [{ from: artifact.deployer, to: address, data: encodeFunctionData({ abi, functionName, args }) }, "latest"]);
  } catch {
    return true;
  }
  return false;
};
const payrollAddress = artifact.contracts.payroll.address;
const payrollBatchId = artifact.evidence.payroll.payrollBatchId;
const payrollState = await readCall(payrollAddress, payrollAbi, "batches", [payrollBatchId]);
assert.equal(Number(payrollState[3]), 3, "Payroll recovery readback did not return Settled");
const treasuryPaymentId = artifact.evidence.treasury.paymentId;
const treasuryState = await readCall(artifact.contracts.treasury.address, treasuryAbi, "payments", [treasuryPaymentId]);
assert.equal(Number(treasuryState[3]), 3, "Treasury recovery readback did not return Executed");
const governanceProposalId = artifact.evidence.governance.proposalId;
const governanceState = await readCall(artifact.contracts.governance.address, governanceAbi, "proposals", [governanceProposalId]);
assert.equal(Number(governanceState[7]), 2, "Governance recovery readback did not return Passed");
const auctionId = artifact.evidence.auction.auctionId;
const auctionState = await readCall(artifact.contracts.auction.address, auctionAbi, "auctions", [auctionId]);
assert.equal(Number(auctionState[5]), 3, "Auction recovery readback did not return Settled");
const replayProtection = {
  treasury: await expectReplayRejected(artifact.contracts.treasury.address, treasuryAbi, "executePayment", [treasuryPaymentId]),
  payroll: await expectReplayRejected(payrollAddress, payrollAbi, "settlePayroll", [payrollBatchId]),
  governance: await expectReplayRejected(artifact.contracts.governance.address, governanceAbi, "finalizeProposal", [governanceProposalId]),
  auction: await expectReplayRejected(artifact.contracts.auction.address, auctionAbi, "settleAuction", [auctionId]),
};
assert.deepEqual(replayProtection, { treasury: true, payroll: true, governance: true, auction: true }, "an organizational replay was not rejected");
console.log(JSON.stringify({ status: "PASS", network: "bnb-testnet", chainId: 97, receiptCount: receipts.length, receipts, contracts, recoveryReadback: { treasury: "PASS", payroll: "PASS", governance: "PASS", auction: "PASS" }, replayProtection: { treasury: "PASS", payroll: "PASS", governance: "PASS", auction: "PASS" }, source: artifactPath }, null, 2));
