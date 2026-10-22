// Network identities are protocol metadata only. A network is not advertised
// as PrivatePAY-capable until its privacy rail, facilitator, and leakage audit
// have all passed independently.
export const PRIVATEPAY_NETWORKS = Object.freeze({
  solana: Object.freeze({
    key: "solana",
    caip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    family: "solana",
    chain_id: null,
    status: "reviewed_pending_funded_e2e",
    privacy_rail: "magicblock-private-ephemeral-rollup",
    x402_scheme: "exact-magicblock",
  }),
  base: Object.freeze({
    key: "base",
    caip2: "eip155:8453",
    family: "evm",
    chain_id: 8453,
    status: "unavailable",
    privacy_rail: null,
    x402_scheme: "exact",
    blockers: ["no independently verified confidential payment rail for Base"],
  }),
  robinhood: Object.freeze({
    key: "robinhood",
    caip2: "eip155:4663",
    family: "evm",
    chain_id: 4663,
    status: "unavailable",
    privacy_rail: null,
    x402_scheme: "exact",
    blockers: ["no independently verified confidential payment rail for Robinhood Chain"],
  }),
});

export function privatePayNetworkKey(value) {
  const key = String(value || "solana").trim().toLowerCase();
  return Object.hasOwn(PRIVATEPAY_NETWORKS, key) ? key : null;
}

export function privatePayNetworkMatrix(config = {}) {
  const selected = privatePayNetworkKey(config.privatePayNetwork) || "solana";
  return Object.fromEntries(Object.entries(PRIVATEPAY_NETWORKS).map(([key, network]) => [key, {
    ...network,
    selected: key === selected,
    enabled: key === "solana" && config.privatePayEnabled === true,
    activation_status: key === "solana" ? "gated_by_conformance_and_funded_e2e" : "adapter_contract_only",
  }]));
}

export function assertPrivatePayNetworkAdapter(config = {}) {
  const key = privatePayNetworkKey(config.privatePayNetwork) || "solana";
  if (key !== "solana") {
    throw Object.assign(new Error(`PrivatePAY ${key} adapter is not available until its privacy rail passes independent E2E review`), {
      statusCode: 503,
      code: "PRIVATEPAY_NETWORK_RAIL_UNVERIFIED",
      network: PRIVATEPAY_NETWORKS[key],
    });
  }
  return PRIVATEPAY_NETWORKS[key];
}
