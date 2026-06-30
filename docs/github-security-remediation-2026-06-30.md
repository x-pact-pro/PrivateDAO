# GitHub Security Remediation - 2026-06-30

This note records the safe dependency-security pass applied after syncing the live PrivateDAO AWS/static/API release back into the public GitHub repository.

## Root Workspace

Initial root `npm audit` state:

- total vulnerabilities: 29
- high: 10
- moderate: 3
- low: 16
- critical: 0

Safe root remediation applied:

- `npm audit fix --package-lock-only --ignore-scripts`
- package overrides for safe transitive updates:
  - `esbuild` -> `^0.28.1`
  - `serialize-javascript` -> `^7.0.6`
  - `underscore` -> `^1.13.8`
- `npm install --package-lock-only --ignore-scripts`

Root result:

- total vulnerabilities: 19
- high: 4
- moderate: 0
- low: 15
- critical: 0

## Web App Workspace

Initial `apps/web` `npm audit` state:

- total vulnerabilities: 52
- critical: 2
- high: 13
- moderate: 24
- low: 13

Safe web remediation applied:

- `npm audit fix --package-lock-only --ignore-scripts`
- upgraded `next` and `eslint-config-next` from `16.2.3` to `16.2.9`
- removed `@xenova/transformers` from the committed web dependency graph because the live QVAC surface already has a deterministic local fallback and the package pulled a critical `protobufjs` path through `onnxruntime-web`
- changed QVAC browser model loading to optional runtime import with deterministic fallback
- package overrides for safe transitive updates:
  - `underscore` -> `^1.13.8`
  - `uuid` -> `^11.1.1`
  - `ws` -> `^8.21.0`

Web result:

- total vulnerabilities: 22
- critical: 0
- high: 5
- moderate: 2
- low: 15

## Combined Effect

The immediate critical alerts in `apps/web` were removed without running a forced breaking audit downgrade.

Known remaining paths are concentrated around Solana/Squads/Bonfida/Cloak and ethers/circom chains. The earlier critical `protobufjs` path from `@xenova/transformers` was removed from the committed dependency graph:

- `bigint-buffer` via Solana token/web3 dependency paths
- `@bonfida/spl-name-service` and `@cloak.dev/sdk-devnet` dependency chains
- ethers v5 / elliptic paths inherited through proof and integration tooling
- Next/PostCSS audit metadata still reports a moderate path despite the `16.2.9` upgrade; this should be rechecked after GitHub Dependabot refreshes its graph

## Why Force Was Not Used

`npm audit fix --force` proposed breaking or unsafe changes, including Solana/Squads/Bonfida package downgrades and major dependency shifts. Because this repository contains wallet, token, custody, governance, ZK, and settlement code, forced downgrades can create a larger operational risk than the advisory itself.

## Next Security Step

Create a dedicated dependency-compatibility branch that tests:

- current non-breaking `@solana/spl-token`, `@solana/web3.js`, and wallet-adapter upgrade paths
- whether Bonfida/Cloak/Solana upstreams publish a non-breaking `bigint-buffer` remediation
- whether ZK/circom tooling can move away from the ethers v5 dependency path
- full `npm run typecheck`
- `npm --prefix apps/web run build:root`
- focused Solana client tests and ZK proof scripts

No secrets, private keys, Supabase service-role keys, AWS credentials, QuickNode credentials, TxLINE tokens, or wallet keypairs were committed as part of this remediation.
