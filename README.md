<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# PrivateDAO

> **Private decisions. Verifiable outcomes.**

PrivateDAO is a privacy-first operating layer for organizations that need to
run sensitive work without making every detail public. It helps teams define
rules, run workflows, approve actions, execute through the appropriate
infrastructure, and share evidence of the outcome.

Live Testnet program: `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`

Historical Devnet proof registry program: `5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx`
(`docs/proof-registry.json`); this is retained as provenance and is not the
current Testnet deployment.

An organization does **not** need to become a Web3 or crypto company to use
PrivateDAO. A company, institution, financial team, DAO, data provider, or
Web3 operator can start with a familiar business workflow and add wallets,
networks, settlement, or verifiable Web3 capability only where it creates
value.

## What PrivateDAO provides

### Private operations

- **Confidential Payroll** - prepare payroll, apply tax and deduction rules,
  collect approvals, settle through a supported private-payment path, and
  produce a verifiable result without exposing employee records.
- **Treasury Coordination** - manage spending requests, budgets, approvals,
  execution, reconciliation, and evidence for sensitive financial operations.
- **Private Governance** - coordinate proposals, committees, delegation, and
  decisions while keeping sensitive discussion and voting context private
  where the workflow requires it.

### Private transactions and markets

- **Confidential Auctions** - protect competing bids until the agreed close,
  then produce a fair and checkable result.
- **Private Settlement Workflows** - move an approved operation through a
  supported settlement provider and retain a receipt with clear lifecycle
  status.

### Verification

- **Blind Verification** - prove that a condition or policy was satisfied
  without revealing the underlying data.
- **Record Verification** - create a shareable, tamper-evident record for a
  document, event, approval, or business result without publishing private
  fields.
- **Private Identity Verification** - support selective confirmation of
  identity, entity, jurisdiction, or authorization requirements while keeping
  the source material private.

### Agent and community products

- **PrivateDAO Agent Exchange** - an MCP-compatible service marketplace for
  verification, blockchain intelligence, market context, agent discovery, and
  verifiable receipts.
- **PDAO Worlds** - an independent community game about privacy, trust,
  evidence, and coordination. It is a separate product and does not define
  the commercial workflow runtime.

### PDAO token surface

The current published token surface is documented in
[`docs/pdao-token.md`](docs/pdao-token.md) and the machine-readable
attestation is [`docs/pdao-attestation.generated.json`](docs/pdao-attestation.generated.json).
Pump.fun / creator-reward identity metadata for the live PDAO mint is published at
[`docs/pdao-pumpfun.json`](docs/pdao-pumpfun.json).

Live PDAO mint on Solana Mainnet: `9isGuumtaqvJeJeyLF44fvfskk2cv5mYsopexMBfpump`.

The documented Testnet governance token is `PDAO` with mint
`DFYvBdivHCe4bSErgCiKm2RhwGEcZYbBPFQzLNr37Bie` and a published initial supply
of `1,000,000 PDAO`. These references describe the current evidence surface;
they do not claim Mainnet launch, market liquidity, or speculative returns.

## How it works

```text
Choose the workflow
        -> define rules and participants
        -> run privately
        -> approve and execute
        -> reconcile the result
        -> share only the evidence that others need
```

The customer-facing workflow comes first. Wallets, providers, networks, RPC
clients, cryptography, and settlement details remain behind the product
boundary until execution requires them.

## Agent Exchange

The production Agent Exchange is available at:

- Marketplace: <https://agents.privatedao.org/>
- MCP endpoint: <https://agents.privatedao.org/mcp>
- Connection hub: <https://agents.privatedao.org/connect>
- Agent card: <https://agents.privatedao.org/.well-known/agent-card.json>

The endpoint is designed for standard MCP clients and exposes discovery,
verification, intelligence, agent matching, job lifecycle, payment-aware
receipts, and marketplace capabilities. Free discovery and read-only tools are
separate from paid service execution. A client must use the published schemas
and receipts; a frontend response is not payment proof.

Current payment and network claims are capability-specific. Where a service
requires payment, the active payment rail and supported target network are
returned by the service catalog. Do not infer that every advertised target
network has the same execution or payment capability.

## Kernel and runtime architecture

The repository contains provider-neutral runtime contracts in
`packages/privatedao-runtime`. The Kernel and Protocol layers provide common
boundaries for:

- product capabilities and permissions;
- provider selection and lifecycle states;
- wallet-signing boundaries;
- preparation, submission, confirmation, and receipts;
- reconciliation, idempotency, normalized errors, and telemetry;
- MCP, REST, SDK, and agent-facing contracts.

Network-specific transaction construction belongs behind adapters. The runtime
package does not store private keys, contain a wallet signer, or invent a
successful receipt. A configured network is not considered supported merely
because it appears in a UI or configuration file; it needs a real adapter and
independent evidence.

## Review and operating references

The repository keeps security, release, runtime, and operating evidence
available for reviewers. These documents describe engineering evidence and
boundaries; they are not claims of incorporation, certification, partnership,
or mainnet readiness unless the referenced document says so explicitly.

- [Security review](docs/security-review.md)
- [Threat model](docs/threat-model.md)
- [Security coverage map](docs/security-coverage-map.md)
- [Failure modes](docs/failure-modes.md)
- [Replay analysis](docs/replay-analysis.md)
- [Live proof](docs/live-proof.md)
- [Devnet release manifest](docs/devnet-release-manifest.md)
- [Verification gates](docs/verification-gates.md)
- [Mainnet readiness](docs/mainnet-readiness.md)
- [Generated mainnet readiness](docs/mainnet-readiness.generated.md)
- [Deployment attestation](docs/deployment-attestation.generated.json)
- [Go-live criteria](docs/go-live-criteria.md)
- [Operational drillbook](docs/operational-drillbook.md)
- [Runtime attestation](docs/runtime-attestation.generated.md)
- [Generated runtime attestation](docs/runtime-attestation.generated.json)
- [Frontier integrations](docs/frontier-integrations.generated.md)
- [Frontier track closure matrix](docs/frontier-track-closure-matrix-2026-05-25.md)
- [Frontier guided flow](docs/frontier-guided-flow.md)
- [Test-wallet live proof](docs/test-wallet-live-proof-v3.generated.md)
- [Governance hardening](docs/governance-hardening-v3.md)
- [Settlement hardening](docs/settlement-hardening-v3.md)
- [Real-device runtime](docs/runtime/real-device.md)
- [Generated real-device runtime](docs/runtime/real-device.generated.md)
- [Launch trust packet](docs/launch-trust-packet.generated.md)
- [Production custody ceremony](docs/production-custody-ceremony.md)
- [External audit engagement](docs/external-audit-engagement.md)
- [Pilot onboarding playbook](docs/pilot-onboarding-playbook.md)
- [Go-live attestation](docs/go-live-attestation.generated.json)
- [Production operations](docs/production-operations.md)
- [Fair voting](docs/fair-voting.md)
- [Wallet runtime](docs/wallet-runtime.md)
- [Operational evidence](docs/operational-evidence.generated.md)
- [PDAO attestation](docs/pdao-attestation.generated.json)
- [Strategy operations](docs/strategy-operations.md)
- [Reviewer fast path](docs/reviewer-fast-path.md)
- [Cryptographic integrity](docs/cryptographic-integrity.md)
- [Cryptographic manifest](docs/cryptographic-manifest.generated.json)

Reviewer entry points:

- [Judge Mode](https://privatedao.org/proof/?judge=1)
- [Wallet Diagnostics](https://privatedao.org/diagnostics/)

## Network status

PrivateDAO separates capability evidence by network. The following labels are
intentional:

- **Verified Testnet** - a documented testnet workflow has independent
  execution evidence for the stated capability.
- **Read or discovery** - the system can inspect or describe a network, but
  this is not proof of write-enabled product execution.
- **Planned** - configuration or roadmap information exists, but the product
  must not advertise execution until its adapter and E2E evidence are ready.

The current repository evidence includes Solana Testnet lifecycle material,
selective EVM-family Testnet verification, and Tempo Testnet payment/runtime
material. Ethereum, Base, Arbitrum, Robinhood, Zcash, Hyperliquid, and other
network entries must be read through the capability matrix and their linked
evidence rather than treated as one universal support claim.

Start with:

- [`docs/current-network-state-2026-05-24.md`](docs/current-network-state-2026-05-24.md)
- [`docs/multichain-readiness-20260917.md`](docs/multichain-readiness-20260917.md)
- [`docs/agent-exchange-production-report-20260920.md`](docs/agent-exchange-production-report-20260920.md)
- [`docs/readiness-aggregate.md`](docs/readiness-aggregate.md)
- [`packages/privatedao-runtime/README.md`](packages/privatedao-runtime/README.md)

No Mainnet capability should be inferred from a Testnet result. Mainnet
payments, production custody, and customer deployment remain separate release
gates.

## Public product surfaces

- Website: <https://privatedao.org/>
- Product overview: <https://privatedao.org/products/>
- Thesis: <https://privatedao.org/thesis/>
- Whitepaper: <https://privatedao.org/whitepaper/>
- Investors: <https://privatedao.org/investors/>
- Payroll: <https://privatedao.org/payroll/>
- Verification: <https://privatedao.org/verify/>
- PDAO information: <https://privatedao.org/token/>
- PDAO Worlds: <https://game.privatedao.org/game/godot/index.html>
- Machine-readable guide: <https://privatedao.org/llms.txt>
- Machine-readable manifest: <https://privatedao.org/ai.json>
- Site execution route inventory: <https://privatedao.org/documents/site-execution-route-inventory-2026-05-27/>

Historical product links are preserved through the site route inventory. The
public site is the commercial surface; this repository is the implementation,
evidence, and review surface.

historical links stay alive as bridges to the consolidated commercial
surfaces. The current evidence record signs from a Solana Testnet wallet; it
must not be read as Mainnet execution or as a claim that every network is
write-enabled.

## Review and Colosseum access

This is the repository submitted for review:

**<https://github.com/X-PACT/PrivateDAO>**

The repository is private. The official Colosseum review account is
`colosseum-git`, associated with `hackathon@colosseum.com`, and has repository
access. The canonical review branch is `main`.

The review package contains source and documentation only. Secrets, private
keys, wallet seed material, and deployment credentials are not part of the
repository.

Useful reviewer entry points:

- [`docs/agent-discovery-live-20260918.md`](docs/agent-discovery-live-20260918.md)
- [`docs/agent-mcp-independent-client-2026-09-19.md`](docs/agent-mcp-independent-client-2026-09-19.md)
- [`docs/product-readiness.md`](docs/product-readiness.md)
- [`docs/security-readiness.md`](docs/security-readiness.md)
- [`docs/mainnet-readiness.md`](docs/mainnet-readiness.md)
- [`docs/awards.md`](docs/awards.md)

## Local development

Requirements depend on the surface being tested. The web application uses
Next.js, React, TypeScript, and the Solana wallet-adapter ecosystem. Runtime
contracts are TypeScript packages; the on-chain program uses Anchor and Rust.

```bash
npm install
npm run typecheck
npm run web:build
npm run test:runtime
npm run test:record-verification
```

For the web application alone:

```bash
npm run web:dev
```

Run network or wallet tests only with the explicitly configured testnet
environment. Never place a private key, seed phrase, token, authenticated RPC
URL, or deployment credential in the repository.

## Evidence discipline

PrivateDAO distinguishes between implementation, testnet evidence, production
readiness, and mainnet execution. A green unit test does not prove an on-chain
transaction. An RPC health check does not prove product support. A marketplace
listing does not prove payment settlement. Each product and network must carry
its own lifecycle, receipt, reconciliation, privacy, and release evidence.

## License and notices

See [`LICENSE`](LICENSE), [`NOTICE.md`](NOTICE.md), and
[`TERMS_OF_REVIEW.md`](TERMS_OF_REVIEW.md) for the applicable source, brand,
review, and commercial-use boundaries.
