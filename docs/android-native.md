# Android Native App

PrivateDAO now includes a first-class Android-native app under `apps/android-native/`.

This is not a hybrid wrapper and not a generic wallet demo. It is a Kotlin Android counterpart of the current PrivateDAO product and follows the same governance lifecycle and protocol assumptions already used by the Solana program, scripts, tests, and live web surface.

## Why Android-first

PrivateDAO is Android-first on mobile because Solana Mobile Wallet Adapter is the official mobile dApp path for Android wallets today. This app therefore uses:

- Kotlin native
- Jetpack Compose
- Solana Mobile Wallet Adapter
- Testnet by default
- app version `1.1.0-testnet`
- downloadable artifact `artifacts/android/PrivateDAO-android-testnet-debug.apk`
- site download URL `https://privatedao.org/downloads/PrivateDAO-android-testnet-debug.apk`

Seed Vault is intentionally not used for the dApp transaction flow. Seed Vault is the wallet-app path; PrivateDAO is implemented here as a mobile dApp.

## Path

```text
apps/android-native/
```

## What Was Ported From The Current Project

The Android app is derived from the existing repository and mirrors these repo-native truths:

- program ID: `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`
- Testnet explorer conventions from `scripts/utils.ts`
- PDA derivations from the program/tests:
  - DAO PDA
  - Proposal PDA
  - VoteRecord PDA
  - Treasury PDA
  - Delegation PDA
- proposal/DAO account layouts from `programs/private-dao/src/lib.rs`
- proposal phase logic from the current frontend/docs product
- commit-reveal hash semantics from `sdk/src/index.ts`
- action naming from the existing program and scripts:
  - `create_proposal`
  - `commit_vote`
  - `reveal_vote`
  - `finalize_proposal`
  - `execute_proposal`

## Architecture

The Android app is intentionally separated from the current web frontend.

High-level layers:

- `config/`
  - Testnet RPC
  - program ID
  - explorer links
- `model/`
  - DAO / proposal / treasury action / wallet state models
- `solana/`
  - binary helpers
  - base58
  - PDA derivation
  - account decoding
  - Anchor discriminator encoding
  - legacy transaction building
- `repository/`
  - live DAO/proposal loading
  - tx construction for current governance actions
- `wallet/`
  - Mobile Wallet Adapter integration
  - auth token persistence
- `presentation/`
  - Compose UI
  - dashboard
  - proposals
  - proposal detail action surface
  - intelligence, services, proof, and social link surface
  - settings

## Android System Diagram

```text
Android user
  -> Jetpack Compose screens
     - splash
     - wallet connect
     - dashboard
     - proposal list / detail
     - create DAO / deposit / create proposal
     - commit / reveal / finalize / execute
     - awards / settings

Compose + ViewModel layer
  -> PrivateDaoViewModel
     - wallet session state
     - live DAO / proposal state
     - proposal phase decisions
     - transaction submission state
     - locally stored vote salt for reveal

Domain / repository layer
  -> PrivateDaoRepository
     - Testnet RPC reads
     - DAO / proposal decoding
     - PDA derivation
     - instruction payload building
     - explorer link generation

Wallet layer
  -> MobileWalletAdapterManager
     - local association flow
     - authorize / reauthorize / deauthorize
     - signAndSendTransactions
     - auth token persistence

Solana layer
  -> live PrivateDAO program on Testnet
  -> DAO PDA
  -> Proposal PDA
  -> VoteRecord PDA
  -> Treasury PDA
  -> SPL token accounts

Verification surface
  -> tx signature returned to app
  -> Solscan Testnet link
  -> same lifecycle and terminology as the current web product
```

## Mobile Wallet Adapter Integration

The app uses the official Solana Mobile Wallet Adapter Android-native path:

- local association flow
- wallet availability detection
- `authorize`
- `reauthorize`
- `deauthorize`
- `signAndSendTransactions`
- persistent auth token and wallet URI base storage

This means the Android app is designed to work with compatible Android wallets such as Phantom / Solflare when exposed through the MWA flow.

## Current Native Screens

- splash / launch
- wallet connect
- home dashboard
- proposal list
- proposal detail surface
- create DAO
- deposit treasury
- create proposal
- commit vote
- reveal vote
- finalize flow
- execute flow
- awards / recognition
- settings / network info

## Real On-Chain Coverage In Android

The current Android app is wired for real Testnet interaction, not mock state.

Implemented mobile transaction paths:

- create DAO
- deposit treasury
- create proposal
- commit vote
- reveal vote
- finalize proposal
- execute proposal for SOL and token treasury paths

Implemented mobile read paths:

- load DAO accounts from the live Testnet program
- load proposal accounts from the live Testnet program
- decode proposal state and phase
- fetch recent proposal transaction signatures
- generate explorer links

## Honest Current Limitations

These are real limitations, not hidden gaps:

- `SendToken` execution is now wired in the Android client, but it still depends on the recipient associated token account existing on-chain for the configured mint
- the Android app currently prioritizes the governance lifecycle and treasury/operator essentials; the broader browser-only proof center and judge-mode surfaces still live primarily in the web product
- full local build verification was limited in this session by missing local Android SDK / Gradle execution environment in the workspace shell

None of these change the protocol or on-chain behavior. They only define the current mobile surface area.

## Build

Open the Android app in Android Studio from:

```text
apps/android-native/
```

Typical steps:

1. Install Android Studio with Android SDK support
2. Open `apps/android-native`
3. Let Gradle sync dependencies
4. Run on an Android device or emulator
5. Install an MWA-compatible wallet on the target device for real wallet flows

## Run / Judge Flow

Recommended review path for judges:

1. Install an Android wallet that supports Mobile Wallet Adapter
2. Launch the PrivateDAO Android app
3. Connect wallet
4. Load live proposals from Testnet
5. Select a proposal
6. Run one of the lifecycle actions that matches the current phase
7. Verify the resulting signature in Solscan Testnet explorer

## Relation To The Current Web Product

The web/docs surface remains the main live public frontend.

The Android-native app is:

- a mobile-native counterpart
- Android-first
- wallet-native
- protocol-faithful

It does not replace the web frontend and does not change the on-chain protocol.
