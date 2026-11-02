import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(new URL("../scripts/privatepay-conformance.mjs", import.meta.url));

test("read-only conformance audit exits cleanly when RPC does not respond", async () => {
  const server = createServer(() => {});
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  const child = spawn(process.execPath, [script, "--rpc", `http://127.0.0.1:${port}`, "--timeout-ms", "1000"], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = [];
  child.stdout.on("data", (chunk) => output.push(chunk));
  const watchdog = setTimeout(() => child.kill("SIGKILL"), 5000);
  const [code] = await once(child, "close");
  clearTimeout(watchdog);
  await new Promise((resolve) => server.close(resolve));

  assert.equal(code, 2);
  const report = JSON.parse(Buffer.concat(output).toString("utf8"));
  assert.equal(report.readOnly, true);
  assert.equal(report.status, "unavailable");
  assert.match(report.error, /timed out|timeout|abort/i);
});
