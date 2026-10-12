import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  STELLAR_NETWORK_CONFIGS,
  StellarHorizonTransport,
  StellarNetworkAdapter,
} from "../packages/privatedao-runtime/src/index.ts";

const envFile = process.env.PDAO_STELLAR_TESTNET_SIGNER_ENV_FILE;
if (!envFile) throw new Error("PDAO_STELLAR_TESTNET_SIGNER_ENV_FILE is required.");
const values = Object.fromEntries((await readFile(envFile, "utf8")).split(/\r?\n/)
  .map((line) => line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/))
  .filter(Boolean)
  .map((match) => [match[1], match[2].trim()]));
const publicKey = values.STELLAR_TESTNET_PUBLIC_KEY;
const secretKey = values.STELLAR_TESTNET_SECRET_KEY;
if (!publicKey || !secretKey) throw new Error("Stellar signer file is missing signer material.");

const { Keypair, Networks, TransactionBuilder } = await import("@stellar/stellar-sdk");
const signer = Keypair.fromSecret(secretKey);
assert.equal(signer.publicKey(), publicKey, "Stellar signer identity mismatch.");
const recipient = Keypair.random().publicKey();
const secondRecipient = Keypair.random().publicKey();
const transport = new StellarHorizonTransport(fetch, undefined, false);
const adapter = new StellarNetworkAdapter({
  id: "stellar-payroll-preparation",
  config: STELLAR_NETWORK_CONFIGS[0],
  capabilities: ["payroll.settle"],
  transport,
});

const digest = "a".repeat(64);
const intent = {
  context: {
    requestId: "stellar-payroll-preparation",
    idempotencyKey: "stellar-payroll-preparation",
    product: "payroll",
    capability: "payroll.settle",
    network: "stellar-testnet",
  },
  payload: {
    kind: "stellar-payroll-settlement",
    recipients: [
      { destination: recipient, amount: "0.0000010" },
      { destination: secondRecipient, amount: "0.0000020" },
    ],
    totalAmount: "0.0000030",
    memo: "PDAO-PAYROLL-PREP",
    workflow: { workflowId: "stellar-testnet:payroll.settle:prep", inputCommitment: digest, policyCommitment: digest },
  },
  accounts: [{ role: "payer", address: publicKey, network: "stellar-testnet" }],
};

const prepared = await adapter.prepare(intent);
assert.equal(prepared.unsignedPayload.transactionKind, "payroll-settlement");
assert.equal(typeof prepared.unsignedPayload.transactionXdr, "string");
const transaction = TransactionBuilder.fromXDR(prepared.unsignedPayload.transactionXdr, Networks.TESTNET);
assert.equal(transaction.operations.length, 2);
transaction.sign(signer);
assert.ok(transaction.toXDR().length > prepared.unsignedPayload.transactionXdr.length);

await assert.rejects(
  () => adapter.prepare({ ...intent, context: { ...intent.context, requestId: "stellar-payroll-bad-total", idempotencyKey: "stellar-payroll-bad-total" }, payload: { ...intent.payload, totalAmount: "0.0000040" } }),
  /totalAmount does not match recipient amounts/,
);
await assert.rejects(
  () => adapter.submit(prepared, { kind: "stellar-signed-xdr", network: "stellar-testnet", signedTransactionXdr: transaction.toXDR() }),
  /broadcast is disabled/,
);

console.log(`STELLAR_PAYROLL_SETTLEMENT_PREP: PASS signer=${publicKey} operations=2 signed_xdr=1 broadcast=disabled`);
