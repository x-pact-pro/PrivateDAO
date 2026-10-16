import { createHash, createPublicKey, verify as verifySignature } from "node:crypto";

export const SEALKEEPER_API_ORIGIN = "https://api.sealkeeper.run";
export const SEALKEEPER_KEYS_URL = "https://sealkeeper.run/.well-known/seal.json";
export const SEALKEEPER_KEY_MAX_AGE_MS = 5 * 60 * 1000;
const ALLOWED_VERSIONS = new Set([1, 2, 3, 4, 5]);
const MAX_RESPONSE_BYTES = 512 * 1024;

export class SealkeeperError extends Error {
  constructor(code, message = code, details = {}) {
    super(message);
    this.name = "SealkeeperError";
    this.code = code;
    this.details = details;
  }
}

function base64urlDecode(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]*$/.test(value))
    throw new SealkeeperError("malformed", "invalid base64url segment");
  return Buffer.from(value, "base64url");
}

function jsonSegment(value, label) {
  try {
    return JSON.parse(base64urlDecode(value).toString("utf8"));
  } catch {
    throw new SealkeeperError("malformed", `invalid ${label}`);
  }
}

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new SealkeeperError("malformed", `${label} must be an object`);
  return value;
}

function assertTrustedHttpsUrl(value, allowedOrigin, label) {
  let url;
  try { url = new URL(value); } catch { throw new SealkeeperError("ssrf_blocked", `${label} is not a URL`); }
  if (url.protocol !== "https:" || url.origin !== allowedOrigin || url.username || url.password || url.hash)
    throw new SealkeeperError("ssrf_blocked", `${label} is not an allowed Sealkeeper URL`);
  return url;
}

function sealUrlForAgent(agentId) {
  const raw = String(agentId || "").trim();
  if (!/^[A-Za-z0-9_-]{20,120}$/.test(raw)) throw new SealkeeperError("invalid_agent_id", "invalid Sealkeeper agent id");
  return `${SEALKEEPER_API_ORIGIN}/v1/agents/${encodeURIComponent(raw)}/seal`;
}

function taskUrlForAgent(agentId) {
  const raw = String(agentId || "").trim();
  if (!/^[A-Za-z0-9_-]{20,120}$/.test(raw)) throw new SealkeeperError("invalid_agent_id", "invalid Sealkeeper agent id");
  return `${SEALKEEPER_API_ORIGIN}/v1/agents/${encodeURIComponent(raw)}/tasks?role=claimant&limit=100`;
}

async function readJson(url, { fetchImpl = fetch, signal, maxBytes = MAX_RESPONSE_BYTES } = {}) {
  const response = await fetchImpl(url, { method: "GET", redirect: "error", signal, headers: { accept: "application/json" } });
  const body = await response.text();
  if (Buffer.byteLength(body, "utf8") > maxBytes) throw new SealkeeperError("response_too_large");
  let parsed = null;
  try { parsed = body ? JSON.parse(body) : null; } catch { throw new SealkeeperError("invalid_response", "Sealkeeper returned invalid JSON"); }
  if (!response.ok) {
    const code = parsed?.error?.code || parsed?.code || (response.status === 429 ? "rate_limited" : response.status === 404 ? "not_found" : "upstream_error");
    throw new SealkeeperError(code, `Sealkeeper returned HTTP ${response.status}`, { status: response.status, retryAfter: response.headers.get("retry-after") || null });
  }
  return parsed;
}

function normalizeKeyDocument(document) {
  const keys = Array.isArray(document) ? document : document?.keys;
  if (!Array.isArray(keys)) throw new SealkeeperError("invalid_key_document");
  return keys.filter((key) => key && typeof key === "object").map((key) => ({ ...key }));
}

export class PublicKeyCache {
  constructor({ fetchImpl = fetch, keysUrl = SEALKEEPER_KEYS_URL, maxAgeMs = SEALKEEPER_KEY_MAX_AGE_MS, now = () => Date.now() } = {}) {
    this.fetchImpl = fetchImpl;
    this.keysUrl = keysUrl;
    this.maxAgeMs = Math.min(Math.max(Number(maxAgeMs) || SEALKEEPER_KEY_MAX_AGE_MS, 1), SEALKEEPER_KEY_MAX_AGE_MS);
    this.now = now;
    this.cached = null;
  }

  async get(kid, { force = false } = {}) {
    assertTrustedHttpsUrl(this.keysUrl, new URL(SEALKEEPER_KEYS_URL).origin, "keys URL");
    if (!force && this.cached && this.now() - this.cached.fetchedAt < this.maxAgeMs) {
      const found = this.cached.keys.find((key) => key.kid === kid);
      if (found) return found;
    }
    const document = await readJson(this.keysUrl, { fetchImpl: this.fetchImpl });
    const keys = normalizeKeyDocument(document);
    this.cached = { keys, fetchedAt: this.now() };
    const found = keys.find((key) => key.kid === kid);
    if (!found) throw new SealkeeperError("unknown_kid");
    return found;
  }
}

function publicKeyFromJwk(key) {
  if (key.kty !== "OKP" || key.crv !== "Ed25519" || typeof key.x !== "string") throw new SealkeeperError("invalid_key");
  try { return createPublicKey({ key: { kty: "OKP", crv: "Ed25519", x: key.x }, format: "jwk" }); }
  catch { throw new SealkeeperError("invalid_key"); }
}

function base58Decode(value) {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let number = 0n;
  for (const character of value) {
    const digit = alphabet.indexOf(character);
    if (digit < 0) throw new SealkeeperError("malformed", "invalid did:key");
    number = number * 58n + BigInt(digit);
  }
  const bytes = [];
  while (number > 0n) { bytes.unshift(Number(number % 256n)); number /= 256n; }
  for (const character of value) { if (character !== "1") break; bytes.unshift(0); }
  return Buffer.from(bytes);
}

function publicKeyFromDid(did) {
  const encoded = String(did || "").replace(/^did:key:z/, "");
  if (!String(did || "").startsWith("did:key:z")) throw new SealkeeperError("invalid_key");
  const bytes = base58Decode(encoded);
  if (bytes.length !== 34 || bytes[0] !== 0xed || bytes[1] !== 0x01) throw new SealkeeperError("invalid_key");
  return publicKeyFromJwk({ kty: "OKP", crv: "Ed25519", x: Buffer.from(bytes.subarray(2)).toString("base64url") });
}

export function verifyHandshake(handshake, { expectedAgentId, expectedNonce, expectedAudience, did, sealPayload, now = () => Date.now() } = {}) {
  const parts = String(handshake || "").split(".");
  if (parts.length !== 3 || parts.some((part) => !part)) throw new SealkeeperError("malformed");
  const header = jsonSegment(parts[0], "handshake header");
  const payload = jsonSegment(parts[1], "handshake payload");
  if (header.alg !== "EdDSA" || header.kid !== expectedAgentId || payload.sub !== expectedAgentId)
    throw new SealkeeperError("wrong_agent");
  if (expectedNonce !== undefined && payload.nonce !== expectedNonce) throw new SealkeeperError("nonce_mismatch");
  if (expectedAudience !== undefined && payload.aud !== expectedAudience) throw new SealkeeperError("wrong_verifier");
  const nowSeconds = now() / 1000;
  if (!Number.isFinite(payload.iat) || payload.iat > nowSeconds + 300 || payload.iat < nowSeconds - 300)
    throw new SealkeeperError("stale");
  const key = publicKeyFromDid(did);
  if (!verifySignature(null, Buffer.from(`${parts[0]}.${parts[1]}`, "ascii"), key, base64urlDecode(parts[2])))
    throw new SealkeeperError("bad_signature");
  const expectedFingerprint = sealPayload?.fingerprint?.hash;
  if (!expectedFingerprint) return { requested: true, valid: true, result: "no_fingerprint", proof: "verifier" };
  return { requested: true, valid: true, result: payload.fingerprint === expectedFingerprint ? "matches" : "changed", proof: "verifier" };
}

function validatePayload(payload, { expectedAgentId, nowSeconds }) {
  assertObject(payload, "payload");
  if (payload.iss !== "sealkeeper.run") throw new SealkeeperError("wrong_issuer");
  if (!ALLOWED_VERSIONS.has(payload.ver)) throw new SealkeeperError("unsupported_version");
  if (!Number.isFinite(payload.iat) || !Number.isFinite(payload.exp)) throw new SealkeeperError("malformed");
  if (payload.exp <= nowSeconds) throw new SealkeeperError("expired");
  if (payload.iat > nowSeconds + 300) throw new SealkeeperError("not_yet_valid");
  if (String(payload.sub || "") !== String(expectedAgentId)) throw new SealkeeperError("wrong_subject");
  return payload;
}

export async function verifySeal(seal, { expectedAgentId, keyCache = new PublicKeyCache(), now = () => Date.now(), maxClockSkewSeconds = 300 } = {}) {
  const parts = String(seal || "").split(".");
  if (parts.length !== 3 || parts.some((part) => !part)) throw new SealkeeperError("malformed");
  const header = jsonSegment(parts[0], "header");
  const headerKeys = Object.keys(header).sort();
  if (headerKeys.length !== 2 || header.alg !== "EdDSA" || typeof header.kid !== "string" || headerKeys.join(",") !== "alg,kid")
    throw new SealkeeperError("malformed");
  const key = await keyCache.get(header.kid);
  if (key.alg && key.alg !== "EdDSA") throw new SealkeeperError("invalid_key");
  const signature = base64urlDecode(parts[2]);
  const publicKey = publicKeyFromJwk(key);
  if (!verifySignature(null, Buffer.from(`${parts[0]}.${parts[1]}`, "ascii"), publicKey, signature))
    throw new SealkeeperError("bad_signature");
  const payload = jsonSegment(parts[1], "payload");
  validatePayload(payload, { expectedAgentId, nowSeconds: now() / 1000, maxClockSkewSeconds });
  return { valid: true, seal: String(seal), header: { alg: header.alg, kid: header.kid }, payload, expiresIn: Math.max(0, Math.floor(payload.exp - now() / 1000)) };
}

function reputationFromPayload(payload) {
  const counts = payload.counts && typeof payload.counts === "object" ? payload.counts : {};
  return {
    level: payload.level ?? null,
    scores: payload.scores && typeof payload.scores === "object" ? payload.scores : {},
    counts,
    trust: Number.isFinite(payload.trust) ? payload.trust : null,
    countsForTrust: payload.countsForTrust === true,
  };
}

export async function verifyRemoteHandshake({ seal, agentId, handshake, nonce, aud, fetchImpl = fetch, verifyUrl = `${SEALKEEPER_API_ORIGIN}/v1/seal/verify` } = {}) {
  if (!handshake || !nonce || !aud) return { requested: false, valid: false, result: "not_requested" };
  assertTrustedHttpsUrl(verifyUrl, SEALKEEPER_API_ORIGIN, "verify URL");
  const response = await fetchImpl(verifyUrl, {
    method: "POST", redirect: "error", headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ seal, agent: agentId, handshake, nonce, aud }),
  });
  const body = await response.text();
  let result;
  try { result = JSON.parse(body); } catch { throw new SealkeeperError("invalid_response", "Sealkeeper handshake response was not JSON"); }
  if (!response.ok) throw new SealkeeperError(result?.reason || "handshake_error", `Sealkeeper returned HTTP ${response.status}`, { status: response.status });
  return { requested: true, valid: result.valid === true && result.handshake?.valid !== false, result: result.handshake?.result || result.result || null, proof: result.handshake?.proof || null, reason: result.handshake?.reason || result.reason || null };
}

function normalizeTaskEvidence(tasks) {
  return (Array.isArray(tasks) ? tasks : []).map((task) => ({
    id: task.id || null,
    taskType: task.taskType || null,
    verifiedAt: task.verifiedAt || null,
    countsForTrust: task.countsForTrust === true,
    difficulty: task.difficulty ?? null,
  }));
}

export async function readSealReputation({ agentId, sealUrl, handshake, nonce, aud, fetchImpl = fetch, keyCache, now, includeTasks = true } = {}) {
  const expectedAgentId = String(agentId || "").trim();
  if (!expectedAgentId) throw new SealkeeperError("invalid_agent_id");
  const url = sealUrl ? assertTrustedHttpsUrl(sealUrl, SEALKEEPER_API_ORIGIN, "seal URL") : new URL(sealUrlForAgent(expectedAgentId));
  if (url.search || url.pathname !== `/v1/agents/${encodeURIComponent(expectedAgentId)}/seal` && !/^\/v1\/agents\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+\/seal$/.test(url.pathname))
    throw new SealkeeperError("ssrf_blocked", "seal URL is not a canonical Sealkeeper agent route");
  const sealEndpoint = url.toString();
  const sealResponse = await readJson(sealEndpoint, { fetchImpl });
  const seal = sealResponse?.seal || sealResponse?.credential;
  const verified = await verifySeal(seal, { expectedAgentId, keyCache, now });
  let handshakeResult = { requested: false, valid: false, result: "not_requested" };
  if (handshake) {
    try {
      handshakeResult = verifyHandshake(handshake, { expectedAgentId, expectedNonce: nonce, expectedAudience: aud, did: sealResponse?.did, sealPayload: verified.payload, now });
    } catch (error) {
      handshakeResult = await verifyRemoteHandshake({ seal, agentId: expectedAgentId, handshake, nonce, aud, fetchImpl }).catch(() => ({ requested: true, valid: false, result: "refused", reason: error.code || "handshake_error" }));
    }
  }
  let tasks = [];
  let taskError = null;
  if (includeTasks) {
    try { tasks = normalizeTaskEvidence((await readJson(taskUrlForAgent(expectedAgentId), { fetchImpl }))?.tasks); }
    catch (error) { taskError = error instanceof SealkeeperError ? error.code : "task_read_failed"; }
  }
  return {
    accepted: true,
    credentialValidity: { valid: true, issuer: verified.payload.iss, version: verified.payload.ver, expiresAt: new Date(verified.payload.exp * 1000).toISOString(), kid: verified.header.kid },
    reputationLevel: reputationFromPayload(verified.payload),
    taskEvidence: { tasks, fetched: includeTasks && !taskError, error: taskError },
    identityVerification: handshakeResult,
    agentId: expectedAgentId,
  };
}

export function sealkeeperFailure(error) {
  const code = error instanceof SealkeeperError ? error.code : "verification_failed";
  return { accepted: false, credentialValidity: { valid: false, error: code }, reputationLevel: null, taskEvidence: { tasks: [], fetched: false, error: code }, identityVerification: { requested: false, valid: false, result: "not_verified" }, error: code };
}

export function sealDigest(seal) { return createHash("sha256").update(String(seal), "utf8").digest("hex"); }
