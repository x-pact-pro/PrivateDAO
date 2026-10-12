# Integration Evidence Index

This index separates implementation readiness from real network evidence.
Use the linked artifact for the exact product, network, transaction, and
receipt claim.

| Family | Network | Evidence entrypoint | Current boundary |
|---|---|---|---|
| EVM | Ethereum Sepolia | `packages/evm-verification/deployments/` | Read the product-specific phase-2 and organizational artifacts. |
| EVM | Arbitrum Sepolia | `packages/evm-verification/deployments/` | Funded E2E exists only where the linked artifact records it. |
| EVM | Base Sepolia | `packages/evm-verification/deployments/` | Builder attribution is separate from historical E2E evidence. |
| EVM | Tempo Testnet | `packages/evm-verification/deployments/phase-2-e2e-tempo-testnet.json` | Token-fee/payment behavior is Tempo-specific. |
| EVM | BNB Testnet | `packages/evm-verification/deployments/phase-2-e2e-bnb-testnet.json`, `organizational-bnb-testnet.json` | Verification, Treasury, Payroll, Governance, and Auction organizational E2E are verified. |
| EVM | Robinhood Testnet | `packages/evm-verification/deployments/` | Do not infer support from RPC health. |
| EVM | Hyperliquid HyperEVM | `packages/evm-verification/deployments/phase-2-e2e-hyperliquid-testnet.json` | Blind and Record Verification are independently verified; HyperCore native APIs remain separate. |
| Solana | Solana Devnet/Mainnet | runtime and Agent Exchange evidence | Wallet/commitment rules differ from EVM. |
| Zcash | Zcash Testnet | Zcash evidence and runtime artifacts | Shielded notes and wallet state are not EVM receipts. |
| HyperCore | Hyperliquid native | runtime adapter evidence | Read-only/native exchange boundary; not HyperEVM execution. |

## Evidence rules

- A network adapter or healthy RPC is not product E2E.
- A receipt from one product does not certify another product.
- A testnet receipt does not certify mainnet.
- A bridge is not substituted for native/direct execution.
- A product can have a Kernel policy route before its network write gate is
  verified; the capability matrix records that distinction.

For generated status, use
[`../generated/native-capability-matrix-20260911.json`](../generated/native-capability-matrix-20260911.json)
and then inspect the referenced deployment artifact before making a claim.
