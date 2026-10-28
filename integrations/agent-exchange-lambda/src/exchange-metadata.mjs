const detail = (category, summary, value, execution = "read_only") => ({ category, summary, customer_value: value, execution });

const DETAILS = Object.freeze({
  "verify.basic": detail("Verification", "Create a canonical digest and a receipt for a record or public evidence.", "A fast, free proof starting point."),
  "verify.deep": detail("Verification", "Apply deeper verification checks and return the evidence behind the decision.", "Higher-confidence review before an important action."),
  "receipt.verify": detail("Verification", "Check a PrivateDAO receipt and compare its canonical digest.", "Independent proof that a result has not changed."),
  "sealkeeper.reputation": detail("Verification", "Verify a SealKeeper credential and read its bounded reputation evidence.", "An optional external signal for discovery; never a certification or authorization gate."),
  "token.intelligence": detail("Intelligence", "Read public token facts, metadata and available on-chain evidence.", "A compact asset brief for an agent or analyst."),
  "wallet.intelligence": detail("Intelligence", "Summarize public wallet balances, activity and asset evidence.", "Context before a wallet-level decision."),
  "research.asset": detail("Intelligence", "Combine public asset facts, labeled signals and evidence references.", "Research without requiring a custom data pipeline."),
  "research.wallet": detail("Intelligence", "Analyze public wallet behavior, balances and activity.", "A decision-ready view of wallet behavior."),
  "portfolio.intelligence": detail("Intelligence", "Evaluate up to ten assets with per-asset facts, signals and failures.", "Portfolio context in one structured response."),
  "market.snapshot": detail("Intelligence", "Return public token facts plus sourced price and liquidity when available.", "A current market view for an automated workflow."),
  "decision.context": detail("Intelligence", "Turn structured evidence into a deterministic decision context.", "A clean handoff from evidence to action."),
  "intelligence.synthesize": detail("Intelligence", "Synthesize structured evidence with the configured inference provider.", "A readable conclusion for downstream agents."),
  "github.repository": detail("Intelligence", "Inspect public GitHub repository metadata and release-relevant provenance.", "Developer and software supply-chain context."),
  "risk.score": detail("Risk", "Return bounded risk factors and evidence confidence for a public asset.", "A transparent risk signal instead of an unexplained label."),
  "anomaly.detect": detail("Risk", "Detect deterministic anomalies in public asset or wallet evidence.", "Early warning signals for an agent workflow."),
  "contract.inspect": detail("Risk", "Inspect a Solana program account, owner and executable state.", "Basic program due diligence before interaction."),
  "contract.explain": detail("Risk", "Explain public contract or program facts and execution context.", "Readable technical context before a decision."),
  "launch.check": detail("Risk", "Check public launch evidence for a Solana mint.", "A pre-decision launch review."),
  "forensics.trace": detail("Risk", "Trace public Solana transaction evidence without signing or broadcasting.", "A bounded forensic view of what happened."),
  "transaction.explain": detail("Transactions", "Explain a transaction or signature and surface failure context.", "Understand a transaction before or after a decision."),
  "transaction.simulate": detail("Transactions", "Simulate unsigned transaction data and return deterministic results.", "Test a transaction without broadcasting it."),
  "swap.quote": detail("Financial Services", "Return a Solana swap quote, route, slippage and network cost.", "Price a possible swap without executing it."),
  "agent.match": detail("Agent Services", "Rank registered agents against requested capabilities and context.", "Find the next provider for a multi-agent workflow."),
  "sponsored.discovery": detail("Agent Services", "Create an explicitly disclosed sponsored placement for agent discovery.", "Reach agents through a transparent commercial channel."),
  "privatepay.x402": detail("Financial Services", "Negotiate a TEE-private x402 payment challenge whose tested settlement has no public Solana transaction trace; the authenticated provider can see payment metadata and network-level inference remains possible.", "Let agents pay for APIs through a TEE-backed settlement rail with explicit provider-visibility boundaries.", "commercial_fee: 2.5% of the quoted service subtotal, minimum $0.05 USDC, routed to the PrivateDAO treasury; MagicBlock documents separate Private Payments API costs of 0.002 SOL fixed plus 0.1% volume for applicable Mainnet setup/transfer flows; PDAO fees are separate from provider costs, holder promotions, and seller commissions; active while treasury-split verification remains true"),
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
  { id: "ibm-watsonx", name: "IBM watsonx", eyebrow: "IBM Partner Plus", value: "Enterprise agent workflows", status: "Integration path", source_url: "https://www.ibm.com/watsonx", note: "Available when the watsonx endpoint and project credentials are configured; program participation does not imply endorsement of every capability." },
  { id: "microsoft-azure-ai", name: "Microsoft Azure AI", eyebrow: "Curated provider", value: "Enterprise model and agent services", status: "Endpoint required", source_url: "https://learn.microsoft.com/azure/ai-services/", note: "Curated for seller submissions using an official Azure AI endpoint; no Microsoft partnership, certification or endorsement is implied." },
  { id: "cloudflare-workers-ai", name: "Cloudflare Workers AI", eyebrow: "Curated provider", value: "Edge agent infrastructure", status: "Endpoint required", source_url: "https://developers.cloudflare.com/workers-ai/", note: "Curated for verified Workers AI or MCP-compatible endpoints; Cloudflare branding does not mean a Cloudflare partnership." },
  { id: "intel-openvino", name: "Intel OpenVINO", eyebrow: "Intel Partner Plus", value: "Local and optimized inference", status: "Provider path supported", source_url: "https://docs.openvino.ai/", note: "Used when an OpenVINO endpoint is configured; credentials remain environment-only." },
  { id: "amd-ai", name: "AMD AI Developer Program", eyebrow: "AI performance", value: "AI workload validation", status: "Validation relationship", source_url: "https://developer.amd.com/", note: "Program resources support performance and accelerator evaluation; no provider secret is exposed." },
  { id: "mongodb", name: "MongoDB Atlas", eyebrow: "MongoDB Partner Program", value: "Persistent agent evidence", status: "Evidence history path supported", source_url: "https://www.mongodb.com/docs/atlas/", note: "Production persistence is optional and scoped to evidence history; DynamoDB remains canonical for jobs and payments." },
  { id: "github", name: "GitHub", eyebrow: "GitHub Developer Program", value: "Repository provenance", status: "Public API evidence", source_url: "https://docs.github.com/en/rest", note: "Repository evidence is read-only and provenance-labeled." },
  { id: "mcp-clients", name: "ChatGPT · Claude · Grok · OpenClaw", eyebrow: "Agent interoperability", value: "One MCP endpoint", status: "Client-level interoperability tested", note: "Testing does not imply partnership, certification or directory placement." },
  { id: "kernel", name: "PrivateDAO Kernel", eyebrow: "Execution foundation", value: "Policy-controlled routing", status: "PrivateDAO runtime boundary", note: "The Kernel is the internal routing and lifecycle boundary; it is not a separate vendor claim." },
]);

export function integrationDirectory() {
  return INTEGRATIONS.map((integration) => ({ ...integration }));
}

// Curated discovery only: these tools remain hosted and operated by their
// original maintainers. They are not PrivateDAO execution services.
export const CURATED_TOOLS = Object.freeze([
  { id: "github-mcp-server", name: "GitHub MCP Server", provider: "GitHub", category: "Developer tools", summary: "Official open-source MCP server for repository, issue and pull-request context.", official_url: "https://github.com/github/github-mcp-server", source_url: "https://github.com/github/github-mcp-server", access: "Free / open source" },
  { id: "playwright-mcp", name: "Playwright MCP", provider: "Microsoft", category: "Browser automation", summary: "Official Playwright MCP server for browser automation and web testing workflows.", official_url: "https://github.com/microsoft/playwright-mcp", source_url: "https://github.com/microsoft/playwright-mcp", access: "Free / open source" },
  { id: "aws-labs-mcp", name: "AWS Labs MCP Servers", provider: "Amazon Web Services", category: "Cloud infrastructure", summary: "Open-source MCP servers for AWS documentation, infrastructure and developer workflows.", official_url: "https://github.com/awslabs/mcp", source_url: "https://github.com/awslabs/mcp", access: "Free / open source" },
  { id: "cloudflare-mcp-server", name: "Cloudflare MCP Server", provider: "Cloudflare", category: "Edge infrastructure", summary: "Official Cloudflare MCP tooling for building and operating agent-connected edge workflows.", official_url: "https://github.com/cloudflare/mcp-server-cloudflare", source_url: "https://github.com/cloudflare/mcp-server-cloudflare", access: "Free / open source" },
  { id: "mongodb-mcp-server", name: "MongoDB MCP Server", provider: "MongoDB", category: "Data and databases", summary: "Official MongoDB MCP server for connecting compatible agents to MongoDB workflows.", official_url: "https://github.com/mongodb-js/mongodb-mcp-server", source_url: "https://github.com/mongodb-js/mongodb-mcp-server", access: "Free / open source" },
  { id: "microsoft-learn-mcp", name: "Microsoft Learn MCP Server", provider: "Microsoft", category: "Documentation and research", summary: "Official Microsoft Learn MCP access for searching and fetching current technical documentation.", official_url: "https://learn.microsoft.com/en-us/training/support/mcp-get-started", source_url: "https://learn.microsoft.com/en-us/training/support/mcp-get-started", access: "Free to use" },
]);

export function curatedTools() {
  return CURATED_TOOLS.map((tool) => ({ ...tool }));
}

export function serviceRecommendation(task = "") {
  const query = String(task).toLowerCase();
  const terms = [
    ["verify", ["verify.basic", "verify.deep", "receipt.verify"]],
    ["receipt", ["receipt.verify", "verify.basic"]],
    ["token", ["token.intelligence", "risk.score", "market.snapshot"]],
    ["asset", ["research.asset", "token.intelligence", "market.snapshot"]],
    ["wallet", ["wallet.intelligence", "research.wallet", "anomaly.detect"]],
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
    ["privatepay", ["privatepay.x402"]],
    ["x402", ["privatepay.x402"]],
    ["privacy payment", ["privatepay.x402"]],
  ];
  const ids = terms.filter(([term]) => query.includes(term)).flatMap(([, matches]) => matches);
  return [...new Set(ids)].slice(0, 8);
}
