# Real-Device Runtime QA

PrivateDAO treats wallet compatibility as a runtime property, not a documentation claim.

This package defines how real-device wallet QA must be captured before any strong mainnet-readiness language should be used.

## Why This Exists

Repository-side diagnostics, wallet matrices, and Devnet canaries are useful, but they do not prove that real wallet releases behave correctly on real browsers, operating systems, and mobile environments.

Real-device runtime QA exists to close that gap.

## Canonical Capture Targets

Capture runs should cover at minimum:

- Phantom on desktop browser
- Solflare on desktop browser
- Backpack on desktop browser
- Glow on desktop browser
- Android-native or mobile browser path when available

## Required Per-Capture Fields

Each capture should record:

- wallet label
- wallet version when visible
- environment type
- operating system
- browser or client name
- network
- connect result
- signing result
- submission result
- diagnostics snapshot presence
- transaction signature when a runtime transaction was successfully submitted
- explorer URL when a runtime transaction was successfully submitted
- error message when any step fails
- evidence refs for screenshots or recordings when available

## Minimum Flow

Each runtime target should attempt:

1. connect wallet
2. confirm diagnostics visibility
3. sign or send a transaction on the active runtime network
4. record explorer-visible outcome or error

## Registry Source

The source registry for these captures is:

- `docs/runtime/real-device-captures.json`

Starter templates are available in:

- `docs/runtime/templates/phantom-desktop.json`
- `docs/runtime/templates/solflare-desktop.json`
- `docs/runtime/templates/backpack-desktop.json`
- `docs/runtime/templates/glow-desktop.json`
- `docs/runtime/templates/android-runtime.json`
- `docs/runtime/templates/README.md`

The generated reviewer-facing outputs are:

- `docs/runtime/real-device.generated.json`
- `docs/runtime/real-device.generated.md`

## Fast Capture Workflow

1. Run the wallet flow on the active runtime network in a real client.
2. Save a small JSON payload for the target.
3. Record it with:

```bash
npm run record:real-device-runtime -- /path/to/capture.json
npm run build:real-device-runtime
npm run verify:real-device-runtime
```

Or use the one-shot helper:

```bash
bash scripts/real-device-capture.sh phantom-desktop --tx "<REAL_DEVNET_SIGNATURE>"
```

## Minimal Capture Payload Example

```json
{
  "id": "phantom-desktop",
  "walletLabel": "Phantom",
  "walletVersion": "example-version",
  "environmentType": "desktop-browser",
  "os": "macOS 15",
  "browserOrClient": "Chrome 135",
  "network": "testnet",
  "connectResult": "success",
  "signingResult": "success",
  "submissionResult": "success",
  "diagnosticsSnapshotCaptured": true,
  "txSignature": "example-runtime-signature-from-wallet-run",
  "errorMessage": null,
  "evidenceRefs": [
    "replace-with-real-device-screenshot-path"
  ],
  "capturedAt": "2026-04-05T00:00:00.000Z"
}
```

## Honest Boundary

The repository now provides a formal intake, builder, verifier, and reviewer surface for real-device wallet QA across the currently selected runtime rail.

It does not fabricate successful device runs that were not actually captured.
