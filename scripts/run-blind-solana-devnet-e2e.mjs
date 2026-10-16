import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import {
  BlindPolicyProofProvider,
  InMemoryProviderRegistry,
  createPrivateDaoRuntime,
} from "../packages/privatedao-runtime/src/index.ts";

const sampleResponse = await fetch("https://api.privatedao.org/api/v1/proof-workflows/blind-policy/sample");
assert.equal(sampleResponse.ok, true, `blind-policy sample failed with HTTP ${sampleResponse.status}`);
const sample = await sampleResponse.json();
assert.ok(sample?.privateInputs && typeof sample.privateInputs === "object", "sample must expose privateInputs");

const workflowId = `enterprise-blind-solana-devnet-${Date.now()}`;
const registry = new InMemoryProviderRegistry();
const provider = new BlindPolicyProofProvider();
registry.register(provider);
const runtime = createPrivateDaoRuntime(registry);
const intent = {
  context: {
    requestId: workflowId,
    idempotencyKey: workflowId,
    product: "blind-verification",
    capability: "verification.blind.prove",
    network: "solana-devnet",
    provider: provider.id,
    organizationId: "privatedao-enterprise-e2e",
    actorId: "e2e-runner",
  },
  payload: { workflowId, privateInputs: sample.privateInputs },
  accounts: [],
};

const prepared = await runtime.gateway.prepare(intent, "maker");
const submitted = await runtime.gateway.submit(prepared, prepared.unsignedPayload, "maker");
const receipt = await runtime.gateway.receipt({ executionId: submitted.executionId, intent: prepared.intent }, "maker");
const result = receipt.result;

assert.equal(receipt.state, "reconciled");
assert.equal(receipt.provider, provider.id);
assert.equal(result?.ok, true);
assert.equal(result?.verification?.ok, true);
assert.equal(result?.verification?.match, true);
assert.match(result?.proofHash ?? "", /^[0-9a-f]{64}$/);

const artifact = {
  schema: "privatedao.solana-devnet.blind-verification-e2e.v1",
  generatedAt: new Date().toISOString(),
  network: "solana-devnet",
  product: "blind-verification",
  capability: "verification.blind.prove",
  gateway: "ProductExecutionGateway",
  provider: provider.id,
  executionId: receipt.executionId,
  requestId: receipt.requestId,
  workflowId,
  state: receipt.state,
  proofHash: result.proofHash,
  proofStatus: result.status,
  proofVerification: result.verification,
  publicProofId: result.publicProofPackage?.proofId ?? null,
  circuitId: result.publicProofPackage?.circuitId ?? null,
  circuitVersion: result.publicProofPackage?.circuitVersion ?? null,
  privateInputsRecorded: false,
  source: "https://api.privatedao.org/api/v1/proof-workflows/blind-policy/prove",
};

await mkdir("docs/evidence", { recursive: true });
await writeFile("docs/evidence/solana-devnet-blind-verification-e2e.json", `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ status: "PASS", ...artifact }, null, 2));
