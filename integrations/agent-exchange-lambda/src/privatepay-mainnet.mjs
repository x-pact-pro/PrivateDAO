import { PublicKey } from "@solana/web3.js";
import { createHash, randomBytes } from "node:crypto";
import * as dcap from "@phala/dcap-qvl";
import { digest } from "./canonical.mjs";

export const DEFAULT_PRIVATEPAY_MAINNET_RPC = "https://mainnet.magicblock.app";
export const DEFAULT_PRIVATEPAY_TEE_RPC = "https://mainnet-tee.magicblock.app";
export const SPL_PP_PROGRAM_ID = "SPLxh1LVZzEkX99H6rqYizhytLWPZVV296zyYDPagv2";
export const EXECUTE_READY_QUEUED_TRANSFER = "Instruction: ExecuteReadyQueuedTransfer";

const CLIENT_REF_ID_RE = /client_ref_id\s*[:=]\s*(\d+)/i;
const AMOUNT_RE = /(?:amount|amount_base_units|amount_atomic)\s*[:=]\s*(\d+)/i;
const SOLANA_SIGNATURE = /^[1-9A-HJ-NP-Za-km-z]{80,100}$/;
const HEX_64 = /^[a-f0-9]{64}$/;

function bindingField(value) {
  const bytes = Buffer.from(String(value ?? ""), "utf8");
  const length = Buffer.allocUnsafe(4);
  length.writeUInt32BE(bytes.length, 0);
  return Buffer.concat([length, bytes]);
}

/**
 * Build the exact digest that a future proxy TDX quote must commit to.
 * This is deliberately independent from provider-specific JSON ordering.
 */
export function createPrivatePayAttestationBinding({
  paymentId,
  settlementSignature,
  network,
  mint,
  amountBaseUnits,
  finalizedSlot,
  nonce,
} = {}) {
  const values = [paymentId, settlementSignature, network, mint, amountBaseUnits, finalizedSlot, nonce];
  if (values.some((value) => value === undefined || value === null || String(value) === ""))
    throw new Error("PrivatePAY attestation binding requires all payment, settlement, and freshness fields");
  const domain = Buffer.from("PrivateDAO/PrivatePAY/proxy-bridge/v1", "utf8");
  const payload = Buffer.concat([
    bindingField(domain),
    ...values.map(bindingField),
  ]);
  return {
    algorithm: "SHA-256",
    domain: "PrivateDAO/PrivatePAY/proxy-bridge/v1",
    bindingSha256: createHash("sha256").update(payload).digest("hex"),
    nonceDigest: createHash("sha256").update(bindingField(nonce)).digest("hex"),
  };
}

/**
 * Verify the REPORTDATA layout required by the proxy bridge.
 * REPORTDATA is supplied as hex and must contain exactly 64 bytes:
 * binding digest (32 bytes) followed by the nonce digest (32 bytes).
 */
export function verifyPrivatePayAttestationReportData({ reportDataHex, bindingSha256, nonceDigest } = {}) {
  const reportData = String(reportDataHex || "").toLowerCase();
  if (!/^[a-f0-9]{128}$/.test(reportData))
    return { verified: false, code: "REPORTDATA_INVALID_LENGTH" };
  if (!HEX_64.test(String(bindingSha256 || "")) || !HEX_64.test(String(nonceDigest || "")))
    return { verified: false, code: "BINDING_DIGEST_INVALID" };
  const expected = `${bindingSha256}${nonceDigest}`.toLowerCase();
  return {
    verified: reportData === expected,
    code: reportData === expected ? "REPORTDATA_MATCH" : "REPORTDATA_MISMATCH",
  };
}

function tdReportOf(report) {
  const td10 = report?.asTd10?.();
  if (td10) return td10;
  return report?.asTd15?.()?.base || null;
}

/**
 * Verify a provider TDX quote whose REPORTDATA commits to one settlement.
 * This is optional at runtime because the hosted provider may not expose the
 * quote route in every environment; callers must explicitly require it.
 */
export async function verifyPrivatePayPaymentBoundQuote({
  rpcUrl = DEFAULT_PRIVATEPAY_TEE_RPC,
  paymentId,
  settlementSignature,
  network,
  mint,
  amountBaseUnits,
  finalizedSlot,
  fetchImpl = fetch,
} = {}) {
  const nonce = randomBytes(32).toString("hex");
  const binding = createPrivatePayAttestationBinding({ paymentId, settlementSignature, network, mint, amountBaseUnits, finalizedSlot, nonce });
  const challenge = Buffer.from(`${binding.bindingSha256}${binding.nonceDigest}`, "hex");
  const endpoint = `${String(rpcUrl).replace(/\/$/, "")}/quote?challenge=${encodeURIComponent(challenge.toString("base64"))}`;
  const response = await fetchImpl(endpoint, { signal: AbortSignal.timeout(30000) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload.quote !== "string")
    throw Object.assign(new Error(`PrivatePAY TDX quote request failed (${response.status})`), { code: "PRIVATEPAY_QUOTE_REQUEST_FAILED", statusCode: 503 });
  const rawQuote = Buffer.from(payload.quote, "base64");
  const verified = await dcap.getCollateralAndVerify(rawQuote);
  const report = tdReportOf(verified.report);
  if (!report) throw Object.assign(new Error("PrivatePAY TDX response is not a TDX report"), { code: "PRIVATEPAY_QUOTE_NOT_TDX", statusCode: 503 });
  const reportDataHex = Buffer.from(report.reportData).toString("hex");
  const reportData = verifyPrivatePayAttestationReportData({ reportDataHex, ...binding });
  return {
    required: true,
    verified: reportData.verified && verified.status === "UpToDate",
    status: reportData.verified && verified.status === "UpToDate" ? "verified" : "rejected",
    reportDataCode: reportData.code,
    tcbStatus: verified.status,
    quoteSha256: createHash("sha256").update(rawQuote).digest("hex"),
    bindingSha256: binding.bindingSha256,
    nonceDigest: binding.nonceDigest,
    finalizedSlot: String(finalizedSlot),
    measurements: {
      mrTd: Buffer.from(report.mrTd).toString("hex"),
      rtMr0: Buffer.from(report.rtMr0).toString("hex"),
      rtMr1: Buffer.from(report.rtMr1).toString("hex"),
      rtMr2: Buffer.from(report.rtMr2).toString("hex"),
      rtMr3: Buffer.from(report.rtMr3).toString("hex"),
    },
  };
}

export function privatePayClientRefId(requestId) {
  const value = BigInt(`0x${digest(requestId).slice(0, 15)}`) % 1000000000000000n;
  return String(value || 1n);
}

export function derivePrivatePayQueuePda(mint, validator) {
  const mintKey = new PublicKey(mint);
  const validatorKey = new PublicKey(validator);
  const [queue] = PublicKey.findProgramAddressSync(
    [Buffer.from("queue"), mintKey.toBuffer(), validatorKey.toBuffer()],
    new PublicKey(SPL_PP_PROGRAM_ID),
  );
  return queue.toBase58();
}

async function rpcCall(rpcUrl, method, params, fetchImpl) {
  const response = await fetchImpl(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(8000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) throw new Error(`PrivatePAY Mainnet RPC ${method} failed`);
  return payload.result;
}

export async function getPrivatePaySignatureStatus({
  rpcUrl = DEFAULT_PRIVATEPAY_TEE_RPC,
  transactionSignature,
  fetchImpl = fetch,
} = {}) {
  if (!isSolanaTransactionSignature(transactionSignature)) throw new Error("PrivatePAY settlement signature is invalid");
  const result = await rpcCall(rpcUrl, "getSignatureStatuses", [[transactionSignature], { searchTransactionHistory: true }], fetchImpl);
  const value = result?.value?.[0] || null;
  return {
    readOnly: true,
    rpcUrl,
    transactionSignature,
    found: Boolean(value),
    slot: value?.slot ?? null,
    confirmationStatus: value?.confirmationStatus || null,
    err: value?.err || null,
    finalized: value?.confirmationStatus === "finalized" && value?.err == null,
  };
}

function tokenBalanceDelta(meta, mint, receiver) {
  const before = new Map();
  for (const entry of meta?.preTokenBalances || []) {
    if (entry.mint === mint) before.set(`${entry.accountIndex}:${entry.owner || ""}`, BigInt(entry.uiTokenAmount?.amount || 0));
  }
  const deltas = [];
  for (const entry of meta?.postTokenBalances || []) {
    if (entry.mint !== mint) continue;
    const key = `${entry.accountIndex}:${entry.owner || ""}`;
    const delta = BigInt(entry.uiTokenAmount?.amount || 0) - (before.get(key) || 0n);
    if (delta !== 0n && (!receiver || entry.owner === receiver)) deltas.push({ owner: entry.owner || null, delta: delta.toString() });
  }
  return deltas;
}

function inspectTransaction(transaction, { mint, expectedClientRefId, expectedAmountBaseUnits, receiver }) {
  const logs = transaction?.meta?.logMessages || [];
  const executeReadyQueuedTransfer = logs.some((line) => line.includes(EXECUTE_READY_QUEUED_TRANSFER));
  const clientRefId = logs.map((line) => line.match(CLIENT_REF_ID_RE)?.[1]).find(Boolean) || null;
  const amountFromLogs = logs.map((line) => line.match(AMOUNT_RE)?.[1]).find(Boolean) || null;
  const tokenDeltas = tokenBalanceDelta(transaction?.meta, mint, receiver);
  const amountMatches = expectedAmountBaseUnits == null
    ? null
    : tokenDeltas.some((item) => item.delta === String(expectedAmountBaseUnits)) || amountFromLogs === String(expectedAmountBaseUnits);
  const clientRefMatches = expectedClientRefId == null ? null : clientRefId === expectedClientRefId;
  return {
    executeReadyQueuedTransfer,
    clientRefId,
    clientRefMatches,
    amountFromLogs,
    tokenDeltas,
    amountMatches,
    candidate: executeReadyQueuedTransfer && (expectedClientRefId == null || clientRefMatches === true) && (expectedAmountBaseUnits == null || amountMatches === true),
  };
}

export async function findPrivatePaySettlement({
  rpcUrl = DEFAULT_PRIVATEPAY_MAINNET_RPC,
  mint,
  validator = "",
  queuePda: suppliedQueuePda = "",
  requestId = "",
  amountBaseUnits = null,
  receiver = "",
  transactionSignature = "",
  limit = 100,
  fetchImpl = fetch,
} = {}) {
  if (!mint) throw new Error("PrivatePAY Mainnet settlement verification requires a mint");
  const boundedLimit = Math.min(Math.max(Number(limit) || 100, 1), 1000);
  const resolvedValidator = validator || (await rpcCall(rpcUrl, "getIdentity", [], fetchImpl)).identity;
  if (!resolvedValidator) throw new Error("PrivatePAY Mainnet RPC did not return a validator identity");
  const queuePda = suppliedQueuePda || derivePrivatePayQueuePda(mint, resolvedValidator);
  const account = await rpcCall(rpcUrl, "getAccountInfo", [queuePda, { commitment: "finalized" }], fetchImpl);
  const entries = await rpcCall(rpcUrl, "getSignaturesForAddress", [queuePda, { limit: boundedLimit }, { commitment: "finalized" }], fetchImpl);
  const expectedClientRefId = requestId ? privatePayClientRefId(requestId) : null;
  const candidates = [];
  for (const entry of entries || []) {
    if (transactionSignature && entry.signature !== transactionSignature) continue;
    const transaction = await rpcCall(rpcUrl, "getTransaction", [entry.signature, { commitment: "finalized", maxSupportedTransactionVersion: 0 }], fetchImpl);
    const inspected = inspectTransaction(transaction, { mint, expectedClientRefId, expectedAmountBaseUnits: amountBaseUnits, receiver });
    if (!inspected.executeReadyQueuedTransfer && !inspected.clientRefId) continue;
    candidates.push({ signature: entry.signature, slot: entry.slot, err: entry.err || null, ...inspected });
  }
  const settlement = candidates.find((item) => item.candidate) || null;
  return {
    readOnly: true,
    status: settlement ? "settlement_found" : "not_found",
    rpcUrl,
    mint,
    validator: resolvedValidator,
    queuePda,
    queueAccountExists: Boolean(account?.value),
    requestId: requestId || null,
    expectedClientRefId,
    expectedAmountBaseUnits: amountBaseUnits == null ? null : String(amountBaseUnits),
    transactionSignature: transactionSignature || null,
    receiver: receiver || null,
    signaturesScanned: (entries || []).length,
    settlement,
    candidates,
    conclusion: settlement
      ? "finalized ExecuteReadyQueuedTransfer matched the requested clientRefId and amount"
      : "no finalized ExecuteReadyQueuedTransfer matched the requested settlement",
  };
}

export function isSolanaTransactionSignature(value) {
  return SOLANA_SIGNATURE.test(String(value || ""));
}
