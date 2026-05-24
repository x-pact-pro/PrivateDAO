# Timelock Enforcement Proof 2026-05-23

## What Happened

PrivateDAO attempted to accelerate the approved Squads upgrade path by reducing the Testnet multisig timelock to `0`.

The config proposal received `2-of-3` multisig approval. When execution was simulated, the Squads program rejected the operation with:

- error code: `TimeLockNotReleased`
- custom error: `6021`

## Why This Is Security Evidence

This is not a product failure. It proves the current custody layer enforces time as a protocol rule.

Even valid multisig owners cannot bypass the timelock after reaching threshold approval. The delay is enforced by the Squads program before execution, including configuration changes that would weaken the delay itself.

## Testnet Evidence

- cluster: `testnet`
- Squads multisig: `thHmF7VYNtxE1MaDzYXbfPCiq13RF6JwuWnjvDZuSmF`
- Squads vault authority: `CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv`
- threshold: `2-of-3`
- upgrade transaction index: `1`
- upgrade proposal PDA: `5FQaNUH5U83SNKWPx57mUd5KzpFYzwk39WKUz9BmNp3s`
- upgrade transaction PDA: `FZ56P6riCUzRW6J4CrfjgxhPwGB3xgKtuUzgSiC2t9WR`
- upgrade approval 1: `2qZJR2X4tFCpgJRSfGF9vJHCUozkhB6fr4jVRUQpuisb29R8Qpq5ZvtSfdWiaWv4WFFKn8iFqEwHvC6xWVYTRqv5`
- upgrade approval 2: `2wpJ27Mkb5CffngRx9U6upPjB8jbzWHoFrDLnxhB5NSCiiXCFGt5HVDYU8U7FtwYusynRCcWhy1T6av22VzCC7MY`
- timelock reduction transaction index: `2`
- timelock reduction proposal create: `cV4RfuwZxWDn1hcof1jw87LePfqEF36V6C1vP37PrWLYkqRWJQsHsvCTHc2E6kUyHsWjTdQLzQEoEpwygnJQurF`
- timelock reduction approval by `4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD`: `4Y8a2c2egEnNs1XUJqxEKie8wTi8m85EzZyqf5VcCKMLrB1UBDvskKH1TDkwXcpCfrt7P1PtHeYaVQDJxwAJGtkG`
- timelock reduction approval by `2KpA69UB55tfWUSkKj5j7Tvebd3eG22hEs9hjXUq7pf5`: `2VH24vsTta1mDwmbN4cFmi2UdM9FNXtrzXjGzSdqSejm75ygek92BjLzYcwyGLmcfakMLyoGHuf3E9ppcd8FhdqY`
- execution rejection: `TimeLockNotReleased`
- custom error: `6021`
- timelock release target: `2026-05-25T00:31:05Z`

## Timeline

- Upgrade threshold reached: `2026-05-23`
- Timelock bypass attempt rejected: `2026-05-23`
- Execution unlock: `2026-05-25T00:31:05Z`
- Next step after unlock: execute upgrade, then transfer DAO authority and treasury authority to the Squads vault.

## Operational Reminder Gate

The release window is guarded by a local reminder command so the handoff is not left to memory:

```bash
npm run check:squads-timelock
```

Before `2026-05-25T00:31:05Z`, the command prints `waiting-for-timelock-release` and the remaining time. After the release timestamp, it prints `execution-window-open` and exits non-zero to force operator attention.

The prepared post-release command is:

```bash
EXECUTE_TIMELOCK=1 DAO_PDA=FEz2hCLGpDhJ3cdAm5CCWFzrKv8vDDzmmt9UjdF2fApZ scripts/execute-after-timelock.sh
```

## Ecosystem Lesson

A timelock is only meaningful when the same multisig that controls upgrades cannot disable or bypass it instantly. This Testnet evidence shows the PrivateDAO custody layer currently enforces that rule.

## Boundary

This proof covers the Squads Testnet custody layer and the pending upgrade proposal. DAO authority and treasury authority remain separate handoff steps until the timelock releases and the upgraded instruction path is executed.
