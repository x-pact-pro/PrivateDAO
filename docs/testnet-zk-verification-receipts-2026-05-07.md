# Testnet ZK Verification Receipts 2026-05-07

PrivateDAO now has fresh Solana Testnet ZK proof anchors and parallel verification receipts for the same proposal used by the REFHE/Encrypt evidence packet.

## What A Normal User Sees

The user does not need to understand Groth16 or verifier accounts. They only need to see that every sensitive governance step has a proof badge and a transaction link.

## What A Judge Can Verify

- Network: `solana-testnet`
- Program: `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`
- DAO: `2gDRTWaNRjiySVdvqoSXnnUYF8CFSaJUxwG6LBg8P1gG`
- Proposal: `4A2qwBvTKYL9kGzjCNHaSCp8jJXcMRaFxPMWf5NJ2qBt`

## ZK Anchors

- Vote anchor: `https://explorer.solana.com/tx/3Cwj9z3DgFJcSb5pwSKYQjUpszRoH4Zoog5UAMpXnmgiuq6RUE6LSjG18iXzmVabA8QJaBf6LvNtow75UBGQZsPr?cluster=testnet`
- Delegation anchor: `https://explorer.solana.com/tx/tuHLbEMZm4pgGdrxgCZxUtxxoQjvYMpoGPpoua6g7n7oUkjhapnesbSD5pt4haF4uod5oJ3hH5WQ2HXcN7cvkPC?cluster=testnet`
- Tally anchor: `https://explorer.solana.com/tx/5rLNpwLmm2oTL1XzkLTGjbRu2AWWYfKo3yyEkJ4iECry9cqAf1G6mHzDka2jzjj9qGYT6s3gh5dXxdb9kPYN8C48?cluster=testnet`

## Verification Receipts

- Vote receipt: `https://explorer.solana.com/tx/LtFyNrnYzZ8Re2bpYnHZLK5dyzeheY1fJpztLfwweDHKAYezegJLLqDe8s47xqGUVgR2HuJ6hxrWqK9EucGd9Dy?cluster=testnet`
- Delegation receipt: `https://explorer.solana.com/tx/hPr44WmAqnnpf9wPbge3iFrv9BryCfdFBygPiZz8xkaws2FQRk7RtCVMiddTncW4wVSyY2UyGtn7rUV61cY2CPA?cluster=testnet`
- Tally receipt: `https://explorer.solana.com/tx/4574GkTH8f9BCoJTcLKprEegsyeBomDzZubXdTfsaJFyPyH88eQugotpid2LVuqhy2YeMTXjmsNZXLthPyAaYsGC?cluster=testnet`

## Boundary

This packet proves fresh on-chain ZK proof continuity for reviewer verification. It records anchors and parallel verification receipts on Testnet. Verifier-CPI enforcement remains the stricter production mode, while this packet is the user-visible and judge-verifiable proof path.
