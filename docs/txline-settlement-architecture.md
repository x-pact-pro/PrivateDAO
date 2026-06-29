# PrivateDAO Match Settlement Architecture

PrivateDAO Match Settlement is a TxODDS / TxLINE prediction-market settlement workflow.

It connects a sports data source to a private settlement policy and a public verification receipt.

## Flow

1. Fetch a World Cup match from TxLINE.
2. Resolve a market only after the match is final.
3. Hash the TxLINE match snapshot.
4. Bind the snapshot to a hidden settlement policy.
5. Generate a Groth16 proof through the existing PrivateDAO Blind Policy circuit.
6. Return a public proof package.
7. Verify the package by recomputing the hash and checking the Groth16 proof.
8. Store receipt hashes on Solana through a Memo receipt.

## Provider Boundary

If `TXLINE_SESSION_JWT` and `TXLINE_API_TOKEN` exist, the backend calls the configured `TXLINE_API_BASE`.

If either value is missing, the backend returns `simulated-txline-provider` data. Simulated data is only for demo filming, product explanation, and judge testing before the wallet-signed TxLINE activation finishes. It is never labeled as live TxLINE data.

The product exposes `POST /api/v1/txline/guest/start` to begin the documented free TxLINE API path. This returns the guest JWT from `https://txline.txodds.com/auth/guest/start`. The remaining activation step must be wallet-signed against TxLINE's subscription flow and must return the real `TXLINE_API_TOKEN`.

Revenue, receipt fees, and settlement payment routing for this product use:

`4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD`

## Public Proof Fields

- proofId
- nonce
- matchId
- marketId
- txlineSnapshotHash
- txlineProofHash, when available
- settlementPolicyCommitment
- outcomeCommitment
- inputCommitment
- circuitId
- circuitVersion
- policyVersion
- issuedAt
- expiresAt
- groth16Proof
- verificationKeyHash
- originalProofHash

## What Stays Private

- Internal settlement policy
- Market maker exposure rules
- Risk thresholds
- Payout routing logic
- Operator review notes

## What Becomes Verifiable

- TxLINE snapshot hash
- Match final status
- Market ID
- Outcome commitment
- Settlement policy commitment
- Groth16 proof material
- Public receipt hash
- Solana Memo receipt transaction

## Solana Receipt Design

The current shipping receipt stores hashes only:

- proofIdHash
- matchIdHash
- marketIdHash
- txlineSnapshotHash
- settlementPolicyCommitment
- outcomeCommitment
- verificationKeyHash
- originalProofHash

The Solana receipt is a Memo receipt. It is not a claim of full Groth16 pairing verification on-chain.

## Truth Boundary

Current live claim:

- TxLINE-compatible provider boundary.
- Free TxLINE guest JWT initiation.
- Simulated provider when credentials are absent.
- Groth16 proof generation and verification through PrivateDAO's Blind Policy circuit.
- Public proof package verification.
- Solana Memo receipt submission when the configured Solana RPC and authority wallet can submit transactions.

Not claimed:

- Full on-chain Groth16 verification.
- Custodial payout execution.
- Guaranteed TxLINE live data without `TXLINE_API_TOKEN`.
- Wallet-signed TxLINE subscription activation without the actual wallet signature and returned API token.
- Regulatory settlement certification.
