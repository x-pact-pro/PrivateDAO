# Stellar Testnet Product Coverage

This document records the current, evidence-backed Stellar lane. It is a
Testnet execution lane only and does not promote Stellar Mainnet support.

## Execution path

```text
Product workflow
  -> ProductExecutionGateway
  -> PrivateDaoKernel
  -> StellarNetworkAdapter
  -> StellarHorizonTransport
  -> Horizon Testnet
  -> confirmed transaction
  -> ExecutionReceipt
```

The adapter is selected by the Kernel network capability resolver. Product
code does not call Horizon directly. The transport owns network passphrase
validation, account recovery, fee estimation, XDR construction, submission,
confirmation lookup, and receipt construction.

## Verified product capabilities

| Product | Capability | Evidence boundary |
| --- | --- | --- |
| Blind Verification | `verification.blind.prove` | Workflow commitment bound to a confirmed Testnet receipt |
| Record Verification | `verification.record.create` | Workflow commitment bound to a confirmed Testnet receipt |
| Record Verification | `verification.record.verify` | Workflow commitment bound to a confirmed Testnet receipt |
| Confidential Payroll | `payroll.calculate` | Calculation and policy commitments; employee data stays off-chain |
| Confidential Payroll | `payroll.approve` | Approval policy commitment; employee data stays off-chain |
| Private Treasury | `treasury.policy.check` | Treasury policy commitment; no private treasury data is published |
| Private Governance | `governance.proposal.execute` | Governance policy commitment; discussion contents stay off-chain |
| Private Auctions | `auction.bid.commit` | Bid workflow commitment; bid contents stay off-chain |
| Private Auctions | `auction.settle` | Auction outcome commitment; financial settlement is not implied |

The nine capabilities above are required to remain synchronized across:

- `PRODUCT_CATALOG`
- `APPLICATION_CAPABILITY_BINDINGS`
- the native capability registry
- the generated web runtime catalog
- `STELLAR_KERNEL_CAPABILITIES`
- the committed Testnet evidence packet

The coherence verifier fails if any of these projections diverge.

## Deliberate exclusions

- `agent.discover` and `agent.invoke` remain on the Solana Agent Exchange
  lane. The Solana registry identity is not silently advertised as Stellar.
- `payroll.settle` is represented in the Kernel catalog as `testnet_ready`.
  The shared transport can prepare and sign a multi-recipient XDR, but no
  Stellar payroll payout is advertised as E2E-verified until a funded,
  independently confirmed settlement receipt exists.
- The shared `StellarHorizonTransport` now supports a guarded,
  multi-recipient `stellar-payroll-settlement` payload with commitment-bound
  workflow metadata. It can build and sign Testnet XDR, but remains
  unadvertised and broadcast-disabled until an independent funded settlement
  E2E produces a confirmed payout receipt.
- The dedicated payroll runner is `npm run test:stellar:payroll:e2e`. It
  requires the normal Testnet approval and broadcast gates plus
  `PDAO_STELLAR_PAYROLL_E2E_APPROVED=1`; without those gates it fails closed
  before reading or sending a transaction. Its evidence verifier is
  `npm run verify:stellar:payroll:e2e`.
- The Stellar evidence uses workflow commitments and confirmed Testnet
  transactions. It does not publish salaries, bids, recipients, source
  records, or private policy inputs.
- The current product E2E uses a real Stellar Testnet payment transaction as
  the network execution proof. It is not a claim that every product has a
  native Stellar smart contract implementation.

## Evidence and verification

Primary evidence:

- `docs/evidence/stellar-testnet-product-e2e.json`
- `scripts/verify-stellar-product-e2e-evidence.mjs`
- `scripts/verify-stellar-system-coherence.mjs`
- `scripts/verify-stellar-product-contract.mjs`
- `scripts/test-stellar-kernel.mjs`
- `scripts/test-stellar-product-workflow.mjs`
- `scripts/test-stellar-signer-boundary.mjs`

Useful checks:

```bash
npm run verify:stellar:coherence
npm run verify:stellar-product-contract
npm run verify:stellar:product-e2e
npm run test:runtime:stellar
npm run test:stellar:product-workflow
npm run test:stellar:signer-boundary
npm run test:stellar:payroll-prep
npm run test:stellar:payroll-kernel
```

Broadcast remains fail-closed unless both explicit Testnet approval gates are
enabled. No Mainnet operation is part of this lane.
