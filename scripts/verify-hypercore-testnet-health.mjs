import assert from "node:assert/strict";
import { HyperCoreNetworkAdapter } from "../packages/privatedao-runtime/src/index.ts";

const apiUrl = process.env.PDAO_HYPERCORE_API_URL?.trim() || "https://api.hyperliquid-testnet.xyz/info";
const adapter = new HyperCoreNetworkAdapter({ apiUrl, timeoutMs: 15_000 });
const health = await adapter.health();

assert.equal(health.network, "hypercore-testnet");
assert.equal(health.ok, true, health.reason || "HyperCore Testnet health check failed.");

console.log(JSON.stringify({
  status: "PASS",
  network: health.network,
  apiUrl,
  universeSize: health.universeSize,
  latencyMs: health.latencyMs,
  execution: "read-only health; no signing or broadcast",
}, null, 2));
