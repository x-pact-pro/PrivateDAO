# Live service execution gate — 2026-05-26

PrivateDAO now has a single public-runtime gate for the reviewer path:

```bash
npm run verify:live-service-execution
```

The gate checks the live production surface, not a local mock. It verifies that the main site, judge route, Encrypt/Ika route, Umbra route, Jupiter route, and historical entry links return usable pages. It then executes the hosted API routes that a reviewer needs to inspect the privacy and intelligence rails.

## Covered live routes

- `https://privatedao.org/`
- `https://privatedao.org/judge/`
- `https://privatedao.org/services/encrypt-ika-operations/`
- `https://privatedao.org/services/umbra-confidential-payout/`
- `https://privatedao.org/services/jupiter-treasury-route/`
- `https://privatedao.org/review/`
- `https://privatedao.org/payments/`
- `https://privatedao.org/business-model/`

## Covered live APIs

- `GET https://api.privatedao.org/api/v1/readiness`
- `GET https://api.privatedao.org/api/v1/cryptographic-readiness`
- `GET https://api.privatedao.org/api/v1/magicblock/onchain-proof?refresh=1`
- `GET https://api.privatedao.org/api/v1/umbra/relayer/health`
- `GET https://api.privatedao.org/api/v1/qvac/runtime-proof`
- `GET https://api.privatedao.org/api/v1/quicknode/stream/stats`
- `POST https://api.privatedao.org/api/v1/refhe/payroll/proof`
- `POST https://api.privatedao.org/api/v1/ika/solana-prealpha/approval/prepare`

## What the gate proves

- The public reviewer pages are reachable and contain the expected PrivateDAO/Testnet/product fragments.
- The API host is not returning a reverse-proxy failure or stale readiness response.
- MagicBlock proof is internally consistent: the proof route is Devnet-bound because the current MagicBlock payment evidence is Devnet, and the returned transactions must be finalized.
- QuickNode stream telemetry is configured for Solana Testnet and reports authenticated intake state.
- REFHE payroll proof accepts a browser-style encrypted packet and returns a receipt hash.
- Ika Solana pre-alpha approval preparation returns a deterministic route id for reviewer-visible custody planning.

## Boundary

This gate proves live service execution and public proof continuity. It does not claim mainnet real-funds launch, completed external audit, final Ika dWallet DKG signing, or a full Umbra private claim settlement. Those remain release gates tracked in the mainnet readiness documents.
