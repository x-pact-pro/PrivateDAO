import assert from "node:assert/strict";
import { encodeFunctionData, parseAbi } from "viem";
import { ViemEvmTransport } from "../packages/privatedao-runtime/src/evm-viem-transport.ts";
import { WalletExecutionGateway, WalletSecurityGuard } from "../packages/privatedao-runtime/src/index.ts";

const contract = "0xa0cbe18d8b8b54befda83f33288347466f2c88b9";
const account = "0x4e66007bc1df90de96b74a80eca7d461b07ec405";
const abi = parseAbi(["function anchorRecord(bytes32,bytes32,bytes32,bytes32,uint256,uint64)"]);
const args = ["0x" + "01".repeat(32), "0x" + "02".repeat(32), "0x" + "03".repeat(32), "0x" + "04".repeat(32), 84532n, 4_000_000_000n];
const selector = encodeFunctionData({ abi, functionName: "anchorRecord", args }).slice(0, 10);
const txHash = "0x" + "ab".repeat(32);
const submittedPayloads = [];

const publicClient = {
  async getChainId() { return 84532; },
  async estimateContractGas() { return 100_000n; },
  async getGasPrice() { return 1n; },
  async waitForTransactionReceipt() { return { status: "success", blockNumber: 42n }; },
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
const gateway = new WalletExecutionGateway(gatewayProvider, new WalletSecurityGuard(() => "2026-10-20T00:00:00.000Z"), undefined, {
  async recordReceipt(receipt) { receipts.push(receipt); },
});
const principal = { tenantId: "tenant_e2e", organizationId: "org_e2e", subjectId: "agent_e2e", roles: ["agent"], issuer: "test-issuer", authenticatedAt: "2026-10-20T00:00:00.000Z" };
const request = {
  requestId: "autonomous-e2e-request",
  idempotencyKey: "autonomous-e2e-idempotency",
  tenantId: principal.tenantId,
  organizationId: principal.organizationId,
  subjectId: principal.subjectId,
  mode: "autonomous",
  action: "sign",
  network: "base-sepolia",
  asset: "ETH",
  amountAtomic: 1n,
  destination: contract,
  createdAt: "2026-10-20T00:00:00.000Z",
};
const policy = {
  mode: "autonomous",
  allowedActions: ["sign"],
  allowedNetworks: ["base-sepolia"],
  allowedAssets: ["ETH"],
  allowedDestinations: [contract],
  perActionLimitAtomic: 10n,
  dailyLimitAtomic: 10n,
  requireApprovalAboveAtomic: 10n,
  autonomousEnabled: true,
  signerBoundary: "managed",
  recoveryWindowSeconds: 60,
};
const intent = {
  context: { requestId: request.requestId, idempotencyKey: request.idempotencyKey, product: "pdao-wallet", capability: "verification.record.create", organizationId: principal.organizationId, network: request.network },
  payload: { kind: "contract-write", address: contract, abi, functionName: "anchorRecord", args, account },
  accounts: [{ role: "payer", address: account, network: request.network }],
};
const prepared = await gateway.prepare(intent, "maker", { principal, policy, request });
const attackerPayload = { ...prepared.unsignedPayload, address: "0x1111111111111111111111111111111111111111", functionName: "drain", abi: [], args: [] };
await gateway.submit(prepared, attackerPayload, "maker");
assert.equal(submittedPayloads.length, 1);
assert.equal(submittedPayloads[0].address, contract);
assert.equal(submittedPayloads[0].functionName, "anchorRecord");
assert.equal(receipts.at(-1).state, "submitted");
await gateway.receipt(prepared, "maker");
assert.equal(receipts.at(-1).state, "confirmed");
console.log("AUTONOMOUS_WALLET_GATEWAY_E2E: PASS managed-server-signing=PASS caller-payload-ignored=PASS receipt=PASS");
