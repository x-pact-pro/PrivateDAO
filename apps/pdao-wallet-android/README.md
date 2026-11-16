# PDAO Wallet Android Beta

Clean-room native Android beta for the PDAO Wallet product surface. It does not reuse the repository's legacy `apps/android-native` application.

## Real integrations

- Solana Mainnet JSON-RPC balance reads for public addresses.
- Live BTC, ETH and SOL pricing from CoinGecko.
- Live Agent Exchange catalog discovery from `https://agents.privatedao.org/api/services`.
- PrivatePAY x402 and wallet actions are handed to the production web surface for explicit wallet approval.
- Official venue handoffs for Pump.fun, GMGN, Moonshot and Telegram.

The app never accepts seed phrases or private keys. A venue handoff is not presented as an order-routing API integration.

## Build

```bash
./gradlew --no-daemon clean assembleRelease
```

The unsigned release APK is written under `app/build/outputs/apk/release/`. Production signing must happen outside the repository.
