# PrivatePAY x402 Mainnet Release Runbook

## Current boundary

PrivatePAY is publicly enabled on the production Agent Exchange surface. The
production merchant account is
`2BJ4ezxqV9YJXc38D9duKBkdn4su4jE1beKUHwH663sL` and the settlement asset is
native Solana USDC on `mainnet-private`.

The read-only release collector last confirmed at
`2026-10-25T08:52:57Z` that the merchant account is delegated to
`MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo` at
`https://mainnet-tee.magicblock.app`, and that the recorded x402 payment is
`paid` with a finalized TEE settlement. The public status endpoint returned
`enabled`, with no activation blockers.

The release decision remains `candidate`, not an unconditional privacy claim:
the collector marks payment-bound TDX attestation as `INCONCLUSIVE`. This
means finalized TEE execution and the provider's public-trace evidence are
recorded, while payment-specific TDX binding and complete unlinkability are
not claimed. The `Fpi5...` account remains a test provider account and is not
a substitute for the production merchant account.

The reproducible evidence packet is written with mode `0600` to:
`/home/x-pact/PrivateDAO-CANONICAL-LIVE-20260818/evidence/privatepay/PrivatePAY-live-release-audit-latest.json`.
It contains no private key, API secret, or signed/broadcast transaction.

## Phase 1: provider-side account setup

1. The owner of the production merchant wallet must use the official
   MagicBlock flow to initialize/delegate the USDC account to the selected
   Mainnet validator.
2. Fund the merchant USDC account with the bounded test amount and fund its
   base wallet with enough SOL for the required base-chain transaction.
3. The owner signs the unsigned transaction returned by `POST /v1/spl/deposit`
   or the applicable official delegation flow. The signer must be the merchant
   wallet owner; a payer or test-provider key is not interchangeable.
4. Confirm the delegation with:

   ```bash
   npm run privatepay:delegation-audit
   ```

   The merchant result must show `delegation.status=delegated` and the expected
   validator. A test-provider result is informational only.

To build the unsigned merchant deposit transaction locally, without signing or
broadcasting it:

```bash
npm run privatepay:merchant-deposit
```

The artifact is written with mode `0600` to
`output/privatepay/merchant-deposit-unsigned.json`. It contains no private key,
but its blockhash expires; regenerate it immediately before the owner signs.

For a wallet-extension signing flow, the local helper is
`/home/x-pact/privatepay-merchant-deposit-sign.html`. Open it in the same
browser profile as the owner wallet, inspect the artifact, connect the exact
merchant address, review the confirmation checkbox, and use the explicit
submit button. It does not expose or store a private key.

## Phase 2: read-only application checks

Run these from this directory:

```bash
npm run privatepay:delegation-audit
npm run privatepay:provider-preflight
npm run privatepay:audit
```

Expected conditions:

- checkout creation returns HTTP 200;
- challenge returns HTTP 402 with `PAYMENT-REQUIRED`;
- no `PAYMENT_ACCOUNTS_NOT_DELEGATED` response;
- official queue crank is prepared and simulated without error;
- public status remains fail-closed until all release evidence exists.

## Phase 3: bounded funded conformance test

Use a dedicated funded payer and a small approved amount. Record the checkout
ID and client reference, then require all of the following:

1. signed private transfer submitted to `mainnet-private`;
2. finalized queue execution matching the exact client reference and amount;
3. successful x402 v2 `verify` response;
4. successful x402 v2 `settle` response;
5. settlement signature independently verified on Mainnet;
6. public-trace evidence covering the tested settlement, plus an explicit
   disclosure that the authenticated provider can see payment metadata and
   network-level timing inference remains possible.

Do not infer settlement from provider health, checkout creation, a crank
signature, or an anonymous TEE record.

## Phase 4: activation and public release

Only after the evidence report contains every Phase 3 item may the operator
review and explicitly set the production gates, including:

```text
PRIVATEPAY_MERCHANT_ACCOUNTS_DELEGATED=true
PRIVATEPAY_CONFORMANCE_VERIFIED=true
PRIVATEPAY_MAINNET_VERIFIED=true
PRIVATEPAY_PUBLIC_TRACE_VERIFIED=true
PRIVATEPAY_PROVIDER_METADATA_DISCLOSURE_VERIFIED=true
PRIVATEPAY_E2E_VERIFIED=true
PRIVATEPAY_TREASURY_SPLIT_VERIFIED=true
PRIVATEPAY_MERCHANT_CHECKOUT_ENABLED=true
PRIVATEPAY_ENABLED=true
```

The deployment must then be followed by a live status check. Any missing flag,
failed provider probe, missing settlement signature, or delegation regression
must keep the public product disabled.

## Evidence locations

- `evidence/privatepay/PrivatePAY-provider-contract-audit-2026-10-25.md`
- `evidence/privatepay/PrivatePAY-payment-reconciliation-2026-10-25.md`
- `evidence/privatepay/PrivatePAY-wallet-inventory-2026-10-25.md`

No private key, API secret, or signed transaction payload belongs in this
runbook or in public product documentation.
