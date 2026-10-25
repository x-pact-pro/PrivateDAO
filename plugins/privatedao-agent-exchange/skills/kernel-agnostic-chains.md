# Skill: Kernel and Chain-Agnostic Execution

## Positioning

PrivateDAO's Kernel keeps the operating contract stable while adapters handle network-specific construction, signing, submission, confirmation, and settlement.

## What stays stable

- capability and permission policies;
- provider selection and lifecycle states;
- wallet-signing boundaries;
- preparation, submission, confirmation, and receipts;
- reconciliation, idempotency, normalized errors, and telemetry;
- MCP, REST, SDK, and agent-facing contracts.

## What changes by network

RPC endpoints, transaction formats, account models, token programs, fees, confirmation rules, and privacy rails are adapter concerns. Never infer that evidence on one network proves write-enabled execution on every network.

## Commercial language

Say: “One operating model across supported networks, with evidence stated per capability.”

Do not say: “Every chain is fully supported” unless the live capability matrix proves that exact operation.
