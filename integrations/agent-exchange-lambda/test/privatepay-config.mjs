import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { handler, resetForTests } from "../src/handler.mjs";
import { decodePrivatePaySignature } from "../src/privatepay.mjs";

const artifactPaths = [
  new URL("../scripts/privatepay-x402-status.mjs", import.meta.url),
  new URL("../scripts/privatepay-x402-verify-settle.mjs", import.meta.url),
  new URL("../scripts/privatepay-x402-submit.mjs", import.meta.url),
];

test("production deployment points PrivatePAY at the provisioned production secret", async () => {
  const artifacts = await Promise.all(artifactPaths.map((path) => readFile(path, "utf8")));
  for (const artifact of artifacts) {
    assert.match(artifact, /PRIVATEPAY_SECRET_ID \|\| "pdao\/agent-exchange\/privatepay-production"/);
    assert.doesNotMatch(artifact, /pdao\/agent-exchange\/privatepay["'`\s]/);
  }
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
