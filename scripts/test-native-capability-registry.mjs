import assert from "node:assert/strict";
import { buildNativeCapabilityRegistry } from "../packages/privatedao-runtime/src/index.ts";

const entries = buildNativeCapabilityRegistry();
const verified = entries.filter((entry) => entry.status === "testnet_verified");
const liveAgents = entries.filter((entry) => entry.status === "mainnet_live" && entry.product === "agent");
const verifiedDevnet = entries.filter((entry) => entry.status === "devnet_verified");
const verifiedBlind = verifiedDevnet.filter((entry) => entry.product === "blind-verification");
const verifiedRecord = verifiedDevnet.filter((entry) => entry.product === "record-verification" && entry.network === "solana-devnet");
const verifiedPayrollLanes = verifiedDevnet.filter((entry) => entry.product === "payroll");
const solanaPayrollEntries = entries.filter((entry) => entry.product === "payroll" && entry.network === "solana-devnet");

assert.equal(entries.length, 238, "unexpected native capability matrix size");
assert.equal(verified.length, 91, "only evidence-backed verification and organizational testnet rows should be verified");
assert.equal(verifiedDevnet.length, 7, "Solana Devnet Kernel evidence must cover blind, record, treasury, governance, and auction lanes");
assert.equal(liveAgents.length, 2, "the two live Agent Exchange rows must be runtime-verified");
assert.equal(verifiedBlind.length, 1, "the Solana blind-verification Devnet evidence row must remain verified");
assert.equal(verifiedRecord.length, 2, "the Solana record-verification Devnet evidence must cover create and verify");
assert.equal(verifiedPayrollLanes.length, 0, "legacy Umbra payroll evidence must not be promoted to verified");
assert.equal(solanaPayrollEntries.every((entry) => entry.status === "implementation" && entry.supportsExecution === false), true, "legacy Umbra payroll evidence must not masquerade as Kernel E2E");
assert.equal(verifiedBlind[0]?.network, "solana-devnet");
assert.equal(verifiedBlind[0]?.capability, "verification.blind.prove");
assert.equal(verifiedBlind[0]?.evidence, "devnet-e2e");
assert.equal(verifiedBlind[0]?.supportsExecution, true);
assert.equal(verifiedBlind[0]?.supportsReceipt, true);
assert.equal(verifiedRecord.every((entry) => entry.provider === "privatedao-record-verification"), true);
assert.equal(verifiedRecord.every((entry) => entry.evidence === "devnet-e2e"), true);
assert.equal(verifiedRecord.every((entry) => entry.supportsExecution === true && entry.supportsReceipt === true && entry.supportsReconciliation === true), true);
assert.equal(verifiedDevnet.filter((entry) => entry.product === "treasury" && entry.network === "solana-devnet").length, 1);
assert.equal(verifiedDevnet.filter((entry) => entry.product === "auction" && entry.network === "solana-devnet").length, 2);
assert.equal(verifiedDevnet.filter((entry) => entry.product === "governance" && entry.network === "solana-devnet").length, 1);
assert.equal(verifiedDevnet.find((entry) => entry.product === "governance" && entry.network === "solana-devnet")?.provider, "privatedao-governance-proposal");
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
  assert.equal(entry.lastVerifiedCommit, "a2dc61d2a");
}
assert.equal(verified.filter((entry) => entry.network === "tempo-testnet" && entry.provider === "evm-tempo-testnet").length, 5, "Tempo must have five verified verification rows including revocation controls");
assert.equal(verified.filter((entry) => entry.provider === "evm-ethereum-sepolia-organizational").length, 7, "Ethereum organizational evidence must cover treasury, payroll, governance, and auction lanes");
assert.equal(verified.filter((entry) => entry.provider === "evm-tempo-testnet-organizational").length, 7, "Tempo organizational evidence must cover treasury, payroll, governance, and auction lanes");
assert.equal(verified.filter((entry) => entry.provider === "evm-tempo-testnet-organizational" && entry.product === "payroll").length, 3, "Tempo organizational evidence must cover the Payroll lanes");
assert.equal(verified.filter((entry) => entry.provider === "evm-base-sepolia").length, 5, "Base Sepolia must have five verified verification rows including revocation controls");
assert.equal(verified.filter((entry) => entry.provider === "evm-base-sepolia").every((entry) => entry.chainId === "84532"), true);
assert.equal(verified.filter((entry) => entry.provider === "evm-base-sepolia-organizational").length, 7, "Base organizational evidence must cover Treasury, Payroll, Governance, and Auction lanes");
assert.equal(verified.filter((entry) => entry.provider === "evm-base-sepolia-organizational" && entry.product === "payroll").length, 3, "Base organizational evidence must cover the Payroll lanes");
assert.equal(verified.filter((entry) => entry.provider === "evm-arbitrum-sepolia").length, 5, "Arbitrum Sepolia must have five verified verification rows including revocation controls");
assert.equal(verified.filter((entry) => entry.provider === "evm-arbitrum-sepolia-organizational").length, 7, "Arbitrum organizational evidence must cover Treasury, Payroll, Governance, and Auction lanes");
assert.equal(verified.filter((entry) => entry.provider === "evm-arbitrum-sepolia-organizational" && entry.product === "payroll").length, 3, "Arbitrum organizational evidence must cover the Payroll lanes");
assert.equal(verified.filter((entry) => entry.provider === "evm-robinhood-testnet-organizational").length, 7, "Robinhood organizational evidence must cover Treasury, Payroll, Governance, and Auction lanes");
assert.equal(verified.filter((entry) => entry.provider === "evm-robinhood-testnet-organizational" && entry.product === "payroll").length, 3, "Robinhood organizational evidence must cover the Payroll lanes");
assert.equal(verified.filter((entry) => entry.provider === "evm-robinhood-testnet").length, 5, "Robinhood Testnet must cover blind, record, and revocation verification lanes");
assert.equal(verified.filter((entry) => entry.provider === "evm-bnb-testnet").length, 5, "BNB Testnet must have five verified verification rows including revocation controls");
assert.equal(verified.filter((entry) => entry.provider === "evm-bnb-testnet-organizational").length, 7, "BNB organizational evidence must cover Treasury, Payroll, Governance, and Auction lanes");
assert.equal(verified.filter((entry) => entry.network === "bnb-testnet").every((entry) => entry.chainId === "97"), true);
assert.equal(verified.filter((entry) => entry.provider === "evm-hyperliquid-testnet").length, 5, "HyperEVM evidence must cover blind, record, and revocation verification lanes");
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

const zcashEntries = entries.filter((entry) => entry.network === "zcash-testnet");
assert.equal(zcashEntries.length, 14, "Zcash Testnet must retain the declared enterprise and Agent Exchange rows");
assert.equal(zcashEntries.every((entry) => !["testnet_verified", "devnet_verified", "mainnet_live"].includes(entry.status)), true, "Zcash cannot be promoted without independent provider evidence");
assert.equal(zcashEntries.every((entry) => entry.supportsExecution === false && entry.supportsReceipt === false), true, "Zcash planned rows must not advertise execution or receipts");
assert.equal(zcashEntries.every((entry) => entry.lastVerifiedCommit === null && entry.lastVerifiedTimestamp === null), true, "Zcash planned rows must not carry stale verification metadata");
assert.equal(entries.filter((entry) => entry.product === "agent" && entry.network === "zcash-testnet").every((entry) => entry.evidence === "none"), true, "Agent Exchange must remain separate from Zcash enterprise evidence");
console.log(`[native-capability-registry] rows=${entries.length} verified=${verified.length} bridge-free=true`);
