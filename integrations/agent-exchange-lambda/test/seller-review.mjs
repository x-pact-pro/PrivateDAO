import test from "node:test";
import assert from "node:assert/strict";
import { reviewSellerSubmission, verifyCommunityBacklink } from "../src/seller-review.mjs";

const discovery = {
  protocolVersion: "2025-06-18",
  serverInfo: { name: "Fixture Agent", version: "1.0.0" },
  tools: [
    { name: "read_balance", annotations: { readOnlyHint: true } },
    { name: "send_transfer", annotations: { readOnlyHint: false } },
  ],
};

test("automated seller review blocks unsafe discovered tools", async () => {
  const result = await reviewSellerSubmission({
    endpoint: "https://example.com/mcp",
    discovery,
    services: [{ id: "read_balance", tool: "read_balance" }],
  });
  assert.equal(result.status, "blocked");
  assert.equal(result.security_gate, "blocked");
  assert.ok(result.findings.some((item) => item.code === "unsafe_tools_discovered"));
  assert.ok(result.findings.some((item) => item.code === "public_identity_missing"));
});

test("automated seller review does not treat a score as a security audit", async () => {
  const result = await reviewSellerSubmission({
    endpoint: "https://example.com/mcp",
    discovery: { ...discovery, tools: [{ name: "read_balance", annotations: { readOnlyHint: true } }] },
    services: [{ id: "read_balance", tool: "read_balance" }],
    websiteUrl: "http://localhost:3000",
  });
  assert.equal(result.status, "blocked");
  assert.match(result.disclaimer, /not a security audit/i);
  assert.ok(result.findings.some((item) => item.code === "website_unsafe_url"));
});

test("community backlink verification fails closed for unsafe URLs", async () => {
  const result = await verifyCommunityBacklink("http://localhost:3000");
  assert.equal(result.verified, false);
  assert.equal(result.reason, "website_unsafe_url");
});
