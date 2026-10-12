import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  STELLAR_NETWORK_CONFIGS,
  StellarHorizonTransport,
  StellarNetworkAdapter,
} from "../packages/privatedao-runtime/src/index.ts";

const originalBroadcast = process.env.PDAO_STELLAR_TESTNET_BROADCAST_ENABLED;
const originalApproval = process.env.PDAO_STELLAR_TESTNET_E2E_APPROVED;
for (const [broadcast, approval, expected] of [
  [undefined, undefined, false],
  ["1", undefined, false],
  [undefined, "1", false],
  ["1", "1", true],
]) {
  if (broadcast === undefined) delete process.env.PDAO_STELLAR_TESTNET_BROADCAST_ENABLED;
  else process.env.PDAO_STELLAR_TESTNET_BROADCAST_ENABLED = broadcast;
  if (approval === undefined) delete process.env.PDAO_STELLAR_TESTNET_E2E_APPROVED;
  else process.env.PDAO_STELLAR_TESTNET_E2E_APPROVED = approval;
  assert.equal(new StellarHorizonTransport(fetch).broadcastEnabled, expected);
}
if (originalBroadcast === undefined) delete process.env.PDAO_STELLAR_TESTNET_BROADCAST_ENABLED;
else process.env.PDAO_STELLAR_TESTNET_BROADCAST_ENABLED = originalBroadcast;
if (originalApproval === undefined) delete process.env.PDAO_STELLAR_TESTNET_E2E_APPROVED;
else process.env.PDAO_STELLAR_TESTNET_E2E_APPROVED = originalApproval;

const envFile = process.env.PDAO_STELLAR_TESTNET_SIGNER_ENV_FILE;
if (!envFile) {
  console.log("STELLAR_SIGNER_BOUNDARY: PASS config_gate=dual-approval signer=SKIP broadcast=disabled");
  process.exit(0);
}

const values = Object.fromEntries(readFileSync(envFile, "utf8").split(/\r?\n/)
  .map((line) => line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/))
  .filter(Boolean)
  .map((match) => [match[1], match[2].trim()]));
const publicKey = values.STELLAR_TESTNET_PUBLIC_KEY;
const secretKey = values.STELLAR_TESTNET_SECRET_KEY;
assert.match(publicKey || "", /^G[A-Z2-7]{55}$/);
assert.match(secretKey || "", /^S[A-Z2-7]{55}$/);

const { Keypair, TransactionBuilder } = await import("@stellar/stellar-sdk");
const keypair = Keypair.fromSecret(secretKey);
assert.equal(keypair.publicKey(), publicKey, "signer public key does not match vault metadata");

const transport = new StellarHorizonTransport(fetch, undefined, false);
const adapter = new StellarNetworkAdapter({
  id: "stellar-signer-boundary",
  config: STELLAR_NETWORK_CONFIGS[0],
  capabilities: ["treasury.policy.check"],
  transport,
});
const prepared = await adapter.prepare({
  context: {
    requestId: "stellar-signer-boundary",
    idempotencyKey: "stellar-signer-boundary",
    product: "treasury",
    capability: "treasury.policy.check",
    network: "stellar-testnet",
  },
  payload: { kind: "stellar-payment", destination: publicKey, amount: "0.000001", memo: "PDAO-SIGN-CHECK" },
  accounts: [{ role: "payer", address: publicKey, network: "stellar-testnet" }],
});
const unsigned = prepared.unsignedPayload;
assert.equal(typeof unsigned.transactionXdr, "string");
const transaction = TransactionBuilder.fromXdr(unsigned.transactionXdr, "Test SDF Network ; September 2015");
transaction.sign(keypair);
const signedTransactionXdr = transaction.toXDR();
assert.ok(signedTransactionXdr.length > unsigned.transactionXdr.length);

await assert.rejects(
  () => adapter.submit(prepared, { kind: "stellar-signed-xdr", network: "stellar-testnet", signedTransactionXdr }),
  /broadcast is disabled/i,
);

console.log(`STELLAR_SIGNER_BOUNDARY: PASS public_key=${publicKey} signed_xdr=1 broadcast=disabled`);
