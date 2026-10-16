# Dependency Security Audit — 2026-09-10 (historical snapshot)

> Historical note: this audit predates the 2026-10-15 Poseidon dependency
> migration. The legacy `circomlibjs -> ethers 5.x -> elliptic` path described
> below has since been removed and is covered by the current audit and vector
> tests in `docs/security-dependency-audit-20261015.md`.

## Scope

- Repository: `X-PACT/PrivateDAO`
- Source branch: `main`
- Audit command: `npm audit --json`
- Production gate: `~/.codex/ops/bin/codex-security-gate.sh <repo>`
- Mainnet execution: disabled

## Observed Results

The full installed dependency graph reported:

- 0 critical
- 15 high
- 5 moderate
- 19 low
- 39 total findings

The production security gate reported 27 findings in its production scope:

- 6 high
- 4 moderate
- 17 low

These are dependency findings, not evidence of an exploit against a live
PrivateDAO endpoint. They remain release risks until each affected execution
surface is upgraded or isolated and retested.

## High-Risk Dependency Families

| Family | Path | Decision |
| --- | --- | --- |
| `toml` | `@coral-xyz/anchor` | Deferred; audit reports no compatible fix. Requires a controlled Anchor migration. |
| `bigint-buffer` | `@solana/spl-token` and `@sqds/multisig` | Deferred; the available forced fix changes the Solana dependency line. |
| `elliptic` | legacy `ethers` 5.x through `circomlibjs` and MagicBlock transitive packages | Historical finding. The root ZK path was migrated and vector-tested on 2026-10-15; the separate MagicBlock/TEE path remains upstream-owned. |
| `fast-uri`, `ajv`, `js-yaml`, `brace-expansion` | mixed tooling and validation paths | Candidate for a dedicated lockfile migration with full CI and runtime regression tests. |

## Change Decision

`npm audit fix --package-lock-only --ignore-scripts` was tested without
`--force`. It changed both lockfiles but increased the remaining high-risk
count through a new Solana transitive layout. Those lockfile-only changes were
reverted. No `npm audit fix --force` was run, and no dependency upgrade was
claimed as complete.

## Release Boundary

- Mainnet release remains blocked by the existing security and human-approval
  gates.
- Solana, MagicBlock, ZK, and EVM runtime tests remain the regression baseline
  for any dependency migration.
- This audit does not certify the repository as vulnerability-free.
- A future dependency migration must be isolated, reviewed, and rerun through
  the full runtime, browser, proof, and network E2E suites before merge.
