import assert from "node:assert/strict";

import {
  InMemoryProviderRegistry,
  createPrivateDaoRuntime,
  buildCapabilityMatrix,
  listApplicationBindings,
  validateApplicationBindings,
  PrivateDaoKernel,
  listProducts,
} from "../packages/privatedao-runtime/src/index.ts";
import runtimeCatalogModule from "../apps/web/src/lib/runtime-catalog.ts";

const { isRuntimeProductAvailable, isRuntimeCapabilityExecutable } = runtimeCatalogModule;

const network = "solana-devnet";
const capability = "treasury.policy.check";
let prepareCalls = 0;
let submitCalls = 0;

const provider = {
  id: "runtime-test-provider",
  networks: [network],
  supports: (candidate) => candidate === capability,
  async prepare(intent) {
    prepareCalls += 1;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return {
      executionId: "runtime-test-execution",
      intent,
      unsignedPayload: { test: true },
      requiredSigners: [],
      state: "prepared",
    };
  },
  async submit(execution) {
    submitCalls += 1;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return { executionId: execution.executionId, signatures: ["runtime-test-signature"] };
  },
  async status(executionId) {
    return { executionId, state: "submitted" };
  },
  async receipt(executionId) {
    return {
      executionId,
      requestId: "runtime-test-request",
      capability,
      network,
      state: "finalized",
      signatures: ["runtime-test-signature"],
      createdAt: new Date(0).toISOString(),
    };
  },
};

const registry = new InMemoryProviderRegistry();
registry.register(provider);
const kernel = new PrivateDaoKernel(registry);
const intent = {
  context: {
    requestId: "runtime-test-request",
    idempotencyKey: "runtime-test-idempotency",
    product: "treasury",
    capability,
    network,
  },
  payload: { policy: "budget-check" },
  accounts: [],
};

const [first, second] = await Promise.all([kernel.prepare(intent), kernel.prepare(intent)]);
assert.equal(prepareCalls, 1);
assert.equal(first.executionId, second.executionId);

const [submittedFirst, submittedSecond] = await Promise.all([
  kernel.submit(first.executionId, first.unsignedPayload),
  kernel.submit(first.executionId, first.unsignedPayload),
]);
assert.equal(submitCalls, 1);
assert.deepEqual(submittedFirst, submittedSecond);

const products = listProducts();
assert.equal(products.find((product) => product.id === "blind-verification")?.name, "Blind Verification");
assert.equal(products.find((product) => product.id === "record-verification")?.name, "Record Verification");
assert.equal(isRuntimeProductAvailable("blind-verification"), true);
assert.equal(isRuntimeProductAvailable("record-verification"), true);
assert.equal(isRuntimeProductAvailable("payroll"), true);
assert.equal(isRuntimeProductAvailable("governance"), true);
  assert.equal(isRuntimeProductAvailable("agent"), false);
assert.equal(isRuntimeCapabilityExecutable("payroll", "payroll.calculate", "solana-devnet"), true);
assert.equal(isRuntimeCapabilityExecutable("payroll", "payroll.approve", "solana-devnet"), true);

const runtime = createPrivateDaoRuntime(registry);
const protocolRegistry = runtime.protocols;
const registrations = protocolRegistry.list();
const expectedRegistrationCount = products.reduce((count, product) => count + product.capabilities.length, 0);
assert.equal(registrations.length, expectedRegistrationCount);
assert.equal(protocolRegistry.list("payroll").length, 2);
assert.equal(protocolRegistry.authorize("payroll.approve", "execution.submit", "checker"), true);
assert.equal(protocolRegistry.authorize("payroll.approve", "execution.submit", "auditor"), false);

const policyRuntime = createPrivateDaoRuntime();
const approvalIntent = {
  context: {
    requestId: "payroll-approval-test",
    idempotencyKey: "payroll-approval-test-key",
    product: "payroll",
    capability: "payroll.approve",
    network,
  },
  payload: {
    batchId: "batch-001",
    makerId: "maker-1",
    policyHash: "policy-hash-001",
    policy: { requiredApprovals: 1, allowedRoles: ["checker"], preventSelfApproval: true },
  },
  accounts: [{ role: "authority", address: "checker-1", network }],
};
const approvalPrepared = await policyRuntime.gateway.prepare(approvalIntent, "checker");
assert.equal(approvalPrepared.state, "awaiting_signature");
await policyRuntime.gateway.submit(approvalPrepared, { actorId: "checker-1", role: "checker", signature: "wallet-signature-001" }, "checker");
const approvalReceipt = await policyRuntime.gateway.receipt(approvalPrepared, "checker");
assert.equal(approvalReceipt.state, "reconciled");
assert.equal(approvalReceipt.result.approvedBy, "checker-1");
try {
  await policyRuntime.gateway.prepare({ ...approvalIntent, context: { ...approvalIntent.context, requestId: "payroll-self-approval", idempotencyKey: "payroll-self-approval-key" }, payload: { ...approvalIntent.payload, makerId: "checker-1" } }, "checker");
  assert.fail("maker self-approval should be rejected");
} catch (error) {
  assert.match(error.message, /Provider preparation failed/);
}

const policyIntent = {
  context: {
    requestId: "treasury-policy-test",
    idempotencyKey: "treasury-policy-test-key",
    product: "treasury",
    capability: "treasury.policy.check",
    network,
  },
  payload: { amountCents: 7500, budgetCents: 10000, maxTransactionCents: 8000, requestedAsset: "USDC", allowedAsset: "USDC" },
  accounts: [],
};
const policyPrepared = await policyRuntime.gateway.prepare(policyIntent, "maker");
await policyRuntime.gateway.submit(policyPrepared, policyPrepared.unsignedPayload, "maker");
const policyReceipt = await policyRuntime.gateway.receipt(policyPrepared, "maker");
assert.equal(policyReceipt.state, "reconciled");
assert.equal(policyReceipt.result.passed, true);

const recordIntent = {
  context: {
    requestId: "record-create-test",
    idempotencyKey: "record-create-test-key",
    product: "record-verification",
    capability: "verification.record.create",
    network,
  },
  payload: {
    schemaVersion: "1",
    recordType: "payroll-summary",
    recordId: "payroll-001",
    issuer: "demo-company",
    issuedAt: "2026-09-09T00:00:00.000Z",
    payload: { total: 3000, employeeSecret: "must-not-appear" },
    publicFieldPaths: ["total"],
  },
  accounts: [],
};
const recordPrepared = await policyRuntime.gateway.prepare(recordIntent, "maker");
await policyRuntime.gateway.submit(recordPrepared, recordPrepared.unsignedPayload, "maker");
const recordReceipt = await policyRuntime.gateway.receipt(recordPrepared, "maker");
assert.equal(recordReceipt.result.publicFields.total, 3000);
assert.equal("employeeSecret" in recordReceipt.result, false);
assert.equal(recordReceipt.result.canonicalDigest.length, 64);

const verifyIntent = {
  context: { ...recordIntent.context, requestId: "record-verify-test", idempotencyKey: "record-verify-test-key", capability: "verification.record.verify" },
  payload: { record: recordIntent.payload, expectedDigest: recordReceipt.result.canonicalDigest },
  accounts: [],
};
const verifyPrepared = await policyRuntime.gateway.prepare(verifyIntent, "auditor");
await policyRuntime.gateway.submit(verifyPrepared, verifyPrepared.unsignedPayload, "auditor");
const verifyReceipt = await policyRuntime.gateway.receipt(verifyPrepared, "auditor");
assert.equal(verifyReceipt.result.valid, true);
const tamperedPrepared = await policyRuntime.gateway.prepare({ ...verifyIntent, context: { ...verifyIntent.context, requestId: "record-verify-tampered", idempotencyKey: "record-verify-tampered-key" }, payload: { ...verifyIntent.payload, record: { ...verifyIntent.payload.record, payload: { total: 3001 } } } }, "auditor");
await policyRuntime.gateway.submit(tamperedPrepared, tamperedPrepared.unsignedPayload, "auditor");
const tamperedReceipt = await policyRuntime.gateway.receipt(tamperedPrepared, "auditor");
assert.equal(tamperedReceipt.result.valid, false);

const discoveryProvider = new (await import("../packages/privatedao-runtime/src/agent-provider.ts")).AgentDiscoveryProvider(
  async () => new Response(JSON.stringify({ name: "PrivateDAO Agent Exchange", protocolVersion: "0.3.0" }), { status: 200, headers: { "content-type": "application/json" } }),
);
const discoveryRegistry = new InMemoryProviderRegistry();
discoveryRegistry.register(discoveryProvider);
const discoveryRuntime = createPrivateDaoRuntime(discoveryRegistry);
const discoveryIntent = {
  context: { requestId: "agent-discover-test", idempotencyKey: "agent-discover-test-key", product: "agent", capability: "agent.discover", network },
  payload: { url: "https://agents.privatedao.org/.well-known/agent-card.json" },
  accounts: [],
};
const discoveryPrepared = await discoveryRuntime.gateway.prepare(discoveryIntent, "agent");
await discoveryRuntime.gateway.submit(discoveryPrepared, discoveryPrepared.unsignedPayload, "agent");
const discoveryReceipt = await discoveryRuntime.gateway.receipt(discoveryPrepared, "agent");
assert.equal(discoveryReceipt.result.agentCard.protocolVersion, "0.3.0");
assert.equal(discoveryReceipt.result.status, 200);

let proofRequest;
const blindProvider = new (await import("../packages/privatedao-runtime/src/blind-policy-provider.ts")).BlindPolicyProofProvider(
  async (_url, init) => {
    proofRequest = JSON.parse(init.body);
    return new Response(JSON.stringify({
      ok: true,
      status: "proof-issued",
      workflowId: proofRequest.workflowId,
      proofHash: "a".repeat(64),
      publicProofPackage: { proofId: "proof-001", publicOutcome: "policy-satisfied" },
    }), { status: 200, headers: { "content-type": "application/json" } });
  },
  "https://api.example.test/prove",
);
const blindRegistry = new InMemoryProviderRegistry();
blindRegistry.register(blindProvider);
const blindRuntime = createPrivateDaoRuntime(blindRegistry);
const blindIntent = {
  context: { requestId: "blind-prove-test", idempotencyKey: "blind-prove-test-key", product: "blind-verification", capability: "verification.blind.prove", network },
  payload: { workflowId: "workflow-001", privateInputs: { subjectId: "subject-001", riskScore: 10 } },
  accounts: [],
};
const blindPrepared = await blindRuntime.gateway.prepare(blindIntent, "maker");
await blindRuntime.gateway.submit(blindPrepared, blindPrepared.unsignedPayload, "maker");
const blindReceipt = await blindRuntime.gateway.receipt(blindPrepared, "maker");
assert.equal(proofRequest.workflowId, "workflow-001");
assert.equal(blindReceipt.result.proofHash, "a".repeat(64));
assert.equal(blindReceipt.result.publicProofPackage.proofId, "proof-001");

let auctionRequest;
const auctionProvider = new (await import("../packages/privatedao-runtime/src/auction-outcome-provider.ts")).AuctionOutcomeProofProvider(
  async (_url, init) => {
    auctionRequest = JSON.parse(init.body);
    return new Response(JSON.stringify({
      ok: true,
      proofType: "groth16-auction-outcome-v1",
      publicSignals: ["1", "2"],
      proof: { pi_a: ["observed"] },
      privateDataExcluded: true,
      binding: "finalized SettlementReceipt result_commitment",
    }), { status: 200, headers: { "content-type": "application/json" } });
  },
  "https://api.example.test/auction-outcome-proof",
);
const auctionRegistry = new InMemoryProviderRegistry();
auctionRegistry.register(auctionProvider);
const auctionRuntime = createPrivateDaoRuntime(auctionRegistry);
const auctionIntent = {
  context: { requestId: "auction-outcome-test", idempotencyKey: "auction-outcome-test-key", product: "auction", capability: "auction.settle", network },
  payload: { metadata: { auctionId: [1, 2, 3] }, bids: [{ bidderCommitment: [4, 5], amount: 10 }] },
  accounts: [],
};
const auctionPrepared = await auctionRuntime.gateway.prepare(auctionIntent, "maker");
await auctionRuntime.gateway.submit(auctionPrepared, auctionPrepared.unsignedPayload, "maker");
const auctionReceipt = await auctionRuntime.gateway.receipt(auctionPrepared, "maker");
assert.equal(auctionRequest.metadata.auctionId[0], 1);
assert.equal(auctionReceipt.result.proofType, "groth16-auction-outcome-v1");
assert.equal(auctionReceipt.result.privateDataExcluded, true);

let bidRequest;
const bidProvider = new (await import("../packages/privatedao-runtime/src/auction-bid-provider.ts")).AuctionBidCommitProvider(
  async (_url, init) => {
    bidRequest = JSON.parse(init.body);
    return new Response(JSON.stringify({
      ok: true,
      status: "proof-issued",
      publicOutcome: "auction-finalized",
      proofHash: "b".repeat(64),
      publicProofPackage: { proofId: "auction-proof-001", totalSealedBids: 2 },
      privateDataExcluded: true,
      explanation: "Private bids are excluded from the public package.",
    }), { status: 200, headers: { "content-type": "application/json" } });
  },
  "https://api.example.test/auction-bid",
);
const bidRegistry = new InMemoryProviderRegistry();
bidRegistry.register(bidProvider);
const bidRuntime = createPrivateDaoRuntime(bidRegistry);
const bidIntent = {
  context: { requestId: "auction-bid-test", idempotencyKey: "auction-bid-test-key", product: "auction", capability: "auction.bid.commit", network },
  payload: { config: { auctionId: "auction-001" }, privateBids: [{ bidderId: "one", amount: 10, salt: "s1" }, { bidderId: "two", amount: 12, salt: "s2" }] },
  accounts: [],
};
const bidPrepared = await bidRuntime.gateway.prepare(bidIntent, "maker");
await bidRuntime.gateway.submit(bidPrepared, bidPrepared.unsignedPayload, "maker");
const bidReceipt = await bidRuntime.gateway.receipt(bidPrepared, "maker");
assert.equal(bidRequest.config.auctionId, "auction-001");
assert.equal(bidReceipt.result.proofHash, "b".repeat(64));
assert.equal(bidReceipt.result.privateDataExcluded, true);

const gateway = runtime.gateway;
const gatewayPrepared = await gateway.prepare(intent, "maker");
assert.equal(gatewayPrepared.executionId, first.executionId);
assert.throws(
  () => gateway.prepare({ ...intent, context: { ...intent.context, product: "payroll", capability: "payroll.approve" } }, "auditor"),
  (error) => error?.code === "INVALID_INTENT",
);

const emptyRuntime = createPrivateDaoRuntime(new InMemoryProviderRegistry());
await assert.rejects(
  () => emptyRuntime.gateway.prepare(intent, "maker"),
  (error) => error?.code === "PROVIDER_NOT_FOUND",
);

const emptyMatrix = buildCapabilityMatrix(emptyRuntime.providers);
assert.equal(emptyMatrix.find((entry) => entry.capability === "treasury.policy.check" && entry.network === network)?.status, "contract-only");
assert.equal(emptyMatrix.find((entry) => entry.capability === "treasury.policy.check" && entry.network === "ethereum-sepolia")?.status, "contract-only");
const verifiedMatrix = buildCapabilityMatrix(registry);
assert.equal(verifiedMatrix.find((entry) => entry.capability === capability && entry.network === network)?.status, "verified");

assert.equal(validateApplicationBindings().length, 0);
assert.equal(
  listApplicationBindings().length,
  products.reduce((count, product) => count + product.capabilities.reduce((total, capability) => total + capability.networks.length, 0), 0),
);
assert.equal(listApplicationBindings().find((entry) => entry.capability === "payroll.calculate")?.mode, "kernel-gateway");
assert.equal(listApplicationBindings().find((entry) => entry.capability === "treasury.policy.check")?.mode, "kernel-gateway");
assert.equal(listApplicationBindings().find((entry) => entry.capability === "verification.record.create")?.mode, "kernel-gateway");
assert.equal(listApplicationBindings().find((entry) => entry.capability === "verification.record.verify")?.mode, "kernel-gateway");
assert.equal(listApplicationBindings().find((entry) => entry.capability === "agent.discover")?.mode, "kernel-gateway");
assert.equal(listApplicationBindings().find((entry) => entry.capability === "verification.blind.prove")?.mode, "kernel-gateway");
assert.equal(listApplicationBindings().find((entry) => entry.capability === "auction.settle" && entry.network === "ethereum-sepolia")?.mode, "kernel-gateway");
assert.equal(listApplicationBindings().find((entry) => entry.capability === "auction.bid.commit" && entry.network === "ethereum-sepolia")?.mode, "kernel-gateway");
assert.equal(listApplicationBindings().find((entry) => entry.capability === "auction.settle" && entry.network === "solana-devnet")?.mode, "kernel-gateway");

let currentTime = "2026-09-09T00:00:00.000Z";
const expiredKernel = new PrivateDaoKernel(registry, { now: () => currentTime });
await assert.rejects(
  () => expiredKernel.prepare({ ...intent, expiresAt: "2026-09-08T23:59:59.000Z" }),
  (error) => error?.code === "INTENT_EXPIRED",
);

const expiringIntent = { ...intent, context: { ...intent.context, idempotencyKey: "runtime-expiring-idempotency" }, expiresAt: "2026-09-09T00:01:00.000Z" };
const expiringExecution = await expiredKernel.prepare(expiringIntent);
currentTime = "2026-09-09T00:02:00.000Z";
await assert.rejects(
  () => expiredKernel.submit(expiringExecution.executionId, expiringExecution.unsignedPayload),
  (error) => error?.code === "INTENT_EXPIRED",
);

console.log("[runtime-kernel] idempotent execution, product registration, and verification catalog checks passed");
