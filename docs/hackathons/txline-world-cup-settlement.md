# PrivateDAO Match Settlement

Track: TxODDS / TxLINE Prediction Markets and Settlement

## Project Idea

PrivateDAO Match Settlement is a settlement workflow for prediction markets.

The user selects a World Cup match, resolves a market from TxLINE data, generates a Blind Settlement proof, verifies that the proof has not been tampered with, and stores receipt hashes on Solana.

Simple story:

1. A user creates or selects a match market.
2. The match ends.
3. TxLINE provides the match result snapshot.
4. PrivateDAO checks the hidden settlement policy.
5. A Groth16 proof package is generated.
6. Anyone can verify the package.
7. Receipt hashes are anchored on Solana.

## How TxLINE Is Used

The backend reads:

- `TXLINE_API_BASE`
- `TXLINE_API_TOKEN`
- `TXLINE_SERVICE_LEVEL_ID`
- `TXLINE_WALLET_PUBLIC_KEY`

When `TXLINE_API_TOKEN` is configured, the backend tries TxLINE match endpoints from the configured base URL.

When the token is missing, the backend uses `simulated-txline-provider`. This mode is clearly labeled and is only intended for local demos and judging before credentials are available.

## Endpoints

- `GET /api/v1/txline/status`
- `GET /api/v1/txline/matches`
- `POST /api/v1/txline/guest/start`
- `POST /api/v1/txline/resolve`
- `POST /api/v1/txline/verify`
- `POST /api/v1/txline/onchain-receipt`

## Free TxLINE API Activation

The product now exposes the documented free activation first step:

`POST /api/v1/txline/guest/start`

This calls:

`https://txline.txodds.com/auth/guest/start`

It returns a guest JWT that TxLINE documents as expiring after 30 days.

The free World Cup API path still requires the wallet-signed TxLINE activation flow:

1. Start a guest session and keep the JWT.
2. Use the configured revenue wallet to create/sign the free World Cup subscription transaction.
3. Activate the subscription with TxLINE using `txSig`, the detached wallet signature, and the requested leagues.
4. Store the returned long-lived API token as `TXLINE_API_TOKEN`.
5. Keep the guest JWT as `TXLINE_SESSION_JWT`.

PrivateDAO must not invent the activated API token. When both `TXLINE_SESSION_JWT` and `TXLINE_API_TOKEN` are configured, match data switches to `live-txline-provider`.

## Demo Flow

1. Open `/txline-settlement/`.
2. Select a final match.
3. Click `Resolve Market`.
4. Confirm the UI shows:
   - TxLINE data verified
   - Settlement policy satisfied
   - Groth16 proof verified
   - Public receipt generated
   - Private settlement logic hidden
5. Click `Simulate Tamper`.
6. Confirm the UI shows `422 mismatch`, original hash, and recomputed hash.
7. Click `Store receipt on Solana`.
8. Open the returned Explorer link.

## Truth Boundary

Live:

- Provider boundary for TxLINE.
- Simulated provider fallback.
- Groth16 proof package generation and verification.
- Tamper mismatch detection.
- Solana Memo receipt design.

Not claimed:

- Full on-chain Groth16 verification.
- Real TxLINE data without credentials.
- Automatic payout custody.
- Regulatory settlement certification.

## Solana Receipt Design

The receipt stores hashes only:

- proofIdHash
- matchIdHash
- marketIdHash
- txlineSnapshotHash
- settlementPolicyCommitment
- outcomeCommitment
- verificationKeyHash
- originalProofHash

## How To Run Locally

```bash
npm install
npm run typecheck
npm run test:unit:ts
npm run web:build:root
npm run start:read-node
```

Optional environment:

```bash
TXLINE_API_BASE=https://txline.txodds.com
TXLINE_SESSION_JWT=
TXLINE_API_TOKEN=
TXLINE_SERVICE_LEVEL_ID=1
TXLINE_WALLET_PUBLIC_KEY=4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD
SOLANA_RPC_URL=
TXLINE_SETTLEMENT_ONCHAIN_CLUSTER=mainnet-beta
```

## How Judges Can Test

Product page:

`https://privatedao.org/txline-settlement/`

API status:

`https://api.privatedao.org/api/v1/txline/status`

API docs:

`https://privatedao.org/developers/txline-settlement-api/`

Architecture:

`https://privatedao.org/documents/txline-settlement-architecture`
