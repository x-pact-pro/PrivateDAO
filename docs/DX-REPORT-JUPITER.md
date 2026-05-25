# Jupiter DX Report

## Scope
- Product lanes reviewed:
  - `/services/jupiter-treasury-route`
  - `/execute#treasury-rebalance`
  - `/proof`

## What worked well
- Route-level integration is visible and reviewer-friendly.
- Treasury-route framing is aligned with governance-first execution.
- Proof and judge continuity is straightforward to explain.
- The product now supports a server-side Jupiter Developer Platform `/order` mode through `NEXT_PUBLIC_JUPITER_ORDER_ENDPOINT`, while preserving the public Lite Quote fallback for static review surfaces.

## Friction points
1. API error semantics still need stronger user-facing normalization across `/order`, `/execute`, and quote-only fallback modes.
2. Route/quote terminology is still too technical for first-time users.
3. Some execution hints are distributed across pages; a single condensed status panel would improve speed.

## Suggested improvements
1. Add normalized Jupiter error map for UI (`quote timeout`, `route unavailable`, `insufficient liquidity`).
2. Add one in-page “Route Quality Summary” card with:
  - expected slippage band,
  - path complexity,
  - risk flag.
3. Add direct diff between pre-route and post-route treasury state in execution receipts.

## Estimated time-to-first-value
- For an already connected wallet and configured environment: under 3 minutes to understand the lane and run first controlled route rehearsal.
