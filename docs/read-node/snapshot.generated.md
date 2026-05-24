# Read Node Snapshot

- Generated at: `2026-05-24T19:36:28.563Z`
- Read path: `backend-indexer`
- RPC endpoint: `https://cosmological-hidden-water.solana-testnet.quiknode.pro/[redacted]`
- RPC pool size: `2`
- Cache entries: `2`
- Cache TTL ms: `15000`
- Program ID: `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`
- Slot: `410642172`
- Solana core: `4.0.0-beta.7`
- Feature set: `1253319928`

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

## Devnet Load Profiles

- `50` | wallets=`50` | waves=`5` | wave-size=`10` | funding-wave=`5` | target-pdao-ui=`100` | negative=`wrong-voter-record, wrong-delegation-marker, wrong-token-account`
- `100` | wallets=`100` | waves=`5` | wave-size=`20` | funding-wave=`10` | target-pdao-ui=`100` | negative=`wrong-voter-record, wrong-delegation-marker, wrong-token-account, late-reveal`
- `350` | wallets=`350` | waves=`7` | wave-size=`50` | funding-wave=`25` | target-pdao-ui=`100` | negative=`invalid-reveal, late-reveal, execute-replay, wrong-vault, wrong-authority, payout-replay`
- `500` | wallets=`500` | waves=`20` | wave-size=`25` | funding-wave=`10` | target-pdao-ui=`100` | negative=`invalid-reveal, late-reveal, execute-replay, wrong-authority, payout-replay`

## Sample

- `REFHE confidential payroll envelope 2026-05-07` | phase=`Finalized` | recipient=`4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD` | amount=`1,000,000 raw token units` | dao=`2gDRTWaNRjiySVdvqoSXnnUYF8CFSaJUxwG6LBg8P1gG`
- `Settlement Hardening V3 + REFHE + MagicBlock live proof` | phase=`Executed` | recipient=`5vQiGkrsfz3wjeFWcPDFLAZV8Xyp36QRWatkh7Rt2FVj` | amount=`50,000,000 raw token units` | dao=`B8kydmvWdwNvGoGhgdP7oTNPphzNs2E6wfXpAoxHpeoo`
- `Confidential payroll batch / April` | phase=`Finalized` | recipient=`pending` | amount=`Pending exact amount from the indexed proposal record` | dao=`FvQK8BjddPzhfAbjL5UNdv47JCtsCWSRAC1buJmHD1Cp`
- `Payroll Pack · Confidential contributor cycle` | phase=`Finalized` | recipient=`AZUroiNeGAjNdD84eEHnAKHHFwqAFmkjr2g1eoF7Ek5c` | amount=`0.005 SOL` | dao=`DXvZ1Bmb7eZmEnBytE7QiSAnFyCj33vs4L9GsjoGpne7`
- `Confidential payroll batch / April` | phase=`Executed` | recipient=`pending` | amount=`Pending exact amount from the indexed proposal record` | dao=`9H4hgS66y3xVwEfZNcFED6NpoEdJh78VqJbzkFDs1PiM`

## Proposal Registry

- Registry entries: `17`
- Executed: `8`
- Evidence gated: `2`
- Execution ready: `3`

## Featured Proposal Contexts

- `payroll` | phase=`Finalized` | proposal=`4A2qwBvTKYL9kGzjCNHaSCp8jJXcMRaFxPMWf5NJ2qBt` | recipient=`Confidential settlement wallet` | mint=`SPL token`
- `gaming` | phase=`Executed` | proposal=`3oJ4hkmHr7dZ29MAREMAvDgMxYAMKbrHrFFbZG7TWTuQ` | recipient=`MagicBlock settlement corridor` | mint=`7VoozT9PVXieCZoB6KrNUQ8g2PDyBoVrhGy82NKGUudg`
- `grant` | phase=`Finalized` | proposal=`EC6SJLqoe8jN48b4EBTgAWEJKcJxXGq1mCdup12aTY8f` | recipient=`AZUroiNeGAjNdD84eEHnAKHHFwqAFmkjr2g1eoF7Ek5c` | mint=`SOL`

## Featured Proposal Registry

- `PDAO-001-2GDR` | `REFHE confidential payroll envelope 2026-05-07` | status=`Evidence gated` | treasury=`Confidential payout still gated for 1,000,000 units to 4Mm5…hsMD via mint native asset`
- `PDAO-000-B8KY` | `Settlement Hardening V3 + REFHE + MagicBlock live proof` | status=`Executed` | treasury=`Confidential payout executed for 50,000,000 units to 5vQi…2FVj via mint 7Voo…Uudg`
- `PDAO-000-DXVZ` | `Payroll Pack · Confidential contributor cycle` | status=`Timelocked` | treasury=`0.005 SOL queued to send to AZUr…Ek5c`
