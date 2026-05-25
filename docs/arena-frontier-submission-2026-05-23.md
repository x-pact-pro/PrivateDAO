# Arena Frontier Submission 2026-05-23

## Current Status

This submission packet is preserved as a historical May 23 reviewer snapshot. The current Testnet custody release path has advanced to Squads proposal index `3`.

Current proposal index `3` is documented at:

`docs/squads-current-binary-upgrade-proposal-2026-05-25.md`

It uses proposal PDA `HAQdiBhjHdYG35MNqn9JzMhg5itFFSj8oTnVPGhM2VYM`, buffer `HXcaUbT7Q8euufUbDKuhoRkSSYQPwUwmhw69TdePV6uY`, and timelock release `2026-05-27T02:25:39Z`.

PrivateDAO is a founder-built Solana Testnet product for private governance, treasury policy, confidential payroll, encrypted payments, GamingDAO rewards, local-first decision intelligence, wallet-first execution, and reviewer-visible proof.

## What Is Built

- Governance protocol: Anchor 1.0.1 Testnet program `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`.
- ZK verifier: standalone Testnet Anchor verifier `5H7Afyqdh5yPekkZJ5UM2j3HNB2bRvU8aVv8XoqeAW1j`.
- Custody: Squads Protocol v4 vault authority `CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv` with `2-of-3` threshold and a 48-hour timelock.
- Governance mint: PDAO Token-2022 mint `DFYvBdivHCe4bSErgCiKm2RhwGEcZYbBPFQzLNr37Bie` with fixed `1,000,000 PDAO` supply and disabled mint authority.
- Web and Android: wallet-first Testnet execution surfaces with proof, security, learning, business model, and judge routes connected.

## Six Reviewer Transactions

1. Canonical program upgrade authority transfer to Squads vault:
   `EzwLLrAchBpj3eLTUFuv1uo9rSLKgKNbQgp1DkCevJycT31Eou9TSJsJsEfMjLt4q87pKwXaZUTqCZ1NduNc1vy`
   `https://explorer.solana.com/tx/EzwLLrAchBpj3eLTUFuv1uo9rSLKgKNbQgp1DkCevJycT31Eou9TSJsJsEfMjLt4q87pKwXaZUTqCZ1NduNc1vy?cluster=testnet`

2. ZK standalone verifier receipt:
   `zwqNsA3kNP1mgcaS6zNdR92LLdssFULXfsRdkMK3UxraKLM6wYDoPaWCwV3J9PqApK5xJJH8TpxsGyCRcdEah67`
   `https://solscan.io/tx/zwqNsA3kNP1mgcaS6zNdR92LLdssFULXfsRdkMK3UxraKLM6wYDoPaWCwV3J9PqApK5xJJH8TpxsGyCRcdEah67?cluster=testnet`

3. ZK verifier upgrade authority transfer to Squads vault:
   `3g24JACSz3AyAmeV6qU3kaZsMowfTq3KbJMDZ7ATZ3NbAzDK1USjBkzzPEwPA7tqQTMSXxLbT7gsVrF5yvLTFrhg`
   `https://solscan.io/tx/3g24JACSz3AyAmeV6qU3kaZsMowfTq3KbJMDZ7ATZ3NbAzDK1USjBkzzPEwPA7tqQTMSXxLbT7gsVrF5yvLTFrhg?cluster=testnet`

4. Squads timelock reduction approval by signer 1:
   `4Y8a2c2egEnNs1XUJqxEKie8wTi8m85EzZyqf5VcCKMLrB1UBDvskKH1TDkwXcpCfrt7P1PtHeYaVQDJxwAJGtkG`
   `https://explorer.solana.com/tx/4Y8a2c2egEnNs1XUJqxEKie8wTi8m85EzZyqf5VcCKMLrB1UBDvskKH1TDkwXcpCfrt7P1PtHeYaVQDJxwAJGtkG?cluster=testnet`

5. Squads timelock reduction approval by signer 2:
   `2VH24vsTta1mDwmbN4cFmi2UdM9FNXtrzXjGzSdqSejm75ygek92BjLzYcwyGLmcfakMLyoGHuf3E9ppcd8FhdqY`
   `https://explorer.solana.com/tx/2VH24vsTta1mDwmbN4cFmi2UdM9FNXtrzXjGzSdqSejm75ygek92BjLzYcwyGLmcfakMLyoGHuf3E9ppcd8FhdqY?cluster=testnet`

6. PDAO Token-2022 mint authority disabled:
   `2qFb2dKVEmD2hzmN9d6bajHuxLrk5aqKBvqM1Xb71VNTCfY39XgVV49koPigjoa2Vn41PNMmhp7qxK5KMBxNYvj4`
   `https://solscan.io/tx/2qFb2dKVEmD2hzmN9d6bajHuxLrk5aqKBvqM1Xb71VNTCfY39XgVV49koPigjoa2Vn41PNMmhp7qxK5KMBxNYvj4?cluster=testnet`

## Security Story

PrivateDAO found a browser-side privacy issue in the commit/reveal salt handling, removed persisted vote preimages from local storage, documented the remediation, and added a verification gate. The project then went further: it proved that the Squads timelock is not decorative. Even after `2-of-3` approval, the program rejected a timelock bypass attempt with `6021 - TimeLockNotReleased`.

This is the security posture judges can inspect directly: evidence is public, constraints are explicit, and risky shortcuts are blocked by the custody layer.

## Current Boundary

The current live target is Solana Testnet with Anchor 1.0.1. Historical Devnet evidence remains preserved as archive and rehearsal material, but the reviewer-facing current program is:

`EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`

DAO authority and treasury authority transfers remain scheduled after the Squads timelock unlocks at:

`2026-05-27T02:25:39Z`

## Direct Review Links

- Judge route: `https://privatedao.org/judge/`
- Security route: `https://privatedao.org/security/`
- Start route: `https://privatedao.org/start/`
- Proof route: `https://privatedao.org/proof/`
- Android route: `https://privatedao.org/android/`
- GitHub repository: `https://github.com/X-PACT/PrivateDAO`
