import test from "node:test";
import assert from "node:assert/strict";
import { privatePayAutopilotStatus } from "../src/privatepay-autopilot.mjs";

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
