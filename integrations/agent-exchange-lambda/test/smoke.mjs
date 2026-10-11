import assert from "node:assert/strict";
import { handler, resetForTests } from "../src/handler.mjs";

process.env.NODE_ENV = "test";
resetForTests();

async function request(path, method = "GET", body) {
  return handler({
    requestContext: { http: { method, path } },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const health = await request("/api/health");
assert.equal(health.statusCode, 200);
assert.equal(JSON.parse(health.body).status, "ok");

const services = await request("/api/services");
assert.equal(services.statusCode, 200);
const serviceList = JSON.parse(services.body).services;
assert.ok(serviceList.some((service) => service.id === "agent.research.report"));
assert.ok(serviceList.some((service) => service.id === "transaction.simulate"));
assert.deepEqual(serviceList.find((service) => service.id === "verify.basic").supported_target_networks, ["solana-mainnet-beta", "ethereum-mainnet", "base-mainnet", "arbitrum-mainnet"]);
assert.deepEqual(serviceList.find((service) => service.id === "github.repository").supported_target_networks, []);
for (const serviceId of ["verify.deep", "decision.context", "receipt.verify", "agent.match", "intelligence.synthesize", "sponsored.discovery"]) {
  const service = serviceList.find((item) => item.id === serviceId);
  assert.deepEqual(service.supported_target_networks, ["solana-mainnet-beta", "ethereum-mainnet", "base-mainnet", "arbitrum-mainnet"], serviceId);
}

for (const path of ["/.well-known/agent-card.json", "/openapi.json", "/mcp", "/a2a"]) {
  const response = await request(path);
  assert.equal(response.statusCode, 200, path);
}

const free = await request("/api/jobs", "POST", {
  service_id: "verify.basic",
  input: { record: { smoke: true } },
});
assert.equal(free.statusCode, 200);
assert.equal(JSON.parse(free.body).status, "completed");

const paid = await request("/api/jobs", "POST", {
  service_id: "agent.research.report",
  input: { network: "ethereum-mainnet", asset: "0x0000000000000000000000000000000000000001" },
});
assert.equal(paid.statusCode, 402);
assert.equal(JSON.parse(paid.body).payment_intent.target_network, "ethereum-mainnet");

const invalid = await request("/api/jobs", "POST", {
  service_id: "agent.research.report",
  input: { network: "unsupported-mainnet", asset: "0x0000000000000000000000000000000000000001" },
});
assert.equal(invalid.statusCode, 400);
assert.doesNotMatch(invalid.body, /payment_intent/);

console.log("Agent Exchange smoke: PASS");
