# Devnet Load Test Report

## Overview

- profile: 50-wallet
- number of wallets: 50
- network: devnet
- program id: `5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx`
- governance mint: ``
- total tx count: 185
- average latency ms: 1522.91
- zk participation summary: 5 zk tester wallets, 7 zk proof artifacts

## Summary Snapshot

- total wallets: 50
- successful commits: 40
- successful reveals: 35
- rejected invalid reveals: 17
- finalize success: 1
- execute success: 1
- confidential payout success: 0
- replay rejections: 6
- authority mismatch rejections: 9
- total tx count: 185
- average latency ms: 1522.91

## DAO Bootstrap Results

- DAO: `Ae87EESnJwA6q9okUmemJXSAthynQjvKnxaNKyD4o7qz`
- Treasury: `GsMD4rTaqsJY9ngn5tw93NRet3U355RGbpVun8Fxnms1`
- Proposal: `7TKCbcUsrAaQhu3XuCLmXUPo2KCbjDtFF8sxtY6QmuVx`
- create-dao tx: `32ka4VehdihxUExu7XE2nq3VRNnyygXWDXRz65QwAja8nvtneMSVPeGYZBWesXYUwv2WJngVG4Esd8cZXuVgYsvt`
- deposit tx: `44h9e5thpBfcH8Tx2Z5EEt8prNWbPbfGqE9FRAmoZuUU8nn5gtymvCrmHYEqYqHN4h1sP9K5hBCtESBEP2pNNwYo`
- create-proposal tx: `sHcNjRUXfbsocDPoeAqdhhfLgQKZ5BrwaTYiCkqHUnBdvUMnAmagLGi5Czr44hyZ17qLyT2GNupRgbGtCDvuHVy`

## Commit Wave Results

- total commit-capable wallets: 40
- successful commits: 40
- adversarial commit rejections: 10
- wave size: 10

## Reveal Results

- successful reveals: 35
- late reveal attempts: 5
- replay and invalid reveal rejections: 17

## Finalize Results

- finalize success tx count: 1
- duplicate finalize rejections: 1

## Execute Results

- execute success tx count: 1
- pre-unlock execute rejections: 1
- treasury miswiring rejections: 1
- duplicate execute rejections: 1

## ZK Verification Results

- verification mode: off-chain Groth16 companion layer
- on-chain verifier integration: not present in the current protocol
- zk proof entries: 7
- vote proof entries: 5
- tally proof entries: 1
- delegation proof entries: 1

## Adversarial Results

- total adversarial scenarios: 33
- rejected as expected: 32
- unexpected successes: 0

## Performance Metrics

- total execution time ms: 36058082
- average tx latency ms: 1522.91
- failure rate: 15.09%
- retry rate: 0.00%

## Explorer Links

- https://solscan.io/account/7TKCbcUsrAaQhu3XuCLmXUPo2KCbjDtFF8sxtY6QmuVx?cluster=devnet
- https://explorer.solana.com/tx/32ka4VehdihxUExu7XE2nq3VRNnyygXWDXRz65QwAja8nvtneMSVPeGYZBWesXYUwv2WJngVG4Esd8cZXuVgYsvt?cluster=devnet
- https://explorer.solana.com/tx/44h9e5thpBfcH8Tx2Z5EEt8prNWbPbfGqE9FRAmoZuUU8nn5gtymvCrmHYEqYqHN4h1sP9K5hBCtESBEP2pNNwYo?cluster=devnet
- https://explorer.solana.com/tx/sHcNjRUXfbsocDPoeAqdhhfLgQKZ5BrwaTYiCkqHUnBdvUMnAmagLGi5Czr44hyZ17qLyT2GNupRgbGtCDvuHVy?cluster=devnet
- https://explorer.solana.com/tx/4WtxRzDkJwarLaHpfMMv6s6u5dzjWvhHvrrswxYNvBUYZN9919dRJdUPwyiachENVA4Ax6FxuxBWKMNaa6cPPXs6?cluster=devnet
- https://explorer.solana.com/tx/QSbEzAybL2HncncavofE2dKZaA2gBUKB99aMLaP9jWAsmBeYk9isBz2kywaqdE7QCtQP4EMC2RwhkbXnVGoQoKk?cluster=devnet

## Failure Causes

- 5 × AnchorError thrown in programs/private-dao/src/lib.rs:1258. Error Code: RevealClosed. Error Number: 6011. Error Message:
- 4 × AnchorError thrown in programs/private-dao/src/lib.rs:1265. Error Code: NotAuthorizedToReveal. Error Number: 6018. Error
- 4 × AnchorError thrown in programs/private-dao/src/lib.rs:1268. Error Code: CommitmentMismatch. Error Number: 6015. Error Me
- 4 × AnchorError thrown in programs/private-dao/src/lib.rs:1260. Error Code: AlreadyRevealed. Error Number: 6014. Error Messa
- 3 × AnchorError caused by account: voter_record. Error Code: ConstraintSeeds. Error Number: 2006. Error Message: A seeds con
- 3 × AnchorError caused by account: delegation_marker. Error Code: ConstraintSeeds. Error Number: 2006. Error Message: A seed
- 2 × AnchorError caused by account: voter_token_account. Error Code: ConstraintRaw. Error Number: 2003. Error Message: A raw
- 2 × AnchorError thrown in programs/private-dao/src/lib.rs:1094. Error Code: DelegationOverlap. Error Number: 6041. Error Mes

## Interpretation

This run demonstrates that PrivateDAO can execute a full Devnet governance lifecycle with 50 persistent wallets under wave-based submission, while preserving deterministic reviewer artifacts and explorer-verifiable transaction evidence. The successful commit, reveal, finalize, and execute paths remained reproducible, and the negative-path scenarios were rejected without advancing proposal lifecycle state or bypassing treasury controls.
