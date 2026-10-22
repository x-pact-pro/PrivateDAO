# SealKeeper SEAL Read-only PoC Report

Date: 2026-10-16
Branch: `codex/sealkeeper-seal-readonly-poc`
Scope: Agent Exchange only. The original PoC did not perform a production
deployment, merge, payment, signing, or transaction. PrivateDAO Agent
Exchange is SealKeeper's design and integration partner; this report covers
the read-only technical integration and does not turn the partnership into a
certification or authorization claim.

## Implementation result

PASS: isolated SEAL reader added in `src/sealkeeper.mjs`.

PASS: Ed25519 JWS verification, `kid` lookup, issuer/version/subject/time checks, five-minute public-key cache, rotation refresh, SSRF/redirect restrictions, bounded responses, structured failure, and optional handshake verification are implemented.

PASS: The configured clock-skew bound is enforced, nonce handshakes are protected against same-runtime replay, and verified task records follow the documented cursor pagination with a bounded page limit.

PASS: internal API added at `POST /api/internal/sealkeeper/verify`, protected
by `SEAL_REPUTATION_ENABLED=false` by default and the existing admin smoke
header when enabled. Production enablement is an explicit runtime opt-in;
the public service remains optional and read-only.

PASS: credential validity, reputation level, task evidence, and identity verification are returned as separate fields. The primary Agent Exchange rating and authorization paths are unchanged.

PASS: official fixture coverage includes valid, expired, bad-signature, unknown-key, and version-4 handshake cases. The network fixture test is opt-in so ordinary CI does not depend on external availability.

## Live SealKeeper test-agent evidence

Endpoint: `https://api.sealkeeper.run/v1/agents/sealkeeper/test-agent/seal`
Raw agent id verified: `j2KKg1Ij_Wm_9MP_WAd0jpcdwboD6B1NDGcev5WQV9M`

- Credential validity: PASS
- Issuer: `sealkeeper.run`
- SEAL version observed: `1`
- Key id observed: `k1`
- Reputation level: `none`
- Scores: null for reliability and provenance
- Trust counts: zero
- `countsForTrust`: false
- Verified task records read: 2 (cursor-aware reader; no second page was advertised)
- Identity handshake: NOT REQUESTED; no challenge was sent to the agent

The zero-count, `level=none` result is the intended official test-agent outcome. It is a valid credential with neutral/no standing, not a positive reputation claim.

## Validation

- Lambda lint: PASS
- Lambda unit/integration suite: `81 PASS / 0 FAIL / 1 SKIP` (the skip is the opt-in live fixture test)
- Official read fixtures: `8 PASS / 0 FAIL`, covering checking, no-recent-check, no-seal, not-found, rate-limited, renamed, validation-failed, and withheld responses.
- Official live fixtures: `13 PASS / 0 FAIL / 0 SKIP`, including valid, expired, bad-signature, unknown-key, version-4 handshake, and fixture identity assertions
- Official CLI comparison: PASS; `npx sealkeeper@latest seal verify` exited `0` for the live test-agent SEAL.
- Lambda package build: PASS; compressed package integrity check PASS
- Repository quality gate: PASS
- Repository security gate: PASS; existing allowed Rust advisories remain unchanged
- General repository build: NEEDS ACTION outside this PoC because the local deploy-keypair guard blocks `npm run build` when three existing program keypairs are absent

## Security-review status

READY FOR FOCUSED SECURITY REVIEW: YES

PRODUCTION ENABLEMENT: NOT DEPLOYED. The feature flag remains off by default,
and the live test-agent call plus focused security/fixture suite do not prove
that the current production runtime has been configured or deployed.

The adapter is suitable for focused review as a read-only, optional signal. It
must not be treated as a production trust gate until reviewers examine
key-cache invalidation, handshake challenge lifecycle, route authentication,
and the policy for attaching SEAL metadata to registered agents. Deliberate
production enablement still requires `SEAL_REPUTATION_ENABLED=true`, a
reviewed live agent identity, deployment evidence, and a post-deployment smoke
check.

## Requested agent coverage

The supplied live target is SealKeeper's official `test-agent` (raw id `j2KKg1Ij_Wm_9MP_WAd0jpcdwboD6B1NDGcev5WQV9M`). No Carl agent id or endpoint was supplied, so Carl was not tested and is not claimed as verified.

## Files changed

- `src/sealkeeper.mjs`
- `src/config.mjs`
- `src/handler.mjs`
- `test/sealkeeper.mjs`
- `docs/sealkeeper-seal-readonly-poc.md`
- `docs/sealkeeper-seal-readonly-poc-report-2026-10-16.md`
