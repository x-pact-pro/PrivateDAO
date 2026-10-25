import crypto from "node:crypto";
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({ region: process.env.AWS_REGION || "eu-north-1" });
const response = await client.send(new GetSecretValueCommand({
  SecretId: process.env.PRIVATEPAY_SECRET_ID || "pdao/agent-exchange/privatepay-production",
}));
const secret = JSON.parse(response.SecretString || "{}");
if (!secret.PRIVATEPAY_FACILITATOR_API_KEY || !secret.PRIVATEPAY_MERCHANT_ID)
  throw new Error("PrivatePAY merchant credentials are incomplete");

const payer = process.env.PRIVATEPAY_TEST_PAYER || "BkNcuvQZr6392aZCwcGnB6SQptV6vhWa7syJs5fgLz6";
const externalReference = process.env.PRIVATEPAY_EXTERNAL_REFERENCE || `privatepay-conformance-${Date.now()}`;
const headers = {
  "content-type": "application/json",
  authorization: `Bearer ${secret.PRIVATEPAY_FACILITATOR_API_KEY}`,
  "x-merchant-id": secret.PRIVATEPAY_MERCHANT_ID,
};
const body = {
  amount: "500000",
  cluster: "mainnet-private",
  description: "PrivatePAY conformance checkout",
  resource: "https://agents.privatedao.org/api/privatepay/conformance",
  requestHash: crypto.createHash("sha256").update(externalReference).digest("hex"),
  expiresInSeconds: 600,
  payer,
  externalReference,
};

const create = await fetch("https://payments.magicblock.app/v1/payments", {
  method: "POST",
  headers,
  body: JSON.stringify(body),
});
const created = await create.json().catch(() => ({}));
const payment = created.payment && typeof created.payment === "object" ? created.payment : created;
const paymentId = payment.id || payment.paymentId || "";
const output = {
  createStatus: create.status,
  credentialsAccepted: create.status !== 401,
  paymentIdFormat: /^[a-f0-9]{64}$/.test(String(paymentId)),
  paymentId: paymentId || null,
  providerStatus: payment.status || created.status || null,
  responseKeys: Object.keys(created),
  paymentKeys: Object.keys(payment),
  merchantId: payment.merchantId || null,
  recipient: payment.recipient || null,
  cluster: payment.cluster || null,
  mint: payment.mint || null,
};

const deposit = await fetch("https://payments.magicblock.app/v1/spl/deposit", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    owner: payment.merchantId || "",
    mint: payment.mint || "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    amount: 1,
    cluster: payment.cluster || "mainnet-private",
    initIfMissing: false,
    initVaultIfMissing: false,
    initAtasIfMissing: false,
    idempotent: true,
  }),
});
const depositBody = await deposit.json().catch(() => ({}));
output.merchantDepositBuilder = {
  status: deposit.status,
  kind: depositBody.kind || null,
  sendTo: depositBody.sendTo || null,
  requiredSigners: Array.isArray(depositBody.requiredSigners) ? depositBody.requiredSigners.length : null,
  hasTransaction: Boolean(depositBody.transactionBase64),
};

if (paymentId) {
  const challenge = await fetch(`https://payments.magicblock.app/v1/x402/payments/${paymentId}/pay`, {
    method: "POST",
    headers,
    body: "{}",
  });
  const paymentRequired = challenge.headers.get("payment-required");
  const challengeBody = await challenge.json().catch(() => ({}));
  output.challengeStatus = challenge.status;
  output.paymentRequiredHeaderPresent = Boolean(paymentRequired);
  output.paymentRequiredHeaderLength = paymentRequired.length;
  output.challengeRequest = {
    method: "POST",
    url: `/v1/x402/payments/${paymentId}/pay`,
    retryWith: "PAYMENT-SIGNATURE",
  };
  output.challengeBodyKeys = Object.keys(challengeBody);
  output.challengeErrorCode = challengeBody?.error?.code || challengeBody?.code || null;
  output.challengeErrorMessage = challengeBody?.error?.message || challengeBody?.message || null;
  output.challengePaymentStatus = challengeBody?.payment?.status || challengeBody?.status || null;
}

console.log(JSON.stringify(output, null, 2));
