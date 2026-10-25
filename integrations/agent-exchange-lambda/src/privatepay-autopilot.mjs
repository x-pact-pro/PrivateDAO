import { randomUUID } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";

const MAX_BUDGET_BASE_UNITS = 1000000000000n;
const MAX_OPERATION_BASE_UNITS = 100000000000n;
const MAX_OPERATIONS = 10000;
const MAX_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CHALLENGE_TTL_MS = 10 * 60 * 1000;
let clientPromise;

function fail(message, code = "PRIVATEPAY_AUTOPILOT_INVALID", statusCode = 400) {
  throw Object.assign(new Error(message), { code, statusCode });
}

function address(value, field) {
  const text = String(value || "").trim();
  try { new PublicKey(text); } catch { fail(`${field} must be a valid Solana address`); }
  return text;
}

function signature(value, field) {
  const text = String(value || "").trim();
  let bytes;
  try { bytes = Buffer.from(text, "base64"); } catch { fail(`${field} must be base64`); }
  if (bytes.length !== 64) fail(`${field} must contain a 64-byte Ed25519 signature`);
  return bytes;
}

function positiveUnits(value, field, max) {
  const text = String(value ?? "").trim();
  if (!/^\d+$/.test(text) || BigInt(text) <= 0n || BigInt(text) > max) fail(`${field} must be a bounded positive base-unit integer`);
  return text;
}

function canonicalMessage(kind, fields) {
  return [
    `PrivatePAY Autopilot v1 ${kind}`,
    ...Object.entries(fields).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${String(value)}`),
  ].join("\n");
}

function verifySignedMessage(publicKey, message, supplied, field) {
  const bytes = signature(supplied, field);
  if (!nacl.sign.detached.verify(new TextEncoder().encode(message), bytes, new PublicKey(publicKey).toBytes())) fail(`${field} does not authorize this request`, "PRIVATEPAY_AUTOPILOT_UNAUTHORIZED", 403);
}

function normalizeServices(value) {
  const services = Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : ["privatepay.x402"];
  if (!services.length || services.length > 20 || services.some((item) => !/^[a-z0-9._:-]{2,100}$/i.test(item))) fail("allowed_services must contain 1 to 20 valid service ids");
  return [...new Set(services)];
}

function normalizePolicyInput(input = {}) {
  const owner = address(input.owner, "owner");
  const sessionPublicKey = address(input.session_public_key || input.sessionPublicKey, "session_public_key");
  const budget = positiveUnits(input.budget_base_units || input.budgetBaseUnits, "budget_base_units", MAX_BUDGET_BASE_UNITS);
  const maxPerOperation = positiveUnits(input.max_per_operation_base_units || input.maxPerOperationBaseUnits, "max_per_operation_base_units", MAX_OPERATION_BASE_UNITS);
  if (BigInt(maxPerOperation) > BigInt(budget)) fail("max_per_operation_base_units cannot exceed budget_base_units");
  const maxOperations = Number(input.max_operations || input.maxOperations || 1);
  if (!Number.isInteger(maxOperations) || maxOperations < 1 || maxOperations > MAX_OPERATIONS) fail("max_operations must be between 1 and 10000");
  const ttlMs = Number(input.ttl_ms || input.ttlMs || 24 * 60 * 60 * 1000);
  if (!Number.isInteger(ttlMs) || ttlMs < 60_000 || ttlMs > MAX_TTL_MS) fail("ttl_ms must be between 60000 and 604800000");
  return { owner, session_public_key: sessionPublicKey, budget_base_units: budget, max_per_operation_base_units: maxPerOperation, max_operations: maxOperations, ttl_ms: ttlMs, allowed_services: normalizeServices(input.allowed_services || input.allowedServices) };
}

async function collections(config) {
  if (!config.mongoUri) fail("MongoDB is required for PrivatePAY Autopilot", "PRIVATEPAY_AUTOPILOT_STORAGE_UNAVAILABLE", 503);
  if (!clientPromise) {
    const { MongoClient } = await import("mongodb");
    clientPromise = MongoClient.connect(config.mongoUri, { serverSelectionTimeoutMS: 3000, connectTimeoutMS: 3000, maxPoolSize: 10, minPoolSize: 0 }).catch((error) => { clientPromise = undefined; throw error; });
  }
  const db = (await clientPromise).db(config.mongoDatabase);
  const [challenges, policies, operations] = ["privatepay_autopilot_challenges", "privatepay_autopilot_policies", "privatepay_autopilot_operations"].map((name) => db.collection(name));
  await Promise.all([
    challenges.createIndex({ id: 1 }, { unique: true }),
    challenges.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }),
    policies.createIndex({ id: 1 }, { unique: true }),
    policies.createIndex({ owner: 1, status: 1 }),
    operations.createIndex({ id: 1 }, { unique: true }),
    operations.createIndex({ policy_id: 1, status: 1 }),
    operations.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }),
  ]);
  return { challenges, policies, operations };
}

export function privatePayAutopilotStatus(config) {
  const configured = config.privatePayAutopilotEnabled === true;
  const storage = Boolean(config.mongoUri);
  return {
    enabled: configured && storage,
    configured,
    storage: storage ? "mongodb" : "unavailable",
    blockers: [
      ...(!configured ? ["explicit autopilot activation is disabled"] : []),
      ...(!storage ? ["MongoDB storage is not configured"] : []),
    ],
    custody: "session_wallet_only",
    reusable_x402_credentials: false,
    policy_limits: { max_ttl_ms: MAX_TTL_MS, max_operations: MAX_OPERATIONS, max_budget_base_units: String(MAX_BUDGET_BASE_UNITS) },
  };
}

function requireEnabled(config) {
  const status = privatePayAutopilotStatus(config);
  if (!status.enabled) fail("PrivatePAY Autopilot is disabled until MongoDB and the explicit activation flag are configured", "PRIVATEPAY_AUTOPILOT_NOT_READY", 503);
}

export async function createPrivatePayAutopilotChallenge(config, input = {}) {
  requireEnabled(config);
  const policy = normalizePolicyInput(input);
  const challengeId = `paut_ch_${randomUUID().replaceAll("-", "")}`;
  const now = new Date();
  const expires = new Date(now.getTime() + CHALLENGE_TTL_MS);
  const message = canonicalMessage("policy", { challenge_id: challengeId, ...policy });
  const { challenges } = await collections(config);
  await challenges.insertOne({ id: challengeId, kind: "policy", ...policy, message, created_at: now.toISOString(), expires_at: expires.toISOString() });
  return { challenge_id: challengeId, message, expires_at: expires.toISOString(), signing: { owner_signature: "base64 Ed25519 signature by owner", session_signature: "base64 Ed25519 signature by session_public_key" }, policy };
}

export async function createPrivatePayAutopilotPolicy(config, input = {}) {
  requireEnabled(config);
  const { challenges, policies } = await collections(config);
  const challengeId = String(input.challenge_id || "").trim();
  const challenge = await challenges.findOne({ id: challengeId, kind: "policy" });
  if (!challenge || challenge.used_at || Date.parse(challenge.expires_at) <= Date.now()) fail("autopilot policy challenge is invalid or expired", "PRIVATEPAY_AUTOPILOT_CHALLENGE_EXPIRED", 400);
  const policy = normalizePolicyInput(input);
  const expected = canonicalMessage("policy", { challenge_id: challengeId, ...policy });
  if (expected !== challenge.message) fail("autopilot policy does not match the signed challenge");
  verifySignedMessage(policy.owner, expected, input.owner_signature, "owner_signature");
  verifySignedMessage(policy.session_public_key, expected, input.session_signature, "session_signature");
  const now = new Date().toISOString();
  const consumed = await challenges.findOneAndUpdate({ id: challengeId, used_at: { $exists: false }, expires_at: { $gt: now } }, { $set: { used_at: now } });
  if (!consumed) fail("autopilot policy challenge was already used", "PRIVATEPAY_AUTOPILOT_CHALLENGE_USED", 409);
  const policyId = `paut_${randomUUID().replaceAll("-", "")}`;
  const expires = new Date(Date.now() + policy.ttl_ms).toISOString();
  const record = { id: policyId, kind: "privatepay_autopilot_policy", ...policy, status: "active", expires_at: expires, reserved_base_units: 0, spent_base_units: 0, reserved_operations: 0, completed_operations: 0, created_at: now, updated_at: now };
  await policies.insertOne(record);
  return publicPolicy(record);
}

function publicPolicy(policy) {
  return { policy_id: policy.id, owner: policy.owner, session_public_key: policy.session_public_key, allowed_services: policy.allowed_services, budget_base_units: String(policy.budget_base_units), max_per_operation_base_units: String(policy.max_per_operation_base_units), max_operations: policy.max_operations, reserved_base_units: String(policy.reserved_base_units || 0), spent_base_units: String(policy.spent_base_units || 0), reserved_operations: policy.reserved_operations || 0, completed_operations: policy.completed_operations || 0, status: policy.status, expires_at: policy.expires_at, custody: "session_wallet_only", note: "PrivateDAO never receives the session private key" };
}

async function activePolicy(config, policyId) {
  const { policies } = await collections(config);
  const policy = await policies.findOne({ id: String(policyId || ""), kind: "privatepay_autopilot_policy" });
  if (!policy || policy.status !== "active" || Date.parse(policy.expires_at) <= Date.now()) fail("autopilot policy is inactive or expired", "PRIVATEPAY_AUTOPILOT_POLICY_INACTIVE", 403);
  return { policies, policy };
}

export async function createPrivatePayAutopilotOperationChallenge(config, input = {}) {
  requireEnabled(config);
  const { policy } = await activePolicy(config, input.policy_id);
  const resource = String(input.resource || "").trim();
  const providerId = String(input.provider_id || "").trim();
  if (!resource || !providerId) fail("resource and provider_id are required");
  if (!policy.allowed_services.includes(providerId)) fail("provider_id is not allowed by this autopilot policy", "PRIVATEPAY_AUTOPILOT_SERVICE_NOT_ALLOWED", 403);
  const amount = positiveUnits(input.amount_base_units, "amount_base_units", MAX_OPERATION_BASE_UNITS);
  if (BigInt(amount) > BigInt(policy.max_per_operation_base_units)) fail("amount exceeds the autopilot per-operation limit", "PRIVATEPAY_AUTOPILOT_OPERATION_LIMIT", 403);
  const operationId = `paut_op_${randomUUID().replaceAll("-", "")}`;
  const challengeId = `paut_op_ch_${randomUUID().replaceAll("-", "")}`;
  const expires = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();
  const message = canonicalMessage("operation", { amount_base_units: amount, challenge_id: challengeId, operation_id: operationId, policy_id: policy.id, provider_id: providerId, resource });
  const { challenges } = await collections(config);
  await challenges.insertOne({ id: challengeId, kind: "operation", policy_id: policy.id, operation_id: operationId, resource, provider_id: providerId, amount_base_units: amount, message, created_at: new Date().toISOString(), expires_at: expires });
  return { challenge_id: challengeId, operation_id: operationId, policy_id: policy.id, message, expires_at: expires, signing: "base64 Ed25519 signature by session_public_key" };
}

export async function authorizePrivatePayAutopilotOperation(config, input = {}) {
  requireEnabled(config);
  const { policy } = await activePolicy(config, input.policy_id);
  const { challenges, operations } = await collections(config);
  const challenge = await challenges.findOne({ id: String(input.challenge_id || ""), kind: "operation", policy_id: policy.id });
  if (!challenge || challenge.used_at || Date.parse(challenge.expires_at) <= Date.now()) fail("autopilot operation challenge is invalid or expired", "PRIVATEPAY_AUTOPILOT_CHALLENGE_EXPIRED", 400);
  verifySignedMessage(policy.session_public_key, challenge.message, input.session_signature, "session_signature");
  const now = new Date().toISOString();
  const consumed = await challenges.findOneAndUpdate({ id: challenge.id, used_at: { $exists: false }, expires_at: { $gt: now } }, { $set: { used_at: now } });
  if (!consumed) fail("autopilot operation challenge was already used", "PRIVATEPAY_AUTOPILOT_CHALLENGE_USED", 409);
  const reservation = { id: challenge.operation_id, policy_id: policy.id, owner: policy.owner, resource: challenge.resource, provider_id: challenge.provider_id, amount_base_units: challenge.amount_base_units, authorization_message: challenge.message, status: "reserved", created_at: now, expires_at: challenge.expires_at };
  const amount = BigInt(challenge.amount_base_units);
  const result = await operations.insertOne(reservation).then(async () => {
    const updated = await collections(config).then(({ policies }) => policies.findOneAndUpdate({ id: policy.id, status: "active", expires_at: { $gt: now }, $expr: { $and: [{ $lte: [{ $add: [{ $toLong: { $ifNull: ["$spent_base_units", "0"] } }, { $toLong: { $ifNull: ["$reserved_base_units", "0"] } }, Number(amount)] }, { $toLong: "$budget_base_units" }] }, { $lt: [{ $add: [{ $ifNull: ["$completed_operations", 0] }, { $ifNull: ["$reserved_operations", 0] }] }, "$max_operations"] }] } }, { $inc: { reserved_base_units: Number(amount), reserved_operations: 1 }, $set: { updated_at: now } }));
    if (!updated) { await operations.deleteOne({ id: reservation.id, status: "reserved" }); return { reserved: false }; }
    return { reserved: true };
  });
  if (!result.reserved) fail("autopilot policy budget or operation limit was reached", "PRIVATEPAY_AUTOPILOT_POLICY_LIMIT", 403);
  return { operation_id: reservation.id, policy_id: policy.id, nonce: reservation.id, resource: reservation.resource, provider_id: reservation.provider_id, amount_base_units: reservation.amount_base_units, status: "reserved", expires_at: reservation.expires_at, payment_per_operation: true, x402_next_request: "POST /api/privatepay/x402 with the same resource, provider_id, amount_base_units, autopilot_policy_id, autopilot_operation_id, autopilot_session_signature, and a fresh PAYMENT-SIGNATURE" };
}

export async function validatePrivatePayAutopilotOperation(config, input = {}) {
  requireEnabled(config);
  const { policy } = await activePolicy(config, input.policy_id);
  const { operations } = await collections(config);
  const operation = await operations.findOne({ id: String(input.operation_id || ""), policy_id: policy.id, status: "reserved" });
  if (!operation || operation.resource !== String(input.resource || "") || operation.provider_id !== String(input.provider_id || "") || operation.amount_base_units !== String(input.amount_base_units || "")) fail("autopilot operation does not match this x402 request", "PRIVATEPAY_AUTOPILOT_OPERATION_MISMATCH", 403);
  if (input.session_signature) verifySignedMessage(policy.session_public_key, operation.authorization_message, input.session_signature, "autopilot_session_signature");
  else fail("autopilot_session_signature is required for the x402 request", "PRIVATEPAY_AUTOPILOT_SESSION_SIGNATURE_REQUIRED", 403);
  return { policy, operation };
}

export async function completePrivatePayAutopilotOperation(config, policyId, operationId) {
  const { policies, operations } = await collections(config);
  const operation = await operations.findOne({ id: operationId, policy_id: policyId, status: "reserved" });
  if (!operation) return { completed: false, reason: "operation_not_reserved" };
  const now = new Date().toISOString();
  const claimed = await operations.updateOne({ id: operationId, policy_id: policyId, status: "reserved" }, { $set: { status: "completing", updated_at: now } });
  if (claimed.modifiedCount !== 1) return { completed: false, reason: "operation_already_claimed" };
  const updated = await policies.findOneAndUpdate({ id: policyId, status: "active", reserved_base_units: { $gte: Number(operation.amount_base_units) }, reserved_operations: { $gte: 1 } }, { $inc: { reserved_base_units: -Number(operation.amount_base_units), reserved_operations: -1, spent_base_units: Number(operation.amount_base_units), completed_operations: 1 }, $set: { updated_at: now } });
  if (!updated) {
    await operations.updateOne({ id: operationId, status: "completing" }, { $set: { status: "reserved", updated_at: now } });
    return { completed: false, reason: "policy_reservation_invalid" };
  }
  await operations.updateOne({ id: operationId, status: "completing" }, { $set: { status: "completed", completed_at: now, updated_at: now } });
  return { completed: true };
}

export async function cancelPrivatePayAutopilotOperation(config, input = {}) {
  requireEnabled(config);
  const { policy } = await activePolicy(config, input.policy_id);
  const { operations, policies } = await collections(config);
  const operation = await operations.findOne({ id: String(input.operation_id || ""), policy_id: policy.id, status: "reserved" });
  if (!operation) return { cancelled: false, reason: "operation_not_reserved" };
  const message = canonicalMessage("cancel", { operation_id: operation.id, policy_id: policy.id });
  verifySignedMessage(policy.session_public_key, message, input.session_signature, "session_signature");
  const now = new Date().toISOString();
  const claimed = await operations.updateOne({ id: operation.id, status: "reserved" }, { $set: { status: "cancelling", updated_at: now } });
  if (claimed.modifiedCount !== 1) return { cancelled: false, reason: "operation_already_claimed" };
  const released = await policies.updateOne({ id: policy.id, reserved_base_units: { $gte: Number(operation.amount_base_units) }, reserved_operations: { $gte: 1 } }, { $inc: { reserved_base_units: -Number(operation.amount_base_units), reserved_operations: -1 }, $set: { updated_at: now } });
  if (released.modifiedCount !== 1) {
    await operations.updateOne({ id: operation.id, status: "cancelling" }, { $set: { status: "reserved", updated_at: now } });
    return { cancelled: false, reason: "policy_reservation_invalid" };
  }
  await operations.updateOne({ id: operation.id, status: "cancelling" }, { $set: { status: "cancelled", cancelled_at: now, updated_at: now } });
  return { cancelled: true, operation_id: operation.id, policy_id: policy.id, message };
}
