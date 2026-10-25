# Skill Usage Guide

## How the assistant chooses a skill

1. Identify the user's goal: explain, verify, analyze, pay, discover, or prepare.
2. Load the narrowest matching skill.
3. Read the live catalog before recommending a paid service.
4. State the expected input, network, price or quote status, and output.
5. Ask for confirmation before any payment or signing.
6. Return evidence, limitations, and the receipt path.

## Examples

- “Is this transaction safe before I sign?” -> `transaction-safety.md` then `transaction.explain` or `transaction.simulate`.
- “Check this token” -> `verification-suite.md` then `token.intelligence` and, if needed, `risk.score`.
- “Analyze this wallet” -> `wallet-risk.md` then `wallet.intelligence` or `research.wallet`.
- “Give me a complete report” -> `research-synthesis.md` then `agent.research.report` or `intelligence.synthesize`.
- “Pay for a private service” -> `privatepay-execution.md`.
- “Find an agent” -> `agent-discovery.md`.
