import assert from "node:assert/strict";
import { assertWalletActionRequestShape, assertWalletPolicyConfiguration, createPrivateDaoRuntime, ConfiguredHybridAuthorizationVerifier, HybridAuthorizationKeyRing, WalletExecutionGateway, WalletSecurityGuard, createHybridAuthorizationEnvelope, createHybridAuthorizationVerifierFromEnv, createMongoWalletSecurityStoreFromEnv, createNoblePqcProvider, quantumSecurityPosture, verifyHybridAuthorizationEnvelope, createWalletAuthorizationMessage } from "../packages/privatedao-runtime/src/index.ts";

const principal = { tenantId: "tenant_acme", organizationId: "org_acme", subjectId: "maker_1", roles: ["maker"], issuer: "https://issuer.example", authenticatedAt: "2026-10-17T00:00:00.000Z" };
const policy = { mode: "b2b", allowedActions: ["pay"], allowedNetworks: ["solana-devnet"], allowedAssets: ["USDC"], allowedDestinations: ["destination_1", "record_1"], perActionLimitAtomic: 1000n, dailyLimitAtomic: 1500n, requireApprovalAboveAtomic: 500n, autonomousEnabled: false, signerBoundary: "external", recoveryWindowSeconds: 86400 };
const request = { requestId: "req_1", idempotencyKey: "idem_1", tenantId: "tenant_acme", organizationId: "org_acme", subjectId: "maker_1", mode: "b2b", action: "pay", network: "solana-devnet", asset: "USDC", amountAtomic: 600n, destination: "destination_1", createdAt: "2026-10-17T12:00:00.000Z" };
assertWalletActionRequestShape(request);
assert.throws(() => assertWalletActionRequestShape({ ...request, amountAtomic: "600" }), /amountAtomic/);
assert.throws(() => assertWalletActionRequestShape({ ...request, mode: "unknown" }), /mode/);
assert.throws(() => assertWalletPolicyConfiguration({ ...policy, recoveryWindowSeconds: 0 }), /recovery window/);
assert.throws(() => assertWalletPolicyConfiguration({ ...policy, mode: "autonomous", autonomousEnabled: true, signerBoundary: "managed", allowedDestinations: [] }), /Autonomous policy/);

const pqc = createNoblePqcProvider();
const kem = pqc.generateKemKeyPair();
const encapsulated = pqc.encapsulate(kem.publicKey);
assert.deepEqual(pqc.decapsulate(encapsulated.cipherText, kem.secretKey), encapsulated.sharedSecret);
const signatureKeys = pqc.generateSignatureKeyPair();
const classicalKeys = pqc.generateClassicalKeyPair();
const message = new TextEncoder().encode("PrivateDAO wallet authorization");
const signature = pqc.sign(message, signatureKeys.secretKey);
assert.equal(pqc.verify(signature, message, signatureKeys.publicKey), true);
const envelope = createHybridAuthorizationEnvelope(pqc, message, signatureKeys.secretKey, classicalKeys.secretKey);
assert.equal(verifyHybridAuthorizationEnvelope(pqc, envelope, signatureKeys.publicKey, classicalKeys.publicKey), true);
assert.equal(verifyHybridAuthorizationEnvelope(pqc, { ...envelope, message: new TextEncoder().encode("tampered") }, signatureKeys.publicKey, classicalKeys.publicKey), false);
assert.equal(verifyHybridAuthorizationEnvelope(pqc, { ...envelope, classicalSignature: Uint8Array.from(envelope.classicalSignature, (value) => value ^ 1) }, signatureKeys.publicKey, classicalKeys.publicKey), false);
const keyRing = new HybridAuthorizationKeyRing(pqc);
keyRing.rotate("wallet-key-2026-10-01");
const firstRingEnvelope = keyRing.sign(message);
assert.equal(keyRing.verify(firstRingEnvelope), true);
keyRing.rotate("wallet-key-2026-10-18");
const secondRingEnvelope = keyRing.sign(message);
assert.equal(keyRing.verify(secondRingEnvelope), true);
assert.equal(keyRing.verify(firstRingEnvelope), true);
assert.deepEqual(keyRing.publicKeys().map((key) => [key.keyId, key.status]), [["wallet-key-2026-10-01", "retired"], ["wallet-key-2026-10-18", "active"]]);
assert.throws(() => keyRing.retire("wallet-key-2026-10-18"), /active key/);
assert.equal(quantumSecurityPosture(pqc).status, "provider-configured");
assert.equal(quantumSecurityPosture(pqc).claimable, false);
const hybridPolicy = { ...policy, requireHybridAuthorization: true };
const hybridRequest = { ...request, requestId: "req_hybrid", idempotencyKey: "idem_hybrid" };
assert.equal(new WalletSecurityGuard(() => "2026-10-17T12:00:01.000Z", keyRing).authorize(principal, hybridPolicy, hybridRequest).decision.allowed, false);
const hybridAuthorization = keyRing.sign(createWalletAuthorizationMessage(hybridPolicy, hybridRequest));
const configuredVerifier = new ConfiguredHybridAuthorizationVerifier(pqc, [keyRing.publicKeys()[1]]);
assert.equal(configuredVerifier.verify(hybridAuthorization), true);
const envVerifier = createHybridAuthorizationVerifierFromEnv({
  PDAO_PQC_PUBLIC_KEYS_JSON: JSON.stringify(keyRing.publicKeys().map((key) => ({
    keyId: key.keyId,
    status: key.status,
    pqcPublicKey: Buffer.from(key.pqcPublicKey).toString("base64"),
    classicalPublicKey: Buffer.from(key.classicalPublicKey).toString("base64"),
  }))),
}, pqc);
assert.equal(envVerifier.verify(hybridAuthorization), true);
assert.throws(() => createHybridAuthorizationVerifierFromEnv({
  PDAO_PQC_PUBLIC_KEYS_JSON: JSON.stringify([
    { keyId: "bad-length", status: "active", pqcPublicKey: Buffer.from([1]).toString("base64"), classicalPublicKey: Buffer.from([2]).toString("base64") },
  ]),
}, pqc), /public-key lengths/);
assert.throws(() => createHybridAuthorizationVerifierFromEnv({
  PDAO_PQC_PUBLIC_KEYS_JSON: JSON.stringify(keyRing.publicKeys().map((key) => ({
    keyId: key.keyId,
    status: "active",
    pqcPublicKey: Buffer.from(key.pqcPublicKey).toString("base64"),
    classicalPublicKey: Buffer.from(key.classicalPublicKey).toString("base64"),
  }))),
}, pqc), /exactly one active key/);
assert.throws(() => createHybridAuthorizationVerifierFromEnv({
  PDAO_PQC_PUBLIC_KEYS_JSON: JSON.stringify([
    { keyId: "bad-base64", status: "active", pqcPublicKey: "not-base64!", classicalPublicKey: Buffer.alloc(32).toString("base64") },
  ]),
}, pqc), /canonical base64/);
const hybridAuthorized = new WalletSecurityGuard(() => "2026-10-17T12:00:01.000Z", keyRing).authorize(principal, hybridPolicy, { ...hybridRequest, hybridAuthorization });
assert.equal(hybridAuthorized.decision.allowed, true);
const tamperedHybrid = new WalletSecurityGuard(() => "2026-10-17T12:00:01.000Z", keyRing).authorize(principal, hybridPolicy, { ...hybridRequest, amountAtomic: 601n, hybridAuthorization });
assert.equal(tamperedHybrid.decision.allowed, false);
await assert.rejects(() => createMongoWalletSecurityStoreFromEnv({}), /MONGODB_URI is required/);
const guard = new WalletSecurityGuard(() => "2026-10-17T12:00:01.000Z");
assert.equal(guard.authorize(principal, policy, { ...request, organizationId: "org_other", idempotencyKey: "idem_cross_org" }).decision.allowed, false);
const first = guard.authorize(principal, policy, request);
assert.equal(first.decision.allowed, true);
assert.equal(first.decision.approvalRequired, true);
assert.equal(first.audit.tenantId, "tenant_acme");
assert.equal(guard.authorize(principal, policy, { ...request, approvalConfirmed: true, actorSubjectId: principal.subjectId }).decision.allowed, false);
const approver = { ...principal, subjectId: "approver_1", roles: ["approver"] };
assert.equal(guard.authorize(approver, policy, { ...request, approvalConfirmed: true, actorSubjectId: approver.subjectId }).decision.allowed, true);
const overDaily = guard.authorize(principal, policy, { ...request, idempotencyKey: "idem_2", amountAtomic: 1000n, approvalConfirmed: true });
assert.equal(overDaily.decision.allowed, false);
const autonomous = guard.authorize({ ...principal, roles: ["agent"] }, { ...policy, mode: "autonomous", autonomousEnabled: false }, { ...request, idempotencyKey: "idem_3", mode: "autonomous" });
assert.equal(autonomous.decision.allowed, false);
const b2c = guard.authorize({ ...principal, subjectId: "consumer_1", roles: ["consumer"] }, { ...policy, mode: "b2c", allowedActions: ["pay"], perActionLimitAtomic: 100n, dailyLimitAtomic: 100n, requireApprovalAboveAtomic: 50n }, { ...request, idempotencyKey: "idem_b2c", subjectId: "consumer_1", mode: "b2c", amountAtomic: 10n });
assert.equal(b2c.decision.allowed, true);
const autonomousEnabled = guard.authorize({ ...principal, subjectId: "agent_1", roles: ["agent"] }, { ...policy, mode: "autonomous", autonomousEnabled: true, signerBoundary: "managed", allowedActions: ["pay"], perActionLimitAtomic: 100n, dailyLimitAtomic: 100n, requireApprovalAboveAtomic: 50n }, { ...request, idempotencyKey: "idem_autonomous", subjectId: "agent_1", mode: "autonomous", amountAtomic: 10n });
assert.equal(autonomousEnabled.decision.allowed, true);
const autonomousWithoutDestinationAllowlist = guard.authorize(
  { ...principal, subjectId: "agent_2", roles: ["agent"] },
  { ...policy, mode: "autonomous", autonomousEnabled: true, signerBoundary: "managed", allowedDestinations: [] },
  { ...request, idempotencyKey: "idem_autonomous_no_destination", subjectId: "agent_2", mode: "autonomous", amountAtomic: 10n },
);
assert.equal(autonomousWithoutDestinationAllowlist.decision.allowed, false);
assert.match(autonomousWithoutDestinationAllowlist.decision.reason, /destination allowlist/);

const runtime = createPrivateDaoRuntime();
const walletGateway = new WalletExecutionGateway(runtime.gateway, new WalletSecurityGuard(() => "2026-10-17T12:00:01.000Z"));
const intent = {
  context: { requestId: "req_kernel", idempotencyKey: "idem_kernel", product: "record-verification", capability: "verification.record.create", organizationId: "org_acme", actorId: "maker_1", network: "solana-devnet" },
  payload: { schemaVersion: "1", recordType: "wallet-policy", recordId: "record_1", issuer: "org_acme", issuedAt: "2026-10-17T12:00:00.000Z", payload: { status: "approved" }, publicFieldPaths: ["status"] },
  accounts: [],
};
const walletRequest = { requestId: "req_kernel", idempotencyKey: "idem_kernel", tenantId: "tenant_acme", organizationId: "org_acme", subjectId: "maker_1", mode: "b2b", action: "sign", network: "solana-devnet", asset: "USDC", amountAtomic: 0n, destination: "record_1", createdAt: "2026-10-17T12:00:00.000Z" };
const walletPolicy = { ...policy, allowedActions: ["sign"], perActionLimitAtomic: 0n, dailyLimitAtomic: 0n };
const prepared = await walletGateway.prepare(intent, "maker", { principal, policy: walletPolicy, request: walletRequest });
assert.equal(prepared.executionId, "record-create-req_kernel");
const approvalIntent = { ...intent, context: { ...intent.context, requestId: "req_approval", idempotencyKey: "idem_approval" } };
const approvalRequest = { ...request, requestId: "req_approval", idempotencyKey: "idem_approval", action: "pay", subjectId: "maker_1", actorSubjectId: "maker_1" };
const approvalPolicy = { ...policy, allowedActions: ["pay"] };
await assert.rejects(
  () => walletGateway.prepare(approvalIntent, "maker", { principal, policy: approvalPolicy, request: approvalRequest }),
  /approval is required/,
);
const approvedPrepared = await walletGateway.prepare(approvalIntent, "maker", {
  principal: approver,
  policy: approvalPolicy,
  request: { ...approvalRequest, approvalConfirmed: true, actorSubjectId: approver.subjectId },
});
assert.equal(approvedPrepared.executionId, "record-create-req_approval");
const durableReceipts = [];
const receiptGateway = new WalletExecutionGateway(runtime.gateway, new WalletSecurityGuard(() => "2026-10-17T12:00:01.000Z"), undefined, {
  async recordReceipt(receipt) { durableReceipts.push(receipt); },
});
const receiptIntent = { ...intent, context: { ...intent.context, requestId: "req_receipt", idempotencyKey: "idem_receipt" } };
const receiptRequest = { ...walletRequest, requestId: "req_receipt", idempotencyKey: "idem_receipt" };
const receiptPrepared = await receiptGateway.prepare(receiptIntent, "maker", { principal, policy: walletPolicy, request: receiptRequest });
await receiptGateway.submit(receiptPrepared, receiptPrepared.unsignedPayload, "maker");
assert.equal(durableReceipts.at(-1).state, "submitted");
await receiptGateway.receipt(receiptPrepared, "maker");
assert.equal(durableReceipts.at(-1).state, "reconciled");
const receiptSession = receiptGateway.executionSession(receiptPrepared.executionId);
assert.equal(receiptSession.tenantId, principal.tenantId);
assert.equal(receiptSession.organizationId, principal.organizationId);
const restoredReceiptGateway = new WalletExecutionGateway(runtime.gateway, new WalletSecurityGuard(() => "2026-10-17T12:00:01.000Z"), undefined, {
  async recordReceipt(receipt) { durableReceipts.push(receipt); },
});
restoredReceiptGateway.restoreExecutionSession(receiptSession);
assert.equal(restoredReceiptGateway.executionSession(receiptPrepared.executionId).receiptCommitment, receiptSession.receiptCommitment);
const b2cGateway = new WalletExecutionGateway(runtime.gateway, new WalletSecurityGuard(() => "2026-10-17T12:00:01.000Z"), undefined, {
  async recordReceipt(receipt) { durableReceipts.push(receipt); },
});
const b2cIntent = { ...intent, context: { ...intent.context, requestId: "req_b2c_gateway", idempotencyKey: "idem_b2c_gateway", actorId: "consumer_1" } };
const b2cRequest = { ...walletRequest, requestId: "req_b2c_gateway", idempotencyKey: "idem_b2c_gateway", subjectId: "consumer_1", mode: "b2c", action: "pay", amountAtomic: 10n };
const b2cPolicy = { ...walletPolicy, mode: "b2c", allowedActions: ["pay"], perActionLimitAtomic: 100n, dailyLimitAtomic: 100n, requireApprovalAboveAtomic: 50n };
const b2cPrepared = await b2cGateway.prepare(b2cIntent, "maker", {
  principal: { ...principal, subjectId: "consumer_1", roles: ["consumer"] },
  policy: b2cPolicy,
  request: b2cRequest,
});
await b2cGateway.submit(b2cPrepared, b2cPrepared.unsignedPayload, "maker");
assert.equal(durableReceipts.at(-1).state, "submitted");
const b2cReceipt = await b2cGateway.receipt(b2cPrepared, "maker");
assert.equal(b2cReceipt.state, "reconciled");
assert.equal(durableReceipts.at(-1).state, "reconciled");
const autonomousGateway = new WalletExecutionGateway(runtime.gateway, new WalletSecurityGuard(() => "2026-10-17T12:00:01.000Z"));
const autonomousIntent = { ...intent, context: { ...intent.context, requestId: "req_autonomous", idempotencyKey: "idem_autonomous_gateway", actorId: "agent_1" } };
const autonomousRequest = { ...walletRequest, requestId: "req_autonomous", idempotencyKey: "idem_autonomous_gateway", subjectId: "agent_1", mode: "autonomous", action: "sign" };
const autonomousPolicy = { ...walletPolicy, mode: "autonomous", autonomousEnabled: true, signerBoundary: "managed" };
const autonomousPrepared = await autonomousGateway.prepare(autonomousIntent, "maker", { principal: { ...principal, subjectId: "agent_1", roles: ["agent"] }, policy: autonomousPolicy, request: autonomousRequest });
await assert.rejects(() => autonomousGateway.submit(autonomousPrepared, autonomousPrepared.unsignedPayload, "maker"), /managed signer/);
console.log("wallet security layer: PASS");
