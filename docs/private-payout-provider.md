# Private Payout Provider

PrivateDAO treats private payout rails as backend providers, not as the governance privacy primitive.

The public product flow stays simple:

Connect -> Intelligence -> Private Vote -> Reveal -> Verify -> Execute

Private payout providers support execution-side rehearsals for payroll, vendor payouts, rewards, and treasury actions after governance has produced an approved outcome.

## Provider Interface

The canonical interface lives at:

`apps/web/src/lib/providers/private-payout-provider.ts`

It supports:

- `prepareIntent(input)`
- `validateIntent(intent)`
- `executeTestnet(intent)`
- `buildReceipt(intent, executionResult)`
- `getProviderStatus()`

Receipts expose only:

- provider
- network
- intentHash
- proposalId
- daoId
- timestamp
- privacyMode
- publicOutcome
- proofUrl if available
- explorerUrl if available
- sandbox boolean

Raw recipient metadata, raw recipient address, and private notes do not belong in frontend logs or public proof surfaces.

## Sandbox Fallback

If Umbra-compatible env is missing, the system uses `sandbox-testnet`.

The sandbox provider is deterministic and always marks receipts as `sandbox: true`. It must never be described as real settlement.
