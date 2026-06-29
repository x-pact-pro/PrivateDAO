# Test Wallet Live Proof V3

This packet captures two real testnet flows executed with local test-only wallets outside git:

1. `Governance Hardening V3` with token-supply quorum and a dedicated reveal rebate vault
2. `Settlement Hardening V3` with a proposal-scoped settlement snapshot, REFHE settlement, MagicBlock corridor settlement, verified settlement evidence, and token payout execution

## Context

- generated at: `2026-05-23T02:48:54.053Z`
- mode: `test-wallet-testnet-encrypted-integrations-v3`
- cluster: `testnet`
- Anchor version: `1.0.1`
- operator wallet: `4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD`
- program id: `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`

## Governance Hardening V3

### Accounts

- DAO: `DCstvkqyeuqNTunn7WrKvsc4j7XWPt4vbmpL37pvrY6X`
- Governance mint: `7VoozT9PVXieCZoB6KrNUQ8g2PDyBoVrhGy82NKGUudg`
- Treasury PDA: `4mDgd1DiZi8m9bhvuwoGz7igrLJ5MaKd2BfTyqdWjA8v`
- Proposal PDA: `9TkPrSPEPwD9Cmrt4NZNqL9C157BXmJUZDRASgmkPGc8`
- Governance policy: `AtcyxKbNvREW5mskfe9TcNQjESXBs2bXsxja9bnFfu1s`
- Governance snapshot: `EfrhevDjT6zoPxFPvRpAYsfSFiVgr7Trb5B5onpfxzTP`
- Reveal rebate vault: `9bKVDXjn1QqfnJjHovZCnYfHy3NChn6x7nXnqfeBQS5X`
- Recipient wallet: `Dxk6XdDfbhGkQr2EwkcqFDzH9Stx6Vj25EHpr6QuwNZV`

### Explorer links

- DAO: `https://solscan.io/account/DCstvkqyeuqNTunn7WrKvsc4j7XWPt4vbmpL37pvrY6X?cluster=testnet`
- Mint: `https://solscan.io/account/7VoozT9PVXieCZoB6KrNUQ8g2PDyBoVrhGy82NKGUudg?cluster=testnet`
- Treasury: `https://solscan.io/account/4mDgd1DiZi8m9bhvuwoGz7igrLJ5MaKd2BfTyqdWjA8v?cluster=testnet`
- Proposal: `https://solscan.io/account/9TkPrSPEPwD9Cmrt4NZNqL9C157BXmJUZDRASgmkPGc8?cluster=testnet`

### Transactions

- `createDao`: `aW4VsPiTisAEMkGgoTW6oetRYt95Qu43MDPoHtoN5FBqm76qHbSAwTHNBkjiFPTeEdVEChkh911ZfmSrcCgg4qM`
- Explorer: `https://solscan.io/tx/aW4VsPiTisAEMkGgoTW6oetRYt95Qu43MDPoHtoN5FBqm76qHbSAwTHNBkjiFPTeEdVEChkh911ZfmSrcCgg4qM?cluster=testnet`
- `initializeGovernancePolicyV3`: `2EFTYoWSYZVq6nF7EdsTQ1EddFqmLZKW3h7cfoBBE959NpkrDiDixqkC99fQ7RwH7BEMC3DVnvkb9LuY5ELxoqGZ`
- Explorer: `https://solscan.io/tx/2EFTYoWSYZVq6nF7EdsTQ1EddFqmLZKW3h7cfoBBE959NpkrDiDixqkC99fQ7RwH7BEMC3DVnvkb9LuY5ELxoqGZ?cluster=testnet`
- `fundRevealRebateVaultV3`: `JpBup7k3v6CmVceJ6uNHDP3ceoAczVcsR4VeLLqSJfQVWX3miyen9aSXBCPumKdMhECf1KGovxuWocEnnvZWCPS`
- Explorer: `https://solscan.io/tx/JpBup7k3v6CmVceJ6uNHDP3ceoAczVcsR4VeLLqSJfQVWX3miyen9aSXBCPumKdMhECf1KGovxuWocEnnvZWCPS?cluster=testnet`
- `deposit`: `itZsFRhcgezTLbYn87Vq3ccQTWHwABbqwXbLr1F5KEfyEoqEnZANVdYRNL9HFdr3Q7xMagJSkDxxU11DkkMpWfX`
- Explorer: `https://solscan.io/tx/itZsFRhcgezTLbYn87Vq3ccQTWHwABbqwXbLr1F5KEfyEoqEnZANVdYRNL9HFdr3Q7xMagJSkDxxU11DkkMpWfX?cluster=testnet`
- `createProposal`: `4iEm31UTmPBSHJUAFRgsbaWmK4kwcik5Fiqv3stjGtPNptAVrEuQcYgGT94ou9givdHxUmCuSBLNFkstBcYUAs4R`
- Explorer: `https://solscan.io/tx/4iEm31UTmPBSHJUAFRgsbaWmK4kwcik5Fiqv3stjGtPNptAVrEuQcYgGT94ou9givdHxUmCuSBLNFkstBcYUAs4R?cluster=testnet`
- `snapshotGovernancePolicyV3`: `m1M4DbvJmHJzfTKTzjH1TbKH2LCmLDL1zKDaK9qcYdxWGMBnjsJT7qnvSDkZwfMYgw3vx5uV18FQuhVaMRdk2sK`
- Explorer: `https://solscan.io/tx/m1M4DbvJmHJzfTKTzjH1TbKH2LCmLDL1zKDaK9qcYdxWGMBnjsJT7qnvSDkZwfMYgw3vx5uV18FQuhVaMRdk2sK?cluster=testnet`
- `commit`: `4ah9tgL3WeHn3enwSDDRukRp9rcy8WYPsxGhxU8CTUApyeE8CqxcjLQj6LRMcEYvmcu6v4Jr8hr8NdjWYpjHpbib`
- Explorer: `https://solscan.io/tx/4ah9tgL3WeHn3enwSDDRukRp9rcy8WYPsxGhxU8CTUApyeE8CqxcjLQj6LRMcEYvmcu6v4Jr8hr8NdjWYpjHpbib?cluster=testnet`
- `revealV3`: `5F9pHjkxfwgY7psTnJxCZgDZ66DNoxP5xsffMTEBKkULBgdKpGSsxVPZZyQc1CeHUgsCXU69eNUdzPFb6bhYm77B`
- Explorer: `https://solscan.io/tx/5F9pHjkxfwgY7psTnJxCZgDZ66DNoxP5xsffMTEBKkULBgdKpGSsxVPZZyQc1CeHUgsCXU69eNUdzPFb6bhYm77B?cluster=testnet`
- `finalizeV3`: `2CpXnUHUfpYv4amBuL5vf8UsKLWxptFgpuNbqvzGrJTYujMKgBqPzS8xmWnvTRV1HGEbGB5pqhubHPcEoyqGMuH7`
- Explorer: `https://solscan.io/tx/2CpXnUHUfpYv4amBuL5vf8UsKLWxptFgpuNbqvzGrJTYujMKgBqPzS8xmWnvTRV1HGEbGB5pqhubHPcEoyqGMuH7?cluster=testnet`
- `execute`: `3swEh5DY8aNn7uX3LL7DyR8RNT2RSmbQDvXyuic7Rdy2ojCNjNfu17VybcspZiNvyhfpPv5iTFjfdW5u6d9zhB6v`
- Explorer: `https://solscan.io/tx/3swEh5DY8aNn7uX3LL7DyR8RNT2RSmbQDvXyuic7Rdy2ojCNjNfu17VybcspZiNvyhfpPv5iTFjfdW5u6d9zhB6v?cluster=testnet`

### Observed invariants

- status: `Passed`
- `isExecuted = true`
- `eligibleCapital = 1000000000`
- `yesCapital = 1000000000`
- `revealCount = 1 / 1`
- voting end: `2026-05-23 02:47:30 UTC`
- reveal end: `2026-05-23 02:47:36 UTC`
- execution unlock: `2026-05-23 02:47:42 UTC`
- reveal rebate vault before: `0.0032 SOL`
- reveal rebate vault after: `0.0022 SOL`
- treasury before execute: `0.2000 SOL`
- treasury after execute: `0.1500 SOL`
- recipient before: `0.0050 SOL`
- recipient after: `0.0550 SOL`

## Settlement Hardening V3

### Accounts

- DAO: `B8kydmvWdwNvGoGhgdP7oTNPphzNs2E6wfXpAoxHpeoo`
- Treasury PDA: `DuutG2LsPQZBJcsForCfsTopHdmFGHBCEt9QwGy9gMNo`
- Proposal PDA: `3oJ4hkmHr7dZ29MAREMAvDgMxYAMKbrHrFFbZG7TWTuQ`
- Security policy: `2arevYgMX4vXPvvUVYpKhWhNWo9M8cErpBvcyfH6NrDT`
- Governance policy: `6M3BS9nzapPo44tvuHN8NdkqKRh13SXKZrdGyGAFctFN`
- Governance snapshot: `44qBtdXy5BNiZbRSKDELCqVb6w3hH3HTZnrrbbi1Ft5W`
- Settlement policy: `AaA2hMGjdHeuMMuGW7z3ZmbJL4oidAo9bX34Jasx8K87`
- Settlement snapshot: `BRkRWMi7WJJjST1BUx3BGFrrSmYeZZpEHsRDBJocsuw8`
- Payout plan: `2CXuzM8615XNp1vwUyyU3MxArgJFw5AEZCmVgpCtH2yb`
- REFHE envelope: `5UHy5XTrYdTUn9Wfwmeur7kMp2rLneyuZZQJf1mYasy3`
- MagicBlock corridor PDA: `CwB641sj7R6GAL84kf5xThi4zjN9Edx5S7yXz7GDuo85`
- Settlement evidence: `ALdonAM3L5BnBYiknkQ2AVrHLjHc8nHQPqi2kJUW6zE1`
- Settlement consumption record: `9Bg2u3nW6MfAHHG6B9WLdWnQf3tQeTprH8NrtWNh68fK`
- Recipient wallet: `5vQiGkrsfz3wjeFWcPDFLAZV8Xyp36QRWatkh7Rt2FVj`

### Explorer links

- DAO: `https://solscan.io/account/B8kydmvWdwNvGoGhgdP7oTNPphzNs2E6wfXpAoxHpeoo?cluster=testnet`
- Treasury: `https://solscan.io/account/DuutG2LsPQZBJcsForCfsTopHdmFGHBCEt9QwGy9gMNo?cluster=testnet`
- Proposal: `https://solscan.io/account/3oJ4hkmHr7dZ29MAREMAvDgMxYAMKbrHrFFbZG7TWTuQ?cluster=testnet`
- Settlement evidence: `https://solscan.io/account/ALdonAM3L5BnBYiknkQ2AVrHLjHc8nHQPqi2kJUW6zE1?cluster=testnet`
- Payout plan: `https://solscan.io/account/2CXuzM8615XNp1vwUyyU3MxArgJFw5AEZCmVgpCtH2yb?cluster=testnet`
- REFHE envelope: `https://solscan.io/account/5UHy5XTrYdTUn9Wfwmeur7kMp2rLneyuZZQJf1mYasy3?cluster=testnet`
- MagicBlock corridor: `https://solscan.io/account/CwB641sj7R6GAL84kf5xThi4zjN9Edx5S7yXz7GDuo85?cluster=testnet`

### Transactions

- `fundRecipient`: `5UX86Rdarbb2M1o8wpiVwQRkHEWwcdUjhYww6fDnw23SLuugGUdFkRH6vPEqcA39fJRXzYrMw8wcDbKGea2Bo244`
- Explorer: `https://solscan.io/tx/5UX86Rdarbb2M1o8wpiVwQRkHEWwcdUjhYww6fDnw23SLuugGUdFkRH6vPEqcA39fJRXzYrMw8wcDbKGea2Bo244?cluster=testnet`
- `createDao`: `d2jzigHKYgVh2S8QykNTTDTY53ppFgTr7hVFV6MhCgqmwwtd3AGJ3uBjnRUZ3e2JsoXNNJ6ZbhPjbANiCM14M5X`
- Explorer: `https://solscan.io/tx/d2jzigHKYgVh2S8QykNTTDTY53ppFgTr7hVFV6MhCgqmwwtd3AGJ3uBjnRUZ3e2JsoXNNJ6ZbhPjbANiCM14M5X?cluster=testnet`
- `initializeSecurityPolicyV2`: `2pNgCDCF9LdvrYVUeWb2fgFENARoMDfucUriTFDg6p2tyJ1it1vKU2Not8tsQzhw94RTmUrfACC7TqpxuNUt3c3A`
- Explorer: `https://solscan.io/tx/2pNgCDCF9LdvrYVUeWb2fgFENARoMDfucUriTFDg6p2tyJ1it1vKU2Not8tsQzhw94RTmUrfACC7TqpxuNUt3c3A?cluster=testnet`
- `initializeGovernancePolicyV3`: `2x36osVzLKqro8FxGTawsch9tgVWka5qYZ3BEoh4rSJ2pHezbQAmkdtc75jUkWpMwcMU4WyGoLxfHg2dHqfBDcSn`
- Explorer: `https://solscan.io/tx/2x36osVzLKqro8FxGTawsch9tgVWka5qYZ3BEoh4rSJ2pHezbQAmkdtc75jUkWpMwcMU4WyGoLxfHg2dHqfBDcSn?cluster=testnet`
- `fundRevealRebateVaultV3`: `2nvdCGAi7v3UHMnFkkR1MN5sxsPGqepekYjBA8LPSFj4N7DEkaHc6dPoYUEaEnhfA9cr4MN1C33nw8b6PvXD6GQp`
- Explorer: `https://solscan.io/tx/2nvdCGAi7v3UHMnFkkR1MN5sxsPGqepekYjBA8LPSFj4N7DEkaHc6dPoYUEaEnhfA9cr4MN1C33nw8b6PvXD6GQp?cluster=testnet`
- `initializeSettlementPolicyV3`: `3quWUYwiWAmLivMymL74wrgVE5AWM1AFS9xzdomZp7DEiQDC611YMjDNRMfZRRJgxPw7E8jVnTkwmid8MhVBdYDr`
- Explorer: `https://solscan.io/tx/3quWUYwiWAmLivMymL74wrgVE5AWM1AFS9xzdomZp7DEiQDC611YMjDNRMfZRRJgxPw7E8jVnTkwmid8MhVBdYDr?cluster=testnet`
- `createProposal`: `2TA6dBYpefBbRgB8peEUsdQFgomcirRwBtQUFDGzNXisXaWvY99VyEt15xYLQkL3dpapY87CX6n4v7JYhPVC225j`
- Explorer: `https://solscan.io/tx/2TA6dBYpefBbRgB8peEUsdQFgomcirRwBtQUFDGzNXisXaWvY99VyEt15xYLQkL3dpapY87CX6n4v7JYhPVC225j?cluster=testnet`
- `configureConfidentialPayoutPlan`: `3MsNfd1bXM9gCiozCCb9tyV3v8D6YEU2o57a2gTymfAqTqLC9NXka6SsacAaZ54nB17hE3HQwNqwGmVUAZqJHkXS`
- Explorer: `https://solscan.io/tx/3MsNfd1bXM9gCiozCCb9tyV3v8D6YEU2o57a2gTymfAqTqLC9NXka6SsacAaZ54nB17hE3HQwNqwGmVUAZqJHkXS?cluster=testnet`
- `configureRefheEnvelope`: `3fygnmHzFpRQEbHq9q6u3djBnkTEcYz9y1TSwxDmbnuemshrMwLmy9CqpjifjRb7SmW3DbmXrkyq35cnjU7mMSPi`
- Explorer: `https://solscan.io/tx/3fygnmHzFpRQEbHq9q6u3djBnkTEcYz9y1TSwxDmbnuemshrMwLmy9CqpjifjRb7SmW3DbmXrkyq35cnjU7mMSPi?cluster=testnet`
- `snapshotGovernancePolicyV3`: `2XVGRgRymUhjQyApZebbyv2aUo2XFR2PH4Bygrw4vWYYmsVatUevtEpCyCDSDRgZq4oABqQC1magP8upqLa1uUCy`
- Explorer: `https://solscan.io/tx/2XVGRgRymUhjQyApZebbyv2aUo2XFR2PH4Bygrw4vWYYmsVatUevtEpCyCDSDRgZq4oABqQC1magP8upqLa1uUCy?cluster=testnet`
- `snapshotSettlementPolicyV3`: `4xQ3MCBZAYWfbVGuWvby3zG3chnZVDsrodh8vSuxcjBSvXXkUfu2Liy2uu6dBuBCVG9asiThKgm57Xo5aG2nz1wp`
- Explorer: `https://solscan.io/tx/4xQ3MCBZAYWfbVGuWvby3zG3chnZVDsrodh8vSuxcjBSvXXkUfu2Liy2uu6dBuBCVG9asiThKgm57Xo5aG2nz1wp?cluster=testnet`
- `deposit`: `232H7x7JDKLr64HymXe6E6MuwTpNw5aXAnfEmkMREYvthd7diDghfuAayY16LryPCqmFmQH8esBbfyahsJkiyf1y`
- Explorer: `https://solscan.io/tx/232H7x7JDKLr64HymXe6E6MuwTpNw5aXAnfEmkMREYvthd7diDghfuAayY16LryPCqmFmQH8esBbfyahsJkiyf1y?cluster=testnet`
- `commit`: `8vEVmFU4aMdHNkmx9LQP8c7KX7MpVr1PiHKVjeRzefv6EMze6k3Ta2g29JbCbNVSRVruPPQPUbEyj6oXBkiGqut`
- Explorer: `https://solscan.io/tx/8vEVmFU4aMdHNkmx9LQP8c7KX7MpVr1PiHKVjeRzefv6EMze6k3Ta2g29JbCbNVSRVruPPQPUbEyj6oXBkiGqut?cluster=testnet`
- `revealV3`: `4M37eyDYdQQtEpGpneKoTXT3g24ocN7CCsNvJLKkmRYEmS1DnN9oJWhVejmMjhmmJpztavMcxSY6fYKkBv5KnuSh`
- Explorer: `https://solscan.io/tx/4M37eyDYdQQtEpGpneKoTXT3g24ocN7CCsNvJLKkmRYEmS1DnN9oJWhVejmMjhmmJpztavMcxSY6fYKkBv5KnuSh?cluster=testnet`
- `finalizeV3`: `5NNZVNo7Yho9BZfZZ7PSXjc8NtBfTurJLHnoB79JMdTJUwPsEk45y3YK1ZfX9ennXGxV9ZSWpTGo18RDzYwdTXBy`
- Explorer: `https://solscan.io/tx/5NNZVNo7Yho9BZfZZ7PSXjc8NtBfTurJLHnoB79JMdTJUwPsEk45y3YK1ZfX9ennXGxV9ZSWpTGo18RDzYwdTXBy?cluster=testnet`
- `settleRefheEnvelope`: `5TmS2AcpAmifcoG97U63Unzy7wt7B2NfyhBRs8Z6C4r1eqcWthEqf3GLcZXQ33sVYHf9YwfvBNhZD8ZZdt4HRwEY`
- Explorer: `https://solscan.io/tx/5TmS2AcpAmifcoG97U63Unzy7wt7B2NfyhBRs8Z6C4r1eqcWthEqf3GLcZXQ33sVYHf9YwfvBNhZD8ZZdt4HRwEY?cluster=testnet`
- `configureMagicBlockPrivatePaymentCorridor`: `4UiUumtuGeDciojDA26PkQby7RFiTNb12UG4ACcvGMGfQj24PUPxK5Apeno7EY8mbCvq8nR6h6nfxDcBpjPvGvPj`
- Explorer: `https://solscan.io/tx/4UiUumtuGeDciojDA26PkQby7RFiTNb12UG4ACcvGMGfQj24PUPxK5Apeno7EY8mbCvq8nR6h6nfxDcBpjPvGvPj?cluster=testnet`
- `settleMagicBlockPrivatePaymentCorridor`: `22XW8XVhWwQtChNQK2aEqXv5BVBbckxUmu4NsisoZQW21KA5ii87gVNUTcNoZ9e1vYKnHmm62qP1girpzVXWN1WY`
- Explorer: `https://solscan.io/tx/22XW8XVhWwQtChNQK2aEqXv5BVBbckxUmu4NsisoZQW21KA5ii87gVNUTcNoZ9e1vYKnHmm62qP1girpzVXWN1WY?cluster=testnet`
- `recordSettlementEvidenceV2`: `5rPqdGuz2TD8fydmTgLAKQpxhdjwxjNwfXnSCZ6DRvtu5sfVuTfcgYkGXQrSAHsbzMKL9sUPZn4oRxS3smBXHBXs`
- Explorer: `https://solscan.io/tx/5rPqdGuz2TD8fydmTgLAKQpxhdjwxjNwfXnSCZ6DRvtu5sfVuTfcgYkGXQrSAHsbzMKL9sUPZn4oRxS3smBXHBXs?cluster=testnet`
- `executeV3`: `2a8sHWgiVCZkstybMff2M9R6DVU4Y96Rfsg8mqYs7K3xcYSEG1zMcq2iSTNwLD6FgfXvxxxWpwEP9Tbyin47RXvE`
- Explorer: `https://solscan.io/tx/2a8sHWgiVCZkstybMff2M9R6DVU4Y96Rfsg8mqYs7K3xcYSEG1zMcq2iSTNwLD6FgfXvxxxWpwEP9Tbyin47RXvE?cluster=testnet`

### Observed invariants

- status: `Passed`
- `isExecuted = true`
- payout status: `{"funded":{}}`
- evidence status: `{"verified":{}}`
- `evidenceConsumed = true`
- `eligibleCapital = 1060000000`
- `revealCount = 1 / 1`
- voting end: `2026-05-23 02:48:36 UTC`
- reveal end: `2026-05-23 02:48:42 UTC`
- execution unlock: `2026-05-23 02:48:43 UTC`
- reveal rebate vault before: `0.0032 SOL`
- reveal rebate vault after: `0.0022 SOL`
- treasury before execute: `0.1000 SOL`
- treasury after execute: `0.1000 SOL`
- recipient before: `0.0050 SOL`
- recipient after: `0.0050 SOL`
- treasury token before: `60000000`
- treasury token after: `10000000`
- recipient token before: `0`
- recipient token after: `50000000`

## Purpose

This artifact proves that the repository now carries a real testnet proof for `Governance Hardening V3` plus the encrypted settlement path: REFHE envelope settlement, MagicBlock corridor settlement, evidence recording, evidence consumption, and token payout execution. It is still a test-wallet testnet artifact, not a production-custody or mainnet claim.
