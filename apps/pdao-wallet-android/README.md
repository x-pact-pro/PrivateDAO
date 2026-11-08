# PDAO Wallet Android — design beta 0.1.0

Independent Android application ID: `org.privatedao.wallet`. Does not replace or modify `apps/android-native` (the existing governance app).

## Current implementation

- Fully native Jetpack Compose dark premium design
- Home, Assets, Explore, and Safety screens
- Links to existing live wallet, PrivatePAY, and Agent Exchange
- No invented balances, fake swaps, transaction signing, private-key storage or secret embedding
- Security-first surface explicitly communicates preview-only limitations

## Authentication integration roadmap (not implemented in this beta)

Existing web wallet uses `@privy-io/react-auth`. Do not copy a web session cookie into the APK.
The Descope project exists, but its native auth Flow and backend JWT audience/issuer have not been deployed.
Before enabling native auth, select a single identity source of truth; if using Descope, integrate native Kotlin SDK or Android OIDC, verify issuer/audience/signature in AWS gateway/backend, and bind identities to wallet public keys through explicit signed challenges. Keep Privy web login unchanged until coexistence is verified.

## Build

On Linux with Android SDK, Java 17, and Android command-line tools:

```sh
cd apps/pdao-wallet-android
gradle :app:assembleDebug
```

Or use the dedicated GitHub Actions workflow `pdao-wallet-android-beta.yml` attached in the pull request. Its APK is an unsigned-for-store debug artifact for tester installation; not a production release.

## Release blockers

Native Privy/Descope login, user identity mapping, backend authorization, secure account storage, Mobile Wallet Adapter / embedded-wallet integration, Mainnet RPC safety, transaction simulation, comprehensive security tests, device QA, release signing, Play Store review. Do not claim full transactional wallet readiness.
