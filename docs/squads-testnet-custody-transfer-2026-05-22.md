# Squads Testnet Custody Transfer 2026-05-22

This packet records the real Testnet custody hardening executed for the current Anchor 1.0.1 PrivateDAO program.

## Result

- status: `program-upgrade-authority-transferred`
- cluster: `testnet`
- program id: `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`
- program data: `FKyt5DcmRQcCF8kzMGjCvfGb3ZPHMQnH1SqiG9Mi8xEc`
- previous upgrade authority: `4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD`
- new upgrade authority: `CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv`

## Squads Multisig

- implementation: `Squads Protocol v4`
- multisig PDA: `thHmF7VYNtxE1MaDzYXbfPCiq13RF6JwuWnjvDZuSmF`
- vault authority PDA: `CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv`
- threshold: `2-of-3`
- timelock: `48 hours`
- creation signature: `67S63JAUNvvCED3hE9h6bCXW9iJ3EYzJLARvj8Lki5x2dJEgLnrfES9mp6bAxfsH6vfmor2ocqNaEd68uVN68DNJ`
- explorer: `https://explorer.solana.com/tx/67S63JAUNvvCED3hE9h6bCXW9iJ3EYzJLARvj8Lki5x2dJEgLnrfES9mp6bAxfsH6vfmor2ocqNaEd68uVN68DNJ?cluster=testnet`

Signer roster:

- founder/operator: `4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD`
- independent/security signer: `BBBPcpUnnBi3CWUhcv6vLTqaY9pugAGuhgw2Axjpvcr2`
- recovery/governance signer: `2KpA69UB55tfWUSkKj5j7Tvebd3eG22hEs9hjXUq7pf5`

## Upgrade Authority Transfer

Command:

```bash
solana program set-upgrade-authority EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva \
  --new-upgrade-authority CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv \
  --keypair /home/x-pact/.config/solana/id.json \
  --url https://api.testnet.solana.com \
  --skip-new-upgrade-authority-signer-check
```

Transfer signature:

- `EzwLLrAchBpj3eLTUFuv1uo9rSLKgKNbQgp1DkCevJycT31Eou9TSJsJsEfMjLt4q87pKwXaZUTqCZ1NduNc1vy`
- explorer: `https://explorer.solana.com/tx/EzwLLrAchBpj3eLTUFuv1uo9rSLKgKNbQgp1DkCevJycT31Eou9TSJsJsEfMjLt4q87pKwXaZUTqCZ1NduNc1vy?cluster=testnet`

Confirmed readout:

```text
Program Id: EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva
Owner: BPFLoaderUpgradeab1e11111111111111111111111
ProgramData Address: FKyt5DcmRQcCF8kzMGjCvfGb3ZPHMQnH1SqiG9Mi8xEc
Authority: CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv
Last Deployed In Slot: 405189011
```

## Claim Boundary

This closes the Testnet program-upgrade single-key authority gap. It does not claim mainnet real-funds readiness, external audit completion, DAO authority migration, or treasury-operator authority migration.
