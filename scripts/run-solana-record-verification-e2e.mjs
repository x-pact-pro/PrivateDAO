import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

import { createPrivateDaoRuntime } from "../packages/privatedao-runtime/src/index.ts";

const runtime = createPrivateDaoRuntime();
const runId = `record-solana-kernel-e2e-${Date.now()}`;
const record = {
  schemaVersion: "1",
  recordType: "enterprise.authorization-record.v1",
  recordId: runId,
  issuer: "privatedao.org",
  issuedAt: new Date().toISOString(),
  payload: {
    decision: "approved",
    scope: "enterprise-e2e",
    amount: 1250,
    currency: "USD",
    internalScore: 0.91,
  },
  publicFieldPaths: ["decision", "scope", "currency"],
};

const createIntent = {
  context: {
    requestId: `${runId}-create`,
    idempotencyKey: `${runId}-create`,
    product: "record-verification",
    capability: "verification.record.create",
    network: "solana-devnet",
    organizationId: "privatedao-enterprise-e2e",
    actorId: "e2e-runner",
  },
  payload: record,
  accounts: [],
};

const preparedCreate = await runtime.gateway.prepare(createIntent, "maker");
const submittedCreate = await runtime.gateway.submit(preparedCreate, preparedCreate.unsignedPayload, "maker");
const created = await runtime.gateway.receipt({ executionId: submittedCreate.executionId, intent: preparedCreate.intent }, "maker");
const createdResult = created.result;

assert.equal(created.state, "reconciled");
assert.equal(created.provider, "privatedao-record-creation");
assert.match(createdResult?.canonicalDigest ?? "", /^[0-9a-f]{64}$/);
assert.equal(createdResult?.disclosure, "selective");
assert.equal(createdResult?.publicFields?.internalScore, undefined);

const verifyIntent = {
  ...createIntent,
  context: {
    ...createIntent.context,
    requestId: `${runId}-verify`,
    idempotencyKey: `${runId}-verify`,
    capability: "verification.record.verify",
  },
  payload: {
    record: { ...record, publicFieldPaths: undefined },
    expectedDigest: createdResult.canonicalDigest,
  },
};

const preparedVerify = await runtime.gateway.prepare(verifyIntent, "auditor");
const submittedVerify = await runtime.gateway.submit(preparedVerify, preparedVerify.unsignedPayload, "auditor");
const verified = await runtime.gateway.receipt({ executionId: submittedVerify.executionId, intent: preparedVerify.intent }, "auditor");
const verifiedResult = verified.result;

assert.equal(verified.state, "reconciled");
assert.equal(verified.provider, "privatedao-record-verification");
assert.equal(verifiedResult?.valid, true);
assert.equal(verifiedResult?.canonicalDigest, createdResult.canonicalDigest);

const artifact = {
  schema: "privatedao.solana-devnet.record-verification-e2e.v1",
  generatedAt: new Date().toISOString(),
  network: "solana-devnet",
  product: "record-verification",
  capabilities: ["verification.record.create", "verification.record.verify"],
  gateway: "ProductExecutionGateway",
  evidenceClass: "kernel-provider-e2e",
  onchainAnchor: false,
  providers: {
    create: created.provider,
    verify: verified.provider,
  },
  create: {
    executionId: created.executionId,
    requestId: created.requestId,
    state: created.state,
    canonicalDigest: createdResult.canonicalDigest,
    disclosure: createdResult.disclosure,
    publicFields: createdResult.publicFields,
    signatures: created.signatures,
  },
  verify: {
    executionId: verified.executionId,
    requestId: verified.requestId,
    state: verified.state,
    valid: verifiedResult.valid,
    canonicalDigest: verifiedResult.canonicalDigest,
    signatures: verified.signatures,
  },
  sourcePayloadRecorded: false,
};

await mkdir("docs/evidence", { recursive: true });
await writeFile("docs/evidence/solana-devnet-record-verification-e2e.json", `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ status: "PASS", network: artifact.network, product: artifact.product, capabilities: artifact.capabilities, evidenceClass: artifact.evidenceClass, onchainAnchor: artifact.onchainAnchor }, null, 2));
