import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  InMemoryProviderRegistry,
  STELLAR_NETWORK_CONFIGS,
  StellarHorizonTransport,
  StellarNetworkAdapter,
  createPrivateDaoRuntime,
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
const digest = "b".repeat(64);
const transport = new StellarHorizonTransport(fetch, undefined, false);
const adapter = new StellarNetworkAdapter({
  id: "stellar-payroll-kernel-test",
  config: STELLAR_NETWORK_CONFIGS[0],
  capabilities: ["payroll.settle"],
  transport,
});
const providers = new InMemoryProviderRegistry();
providers.register(adapter);
const runtime = createPrivateDaoRuntime(providers);

const intent = {
  context: {
    requestId: "stellar-payroll-kernel-test",
    idempotencyKey: "stellar-payroll-kernel-test",
    product: "payroll",
    capability: "payroll.settle",
    actorId: "stellar-kernel-test",
    network: "stellar-testnet",
  },
  payload: {
    kind: "stellar-payroll-settlement",
    recipients: [{ destination: recipient, amount: "0.0000010" }],
    totalAmount: "0.0000010",
    memo: "PDAO-KERNEL-PAYROLL",
    workflow: {
      workflowId: "stellar-testnet:payroll.settle:kernel-prep",
      inputCommitment: digest,
      policyCommitment: digest,
    },
  },
  accounts: [{ role: "payer", address: publicKey, network: "stellar-testnet" }],
};

const prepared = await runtime.gateway.prepare(intent, "maker");
assert.equal(prepared.intent.context.capability, "payroll.settle");
assert.equal(prepared.unsignedPayload.transactionKind, "payroll-settlement");
const transaction = TransactionBuilder.fromXDR(prepared.unsignedPayload.transactionXdr, Networks.TESTNET);
assert.equal(transaction.operations.length, 1);
transaction.sign(signer);

await assert.rejects(
  () => runtime.gateway.submit(prepared, {
    kind: "stellar-signed-xdr",
    network: "stellar-testnet",
    signedTransactionXdr: transaction.toXDR(),
  }, "maker"),
  (error) => error?.details?.cause === "Stellar broadcast is disabled; no transaction was sent.",
);

console.log(`STELLAR_PAYROLL_KERNEL: PASS provider=${adapter.id} prepared=1 signed_xdr=1 broadcast=disabled`);
