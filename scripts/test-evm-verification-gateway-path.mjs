import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const path = "packages/evm-verification/scripts/run-e2e.mjs";
const source = await readFile(path, "utf8");

assert.match(source, /createPrivateDaoRuntime/);
assert.match(source, /new InMemoryProviderRegistry\(\)/);
assert.match(source, /runtime\.gateway\.prepare\(intent, "maker"\)/);
assert.match(source, /runtime\.gateway\.submit\(prepared, prepared\.unsignedPayload, "maker"\)/);
assert.match(source, /runtime\.gateway\.receipt\(/);
assert.doesNotMatch(source, /executeContractControlCheck/);
assert.doesNotMatch(source, /adapter\.prepare\(/);
assert.doesNotMatch(source, /adapter\.submit\(/);
assert.doesNotMatch(source, /adapter\.receipt\(/);
assert.match(source, /capability: "verification\.record\.revoke"/);
assert.match(source, /capability: "verification\.blind\.revoke"/);
assert.doesNotMatch(source, /InMemoryProtocolRegistry/);

console.log("[evm-verification-gateway-path] product writes are guarded by ProductExecutionGateway");
