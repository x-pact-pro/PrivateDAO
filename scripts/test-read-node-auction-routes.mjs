import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import path from "node:path";

import { computeAuctionResultCommitment } from "../apps/web/src/lib/auction-outcome-proof.ts";

const port = 18993;
const runtimeStateDir = `/tmp/privatedao-read-node-auction-${randomUUID()}`;
const child = spawn(process.execPath, [path.resolve("node_modules/ts-node/dist/bin.js"), "scripts/run-read-node.ts"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PRIVATE_DAO_READ_NODE_HOST: "127.0.0.1",
    PRIVATE_DAO_READ_NODE_PORT: String(port),
    PRIVATE_DAO_RUNTIME_STATE_DIR: runtimeStateDir,
    PRIVATE_DAO_READ_ALLOWED_ORIGIN: "https://privatedao.org",
    TS_NODE_TRANSPILE_ONLY: "1",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
child.stdout.on("data", () => undefined);
child.stderr.on("data", (chunk) => process.stderr.write(chunk));

async function waitForConfig() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/v1/config`);
      if (response.ok) return;
    } catch {
      // The child can need several seconds to load the read-node dependencies.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("read-node did not become ready");
}

async function post(pathname, body) {
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

try {
  await waitForConfig();
  const bid = await post("/api/v1/auctions/sealed/run", {
    config: { auctionId: "read-node-auction", title: "Read node route test", mode: "public-sealed", startingPrice: 1, depositRequired: 1 },
    privateBids: [{ bidderId: "a", amount: 2, salt: "salt-a" }, { bidderId: "b", amount: 3, salt: "salt-b" }],
  });
  assert.equal(bid.status, 200, JSON.stringify(bid.body));
  assert.equal(bid.body.ok, true);
  assert.equal(bid.body.privateDataExcluded, true);
  assert.equal(Array.isArray(bid.body.hiddenFields) && bid.body.hiddenFields.length > 0, true);

  const bidderA = new Uint8Array(32).fill(0x11);
  const bidderB = new Uint8Array(32).fill(0x22);
  const metadata = {
    auctionId: new Uint8Array(32).fill(0x31),
    rulesDigest: new Uint8Array(32).fill(0x32),
    policyDigest: new Uint8Array(32).fill(0x33),
    winnerCommitment: bidderB,
    winningAmount: 20,
    bidCount: 2,
    deadline: Math.floor(Date.now() / 1000) + 3600,
  };
  const outcome = await post("/api/v1/auctions/sealed/outcome-proof", {
    metadata: Object.fromEntries(Object.entries({ ...metadata, resultCommitment: computeAuctionResultCommitment(metadata) }).map(([key, value]) => [key, value instanceof Uint8Array ? Array.from(value) : value])),
    bids: [{ bidderCommitment: Array.from(bidderA), amount: 10 }, { bidderCommitment: Array.from(bidderB), amount: 20 }],
  });
  assert.equal(outcome.status, 200, JSON.stringify(outcome.body));
  assert.equal(outcome.body.ok, true);
  assert.equal(outcome.body.privateDataExcluded, true);
  console.log("Read node auction routes: PASS");
} finally {
  child.kill("SIGTERM");
  await once(child, "exit");
}
