# Release Readiness Register

This register is intentionally disciplined. It separates repository-backed product maturity from final production release approval while keeping the next operating gates explicit and reviewable.

Current release posture:

- `blocked-external-steps`

Current claim boundary:

- PrivateDAO is Testnet-live, internally hardened, and reviewer-ready.
- The earlier Devnet phase remains preserved as rehearsal evidence, while current public operating language should point reviewers to the Testnet program, Testnet lifecycle proof, and Testnet wallet-first path.
- PrivateDAO is advancing toward production release through the operating gates below, each of which is tied to specific evidence.

Canonical machine-readable source:

- `docs/mainnet-blockers.json`

## Production Gates In Progress

| Gate | Category | Severity | Status | Required Before |
| --- | --- | --- | --- | --- |
| `external-audit-completion` | security | critical | pending-external | mainnet-real-funds |
| `upgrade-authority-multisig` | custody | critical | pending-external | mainnet-real-funds |
| `production-monitoring-alerts` | operations | high | pending-external | mainnet-real-funds |
| `real-device-wallet-runtime` | runtime | high | pending-runtime-captures | mainnet-real-funds |
| `magicblock-refhe-source-receipts` | privacy-settlement | high | testnet-receipts-closed-mainnet-verifier-required | mainnet-real-funds |
| `mainnet-cutover-ceremony` | release | high | pending-external | mainnet-real-funds |

## Completion Standard

Each production gate can only move to `complete` when the evidence is recorded in repository-linked artifacts or a named external audit or operations packet.

Minimum completion evidence:

- `external-audit-completion`: external audit report, finding disposition, and deployed candidate version binding.
- `upgrade-authority-multisig`: multisig or governance-owned authority path, signer policy, and rotation rehearsal record.
- `production-monitoring-alerts`: alert destinations, runtime monitors, incident owners, and tested failure signals.
- `real-device-wallet-runtime`: wallet/device/browser captures for the supported production matrix.
- `magicblock-refhe-source-receipts`: Testnet REFHE and MagicBlock receipt closure is recorded; real-funds mainnet still requires verifier CPI or externally audited residual-trust acceptance.
- `mainnet-cutover-ceremony`: final deployment hash, authority state, monitoring links, audit result, and go/no-go record.

## Evidence Index

- `external-audit-completion`: `docs/audit-handoff.md`, `docs/external-audit-engagement.md`, `docs/zk-external-audit-scope.md`, `docs/mainnet-readiness.generated.md`, `docs/launch-trust-packet.generated.md`
- `upgrade-authority-multisig`: `docs/authority-hardening.md`, `docs/authority-transfer-runbook.md`, `docs/production-custody-ceremony.md`, `docs/multisig-setup-intake.json`, `docs/multisig-setup-intake.md`, `docs/launch-ops-checklist.json`, `docs/launch-ops-checklist.md`, `docs/mainnet-cutover-runbook.md`, `docs/launch-trust-packet.generated.md`
- `production-monitoring-alerts`: `docs/launch-ops-checklist.json`, `docs/launch-ops-checklist.md`, `docs/monitoring-alert-rules.json`, `docs/monitoring-alert-rules.md`, `docs/monitoring-alerts.md`, `docs/production-operations.md`, `docs/incident-response.md`
- `real-device-wallet-runtime`: `docs/runtime/real-device.md`, `docs/runtime/real-device.generated.md`, `docs/wallet-e2e-test-plan.md`, `docs/launch-ops-checklist.json`, `docs/launch-ops-checklist.md`, `docs/launch-trust-packet.generated.md`
- `magicblock-refhe-source-receipts`: `docs/magicblock/runtime-evidence.md`, `docs/refhe-security-model.md`, `docs/canonical-verifier-boundary-decision.md`, `docs/testnet-encrypted-integrations-activation-2026-05-23.md`, `docs/frontier-integrations.generated.md`
- `mainnet-cutover-ceremony`: `docs/release-ceremony.md`, `docs/release-drill.generated.md`, `docs/launch-ops-checklist.json`, `docs/launch-ops-checklist.md`, `docs/mainnet-cutover-runbook.md`

## Verification

Run:

```bash
npm run verify:mainnet-blockers
```

The verifier does not fail because production gates are still in progress. It fails if the gate set is missing, vague, inconsistent with the honest production boundary, or missing evidence pointers.
