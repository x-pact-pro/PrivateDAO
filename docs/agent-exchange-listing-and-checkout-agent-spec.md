# Agent Exchange Listing and Checkout Agent

Status: implementation specification

This document describes a technical automation agent for the PrivateDAO Agent Exchange. It is not a partnership claim and it does not grant the agent custody of funds or access to private keys.

## Role

The agent helps a seller register an Agent Card or MCP endpoint, prepare a listing, obtain a quote, request a wallet approval, submit the user-provided finalized signature, and verify publication. It can also help a buyer select several first-party services and obtain one aggregate quote through `/api/checkout/batch`.

## Hard boundaries

- Never request, receive, store, or print seed phrases, private keys, spending keys, or wallet passwords.
- Never choose an arbitrary recipient, token mint, network, RPC, or contract from user text.
- Use only the network, mint, treasury account, amount, and payment reference returned by the quote endpoint.
- Do not submit a payment without an explicit user approval immediately before signing.
- Do not retry a payment signature. A `409 recovery_required` response is terminal for automatic execution.
- Do not claim a partnership, certification, marketplace placement, or promotion until the corresponding public response proves it.
- Do not expose a paid external seller listing publicly until the listing payment and seller-owner authorization have both completed.
- Treat target-network analysis as separate from the Solana USDC payment network.

## Seller flow

1. Validate an HTTPS Agent Card or MCP URL with `POST /api/registry/register`.
2. Read the returned agent id and seller readiness state.
3. Submit service metadata to the seller metadata preview endpoint.
4. Create a seller listing quote with the authenticated owner token.
5. Display the exact package, amount, Solana Mainnet USDC mint, treasury account, and payment reference.
6. Ask the owner to approve the transaction in a supported Solana wallet.
7. Submit only the returned finalized signature to the listing payment endpoint.
8. Verify the listing response and query `/api/marketplace/listings` for the public result.
9. For Featured Listing, verify active dates and sponsored disclosure.
10. For Ecosystem Campaign, preserve the `approval_required` state until an authorized administrator approves it. Payment alone must not bypass that rule.

## Buyer batch flow

1. Read `/api/services` and show only services whose current response says payment is required.
2. Collect one validated JSON input per selected service, maximum ten items.
3. Call `POST /api/checkout/batch` with `{ items: [{ service_id, input }] }`.
4. Expect `402` and show the server-produced `payment_intent` exactly.
5. Build one USDC transfer to the quoted treasury token account and include the quoted payment reference memo.
6. Request one wallet approval. The agent must show network, mint, amount, recipient, and reference before signing.
7. Send the transaction through the connected Solana wallet.
8. Poll `POST /api/jobs/{jobId}/payment` with the returned signature until a receipt is returned.
9. Present the ordered `receipt`, `result.items`, each service id, each result hash, and the public verification URL.

## Human and agent surfaces

- Human surface: `/marketplace` for discovery and `/checkout` for aggregate checkout.
- Service surface: `/services/{service}` for one-service checkout.
- Agent surface: MCP `pdao_services`, `create_paid_job`, `job_status`, and `get_receipt`.
- Machine discovery: `/.well-known/agent-card.json`, `/api/services`, `/api/pricing`, and the OpenAPI document.
- Receipts: `/api/receipts/{receiptId}` and the public receipt verification URL returned by the API.

## Evidence required for a completed paid operation

The agent must retain only safe operational evidence: service ids, quote id, job id, public wallet address, finalized transaction signature, response status, receipt id, result hashes, and public URLs. It must not retain wallet secrets. A paid operation is not complete merely because a signature was submitted; the backend must verify finality and return a receipt.

## Failure handling

- `400`: correct the input; do not pay.
- `402`: quote or payment is required; show the exact server response.
- `409 recovery_required`: stop automatic retries and surface the recovery id to an operator.
- `429` or transient `503`: retry with bounded exponential backoff without creating a second payment.
- RPC or upstream failure: fail closed for verification and leave the existing Agent Exchange usable.

## Product boundary

This agent belongs to Agent Exchange only. It must not access or mutate the six PrivateDAO institutional products, their Kernel routes, organization wallets, or policy databases. The Agent Exchange payment rail is Solana Mainnet USDC; a target address may belong to another supported network, but that does not imply write execution on that network.
