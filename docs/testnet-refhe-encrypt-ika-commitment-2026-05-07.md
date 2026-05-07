# Testnet REFHE Encrypt/IKA Commitment 2026-05-07

PrivateDAO now has a fresh Solana Testnet REFHE evidence path for the Encrypt/IKA lane.

The run created a confidential payout proposal, configured a proposal-bound confidential payout plan, configured a REFHE envelope, then settled the envelope with a verifier-program binding.

## Accounts

- Network: `solana-testnet`
- Program: `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`
- DAO: `2gDRTWaNRjiySVdvqoSXnnUYF8CFSaJUxwG6LBg8P1gG`
- Proposal: `4A2qwBvTKYL9kGzjCNHaSCp8jJXcMRaFxPMWf5NJ2qBt`
- Confidential payout plan: `Fh2QcuHaT4g38226HNLtX8CjJBZcaCgnMvYsKb22wuVK`
- REFHE envelope: `CumNJ5NP29vKcKUnJYDXFoYkqcwg4NYnJwLnJrv5QTsF`
- Verifier program binding: `5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx`

## Testnet Transactions

- Create proposal: `https://solscan.io/tx/4CE7KQq3zJ8k5qHTmVcKRzU9u9pikWVuqZBmuRsqgU4W2wF9qWZcr4ditCgpnETsJgoJbgLVvGqyjcN5tZCupweJ?cluster=testnet`
- Configure confidential payout plan: `https://solscan.io/tx/2keEjT5KMUWLQr5XAbkSkhDqabVwRRMdLwp6AeY1G9tTEXainLrAyPqUPs8q4ENUoHCeR7HNdd6DY5h3gVVC46Ye?cluster=testnet`
- Configure REFHE envelope: `https://solscan.io/tx/2HcLDQp9HAViz5q48ZkwxU3wSdy15yCZzWvsVJd2wvXv5KqM1qWQ3ALJEcvD3UiNUxgbq7JUhSo7nzsgEtYXtpup?cluster=testnet`
- Settle REFHE envelope: `https://solscan.io/tx/2SpUhPfrtwgLkgcuB7N86EoUtHPCrNGKu7Q7YHAFUPrB5Ti9AQPS874Yn56eHFnRt2nWWrzjYvrfajahm7Vrnkkg?cluster=testnet`

## Envelope State

- Model URI: `qvac://fabric-llm-finetune/refhe-policy-v1`
- Policy hash: `f8426e50e53785ea21004991ae29b7156ab526f8296469ebdf7ea0fba3008ab9`
- Input ciphertext hash: `d24bd3e1955ad6772c7316ba94afc2517d148270657b09e0547c88b813cab06f`
- Evaluation key hash: `9afd1fbf2ddcb5fc13447105a2ea81752d22ce95a16fc6de2dc44f42f29f06a2`
- Result ciphertext hash: `434d1a5092631b3b86754e790dceeb4ab4249034446e05376460023bfd0ddca5`
- Result commitment hash: `93ce32fc4c72325d75e69153a38a3929a4b7e886e55eebeb198436170396509d`
- Proof bundle hash: `c2f4e1ac6f1e5af28201d27b6015062df64a96b420ce335dd40a4bfecc98fe8a`
- Status: `settled`

## Product Meaning

QVAC is positioned for sensitive local decision support before signing. REFHE/Encrypt is positioned for confidential execution metadata and commitment binding. GoldRush remains the visible treasury intelligence source for wallet and counterparty context.

## Boundary

This is real Testnet account and transaction evidence for the REFHE envelope path. It proves proposal-bound confidential execution metadata and verifier-program binding. It does not claim a full external FHE computation service custody path.
