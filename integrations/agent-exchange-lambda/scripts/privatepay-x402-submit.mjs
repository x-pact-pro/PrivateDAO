import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { encodePaymentSignatureHeader } from "@x402/core/http";
import { readFile } from "node:fs/promises";
import crypto from "node:crypto";
import { TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import nacl from "tweetnacl";

const artifact = JSON.parse(
  process.env.PRIVATEPAY_X402_ARTIFACT_JSON ||
    await readFile(process.env.PRIVATEPAY_X402_ARTIFACT_PATH || "output/privatepay/x402-payment-unsigned.json", "utf8"),
);
const paymentPayload = JSON.parse(process.env.PRIVATEPAY_X402_PAYMENT_PAYLOAD_JSON || "{}");
if (artifact.signed || artifact.broadcast) throw new Error("Artifact metadata must remain unsigned and unbroadcast before local submission");
if (paymentPayload.x402Version !== 2 || !paymentPayload.accepted || typeof paymentPayload.payload?.paymentId !== "string" || typeof paymentPayload.payload?.transaction !== "string")
  throw new Error("Invalid x402 payment payload");
const required = artifact.paymentRequired.accepts?.[0];
if (paymentPayload.payload.paymentId !== required?.extra?.paymentId || paymentPayload.payload.paymentId !== artifact.paymentId)
  throw new Error("Payment payload checkout id does not match the inspected artifact");
const expiresAt = required?.extra?.expiresAt;
if (typeof expiresAt !== "string" || !Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now())
  throw new Error("x402 challenge has expired; generate a fresh artifact before signing");
const accepted = paymentPayload.accepted;
const requiredResource = artifact.paymentRequired.resource;
const suppliedResource = paymentPayload.resource;
const sameResource = requiredResource && suppliedResource &&
  suppliedResource.url === requiredResource.url &&
  suppliedResource.description === requiredResource.description &&
  suppliedResource.mimeType === requiredResource.mimeType;
if (!sameResource)
  throw new Error("Payment payload resource does not match the inspected artifact");
const acceptedFields = ["scheme", "network", "amount", "asset", "payTo", "maxTimeoutSeconds"];
for (const field of acceptedFields) {
  if (accepted[field] !== required?.[field]) throw new Error(`Payment requirements changed: ${field}`);
}
const acceptedExtraFields = ["paymentId", "payer", "merchantId", "resource", "cluster", "recentBlockhash", "lastValidBlockHeight", "expiresAt"];
for (const field of acceptedExtraFields) {
  if (accepted.extra?.[field] !== required?.extra?.[field]) throw new Error(`Payment requirements changed: extra.${field}`);
}
const unsignedTransaction = VersionedTransaction.deserialize(Buffer.from(artifact.transactionBase64, "base64"));
const signedTransaction = VersionedTransaction.deserialize(Buffer.from(paymentPayload.payload.transaction, "base64"));
const unsignedMessage = unsignedTransaction.message.serialize();
const signedMessage = signedTransaction.message.serialize();
const instructionFingerprint = (message) => {
  const decompiled = TransactionMessage.decompile(message);
  return decompiled.instructions.map((instruction) => ({
    programId: instruction.programId.toBase58(),
    keys: instruction.keys.map((key) => ({ pubkey: key.pubkey.toBase58(), isSigner: key.isSigner, isWritable: key.isWritable })),
    data: Buffer.from(instruction.data).toString("base64"),
  }));
};
const unsignedFingerprint = instructionFingerprint(unsignedTransaction.message);
const signedFingerprint = instructionFingerprint(signedTransaction.message);
const sameInstructions = JSON.stringify(unsignedFingerprint) === JSON.stringify(signedFingerprint);
const sameBlockhash = unsignedTransaction.message.recentBlockhash === signedTransaction.message.recentBlockhash;
const sameSignerCount = unsignedTransaction.message.header.numRequiredSignatures === signedTransaction.message.header.numRequiredSignatures;
const sameFeePayer = unsignedTransaction.message.staticAccountKeys[0]?.toBase58() === signedTransaction.message.staticAccountKeys[0]?.toBase58();
if (!sameInstructions || !sameBlockhash || !sameSignerCount || !sameFeePayer) {
  const details = {
    unsignedMessageSha256: crypto.createHash("sha256").update(unsignedMessage).digest("hex"),
    signedMessageSha256: crypto.createHash("sha256").update(signedMessage).digest("hex"),
    unsignedBlockhash: unsignedTransaction.message.recentBlockhash,
    signedBlockhash: signedTransaction.message.recentBlockhash,
    sameSignerCount,
    sameFeePayer,
    unsignedInstructionCount: unsignedFingerprint.length,
    signedInstructionCount: signedFingerprint.length,
  };
  throw new Error(`Signed transaction changes payment semantics (${JSON.stringify(details)})`);
}
const payerIndex = signedTransaction.message.staticAccountKeys.findIndex((key) => key.toBase58() === artifact.payer);
if (payerIndex < 0 || !signedTransaction.signatures[payerIndex] || signedTransaction.signatures[payerIndex].every((byte) => byte === 0))
  throw new Error("Signed transaction does not contain a payer signature");
if (!nacl.sign.detached.verify(signedMessage, signedTransaction.signatures[payerIndex], signedTransaction.message.staticAccountKeys[payerIndex].toBytes()))
  throw new Error("Payer signature does not verify against the inspected transaction message");

const client = new SecretsManagerClient({ region: process.env.AWS_REGION || "eu-north-1" });
const secretResponse = await client.send(new GetSecretValueCommand({ SecretId: process.env.PRIVATEPAY_SECRET_ID || "pdao/agent-exchange/privatepay-production" }));
const secret = JSON.parse(secretResponse.SecretString || "{}");
if (!secret.PRIVATEPAY_FACILITATOR_API_KEY || !secret.PRIVATEPAY_MERCHANT_ID) throw new Error("PrivatePAY merchant credentials are incomplete");
const response = await fetch(`https://payments.magicblock.app/v1/x402/payments/${artifact.paymentId}/pay`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    authorization: `Bearer ${secret.PRIVATEPAY_FACILITATOR_API_KEY}`,
    "x-merchant-id": secret.PRIVATEPAY_MERCHANT_ID,
    "payment-signature": encodePaymentSignatureHeader(paymentPayload),
  },
  body: "{}",
});
const body = await response.json().catch(() => ({}));
let verificationProbe = null;
if (response.status === 400 && body?.error?.code === "INVALID_PAYMENT_CREDENTIAL") {
  const verifyResponse = await fetch("https://payments.magicblock.app/v1/x402/verify", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${secret.PRIVATEPAY_FACILITATOR_API_KEY}`,
      "x-merchant-id": secret.PRIVATEPAY_MERCHANT_ID,
    },
    body: JSON.stringify({
      x402Version: 2,
      paymentPayload,
      paymentRequirements: accepted,
    }),
  });
  verificationProbe = {
    status: verifyResponse.status,
    body: await verifyResponse.json().catch(() => ({})),
  };
}
console.log(JSON.stringify({
  status: response.status,
  paymentId: artifact.paymentId,
  paymentResponse: response.headers.get("payment-response"),
  body,
  verificationProbe,
}, null, 2));
