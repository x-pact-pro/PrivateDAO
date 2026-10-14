# Devnet Resilience Report

- network: devnet
- program id: `5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx`
- governance mint: ``
- source wallet run: `20260417125017`
- primary rpc healthy: yes
- fallback rpc healthy: yes
- failover recovered: yes
- stale blockhash rejected: yes
- stale blockhash recovered: yes
- unexpected successes: 0

## RPC Health Matrix

- primary: `https://api.devnet.solana.com` | version `4.0.0-beta.6` | blockhash `Fo2MZN2a37UtiLStsLPYGQiyoMfmxnQXZxPXXvjG4Ubu` | version latency 2292 ms | blockhash latency 217 ms
- fallback: `https://api.devnet.solana.com` | version `4.0.0-beta.6` | blockhash `Fo2MZN2a37UtiLStsLPYGQiyoMfmxnQXZxPXXvjG4Ubu` | version latency 1899 ms | blockhash latency 283 ms

## Failover Recovery

- invalid rpc: `http://127.0.0.1:65535`
- invalid rpc error: fetch failed
- fallback rpc: `https://api.devnet.solana.com`
- fallback blockhash: `CUeNZMeZERWcfZ5GNvAMDYNNtviTNVMytkHFGd5sFqFS`
- fallback latency: 479 ms

## Stale Blockhash Recovery

- probe wallet: `89tMZ52oE88nvYKpPYCG73gxK8k32jGLwUo4chMjShFZ`
- stale blockhash: `11111111111111111111111111111111`
- stale error: Simulation failed. 
Message: Transaction simulation failed: Blockhash not found. 
Logs: 
[]. 
Catch the `SendTransactionError` and call `getLogs()` on it for full details.
- fresh blockhash: `2EZpHiHFGNwxc7JyGGiMcgGBou6bu5V3ReeULDr41npY`
- recovered tx: `2Zf7Au24N5AD29cWGUn8E5MQJsGPMvTd4geCeNaYbHcurFJ4M6CkCwXVNwKnmzfrCN8jfkhZTmacid5Z5yoZMNvq`
- recovered explorer: https://solscan.io/tx/2Zf7Au24N5AD29cWGUn8E5MQJsGPMvTd4geCeNaYbHcurFJ4M6CkCwXVNwKnmzfrCN8jfkhZTmacid5Z5yoZMNvq?cluster=devnet
- probe balance before: 78006400
- probe balance after: 78006401
- probe balance delta: 1

## Interpretation

This resilience harness proves that the Devnet operator surface can recover from a dead RPC endpoint and from a transaction assembled with a stale blockhash. The successful path is a rejected stale transaction followed by one recovered transaction on a fresh blockhash, without protocol mutation drift or ambiguous retry behavior.
