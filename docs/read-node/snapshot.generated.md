# Read Node Snapshot

- Generated at: `2026-05-25T23:43:56.329Z`
- Read path: `backend-indexer`
- RPC endpoint: `https://api.testnet.solana.com`
- RPC pool size: `1`
- Cache entries: `2`
- Cache TTL ms: `15000`
- Program ID: `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`
- Slot: `410906370`
- Solana core: `4.0.0-rc.0`
- Feature set: `767961353`

## Proposal Coverage

- Proposals indexed: `17`
- Unique DAOs: `16`
- Executed proposals: `8`
- Executable proposals: `3`
- Timelocked proposals: `0`
- ZK-enforced proposals: `0`
- Confidential payout proposals: `3`
- REFHE-configured proposals: `3`
- REFHE-settled proposals: `2`
- REFHE proposals with verifier binding: `2`
- Executable confidential proposals: `0`

## Testnet Load Profiles

- `50` | wallets=`50` | waves=`5` | wave-size=`10` | funding-wave=`5` | target-pdao-ui=`100` | negative=`wrong-voter-record, wrong-delegation-marker, wrong-token-account`
- `100` | wallets=`100` | waves=`5` | wave-size=`20` | funding-wave=`10` | target-pdao-ui=`100` | negative=`wrong-voter-record, wrong-delegation-marker, wrong-token-account, late-reveal`
- `350` | wallets=`350` | waves=`7` | wave-size=`50` | funding-wave=`25` | target-pdao-ui=`100` | negative=`invalid-reveal, late-reveal, execute-replay, wrong-vault, wrong-authority, payout-replay`
- `500` | wallets=`500` | waves=`20` | wave-size=`25` | funding-wave=`10` | target-pdao-ui=`100` | negative=`invalid-reveal, late-reveal, execute-replay, wrong-authority, payout-replay`

## Sample

- `REFHE confidential payroll envelope 2026-05-07` | phase=`Finalized` | recipient=`4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD` | amount=`1,000,000 raw token units` | dao=`2gDRTWaNRjiySVdvqoSXnnUYF8CFSaJUxwG6LBg8P1gG`
- `Confidential payroll batch / April255552` | phase=`Executable` | recipient=`pending` | amount=`Pending exact amount from the indexed proposal record` | dao=`CKDqPz4H64U5b66CDrTKAHDuQXV9NwMsKtDjZyUNHhiH`
- `Governance Hardening V3 live proof` | phase=`Executed` | recipient=`Dxk6XdDfbhGkQr2EwkcqFDzH9Stx6Vj25EHpr6QuwNZV` | amount=`0.05 SOL` | dao=`DCstvkqyeuqNTunn7WrKvsc4j7XWPt4vbmpL37pvrY6X`
- `Confidential payroll batch / April` | phase=`Executable` | recipient=`pending` | amount=`Pending exact amount from the indexed proposal record` | dao=`2McuCRTgwc96er39sQQnzkzcN94aGWMfR9Rtz64RCdQk`
- `Governance Hardening V3 live proof` | phase=`Executed` | recipient=`3tY61SNRGEVDxpDAMfhDjWvtWaFsv4JTPHSV6uQNSA1z` | amount=`0.05 SOL` | dao=`C8uVwtCsE24XkMrT63HehZNcMcruS2KSokZq5XYZLdZr`

## Proposal Registry

- Registry entries: `17`
- Executed: `8`
- Evidence gated: `2`
- Execution ready: `3`

## Featured Proposal Contexts

- `payroll` | phase=`Finalized` | proposal=`4A2qwBvTKYL9kGzjCNHaSCp8jJXcMRaFxPMWf5NJ2qBt` | recipient=`Confidential settlement wallet` | mint=`SPL token`
- `gaming` | phase=`Executed` | proposal=`3oJ4hkmHr7dZ29MAREMAvDgMxYAMKbrHrFFbZG7TWTuQ` | recipient=`MagicBlock settlement corridor` | mint=`7VoozT9PVXieCZoB6KrNUQ8g2PDyBoVrhGy82NKGUudg`
- `grant` | phase=`Executed` | proposal=`9TkPrSPEPwD9Cmrt4NZNqL9C157BXmJUZDRASgmkPGc8` | recipient=`Dxk6XdDfbhGkQr2EwkcqFDzH9Stx6Vj25EHpr6QuwNZV` | mint=`SOL`

## Featured Proposal Registry

- `PDAO-001-2GDR` | `REFHE confidential payroll envelope 2026-05-07` | status=`Evidence gated` | treasury=`Confidential payout still gated for 1,000,000 units to 4Mm5…hsMD via mint native asset`
- `PDAO-000-DCST` | `Governance Hardening V3 live proof` | status=`Executed` | treasury=`0.05 SOL sent to Dxk6…wNZV`
- `PDAO-000-B8KY` | `Settlement Hardening V3 + REFHE + MagicBlock live proof` | status=`Executed` | treasury=`Confidential payout executed for 50,000,000 units to 5vQi…2FVj via mint 7Voo…Uudg`
