const detail = (category, summary, value, execution = "read_only") => ({ category, summary, customer_value: value, execution });

const DETAILS = Object.freeze({
  "verify.basic": detail("Verification", "Create a canonical digest and a receipt for a record or public evidence.", "A fast, free proof starting point."),
  "verify.deep": detail("Verification", "Apply deeper verification checks and return the evidence behind the decision.", "Higher-confidence review before an important action."),
  "receipt.verify": detail("Verification", "Check a PrivateDAO receipt and compare its canonical digest.", "Independent proof that a result has not changed."),
  "token.intelligence": detail("Intelligence", "Read public token facts, metadata and available on-chain evidence.", "A compact asset brief for an agent or analyst."),
  "wallet.intelligence": detail("Intelligence", "Summarize public wallet balances, activity and asset evidence.", "Context before a wallet-level decision."),
  "wallet.bot.classify": detail("Intelligence", "Classify whether a wallet shows bounded signs of automated bot activity.", "A cautious activity-based signal with evidence, not an unsupported brand claim."),
  "research.asset": detail("Intelligence", "Combine public asset facts, labeled signals and evidence references.", "Research without requiring a custom data pipeline."),
  "research.wallet": detail("Intelligence", "Analyze public wallet behavior, balances and activity.", "A decision-ready view of wallet behavior."),
  "portfolio.intelligence": detail("Intelligence", "Evaluate up to ten assets with per-asset facts, signals and failures.", "Portfolio context in one structured response."),
  "market.snapshot": detail("Intelligence", "Return public token facts plus sourced price and liquidity when available.", "A current market view for an automated workflow."),
  "decision.context": detail("Intelligence", "Turn structured evidence into a deterministic decision context.", "A clean handoff from evidence to action."),
  "intelligence.synthesize": detail("Intelligence", "Synthesize structured evidence with the configured inference provider.", "A readable conclusion for downstream agents."),
  "github.repository": detail("Intelligence", "Inspect public GitHub repository metadata and release-relevant provenance.", "Developer and software supply-chain context."),
  "risk.score": detail("Risk", "Return bounded risk factors and evidence confidence for a public asset.", "A transparent risk signal instead of an unexplained label."),
  "anomaly.detect": detail("Risk", "Detect deterministic anomalies in public asset or wallet evidence.", "Early warning signals for an agent workflow."),
  "contract.inspect": detail("Risk", "Inspect a public program or contract account, owner and executable state.", "Basic multi-chain due diligence before interaction."),
  "contract.explain": detail("Risk", "Explain public contract or program facts and execution context.", "Readable technical context before a decision."),
  "launch.check": detail("Risk", "Check public launch evidence for a token or mint.", "A pre-decision multi-chain launch review."),
  "forensics.trace": detail("Risk", "Trace public transaction evidence without signing or broadcasting.", "A bounded multi-chain forensic view of what happened."),
  "transaction.explain": detail("Transactions", "Explain a transaction or signature and surface failure context.", "Understand a transaction before or after a decision."),
  "transaction.simulate": detail("Transactions", "Simulate unsigned transaction data and return deterministic results.", "Test a transaction without broadcasting it."),
  "swap.quote": detail("Financial Services", "Return a Solana or EVM swap quote, route, slippage and network cost.", "Price a possible swap without executing it."),
  "agent.match": detail("Agent Services", "Rank registered agents against requested capabilities and context.", "Find the next provider for a multi-agent workflow."),
  "sponsored.discovery": detail("Agent Services", "Create an explicitly disclosed sponsored placement for agent discovery.", "Reach agents through a transparent commercial channel."),
});

export function serviceDetails(service) {
  return DETAILS[service.id] || detail("Agent Services", service.output, "A structured capability in the Agent Exchange.");
}

export const SERVICE_CATEGORIES = Object.freeze([
  { id: "Verification", description: "Proof that a record or result can be checked independently." },
  { id: "Intelligence", description: "Public evidence and context for better automated decisions." },
  { id: "Risk", description: "Bounded signals and inspections before an agent acts." },
  { id: "Transactions", description: "Explain or simulate transaction intent without hidden execution." },
  { id: "Agent Services", description: "Discover and coordinate capabilities across agents." },
  { id: "Financial Services", description: "Quote financial actions while keeping signing with the agent." },
]);

export const INTEGRATIONS = Object.freeze([
  { id: "ibm-watsonx", name: "IBM watsonx", eyebrow: "Enterprise AI", value: "Enterprise agent workflows", status: "Integration path", note: "Available when the watsonx endpoint and project credentials are configured; no partnership or endorsement is implied." },
  { id: "intel-openvino", name: "Intel OpenVINO", eyebrow: "AI execution", value: "Local and optimized inference", status: "Provider path supported", note: "Used when an OpenVINO endpoint is configured." },
  { id: "mongodb", name: "MongoDB", eyebrow: "Data infrastructure", value: "Persistent agent evidence", status: "Evidence history path supported", note: "Optional persistence for completed evidence." },
  { id: "github", name: "GitHub", eyebrow: "Developer ecosystem", value: "Repository provenance", status: "Public API evidence", note: "Repository evidence is read-only and provenance-labeled." },
  { id: "mcp-clients", name: "ChatGPT · Claude · Grok · OpenClaw", eyebrow: "Agent interoperability", value: "One MCP endpoint", status: "Client-level interoperability tested", note: "Testing does not imply partnership, certification or directory placement." },
  { id: "kernel", name: "PrivateDAO Kernel", eyebrow: "Execution foundation", value: "Policy-controlled routing", status: "PrivateDAO runtime boundary", note: "The Kernel is the internal routing and lifecycle boundary; it is not a separate vendor claim." },
]);

export function integrationDirectory() {
  return INTEGRATIONS.map((integration) => ({ ...integration }));
}

export function serviceRecommendation(task = "") {
  const query = String(task).toLowerCase();
  const terms = [
    ["verify", ["verify.basic", "verify.deep", "receipt.verify"]],
    ["receipt", ["receipt.verify", "verify.basic"]],
    ["token", ["token.intelligence", "risk.score", "market.snapshot"]],
    ["asset", ["research.asset", "token.intelligence", "market.snapshot"]],
    ["wallet", ["wallet.intelligence", "wallet.bot.classify", "research.wallet", "anomaly.detect"]],
    ["portfolio", ["portfolio.intelligence"]],
    ["market", ["market.snapshot", "token.intelligence"]],
    ["risk", ["risk.score", "anomaly.detect", "contract.explain"]],
    ["anomal", ["anomaly.detect", "risk.score"]],
    ["transaction", ["transaction.explain", "transaction.simulate", "forensics.trace"]],
    ["simulate", ["transaction.simulate"]],
    ["swap", ["swap.quote"]],
    ["github", ["github.repository"]],
    ["repository", ["github.repository"]],
    ["agent", ["agent.match", "sponsored.discovery"]],
    ["provider", ["agent.match"]],
  ];
  const ids = terms.filter(([term]) => query.includes(term)).flatMap(([, matches]) => matches);
  return [...new Set(ids)].slice(0, 8);
}
