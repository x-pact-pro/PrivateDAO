import assert from "node:assert/strict";
import { encodeFunctionData, parseAbi } from "viem";
import { ViemEvmTransport } from "../packages/privatedao-runtime/src/evm-viem-transport.ts";
import { WalletExecutionGateway, WalletSecurityGuard } from "../packages/privatedao-runtime/src/index.ts";

const contract = "0xa0cbe18d8b8b54befda83f33288347466f2c88b9";
const account = "0x4e66007bc1df90de96b74a80eca7d461b07ec405";
const abi = parseAbi(["function anchorRecord(bytes32,bytes32,bytes32,bytes32,uint256,uint64)"]);
const args = ["0x" + "11".repeat(32), "0x" + "22".repeat(32), "0x" + "33".repeat(32), "0x" + "44".repeat(32), 84532n, 4_000_000_000n];
const selector = encodeFunctionData({ abi, functionName: "anchorRecord", args }).slice(0, 10);
const submittedPayloads = [];
const txHash = "0x" + "cd".repeat(32);

const publicClient = {
  async getChainId() { return 84532; },
  async estimateContractGas() { return 100_000n; },
  async getGasPrice() { return 1n; },
  async waitForTransactionReceipt() { return { status: "success", blockNumber: 43n }; },
};
const walletClient = {
  async writeContract(input) { submittedPayloads.push(input); return txHash; },
};
const transport = new ViemEvmTransport(
  publicClient,
  walletClient,
  "base-sepolia",
  "84532",
  "testnet",
  "https://sepolia.basescan.org",
  "ETH",
  account,
  { requireAllowlist: true, allowedContracts: [contract], allowedFunctions: ["anchorRecord"], allowedFunctionSelectors: [selector] },
);
const gatewayProvider = {
  async prepare(intent) { return transport.prepare(intent); },
  async submit(execution, payload) { return transport.submit(execution, payload); },
  status(execution) { return transport.status(execution.executionId); },
  receipt(execution) { return transport.receipt(execution.executionId); },
};
const receipts = [];
const walletGateway = new WalletExecutionGateway(
  gatewayProvider,
  new WalletSecurityGuard(() => "2026-10-20T00:00:00.000Z"),
  undefined,
  { async recordReceipt(receipt) { receipts.push(receipt); } },
);

const baseContext = {
  product: "pdao-wallet",
  capability: "verification.record.create",
  organizationId: "org_e2e",
  network: "base-sepolia",
};
const basePolicy = {
  allowedActions: ["sign", "pay"],
  allowedNetworks: ["base-sepolia"],
  allowedAssets: ["ETH"],
  allowedDestinations: [contract],
  perActionLimitAtomic: 100n,
  dailyLimitAtomic: 100n,
  requireApprovalAboveAtomic: 10n,
  autonomousEnabled: false,
  signerBoundary: "external",
  recoveryWindowSeconds: 60,
};
const intentFor = (requestId, idempotencyKey) => ({
  context: { ...baseContext, requestId, idempotencyKey },
  payload: { kind: "contract-write", address: contract, abi, functionName: "anchorRecord", args, account },
  accounts: [{ role: "payer", address: account, network: "base-sepolia" }],
});

const maker = { tenantId: "tenant_e2e", organizationId: "org_e2e", subjectId: "maker_e2e", roles: ["maker"], issuer: "test", authenticatedAt: "2026-10-20T00:00:00.000Z" };
const approver = { ...maker, subjectId: "approver_e2e", roles: ["approver"] };
const b2bRequest = { requestId: "b2b-e2e", idempotencyKey: "b2b-e2e", tenantId: "tenant_e2e", organizationId: "org_e2e", subjectId: "maker_e2e", mode: "b2b", action: "pay", network: "base-sepolia", asset: "ETH", amountAtomic: 20n, destination: contract, createdAt: "2026-10-20T00:00:00.000Z" };
const b2bPolicy = { ...basePolicy, mode: "b2b" };
await assert.rejects(
  () => walletGateway.prepare(intentFor(b2bRequest.requestId, b2bRequest.idempotencyKey), "maker", { principal: maker, policy: b2bPolicy, request: b2bRequest }),
  /approval is required/,
);
const b2bApprovedRequest = { ...b2bRequest, approvalConfirmed: true, actorSubjectId: approver.subjectId };
const b2bPrepared = await walletGateway.prepare(intentFor("b2b-e2e-approved", "b2b-e2e-approved"), "maker", {
  principal: approver,
  policy: b2bPolicy,
  request: { ...b2bApprovedRequest, requestId: "b2b-e2e-approved", idempotencyKey: "b2b-e2e-approved" },
});
await walletGateway.submit(b2bPrepared, b2bPrepared.unsignedPayload, "maker");
const b2bReceipt = await walletGateway.receipt(b2bPrepared, "maker");
assert.equal(b2bReceipt.state, "confirmed");

const consumer = { ...maker, subjectId: "consumer_e2e", roles: ["consumer"] };
const b2cRequest = { requestId: "b2c-e2e", idempotencyKey: "b2c-e2e", tenantId: "tenant_e2e", organizationId: "org_e2e", subjectId: "consumer_e2e", mode: "b2c", action: "pay", network: "base-sepolia", asset: "ETH", amountAtomic: 5n, destination: contract, createdAt: "2026-10-20T00:00:00.000Z" };
const b2cPrepared = await walletGateway.prepare(intentFor(b2cRequest.requestId, b2cRequest.idempotencyKey), "maker", {
  principal: consumer,
  policy: { ...basePolicy, mode: "b2c" },
  request: b2cRequest,
});
await walletGateway.submit(b2cPrepared, b2cPrepared.unsignedPayload, "maker");
const b2cReceipt = await walletGateway.receipt(b2cPrepared, "maker");
assert.equal(b2cReceipt.state, "confirmed");
assert.equal(submittedPayloads.length, 2);
assert.deepEqual(submittedPayloads.map((payload) => [payload.address, payload.functionName]), [[contract, "anchorRecord"], [contract, "anchorRecord"]]);
assert.equal(receipts.filter((receipt) => receipt.state === "confirmed").length, 2);
console.log("B2B_B2C_WALLET_GATEWAY_E2E: PASS approval-separation=PASS consumer-policy=PASS server-signing=PASS receipts=PASS");
