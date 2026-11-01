import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ZalletCliTransport } from "../packages/privatedao-runtime/src/index.ts";

const directory = await mkdtemp(join(tmpdir(), "privatedao-zallet-safety-"));
const logPath = join(directory, "calls.log");
const binaryPath = join(directory, "zallet-fake.mjs");

await writeFile(binaryPath, `#!/usr/bin/env node
const fs = await import("node:fs/promises");
const method = process.argv[process.argv.indexOf("rpc") + 1];
await fs.appendFile(${JSON.stringify(logPath)}, method + "\\n");
if (method === "getwalletinfo") process.stdout.write(JSON.stringify({ locked: false }));
else if (method === "getwalletstatus") process.stdout.write(JSON.stringify({ node_tip: { height: 10 }, wallet_tip: { height: 10 }, fully_synced_height: 10 }));
else process.stdout.write(JSON.stringify({ result: "unexpected" }));
`);
await chmod(binaryPath, 0o755);

try {
  const transport = new ZalletCliTransport({
    binaryPath,
    dataDirectory: directory,
    configPath: join(directory, "zallet.conf"),
    network: "zcash-testnet",
    explorerBaseUrl: "https://example.invalid/tx",
    allowBalanceReadinessProbe: false,
    broadcastEnabled: false,
  });
  const health = await transport.health();
  assert.equal(health.ok, true);
  const intent = {
    context: {
      requestId: "zallet-safety-test",
      idempotencyKey: "zallet-safety-test",
      product: "payroll",
      capability: "payroll.settle",
      organizationId: "test",
      actorId: "test",
      network: "zcash-testnet",
      provider: "privatedao-zallet-testnet",
    },
    payload: {
      kind: "zallet-send",
      fromAddress: "tmFakeSource",
      recipients: [{ address: "tmFakeRecipient", atomicAmount: "10000" }],
    },
    accounts: [],
  };
  const prepared = await transport.prepare(intent);
  await assert.rejects(
    () => transport.submit(prepared, prepared.unsignedPayload),
    /broadcast is disabled/i,
  );
  const calls = await readFile(logPath, "utf8");
  assert.equal(calls.includes("z_sendmany"), false);
  console.log("Zallet safety checks passed: no broadcast was attempted.");
} finally {
  await rm(directory, { recursive: true, force: true });
}
