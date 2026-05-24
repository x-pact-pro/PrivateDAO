# Operation Ledger

- project: `PrivateDAO`
- generated at: `2026-05-24T19:37:12.554Z`
- purpose: Machine-readable operation ledger for custody, ZK, and REFHE/FHE evidence surfaced on the reviewer site.

## Entries

### Testnet program upgrade authority transferred to Squads 2-of-3 vault

- id: `squads-testnet-upgrade-authority`
- lane: `custody`
- status: `verified`
- evidence:
  - `docs/squads-testnet-custody-transfer-2026-05-22.md`
  - `docs/custody-observed-readouts.json`
- verification:
  - `solana program show EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva --url https://api.testnet.solana.com`
  - `npm run verify:canonical-custody-proof`

### DAO operating authority handoff upgrade has reached Squads 2-of-3 approval and is waiting for timelock release

- id: `dao-authority-handoff`
- lane: `custody`
- status: `pending-timelock`
- evidence:
  - `docs/dao-treasury-authority-handoff-2026-05-23.md`
  - `docs/squads-testnet-upgrade-proposal-2026-05-23.md`
  - `programs/private-dao/src/dao.rs`
  - `tests/private-dao.ts`
- verification:
  - `anchor build`
  - `solana program dump HSX3ZK3BzueJnVy4EmrQ5xHUPq3LtXxxaVWuuZqew1Mz /tmp/privatedao-buffer-final.so --url https://api.testnet.solana.com`
  - `Squads proposal approval signature: 2wpJ27Mkb5CffngRx9U6upPjB8jbzWHoFrDLnxhB5NSCiiXCFGt5HVDYU8U7FtwYusynRCcWhy1T6av22VzCC7MY`
  - `Timelock reduction attempt approved 2-of-3 but execution is also gated by TimeLockNotReleased: 2VH24vsTta1mDwmbN4cFmi2UdM9FNXtrzXjGzSdqSejm75ygek92BjLzYcwyGLmcfakMLyoGHuf3E9ppcd8FhdqY`
  - `Timelock release target: 2026-05-25T00:31:05Z`
  - `node --import tsx ./node_modules/mocha/bin/mocha --timeout 20000 --exit test/unit/anonymous-governance-primitive.unit.ts`

### Solana anonymous governance primitive packaged with frozen roots, nullifiers, and tally modes

- id: `anonymous-governance-primitive`
- lane: `zk`
- status: `verified`
- evidence:
  - `docs/solana-anonymous-governance-primitive.md`
  - `sdk/src/index.ts`
  - `test/unit/anonymous-governance-primitive.unit.ts`
- verification:
  - `node --import tsx ./node_modules/mocha/bin/mocha --timeout 20000 --exit test/unit/anonymous-governance-primitive.unit.ts`
  - `npm run zk:verify:sample`

### Standalone ZK verifier program is deployed on Testnet and emits a BN254 pairing receipt

- id: `zk-standalone-verifier-testnet`
- lane: `zk`
- status: `verified`
- evidence:
  - `programs/zk-groth16-verifier/src/lib.rs`
  - `docs/zk-standalone-verifier-testnet-2026-05-23.md`
  - `docs/zk-standalone-verifier-testnet-2026-05-23.json`
- verification:
  - `solana program show 5H7Afyqdh5yPekkZJ5UM2j3HNB2bRvU8aVv8XoqeAW1j --url https://api.testnet.solana.com`
  - `solana confirm --url https://api.testnet.solana.com 3g24JACSz3AyAmeV6qU3kaZsMowfTq3KbJMDZ7ATZ3NbAzDK1USjBkzzPEwPA7tqQTMSXxLbT7gsVrF5yvLTFrhg`
  - `solana confirm --url https://api.testnet.solana.com zwqNsA3kNP1mgcaS6zNdR92LLdssFULXfsRdkMK3UxraKLM6wYDoPaWCwV3J9PqApK5xJJH8TpxsGyCRcdEah67`
  - `npm run verify:zk-standalone-verifier`

### PDAO Token-2022 governance mint is live on Solana Testnet with disabled mint authority

- id: `pdao-token-2022-testnet`
- lane: `runtime`
- status: `verified`
- evidence:
  - `docs/pdao-token.md`
  - `docs/pdao-attestation.generated.json`
  - `docs/assets/pdao-token.json`
  - `docs/proof-registry.json`
- verification:
  - `spl-token display --program-2022 DFYvBdivHCe4bSErgCiKm2RhwGEcZYbBPFQzLNr37Bie --url https://api.testnet.solana.com --output json-compact`
  - `npm run verify:pdao-surface`
  - `npm run verify:pdao-attestation`
  - `npm run verify:pdao-live`

### ZK-enforced runtime captures remain machine-tracked until wallet evidence closes them

- id: `zk-enforced-runtime`
- lane: `zk`
- status: `pending-runtime-capture`
- evidence:
  - `docs/zk/enforced-runtime.generated.json`
  - `docs/zk/enforced-runtime-captures.json`
  - `docs/zk/enforced-operator-flow.md`
- verification:
  - `npm run build:zk-enforced-runtime`
  - `npm run verify:zk-enforced-runtime`

### REFHE/FHE confidential operations are documented with explicit runtime and audit boundaries

- id: `refhe-fhe-confidential-ops`
- lane: `refhe-fhe`
- status: `pending-runtime-capture`
- evidence:
  - `docs/refhe-protocol.md`
  - `docs/refhe-security-model.md`
  - `docs/refhe-operator-flow.md`
  - `docs/encrypt-ika-2pcmpc-refhe-desktop-report-2026-05-21.md`
- verification:
  - `npm run configure:refhe`
  - `npm run settle:refhe`
  - `npm run inspect:refhe`

## Boundary

This ledger records what is verified, what is code-ready, and what still needs runtime signatures or wallet captures. It must not be used to claim a DAO authority transfer, treasury authority handoff, ZK-enforced runtime close, or REFHE/FHE production close until the corresponding signature or capture exists in the evidence files above.
