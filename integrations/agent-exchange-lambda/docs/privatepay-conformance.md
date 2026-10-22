# PrivatePAY x402 Conformance Gate

PrivatePAY is intentionally fail-closed until the payment rail proves all of
the properties required by the product specification:

- payer/provider relationship is not linkable;
- transfer amount is not publicly readable;
- deposit, private transfer, and withdrawal timing and fee correlation are
  bounded; and
- an x402 v2 facilitator verifies and settles the exact scheme on the
  configured Solana network. The reviewed MagicBlock rail uses
  `exact-magicblock` on `mainnet-private`; a future Token-2022 rail may use the
  private `privatepay` scheme only after its own facilitator is verified.

## Read-only audit

The audit never signs, broadcasts, or moves funds:

```sh
npm run privatepay:audit
```

`--prepare` audits only one unsigned transfer. It must never be interpreted as
deposit, transfer, and withdrawal evidence. To audit a real captured trace,
pass a JSON file containing separate `deposit`, `transfer`, and `withdrawal`
legs:

```sh
npm run privatepay:audit -- --trace-file=/secure/path/privatepay-trace.json --strict
```

The trace file is read locally and the report redacts static account lists and
full fee-payer addresses. Do not place keys, seeds, API credentials, or private
payloads in the trace file.

To probe a configured provider and prepare an unsigned provider transaction for
inspection, set the provider URL, confidential mint, and a disposable valid
Solana payer/provider address, then run:

```sh
PRIVATEPAY_PRIVACY_RAIL=magicblock-private-ephemeral-rollup \
PRIVATEPAY_FACILITATOR_URL=https://payments.magicblock.app \
PRIVATEPAY_FACILITATOR_API_KEY=<merchant-api-key> \
PRIVATEPAY_CONFIDENTIAL_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
PRIVATEPAY_AUDIT_PAYER=<disposable-payer> \
PRIVATEPAY_PROVIDER_WALLET=<provider-address> \
PRIVATEPAY_PROVIDER_HANDLE=<initialized-handle> \
PRIVATEPAY_PROVIDER_HANDLE_VERIFIED=true \
PRIVATEPAY_STEALTH_POOL_TOKEN=<bearer-token> \
PRIVATEPAY_PAYMENT_INGRESS=<separate-ingress-account> \
npm run privatepay:audit -- --prepare
```

For the MagicBlock rail, `PRIVATEPAY_PROVIDER_HANDLE` must be an initialized handle and carry independent verification via `PRIVATEPAY_PROVIDER_HANDLE_VERIFIED=true`; the transfer builder uses it as `to` and refuses an unverified handle. When `PRIVATEPAY_STEALTH_POOL_TOKEN` is available, the audit performs only `GET /v1/spl/stealth-pool?handle=...`; it never creates a pool, signs, or submits a transaction. The report redacts fee-payer addresses. `--strict` exits with status `2` until
the release gate is actually satisfied.

## Current boundary

MagicBlock health and its x402 capability endpoint can be probed. Its current
contract is `/v1/x402/{verify,settle}` and `/v1/x402/supported`, with
`exact-magicblock` and `mainnet-private` backed by a private ephemeral-rollup
settlement path. This is not the same as ordinary public SPL USDC: the rail
must be explicitly selected and its base-layer deposit, withdrawal, fee payer,
and timing correlation must still be independently audited. A prepared
transfer is evidence about the transaction boundary, not proof of full
unlinkability or amount confidentiality.

MagicBlock private transfers require an initialized stealth handle for the provider. The public x402 `payTo` value must be a separate ingress account and must never equal the provider wallet; the release gate rejects that configuration.  the handle breaks the direct sender-to-recipient wallet link. MagicBlock's `/v1/x402/verify` and `/v1/x402/settle` require an authenticated
merchant credential. The credential is read from
`PRIVATEPAY_FACILITATOR_API_KEY`, never returned in public status or receipts,
and is required before the production enable gate can pass.

The alternative Token-2022 path remains separate. Its mint must be
independently verified as a Token-2022 mint with the Confidential Balances
extension; a valid-looking Solana address or a normal SPL mint is insufficient.

## Multichain adapter boundary

PrivatePAY uses one x402 v2 agent/API contract, but privacy is verified per
network. The current adapter matrix is:

| Network | CAIP-2 | x402 family | PrivatePAY state |
| --- | --- | --- | --- |
| Solana Mainnet | `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` | MagicBlock `exact-magicblock` | Reviewed rail, still gated by funded E2E evidence |
| Base Mainnet | `eip155:8453` | EVM `exact` | Adapter identity only; no verified confidential rail |
| Robinhood Chain | `eip155:4663` | EVM `exact` | Adapter identity only; no verified confidential rail |

Selecting Base or Robinhood with `PRIVATEPAY_NETWORK` fails closed with
`PRIVATEPAY_NETWORK_RAIL_UNVERIFIED`. EVM compatibility and x402 support alone
do not hide payer, provider, amount, fee payer, or timing. Each network needs
its own confidential asset/contract, facilitator contract, gas-sponsorship
model, and funded deposit/transfer/withdrawal leakage trace before it can be
advertised or enabled.

Robinhood Chain's own terms state that the chain may operate on public or
semi-public infrastructure and that addresses, transactions, smart contracts,
and other interactions may be publicly visible. Its standard chain and RPC
therefore cannot satisfy the PrivatePAY privacy contract without a separate
confidential execution rail and an independent leakage audit. See the
[Robinhood Chain Terms](https://docs.robinhood.com/chain/terms-of-service/).

## Public x402 surface

The generic HTTP endpoint is:

```http
POST /api/privatepay/x402
```

Unsigned rail preparation is exposed separately for wallet-local execution:

```http
POST /api/privatepay/x402/prepare
```

The request accepts `phase: "deposit"`, `"transfer"`, or `"withdraw"` and
returns only the provider-built unsigned transaction plus its routing metadata.
The client must sign locally and submit it to the returned `send_to` target;
Agent Exchange never receives a private key and this endpoint never signs,
broadcasts, or moves funds. A prepared leg is not privacy evidence: the audit
must capture and analyze deposit, private transfer, and withdrawal as separate
legs, including block time, blockhash expiry, network fee, and fee-payer reuse.

Without `PAYMENT-SIGNATURE`, it returns a standard x402 v2 `402 Payment
Required` response. With a signature, it sends the single accepted requirement
to the configured facilitator for verification and settlement. The public
`PAYMENT-RESPONSE` contains only an opaque PrivatePAY commitment; raw
facilitator transaction identifiers, payer/provider addresses, amount, fee
payer, and timing fields are not exposed.

The direct `/api/privatepay/x402/{verify,settle}` endpoints and the MCP
`privatepay_verify`/`privatepay_settle` tools apply the same public redaction.
The MCP `privatepay_prepare` tool accepts the same three `phase` values and is
read-only from the platform perspective.

## Official MagicBlock merchant checkout

The Agent Exchange also exposes the reviewed provider checkout flow behind a
separate disabled-by-default gate:

```http
POST /api/privatepay/x402/checkout
```

Use `phase: "create"` with `amount_base_units`, `payer`, `resource`, and a
stable `external_reference`. The server calls MagicBlock's official
`POST /v1/payments` contract with `cluster: "mainnet-private"` and returns
only the checkout id and non-sensitive status fields. Then call the same
endpoint with `phase: "challenge"` and that `payment_id`; the server calls
`POST /v1/x402/payments/{id}/pay` and returns the provider's
`PAYMENT-REQUIRED` header when the response is HTTP 402.

This adapter never receives a private key, signs a wallet transaction, or
broadcasts a payment. `PRIVATEPAY_MERCHANT_CHECKOUT_ENABLED` must remain false
until the funded Mainnet privacy, timing, fee-payer, provider-audit, and exact
x402 conformance evidence is reviewed and explicit production activation is
approved. The matching MCP tool is `privatepay_checkout` with the same
`create` and `challenge` phases.

The lower-level transfer builder uses MagicBlock's `mainnet-private` cluster
for every MagicBlock private rail request, even when the application setting
is the generic `mainnet` or `mainnet-beta` alias. This prevents a private
transfer from being accidentally prepared on the public Solana route. The
returned transaction remains unsigned and must be reviewed and signed by the
client wallet.

Provider accounting is available only through the authenticated seller audit
surface above. This API behavior does not constitute privacy evidence: the
facilitator, funded trace, and independent relationship/amount/timing review
are still required before activation.

## Provider-only audit

An authenticated seller can inspect its own PrivatePAY executions through:

```http
GET /api/seller/dashboard/{agentId}/privatepay-audit
x-pdao-owner-token: <seller-owner-token>
```

The response is scoped to the authenticated seller and may include facilitator
settlement references, amount fields, and fee-payer information needed for
provider accounting. It never returns the raw `PAYMENT-SIGNATURE`, payment
payload, payer identity, or execution input. Public job status and receipts
remain redacted.

Production activation requires independent funded testnet evidence, a reviewed
mainnet privacy rail, exact x402 verify/settle conformance, provider audit
access, a separately verified `PRIVATEPAY_MAINNET_VERIFIED=true` release gate,
and explicit operator approval. Production preparation also requires a verified
gasless sponsor; payer-funded transactions are rejected by default because the
fee payer is public. The provider delay window is configured with
`PRIVATEPAY_MIN_DELAY_MS` and `PRIVATEPAY_MAX_DELAY_MS`; leaving both at zero is
not timing-privacy evidence. Devnet or experimental Mainnet deployments do not
satisfy that gate. No production flag is enabled by this document or by the
audit command.

## Cost boundary

The current Agent Exchange design does not add a Solana program deployment:
PrivatePAY uses the reviewed hosted rail and returns unsigned transactions for
wallet-local signing. Therefore there is no honest program-deployment SOL
figure to quote until a separate on-chain program is selected and its binary is
size-checked.

The live transaction cost is instead composed of the base-chain transaction
fee/rent plus the provider rail's published charges. MagicBlock documents a
0.1% private base-to-base privacy fee, a 0.2 USDC/USDT gasless sponsor relay fee
with a 0.5 USDC/USDT minimum, and possible first-transfer account rent of about
0.00204 SOL. These values are operational estimates, not a deployment quote;
the final amount must come from a funded, signed-off transaction trace. See the
[official private-payments guide](https://docs.magicblock.gg/pages/ephemeral-spl-token/private-payments)
and [API reference](https://api.magicblock.app/reference).
