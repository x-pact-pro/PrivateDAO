import crypto from "node:crypto";
import { getCollateralAndVerify } from "@phala/dcap-qvl";

const paymentId = String(process.env.PAYMENT_ID || "").trim();
const settlementSignature = String(process.env.SETTLEMENT_SIGNATURE || "").trim();
if (!/^[a-f0-9]{64}$/.test(paymentId)) throw new Error("PAYMENT_ID must be a 64-character x402 payment id");
if (!/^[1-9A-HJ-NP-Za-km-z]{80,100}$/.test(settlementSignature)) throw new Error("SETTLEMENT_SIGNATURE must be a Solana signature");

const challenge = crypto.createHash("sha512")
  .update(`privatepay-attestation-v1:${paymentId}:${settlementSignature}`)
  .digest();
const teeRpc = String(process.env.TEE_RPC || "https://mainnet-tee.magicblock.app").replace(/\/$/, "");
const response = await fetch(`${teeRpc}/quote?challenge=${encodeURIComponent(challenge.toString("base64"))}`);
const body = await response.json().catch(() => ({}));
if (!response.ok || !body.quote) throw new Error(`TEE quote request failed (${response.status})`);

const rawQuote = Buffer.from(body.quote, "base64");
const verified = await getCollateralAndVerify(rawQuote);
const td = verified.report.asTd10?.() || verified.report.asTd15?.()?.base;
if (!td) throw new Error("TEE quote is not a TDX report");
const reportData = Buffer.from(td.reportData);

console.log(JSON.stringify({
  readOnly: true,
  teeRpc,
  paymentId,
  settlementSignature,
  quoteHttpStatus: response.status,
  quoteBytes: rawQuote.length,
  quoteSha256: crypto.createHash("sha256").update(rawQuote).digest("hex"),
  tcbStatus: verified.status,
  challengeBytes: challenge.length,
  challengeBound: reportData.equals(challenge),
  debugBit: (td.tdAttributes[0] & 0x01) === 1,
  limitation: "The quote proves a fresh TDX challenge response, but does not by itself prove that the quoted TEE executed this payment.",
}, null, 2));
