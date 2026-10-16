import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import { getConfig } from "../src/config.mjs";
import { HandshakeReplayCache, PublicKeyCache, SealkeeperError, readSealReputation, sealkeeperFailure, verifyHandshake, verifySeal } from "../src/sealkeeper.mjs";

const agentId = "gTl3Dqh9F19Wo1Rmw0x-zMuNipG07jeiXfYPW4_Js5Q";
const now = () => Date.parse("2026-10-01T12:00:00Z");

test("SEAL reputation is disabled by default", () => {
  assert.equal(getConfig({}).sealReputationEnabled, false);
});

function response(body, status = 200, headers = {}) {
  return { ok: status >= 200 && status < 300, status, headers: new Headers(headers), text: async () => typeof body === "string" ? body : JSON.stringify(body) };
}

function fixtureKey() {
  const pair = generateKeyPairSync("ed25519");
  const jwk = pair.publicKey.export({ format: "jwk" });
  return { pair, jwk: { ...jwk, kid: "test-kid", alg: "EdDSA" } };
}

function makeSeal(privateKey, payload, header = { alg: "EdDSA", kid: "test-kid" }) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const signingInput = `${encode(header)}.${encode(payload)}`;
  return `${signingInput}.${sign(null, Buffer.from(signingInput, "ascii"), privateKey).toString("base64url")}`;
}

function cacheFor(key, fetchImpl) {
  return new PublicKeyCache({ fetchImpl, now: () => now(), keysUrl: "https://sealkeeper.run/.well-known/seal.json" });
}

test("verifies a signed SEAL without reading claims before signature verification", async () => {
  const { pair, jwk } = fixtureKey();
  const seal = makeSeal(pair.privateKey, { iss: "sealkeeper.run", sub: agentId, ver: 1, iat: now() / 1000, exp: now() / 1000 + 3600, level: "none", counts: { events: 0 } });
  const keys = cacheFor(jwk, async () => response({ keys: [jwk] }));
  const result = await verifySeal(seal, { expectedAgentId: agentId, keyCache: keys, now });
  assert.equal(result.valid, true);
  assert.equal(result.payload.level, "none");
});

for (const [name, mutate, code] of [
  ["bad signature", (seal) => { const parts = seal.split("."); const bytes = Buffer.from(parts[2], "base64url"); bytes[0] ^= 1; parts[2] = bytes.toString("base64url"); return parts.join("."); }, "bad_signature"],
  ["expired", (seal, payload, pair) => makeSeal(pair.privateKey, { ...payload, exp: now() / 1000 - 1 }), "expired"],
  ["unknown key", (seal, payload, pair) => makeSeal(pair.privateKey, payload, { alg: "EdDSA", kid: "unknown-kid" }), "unknown_kid"],
]) {
  test(`rejects ${name}`, async () => {
    const { pair, jwk } = fixtureKey();
    const payload = { iss: "sealkeeper.run", sub: agentId, ver: 1, iat: now() / 1000, exp: now() / 1000 + 3600 };
    const original = makeSeal(pair.privateKey, payload);
    const seal = mutate(original, payload, pair);
    await assert.rejects(() => verifySeal(seal, { expectedAgentId: agentId, keyCache: cacheFor(jwk, async () => response({ keys: [jwk] })), now }), (error) => error instanceof SealkeeperError && error.code === code);
  });
}

test("reads live-shaped reputation independently from credential validity", async () => {
  const { pair, jwk } = fixtureKey();
  const seal = makeSeal(pair.privateKey, { iss: "sealkeeper.run", sub: agentId, ver: 1, iat: now() / 1000, exp: now() / 1000 + 3600, level: "none", scores: { reliability: null, provenance: null }, counts: { events: 0 }, countsForTrust: false });
  const fetchImpl = async (url) => {
    if (String(url).endsWith("/.well-known/seal.json")) return response({ keys: [jwk] });
    if (String(url).includes("/seal")) return response({ seal, credential: seal });
    if (String(url).includes("/tasks")) return response({ tasks: [{ id: "task-1", countsForTrust: false }] });
    throw new Error(`unexpected URL ${url}`);
  };
  const result = await readSealReputation({ agentId, fetchImpl, keyCache: cacheFor(jwk, fetchImpl), now });
  assert.equal(result.accepted, true);
  assert.equal(result.credentialValidity.valid, true);
  assert.equal(result.reputationLevel.level, "none");
  assert.equal(result.reputationLevel.countsForTrust, false);
  assert.equal(result.taskEvidence.tasks[0].countsForTrust, false);
});

test("blocks non-Sealkeeper URLs and degrades to an optional signal", async () => {
  await assert.rejects(() => readSealReputation({ agentId, sealUrl: "https://example.com/v1/agents/x/seal" }), (error) => error.code === "ssrf_blocked");
  const result = sealkeeperFailure(new SealkeeperError("not_found"));
  assert.equal(result.accepted, false);
  assert.equal(result.error, "not_found");
});

test("rejects a reused nonce handshake in the same runtime", async () => {
  const { pair, jwk } = fixtureKey();
  const payload = { iss: "sealkeeper.run", sub: agentId, ver: 1, iat: now() / 1000, exp: now() / 1000 + 3600 };
  const seal = makeSeal(pair.privateKey, payload);
  const replayCache = new HandshakeReplayCache({ now, ttlMs: 300_000 });
  const handshakeHeader = { alg: "EdDSA", kid: agentId };
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const handshakePayload = { sub: agentId, nonce: "fresh-nonce", aud: "pdao-test", iat: now() / 1000 };
  const input = `${encode(handshakeHeader)}.${encode(handshakePayload)}`;
  const handshake = `${input}.${sign(null, Buffer.from(input, "ascii"), pair.privateKey).toString("base64url")}`;
  const fetchImpl = async (url) => String(url).endsWith("/seal") ? response({ seal, did: "did:key:z6Mki7p8m4j8qHqH4kz6Kf1w1D6mM1hYVhX7V6fXc3vQw4V8" }) : response({ keys: [jwk] });
  const options = { agentId, handshake, nonce: "fresh-nonce", aud: "pdao-test", fetchImpl, keyCache: cacheFor(jwk, fetchImpl), replayCache, includeTasks: false, now };
  await readSealReputation(options);
  await assert.rejects(() => readSealReputation(options), (error) => error.code === "replay_detected");
});

test("honors the configured SEAL clock-skew bound", async () => {
  const { pair, jwk } = fixtureKey();
  const seal = makeSeal(pair.privateKey, { iss: "sealkeeper.run", sub: agentId, ver: 1, iat: now() / 1000 + 10, exp: now() / 1000 + 3600 });
  await assert.rejects(() => verifySeal(seal, { expectedAgentId: agentId, keyCache: cacheFor(jwk, async () => response({ keys: [jwk] })), now, maxClockSkewSeconds: 1 }), (error) => error.code === "not_yet_valid");
});

test("official fixtures pass when explicitly enabled", { skip: !process.env.SEALKEEPER_RUN_LIVE_TESTS }, async (t) => {
  const fixtureBase = "https://raw.githubusercontent.com/sealkeeper-dev/cli/main/fixtures";
  const get = async (path) => (await fetch(`${fixtureBase}/${path}`)).text();
  const keys = await (await fetch(`${fixtureBase}/keys.json`)).json();
  const fixtureAgent = await (await fetch(`${fixtureBase}/agent.json`)).json();
  const fixtureNow = () => Date.parse("2026-10-01T12:00:00Z");
  const makeCache = new PublicKeyCache({ fetchImpl: async () => response(keys), now: fixtureNow });
  const cases = [
    ["v1-valid.txt", true, null],
    ["v1-expired.txt", false, "expired"],
    ["v1-bad-signature.txt", false, "bad_signature"],
    ["v1-unknown-kid.txt", false, "unknown_kid"],
  ];
  for (const [file, valid, reason] of cases) {
    const seal = await get(`seals/${file}`);
    if (valid) {
      const result = await verifySeal(seal, { expectedAgentId: fixtureAgent.id, keyCache: makeCache, now: fixtureNow });
      assert.equal(result.valid, true, file);
    } else {
      await assert.rejects(() => verifySeal(seal, { expectedAgentId: fixtureAgent.id, keyCache: makeCache, now: fixtureNow }), (error) => error.code === reason, file);
    }
  }
  const v4 = await get("seals/v4-valid.txt");
  const handshake = await get("handshake/handshake.txt");
  const sealPayload = JSON.parse(Buffer.from(v4.split(".")[1], "base64url").toString("utf8"));
  const handshakeResult = verifyHandshake(handshake, { expectedAgentId: fixtureAgent.id, expectedNonce: "fixture-nonce", expectedAudience: "fixture-verifier", did: fixtureAgent.did, sealPayload, now: fixtureNow });
  assert.deepEqual(handshakeResult, { requested: true, valid: true, result: "matches", proof: "verifier" });
  await t.test("official fixture identity is present", () => assert.match(fixtureAgent.id, /^[A-Za-z0-9_-]{20,120}$/));
});
