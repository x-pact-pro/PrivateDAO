# MagicBlock Private Payments Live Probe

Generated: `2026-05-14T13:27:57.043Z`

This packet verifies the MagicBlock Private Payments lane used by PrivateDAO without printing signatures, bearer tokens, private balances, or private keys.

## Capability Matrix

| Group | Status | Reason |
| --- | --- | --- |
| Private Payments health | used | The probe checks https://payments.magicblock.app/health and the PrivateDAO read-node health proxy. |
| Challenge/login | used for readiness | The probe requests a challenge for a public test wallet. It does not sign or print bearer tokens. |
| Private balance | auth-bound | Private balance reads require a bearer token from the wallet-signed challenge/login flow. |
| Unsigned transaction builders | available | Deposit, transfer, and withdraw builders are wired in repo code; live signing/submission remains wallet-side. |
| Ephemeral Rollup regions | used | The probe reads the MagicBlock status API and records live devnet services for reviewer evidence. |
| MagicBlock Dev Skill | installed | The skill is installed under ~/.codex/skills/magicblock and was used to align the challenge/login and bearer-token boundary. |

## Live Results

- MagicBlock docs index: ok
- Payments API health: ok
- PrivateDAO read-node MagicBlock health: ok
- Direct challenge readiness: ok
- PrivateDAO challenge proxy: ok
- Devnet USDC mint initialization check: ok

## Devnet Region Status

| Region | Live | Services |
| --- | --- | --- |
| devnet-as.magicblock.app | yes | er:live, rpc_router:live, pricing_oracle:live, vrf_oracle:live |
| devnet-eu.magicblock.app | yes | er:live, rpc_router:live, pricing_oracle:live, vrf_oracle:live |
| devnet-tee-as.magicblock.app | yes | er:live, vrf_oracle:live, rpc_router:off, pricing_oracle:off |
| devnet-us.magicblock.app | yes | er:live, rpc_router:live, pricing_oracle:off, vrf_oracle:live |

## Auth Boundary

MagicBlock private balances require the challenge -> wallet signature -> login bearer-token flow. PrivateDAO exposes challenge initiation through `/api/v1/magicblock/challenge?pubkey=<wallet>`, but does not fetch private balances without `Authorization: Bearer <token>`.

The Payments API returns unsigned transactions for deposit, transfer, and withdraw flows. The user wallet must sign and submit them to the returned target connection.
