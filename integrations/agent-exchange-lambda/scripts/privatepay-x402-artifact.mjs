import crypto from "node:crypto";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";

const apiBase = process.env.PRIVATEPAY_API_BASE || "https://payments.magicblock.app";
const outputPath = resolve(process.env.PRIVATEPAY_X402_ARTIFACT_OUTPUT || "output/privatepay/x402-payment-unsigned.json");
const payer = process.env.PRIVATEPAY_TEST_PAYER || "BkNcuvQZr6392aZCwcGnB6SQptV6vhWa7syJs5fgLz6";
const externalReference = process.env.PRIVATEPAY_EXTERNAL_REFERENCE || `privatepay-x402-${Date.now()}`;
const client = new SecretsManagerClient({ region: process.env.AWS_REGION || "eu-north-1" });
const secretResponse = await client.send(new GetSecretValueCommand({
  SecretId: process.env.PRIVATEPAY_SECRET_ID || "pdao/agent-exchange/privatepay-production",
}));
const secret = JSON.parse(secretResponse.SecretString || "{}");
if (!secret.PRIVATEPAY_FACILITATOR_API_KEY || !secret.PRIVATEPAY_MERCHANT_ID)
  throw new Error("PrivatePAY merchant credentials are incomplete");

const headers = {
  "content-type": "application/json",
  authorization: `Bearer ${secret.PRIVATEPAY_FACILITATOR_API_KEY}`,
  "x-merchant-id": secret.PRIVATEPAY_MERCHANT_ID,
};
const amount = process.env.PRIVATEPAY_X402_AMOUNT || "500000";
const resource = process.env.PRIVATEPAY_X402_RESOURCE || "https://agents.privatedao.org/api/privatepay/conformance";
const requestHash = crypto.createHash("sha256").update(externalReference).digest("hex");
const create = await fetch(`${apiBase}/v1/payments`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    amount,
    cluster: "mainnet-private",
    description: "PrivatePAY x402 Mainnet conformance payment",
    resource,
    requestHash,
    expiresInSeconds: 600,
    payer,
    externalReference,
  }),
});
const created = await create.json().catch(() => ({}));
if (!create.ok) throw new Error(`Payment creation failed (${create.status})`);
const payment = created.payment && typeof created.payment === "object" ? created.payment : created;
const paymentId = String(payment.id || "");
if (!/^[a-f0-9]{64}$/.test(paymentId)) throw new Error("Provider returned an invalid payment id");

const challenge = await fetch(`${apiBase}/v1/x402/payments/${paymentId}/pay`, {
  method: "POST",
  headers,
  body: "{}",
});
const paymentRequiredHeader = challenge.headers.get("payment-required") || "";
if (challenge.status !== 402 || !paymentRequiredHeader) throw new Error(`Expected x402 challenge, got HTTP ${challenge.status}`);
const paymentRequired = JSON.parse(Buffer.from(paymentRequiredHeader, "base64url").toString("utf8"));
const accepted = paymentRequired.accepts?.[0];
const transactionBase64 = accepted?.extra?.transaction;
if (paymentRequired.x402Version !== 2 || accepted?.scheme !== "exact-magicblock" || typeof transactionBase64 !== "string")
  throw new Error("Provider returned an invalid exact-magicblock challenge");

const artifact = {
  createdAt: new Date().toISOString(),
  paymentId,
  externalReference,
  payer,
  cluster: payment.cluster || "mainnet-private",
  mint: payment.mint || accepted.asset,
  amountBaseUnits: accepted.amount,
  paymentRequired,
  transactionBase64,
  signed: false,
  broadcast: false,
};
await mkdir(resolve(outputPath, ".."), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, { mode: 0o600 });
await chmod(outputPath, 0o600);
console.log(JSON.stringify({ outputPath, paymentId, payer, amountBaseUnits: accepted.amount, challengeStatus: challenge.status, signed: false, broadcast: false }, null, 2));
