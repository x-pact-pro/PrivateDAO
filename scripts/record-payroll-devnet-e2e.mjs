#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Connection, PublicKey } from "@solana/web3.js";
import { PayrollStore, sha256 } from "./lib/payroll-domain.ts";

const require = createRequire(import.meta.url);
const RPC_URL = process.env.PRIVATE_DAO_PAYROLL_DEVNET_RPC_URL || "https://api.devnet.solana.com";
const UMBRA_PROGRAM = "DSuKkyqGVGgo4QtPABfxKJKygUDACbUhirnuv63mEpAJ";
const PAYER = "4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD";
const EVIDENCE = [
  {
    recipient: "3kwFjRB68fbMRu2uRXZhHZ8P7h8T78EZRZfAYBVxLLVe",
    fundingSignature: "3m77nQv87cWbpo38nHSAHasvUKZR3ydAyE1uQXQwi8yLyXAwq2uS5DPnXJUkjVCnEC2vDVvBym9bFYZbWTdeR8ip",
    registrationSignature: "2dY2TBWtDMnFjkVY2m5LKcSkpCLdJXbG5J3ysH3rrRhzGcrwi4bs3kbbZ63GDNvb7rhJpEzwBzC2MHTdW58GxDXZ",
    optionalDataHash: "c5fd8804c264c5561f40433b47879b57e4075960e19472e3780270e46851c076",
    signature: "2YckUbmXb6jKUyZXgBQ2pQmb2AbLxGgcfypqu4mHNmPFwKavYTdUwdq4jpyFcStAsUpcabH5Nq8QWJwJEjKiSdYu",
    slot: 497216468,
  },
  {
    recipient: "9NefMxBVkQday4V9Ad77n4M6J3HLtotMdBiRMpkBQ8Rf",
    fundingSignature: "3f1X3YUg9bX8bzD4xPi7poNdvPii29GCxe9DopXv1coWbUyaEqgnpKyyuFNF8QaE47nfciuUEkToviU4DzRkjt6s",
    registrationSignature: "3fmpCcHZ9b7XXZkN1gAu6P7jLQY3ToWHrDmitaroKvXt8xYVMmkZVFgE2Jx5xDJ3EaSUcXL3TWFUVfxc3jrEW8M6",
    optionalDataHash: "b3fe7b1f9237d14b4c23576095d91c64465301b78592a36aba6c3eab75c5223b",
    signature: "2NZkPQs2QwwvAj2ZYS7vXraWqm7esXxXQ68oZwGw8NRdoZjNn7fBiC36m8y25MbUTJYrs3SZwmFDw96dJeRpYP76",
    slot: 497216590,
  },
  {
    recipient: "5dV4TuwBiKxKUDHYDuoWVZdGFQjNRQVfNiVpUt6YNRSt",
    fundingSignature: "4kEzWUgiJSkQwxxJvzM7FM7ZQB4CkRFSvfFF5p7TD8CTnUGKgMiHZAfxyyUNt7GwvqtSVy4abe6nGUVkX7DWdT51",
    registrationSignature: "4xL6v7SCfAHwx9hnouHrsH4ATbcm9Sq6nJiKvXasTAMu1KewtN7Q6e59LBjpV1vLxJyvXee1jG9FvPnHnCKBPDfj",
    optionalDataHash: "acb72fd22a43251a19295878e8ac96e2748516212fe556dc7667de424c6f4d0c",
    signature: "5fE5Q6id8gDtZcqvwNm5xL5X8tJG6GZ9mtitMv9zHsGUhBUCZ54J2pAMUW5GQgtUtY2Uo8uxPGm9iiS4o4eyHUdo",
    slot: 497216720,
  },
];

function digest(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function field(value) {
  return (BigInt(`0x${value.slice(0, 62)}`) % 21888242871839275222246405745257275088548364400416034343698204186575808495617n).toString();
}

async function verifyChainEvidence(connection, entry) {
  const parsed = await connection.getParsedTransaction(entry.signature, { commitment: "finalized", maxSupportedTransactionVersion: 0 });
  assert(parsed, `Missing finalized transaction ${entry.signature}`);
  assert.equal(parsed.meta?.err, null, `Finalized transaction ${entry.signature} has an error`);
  assert.equal(parsed.slot, entry.slot, `Slot mismatch for ${entry.signature}`);
  const programs = parsed.transaction.message.instructions
    .filter((instruction) => "programId" in instruction)
    .map((instruction) => instruction.programId.toBase58());
  assert(programs.includes(UMBRA_PROGRAM), `Umbra program was not invoked by ${entry.signature}`);
  return { signature: entry.signature, network: "solana-devnet", commitment: "finalized", slot: entry.slot, programId: UMBRA_PROGRAM, optionalDataHash: entry.optionalDataHash };
}

async function main() {
  if (!/^https:\/\//i.test(RPC_URL) || /mainnet|testnet/i.test(RPC_URL)) throw new Error("Only an HTTPS Solana Devnet RPC is permitted.");
  const connection = new Connection(RPC_URL, "finalized");
  const chainEvidence = [];
  for (const entry of EVIDENCE) chainEvidence.push(await verifyChainEvidence(connection, entry));

  const workdir = mkdtempSync(join(tmpdir(), "privatedao-payroll-devnet-e2e-"));
  let store;
  try {
    store = new PayrollStore({
      databasePath: join(workdir, "payroll.sqlite"),
      schemaPath: new URL("../migrations/20260826_confidential_payroll_devnet.sql", import.meta.url).pathname,
      verificationKeyPath: new URL("../zk/setup/private_dao_blind_payroll_vkey.json", import.meta.url).pathname,
    });
    const maker = `maker:${PAYER}`;
    const checker = `checker:${PAYER}`;
    const tenant = store.createTenant({ name: "PrivateDAO Umbra Devnet E2E", actorRef: maker });
    store.addMember({ tenantId: tenant.tenantId, actorRef: checker, role: "approver", addedBy: maker });
    const policy = store.createPolicy({ tenantId: tenant.tenantId, jurisdiction: "GENERIC-DEMO", taxYear: "2026", maxTotalCents: 10000, maxEmployeeCents: 4000, allowedAsset: "WSOL", requiredApprovers: 1, allowSelfApproval: false, actorRef: maker });
    const employees = EVIDENCE.map((entry, index) => store.addEmployee({
      tenantId: tenant.tenantId,
      employeeRefCiphertext: `ciphertext-only-demo-${index + 1}`,
      recipientAddress: entry.recipient,
      recipientCommitment: digest(`recipient-commitment:${entry.recipient}`),
      actorRef: maker,
    }));
    const items = employees.map((employee, index) => ({ employeeId: employee.employeeId, payoutId: `umbra-devnet-payout-${index + 1}`, grossCents: 3000, taxCents: 300, deductionsCents: 100, netCents: 2600, recipientCommitment: digest(`recipient-commitment:${EVIDENCE[index].recipient}`) }));
    const batch = store.createBatch({
      tenantId: tenant.tenantId,
      policyId: policy.policyId,
      idempotencyKey: `umbra-devnet-e2e-${Date.now()}`,
      manifestCommitment: digest(JSON.stringify(items)),
      batchCommitment: digest(`batch:${policy.policyHash}:${PAYER}`),
      recipientRoot: digest(EVIDENCE.map((entry) => entry.recipient).join("|")),
      grossCents: 9000,
      taxCents: 900,
      deductionsCents: 300,
      netCents: 7800,
      createdBy: maker,
      items,
    });
    for (const state of ["CALCULATED", "POLICY_CHECKED", "PENDING_APPROVAL"]) store.transition(batch.batchId, state, maker);
    store.approve(batch.batchId, checker, "approved");
    for (const state of ["SIGNING", "SETTLING"]) store.transition(batch.batchId, state, checker);
    const storedItems = store.getBatch(batch.batchId).items;
    for (const [index, item] of storedItems.entries()) {
      store.recordSettlement({ batchId: batch.batchId, itemId: item.item_id, idempotencyKey: `umbra-devnet-settlement-${index + 1}`, state: "CONFIRMED", txSignature: chainEvidence[index].signature, actorRef: checker, chainEvidence: chainEvidence[index] });
    }
    const reconciliation = store.reconcile(batch.batchId, checker);
    assert.deepEqual(reconciliation, { expectedCount: 3, confirmedCount: 3, failedCount: 0, duplicateSignatures: 0, allConfirmed: true });

    const storedBatch = store.getBatch(batch.batchId);
    const settlementRoot = sha256(JSON.stringify(storedItems.map((item, index) => ({ payoutId: item.payout_id, netCents: item.net_cents, recipientCommitment: item.recipient_commitment, txSignature: chainEvidence[index].signature }))));
    const { Poseidon } = await import("@iden3/js-crypto");
    const hash = (...values) => Poseidon.hash(values.map(BigInt)).toString();
    const payrollKey = field(String(storedBatch.batch.manifest_commitment));
    const batchKey = field(settlementRoot);
    const salt = field(policy.policyHash);
    const publicSignals = [hash(payrollKey, "1", salt), hash(batchKey, "0", payrollKey), "0", "1"];
    const { proof } = await require("../node_modules/snarkjs").groth16.fullProve({ payrollCommitment: publicSignals[0], batchCommitment: publicSignals[1], maxVariance: "0", approvedClaim: "1", payrollKey, batchKey, variance: "0", approved: "1", salt }, "zk/build/private_dao_blind_payroll_js/private_dao_blind_payroll.wasm", "zk/setup/private_dao_blind_payroll_final.zkey");
    const verification = await store.createVerification({ batchId: batch.batchId, scope: "public", expiresAt: new Date(Date.now() + 3600000).toISOString(), actorRef: checker, proof, publicSignals });
    const publicRecord = store.getVerification(verification.token);
    assert.equal(publicRecord.status, "active");
    assert.equal(publicRecord.proofType, "groth16-private-dao-blind-payroll-v1");
    assert(!JSON.stringify(publicRecord).includes("ciphertext-only"), "Public verification record leaked employee data");
    const verifiedBatch = store.getBatch(batch.batchId);
    const artifact = {
      ok: true,
      product: "confidential-payroll",
      network: "solana-devnet",
      payer: PAYER,
      umbraProgram: UMBRA_PROGRAM,
      recipientCount: 3,
      reconciliation,
      batchState: verifiedBatch.batch.state,
      proofType: verification.proofType,
      proofHash: verification.proofHash,
      settlementRoot: verification.settlementRoot,
      verificationPath: verification.verificationUrl,
      publicRecord,
      recipients: EVIDENCE.map((entry, index) => ({ recipient: entry.recipient, fundingSignature: entry.fundingSignature, registrationSignature: entry.registrationSignature, signature: entry.signature, slot: entry.slot, optionalDataHash: entry.optionalDataHash, chainEvidence: chainEvidence[index] })),
      secretsPrinted: false,
    };
    const outputDir = new URL("../docs/generated/", import.meta.url).pathname;
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(join(outputDir, "payroll-devnet-e2e-20260912.json"), `${JSON.stringify(artifact, null, 2)}\n`, { mode: 0o644 });
    console.log(JSON.stringify({ ...artifact, verificationToken: "redacted-from-console" }, null, 2));
  } finally {
    store?.db.close();
    rmSync(workdir, { recursive: true, force: true });
  }
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
