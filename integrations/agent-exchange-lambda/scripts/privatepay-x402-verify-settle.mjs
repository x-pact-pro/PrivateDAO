import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { readFile } from "node:fs/promises";

const artifactPath = process.env.PRIVATEPAY_X402_ARTIFACT_PATH || "output/privatepay/x402-payment-unsigned.json";
const artifact = JSON.parse(await readFile(artifactPath, "utf8"));
const paymentPayload = JSON.parse(process.env.PRIVATEPAY_X402_PAYMENT_PAYLOAD_JSON || "{}");
if (paymentPayload.x402Version !== 2 || !paymentPayload.accepted || typeof paymentPayload.payload?.transaction !== "string")
  throw new Error("Invalid x402 payment payload");
if (paymentPayload.accepted.extra?.paymentId !== artifact.paymentId)
  throw new Error("Payment payload is not bound to the inspected artifact");

const client = new SecretsManagerClient({ region: process.env.AWS_REGION || "eu-north-1" });
const secretResponse = await client.send(new GetSecretValueCommand({ SecretId: process.env.PRIVATEPAY_SECRET_ID || "pdao/agent-exchange/privatepay-production" }));
const secret = JSON.parse(secretResponse.SecretString || "{}");
if (!secret.PRIVATEPAY_FACILITATOR_API_KEY || !secret.PRIVATEPAY_MERCHANT_ID) throw new Error("PrivatePAY merchant credentials are incomplete");

const headers = {
  "content-type": "application/json",
  authorization: `Bearer ${secret.PRIVATEPAY_FACILITATOR_API_KEY}`,
  "x-merchant-id": secret.PRIVATEPAY_MERCHANT_ID,
};
const body = {
  x402Version: 2,
  paymentPayload,
  paymentRequirements: artifact.paymentRequired.accepts[0],
};
const base = process.env.PRIVATEPAY_API_BASE || "https://payments.magicblock.app";
const verifyResponse = await fetch(`${base}/v1/x402/verify`, { method: "POST", headers, body: JSON.stringify(body) });
const verify = await verifyResponse.json().catch(() => ({}));
if (!verifyResponse.ok || verify.isValid !== true) {
  console.log(JSON.stringify({ paymentId: artifact.paymentId, verifyHttpStatus: verifyResponse.status, verify }, null, 2));
  process.exitCode = 2;
} else {
  const settleResponse = await fetch(`${base}/v1/x402/settle`, { method: "POST", headers, body: JSON.stringify(body) });
  const settle = await settleResponse.json().catch(() => ({}));
  console.log(JSON.stringify({
    paymentId: artifact.paymentId,
    verifyHttpStatus: verifyResponse.status,
    verify,
    settleHttpStatus: settleResponse.status,
    settle,
    paymentResponse: settleResponse.headers.get("payment-response"),
  }, null, 2));
  if (!settleResponse.ok || settle.success !== true) process.exitCode = 3;
}
