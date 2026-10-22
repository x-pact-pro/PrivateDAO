# PrivatePAY source evaluation

Date: 2026-10-21
Scope: evidence review only; this document does not select or activate a provider rail.

## Requirements from the product brief

PrivatePAY must prove all of the following before production activation:

- hide the payer/provider relationship from the public response and practical chain analysis;
- hide the transfer amount from the public chain;
- preserve a provider-only authenticated audit boundary;
- implement x402 V2 verify and settle for Solana;
- test deposit, private transfer, withdrawal, timing, network fees, and fee-payer correlation;
- expose the capability through HTTP API and MCP without publishing private settlement metadata.

## Source findings

### MagicBlock Private Payments

The official guide documents private visibility, stealth handles, and queued settlement over an Ephemeral Rollup. It explicitly states that privacy reduces linkability rather than total observability and that amount and timing may still be inferable at the network level. Authentication for private reads and stealth-pool operations uses a challenge/login bearer token.

Source: <https://docs.magicblock.gg/pages/ephemeral-spl-token/private-payments>

Current repository position: the MagicBlock path is modeled as `exact-magicblock` on `mainnet-private`, but remains fail-closed until the facilitator contract, authenticated provider handle, and funded leakage measurements are independently verified.

### Read-only live capability check (2026-10-21)

The public MagicBlock endpoints returned `200` for `/health` and
`/v1/x402/supported`. The supported list includes x402 V2
`exact-magicblock` on the canonical Solana Mainnet CAIP-2 network with both
`mainnet` and `mainnet-private` cluster entries, using `ephemeral-rollup` and
`upfront` settlement. This is capability evidence only: no merchant credential,
stealth-pool authorization, signed transaction, settlement, or privacy result was
obtained by this check. Agent Exchange therefore remains `not_ready` and disabled.

### Umbra

The official Umbra documentation describes encrypted balances, private sends, stealth-pool notes, and selective disclosure. It also documents that deposits and withdrawals are public, and that amounts and timing can permit matching by inference. The SDK quickstart includes explicit registration, deposit, withdrawal, note creation, scanning, burning, and relayer steps.

Sources:

- <https://docs.umbraprivacy.com/docs>
- <https://github.com/umbra-defi/docs/blob/main/quickstart.mdx>

Current repository position: Umbra is a candidate rail for a separate adapter review. It is not treated as x402-conformant or production-ready merely because the SDK exposes privacy primitives.

### Solana x402 V2

The Solana documentation specifies the V2 transport headers, Solana CAIP-2 identifiers, exact and upto schemes, and the verification requirements for asset, amount, recipient, instruction layout, authority, compute budget, fee payer, expiry, replay, and confirmation. It recommends a reference SDK or conforming implementation instead of a partial verifier.

Source: <https://solana.com/docs/payments/agentic-payments/x402>

## Decision gate

No source is selected by this note. A rail can enter the implementation candidate set only after it supplies:

1. a documented integration surface usable from the Agent Exchange Lambda;
2. a real x402 V2 verify/settle conformance test;
3. read-only provider audit access that does not expose buyer metadata publicly;
4. funded Solana test evidence covering deposit, private transfer, withdrawal, timing, network fee, and fee-payer correlation;
5. an explicit threat-model report stating which relationships remain inferable.

Until then, `privatepay.x402` remains `Implementation`, `not_ready`, and disabled in both API and MCP surfaces.
