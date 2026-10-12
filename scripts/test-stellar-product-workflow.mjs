import assert from "node:assert/strict";
import { validateStellarProductWorkflow } from "../packages/privatedao-runtime/src/index.ts";

const digest = "a".repeat(64);
const cases = [
  ["verification.blind.prove", { inputCommitment: digest }],
  ["verification.record.create", { inputCommitment: digest }],
  ["verification.record.verify", { inputCommitment: digest }],
  ["payroll.calculate", { inputCommitment: digest, policyCommitment: digest }],
  ["payroll.approve", { inputCommitment: digest, policyCommitment: digest }],
  ["treasury.policy.check", { inputCommitment: digest, policyCommitment: digest }],
  ["governance.proposal.execute", { inputCommitment: digest, policyCommitment: digest }],
  ["auction.bid.commit", { inputCommitment: digest }],
  ["auction.settle", { inputCommitment: digest, outcomeCommitment: digest }],
];

for (const [capability, fields] of cases) {
  const workflow = validateStellarProductWorkflow(capability, { workflowId: `test:${capability}`, ...fields });
  assert.equal(workflow.inputCommitment, digest);
}

assert.throws(
  () => validateStellarProductWorkflow("payroll.calculate", { workflowId: "missing-policy", inputCommitment: digest }),
  /policyCommitment/,
);
assert.throws(
  () => validateStellarProductWorkflow("auction.settle", { workflowId: "missing-outcome", inputCommitment: digest }),
  /outcomeCommitment/,
);
assert.throws(
  () => validateStellarProductWorkflow("treasury.policy.check", { workflowId: "bad-hash", inputCommitment: "not-a-hash", policyCommitment: digest }),
  /inputCommitment/,
);

console.log(`[stellar-product-workflow] PASS capabilities=${cases.length} negativeCases=3`);
