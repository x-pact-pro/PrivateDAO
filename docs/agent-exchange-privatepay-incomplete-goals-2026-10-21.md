# Agent Exchange PrivatePAY x402 Handoff

Status: PAUSED / BLOCKED pending production prerequisites
Last verified: 2026-10-21
Repository: `/tmp/privatedao-agent-exchange-main`
Branch: `agent-exchange-main-integration`

## Objective

Build PrivatePAY x402 for Agent Exchange so agents and bots can pay for APIs
without exposing the public purchase history. The intended boundary is:

- keep payer, provider, and amount private on the reviewed private rail;
- allow the authenticated provider to inspect its own settlement data;
- support x402 v2 through API and MCP;
- prove deposit, private transfer, withdrawal, timing, fee-payer, and amount
  behavior before production activation.

## Implemented locally

- PrivatePAY x402 service model and challenge/requirements flow.
- x402 v2 facilitator validation and verify/settle forwarding.
- MagicBlock private transfer preparation using `exact-magicblock`.
- Unsigned deposit, private-transfer, and withdrawal transaction legs.
- Client-side signing boundary; PrivateDAO does not receive private keys or
  broadcast transactions.
- Provider-only audit surface with redacted public receipts.
- API and MCP routes for status, requirements, prepare, verify, settle, and
  paid-job execution.
- Solana network adapter enabled; Base and Robinhood remain fail-closed until
  independently verified confidential rails exist.
- MagicBlock transfer requests are forced to `mainnet-private`; base-layer
  deposits and withdrawals remain on `mainnet`.
- Leakage audit checks for shared accounts, repeated fee payers, visible timing,
  and amount metadata.

## Key files

- `integrations/agent-exchange-lambda/src/privatepay.mjs`
- `integrations/agent-exchange-lambda/src/privatepay-networks.mjs`
- `integrations/agent-exchange-lambda/src/config.mjs`
- `integrations/agent-exchange-lambda/src/handler.mjs`
- `integrations/agent-exchange-lambda/scripts/privatepay-conformance.mjs`
- `integrations/agent-exchange-lambda/test/privatepay.mjs`
- `integrations/agent-exchange-lambda/test/privatepay-job.mjs`
- `integrations/agent-exchange-lambda/test/privatepay-provider-audit.mjs`
- `integrations/agent-exchange-lambda/docs/privatepay-conformance.md`

## Verification completed

- Live Agent Exchange service inventory: 27 services.
- Other services are live or read-only by design; `privatepay.x402` is the only
  service currently reported as `Implementation`.
- MagicBlock health endpoint: reachable.
- MagicBlock supported endpoint: confirmed x402 v2 `exact-magicblock` for
  Solana `mainnet-private`.
- MagicBlock transfer builder: returned a real unsigned private-transfer
  transaction in a read-only probe.
- Focused PrivatePAY tests: 33 passed, 0 failed.
- Broader test run after the PrivatePAY changes: 132 passed, 0 failed, 1
  skipped.
- npm audit: 0 vulnerabilities.
- No transaction was signed, broadcast, or funded.

## Current production state

Production Lambda was located and verified:

- Function: `PrivateDAOAgentExchange-Function-N2zgpQmMN41S`
- Region: `eu-north-1`
- Runtime: `nodejs22.x`

The live Lambda environment does not currently contain
`AGENT_EXCHANGE_PRIVATEPAY_SECRET_ID` or PrivatePAY configuration variables.
The current AWS Secrets Manager inventory has no PrivatePAY secret.

## Required before activation

1. Create an AWS Secrets Manager secret named
   `pdao/agent-exchange/privatepay` in the production account. Do not put its
   values in chat.
2. Store the MagicBlock merchant credential and, when available, the stealth
   pool bearer token in that secret.
3. Set `AGENT_EXCHANGE_PRIVATEPAY_SECRET_ID` on the production Lambda.
4. Configure and independently verify the MagicBlock provider handle and a
   separate payment ingress account.
5. Fund a capped test wallet with SOL and USDC.
6. Run and archive a complete `deposit -> private transfer -> withdrawal`
   trace plus x402 `verify -> settle` evidence.
7. Analyze payer/provider linkability, amount visibility, timing, fee payer,
   and network-fee correlation.
8. Only after review, set the conformance gates and obtain explicit approval
   for `PRIVATEPAY_ENABLED=true`.

## Important privacy boundary

This integration uses MagicBlock Private Ephemeral Rollup / TEE execution. It
is not a claim of pure ZK anonymity. Base-layer deposits, withdrawals, fee
payers, and timing remain observable and require independent correlation
analysis. Ordinary public SPL USDC transfers are never treated as confidential.

## Worktree safety

The branch contains pre-existing and current uncommitted changes. Do not reset,
checkout, or clean the worktree. Review and stage only intended files when the
goal resumes. Do not deploy or commit this handoff automatically.

## Resumed execution: 2026-10-22

- Local tests passed: 132 passed, 1 skipped, 0 failed.
- Live surface verification passed: 27 services, finalized-USDC payment
  verification, and PrivatePAY remains `not_ready`, disabled, and fail-closed.
- Created a disposable test-only payer wallet in AWS Secrets Manager under
  `pdao/agent-exchange/privatepay-test-payer`. The private key is stored only
  in that secret and was never printed, committed, or placed in this file.
- Public payer address for funding is
  `Hgyur8sHktFiFg9As1GndGNwjFEr8yoE6VT1UWuu9GFs`.
- Recommended capped funding for the three-leg test trace is `1.50 USDC` and
  `0.01 SOL`. The documented technical minimum is `0.5 USDC` plus about
  `0.00204 SOL`, but the cap includes the deposit, private transfer,
  withdrawal, sponsor minimums, rent, and bounded retries.
- The Lambda production environment was not changed, no PrivatePay secret was
  wired into production, and no transaction was signed or broadcast. A
  MagicBlock merchant credential, initialized provider handle/stealth token,
  and separate payment ingress account are still required before E2E.
- Read-only balance check after funding on 2026-10-22: the test payer has
  `0.01 SOL` and `1.60 USDC`. The funding threshold is met; no transaction has
  been signed or broadcast by Agent Exchange.

## Resumed execution evidence: 2026-10-22 (MagicBlock merchant and handle)

- Installed the official MagicBlock development skill from
  `magicblock-labs/magicblock-dev-skill`; the local skill notes were reviewed
  before touching the payment rail.
- Created a separate disposable provider wallet in AWS Secrets Manager under
  `pdao/agent-exchange/privatepay-test-provider`; public address:
  `Fpi5ze2ueWmarWhyKuhpgT6DtfPRARCFj8CV9htkiwkz`. The private key was never
  printed or committed.
- Registered and rotated a MagicBlock merchant credential using a wallet-signed
  challenge. The resulting credential is stored only in the test-only AWS
  secret `pdao/agent-exchange/privatepay-test`; production Lambda remains
  unwired and disabled.
- Live API behavior differs from the current prose reference for SPL login:
  the provider wallet challenge verified locally, and the live login accepted
  the standard Solana base58 signature (base64 returned 401). This must be
  tracked before productionizing automatic token issuance.
- Live `mainnet-private` challenge/login succeeded with the provider wallet.
  The handle `privatedao-test@magicblock.id` is not initialized yet. MagicBlock
  returned a real unsigned `stealthPool` transaction with pool
  `CvE6WL72mMSeEPTPq8siYoXPRSfWPPQpyRN2iET4bDnj`, validator
  `MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo`, and provider wallet as the
  only required signer. No setup transaction was signed or broadcast.
- Remaining external prerequisites: fund the provider wallet for the one-time
  stealth-pool setup, sign/broadcast that setup transaction, obtain a separate
  x402 payment ingress/payTo account, then run the capped deposit -> private
  transfer -> withdrawal and x402 verify -> settle evidence trace.
- Corrected the MagicBlock x402 facilitator adapter to send the required
  `X-Merchant-Id` alongside the bearer merchant API key. The merchant ID is
  loaded from `PRIVATEPAY_MERCHANT_ID` or the configured provider wallet and
  can also be supplied by the PrivatePAY secret. The production enable gates
  remain unchanged.
- Focused regression run after the adapter change: 132 passed, 0 failed, 1
  skipped.
- A live no-funds facilitator probe using the stored test merchant credential
  and `X-Merchant-Id` reached MagicBlock and returned `400
  INVALID_PAYMENT_CREDENTIAL`, not `401`; this proves authentication headers
  were accepted while the fabricated payment credential was correctly rejected.
- Created a separate disposable x402 payment-ingress wallet in AWS Secrets
  Manager under `pdao/agent-exchange/privatepay-test-ingress`; public address:
  `3LmeWJ67JwoEdfcS8fH2jvDCscZ4Ykoyp3wfWxFzRo3N`. Its private key was never
  printed or committed. It is intentionally not wired to production until the
  MagicBlock merchant settlement contract confirms the correct public `payTo`
  account.
- Fresh finalized balance check: payer `Hgyur8sHktFiFg9As1GndGNwjFEr8yoE6VT1UWuu9GFs`
  remains at `0.01 SOL` and `1.60 USDC`; provider
  `Fpi5ze2ueWmarWhyKuhpgT6DtfPRARCFj8CV9htkiwkz` remains at `0 SOL` and `0
  USDC`. No setup or payment transaction has been signed or broadcast.
- Live MagicBlock merchant checkout creation succeeded with HTTP 200 using the
  stored test merchant credential. A no-funds `prepare` call then failed
  closed with `PAYMENT_ACCOUNTS_NOT_DELEGATED`, confirming that both payer and
  merchant USDC accounts must be delegated to the same validator before
  checkout payment.
- MagicBlock returned valid unsigned mainnet deposit builders for both payer
  and provider. Each returned `kind=deposit`, `sendTo=base`, seven
  instructions, and only its owner as a required signer. These are preparation
  artifacts only; neither transaction was signed or broadcast.

## Validator alignment evidence: 2026-10-22

- Live USDC initialization is available on both the public `mainnet` validator
  and the MagicBlock `mainnet-private` validator. The latter is
  `MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo`.
- Live checkout preparation on `mainnet-private` failed closed with
  `PAYMENT_ACCOUNTS_NOT_DELEGATED`, confirming that payer and provider must
  already be delegated to the same configured validator before settlement.
- Unsigned deposit builders for both payer and provider using
  `mainnet-private` returned HTTP 200, `sendTo=base`, seven instructions, and
  owner-only required signing. No transaction was signed or broadcast.
- Corrected `src/privatepay.mjs` so MagicBlock deposit and withdrawal builders
  use `mainnet-private` instead of the public `mainnet` cluster. This prevents
  accounts from being prepared against the wrong validator.
- Regression result after the correction: 132 passed, 0 failed, 1 skipped.

## Fresh funding gate check: 2026-10-22

- Live MagicBlock balance checks confirm the provider wallet
  `Fpi5ze2ueWmarWhyKuhpgT6DtfPRARCFj8CV9htkiwkz` still has `0` base USDC and
  is `undelegated` on `mainnet-private`.
- A direct Solana RPC check confirms that the same provider wallet still has
  `0 SOL`.
- The test payer still has `1.60 USDC` and `0.01 SOL`; no funds were moved by
  Agent Exchange.
- The remaining external gate is therefore unchanged: fund the provider with
  `0.01 SOL` and `0.01 USDC`, then sign the provider-only stealth-pool setup
  transaction. The ingress wallet remains unfunded and intentionally unused.

## Funded setup attempt and precise gate: 2026-10-22

- The provider balance later changed to `0.011 SOL` and `0.02 USDC`; this was
  verified live on Solana mainnet and through MagicBlock.
- Challenge/login succeeded and the stealth-pool builder returned HTTP 200.
  The response contains two transactions: `setupTransaction` must be sent to
  `base`; the separate `transactionBase64` is for the ephemeral leg.
- A signed `setupTransaction` was correctly targeted to `base`, but MagicBlock
  rejected preflight before broadcast. Direct Solana simulation identified the
  exact cause as `InsufficientFundsForRent` for the provider payer. No
  signature was returned and no transaction was accepted.
- The original `0.01 SOL` recommendation is therefore insufficient for this
  pool's rent footprint. Top up the provider to at least `0.03 SOL` total
  before retrying; retain a small fee buffer rather than funding the exact
  simulated minimum.
- For the complete gasless E2E trace, the provider also needs at least
  `0.20 USDC` in its existing base ATA for the withdrawal relay fee. Current
  `0.02 USDC` means an additional `0.18 USDC` is required. The payer's
  existing `1.60 USDC` covers the documented `0.5 USDC` minimum plus the
  `0.2 USDC` deposit relay fee.

## Funded E2E progress: 2026-10-22

- Provider funding reached `0.031 SOL` and `0.22 USDC`. The stealth-pool
  setup was rebuilt, simulated successfully, and confirmed directly on
  Solana mainnet because MagicBlock's base relay returned an internal preflight
  error. Confirmed setup signature:
  `4snEGHVGBq2cVzdfY8baFyMDCycHx5a9dw27ZPFZosWWvLchNeL9k2461vH5Zc4SHLRscGcjQ53jksnMvEYDDyBj`.
- The handle `privatedao-test@magicblock.id` now reports `exists=true` and
  pool `CvE6WL72mMSeEPTPq8siYoXPRSfWPPQpyRN2iET4bDnj` on
  `mainnet-private`.
- A gasless `0.5 USDC` payer deposit was prepared with all missing-account
  initialization flags enabled, simulated successfully, and confirmed on
  Solana. Confirmed deposit signature:
  `376e93njeqMLFpvUUkoQG5EKRz3HiBPSAdngbNv3dVrqbPPMMwhJxk7B55wjTqS5xN7x7TaryAKkNfm3SMnm4Hz8`.
  The payer private balance then read `500000` base units and its eATA was
  delegated to validator `MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo`.
- A gasless private transfer of `0.5 USDC` to the initialized handle was
  prepared, simulated successfully, and confirmed on Solana. Confirmed
  transfer signature:
  `2bx3pHhmtt1TFH86YpgTekKu2KXHxjTn46jWhFZTeJrPJ16Aq6TKfcEEYff1AiP3KiTRtTXb7aBRExUWHx7K2NUh`.
  The source base balance decreased by `0.7005 USDC`, matching the transfer
  plus relay fee, and the base shuttle escrow is funded.
- Reconciliation remains incomplete: payer private balance is still `500000`
  and provider private balance is `0` after repeated polls. The transfer
  transaction is therefore accepted but not yet proven settled to the
  provider. No withdrawal or x402 settle was attempted.

## x402 checkout execution evidence: 2026-10-22

- The official MagicBlock payment source was reviewed before signing. The
  `exact-magicblock` x402 v2 credential must contain
  `payload: { paymentId, transaction }`; a bare `transaction` payload is
  rejected as `INVALID_PAYMENT_CREDENTIAL`.
- A single test checkout was created for `1000` USDC base units (`0.001
  USDC`) on `mainnet-private`, with the payer and provider accounts already
  delegated to the same validator. No production credentials or Lambda
  environment were changed.
- Payment ID:
  `15ee5b35b4c2359c604812e673882ffd87e1ffaaa89b90d0416124bb43f65985`.
  The first correctly formed signed retry was accepted by MagicBlock with
  HTTP `202`, returned `pending`, and supplied a settlement signature. The
  authenticated payment record remains `pending` after repeated polling;
  therefore this is not yet a completed x402 settlement.
- The rejected first payload returned HTTP `400 INVALID_PAYMENT_CREDENTIAL`
  and the payment record remained `created`; it did not charge or create a
  second payment.
- Current read-only balance evidence after the accepted retry: payer base
  USDC `199500` with delegated status, provider base USDC `200000` with
  delegated status. Authenticated private-balance reads succeed; the payer
  private balance is `500000` and the provider private balance is `20000`.
- No additional funding is currently required for this pending `0.001 USDC`
  test. The funded test wallets still have the documented buffers: payer
  `0.01 SOL` plus `1.60 USDC` originally funded, and provider approximately
  `0.02 SOL` plus `0.22 USDC` originally funded before the test operations.
- Production remains fail-closed. Do not set `PRIVATEPAY_ENABLED`,
  `PRIVATEPAY_CONFORMANCE_VERIFIED`, or the Mainnet privacy gates until the
  same payment reaches `paid`, the private transfer is reconciled, and the
  withdrawal plus privacy/linkability audit are independently verified.
- Tightened the Agent Exchange MagicBlock facilitator guard to require the
  official `paymentId` and canonical base64 `transaction` fields and to bind
  `paymentId` to the quoted requirement. Focused PrivatePAY tests now pass
  `33/33`, syntax validation passes, and `git diff --check` passes.
- A fresh authenticated status read after the expiry window still reports
  `pending`, with a stored signature but no `confirmedAt` and no failure. The
  original checkout must therefore be treated as unresolved, not as paid or
  failed. No replacement checkout, replacement signature, or additional
  funding was created.

## x402 paid and withdrawal evidence: 2026-10-22

- The previous checkout's prepared blockhash was verified stale against the
  live `mainnet-tee` block height. It was not retried and cannot be treated as
  a successful payment.
- One replacement checkout was created only after that expiry was proven. It
  used the same capped test amount: `1000` USDC base units (`0.001 USDC`),
  payer `Hgyur8sHktFiFg9As1GndGNwjFEr8yoE6VT1UWuu9GFs`, and
  `mainnet-private`.
- Replacement payment ID:
  `434a6373b28e86475e829ff518161f41f13313d7075d84fe6e8a46520fa5acbd`.
  The x402 challenge returned `402`; the correctly signed retry returned
  `200` and the authenticated payment record returned `paid`.
- Authenticated private-balance reconciliation: payer changed from `500000`
  to `499000` base units; provider changed from `20000` to `21000` base units.
  Both accounts remained delegated to validator
  `MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo`.
- A provider withdrawal of exactly `21000` base units was built with
  `gasless=false`, signed from the AWS-stored test provider key, and submitted
  to `base`. The public signature
  `5JmVF1TZc9fwZ1NmYXLXdpqYJ5uYNM1ujvP8Sa4rF7zpCya5jKkhc7MMxm2c4GyAcBUKmdiNT86QDprHTtG3V1Zg`
  is `finalized` with no error. MagicBlock balance reconciliation reports
  provider private balance `0` and base balance `221000` base units.
- This proves the funded MagicBlock x402 checkout, private credit, and
  withdrawal leg for the capped test. It does not prove full anonymity:
  base entry/exit, fee payer, timing, and provider-side audit visibility
  remain observable boundaries.
- Production remains fail-closed. The old expired pending checkout remains
  unresolved in the remote ledger, but it was not retried and no additional
  funds are requested for the current test wallets.
