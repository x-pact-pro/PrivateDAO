import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("scripts/run-zcash-testnet-e2e.mjs", "utf8");

assert.match(source, /runtime\.gateway\.prepare\(intent, "maker"\)/, "Zcash E2E must prepare through ProductExecutionGateway");
assert.match(source, /runtime\.gateway\.submit\(prepared, prepared\.unsignedPayload, "maker"\)/, "Zcash E2E must submit through ProductExecutionGateway");
assert.match(source, /runtime\.gateway\.receipt\(\{ executionId: submitted\.executionId, intent: prepared\.intent \}, "maker"\)/, "Zcash E2E must read receipts through ProductExecutionGateway");
assert.doesNotMatch(source, /adapter\.prepare\(|adapter\.submit\(|adapter\.receipt\(/, "Zcash E2E must not bypass ProductExecutionGateway");

console.log("[zcash-gateway-path] prepare, submit, and receipt are Kernel Gateway routed");
