import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const path = process.argv[2] || "docs/evidence/zcash-testnet-e2e-20261010.json";
const evidence = JSON.parse(await readFile(path, "utf8"));
assert.equal(evidence.schema, "privatedao.zcash-testnet-network-e2e.v1");
assert.equal(evidence.network, "zcash-testnet");
assert.equal(evidence.environment, "testnet");
assert.equal(evidence.productLanesProven, false);
assert.equal(evidence.state, "finalized");
assert.equal(evidence.proof.broadcast, true);
assert.equal(evidence.proof.onchain, true);
assert.equal(evidence.receipt.confirmationVerified, true);
assert.equal(evidence.receipt.walletObserved, true);
assert.equal(evidence.reconciliation.status, "reconciled");
assert.match(evidence.signature, /^[0-9a-f]{64}$/);
assert.match(evidence.funding.signature, /^[0-9a-f]{64}$/);
console.log(JSON.stringify({ status: "PASS", network: evidence.network, evidenceClass: evidence.evidenceClass, productLanesProven: evidence.productLanesProven }, null, 2));
