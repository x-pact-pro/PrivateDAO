import assert from "node:assert/strict";
import {
  STELLAR_NETWORK_CONFIGS,
  StellarHorizonTransport,
  StellarNetworkAdapter,
  STELLAR_KERNEL_CAPABILITIES,
} from "../packages/privatedao-runtime/src/index.ts";

const txHash = "591cb9a2bd0eba190a532b6592a7b277e6a24d84d7966d9b98c485dca1e0b769";
const knownAccount = "GBBDH5SMLNRE5FSPNEGISMWSSZBV7OE4L5DUC7BRTWJCJSVYDODJK32L";
const horizon = process.env.PDAO_STELLAR_TESTNET_HORIZON_URL?.replace(/\/$/, "") || "https://horizon-testnet.stellar.org";
const config = STELLAR_NETWORK_CONFIGS[0];
const capabilities = STELLAR_KERNEL_CAPABILITIES;

const transport = new StellarHorizonTransport(fetch, horizon);
const adapter = new StellarNetworkAdapter({ id: "test-stellar", config, capabilities, transport });
const health = await transport.health();
assert.equal(health.ok, true, `Stellar Horizon health failed: ${health.reason || "unknown"}`);
assert.equal(health.network, "stellar-testnet");
const recoveredAccount = await adapter.recoverAccount(knownAccount);
assert.equal(recoveredAccount.publicKey, knownAccount);
assert.equal(recoveredAccount.network, "stellar-testnet");
assert.match(recoveredAccount.sequence, /^\d+$/);
assert.ok(recoveredAccount.balances.length > 0);

const response = await fetch(`${horizon}/transactions/${txHash}`, { headers: { Accept: "application/json" } });
assert.equal(response.ok, true, `Known Stellar evidence transaction HTTP ${response.status}`);
const transaction = await response.json();
assert.equal(transaction.hash, txHash);
assert.equal(transaction.successful, true);
assert.equal(typeof transaction.ledger, "number");

for (const capability of capabilities) {
  const prepared = await adapter.prepare({
    context: {
      requestId: `stellar-test-${capability}`,
      idempotencyKey: `stellar-test-${capability}`,
      product: capability.startsWith("verification") ? (capability === "verification.blind.prove" ? "blind-verification" : "record-verification") : capability.startsWith("payroll") ? "payroll" : capability.startsWith("treasury") ? "treasury" : capability.startsWith("governance") ? "governance" : "auction",
      capability,
      network: "stellar-testnet",
    },
    payload: { kind: "readiness-probe", capability },
    accounts: [],
  });
  assert.equal(prepared.state, "awaiting_signature");
  assert.equal(prepared.unsignedPayload.network, "stellar-testnet");
}

const commitment = "a".repeat(64);
function workflowFor(capability) {
  const workflow = { workflowId: `readiness:${capability}`, inputCommitment: commitment };
  if (["payroll.calculate", "payroll.approve", "treasury.policy.check", "governance.proposal.execute"].includes(capability)) workflow.policyCommitment = commitment;
  if (capability === "auction.settle") workflow.outcomeCommitment = commitment;
  return workflow;
}
for (const capability of capabilities) {
  const product = capability.startsWith("verification") ? (capability === "verification.blind.prove" ? "blind-verification" : "record-verification") : capability.startsWith("payroll") ? "payroll" : capability.startsWith("treasury") ? "treasury" : capability.startsWith("governance") ? "governance" : "auction";
  const transactionPrepared = await adapter.prepare({
    context: { requestId: `stellar-payment-xdr-${capability}`, idempotencyKey: `stellar-payment-xdr-${capability}`, product, capability, network: "stellar-testnet" },
    payload: { kind: "stellar-payment", destination: knownAccount, amount: "0.000001", memo: `PDAO-${product.slice(0, 16)}`, workflow: workflowFor(capability) },
    accounts: [{ role: "payer", address: knownAccount, network: "stellar-testnet" }],
  });
  assert.equal(transactionPrepared.unsignedPayload.transactionKind, "payment");
  assert.equal(typeof transactionPrepared.unsignedPayload.transactionXdr, "string");
  assert.ok(transactionPrepared.unsignedPayload.transactionXdr.length > 100);
}

await assert.rejects(
  () => adapter.prepare({
    context: { requestId: "wrong-network", idempotencyKey: "wrong-network", product: "treasury", capability: "treasury.policy.check", network: "ethereum-sepolia" },
    payload: {},
    accounts: [],
  }),
  /different network|targets a different network/i,
);

const prepared = await adapter.prepare({
  context: { requestId: "broadcast-guard", idempotencyKey: "broadcast-guard", product: "treasury", capability: "treasury.policy.check", network: "stellar-testnet" },
  payload: {},
  accounts: [],
});
assert.equal((await adapter.status(prepared.executionId)).state, "awaiting_signature");
await transport.observeConfirmedTransaction(prepared.executionId, txHash);
assert.equal((await adapter.status(prepared.executionId)).state, "confirmed");
const receipt = await adapter.receipt(prepared.executionId);
assert.equal(receipt.state, "confirmed");
assert.equal(receipt.signatures[0], txHash);

const receiptWorkflow = {
  workflowId: "readiness:receipt-binding",
  inputCommitment: commitment,
  policyCommitment: commitment,
};
const receiptWorkflowPrepared = await adapter.prepare({
  context: { requestId: "receipt-binding", idempotencyKey: "receipt-binding", product: "treasury", capability: "treasury.policy.check", network: "stellar-testnet" },
  payload: { kind: "stellar-payment", destination: knownAccount, amount: "0.000001", memo: "PDAO-RECEIPT", workflow: receiptWorkflow },
  accounts: [{ role: "payer", address: knownAccount, network: "stellar-testnet" }],
});
await transport.observeConfirmedTransaction(receiptWorkflowPrepared.executionId, txHash);
const workflowReceipt = await adapter.receipt(receiptWorkflowPrepared.executionId);
assert.deepEqual(workflowReceipt.metadata, {
  workflowId: receiptWorkflow.workflowId,
  inputCommitment: receiptWorkflow.inputCommitment,
  policyCommitment: receiptWorkflow.policyCommitment,
});
assert.equal(Object.keys(workflowReceipt.metadata || {}).some((key) => /payload|salary|amount|recipient|address|private|secret/i.test(key)), false);

await assert.rejects(
  () => adapter.prepare({
    context: { requestId: "wrong-account-network", idempotencyKey: "wrong-account-network", product: "treasury", capability: "treasury.policy.check", network: "stellar-testnet" },
    payload: {},
    accounts: [{ role: "payer", address: "GTEST", network: "ethereum-sepolia" }],
  }),
  /different network/i,
);

await assert.rejects(
  async () => adapter.submit(await adapter.prepare({
    context: { requestId: "broadcast-guard-2", idempotencyKey: "broadcast-guard-2", product: "treasury", capability: "treasury.policy.check", network: "stellar-testnet" },
    payload: {},
    accounts: [],
  }), { kind: "stellar-signed-xdr", network: "stellar-testnet", signedTransactionXdr: "redacted-test-payload" }),
  /broadcast is disabled/i,
);

console.log(`[stellar-kernel] PASS health=1 recovery=1 known_tx=1 ledger=${transaction.ledger} product_capabilities=${capabilities.length} workflow_xdr=${capabilities.length} receipt=1 broadcast=disabled`);
