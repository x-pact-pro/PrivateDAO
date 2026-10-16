import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { createPrivateDaoRuntime } from "../packages/privatedao-runtime/src/index.ts";

const network = "solana-devnet";
const runId = `solana-payroll-${Date.now()}`;
const runtime = createPrivateDaoRuntime();

function context(capability, provider) {
  const requestId = `${runId}-${capability.replaceAll(".", "-")}`;
  return {
    requestId,
    idempotencyKey: requestId,
    product: "payroll",
    capability,
    network,
    provider,
    organizationId: "privatedao-enterprise-e2e",
    actorId: "kernel-e2e-runner",
  };
}

async function execute(intent, signedPayload = intent.payload) {
  const prepared = await runtime.gateway.prepare(intent, "maker");
  const submitted = await runtime.gateway.submit(prepared, signedPayload, "maker");
  return runtime.gateway.receipt({ executionId: submitted.executionId, intent: prepared.intent }, "maker");
}

const calculation = await execute({
  context: context("payroll.calculate", "privatedao-payroll-calculation"),
  payload: {
    lines: [
      { employeeRef: "employee-a", grossCents: 120000 },
      { employeeRef: "employee-b", grossCents: 95000 },
    ],
    policy: { network, jurisdiction: "global", taxYear: "2026", taxRateBps: 1000, deductionRateBps: 500, maxTotalCents: 300000, maxEmployeeCents: 200000, allowedAsset: "SOL", rounding: "half-up" },
  },
  accounts: [],
});
assert.equal(calculation.state, "reconciled");

const maker = "maker-solana-devnet";
const checker = "checker-solana-devnet";
const policyHash = createHash("sha256").update(`${runId}:payroll-policy`).digest("hex");
const approvalIntent = {
  context: context("payroll.approve", "privatedao-payroll-approval"),
  payload: {
    batchId: `${runId}-batch`,
    makerId: maker,
    policyHash,
    policy: { requiredApprovals: 1, allowedRoles: ["checker"], preventSelfApproval: true },
  },
  accounts: [{ role: "authority", address: checker, network }],
};
const approvalPrepared = await runtime.gateway.prepare(approvalIntent, "maker");
const approvalSubmitted = await runtime.gateway.submit(approvalPrepared, { actorId: checker, role: "checker", signature: `${runId}-approval-signature` }, "maker");
const approval = await runtime.gateway.receipt({ executionId: approvalSubmitted.executionId, intent: approvalPrepared.intent }, "maker");
assert.equal(approval.state, "reconciled");

const settlement = await execute({
  context: context("payroll.settle", "privatedao-payroll-settlement"),
  payload: {
    batchId: approval.result?.batchId,
    policyHash,
    approved: true,
    recipients: [
      { commitment: createHash("sha256").update("employee-a").digest("hex"), netCents: 102000 },
      { commitment: createHash("sha256").update("employee-b").digest("hex"), netCents: 80750 },
    ],
  },
  accounts: [],
});
assert.equal(settlement.state, "reconciled");
assert.equal(settlement.result?.settled, true);
assert.equal(settlement.result?.onchainAnchor, false);

const artifact = {
  schema: "privatedao.solana-devnet.payroll-kernel-e2e.v1",
  generatedAt: new Date().toISOString(),
  network,
  gateway: "ProductExecutionGateway",
  state: "reconciled",
  product: "payroll",
  providers: [calculation.provider, approval.provider, settlement.provider],
  capabilities: ["payroll.calculate", "payroll.approve", "payroll.settle"],
  calculationReceipt: calculation.state,
  approvalReceipt: approval.state,
  settlementReceipt: settlement.state,
  settlementDigest: settlement.result?.settlementDigest,
  evidenceClass: "kernel-provider-e2e",
  onchainAnchor: false,
  broadcastAttempted: false,
};
await mkdir("docs/evidence", { recursive: true });
await writeFile("docs/evidence/solana-devnet-payroll-kernel-e2e.json", `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ status: "PASS", ...artifact }, null, 2));
