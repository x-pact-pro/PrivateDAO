# Treasury Reviewer Packet

Generated: 2026-05-26T03:09:19.120Z

Explain the treasury intake and payout posture as a reviewer-grade infrastructure surface, with strict sender discipline, public rails, proof links, commercial fit, and exact blocker visibility.

## Current Treasury Truth

- treasury network: Solana Testnet
- treasury address: AZUroiNeGAjNdD84eEHnAKHHFwqAFmkjr2g1eoF7Ek5c
- custody status: ready-for-transfer
- production mainnet claim allowed: false
- trust decision: blocked-external-steps
- threshold: 2-of-3
- multisig address: thHmF7VYNtxE1MaDzYXbfPCiq13RF6JwuWnjvDZuSmF

PrivateDAO is Testnet-live and internally hardened; real-funds mainnet production remains gated on external audit, custody completion, monitoring, runtime wallet captures, verifier-CPI or audited residual-trust acceptance for privacy settlement, and the final release ceremony.

## Strict Sender Checklist

- Confirm whether the request is treasury top-up, pilot funding, vendor payout, or contributor payout before selecting a rail.
- Copy the exact public receive address and explorer link for the chosen asset rail instead of reusing a previous address.
- Attach a reference string that includes payer, purpose, amount, and settlement context so the packet can be matched later.
- Open reviewer truth surfaces before implying production-safe settlement or custody posture to a buyer, sender, or judge.
- Treat the current rails as public Testnet treasury intake until authority-transfer evidence closes the production custody blocker.

## Reference-Linked Rails

### SOL
- name: Native SOL
- receive address: AZUroiNeGAjNdD84eEHnAKHHFwqAFmkjr2g1eoF7Ek5c
- explorer: https://solscan.io/account/AZUroiNeGAjNdD84eEHnAKHHFwqAFmkjr2g1eoF7Ek5c?cluster=testnet
- mint: configured publicly at deployment
- decimals: 9
- note: Use this rail for treasury top-ups, operator funding, and governed SOL transfers on Testnet.

### USDC
- name: USDC
- receive address: AZUroiNeGAjNdD84eEHnAKHHFwqAFmkjr2g1eoF7Ek5c
- explorer: https://solscan.io/account/AZUroiNeGAjNdD84eEHnAKHHFwqAFmkjr2g1eoF7Ek5c?cluster=testnet
- mint: configured publicly at deployment
- decimals: 6
- note: Use this rail for governed payouts, vendor settlement, and stable-value treasury requests when USDC is the active stable asset.

### USDG
- name: USDG
- receive address: AZUroiNeGAjNdD84eEHnAKHHFwqAFmkjr2g1eoF7Ek5c
- explorer: https://solscan.io/account/AZUroiNeGAjNdD84eEHnAKHHFwqAFmkjr2g1eoF7Ek5c?cluster=testnet
- mint: configured publicly at deployment
- decimals: 6
- note: Use this rail for alternative stable settlement when the team or customer operates with USDG-compatible treasury flows.

## Reviewer Truth Links

- docs/canonical-custody-proof.generated.md
- docs/custody-proof-reviewer-packet.generated.md
- docs/launch-trust-packet.generated.md
- docs/reviewer-telemetry-packet.generated.md
- docs/mainnet-blockers.md
- docs/ecosystem-focus-alignment.generated.md

## Commercial + Payments Focus Alignment

## DAO tooling
- fit: strong
- what works now: The core live product already covers DAO creation, proposal lifecycle, private voting, treasury motion handling, trust packets, telemetry, and reviewer-safe surfaces.
- exact gap: The highest-value next step is to keep treasury professionalism and custody continuity extremely tight as the product advances toward mainnet operations.
- best routes: /command-center, /dashboard, /services

## Developer tooling
- fit: strong
- what works now: PrivateDAO already provides reviewer telemetry, generated packets, hosted-read proof, runtime diagnostics, and a developer route tied to real product infrastructure.
- exact gap: The best uplift is continued strengthening of exported telemetry, runtime evidence summaries, and infrastructure-facing docs for external engineers.
- best routes: /developers, /analytics, /documents/reviewer-telemetry-packet

## Payments
- fit: strong
- what works now: Treasury request routing, confidential payout framing, payments-oriented intake flows, and reviewer-safe custody truth are already visible in the live product.
- exact gap: The strongest version still requires strict sender discipline, explorer-linked rails, and completed authority-transfer evidence for real-funds credibility.
- best routes: /services, /security, /custody

## Exact Mainnet Blocker

- id: upgrade-authority-multisig
- severity: critical
- status: pending-external
- next action: Move production upgrade authority and operational authorities to a documented multisig or governance-owned path and rehearse rotation.

### Blocker Evidence

- docs/authority-hardening.md
- docs/authority-transfer-runbook.md
- docs/production-custody-ceremony.md
- docs/multisig-setup-intake.json
- docs/multisig-setup-intake.md
- docs/launch-ops-checklist.json
- docs/launch-ops-checklist.md
- docs/mainnet-cutover-runbook.md
- docs/launch-trust-packet.generated.md

## Exact Pending Items

- rehearsal signature
- dao authority destination authority
- dao authority transfer signature
- dao authority post-transfer readout
- dao authority post-transfer readout reference
- treasury operator authority destination authority
- treasury operator authority transfer signature
- treasury operator authority post-transfer readout
- treasury operator authority post-transfer readout reference

## Live Routes

- https://privatedao.org/services/
- https://privatedao.org/custody/
- https://privatedao.org/documents/treasury-reviewer-packet/
- https://privatedao.org/documents/canonical-custody-proof/

## Canonical Commands

- `npm run build:treasury-reviewer-packet`
- `npm run verify:treasury-reviewer-packet`
- `npm run apply:custody-evidence-intake`
