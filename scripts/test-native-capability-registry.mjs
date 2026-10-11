import assert from "node:assert/strict";
import { buildNativeCapabilityRegistry } from "../packages/privatedao-runtime/src/index.ts";

const entries = buildNativeCapabilityRegistry();
const verified = entries.filter((entry) => entry.status === "testnet_verified");
const liveAgents = entries.filter((entry) => entry.status === "mainnet_live" && entry.product === "agent");
const verifiedDevnet = entries.filter((entry) => entry.status === "devnet_verified");
const verifiedPayroll = verifiedDevnet.filter((entry) => entry.product === "payroll");

assert.equal(entries.length, 176, "unexpected native capability matrix size");
assert.equal(verified.length, 28, "only evidence-backed testnet verification and organizational rows should be verified");
assert.equal(liveAgents.length, 2, "the two live Agent Exchange rows must be runtime-verified");
assert.equal(verifiedPayroll.length, 2, "only Payroll calculation and approval remain enabled on Solana Devnet");
assert.equal(verifiedDevnet.length, 6, "Solana Devnet must include enabled Payroll plus the evidenced governance, treasury, and auction lanes");
for (const entry of verifiedPayroll) {
  assert.equal(entry.product, "payroll");
  assert.equal(entry.network, "solana-devnet");
  assert.equal(entry.evidence, "devnet-e2e");
  assert.equal(entry.supportsExecution, true);
  assert.equal(entry.supportsReceipt, true);
  assert.equal(entry.supportsMainnet, false);
  assert.equal(entry.lastVerifiedCommit, "adcb3ae");
}
for (const entry of liveAgents) {
  assert.equal(entry.product, "agent");
  assert.equal(entry.network, "solana-mainnet-beta");
  assert.equal(entry.evidence, "runtime-only");
  assert.equal(entry.supportsExecution, true);
  assert.equal(entry.supportsMainnet, true);
  assert.equal(entry.lastVerifiedCommit, null);
  assert.ok(entry.lastVerifiedTimestamp);
}
for (const entry of verified) {
  assert.equal(entry.evidence, "testnet-e2e");
  assert.equal(entry.supportsExecution, true);
  assert.equal(entry.supportsReceipt, true);
  assert.equal(entry.supportsMainnet, false);
  assert.ok(entry.lastVerifiedCommit);
  assert.ok(entry.lastVerifiedTimestamp);
}
for (const entry of verified.filter((candidate) => candidate.network === "tempo-testnet" && candidate.provider === "evm-tempo-testnet")) {
  assert.ok(["blind-verification", "record-verification"].includes(entry.product));
  assert.equal(entry.provider, "evm-tempo-testnet");
  assert.equal(entry.chainId, "42431");
  assert.equal(entry.supportsMainnet, false);
  assert.equal(entry.lastVerifiedCommit, "7b4d430");
}
assert.equal(verified.filter((entry) => entry.network === "tempo-testnet" && entry.provider === "evm-tempo-testnet").length, 3, "Tempo must have three verified verification rows");
assert.equal(verified.filter((entry) => entry.provider === "evm-ethereum-sepolia-organizational").length, 4, "Ethereum organizational evidence must cover treasury, governance, and auction lanes");
assert.equal(verified.filter((entry) => entry.provider === "evm-tempo-testnet-organizational").length, 4, "Tempo organizational evidence must cover treasury, governance, and auction lanes");
assert.equal(verified.filter((entry) => entry.provider === "evm-base-sepolia").length, 3, "Base Sepolia must have three verified verification rows");
assert.equal(verified.filter((entry) => entry.provider === "evm-base-sepolia").every((entry) => entry.chainId === "84532"), true);
assert.equal(verified.filter((entry) => entry.provider === "evm-base-sepolia-organizational").length, 4, "Base organizational evidence must cover treasury, governance, and auction lanes");
assert.equal(verified.filter((entry) => entry.provider === "evm-base-sepolia-organizational").every((entry) => entry.chainId === "84532"), true);
assert.equal(verified.filter((entry) => entry.provider === "evm-arbitrum-sepolia").length, 3, "Arbitrum Sepolia must have three verified verification rows");
assert.equal(verified.filter((entry) => entry.provider === "evm-arbitrum-sepolia-organizational").length, 4, "Arbitrum organizational evidence must cover treasury, governance, and auction lanes");
assert.equal(verified.filter((entry) => entry.network === "arbitrum-sepolia").every((entry) => entry.chainId === "421614"), true);
assert.equal(verifiedDevnet.filter((entry) => entry.provider === "solana-devnet").length, 4, "Solana organizational evidence must cover treasury, governance, and auction lanes");
assert.equal(verifiedDevnet.filter((entry) => entry.provider === "solana-devnet").every((entry) => entry.network === "solana-devnet"), true);
assert.equal(entries.find((entry) => entry.network === "tempo-testnet" && entry.product === "treasury")?.nativeAsset, "USD", "Tempo native asset must match the EVM adapter configuration");
assert.equal(entries.find((entry) => entry.network === "hyperliquid-testnet" && entry.product === "record-verification")?.networkFamily, "evm", "HyperEVM must use the EVM adapter family");
assert.equal(entries.find((entry) => entry.network === "hyperliquid-testnet" && entry.product === "record-verification")?.chainId, "998", "HyperEVM testnet chain ID must be 998");
assert.equal(entries.find((entry) => entry.network === "hyperliquid-testnet" && entry.product === "record-verification")?.nativeAsset, "HYPE", "HyperEVM native asset must be HYPE");
assert.equal(entries.find((entry) => entry.network === "hyperliquid-testnet" && entry.product === "record-verification")?.status, "planned", "HyperEVM must remain unverified until E2E evidence exists");

assert.equal(entries.some((entry) => entry.network === "zcash-testnet" && entry.product === "payroll" && entry.declared), false, "Zcash must not be customer-facing in the current Payroll release");
assert.equal(entries.some((entry) => entry.product === "payroll" && entry.capability === "payroll.settle"), false, "Payroll settlement must not be advertised without a native provider");

assert.equal(entries.some((entry) => entry.network === "wormhole-integration"), false, "bridge network must not be present");
console.log(`[native-capability-registry] rows=${entries.length} verified=${verified.length} bridge-free=true`);
