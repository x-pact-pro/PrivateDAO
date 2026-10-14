import fs from "fs";
import path from "path";

const DECK = path.resolve("docs/investor-pitch-deck.md");

const REQUIRED_FRAGMENTS = [
  "# PrivateDAO Investor And Competition Pitch Deck",
  "1st Place - Superteam Poland",
  "Private governance, confidential treasury operations, and audit-grade runtime evidence",
  "Testnet program: `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`",
  "PDAO governance mint evidence: ``",
  "## Slide 2 - The Problem",
  "## Slide 3 - The Product",
  "## Slide 5 - What Works Today",
  "## Slide 6 - Evidence And Traction",
  "50-wallet Testnet rehearsal",
  "212 total attempts",
  "180 successful attempts",
  "32 expected security rejections",
  "3 on-chain ZK proof anchors",
  "## Slide 8 - Security Model",
  "external audit is pending",
  "real-funds mainnet is blocked",
  "## Slide 9 - Business Model",
  "does not claim live protocol revenue today",
  "## Slide 10 - Go-To-Market Wedge",
  "## Slide 11 - Roadmap",
  "create production 2-of-3 multisig",
  "configure 48+ hour timelock",
  "## Slide 12 - The Ask",
  "docs/mainnet-blockers.md",
  "docs/multisig-setup-intake.md",
  "docs/monitoring-alert-rules.md",
  "docs/wallet-e2e-test-plan.md",
];

const FORBIDDEN_FRAGMENTS = [
  "mainnet production ready",
  "mainnet-cleared",
  "real-funds mainnet cleared",
  "external audit complete",
  "audited by",
  "paying customers",
  "we have live protocol revenue",
  "has live protocol revenue",
  "generates live protocol revenue",
  "guaranteed returns",
  "risk-free",
];

function main(): void {
  if (!fs.existsSync(DECK)) {
    throw new Error("missing investor pitch deck");
  }

  const body = fs.readFileSync(DECK, "utf8");
  for (const fragment of REQUIRED_FRAGMENTS) {
    if (!body.includes(fragment)) {
      throw new Error(`investor pitch deck missing required fragment: ${fragment}`);
    }
  }

  const lower = body.toLowerCase();
  for (const fragment of FORBIDDEN_FRAGMENTS) {
    if (lower.includes(fragment.toLowerCase())) {
      throw new Error(`investor pitch deck contains forbidden overclaim: ${fragment}`);
    }
  }

  console.log("Investor pitch deck verification: PASS");
}

main();
