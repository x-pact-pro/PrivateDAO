import assert from "node:assert/strict";
import { APPLICATION_CAPABILITY_BINDINGS, buildNativeCapabilityRegistry } from "../packages/privatedao-runtime/src/index.ts";

const entries = buildNativeCapabilityRegistry();
const verified = entries.filter((entry) => entry.status === "testnet_verified");
const liveAgents = entries.filter((entry) => entry.status === "mainnet_live" && entry.product === "agent");
const verifiedDevnet = entries.filter((entry) => entry.status === "devnet_verified");
const verifiedPayroll = verifiedDevnet.filter((entry) => entry.product === "payroll");

assert.equal(entries.length, 216, "unexpected native capability matrix size");
assert.equal(verified.length, 61, "only evidence-backed testnet verification and organizational rows should be verified");
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
  assert.ok(["testnet-e2e", "kernel-policy-testnet"].includes(entry.evidence));
  assert.equal(entry.supportsExecution, true);
  assert.equal(entry.supportsReceipt, true);
  assert.equal(entry.supportsMainnet, false);
  if (entry.evidence === "testnet-e2e") {
    assert.ok(entry.lastVerifiedCommit);
    assert.ok(entry.lastVerifiedTimestamp);
  }
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
assert.equal(verified.filter((entry) => entry.provider === "evm-robinhood-testnet-organizational").length, 4, "Robinhood organizational evidence must cover treasury, governance, and auction lanes");
assert.equal(verified.filter((entry) => entry.provider === "evm-robinhood-testnet-organizational").every((entry) => entry.chainId === "46630"), true);
assert.equal(verified.filter((entry) => entry.provider === "evm-arbitrum-sepolia").length, 3, "Arbitrum Sepolia must have three verified verification rows");
assert.equal(verified.filter((entry) => entry.provider === "evm-arbitrum-sepolia-organizational").length, 4, "Arbitrum organizational evidence must cover treasury, governance, and auction lanes");
assert.equal(verified.filter((entry) => entry.provider === "evm-bnb-testnet").length, 3, "BNB Testnet must have three verified verification rows");
assert.equal(verified.filter((entry) => entry.provider === "evm-bnb-testnet").every((entry) => entry.chainId === "97"), true);
assert.equal(verified.filter((entry) => entry.provider === "evm-bnb-testnet-organizational").length, 5, "BNB organizational evidence must cover Payroll, Treasury, Governance, and Auction lanes");
assert.equal(verified.filter((entry) => entry.provider === "evm-bnb-testnet-organizational").every((entry) => entry.chainId === "97"), true);
assert.equal(verified.filter((entry) => entry.provider === "evm-hyperliquid-testnet").length, 3, "Hyperliquid must have three verified verification rows");
assert.equal(verified.filter((entry) => entry.provider === "evm-hyperliquid-testnet").every((entry) => entry.chainId === "998"), true);
assert.equal(verified.filter((entry) => entry.network === "arbitrum-sepolia" && entry.provider === "privatedao-payroll-kernel").length, 2, "Arbitrum Sepolia must have Kernel payroll policy lanes");
assert.equal(verified.filter((entry) => entry.network === "arbitrum-sepolia").every((entry) => entry.chainId === "421614"), true);
assert.equal(verifiedDevnet.filter((entry) => entry.provider === "solana-devnet").length, 4, "Solana organizational evidence must cover treasury, governance, and auction lanes");
assert.equal(verifiedDevnet.filter((entry) => entry.provider === "solana-devnet").every((entry) => entry.network === "solana-devnet"), true);
assert.equal(entries.find((entry) => entry.network === "tempo-testnet" && entry.product === "treasury")?.nativeAsset, "USD", "Tempo native asset must match the EVM adapter configuration");
assert.equal(entries.find((entry) => entry.network === "hyperliquid-testnet" && entry.product === "record-verification")?.networkFamily, "evm", "HyperEVM must use the EVM adapter family");
assert.equal(entries.find((entry) => entry.network === "hyperliquid-testnet" && entry.product === "record-verification")?.chainId, "998", "HyperEVM testnet chain ID must be 998");
assert.equal(entries.find((entry) => entry.network === "hyperliquid-testnet" && entry.product === "record-verification")?.nativeAsset, "HYPE", "HyperEVM native asset must be HYPE");
assert.equal(entries.find((entry) => entry.network === "hyperliquid-testnet" && entry.product === "record-verification")?.status, "testnet_verified", "HyperEVM Record Verification must reflect its verified E2E artifact");
assert.equal(entries.find((entry) => entry.network === "hypercore-testnet" && entry.product === "record-verification")?.networkFamily, "exchange", "HyperCore must use the native exchange family");
assert.equal(entries.find((entry) => entry.network === "hypercore-testnet" && entry.product === "record-verification")?.status, "testnet_ready", "HyperCore policy paths must be ready without claiming native execution");
for (const network of ["bnb-testnet", "robinhood-testnet", "hyperliquid-testnet", "hypercore-testnet", "stellar-testnet"]) {
  const policyRows = entries.filter((entry) => entry.network === network && entry.declared && entry.product !== "agent");
  const expectedRows = network === "bnb-testnet" ? 10 : network === "stellar-testnet" ? 10 : 9;
  assert.equal(policyRows.length, expectedRows, `${network} must expose all declared product lanes`);
  const expectedPolicyRows = network === "robinhood-testnet" ? 5 : network === "bnb-testnet" ? 2 : network === "hyperliquid-testnet" ? 6 : network === "stellar-testnet" ? 1 : 9;
  assert.equal(policyRows.filter((entry) => entry.status === "testnet_ready" && entry.evidence === "runtime-only").length, expectedPolicyRows, `${network} policy rows must not claim unsupported on-chain E2E`);
}

const stellarVerified = entries.filter((entry) => entry.network === "stellar-testnet" && entry.product !== "agent" && entry.capability !== "payroll.settle");
assert.equal(stellarVerified.length, 9, "Stellar must expose all nine product-binding capabilities");
assert.equal(stellarVerified.every((entry) => entry.status === "testnet_verified" && entry.evidence === "testnet-e2e"), true, "Stellar product-binding evidence must be reflected in the registry");
assert.equal(stellarVerified.every((entry) => entry.lastVerifiedCommit === "cba4217b9"), true, "Stellar evidence commit must be pinned");
const stellarPayrollSettlement = entries.find((entry) => entry.network === "stellar-testnet" && entry.capability === "payroll.settle");
assert(stellarPayrollSettlement, "Stellar payroll settlement row must remain explicit");
assert.equal(stellarPayrollSettlement.status, "testnet_ready", "Stellar payroll settlement must remain Kernel-ready without claiming E2E");
assert.equal(stellarPayrollSettlement.evidence, "runtime-only");

assert.equal(entries.some((entry) => entry.network === "zcash-testnet" && entry.product === "payroll" && entry.declared), true, "Zcash Kernel payroll policy workflows must be declared");
for (const product of ["blind-verification", "record-verification", "treasury", "auction"]) {
  const zcashRows = entries.filter((entry) => entry.network === "zcash-testnet" && entry.product === product && entry.declared);
  assert.ok(zcashRows.length > 0, `${product} must expose a Zcash Kernel policy workflow`);
  assert.equal(zcashRows.every((entry) => entry.status === "testnet_ready" && entry.evidence === "runtime-only"), true, `${product} Zcash policy rows must not claim E2E`);
}
const zcashPayrollPolicyRows = entries.filter((entry) => entry.network === "zcash-testnet" && entry.product === "payroll" && ["payroll.calculate", "payroll.approve"].includes(entry.capability) && entry.declared);
assert.equal(zcashPayrollPolicyRows.length, 2, "Zcash payroll policy workflows must be declared");
assert.equal(zcashPayrollPolicyRows.every((entry) => entry.status === "testnet_ready" && entry.evidence === "runtime-only"), true, "Zcash payroll policy rows must be Kernel-ready without claiming settlement");
const zcashGovernance = entries.filter((entry) => entry.network === "zcash-testnet" && entry.product === "governance" && entry.capability === "governance.proposal.execute" && entry.declared);
assert.equal(zcashGovernance.length, 1, "Zcash governance policy workflow must be declared");
assert.equal(zcashGovernance[0].status, "testnet_ready");
assert.equal(zcashGovernance[0].provider, "privatedao-kernel-policy");
const solanaPolicyRows = entries.filter((entry) => entry.network === "solana-devnet" && ["blind-verification", "record-verification"].includes(entry.product) && entry.declared);
assert.ok(solanaPolicyRows.length >= 3, "Solana verification workflows must be available through the Kernel policy provider");
assert.equal(solanaPolicyRows.every((entry) => entry.status === "testnet_ready" && entry.evidence === "kernel-policy-testnet"), true, "Solana verification policy rows must not claim on-chain E2E");
const zcashPayrollSettlement = entries.find((entry) => entry.product === "payroll" && entry.capability === "payroll.settle" && entry.network === "zcash-testnet");
assert(zcashPayrollSettlement, "Zcash payroll settlement must be advertised after confirmed Testnet E2E");
assert.equal(zcashPayrollSettlement.status, "testnet_verified");
assert.equal(zcashPayrollSettlement.evidence, "testnet-e2e");
assert.equal(zcashPayrollSettlement.supportsPrivateSettlement, true);
const bnbPayrollSettlement = entries.find((entry) => entry.product === "payroll" && entry.capability === "payroll.settle" && entry.network === "bnb-testnet");
assert(bnbPayrollSettlement, "BNB payroll settlement must be advertised after confirmed Testnet E2E");
assert.equal(bnbPayrollSettlement.status, "testnet_verified");
assert.equal(bnbPayrollSettlement.evidence, "testnet-e2e");
assert.equal(bnbPayrollSettlement.supportsExecution, true);
assert.equal(bnbPayrollSettlement.supportsPrivateSettlement, false, "BNB native settlement must not overclaim shielded payout privacy");
assert.equal(entries.some((entry) => entry.product === "payroll" && entry.capability === "payroll.settle" && entry.network === "solana-devnet" && entry.declared), false, "Solana payroll settlement must remain outside the catalog while Umbra is disabled");
assert.equal(APPLICATION_CAPABILITY_BINDINGS.some((entry) => entry.product === "payroll" && entry.capability === "payroll.settle" && entry.network === "solana-devnet"), false, "Solana payroll settlement must not have an application binding while Umbra is disabled");

assert.equal(entries.some((entry) => entry.network === "wormhole-integration"), false, "bridge network must not be present");
console.log(`[native-capability-registry] rows=${entries.length} verified=${verified.length} bridge-free=true`);
