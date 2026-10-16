// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PayrollStore, sha256 } from "./lib/payroll-domain.ts";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const workdir = mkdtempSync(join(tmpdir(), "privatedao-payroll-"));
let store;
try {
  store = new PayrollStore({
    databasePath: join(workdir, "payroll.sqlite"),
    schemaPath: new URL("../migrations/20260826_confidential_payroll_devnet.sql", import.meta.url).pathname,
  });
  const maker = "maker-demo";
  const checker = "checker-demo";
  const wallet = "11111111111111111111111111111111";
  const challenge = store.createWalletChallenge({ wallet, message: "payroll-session-test", nonce: "nonce-1", expiresAt: new Date(Date.now() + 60000).toISOString() });
  assert.deepEqual(store.consumeWalletChallenge({ nonce: challenge.nonce, wallet, message: challenge.message }).wallet, wallet);
  assert.throws(() => store.consumeWalletChallenge({ nonce: challenge.nonce, wallet, message: challenge.message }), /invalid|already used/);
  const session = store.createWalletSession({ token: "session-token", wallet, expiresAt: new Date(Date.now() + 60000).toISOString() });
  assert.equal(store.getWalletSession("session-token")?.wallet, wallet);
  assert.equal(store.getWalletSession("wrong-token"), null);
  const digest = "a".repeat(64);
  const tenant = store.createTenant({ name: "PrivateDAO Devnet Demo", actorRef: maker });
  assert.equal(store.actorCanAccessBatch("missing-batch", maker), false);
  store.addMember({ tenantId: tenant.tenantId, actorRef: maker, role: "approver", addedBy: maker });
  store.addMember({ tenantId: tenant.tenantId, actorRef: checker, role: "approver", addedBy: maker });
  const policy = store.createPolicy({ tenantId: tenant.tenantId, jurisdiction: "GENERIC-DEMO", taxYear: "2026", maxTotalCents: 10000, maxEmployeeCents: 9000, allowedAsset: "SOL", requiredApprovers: 1, allowSelfApproval: false, actorRef: maker });
  const employees = ["11111111111111111111111111111111", "So11111111111111111111111111111111111111112", "SysvarRent111111111111111111111111111111111"]
    .map((recipientAddress, index) => store.addEmployee({ tenantId: tenant.tenantId, employeeRefCiphertext: `ciphertext-only-${index}`, recipientAddress, recipientCommitment: digest, actorRef: maker }));
  const items = employees.map((employee, index) => ({ employeeId: employee.employeeId, payoutId: `payout-${index + 1}`, grossCents: 3000, taxCents: 300, deductionsCents: 100, netCents: 2600, recipientCommitment: digest }));
  assert.throws(() => store.createBatch({ tenantId: tenant.tenantId, policyId: policy.policyId, idempotencyKey: "batch-invalid-totals", manifestCommitment: digest, batchCommitment: "b".repeat(64), recipientRoot: "c".repeat(64), grossCents: 9001, taxCents: 900, deductionsCents: 100, netCents: 8000, createdBy: maker, items }), /totals do not match/);
  const batch = store.createBatch({ tenantId: tenant.tenantId, policyId: policy.policyId, idempotencyKey: "batch-idem-1", manifestCommitment: digest, batchCommitment: "b".repeat(64), recipientRoot: "c".repeat(64), grossCents: 9000, taxCents: 900, deductionsCents: 300, netCents: 7800, createdBy: maker, items });
  assert.equal(store.actorCanAccessBatch(batch.batchId, checker), true);
  assert.equal(store.actorCanAccessBatch(batch.batchId, "unrelated-wallet"), false);
  assert.equal(store.createBatch({ ...batch, tenantId: tenant.tenantId, policyId: policy.policyId, idempotencyKey: "batch-idem-1", manifestCommitment: digest, batchCommitment: "b".repeat(64), recipientRoot: "c".repeat(64), grossCents: 9000, taxCents: 900, deductionsCents: 100, netCents: 8000, createdBy: maker, items: [] }).idempotent, true);
  for (const state of ["CALCULATED", "POLICY_CHECKED", "PENDING_APPROVAL"]) store.transition(batch.batchId, state, maker);
  assert.throws(() => store.approve(batch.batchId, maker, "approved"), /self-approve/);
  store.approve(batch.batchId, checker, "approved", "devnet-wallet-signature");
  for (const state of ["SIGNING", "SETTLING"]) store.transition(batch.batchId, state, checker);
  const storedItems = store.getBatch(batch.batchId).items;
  const signatures = ["devnet-tx-1", "devnet-tx-2", "devnet-tx-3"];
  const evidence = (signature, index) => ({ signature, network: "solana-devnet", commitment: "finalized", slot: index + 1, programId: "UmbraDevnetProgram111111111111111111111111111111", optionalDataHash: `${String(index + 1).padStart(2, "0")}${"a".repeat(62)}` });
  const first = store.recordSettlement({ batchId: batch.batchId, itemId: storedItems[0].item_id, idempotencyKey: "settle-idem-1", state: "CONFIRMED", txSignature: signatures[0], actorRef: checker, chainEvidence: evidence(signatures[0], 0) });
  const second = store.recordSettlement({ batchId: batch.batchId, itemId: storedItems[0].item_id, idempotencyKey: "settle-idem-1", state: "CONFIRMED", txSignature: signatures[0], actorRef: checker, chainEvidence: evidence(signatures[0], 0) });
  assert.equal(first.idempotent, false);
  assert.equal(second.idempotent, true);
  assert.throws(() => store.recordSettlement({ batchId: batch.batchId, itemId: storedItems[1].item_id, idempotencyKey: "missing-chain-evidence", state: "CONFIRMED", txSignature: signatures[1], actorRef: checker }), /finalized chain evidence/);
  assert.throws(() => store.recordSettlement({ batchId: batch.batchId, itemId: storedItems[1].item_id, idempotencyKey: "mismatched-chain-evidence", state: "CONFIRMED", txSignature: signatures[1], actorRef: checker, chainEvidence: evidence(signatures[0], 0) }), /does not match/);
  assert.throws(() => store.recordSettlement({ batchId: batch.batchId, itemId: storedItems[1].item_id, idempotencyKey: "replay-on-other-item", state: "CONFIRMED", txSignature: signatures[0], actorRef: checker, chainEvidence: evidence(signatures[0], 0) }), /UNIQUE|unique|constraint/i);
  assert.throws(() => store.recordSettlement({ batchId: batch.batchId, itemId: storedItems[0].item_id, idempotencyKey: "missing-signature", state: "CONFIRMED", actorRef: checker }), /transaction signature/);
  for (const [index, item] of storedItems.slice(1).entries()) store.recordSettlement({ batchId: batch.batchId, itemId: item.item_id, idempotencyKey: `settle-idem-${index + 2}`, state: "CONFIRMED", txSignature: signatures[index + 1], actorRef: checker, chainEvidence: evidence(signatures[index + 1], index + 1) });
  assert.deepEqual(store.reconcile(batch.batchId, checker), { expectedCount: 3, confirmedCount: 3, failedCount: 0, duplicateSignatures: 0, allConfirmed: true });
  const settlementRoot = sha256(JSON.stringify(storedItems.map((item, index) => ({ payoutId: item.payout_id, netCents: item.net_cents, recipientCommitment: item.recipient_commitment, txSignature: signatures[index] }))));
  const field = (value) => (BigInt(`0x${value.slice(0, 62)}`) % 21888242871839275222246405745257275088548364400416034343698204186575808495617n).toString();
  const { Poseidon } = await import("@iden3/js-crypto");
  const hash = (...values) => Poseidon.hash(values.map(BigInt)).toString();
  const payrollKey = field(digest);
  const batchKey = field(settlementRoot);
  const salt = field(policy.policyHash);
  const publicSignals = [hash(payrollKey, "1", salt), hash(batchKey, "0", payrollKey), "0", "1"];
  const { proof } = await require("../node_modules/snarkjs").groth16.fullProve({ payrollCommitment: publicSignals[0], batchCommitment: publicSignals[1], maxVariance: "0", approvedClaim: "1", payrollKey, batchKey, variance: "0", approved: "1", salt }, "zk/build/private_dao_blind_payroll_js/private_dao_blind_payroll.wasm", "zk/setup/private_dao_blind_payroll_final.zkey");
  const verification = await store.createVerification({ batchId: batch.batchId, scope: "public", expiresAt: new Date(Date.now() + 3600000).toISOString(), actorRef: checker, proof, publicSignals });
  const publicVerification = store.getVerification(verification.token);
  assert.equal(publicVerification.status, "active");
  assert.equal(publicVerification.proofType, "groth16-private-dao-blind-payroll-v1");
  assert.match(verification.verificationUrl, /^\/verify\/payroll\?token=/);
  assert.equal(verification.proofType, "groth16-private-dao-blind-payroll-v1");
  assert.notEqual(verification.proofHash, "d".repeat(64));
  assert.notEqual(verification.settlementRoot, "c".repeat(64));
  console.log("PAYROLL_DOMAIN=PASS");
  process.exit(0);
} finally {
  store?.db.close();
  rmSync(workdir, { recursive: true, force: true });
}
