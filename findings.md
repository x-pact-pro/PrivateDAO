# Track D and Track E findings

Ordered by severity. Status is `OPEN` or `FIXED` on this branch. No secrets, signatures, funded actions, Firebase, Privy, AWS, DNS, deploys, or history rewrites were performed.

Release recommendation: **NOT READY** for a production or Play-signed claim. The release variant can now be signed from outside git, and the Tokio and webpki patch bumps below are applied, but the distributed APK is still the debug build and two Rust advisories have no compatible upgrade.

## High

### OPEN — `crypto-bigint` 0.5.5 timing side channel (`RUSTSEC-2026-0387`)

`cargo audit` reports secret-dependent branches in operations that are meant to be constant-time (subtraction, zero counting, division, Montgomery multiplication, and some equality and invert paths). Patched versions are `>=0.7.6`. Crates.io shows `0.7.6` through `0.7.8` yanked; the newest non-yanked patched release found was `0.7.10`.

`cargo tree -i crypto-bigint` reaches it only through the auction program:

`privatedao-auction` → `ephemeral-rollups-sdk` 0.17.3 → `solana-program` 3.0.0 → `solana-secp256k1-recover` 3.3.0 → `k256` 0.13.4 → `elliptic-curve` 0.13.8 → `crypto-bigint` 0.5.5

`cargo update -p crypto-bigint --precise 0.7.6` fails because `elliptic-curve` 0.13.8 requires the 0.5 line. A direct bump is not safe. The owner needs a `k256` / `elliptic-curve` / `solana-program` release that depends on `crypto-bigint` `>=0.7.10` before this advisory can be cleared inside this workspace.

### OPEN — `rkyv` 0.7.46 archive out-of-bounds read (`RUSTSEC-2026-0235`)

`cargo audit` reports that checked `rkyv` access of archives containing `Rc` or `Arc` can skip pointee validation and read out of bounds. `0.7.46` already contains the earlier OOM fix (`RUSTSEC-2026-0001`, patched `>=0.7.46, <0.8.0`). The remaining advisory is patched only in `>=0.8.17`. Upstream no longer supports the 0.7 series. The newest non-yanked 0.8 release found was `0.8.18`.

`cargo tree -i rkyv`:

`privatedao-auction` → `ephemeral-rollups-sdk` 0.17.3 → `magicblock-delegation-program-api` 3.1.0 → `rkyv` 0.7.46 (`^0.7.45`)

`cargo update -p rkyv --precise 0.8.17` fails on that requirement. Do not force a 0.8 bump in this repo. The safe fix is a MagicBlock delegation-program release that moves to `rkyv` `>=0.8.17` (preferably `0.8.18`) and a matching `ephemeral-rollups-sdk` update. Until then, do not feed untrusted `rkyv` archives to this dependency.

### OPEN — The file reviewers download is still the debug APK

The attached APK, `artifacts/android/PrivateDAO-android-testnet-debug.apk`, and `downloads/PrivateDAO-android-testnet-debug.apk` share SHA-256 `00b55e1b0db3696a6aaae4bd418affe35e7c56fea9929c121c3cf3c9b91a8869`. Package `io.xpact.privatedao.android`, version `1.2.0-testnet` (version code 3). UTF-16 strings in that debug manifest include `debuggable`, `PreviewActivity`, `ComponentActivity`, and the three `androidx.test.core.app.InstrumentationActivityInvoker` activities. Those activities are merged by `debugImplementation` of `androidx.compose.ui:ui-tooling` and `ui-test-manifest`. They are expected in a debug APK and are a release blocker only if that APK is shipped as production.

This branch does not replace or re-sign that artifact. `./gradlew :app:signingReport` now shows:

- `debug`: `debuggable=true`, debug signing config
- `release`: `debuggable=false`, `signingConfig=null` when no credentials are present

`releaseCompileClasspath` contains no `ui-tooling`, `ui-tooling-preview`, `ui-test-manifest`, or `androidx.test` entries. The same artifacts are direct dependencies of `debugCompileClasspath`.

## Medium

### OPEN — Paid Agent Exchange checkout does not bind or decode the server transaction

`apps/web/src/components/wallet-paid-service-panel.tsx` checks that the challenge network is Solana mainnet, then calls `signTransaction` on `accepted.extra.transaction`. It does not compare `accepted.amount` with the catalog price, and it does not decode the unsigned instructions for mint, recipient, or program before the wallet prompt. The human still has to approve in the connected wallet, and the service input JSON is typed by that human rather than taken from agent prose. A compromised or mismatched challenge can still present a different spend than the listed price. No change was made to the signing path.

`apps/web/src/components/wallet-transfer-panel.tsx` is stricter: the asset is only SOL or the pinned mainnet USDC mint, the recipient and amount are shown in the page, and `sendTransaction` is the explicit approval. `packages/privatedao-runtime/src/wallet-security.ts` rejects actions outside asset, network, destination, per-action, and daily allowlists, and it requires a distinct approver above the policy threshold. Autonomous mode stays disabled unless the stored policy has managed signing and a destination allowlist. Those checks passed locally (commands below). They do not inspect the bytes inside an x402 challenge.

### FIXED — Jupiter order responses no longer return an executable swap transaction

`apps/web/src/app/api/jupiter/order/route.ts` called Jupiter `/swap/v2/order` and returned `raw`, including `transaction`, whenever `JUP_API_KEY` was present. The treasury UI previews quotes and does not sign that field, but the bytes were still in the HTTP response. The route now deletes `transaction`, sets `summary.transactionAvailable` to `false`, and sets `executionBoundary` to `quote-only-no-order-transaction-until-server-api-key`. The same strip is applied in `scripts/run-read-node.ts`. The read-node quote fallback still reports `mode: "quote-only"`. The successful order summary still returns router, amounts, and request id, without the unsigned transaction and without flipping that fallback's execution-boundary contract.

The API key remains a server-side header. The missing-key response names the variable and does not include a value.

### FIXED — `rustls-webpki` 0.103.15 and `webpki-roots` 1.0.9

`cargo audit` also reported `RUSTSEC-2026-0382` (`rustls-webpki`, patched `>=0.103.16`) and `RUSTSEC-2026-0381` (`webpki-roots`, patched `>=1.0.10`). Both are on the `privatedao-zcash-orchard` graph through `rustls` and `tonic`. `cargo update --precise` moved only those two crates. They no longer appear in `cargo audit` vulnerabilities.

## Low

### OPEN — PrivatePAY checkout reviews amount and network, then relies on the wallet prompt

`apps/web/src/components/privatepay-x402-checkout.tsx` refuses a challenge whose network is not Solana mainnet or whose amount differs from the amount the human entered. It then deserializes the unsigned transaction and calls `signTransaction`. The page tells the user to review the recipient in the wallet. The app does not decode the recipient or mint itself before that prompt.

### OPEN — Mobile Wallet Adapter auth token is stored in plain app preferences

`apps/android-native/app/src/main/java/io/xpact/privatedao/android/wallet/WalletSessionStore.kt` writes the MWA `authToken` with `MODE_PRIVATE` SharedPreferences. The manifest sets `android:allowBackup="false"` and `android:fullBackupContent="false"`. The token is not logged. It is not a seed or private key, and a rooted device can still read it. No EncryptedSharedPreferences change was made in this pass.

### FIXED — `tokio` 1.53.1 I/O-safety unsoundness (`RUSTSEC-2026-0386`)

`cargo audit` classifies this as an unsoundness warning, not a vulnerability: `AsyncFd` constructors accept any `AsRawFd`. Patched ranges are `>=1.51.6, <1.52.0` and `>=1.53.3`. The yanked `1.54.0` interval race (`RUSTSEC-2026-0384`) does not affect `1.53.1` or `1.53.3`.

`cargo tree -i tokio` shows a single `tokio` 1.53.1 crate, required directly by `privatedao-zcash-orchard` and by `tonic` 0.14.6 / `hyper` on that same crate. `cargo update -p tokio --precise 1.53.3` changes only that crate. `1.54.1` is newer and also patched, and it was not selected so the lockfile stays on the installed minor and avoids the yanked `1.54.0`. After the bump, `RUSTSEC-2026-0386` is absent from `cargo audit`.

## Informational

### FIXED — EVM session copy now says read-only

`/wallet/` loads Solana mainnet balances and the SOL/USDC transfer panel. It does not render an EVM send form. The only EVM session component, `apps/web/src/components/evm-wallet-session-panel.tsx`, lists test networks and never sends a transaction. Its heading and status text now say the session is read-only and does not create a transfer, swap, approval, or signature. Ethereum, Base, and Arbitrum mainnet balances are not shown there.

### No deep-link filters were added

`AndroidManifest.xml` exports only `MainActivity`, and only for `MAIN` / `LAUNCHER`. `MainActivity` does not read an incoming `VIEW` URI. Wallet deep-link copy in the web app refers to external wallet apps. The product note about "mobile deep-link resilience" is a future mainnet-closure item, not a defined scheme or verified host. Adding a `BROWSABLE` filter without that host would export the activity more broadly, so none was added.

### Secrets in the reviewed wallet paths

Wallet transfer, PrivatePAY, and paid-service components do not log private keys, seeds, or API keys. `JUP_API_KEY` is read only on the server. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and the treasury token-program ids are public client values, not signing keys. Android source has no `Log.*` calls of the auth token. No keystore or signing password was committed. Release signing reads only:

- `PDAO_RELEASE_STORE_FILE`
- `PDAO_RELEASE_STORE_PASSWORD`
- `PDAO_RELEASE_KEY_ALIAS`
- `PDAO_RELEASE_KEY_PASSWORD`

from the environment or Gradle properties. `*.jks`, `*.keystore`, and `keystore.properties` are ignored under `apps/android-native/`. With those variables unset, release signing stays null. With them set to a temporary keystore outside the repo, `:app:signingReport` selected `Config: release` and that file was deleted afterward.

### Audit warnings left unchanged

`cargo audit` still warns that `atomic-polyfill` 1.0.3, `bincode` 1.3.3, and `libsecp256k1` 0.6.0 are unmaintained, that `rand` 0.7.3 is unsound with a custom logger (`RUSTSEC-2026-0097`), and that `js-sys` 0.3.88 and `wasm-bindgen` 0.2.111 are yanked. Those were not part of the requested bump set and were not changed.

## Commands and results

| Command | Result |
| --- | --- |
| `sha256sum` of the attached APK and both repository copies | `00b55e1b0db3696a6aaae4bd418affe35e7c56fea9929c121c3cf3c9b91a8869` |
| `cargo +stable tree -i crypto-bigint` | path through `privatedao-auction` shown above |
| `cargo +stable tree -i rkyv` | path through `magicblock-delegation-program-api` shown above |
| `cargo +stable tree -i tokio` | `tokio` 1.53.1, then 1.53.3 after the bump, via `privatedao-zcash-orchard` |
| `cargo +stable audit` before bumps | vulnerabilities: `crypto-bigint`, `rkyv`, `rustls-webpki`, `webpki-roots`; unsound warning: `tokio` 1.53.1 |
| `cargo +stable update -p crypto-bigint --precise 0.7.6` | failed, exit 101, requirement stays on `elliptic-curve` 0.13.8 |
| `cargo +stable update -p rkyv --precise 0.8.17` | failed, exit 101, `magicblock-delegation-program-api` requires `^0.7.45` |
| `cargo +stable update -p tokio --precise 1.53.3` | lockfile-only update |
| `cargo +stable update -p rustls-webpki --precise 0.103.16` | lockfile-only update |
| `cargo +stable update -p webpki-roots --precise 1.0.10` | lockfile-only update |
| `cargo +stable audit` after bumps | exit 1; remaining vulnerabilities are only `crypto-bigint` 0.5.5 and `rkyv` 0.7.46 |
| `cargo +stable test -p privatedao-zcash-orchard -p privatedao-auction` | exit 0; auction 1 passed; orchard 3 passed |
| `npm ci --ignore-scripts` | exit 0 |
| `npm run test:wallet-security-layer` | exit 0, `wallet security layer: PASS` |
| `npm run test:wallet-security:autonomous-gateway` | exit 0, managed signing, caller payload ignored, receipt PASS |
| `npm run test:wallet-security:b2b-b2c-gateway` | exit 0, approval separation, consumer policy, server signing, receipts PASS |
| `npm run test:wallet:zallet-safety` | exit 0, no broadcast attempted |
| `./gradlew :app:signingReport` with no release credentials | release `debuggable=false`, `signingConfig=null` |
| `./gradlew :app:dependencies --configuration releaseCompileClasspath` | no tooling or test artifacts |
| `./gradlew :app:signingReport` with a temporary external keystore | release config selected that file; file deleted; not committed |

`feat/pdao-wallet-cinematic-ux` was not on `origin` at review time (`git fetch` and the GitHub branch API both missed it). This branch was cut from the checked-out tree that already contains `apps/android-native` version `1.2.0-testnet` and the wallet routes above. Commit `92bc24e64b28568416d998e2091f1ec7409cca6a` from the scope file is not in this clone.
