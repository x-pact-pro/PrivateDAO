# Product and Network Evidence

This is the reviewer-facing shortcut for answering two separate questions:

1. Is the product modeled and routed through the Kernel?
2. Is the stated product/network write path independently proven on-chain?

The first question is answered by `catalog.ts`, `protocol.ts`, and
`application-bindings.ts`. The second is answered only by the deployment
artifacts and their verifiers. A healthy RPC, a network logo, or a catalog row
does not upgrade a capability.

## Current evidence-backed lanes

| Network | Verified product lanes | Boundary |
|---|---|---|
| Ethereum Sepolia | Blind Verification, Record Verification, Treasury, Governance, Auctions | Testnet only. Payroll calculation/approval are Kernel policy lanes. |
| Arbitrum Sepolia | Blind Verification, Record Verification, Treasury, Governance, Auctions | Testnet only. Payroll settlement is not promoted. |
| Base Sepolia | Blind Verification, Record Verification, Treasury, Governance, Auctions | Builder Code attribution requires a fresh eligible transaction. |
| BNB Testnet | Blind Verification, Record Verification, Treasury, Confidential Payroll, Governance, Auctions | Payroll binds an off-chain commitment to a native Testnet payout receipt; it is not shielded EVM settlement. |
| Tempo Testnet | Blind Verification, Record Verification, Treasury, Governance, Auctions | Tokenized fee/payment behavior is Tempo-specific; Payroll remains policy-only. |
| Robinhood Testnet | Treasury, Governance, Auctions | Verification and Payroll settlement remain gated. |
| Solana Devnet | Payroll calculation/approval, Treasury, Governance, Auctions | Product-specific evidence; do not generalize to every Solana product. |
| Zcash Testnet | Payroll settlement | Shielded-wallet evidence is Zcash-specific; other products remain policy-only. |
| Hyperliquid HyperEVM Testnet | Blind Verification, Record Verification | EVM chain 998 evidence is independent from HyperCore native APIs; organizational lanes remain gated. |
| Stellar Testnet | Blind/Record Verification, Payroll calculation/approval, Treasury, Governance, Auctions | Nine confirmed Kernel-to-Horizon product-binding receipts; payroll settlement is Kernel-ready but not E2E-verified; controlled self-payments prove lifecycle execution, not product data storage. |

## BNB evidence path

```text
Product workflow
  -> Protocol capability
  -> Kernel gateway
  -> EVM family adapter
  -> evm-bnb-testnet
  -> signer and BNB Testnet RPC
  -> confirmed receipt
  -> product evidence artifact
```

The BNB organizational artifact contains 18 successful receipts and four
product-specific contracts. The Payroll lane records funding, commitment
creation, checker approval, settlement, and the final receipt. Sensitive
employee data is not written to the contract.

## BNB ecosystem reference boundary

The supplied BNB ecosystem table is useful integration reference material, not
evidence that these are PrivateDAO products:

| BNB reference | Possible PrivateDAO relevance | Current status |
|---|---|---|
| Agent Studio / Agent SDK | Agent Exchange tooling and external agent onboarding | No PrivateDAO implementation claim |
| Greenfield SDK | Off-chain evidence or artifact storage | No configured production adapter claim |
| MCP & Ask AI | MCP discovery and developer distribution | PrivateDAO MCP is independently documented at `agents.privatedao.org/mcp`; BNB MCP is not claimed as a dependency |
| MPP SDK | Future machine-payment integration | Not a current PrivateDAO payment rail |
| Scaled UI Amount / ERC-8056 | Token amount presentation or attribution experiments | No current product binding claim |
| Privacy at Scale | Privacy research reference | Not a PrivateDAO implementation claim |

No external BNB tool is presented as a partnership, dependency, or product
capability without repository code and independent evidence.

## Verification commands

```bash
npm run verify:bnb:evidence
npm run verify:bnb:organizational-evidence
npm run verify:stellar:product-e2e
npm run test:native-capability-registry
npm run verify:native-capability-matrix
npm run release:verify
```

These commands verify different boundaries. None should be replaced by an RPC
health check or by a frontend success message.
