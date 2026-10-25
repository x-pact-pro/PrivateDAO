import test from "node:test";
import assert from "node:assert/strict";
import { handler, resetForTests } from "../src/handler.mjs";
import { getConfig } from "../src/config.mjs";
import { decodePrivatePaySignature } from "../src/privatepay.mjs";

test("PrivatePAY secret wiring is explicit and does not invent a local production secret", () => {
  const configured = getConfig({ AGENT_EXCHANGE_PRIVATEPAY_SECRET_ID: "pdao/agent-exchange/privatepay-production" });
  assert.equal(configured.privatePaySecretId, "pdao/agent-exchange/privatepay-production");
  assert.equal(getConfig({}).privatePaySecretId, "");
});

test("public PrivatePAY errors expose safe readiness metadata without provider secrets", async () => {
  resetForTests();
  const response = await handler({
    requestContext: { http: { method: "POST", path: "/api/privatepay/x402" } },
    body: JSON.stringify({}),
  });
  const body = JSON.parse(response.body);
  assert.equal(response.statusCode, 503);
  assert.equal(body.code, "PRIVATEPAY_NOT_READY");
  assert.equal(body.privatepay_status.enabled, false);
  assert.ok(Array.isArray(body.privatepay_status.activation_blockers));
  assert.doesNotMatch(response.body, /secret|apiKey|authorization|private.?key/i);
});

test("PrivatePAY rejects oversized payment signatures before x402 schema parsing", () => {
  assert.throws(
    () => decodePrivatePaySignature("A".repeat(32769)),
    (error) => error?.code === "PRIVATEPAY_PAYMENT_HEADER_TOO_LARGE" && error?.statusCode === 413,
  );
});
