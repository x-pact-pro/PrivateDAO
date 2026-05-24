# Security Remediation 2026-05-22

This packet documents the security corrections made after review of the browser voting path, ZK claim boundary, API status, monitoring posture, and REFHE / FHE wording.

## 1. Commit / Reveal Salt Handling

Finding: the web governance session could persist `saltHex` inside `privatedao-governance-session` in `localStorage`.

Impact: if a page-level XSS, compromised extension, or malicious injected script could read browser storage during the commit window, it could recover the reveal preimage and infer the vote before reveal.

Fix:

- `apps/web/src/components/governance-session.tsx` now redacts governance state before writing to `localStorage`.
- `saltHex` is optional in `LiveVoteRuntime`, so persisted sessions can keep signatures and commitments without keeping the secret.
- `voteChoice` is redacted before reveal in persisted storage.
- `apps/web/src/components/governance-action-workbench.tsx` no longer renders the salt in the DOM.
- The web reveal path now uses an in-memory preimage only. Reloading the tab intentionally discards the salt rather than weakening the privacy boundary.

Tradeoff: the web flow is safer but less forgiving. If the tab is closed or reloaded before reveal, the user must recommit or use the CLI path that stores a local salt file outside browser storage.

## 2. ZK Claim Boundary

Finding: the homepage could be read as claiming full on-chain ZK verifier enforcement, while the ZK matrix correctly distinguishes live off-chain proofs from future on-chain verifier CPI.

Fix:

- `apps/web/src/components/home-shell.tsx` now describes ZK as off-chain proof review today across all localized hero copy.
- `docs/zk-capability-matrix.md` remains the canonical matrix: vote validity, delegation authorization, and tally integrity are live off-chain; on-chain verifier CPI is not implemented and remains a future protocol phase.
- `npm run verify:security-boundaries:2026-05-22` fails if the homepage returns to an unqualified `ZK privacy` claim.

## 3. API / Read-Node Status

Concern: public text references `api.privatedao.org` and `/api/v1`.

Live check on 2026-05-22:

| Endpoint | Result |
| --- | --- |
| `https://api.privatedao.org/healthz` | HTTP 200 |
| `https://api.privatedao.org/api/v1/health` | HTTP 200 |
| `https://api.privatedao.org/api/v1/config` | HTTP 200 |
| `https://api.privatedao.org/api/v1/metrics` | HTTP 200 |
| `https://api.privatedao.org/api/v1/visitors/stats` | HTTP 200 |
| `https://api.privatedao.org/api/v1/qvac/runtime-proof` | HTTP 200 |

Fix:

- `docs/reviewer-telemetry-packet.generated.md` and JSON were rebuilt from current evidence.
- The site should still distinguish `api.privatedao.org` from same-domain `/api/v1` on `privatedao.org`; static export API routes remain disabled by design.

## 4. Supabase Browser-Direct Boundary

Current boundary: browser-direct receipts are a continuity layer, not an authoritative server validation layer. The authoritative execution boundary remains the wallet signature and Solana Testnet transaction.

Fix direction now encoded in review surfaces:

- Product copy should not describe browser-direct Supabase writes as server-validated execution.
- Proof pages can show browser receipts beside signatures, but chain signatures remain the verification source.

## 5. Monitoring

Finding: alert rules exist, live Testnet backend probes now pass, but external alert routing transcripts are still the production-delivery closure item.

Fix:

- `docs/monitoring-alert-rules.json` keeps the explicit claim boundary: Testnet backend probes are live and verified; external alert routing and incident transcripts remain pending delivery setup.
- `docs/monitoring-delivery.generated.md` now separates closed Testnet probe requirements from partial transcript-bound alert-delivery requirements.
- `npm run verify:security-boundaries:2026-05-22` fails if monitoring is presented as fully production-delivered without external alert evidence.

This is intentionally strict. Live backend probes are evidence; defined alert rules are still not the same thing as completed external alert delivery.

## 6. REFHE / FHE Boundary

Current implementation: PrivateDAO has REFHE-style confidential settlement envelopes, encrypted payroll proof packets, client-side encryption, and proof-linked receipt surfaces.

Current non-claim: the repo does not claim a fully linked general-purpose FHE runtime library executing arbitrary encrypted treasury logic in production.

Fix:

- Public language should use REFHE / encrypted-operation posture unless a specific runtime proof is present.
- The security boundary verifier keeps ZK and monitoring claims from drifting beyond evidence; REFHE/FHE public copy should follow the same rule.

## Verification

Run:

```bash
npm run verify:security-boundaries:2026-05-22
npm run verify:reviewer-telemetry-packet
npm run verify:monitoring-delivery
npm --prefix apps/web run lint
```
