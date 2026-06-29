# Release Ceremony Attestation

## Overview

- Generated at: `2026-05-26T05:51:23+03:00`
- Release commit: `c5f7c481e514b627b2a082181f9ad0ce43d5a238`
- Release branch: `main`
- Current Testnet program id: `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`
- Legacy Devnet release program id: `5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx`
- Verification wallet: `4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD`
- Deploy transaction: `2CMEujY1CKnC8rH8BuLy4GvwYk3zfqMfAKaUjybcAvRhS1dnzg3Zd3GeMttBp4vkUbu69GkQtr3TWgbmBqGY8cyC`

## Anchors

- dao: `FZV9KmpeY1B31XvszQypp5T6nQN5C44JDLM4QWBEDvhx`
- governanceMint: `AZUkprJDfJPgAp7L4z3TpCV3KHqLiA8RjHAVhK9HCvDt`
- treasury: `AZUroiNeGAjNdD84eEHnAKHHFwqAFmkjr2g1eoF7Ek5c`
- proposal: `AegjmwkX1FknBJMDyH5yM6BMhyHsiUreNtz3d8iz3QrP`

## Ceremony Documents

- `docs/release-ceremony.md`
- `docs/mainnet-cutover-runbook.md`
- `docs/operator-checklist.md`
- `docs/mainnet-readiness.generated.md`
- `docs/test-wallet-live-proof-v3.generated.md`
- `docs/governance-hardening-v3.md`
- `docs/settlement-hardening-v3.md`
- `docs/deployment-attestation.generated.json`
- `docs/go-live-attestation.generated.json`

## Mandatory Gates

- `npm run verify:live-proof`
- `npm run verify:test-wallet-live-proof:v3`
- `npm run verify:release-manifest`
- `npm run verify:review-links`
- `npm run verify:review-surface`
- `npm run check:mainnet`

## Ceremony Status

- Observed gate count: `63`
- Deployment gate count: `63`
- Go-live decision: `blocked-pending-external-steps`

## Unresolved Blockers

- strategyEngine: `not-in-repo`
- livePerformance: `not-in-repo`
- externalAudit: `pending`
- mainnetRollout: `pending`

## Notes

- This attestation records release discipline, not a claim that mainnet cutover has already happened.
- External audit and organizational custody approvals remain out-of-repo blockers.
- The ceremony surface is reviewer-visible so release rigor can be inspected rather than asserted.
