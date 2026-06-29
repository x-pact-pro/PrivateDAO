# Browser-Wallet Runtime QA

PrivateDAO treats browser-wallet behavior as a runtime property that must be captured, not inferred from shipped code.

This package defines how browser-wallet captures should be recorded before stronger browser-side runtime claims are made for the live governance lane.

## Why This Exists

The web app now ships live wallet-first governance actions, but that only proves implementation and build correctness.

It does not by itself prove that real injected wallets on real desktop browsers complete the lifecycle correctly.

Browser-wallet runtime QA exists to close that gap without overstating the current surface.

## Canonical Capture Targets

Capture runs should cover at minimum:

- Phantom browser wallet
- Solflare browser wallet
- Backpack browser wallet
- Glow browser wallet

## Required Per-Capture Fields

Each capture should record:

- wallet label
- wallet version when visible
- environment type
- operating system
- browser or client name
- network
- actions covered
- connect result
- signing result
- submission result
- diagnostics snapshot presence
- transaction signature when a runtime transaction was successfully submitted
- explorer URL when a runtime transaction was successfully submitted
- error message when any step fails
- evidence refs for screenshots or recordings when available

## Minimum Flow

Each browser-wallet target should attempt:

1. connect wallet
2. confirm diagnostics visibility
3. run at least one live governance action on the active runtime network
4. record explorer-visible outcome or error

## Registry Source

The source registry for these captures is:

- `docs/runtime/browser-wallet-captures.json`

Starter templates are available in:

- `docs/runtime/templates/phantom-browser-wallet.json`
- `docs/runtime/templates/solflare-browser-wallet.json`
- `docs/runtime/templates/backpack-browser-wallet.json`
- `docs/runtime/templates/glow-browser-wallet.json`
- `docs/runtime/templates/README.md`

The generated reviewer-facing outputs are:

- `docs/runtime/browser-wallet.generated.json`
- `docs/runtime/browser-wallet.generated.md`

## Fast Capture Workflow

1. Run the wallet flow in the live web app on the active runtime network.
2. Save a small JSON payload for the target.
3. Record it with:

```bash
npm run record:browser-wallet-runtime -- /path/to/capture.json
npm run build:browser-wallet-runtime
npm run verify:browser-wallet-runtime
```

## Clean Capture Baseline

When browser-wallet evidence is captured from `/command-center`, the lane must start from a genuinely clean state.

`Reset session` now clears both:

- `privatedao-governance-session`
- `privatedao:service-handoff`

This matters because the governance session alone was not enough; a persisted handoff could silently rehydrate a payload-driven execution lane and contaminate `Create DAO` browser captures.

## Public Surface Replay Note

After the root live mirror publish in commit `74480771`, a fresh Solflare replay on `https://privatedao.org/govern/` confirmed that:

- the public surface no longer depended on stale chunk paths from the older mirror
- `Reset session` no longer left the governance shell stuck in a stale `Awaiting wallet` state
- `Create DAO` could again reach:
  - `PRE-SIGN REVIEW`
  - `Awaiting wallet signature for the DAO bootstrap transaction...`

That replay is a clean public-surface handoff proof, not a new signed submission proof.

Evidence:

- `docs/assets/runtime/browser-wallet/solflare-create-dao-awaiting-wallet-clean-replay.png`

## Captured Solflare Governance Continuation

On `2026-04-15`, a live Solflare desktop-browser session on `https://privatedao.org/govern/` completed the web wallet flow through:

- `Create DAO`
- `Create Proposal`
- `Commit Vote`

Captured runtime values:

- DAO bootstrap signature: `4zDfzZ9DBcfGmDf2ogeX2Z6UTUJYhxxY8zYNFBLQHMeFXzDhpmaegYm6aPMfEBvHiBKZ2b1rW3G8Hi3iWX1WPYie`
- DAO: `8XDpMqrQnJfv7h7pYF7HjpeaEJWd6fB3V9ymt1xoXT9z`
- Governance mint: `AshNR4wm8GpvHpT8xjNkfPQW9P6bXiBYvje9WnW4txfr`
- Wallet: `Ey1z1djLDuRsi6BX7fQDcazY1LgCH4RN4gJ2dST8imze`
- Proposal signature: `5KZnxXobUWECRHq41DomD1RZf62vo9ysyjveBRzra8FYtz5oCH5tc2Puy9CpvxnYVfUr3sFdBm7jkSEXDdtFEcFm`
- Proposal: `CCfVPMj4tBk1pFYJbMVK5Fmxc6JCQhSEtuCLRRGzjGad`
- Commit signature: `4pJMv7Vx4hf3pxum59DxoNjaRt38gh9oq2KVyyzY3ksqnLtaxSs4oQRYWxG594KrynsGDtqoL3eqr5GSgEe9Hp7q`
- Commitment: `a62879abf6213c89a6e248ae3b575a47c07487fbb6e8299826451768463eca77`
- Reveal salt: `b24604fe2728fb1e77d76ca3e66fd678fba5a4974647eb55b80a1b57c0b8b773`

The reveal step remained correctly blocked at that moment because the commit window had not yet closed.

## Minimal Capture Payload Example

```json
{
  "id": "phantom-browser-wallet",
  "walletLabel": "Phantom",
  "walletVersion": "example-version",
  "environmentType": "desktop-browser",
  "os": "macOS 15",
  "browserOrClient": "Chrome 136",
  "network": "testnet",
  "actionsCovered": [
    "Create DAO"
  ],
  "connectResult": "success",
  "signingResult": "success",
  "submissionResult": "success",
  "diagnosticsSnapshotCaptured": true,
  "txSignature": "example-runtime-signature-from-browser-wallet-run",
  "errorMessage": null,
  "evidenceRefs": [
    "docs/assets/runtime/browser-wallet/phantom-create-dao-awaiting-wallet.png"
  ],
  "capturedAt": "2026-04-14T00:00:00.000Z"
}
```

## Honest Boundary

The repository now provides a formal intake, builder, verifier, and reviewer surface for browser-wallet runtime QA across the currently selected runtime rail.

It does not fabricate successful browser-wallet runs that were not actually captured.
