# Squads Testnet Upgrade Proposal 2026-05-23

Date: 2026-05-23

This packet records the live Squads proposal that upgrades the Testnet program to the build containing `transfer_dao_authority` and the anonymous governance primitive SDK evidence.

## Upgrade Buffer

- cluster: `testnet`
- program id: `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`
- program data: `FKyt5DcmRQcCF8kzMGjCvfGb3ZPHMQnH1SqiG9Mi8xEc`
- buffer: `HSX3ZK3BzueJnVy4EmrQ5xHUPq3LtXxxaVWuuZqew1Mz`
- buffer authority: `CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv`
- target binary sha256: `03f8ceb54a26ab6ea63bab0bcdfcf383058c912d38a3264a850e648cce9433ae`
- dumped buffer sha256: `03f8ceb54a26ab6ea63bab0bcdfcf383058c912d38a3264a850e648cce9433ae`

The buffer was uploaded on Testnet, dumped back from chain, and matched byte-for-byte against `target/deploy/private_dao.so` before the buffer authority was transferred to the Squads vault.

## Squads Proposal

- multisig: `thHmF7VYNtxE1MaDzYXbfPCiq13RF6JwuWnjvDZuSmF`
- vault authority: `CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv`
- threshold: `2-of-3`
- timelock: `172800` seconds
- transaction index: `1`
- vault transaction PDA: `FZ56P6riCUzRW6J4CrfjgxhPwGB3xgKtuUzgSiC2t9WR`
- proposal PDA: `5FQaNUH5U83SNKWPx57mUd5KzpFYzwk39WKUz9BmNp3s`
- proposal status at creation: `Active`
- proposal status after second signer approval: `Approved`
- approved signers recorded:
  - `2KpA69UB55tfWUSkKj5j7Tvebd3eG22hEs9hjXUq7pf5`
  - `4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD`
- timelock release target: `2026-05-25T00:31:05Z`

## Signatures

- vault transaction create: `5ReTxu2kBC2UvQvXg2xEzD73PGBn4fvi5mAHWnX9dxX2Hc1N9KazkErrc2oBukEUKqZWrG619qy7Kc4euUDqs291`
- proposal create: `DWBzzVqzUs4jgsqQrMzCDdM85RT77ewcG4Yz9yoD9XCdPjutNnNx1nAfkyVMRoG9cWZUWC7ZxeVT3jVgdL4w7vk`
- first approval: `2qZJR2X4tFCpgJRSfGF9vJHCUozkhB6fr4jVRUQpuisb29R8Qpq5ZvtSfdWiaWv4WFFKn8iFqEwHvC6xWVYTRqv5`
- second approval: `2wpJ27Mkb5CffngRx9U6upPjB8jbzWHoFrDLnxhB5NSCiiXCFGt5HVDYU8U7FtwYusynRCcWhy1T6av22VzCC7MY`

## Remaining Execution Gate

The proposal is intentionally not marked executed yet. Squads threshold is now satisfied at `2-of-3`. Execution was simulated after the second approval and rejected only by the Squads timelock:

- error code: `TimeLockNotReleased`
- custom error: `6021`
- release target: `2026-05-25T00:31:05Z`

After the timelock releases, execute the vault transaction, then verify:

```bash
npm run execute:squads-upgrade
solana program show EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva --url https://api.testnet.solana.com
```

Only after execution should the DAO authority handoff instruction be called on the live DAO and recorded as a `DaoAuthorityTransferred` signature.
