# Agent Exchange readiness audit

Audit date: 2026-10-21
Live base: `https://agents.privatedao.org`

## Live service inventory

The live `/api/services` response returned HTTP 200 and 27 services:

| Status | Count |
| --- | ---: |
| Mainnet Live | 1 |
| Mainnet Read-only | 23 |
| Mainnet Live - read-only | 2 |
| Implementation | 1 |

The only incomplete catalog item is `privatepay.x402`, currently marked
`Implementation`. No other incomplete service was found in the live catalog.

## PrivatePAY release boundary

PrivatePAY remains intentionally disabled in the live surface. The local
implementation exposes x402 v2 REST and MCP surfaces, but production release
requires all of the following evidence:

- exact facilitator verify/settle conformance;
- funded Mainnet deposit, private transfer, and withdrawal trace;
- independent payer/provider unlinkability evidence;
- amount confidentiality evidence;
- timing, fee-payer, and network-fee correlation analysis;
- authenticated provider-only audit access; and
- explicit operator approval for activation.

Base (`eip155:8453`) and Robinhood Chain (`eip155:4663`) have adapter identity
metadata only. They are fail-closed until each network has its own reviewed
confidential rail and the same evidence set. Ordinary EVM x402 support is not
privacy evidence.

## Verification

The live surface verifier passed health, marketplace, payment-finality,
account-provider, seller-tier, robots, and sitemap checks. Local Agent Exchange
tests passed after the PrivatePAY accounting and network-boundary changes; no
deployment or wallet signing was performed during this audit.
