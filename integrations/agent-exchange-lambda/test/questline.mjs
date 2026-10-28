import test from "node:test";
import assert from "node:assert/strict";
import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";
import { MemoryStore } from "../src/storage.mjs";
import { createQuestlineClient, participationMessage, validateAndPushQuest, validateQuestEligibility, verifyWalletSignature } from "../src/questline.mjs";

const wallet = new PublicKey(nacl.sign.keyPair.fromSeed(Uint8Array.from({ length: 32 }, (_, i) => i + 1)).publicKey).toBase58();
const base = { questId: 94, baseUrl: "https://quests.magicblock.app", bearerToken: "test-token", pushPath: "/api/validators/run", pushEnabled: true };

function records() {
  const storage = new MemoryStore();
  const freeJob = { id: "job_free", service_id: "verify.basic", status: "completed", payment_mode: "direct", receipt_id: "receipt_free" };
  const privateJob = { id: "job_private", service_id: "privatepay.x402", status: "completed", payment_mode: "privatepay", privatepay_settlement: { status: "settled" } };
  return storage.put("Registry", `questline_participation_94_${wallet}`, { id: `questline_participation_94_${wallet}`, kind: "questline_participation", quest_id: 94, wallet, started_at: new Date().toISOString() })
    .then(() => storage.put("Jobs", freeJob.id, freeJob))
    .then(() => storage.put("Receipts", "receipt_free", { receipt_id: "receipt_free", job_id: "job_free", status: "VERIFIED" }))
    .then(() => storage.put("Jobs", privateJob.id, privateJob))
    .then(() => storage.put("Payments", "private_payment_1", { id: "private_payment_1", job_id: "job_private", payment_mode: "privatepay", payer: wallet, state: "settled" }))
    .then(() => storage);
}

test("rejects invalid wallet and invalid wallet signature", () => {
  assert.throws(() => verifyWalletSignature({ wallet: "bad", message: "x", signature: "x" }), /valid Solana wallet/);
  assert.throws(() => verifyWalletSignature({ wallet, message: "x", signature: Buffer.alloc(64).toString("base64") }), /signature is invalid/);
});

test("validates real records and pushes once", async () => {
  const storage = await records();
  const calls = [];
  const client = createQuestlineClient({ config: base, fetchImpl: async (url, init) => { calls.push({ url, init }); return new Response(JSON.stringify({ completed: true }), { status: 200, headers: { "content-type": "application/json" } }); } });
  const first = await validateAndPushQuest({ storage, client, config: base, wallet, freeJobId: "job_free", privatePayJobId: "job_private" });
  assert.equal(first.status, "pushed");
  assert.equal(calls.length, 1);
  assert.equal(JSON.parse(calls[0].init.body).id, 94);
  const second = await validateAndPushQuest({ storage, client, config: base, wallet, freeJobId: "job_free", privatePayJobId: "job_private" });
  assert.equal(second.status, "duplicate");
  assert.equal(calls.length, 1);
});

test("does not push when activity is missing", async () => {
  const storage = await records();
  await assert.rejects(() => validateAndPushQuest({ storage, client: createQuestlineClient({ config: base, fetchImpl: async () => { throw new Error("must not call"); } }), config: base, wallet, freeJobId: "missing", privatePayJobId: "job_private" }), /free Agent Exchange service receipt/);
});

test("retries transient Push API failures and reports invalid credentials", async () => {
  const storage = await records();
  let attempts = 0;
  const client = createQuestlineClient({ config: base, sleepImpl: async () => {}, fetchImpl: async () => { attempts += 1; return attempts < 3 ? new Response("busy", { status: 503 }) : new Response("ok", { status: 200 }); } });
  const result = await validateAndPushQuest({ storage, client, config: base, wallet, freeJobId: "job_free", privatePayJobId: "job_private" });
  assert.equal(result.status, "pushed");
  assert.equal(attempts, 3);
  const unauthorized = createQuestlineClient({ config: base, fetchImpl: async () => new Response("no", { status: 401 }) });
  const unauthorizedStorage = await records();
  await assert.rejects(() => validateAndPushQuest({ storage: unauthorizedStorage, client: unauthorized, config: base, wallet, freeJobId: "job_free", privatePayJobId: "job_private" }), (error) => error.code === "QUESTLINE_PUSH_REJECTED" && error.statusCode === 401);
});

test("retries a validated completion after Push is enabled", async () => {
  const storage = await records();
  const disabled = { ...base, pushEnabled: false };
  const first = await validateAndPushQuest({ storage, client: null, config: disabled, wallet, freeJobId: "job_free", privatePayJobId: "job_private" });
  assert.equal(first.status, "validated");
  const calls = [];
  const enabled = createQuestlineClient({ config: base, fetchImpl: async (url, init) => { calls.push({ url, init }); return new Response("{}", { status: 200 }); } });
  const second = await validateAndPushQuest({ storage, client: enabled, config: base, wallet, freeJobId: "job_free", privatePayJobId: "job_private" });
  assert.equal(second.status, "pushed");
  assert.equal(calls.length, 1);
});

test("accepts the existing nested PDAO eligibility record shape", async () => {
  const storage = await records();
  await storage.put("Registry", "pdao-eligibility", { id: "pdao-eligibility", wallet, kind: "pdao_holder_entitlement", benefit: { eligible: true } });
  const result = await validateQuestEligibility({ storage, wallet, freeJobId: "job_free", privatePayJobId: "job_private", pdaoEligibilityId: "pdao-eligibility" });
  assert.equal(result.evidence.pdao_eligibility.verified, true);
});

test("wallet participation message is deterministic", () => {
  const message = participationMessage({ questId: 94, wallet, nonce: "nonce" });
  assert.match(message, /^PrivateDAO Questline participation: quest=94;wallet=/);
});
