import assert from "node:assert/strict";

import {
  APPLICATION_CAPABILITY_BINDINGS,
  buildNativeCapabilityRegistry,
  getNetwork,
} from "../packages/privatedao-runtime/src/index.ts";

const entries = buildNativeCapabilityRegistry().filter((entry) => entry.declared && entry.product !== "agent");
const failures = [];
const verifiedEvidence = new Set(["testnet-e2e", "devnet-e2e", "kernel-policy-testnet"]);
const chainEvidence = new Set(["testnet-e2e", "devnet-e2e"]);

for (const entry of entries) {
  const key = `${entry.product}/${entry.capability}/${entry.network}`;
  const binding = APPLICATION_CAPABILITY_BINDINGS.find(
    (candidate) => candidate.product === entry.product && candidate.capability === entry.capability && candidate.network === entry.network,
  );
  const network = getNetwork(entry.network);

  if (!binding || binding.mode === "unbound") failures.push(`${key}: missing executable Kernel binding`);
  if (!network.adapterId) failures.push(`${key}: missing network adapter`);
  if (!entry.provider) failures.push(`${key}: missing provider`);
  if (!entry.supportsExecution) failures.push(`${key}: execution is not available`);
  if (!entry.supportsReceipt) failures.push(`${key}: receipt support is missing`);

  if (["testnet_verified", "devnet_verified"].includes(entry.status) && !verifiedEvidence.has(entry.evidence)) {
    failures.push(`${key}: verified status has no accepted evidence (${entry.evidence})`);
  }
  if (chainEvidence.has(entry.evidence) && (!entry.lastVerifiedCommit || !entry.lastVerifiedTimestamp)) {
    failures.push(`${key}: chain evidence is missing commit/timestamp metadata`);
  }
  if (entry.evidence === "kernel-policy-testnet" && entry.status !== "testnet_verified") {
    assert.equal(entry.status, "testnet_ready", `${key}: Kernel policy evidence has an invalid lifecycle status`);
  }
  if (entry.environment === "mainnet" && entry.status !== "mainnet_live") {
    failures.push(`${key}: non-live mainnet status exposed as executable`);
  }
  if (entry.network === "wormhole-integration") failures.push(`${key}: bridge integration must not be a network lane`);
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

const byStatus = Object.groupBy(entries, (entry) => entry.status);
const byFamily = Object.groupBy(entries, (entry) => entry.networkFamily);
console.log(JSON.stringify({
  status: "PASS",
  scope: "declared-commercial-capabilities",
  entries: entries.length,
  statuses: Object.fromEntries(Object.entries(byStatus).map(([key, value]) => [key, value.length])),
  families: Object.fromEntries(Object.entries(byFamily).map(([key, value]) => [key, value.length])),
  agentBoundary: "excluded-agent-exchange",
  bridgeFree: true,
}, null, 2));
