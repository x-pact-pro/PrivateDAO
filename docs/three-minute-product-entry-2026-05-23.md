# Three-Minute Product Entry - 2026-05-23

PrivateDAO now has a first-visit route designed for judges, users, and investors who need to understand the product quickly without reading the full architecture.

## The Promise

In three minutes, a visitor should understand:

1. The problem: public DAO votes, payroll, rewards, and treasury moves expose intent too early.
2. The product: a wallet-first Solana Testnet operating layer for governance, confidential payroll, encrypted payments, rewards, intelligence, and proof.
3. The action: connect a Testnet wallet, fund it, open web or Android, review a plain-English action, sign, and verify the receipt.
4. The innovation: PrivateDAO connects privacy, intelligence, wallet execution, and proof in one usable web and Android product.

## Homepage Route

The root page now exposes a direct "3-minute product route" card:

- Minute 1: understand the problem through `/learn`
- Minute 2: try the product through `/start`
- Minute 3: verify the evidence through `/judge`

This keeps the first screen focused on what the visitor can do now instead of forcing them to infer the product from scattered pages.

## Testnet Proof Route

The proof route is still explicit:

- Active program: `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`
- ZK verifier: `5H7Afyqdh5yPekkZJ5UM2j3HNB2bRvU8aVv8XoqeAW1j`
- Squads vault: `CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv`
- Encrypted integration receipt: `2a8sHWgiVCZkstybMff2M9R6DVU4Y96Rfsg8mqYs7K3xcYSEG1zMcq2iSTNwLD6FgfXvxxxWpwEP9Tbyin47RXvE`

## Test Alias Fix

`npm run test:core:anchor` and `npm run test:full:anchor` now route through `scripts/run-local-anchor-suite.sh`.

This prevents an accidental Testnet deployment attempt after program upgrade authority moved to Squads. Full Anchor localnet execution remains available by setting `PRIVATE_DAO_RUN_ANCHOR_LOCALNET=1` on an AVX2-capable host.

## Verification Commands

```bash
npm run test:core:anchor
npm run typecheck
npm run web:lint
npm run verify:frontend-surface
npm run web:build
```

## Product Boundary

The site should lead with product confidence: live Testnet, web + Android, wallet-first execution, encrypted operation lanes, and judge-visible proof. Detailed release gates remain in security, custody, and diagnostic routes rather than the first product impression.
