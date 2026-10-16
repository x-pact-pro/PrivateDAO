export const PRODUCTS = Object.freeze([
  {
    id: "treasury-guard-scan",
    name: "Treasury Guard Scan",
    category: "Treasury protection",
    tagline: "A bounded risk brief before a treasury decision.",
    buyer: "Treasury operators, DAO contributors and finance teams",
    billing_model: "per_scan",
    price: 0.20,
    currency: "USDC",
    networks: ["solana-mainnet-beta", "ethereum-mainnet", "base-mainnet", "arbitrum-mainnet"],
    input: "network and wallet address",
    included_services: ["wallet.intelligence", "anomaly.detect"],
    proof: "One ordered receipt with per-service results and evidence hashes.",
    value: "See public exposure, activity and bounded anomaly signals before approving a treasury action.",
    fields: ["network", "wallet"],
  },
  {
    id: "token-safety-brief",
    name: "Token Safety Brief",
    category: "Asset diligence",
    tagline: "A compact, evidence-backed asset review.",
    buyer: "Treasuries, agents, launch teams and market operators",
    billing_model: "per_asset",
    price: 0.09,
    currency: "USDC",
    networks: ["solana-mainnet-beta", "ethereum-mainnet", "base-mainnet", "arbitrum-mainnet"],
    input: "network and token or contract address",
    included_services: ["token.intelligence", "risk.score", "launch.check", "market.snapshot"],
    proof: "One ordered receipt covering facts, risk factors, launch evidence and market context.",
    value: "Turn a token address into a decision-ready brief without relying on an unsupported safety label.",
    fields: ["network", "mint"],
  },
  {
    id: "transaction-safety-check",
    name: "Transaction Safety Check",
    category: "Transaction controls",
    tagline: "Explain and simulate an unsigned transaction before approval.",
    buyer: "Wallets, treasury teams and autonomous agents",
    billing_model: "per_check",
    price: 0.17,
    currency: "USDC",
    networks: ["solana-mainnet-beta"],
    input: "network and unsigned transaction data",
    included_services: ["transaction.explain", "transaction.simulate", "decision.context"],
    proof: "One ordered receipt with simulation output, explanation and decision context.",
    value: "Reduce approval mistakes by creating a readable, reproducible pre-sign record.",
    fields: ["network", "transaction"],
  },
]);

export function productById(id) {
  return PRODUCTS.find((product) => product.id === id) || null;
}

export function publicProduct(product) {
  return {
    ...product,
    checkout: {
      method: "POST",
      endpoint: "/api/checkout/batch",
      quote_first: true,
      payment_network: "solana-mainnet-beta",
      payment_asset: "USDC",
    },
  };
}
