# Product and Service Catalog

## Product families

### Proof Workflows

Verification, evidence collection, receipt validation, and audit-ready outputs for records, transactions, programs, and operational results.

### Private Governance

Controlled proposals, participation, approvals, committees, and accountable decisions without publishing every sensitive detail.

### Treasury Coordination

Budgets, approvals, execution, settlement, reconciliation, and evidence for sensitive financial operations.

### Agent Exchange

An MCP-compatible marketplace where software discovers services, requests work, receives structured results, handles quote-first payment, and verifies receipts.

### PrivatePAY x402

A quote-first private payment rail for compatible digital services, with explicit approval, supported MagicBlock private execution, settlement verification, and redacted receipts.

## Current Agent Exchange catalog

The live catalog currently contains 27 services: PrivatePAY plus the 26 services below. Always call `list_catalog` for current schemas, prices, and network support.

### Verification and evidence

`verify.basic`, `verify.deep`, `receipt.verify`, `sealkeeper.reputation`, `github.repository`, `intelligence.synthesize`

### Token, wallet, and risk intelligence

`token.intelligence`, `risk.score`, `wallet.intelligence`, `wallet.bot.classify`, `research.asset`, `research.wallet`, `anomaly.detect`, `forensics.trace`, `portfolio.intelligence`

### Program and transaction analysis

`contract.inspect`, `contract.explain`, `transaction.explain`, `transaction.simulate`

### Market and decision support

`launch.check`, `market.snapshot`, `swap.quote`, `decision.context`, `agent.research.report`

### Agent and ecosystem discovery

`agent.match`, `sponsored.discovery`

## Network rule

Applicable services currently expose Solana Mainnet, Ethereum Mainnet, Base Mainnet, and Arbitrum Mainnet targets. Evidence-only services may have no target-chain requirement. The live catalog is the source of truth.
