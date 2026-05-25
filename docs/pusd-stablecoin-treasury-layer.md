# PUSD Stablecoin Treasury Layer

## Purpose

PrivateDAO treats stablecoin settlement as a core treasury product, not as a side feature.

The layer is designed for DAOs, grant committees, gaming operators, and institutions that need:

- governed stablecoin payments
- confidential payroll and contributor settlement
- grant distribution with visible approval evidence
- gaming reward pools with treasury control
- reviewer-readable hashes, memos, and execution logs

PUSD is the first named institutional stablecoin corridor in this layer because it is live on Solana as an SPL token, built as a USD-pegged digital dollar, and positioned for enterprise treasury, cross-border settlement, and Shariah-compliant markets. The asset is described as non-freezable, with no freeze function, no blacklist, and no pause function; compliance is enforced at the permissioned mint/redeem layer rather than by blocking normal utility flows. The public product also keeps USDC and USDG as additional stablecoin rails so the architecture reads as a durable treasury layer, not a one-off integration.

## Product lanes

### PUSD confidential payroll

The DAO approves contributor or operator compensation through governance, then the payment request is executed as a stablecoin transfer with the signature, memo, and explorer link attached to the same proof path.

Primary routes:

- `https://privatedao.org/services#treasury-payment-request`
- `https://privatedao.org/services/testnet-billing-rehearsal/`
- `https://privatedao.org/judge/`

### PUSD grant distribution

Grant committees can approve PUSD payouts through a visible governance flow while keeping the reasoning, reviewer packet, and final settlement proof connected.

Primary routes:

- `https://privatedao.org/govern/`
- `https://privatedao.org/proof/?judge=1`
- `https://privatedao.org/documents/treasury-reviewer-packet/`

### PUSD gaming reward pool

Gaming DAOs can use PUSD as the stable reward asset for tournament pools, guild payouts, and governed reward allocation.

Primary routes:

- `https://privatedao.org/products/`
- `https://privatedao.org/engage?profile=pusd-gaming-reward-pool`
- `https://privatedao.org/services/testnet-billing-rehearsal/`

## Why PUSD fits the product

PUSD is presented as institutional-grade digital dollar infrastructure backed 1:1 by AED and SAR reserves, with both currencies pegged to the U.S. dollar. The asset is described as Shariah-certified, enterprise-oriented, and live across Solana and other major networks.

That makes it a strong fit for PrivateDAO because the product is already centered on:

- private treasury coordination
- governance-controlled execution
- cross-border contributor and grant operations
- institutional review and selective disclosure
- stable settlement instead of speculative treasury exposure

The practical product thesis is direct:

- PUSD removes freeze/blacklist/pause risk from normal utility flows.
- PrivateDAO adds governance, proof, selective disclosure, and treasury control around those flows.
- The combined product is not only a payment button; it is a stablecoin operating layer for payroll, grants, gaming rewards, and institutional treasury approvals.

External market-access reference:

- `https://www.biconomy.com/exchange/PUSD_USDT`

## Technical shape

The web product now exposes PUSD as a first-class treasury asset when these environment values are configured:

```bash
NEXT_PUBLIC_TREASURY_PUSD_MINT=
NEXT_PUBLIC_TREASURY_PUSD_RECEIVE_ADDRESS=
NEXT_PUBLIC_TREASURY_PUSD_DECIMALS=6
NEXT_PUBLIC_TREASURY_PUSD_TOKEN_PROGRAM=TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
PRIVATE_DAO_MICROPAYMENT_MINT=
PRIVATE_DAO_MICROPAYMENT_SYMBOL=PUSD
```

The browser flow constructs a wallet-signed SPL token transfer using:

- associated token account derivation
- idempotent destination ATA creation
- `TransferChecked`
- memo-coded SKU labels
- explorer-visible Testnet signatures

No unverified mint address is hardcoded into the repository. The official Solana PUSD mint is injected through environment configuration, and the same browser route runs the PUSD payment path with a funded wallet.

This matches the expected prototype standard: the UI route, treasury profile, billing SKU, SPL transfer builder, memo label, explorer link, and reviewer packet are present as one operating surface. The official PUSD mint resource activates the PUSD-specific transfer path without redesigning the product.

## Execution path

The PUSD lane is designed to read as a real treasury product in four steps:

1. Select a PUSD lane for payroll, grants, commerce settlement, or gaming rewards.
2. Build a wallet-reviewed SPL `TransferChecked` transaction from the configured mint, receive account, decimals, and token program.
3. Sign from the connected Solana wallet so PrivateDAO never custodies the payer key.
4. Attach memo, signature, explorer link, and reviewer route back to `/judge`, `/proof`, and the treasury reviewer packet.

Production PUSD activation is configuration-gated, not a rewrite. The required inputs are:

- `NEXT_PUBLIC_TREASURY_PUSD_MINT`
- `NEXT_PUBLIC_TREASURY_PUSD_RECEIVE_ADDRESS`
- `NEXT_PUBLIC_TREASURY_PUSD_DECIMALS`
- `NEXT_PUBLIC_TREASURY_PUSD_TOKEN_PROGRAM`
- `PRIVATE_DAO_MICROPAYMENT_SYMBOL=PUSD`

Until those are attached to the production environment with funded accounts and policy approval, PrivateDAO should describe the current state as a Testnet-ready PUSD treasury lane, not completed real PUSD settlement.

## Stablecoin expansion posture

PUSD is the strongest named corridor for the institutional stablecoin story. USDC and USDG remain supported as adjacent rails so PrivateDAO can serve broader treasury, commerce, payroll, and ecosystem payment flows without locking the product to one asset.

The current commercial message is:

- PUSD for institutional payroll, grants, and commerce settlement
- USDC for broad stablecoin compatibility
- USDG for gaming and reward-oriented stable settlement where configured
- SOL for native Testnet rehearsal, fees, and protocol-level action proof

## Reviewer path

Recommended review order:

1. Open `https://privatedao.org/services/testnet-billing-rehearsal/`
2. Connect a Solana Testnet wallet.
3. Select `PUSD confidential payroll lane` or `PUSD gaming reward lane`.
4. Sign the wallet transaction with the official PUSD mint configured and a funded PUSD wallet connected.
5. Open the explorer link and inspect the memo, transfer, and runtime logs.
6. Continue into `/judge`, `/proof/?judge=1`, and the treasury reviewer packet.

## Current boundary

PrivateDAO ships the browser, treasury configuration, route logic, and wallet-signed SPL transfer construction for PUSD.

The delivery posture for this track is practical: SOL Testnet SKUs prove the current commercial route today, while the PUSD lane is ready to activate through the same UI once the official Solana mint resource is available. That gives judges a shipped product surface now and a direct path to Palm USD utility during the remaining hackathon window.
