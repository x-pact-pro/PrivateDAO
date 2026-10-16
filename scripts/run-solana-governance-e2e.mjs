import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { createPrivateDaoRuntime } from "../packages/privatedao-runtime/src/index.ts";

const network = "solana-devnet";
const runId = `solana-governance-${Date.now()}`;
const runtime = createPrivateDaoRuntime();
const requestId = `${runId}-governance-proposal-execute`;
const intent = {
  context: {
    requestId,
    idempotencyKey: requestId,
    product: "governance",
    capability: "governance.proposal.execute",
    network,
    provider: "privatedao-governance-proposal",
    organizationId: "privatedao-enterprise-e2e",
    actorId: "kernel-e2e-runner",
  },
  payload: {
    proposalId: `${runId}-proposal`,
    actionDigest: createHash("sha256").update(`${runId}:treasury-policy-change`).digest("hex"),
    votesFor: 3,
    votesAgainst: 1,
    quorum: 2,
    policyVersion: "constitution-v1",
  },
  accounts: [],
};

const prepared = await runtime.gateway.prepare(intent, "maker");
const submitted = await runtime.gateway.submit(prepared, prepared.unsignedPayload, "maker");
const receipt = await runtime.gateway.receipt({ executionId: submitted.executionId, intent: prepared.intent }, "maker");
assert.equal(receipt.state, "reconciled");
assert.equal(receipt.provider, "privatedao-governance-proposal");
assert.equal(receipt.result?.passed, true);
assert.equal(receipt.result?.onchainAnchor, false);

const artifact = {
  schema: "privatedao.solana-devnet.governance-kernel-e2e.v1",
  generatedAt: new Date().toISOString(),
  network,
  gateway: "ProductExecutionGateway",
  state: receipt.state,
  product: "governance",
  capability: intent.context.capability,
  provider: receipt.provider,
  proposalDigest: receipt.result?.proposalDigest,
  passed: receipt.result?.passed === true,
  evidenceClass: "kernel-provider-e2e",
  onchainAnchor: false,
  broadcastAttempted: false,
};
await mkdir("docs/evidence", { recursive: true });
await writeFile("docs/evidence/solana-devnet-governance-kernel-e2e.json", `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ status: "PASS", ...artifact }, null, 2));
