# Sealkeeper SEAL Read-only PoC

This is an isolated technical adapter for reading Sealkeeper credentials as an optional reputation signal. It is not a commercial partnership announcement, does not change the Agent Exchange's primary agent rating, and is disabled by default.

## Runtime boundary

- Module: `src/sealkeeper.mjs`
- Feature flag: `SEAL_REPUTATION_ENABLED=false`
- Internal endpoint when explicitly enabled: `POST /api/internal/sealkeeper/verify`
- Required input: `{ "agent_id": "<raw Sealkeeper agent id>" }`
- Optional input: `seal_url`, `handshake`, `nonce`, `aud`, and `include_tasks`
- No public badge is emitted and no seller permission depends on SEAL validity.

The endpoint resolves a raw agent id to Sealkeeper's canonical API URL. A supplied URL is accepted only on `https://api.sealkeeper.run` and only under the `/v1/agents/.../seal` route. Redirects are rejected. Upstream failures return a structured `accepted: false` result rather than failing Agent Exchange operations.

## Verification model

The adapter follows the official reader guidance:

1. Parse the compact JWS and require `alg=EdDSA` with a `kid`.
2. Fetch the official Ed25519 key document and cache it for no more than five minutes. An unknown `kid` forces one refresh for key rotation.
3. Verify the exact ASCII `header.payload` bytes before reading the signed payload.
4. Require `iss=sealkeeper.run`, `ver` 1 through 5, an unexpired `exp`, an `iat` no more than 300 seconds ahead, and the expected `sub`.
5. Read task evidence separately from credential validity. `level=none`, zero trust counts, and `countsForTrust=false` are valid test-agent outcomes and are not converted into a positive reputation claim.
6. When a live nonce handshake is supplied, the adapter delegates the handshake comparison to Sealkeeper's documented `/v1/seal/verify` endpoint with the verifier audience. The handshake result remains separate from credential validity.

## Result fields

The normalized response separates:

- `credentialValidity`: signature, issuer, version, expiry, and key id.
- `reputationLevel`: level, dimension scores, counts, trust, and `countsForTrust`.
- `taskEvidence`: safe task identifiers and verification metadata, without private task submissions.
- `identityVerification`: whether a supplied nonce handshake matched.

## Test commands

From this directory:

```sh
npm test
npm run lint
SEALKEEPER_RUN_LIVE_TESTS=1 npm test -- test/sealkeeper.mjs
```

The default test suite is offline and deterministic. The live fixture test is opt-in so CI is not coupled to GitHub or Sealkeeper availability. It uses the official fixture key document and tests valid, expired, bad-signature, and unknown-key cases at the fixture clock.

## Official references

- [SEAL reader guide](https://sealkeeper.run/docs/seal-reader)
- [SEAL format](https://github.com/sealkeeper-dev/cli/blob/main/docs/seal.md)
- [Verification guide](https://sealkeeper.run/docs/verify-a-seal)
- [Official fixtures](https://github.com/sealkeeper-dev/cli/tree/main/fixtures)
- [Sealkeeper public keys](https://sealkeeper.run/.well-known/seal.json)
- [Test agent](https://sealkeeper.run/agents/sealkeeper/test-agent)
- [Live test-agent SEAL](https://api.sealkeeper.run/v1/agents/sealkeeper/test-agent/seal)
- [Verified tasks](https://api.sealkeeper.run/v1/agents/j2KKg1Ij_Wm_9MP_WAd0jpcdwboD6B1NDGcev5WQV9M/tasks?role=claimant)

## Security review status

The PoC is ready for focused security review of the adapter boundary. It is not a production trust gate: the feature flag is off, no production deployment was made, and a live handshake has not been claimed unless a fresh challenge and agent response are supplied.
