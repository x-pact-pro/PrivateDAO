import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const port = 18892;
const child = spawn(process.execPath, ["--import", "tsx", "scripts/record-anchor-service.mjs"], {
  env: { ...process.env, RECORD_TEST_PORT: String(port), RECORD_TEST_CLUSTER: "devnet", PDAO_RECORD_ANCHOR_BROADCAST_ENABLED: "0", PDAO_RECORD_ANCHOR_E2E_APPROVED: "0", PDAO_RECORD_ANCHOR_KEYPAIR_PATH: "" },
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
child.stdout.on("data", (chunk) => { output += chunk.toString(); });
child.stderr.on("data", (chunk) => { output += chunk.toString(); });

try {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (output.includes("record-anchor-service listening")) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.match(output, /record-anchor-service listening/);
  const health = await fetch(`http://127.0.0.1:${port}/healthz`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { ok: true, network: "solana-devnet", broadcastEnabled: false });
  const response = await fetch(`http://127.0.0.1:${port}/v1/records/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      organizationId: "local-test",
      record: { schema_version: "1", record_type: "boundary", record_id: "dry-run", issuer: "privatedao.local", issued_at: "2026-08-07T12:00:00.000Z", payload: { result: "approved" } },
      schema: { type: "object", required: ["result"] },
      public_fields: ["result"],
    }),
  });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "record_anchor_broadcast_disabled" });
  console.log("record-anchor-service boundary: PASS health=1 no-secret-dry-run=1 broadcast=disabled");
} finally {
  child.kill("SIGTERM");
  await new Promise((resolve) => child.once("exit", resolve));
}
