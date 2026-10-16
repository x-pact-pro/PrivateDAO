# Agent Exchange Seller Listing Packages

Seller packages control marketplace publication. They do not grant MCP
permissions, certify a seller, or create a partnership claim.

| Package | Price | Capacity | Condition |
| --- | ---: | ---: | --- |
| Community Listing | $0 | 3 services | Passed automated screening plus live badge/backlink verification |
| Basic Listing | $10 once | 5 services | Finalized Solana Mainnet USDC payment |
| Growth Listing | $49 once | 5 services | Finalized Solana Mainnet USDC payment |
| Featured Listing | $75 / 30 days | N/A | Optional sponsored placement; subject to capacity |
| Ecosystem Campaign | $250 / 30 days | N/A | Application and approval; third-party delivery is not guaranteed |

## Community listing verification

The free quote route performs a fresh bounded HTTPS fetch with manual redirects
and the public URL safety policy. The HTML must contain both:

1. `https://agents.privatedao.org/` or `https://privatedao.org/`.
2. `data-privatedao-agent-exchange` or the visible phrase
   `Listed on PrivateDAO Agent Exchange`.

The seller must acknowledge this condition in the portal. The result is stored
as `payment_status: waived` and `payment_type: community_badge`. No wallet
signature or treasury payment is accepted as evidence for a free claim.

## State separation

- `automated_review` is screening, not a security audit.
- `commercial_publication_status` describes marketplace visibility.
- `payment_status` is `paid` for paid packages and `waived` for Community.
- `sponsored_placement` is a separate paid campaign signal.

Owner tokens, payout secrets, and private credentials are never placed in the
badge, listing page, receipt, or client bundle.
