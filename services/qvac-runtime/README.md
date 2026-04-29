# QVAC Runtime Proof

This folder isolates the Tether QVAC SDK from the static Next.js web build so the product can prove local-first AI capability without forcing every web deployment to download native model/runtime peers.

QVAC's quickstart requires Node.js `>=22.17` and npm `>=10.9`. PrivateDAO's current web workspace is on Node 20, so the SDK is activated here as a dedicated runtime lane and surfaced in the product as the sovereign AI proof path.

## Install

```bash
pnpm install --ignore-scripts
```

## Probe

```bash
npm run probe
```

The probe imports `@qvac/sdk`, records exported SDK capabilities, and writes:

```text
services/qvac-runtime/qvac-runtime-proof.generated.json
```

No wallet keys, user prompts, invoices, payroll CSVs, or governance intent are sent to a cloud model endpoint.

## Current Runtime Note

The local proof on 2026-04-29 was generated after resolving the QVAC SDK and required Bare runtime peers with `pnpm` because `npm` hit an `Invalid Version` resolver failure inside a native QVAC peer tree. The committed proof file records whether the SDK import succeeded.
