# Frontier Track Closure Matrix — 2026-05-25

PrivateDAO is positioned as one Solana Testnet product, not a sponsor-name collage. This matrix maps each judging track to the live route, backend proof, operating boundary, and verification command that protects the public claim.

Current operating baseline:

- Cluster: Solana Testnet
- Anchor program: `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`
- Anchor version: `1.0.1`
- Squads vault: `CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv`
- Current binary proposal: Squads proposal index `3`
- Timelock release: `2026-05-27T02:25:39Z`

## Fast Reviewer Reading

PrivateDAO turns private organizational finance into a guided operating system:

- govern first: create, commit, reveal, finalize, execute
- encrypt before exposure: browser encryption, REFHE receipts, Umbra claim lanes, MagicBlock private payment receipts
- route capital carefully: Jupiter quote preview, treasury policy, Token-2022 proof, wallet-first execution
- prove without leaking secrets: public Solscan links, read-node health, stream counters, selective disclosure, and generated proof packets

## Submission Links

These are the direct submission links that should be used when a reviewer needs to inspect the focused product lane without navigating the whole site:

- Jupiter treasury route: `https://privatedao.org/services/jupiter-treasury-route/`
- Umbra confidential payout: `https://privatedao.org/services/umbra-confidential-payout/`
- Eitherway wallet-first live dApp: `https://privatedao.org/services/eitherway-live-dapp/`
- Encrypt / Ika operations: `https://privatedao.org/services/encrypt-ika-operations/`

## Track Matrix

| Track | Product route | Live proof | Current state | Verification |
| --- | --- | --- | --- | --- |
| Encrypt / Ika | `/services/encrypt-ika-operations`, `/proof/encrypted-capital-markets` | `/api/v1/ika/solana-prealpha/readiness`, `/api/v1/refhe/payroll/proof`, `docs/cryptographic-onchain-matrix-2026-05-25.md` | REFHE settlement gate is active on Testnet; Ika SDK readiness and Solana pre-alpha approval route are live; final funded Ika dWallet DKG is not claimed. | `npm run verify:cryptographic-onchain-matrix`, `npm run verify:backend-provider-readiness` |
| MagicBlock | `/services/magicblock-private-payments` | `/api/v1/magicblock/onchain-proof`, `docs/magicblock/private-payments-live-probe.generated.md` | Private payment corridor has finalized Testnet receipts and protected challenge/login reads; private balances remain wallet-authorized. | `npm run verify:frontier-integrations`, `npm run verify:magicblock-runtime` |
| Umbra | `/services/umbra-confidential-payout`, `/services/umbra-private-payments` | `/api/v1/umbra/relayer/health`, `/viewer/umbra-devnet-sdk-live-probe.generated` | Relayer health, supported mints, SDK export checks, and claim-intent workbench are visible; full claim submission still requires SDK-generated proof account data and UTXO slot data. | `npm run probe:umbra-devnet-sdk`, `npm run verify:backend-provider-readiness` |
| Jupiter | `/services/jupiter-treasury-route` | `/api/jupiter/order`, `NEXT_PUBLIC_JUPITER_ORDER_ENDPOINT`, `docs/DX-REPORT-JUPITER.md`, `docs/jupiter-treasury-route.md` | Developer Platform `/order` mode is supported through the server route when the API key is configured; the public Lite Quote fallback remains available for static review. Signing and execution remain governed wallet actions. | `npm run verify:frontend-surface`, `npm run typecheck` |
| QuickNode | `/rpc-services`, `/api-status` | `/api/v1/readiness`, `/api/v1/quicknode/stream/stats` | Testnet RPC and Programs + Logs stream intake are connected to backend readiness, visitor telemetry, and chain-event counters without exposing secrets. | `npm run verify:quicknode-stream-intake`, `npm run verify:backend-provider-readiness` |
| Solflare | `/start`, `/govern`, `/services/eitherway-live-dapp` | `docs/runtime/browser-wallet.generated.md`, `docs/real-device-runtime.generated.md` | Wallet is the primary interface layer; Solflare is the recommended path with Phantom, Glow, Backpack, and Wallet Standard fallbacks. | `npm run verify:browser-wallet-runtime`, `npm run verify:real-device-runtime` |
| Eitherway | `/services/eitherway-live-dapp` | `https://preview.eitherway.ai/169057d4-cf4e-4a3e-88e5-2fe436eac112/`, Supabase receipt continuity | Wallet connect, profile signing, partner selection, and governed action continuation are packaged as one normal-user corridor. | `npm run verify:frontend-surface`, `npm run verify:review-links` |
| Birdeye / GoldRush / QVAC intelligence | `/intelligence`, `/services/goldrush-decision-intelligence`, `/services/solrouter-encrypted-ai` | `/api/v1/qvac/runtime-proof`, generated intelligence docs | Intelligence turns raw chain context into treasury, counterparty, policy, and proposal decisions before signing. | `npm run verify:backend-provider-readiness`, `npm run verify:frontend-surface` |
| DFlow / Kamino capital routes | `/services/eitherway-live-dapp`, `/treasury`, `/execute` | product routing, policy surface, and treasury route docs | These are framed as capital-coordination lanes inside wallet-first execution, not as completed external protocol execution claims. | `npm run verify:frontend-surface` |

## What Is Strongest Today

The strongest proof is not a single page. It is the chain of evidence:

1. The visitor can reach a clear route in the web app.
2. The route explains the operation in product language.
3. The backend returns live Testnet or provider readiness.
4. Sensitive payloads stay encrypted or wallet-authorized.
5. The public proof packet links to Solscan, generated docs, or verifier commands.

That structure fits the partner requirements because the integrations are not decorative. They sit inside the product flow:

- Encrypt and Ika protect confidential operations and custody routing.
- MagicBlock supplies the fast private-payment corridor.
- Umbra handles recipient-private payout posture and claim-link workflows.
- Jupiter improves treasury route quality before signing.
- QuickNode makes the proof and telemetry surfaces fast and current.
- Solflare/Eitherway keep the product usable by a normal wallet user.

## Operational Boundary

PrivateDAO should be marketed as a Solana Testnet production-candidate product during judging. The public product may say the current system is live, verifiable, wallet-first, and deeply integrated. It must not say mainnet real funds are already released, that Ika final 2PC-MPC signing is complete, or that Umbra full claim settlement is complete until those specific proof artifacts exist.

The current best reviewer path is:

1. `/judge`
2. `/proof/encrypted-capital-markets`
3. `/services/magicblock-private-payments`
4. `/services/encrypt-ika-operations`
5. `/services/umbra-confidential-payout`
6. `/api-status`
7. `/documents/cryptographic-onchain-matrix-2026-05-25`

## Commands

```bash
npm run verify:frontier-track-closure
npm run verify:frontend-surface
npm run verify:backend-provider-readiness
npm run verify:cryptographic-onchain-matrix
npm run verify:quicknode-stream-intake
```
