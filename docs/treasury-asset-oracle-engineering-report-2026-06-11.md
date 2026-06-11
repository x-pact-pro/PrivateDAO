# PrivateDAO Treasury, Asset, Stablecoin, And Oracle Engineering Report

Date: 2026-06-11  
Audience: treasury engineers, stablecoin partners, DeFi reviewers, payment teams, judges  
Repository snapshot reviewed: `origin/main` at `7fb1025ff064c8c83efb2c59ce07ec780964c450`  
Primary posture: asset context before voting, private coordination during approval, verifiable execution after completion.

## 1. Executive Summary

PrivateDAO does not treat treasury movement as a raw transfer button. Treasury execution is part of the coordination flow:

```text
Proposal -> Intelligence -> Asset context -> Private vote/review -> Reveal -> Proof -> Execution
```

The treasury and asset stack includes:

- Token-2022/SPL client boundaries
- Tokens-compatible asset context provider
- Pyth-compatible oracle price provider
- Jupiter treasury route
- PUSD stablecoin treasury and payout lane
- AUDD stablecoin treasury and merchant settlement lane
- private payout and confidential vesting hooks
- Solana Testnet proof/read-node receipt path

The core product value is simple:

> PrivateDAO checks asset context before decisions, protects coordination during decisions, and reveals proof after execution.

## 2. Token Intelligence Boundary

Primary file:

- `apps/web/src/lib/tokens/token-intelligence-provider.ts`

Provider interface:

- `TokenIntelligenceProvider`
- `TokenIntelligenceRequest`
- `TokenIntelligenceResult`

Supported provider IDs:

- `sandbox-token-context`
- `tokens-compatible`

The sandbox provider verifies the product flow with:

- canonical symbol
- verified asset label
- price availability flag
- risk summary
- provider status

Default verified symbols:

- `USDC`
- `SOL`
- `PUSD`
- `AUDD`

Current boundary:

- user can proceed even if external token provider is unavailable
- external API keys are never exposed in frontend code
- sandbox status is labeled as sandbox

## 3. Oracle / Pyth-Compatible Price Boundary

Primary file:

- `apps/web/src/lib/oracle/oracle-price-provider.ts`

Provider IDs:

- `sandbox-price-context`
- `pyth-compatible`

Supported use cases:

- treasury
- payout
- vesting

The sandbox provider supplies deterministic price context for:

- USDC = 1
- PUSD = 1
- AUDD = 0.66
- SOL = 165

Current boundary:

- Pyth-compatible provider activates only with server-side env
- price context is advisory before signing
- the product should not claim live Pyth settlement unless provider config and runtime proof exist

## 4. Jupiter Treasury Route

Primary surfaces:

- `docs/jupiter-treasury-route.md`
- `apps/web/src/lib/search-assistant.ts`
- `/services/jupiter-treasury-route/`
- `/treasury/`

Product role:

- route preview and liquidity/treasury planning
- context before proposal/vote execution
- wallet-first review before signing

Current boundary:

- Jupiter is a treasury-routing/provider lane
- final execution remains wallet-authorized and proof-linked
- route preview should not be described as completed swap settlement without signature/explorer evidence

## 5. PUSD Stablecoin Lane

Primary surfaces:

- `/services/pusd-stablecoin/`
- `/services/palm-usd/`
- `/services/palmusd/`
- `/services/pusd/`
- `apps/web/src/lib/treasury-receive-config.ts`
- search assistant PUSD routing blocks

Product role:

- confidential payroll
- grant distribution
- gaming reward pools
- institutional stablecoin treasury proof

Current boundary:

- PUSD route is product-ready as a treasury/stablecoin lane
- official mint/funded wallet activation must be configured for real token TransferChecked execution
- product copy should emphasize working prototype direction and Testnet proof path, not unverified mainnet PUSD usage

## 6. AUDD Stablecoin Lane

Primary surfaces:

- `docs/audd-stablecoin-treasury-layer.md`
- `apps/web/src/lib/treasury-receive-config.ts`
- search assistant AUDD routing blocks

Product role:

- Australian-dollar settlement
- merchant tools
- invoice collection
- treasury reserves
- programmable finance proof

Current boundary:

- AUDD is treated as a stablecoin treasury route
- official mint and funded wallet configuration are required for real token settlement
- sandbox or preview labels must stay visible until execution proof exists

## 7. Token-2022 / SPL Client Role

Product role:

- stablecoin mint/account handling
- transfer and treasury receive configuration
- future extension-friendly asset support

Repository indicators:

- Token-2022 appears in `ai.json` and provider matrices
- treasury receive config supports token program override
- private payout and vesting interfaces carry `USDC`, `USDT`, `SOL`, `PUSD`, and `AUDD`

Current boundary:

- Token-2022 is part of the client/asset model
- each mint still requires correct configured public mint and token program before execution claims

## 8. Treasury Coordination Business Logic

PrivateDAO's treasury route is not only a DeFi route. It supports:

- confidential treasury requests
- reviewer assignment
- private approval
- stablecoin payout preparation
- confidential vesting
- public proof and audit packets

This makes the treasury layer a coordination product, not just an aggregator wrapper.

## 9. Historical Development Notes

Relevant recent commits include:

- `836433c0e` - added coordination value and provider context.
- `3abfbccc1` - added provider-router architecture and simplified flow.
- `c55010e31` - fixed sandbox payout provider naming.
- `cbaa1f0f3` - closed Frontier partner track review paths.
- `9b3117c23` - added cryptographic on-chain matrix.
- `6fe8ea3de` - refreshed backend provider readiness.

## 10. Upgrade Path

Recommended next upgrades:

1. Add a live `/api/asset-context/status` endpoint summarizing Tokens/Pyth/Jupiter/PUSD/AUDD status.
2. Add mint-specific proof cards for PUSD and AUDD routes.
3. Add one wallet-submitted Testnet stablecoin rehearsal per stablecoin lane.
4. Add Jupiter route quote proof with exact quote timestamp and request parameters.
5. Add Token-2022 mint verification checklist to proof center.

## 11. Engineering Conclusion

PrivateDAO's treasury and asset layer is strongest when it is presented as decision safety infrastructure:

```text
asset context -> private approval -> wallet execution -> public proof
```

The provider architecture is correct: asset and price context are modular and optional, stablecoin execution is wallet-bound, and the system continues safely with sandbox context when external providers are unavailable.

