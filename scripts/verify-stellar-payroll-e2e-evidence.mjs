import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const evidence = JSON.parse(await readFile("docs/evidence/stellar-testnet-payroll-e2e.json", "utf8"));
assert.equal(evidence.schema, "privatedao.stellar-testnet-payroll-e2e.v1");
assert.equal(evidence.network, "stellar-testnet");
assert.equal(evidence.environment, "testnet");
assert.equal(evidence.broadcastExecuted, true);
assert.equal(evidence.receiptState, "confirmed");
assert.match(evidence.transactionHash, /^[a-f0-9]{64}$/i);
assert.match(String(evidence.ledger), /^\d+$/);
assert.match(evidence.signerPublicKey, /^G[A-Z2-7]{55}$/);
assert.match(evidence.recipient, /^G[A-Z2-7]{55}$/);
assert.equal(evidence.workflow?.policyCommitment?.length, 64);
console.log(JSON.stringify({
  schema: evidence.schema,
  network: evidence.network,
  capability: "payroll.settle",
  state: evidence.receiptState,
  transactionHash: evidence.transactionHash,
  ledger: evidence.ledger,
}, null, 2));
