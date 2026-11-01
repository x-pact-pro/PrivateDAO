import { PublicKey } from "@solana/web3.js";
import { digest } from "../src/canonical.mjs";

const DEFAULT_RPC = "https://mainnet.magicblock.app";
const DEFAULT_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SPL_PP_PROGRAM_ID = new PublicKey("SPLxh1LVZzEkX99H6rqYizhytLWPZVV296zyYDPagv2");
const EXECUTE_LINE = "Instruction: ExecuteReadyQueuedTransfer";
const CLIENT_REF_RE = /client_ref_id:\s*(\d+)/;

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function deriveQueuePda(mint, validator) {
  const [queue] = PublicKey.findProgramAddressSync(
    [Buffer.from("queue"), new PublicKey(mint).toBuffer(), new PublicKey(validator).toBuffer()],
    SPL_PP_PROGRAM_ID,
  );
  return queue;
}

function clientRefId(requestId) {
  const value = BigInt(`0x${digest(requestId).slice(0, 15)}`) % 1000000000000000n;
  return String(value || 1n);
}

const rpcUrl = option("rpc", process.env.PRIVATEPAY_MAINNET_RPC || DEFAULT_RPC);
const mint = new PublicKey(option("mint", process.env.PRIVATEPAY_CONFIDENTIAL_MINT || DEFAULT_MINT));
const limit = Math.min(Math.max(Number(option("limit", "100")) || 100, 1), 1000);
const timeoutMs = Math.min(Math.max(Number(option("timeout-ms", process.env.PRIVATEPAY_AUDIT_TIMEOUT_MS || "8000")) || 8000, 1000), 30000);
const requestId = option("request-id", "");
const expectedClientRefId = requestId ? clientRefId(requestId) : null;
let rpcId = 0;
async function rpc(method, params) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method, params }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${method} returned HTTP ${response.status}`);
  if (payload.error) throw new Error(`${method} RPC error ${payload.error.code}: ${payload.error.message}`);
  return payload.result;
}

let identityPayload;
try {
  identityPayload = { result: await rpc("getIdentity", []) };
} catch (error) {
  console.log(JSON.stringify({ readOnly: true, rpcUrl, timeoutMs, status: "unavailable", error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exit(2);
}
if (!identityPayload?.result?.identity) throw new Error("Mainnet RPC did not return a validator identity");
const validator = new PublicKey(identityPayload.result.identity);
const queuePda = deriveQueuePda(mint, validator);
const accountResult = await rpc("getAccountInfo", [queuePda.toBase58(), { commitment: "finalized", encoding: "base64" }]);
const account = accountResult?.value || null;
const signatures = await rpc("getSignaturesForAddress", [queuePda.toBase58(), { commitment: "finalized", limit }]);
const settlements = [];

for (const entry of signatures) {
  const transaction = await rpc("getTransaction", [entry.signature, { commitment: "finalized", maxSupportedTransactionVersion: 0, encoding: "jsonParsed" }]);
  const logs = transaction?.meta?.logMessages || [];
  const execute = logs.some((line) => line.includes(EXECUTE_LINE));
  const reference = logs.map((line) => line.match(CLIENT_REF_RE)?.[1]).find(Boolean) || null;
  if (execute || reference) {
    settlements.push({
      signature: entry.signature,
      slot: entry.slot,
      err: entry.err,
      clientRefId: reference,
      executeReadyQueuedTransfer: execute,
      matchesRequestedClientRef: expectedClientRefId ? reference === expectedClientRefId : null,
    });
  }
}

console.log(JSON.stringify({
  readOnly: true,
  rpcUrl,
  mint: mint.toBase58(),
  validator: validator.toBase58(),
  queuePda: queuePda.toBase58(),
  queueAccountExists: Boolean(account),
  signaturesScanned: signatures.length,
  requestId: requestId || null,
  expectedClientRefId,
  settlementCandidates: settlements,
  conclusion: expectedClientRefId
    ? settlements.some((item) => item.matchesRequestedClientRef)
      ? "requested clientRefId found; bind amount, receiver, and job ID before release"
      : "requested clientRefId was not observed on this queue"
    : settlements.length > 0
      ? "settlement candidates found; bind clientRefId, amount, receiver, and job ID before release"
      : "no observable ExecuteReadyQueuedTransfer settlement on this queue",
}, null, 2));
