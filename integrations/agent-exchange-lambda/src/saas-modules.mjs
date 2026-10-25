// Commercial packaging for marketplace channels. Direct Agent Exchange
// execution remains per-request USDC and keeps the existing service IDs.
export const SAAS_MODULES = Object.freeze([
  {
    id: "pdao-verify",
    name: "PDAO Verify",
    description: "Evidence verification, transaction interpretation and checkable receipts.",
    audience: "Web3 companies, auditors and development teams",
    monthly_price_usd: 49,
    services: ["verify.basic", "verify.deep", "receipt.verify", "transaction.explain", "github.repository"],
  },
  {
    id: "pdao-forensics",
    name: "PDAO Forensics Cloud",
    description: "Contract, launch, asset-risk and anomaly investigation before a decision.",
    audience: "Risk teams, exchanges, wallets and investigators",
    monthly_price_usd: 149,
    services: ["risk.score", "contract.inspect", "launch.check", "anomaly.detect", "forensics.trace"],
  },
  {
    id: "pdao-multichain-intelligence",
    name: "PDAO Multichain Intelligence",
    description: "Wallet, asset, market and portfolio intelligence across supported networks.",
    audience: "Funds, analysts and data companies",
    monthly_price_usd: 99,
    services: ["token.intelligence", "wallet.intelligence", "wallet.bot.classify", "market.snapshot", "research.asset", "research.wallet", "portfolio.intelligence"],
  },
  {
    id: "pdao-decision-transaction",
    name: "PDAO Decision & Transaction",
    description: "Quote, simulate and explain transaction intent before an agent or operator signs.",
    audience: "Financial applications, trading systems and autonomous agents",
    monthly_price_usd: 129,
    services: ["swap.quote", "transaction.simulate", "decision.context", "contract.explain", "intelligence.synthesize"],
  },
  {
    id: "pdao-agent-network",
    name: "PDAO Agent Network",
    description: "Agent discovery, capability matching, reputation and disclosed promotion.",
    audience: "AI-agent builders, service providers and MCP platforms",
    monthly_price_usd: 79,
    services: ["agent.match", "sealkeeper.reputation", "agent.research.report", "sponsored.discovery"],
  },
]);

export const ENTERPRISE_SUITE = Object.freeze({
  id: "pdao-enterprise-suite",
  name: "PrivateDAO Enterprise Suite",
  description: "All five PDAO Cloud modules with one governed SaaS subscription.",
  monthly_price_usd: 399,
  modules: SAAS_MODULES.map((module) => module.id),
});

export const MARKETPLACE_PACKAGING = Object.freeze({
  brand: "PrivateDAO",
  product_name: "PrivateDAO Agent Exchange",
  positioning: "Unified Multichain Intelligence & Verification SaaS",
  channel: "PrivateDAO Agent Exchange",
  settlement: "Package subscriptions and metered services use quote-first USDC settlement through the shared service treasury.",
  pdao_utility: "PDAO provides verified access, credits, discounts and governance coordination. It is not required for ordinary services and never controls a treasury key.",
  modules: SAAS_MODULES,
  enterprise_suite: ENTERPRISE_SUITE,
  metered_add_ons: [
    { id: "sponsored.discovery", price_usd: 5, billing: "per placement" },
    { id: "wallet.bot.classify", price_usd: 1, billing: "per call" },
    { id: "intelligence.synthesize", price_usd: 1, billing: "per call" },
  ],
});

export function publicMarketplacePackaging() {
  return JSON.parse(JSON.stringify(MARKETPLACE_PACKAGING));
}
