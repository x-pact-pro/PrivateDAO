# Production Surface Handoff

This document separates repository evidence from the currently deployed
commercial website. It is intentionally operational: an asset in GitHub is
not evidence that the asset is already live.

## Current status

| Surface | Status | Evidence |
|---|---|---|
| Kernel, protocol, adapters, and BNB evidence | READY IN REPOSITORY | `ENGINEER-INDEX.md`, generated architecture index, BNB receipt artifacts |
| Commercial `/products` route | LIVE | `https://privatedao.org/products/` returns HTTP 200 |
| Retired `/services` route | LIVE REDIRECT | canonical redirect to `/products` |
| BNB marquee logo | READY IN REPOSITORY | `apps/web/src/components/network-marquee.tsx` and `apps/web/public/assets/networks/bnb.svg` |
| BNB marquee logo on production homepage | PENDING DEPLOYMENT | live homepage still serves the previously deployed marquee |

## Source of truth

The BNB logo and network marquee are implemented in:

- `apps/web/src/components/network-marquee.tsx`
- `apps/web/public/assets/networks/bnb.svg`

The BNB execution evidence is independent of the visual surface. Read-only
verification is:

```bash
npm run verify:bnb:evidence
npm run verify:bnb:organizational-evidence
npm run verify:engineer-index
```

## Root-domain release path

The reviewed root-domain web artifact is prepared in this order:

```bash
npm run web:build:root
npm run web:bundle:root
bash scripts/verify-web-mirror-bundle.sh root
bash scripts/prepare-primary-host-stack.sh
```

`publish-web-live-surface.sh` only copies a validated mirror into the
checkout. It is not an AWS deployment command by itself. Production rollout
requires the existing primary-host release process and a separate approval.

## Release gates

Before rollout, run the repository release gate and confirm the exact commit
being released:

```bash
npm run release:verify
git status --short
git rev-parse HEAD
```

Do not include secrets, private keys, wallet paths, or signer environment
values in the release artifact or in public evidence. Do not infer BNB product
support from the logo; require the product binding and on-chain receipt
verifier described in `ENGINEER-INDEX.md`.

## Rollback boundary

The current live website is separate from BNB Testnet
execution evidence. A web rollback must not delete network receipts, wallet
state, Zebra data, or Agent Exchange runtime state.
