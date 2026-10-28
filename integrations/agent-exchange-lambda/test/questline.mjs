import test from "node:test";
import assert from "node:assert/strict";
import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";
import { MemoryStore } from "../src/storage.mjs";
import { createQuestlineClient, participationMessage, validateAndPushQuest, verifyWalletSignature } from "../src/questline.mjs";

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

test("persists validation state when Push is disabled and remains idempotent", async () => {
  const storage = await records();
  const config = { ...base, pushEnabled: false };
  const client = createQuestlineClient({ config, fetchImpl: async () => { throw new Error("must not call"); } });
  const first = await validateAndPushQuest({ storage, client, config, wallet, freeJobId: "job_free", privatePayJobId: "job_private" });
  assert.equal(first.status, "validated");
  const second = await validateAndPushQuest({ storage, client, config, wallet, freeJobId: "job_free", privatePayJobId: "job_private" });
  assert.equal(second.status, "validated");
  assert.equal((await storage.get("QuestlineCompletions", first.completion_id)).state, "validated");
});

test("retries a completion after a persisted Push failure", async () => {
  const storage = await records();
  let attempts = 0;
  const config = { ...base };
  const failing = createQuestlineClient({ config, sleepImpl: async () => {}, fetchImpl: async () => { attempts += 1; return new Response("no", { status: 401 }); } });
  await assert.rejects(() => validateAndPushQuest({ storage, client: failing, config, wallet, freeJobId: "job_free", privatePayJobId: "job_private" }), /rejected/);
  const succeeding = createQuestlineClient({ config, fetchImpl: async () => new Response(JSON.stringify({ completed: true }), { status: 200 }) });
  const result = await validateAndPushQuest({ storage, client: succeeding, config, wallet, freeJobId: "job_free", privatePayJobId: "job_private" });
  assert.equal(result.status, "pushed");
  assert.equal(attempts, 1);
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

test("wallet participation message is deterministic", () => {
  const message = participationMessage({ questId: 94, wallet, nonce: "nonce" });
  assert.match(message, /^PrivateDAO Questline participation: quest=94;wallet=/);
});
