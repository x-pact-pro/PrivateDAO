# Agent Exchange Scope and Release Boundaries

Status: canonical operating boundary, 2026-10-16

## Product separation

### PrivateDAO enterprise products

The six institutional products remain part of the PrivateDAO Kernel product line:

- Confidential Payroll
- Confidential Auctions
- Private Governance
- Treasury Coordination
- Workflows
- Blind Verification

Their organization identity, constitution, policy engine, institutional accounts,
and PDAO Wallet roadmap are not Agent Exchange seller capabilities.

### Agent Exchange

The canonical runtime is `integrations/agent-exchange-lambda` and the public
runtime is `https://agents.privatedao.org`. It owns:

- Agent Card, MCP, A2A, and OpenAPI surfaces.
- Agent registry and seller onboarding.
- Service catalog and quote-first paid jobs.
- Solana Mainnet USDC payment verification.
- Receipts, idempotency, settlement scheduling, and marketplace listings.
- Optional internal integrations such as Sealkeeper read-only reputation.

Agent Exchange does not own the Kernel constitution, institutional wallet
authorization, or the PDAO Wallet account roadmap.

### Public ecosystem page

`https://privatedao.org/agents/` is a discovery and commercial entry surface.
It is not a second Agent Exchange runtime and must not contain duplicate payment,
registry, or Sealkeeper implementations.

### Kernel and PDAO Wallet roadmap

The institutional account system, B2B/B2C/AI wallet variants, and cryptographic
agility or post-quantum migration work belong under the Kernel roadmap. They may
consume Agent Exchange receipts later, but they must not be copied into this
Lambda or exposed as completed Agent Exchange capabilities.

## Sealkeeper boundary

Sealkeeper is a read-only technical PoC only. It is not a partnership, badge,
seller permission, rating replacement, or public trust gate.

- `SEAL_REPUTATION_ENABLED` must remain unset or `false`.
- The verification route remains internal and requires the admin smoke header.
- The route is intentionally omitted from public OpenAPI.
- No public Agent Card, MCP tool, marketplace listing, or seller decision may
  depend on Sealkeeper.
- Any future enablement requires a separate approval and a focused security
  review of key rotation, handshake lifecycle, route authentication, and agent
  metadata attachment.

## Mainnet paid E2E approval path

No Mainnet transaction is executed by this repository task. A separate wallet
operator must perform the following controlled run:

1. Use an isolated Solana Mainnet wallet with a small capped USDC balance.
2. Register or select a test seller Agent and verify its MCP endpoint.
3. Create a listing quote and record quote id, amount, expiry, payment
   reference, treasury, and USDC mint.
4. Build the payment transaction from the returned payment-transaction endpoint.
5. The wallet operator independently reviews recipient, mint, amount, network,
   and memo/reference before signing.
6. Submit the signed transaction and wait for finalized confirmation.
7. Submit the signature to the payment endpoint and capture the receipt.
8. Verify the listing is public and the seller dashboard shows paid state.
9. For Featured Listing, create a separate promotion quote, repeat the same
   review and finalized-payment process, then verify the active date window.
10. For Ecosystem Campaign, require explicit approval and record deliverables;
    payment alone does not prove external partner acceptance.

The operator must stop before signing if any network, mint, recipient, amount,
or expiry does not match the approved quote. Transaction signatures and receipts
must be added to an evidence report only after independent verification.

## Source-of-truth rule

This directory is the single source for Agent Exchange runtime code. Historical
branches and worktrees are evidence or development history, not additional
production implementations. Before deployment, the selected commit must contain
the Sealkeeper source, tests, and this boundary document together.
