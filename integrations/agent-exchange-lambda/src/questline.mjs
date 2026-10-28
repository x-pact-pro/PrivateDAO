import { createHash } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import { serviceById } from "./catalog.mjs";

export const QUESTLINE_QUEST_ID = 94;
export const QUESTLINE_PUSH_PATH = "/api/validators/run";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const asText = (value) => String(value ?? "").trim();

export function questlineConfig(env = process.env) {
  const questId = Number(env.MAGICBLOCK_QUESTLINE_QUEST_ID || QUESTLINE_QUEST_ID);
  return {
    questId: Number.isInteger(questId) && questId > 0 ? questId : QUESTLINE_QUEST_ID,
    baseUrl: asText(env.MAGICBLOCK_QUESTLINE_BASE_URL).replace(/\/$/, ""),
    bearerToken: asText(env.MAGICBLOCK_QUESTLINE_API_KEY),
    pushPath: asText(env.MAGICBLOCK_QUESTLINE_PUSH_PATH) || QUESTLINE_PUSH_PATH,
    pushEnabled: env.MAGICBLOCK_QUESTLINE_PUSH_ENABLED === "true",
  };
}

export function assertSolanaWallet(wallet) {
  const value = asText(wallet);
  try {
    return new PublicKey(value).toBase58();
  } catch {
    throw Object.assign(new Error("a valid Solana wallet is required"), { code: "QUESTLINE_INVALID_WALLET", statusCode: 400 });
  }
}

function walletFingerprint(wallet) {
  return createHash("sha256").update(wallet).digest("hex").slice(0, 16);
}

function safeError(code, message, statusCode = 502, details = undefined) {
  return Object.assign(new Error(message), { code, statusCode, details });
}

function retryableStatus(status) {
  return status === 408 || status === 429 || status >= 500;
}

async function readJson(response) {
  return response.json().catch(() => null);
}

export function createQuestlineClient({ config = questlineConfig(), fetchImpl = fetch, sleepImpl = sleep, logger = () => {}, maxAttempts = 3 } = {}) {
  async function pushCompletion({ wallet, evidence, idempotencyKey }) {
    const pubkey = assertSolanaWallet(wallet);
    if (!config.baseUrl || !config.bearerToken) throw safeError("QUESTLINE_NOT_CONFIGURED", "Questline credentials are not configured", 503);
    const url = `${config.baseUrl}${config.pushPath.startsWith("/") ? config.pushPath : `/${config.pushPath}`}`;
    const body = { id: config.questId, pubkey, evidence };
    let lastError;
    for (let attempt = 1; attempt <= Math.max(1, maxAttempts); attempt += 1) {
      try {
        const response = await fetchImpl(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${config.bearerToken}`,
            "idempotency-key": idempotencyKey,
          },
          body: JSON.stringify(body),
        });
        const payload = await readJson(response);
        if (response.ok || response.status === 409) return { accepted: response.ok, duplicate: response.status === 409, status: response.status, payload };
        lastError = safeError("QUESTLINE_PUSH_REJECTED", "Questline Push API rejected the completion", response.status, { retryable: retryableStatus(response.status) });
        if (!retryableStatus(response.status) || attempt === maxAttempts) throw lastError;
        await sleepImpl(2 ** (attempt - 1) * 250);
      } catch (error) {
        lastError = error?.code ? error : safeError("QUESTLINE_PUSH_FAILED", "Questline Push API request failed", 502, { retryable: true });
        if (!lastError.details?.retryable || attempt === maxAttempts) throw lastError;
        await sleepImpl(2 ** (attempt - 1) * 250);
      }
    }
    throw lastError || safeError("QUESTLINE_PUSH_FAILED", "Questline Push API request failed");
  }
  return { pushCompletion };
}

export function verifyWalletSignature({ wallet, message, signature }) {
  const pubkey = assertSolanaWallet(wallet);
  const text = asText(message);
  if (!text || !asText(signature)) throw safeError("QUESTLINE_SIGNATURE_REQUIRED", "wallet signature is required", 400);
  let bytes;
  try { bytes = Buffer.from(asText(signature), "base64"); } catch { bytes = Buffer.alloc(0); }
  if (bytes.length !== 64 || !nacl.sign.detached.verify(Buffer.from(text), bytes, new PublicKey(pubkey).toBytes()))
    throw safeError("QUESTLINE_INVALID_SIGNATURE", "wallet signature is invalid", 401);
  return pubkey;
}

export function participationMessage({ questId = QUESTLINE_QUEST_ID, wallet, nonce }) {
  return `PrivateDAO Questline participation: quest=${questId};wallet=${assertSolanaWallet(wallet)};nonce=${asText(nonce)}`;
}

export function completionKey({ questId, wallet, freeJobId, privatePayJobId }) {
  return `questline_${questId}_${createHash("sha256").update(`${wallet}|${freeJobId}|${privatePayJobId}`).digest("hex")}`;
}

function evidencePublic({ participation, freeJob, freeReceipt, privatePayJob, privatePayPayment, pdaoEligibility }) {
  return {
    participation_id: participation.id,
    free_job_id: freeJob.id,
    free_receipt_id: freeReceipt.receipt_id,
    privatepay_job_id: privatePayJob.id,
    privatepay_payment_id: privatePayPayment?.id || null,
    privatepay_settlement_state: privatePayPayment?.state || privatePayJob.privatepay_settlement?.status || "settled",
    pdao_eligibility: pdaoEligibility ? { verified: true, record_id: pdaoEligibility.id } : null,
  };
}

export async function validateQuestEligibility({ storage, wallet, participationId, freeJobId, privatePayJobId, pdaoEligibilityId = "", questId = QUESTLINE_QUEST_ID }) {
  const pubkey = assertSolanaWallet(wallet);
  if (!storage) throw safeError("QUESTLINE_STORAGE_REQUIRED", "quest validation storage is required", 503);
  const participation = await storage.get("Registry", participationId || `questline_participation_${questId}_${pubkey}`);
  if (!participation || participation.kind !== "questline_participation" || participation.quest_id !== questId || participation.wallet !== pubkey || !participation.started_at)
    throw safeError("QUESTLINE_PARTICIPATION_REQUIRED", "quest participation has not been started for this wallet", 403);
  const freeJob = await storage.get("Jobs", freeJobId);
  const freeReceipt = freeJob?.receipt_id ? await storage.get("Receipts", freeJob.receipt_id) : null;
  const freeService = serviceById(freeJob?.service_id);
  if (!freeJob || !freeService || Number(freeService.price || 0) !== 0 || freeJob.status !== "completed" || freeJob.payment_mode !== "direct" || freeReceipt?.status !== "VERIFIED")
    throw safeError("QUESTLINE_FREE_ACTIVITY_REQUIRED", "a completed free Agent Exchange service receipt is required", 403);
  const privatePayJob = await storage.get("Jobs", privatePayJobId);
  const privatePayPayment = privatePayJob?.id ? (await storage.list("Payments")).find((item) => item.job_id === privatePayJob.id && item.payment_mode === "privatepay") : null;
  if (!privatePayJob || privatePayJob.status !== "completed" || privatePayJob.payment_mode !== "privatepay" || !privatePayJob.privatepay_settlement || !privatePayPayment || privatePayPayment.payer !== pubkey || privatePayPayment.state !== "settled")
    throw safeError("QUESTLINE_PRIVATEPAY_ACTIVITY_REQUIRED", "a completed PrivatePAY x402 settlement is required", 403);
  const pdaoEligibility = pdaoEligibilityId ? await storage.get("Registry", pdaoEligibilityId) : null;
  if (pdaoEligibilityId && (!pdaoEligibility || pdaoEligibility.wallet !== pubkey || pdaoEligibility.eligible !== true))
    throw safeError("QUESTLINE_PDAO_ELIGIBILITY_INVALID", "optional PDAO eligibility record is not verified", 403);
  const evidence = evidencePublic({ participation, freeJob, freeReceipt, privatePayJob, privatePayPayment, pdaoEligibility });
  return { wallet: pubkey, evidence, key: completionKey({ questId, wallet: pubkey, freeJobId, privatePayJobId }) };
}

export async function validateAndPushQuest({ storage, client, config = questlineConfig(), wallet, participationId, freeJobId, privatePayJobId, pdaoEligibilityId = "", now = () => new Date().toISOString(), logger = () => {} }) {
  const result = await validateQuestEligibility({ storage, wallet, participationId, freeJobId, privatePayJobId, pdaoEligibilityId, questId: config.questId });
  const existing = await storage.get("QuestlineCompletions", result.key);
  if (existing?.state === "completed") return { status: "duplicate", completion_id: result.key, evidence: existing.evidence };
  const pending = { id: result.key, kind: "questline_completion", quest_id: config.questId, wallet_fingerprint: walletFingerprint(result.wallet), state: "pending", evidence: result.evidence, created_at: now() };
  try { await storage.put("QuestlineCompletions", result.key, pending, true); } catch { return { status: "in_progress", completion_id: result.key }; }
  try {
    if (!config.pushEnabled) return { status: "validated", completion_id: result.key, push: "disabled", evidence: result.evidence };
    const pushed = await client.pushCompletion({ wallet: result.wallet, evidence: result.evidence, idempotencyKey: result.key });
    const completed = { ...pending, state: "completed", pushed_at: now(), push_status: pushed.status };
    await storage.put("QuestlineCompletions", result.key, completed);
    logger({ event: "questline_completion_pushed", quest_id: config.questId, wallet_fingerprint: walletFingerprint(result.wallet), completion_id: result.key, status: pushed.status });
    return { status: pushed.duplicate ? "duplicate" : "pushed", completion_id: result.key, evidence: result.evidence };
  } catch (error) {
    await storage.put("QuestlineCompletions", result.key, { ...pending, state: "push_failed", error_code: error.code || "QUESTLINE_PUSH_FAILED", failed_at: now() });
    throw error;
  }
}
