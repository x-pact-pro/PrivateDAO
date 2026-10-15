import assert from "node:assert/strict";
import { buildNativeCapabilityRegistry } from "../packages/privatedao-runtime/src/index.ts";

const entries = buildNativeCapabilityRegistry();
const verified = entries.filter((entry) => entry.status === "testnet_verified");
const liveAgents = entries.filter((entry) => entry.status === "mainnet_live" && entry.product === "agent");
const verifiedPayroll = entries.filter((entry) => entry.status === "devnet_verified");

assert.equal(entries.length, 204, "unexpected native capability matrix size");
assert.equal(verified.length, 60, "only evidence-backed verification and organizational testnet rows should be verified");
assert.equal(liveAgents.length, 2, "the two live Agent Exchange rows must be runtime-verified");
assert.equal(verifiedPayroll.length, 3, "only the three Payroll Devnet evidence rows should be verified");
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
assert.equal(verified.filter((entry) => entry.provider === "evm-base-sepolia-organizational").length, 4, "Base organizational evidence must cover Treasury, Governance, and Auction lanes");
assert.equal(verified.filter((entry) => entry.provider === "evm-arbitrum-sepolia").length, 3, "Arbitrum Sepolia must have three verified verification rows");
assert.equal(verified.filter((entry) => entry.provider === "evm-arbitrum-sepolia-organizational").length, 4, "Arbitrum organizational evidence must cover treasury, governance, and auction lanes");
assert.equal(verified.filter((entry) => entry.provider === "evm-robinhood-testnet-organizational").length, 4, "Robinhood organizational evidence must cover treasury, governance, and auction lanes");
assert.equal(verified.filter((entry) => entry.provider === "evm-robinhood-testnet").length, 3, "Robinhood Testnet must cover blind and record verification lanes");
assert.equal(verified.filter((entry) => entry.provider === "evm-bnb-testnet").length, 3, "BNB Testnet must have three verified verification rows");
assert.equal(verified.filter((entry) => entry.provider === "evm-bnb-testnet-organizational").length, 5, "BNB organizational evidence must cover Payroll, Treasury, Governance, and Auction lanes");
assert.equal(verified.filter((entry) => entry.network === "bnb-testnet").every((entry) => entry.chainId === "97"), true);
assert.equal(verified.filter((entry) => entry.provider === "evm-hyperliquid-testnet").length, 3, "HyperEVM evidence must cover blind and record verification lanes");
assert.equal(verified.filter((entry) => entry.provider === "evm-hyperliquid-testnet-organizational").length, 4, "HyperEVM organizational evidence must cover Treasury, Governance, and Auction lanes");
assert.equal(verified.filter((entry) => entry.network === "hyperliquid-testnet").every((entry) => entry.chainId === "998"), true);
assert.equal(verified.filter((entry) => entry.network === "stellar-testnet").length, 10, "Stellar Testnet must cover all ten enterprise capabilities");
assert.equal(verified.filter((entry) => entry.network === "stellar-testnet").every((entry) => entry.provider === "stellar-testnet-horizon"), true);
assert.equal(verified.filter((entry) => entry.network === "robinhood-testnet").every((entry) => entry.chainId === "46630"), true);
assert.equal(verified.filter((entry) => entry.network === "arbitrum-sepolia").every((entry) => entry.chainId === "421614"), true);
assert.equal(entries.find((entry) => entry.network === "tempo-testnet" && entry.product === "treasury")?.nativeAsset, "USD", "Tempo native asset must match the EVM adapter configuration");
assert.equal(entries.find((entry) => entry.network === "hyperliquid-testnet" && entry.product === "record-verification")?.networkFamily, "evm", "HyperEVM must use the EVM adapter family");
assert.equal(entries.find((entry) => entry.network === "hyperliquid-testnet" && entry.product === "record-verification")?.chainId, "998", "HyperEVM testnet chain ID must be 998");
assert.equal(entries.find((entry) => entry.network === "hyperliquid-testnet" && entry.product === "record-verification")?.nativeAsset, "HYPE", "HyperEVM native asset must be HYPE");
assert.equal(entries.find((entry) => entry.network === "hyperliquid-testnet" && entry.product === "record-verification")?.status, "testnet_verified", "HyperEVM record verification must reflect its committed E2E evidence");

assert.equal(entries.some((entry) => entry.network === "wormhole-integration"), false, "bridge network must not be present");
console.log(`[native-capability-registry] rows=${entries.length} verified=${verified.length} bridge-free=true`);
