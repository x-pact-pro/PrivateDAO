import test from "node:test";
import assert from "node:assert/strict";
import { assertAutopilotOperationFresh, decodeAutopilotSignature, privatePayAutopilotStatus } from "../src/privatepay-autopilot.mjs";

test("PrivatePAY Autopilot stays disabled without explicit activation and MongoDB", () => {
  const status = privatePayAutopilotStatus({
    privatePayAutopilotEnabled: false,
    mongoUri: "",
  });

  assert.equal(status.enabled, false);
  assert.equal(status.configured, false);
  assert.equal(status.storage, "unavailable");
  assert.deepEqual(status.blockers, [
    "explicit autopilot activation is disabled",
    "MongoDB storage is not configured",
  ]);
  assert.equal(status.reusable_x402_credentials, false);
});

test("PrivatePAY Autopilot reports MongoDB readiness separately from activation", () => {
  const status = privatePayAutopilotStatus({
    privatePayAutopilotEnabled: false,
    mongoUri: "mongodb://test-only",
  });

  assert.equal(status.enabled, false);
  assert.equal(status.storage, "mongodb");
  assert.deepEqual(status.blockers, ["explicit autopilot activation is disabled"]);
  assert.equal(status.policy_limits.max_operations, 10000);
});

test("PrivatePAY Autopilot accepts canonical signatures and rejects malformed encodings", () => {
  const valid = Buffer.alloc(64, 7).toString("base64");
  assert.equal(decodeAutopilotSignature(valid).length, 64);
  assert.throws(() => decodeAutopilotSignature(valid.slice(0, -1), "session_signature"), /canonical base64/);
  assert.throws(() => decodeAutopilotSignature(`${valid.slice(0, -2)}!!`, "session_signature"), /canonical base64/);
});

test("PrivatePAY Autopilot rejects an expired reserved operation", () => {
  assert.throws(() => assertAutopilotOperationFresh({ expires_at: "2026-01-01T00:00:00.000Z" }, Date.parse("2026-01-02T00:00:00.000Z")), (error) => {
    assert.equal(error.code, "PRIVATEPAY_AUTOPILOT_OPERATION_EXPIRED");
    assert.equal(error.statusCode, 403);
    return true;
  });
  assert.doesNotThrow(() => assertAutopilotOperationFresh({ expires_at: "2026-01-02T00:00:00.000Z" }, Date.parse("2026-01-01T00:00:00.000Z")));
});
