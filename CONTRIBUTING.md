# Contributing

## Development flow

1. Create a feature branch from `main`.
2. Run `yarn install`.
3. Run `bash scripts/verify.sh` before opening a PR.
4. Keep commits focused and include test evidence in PR.

## Code quality expectations

- No unfinished markers or non-production demo logic.
- Keep docs aligned with executable code.
- Prefer deterministic tests and explicit errors.

## PR checklist

- [ ] `anchor build` passes
- [ ] `anchor test` passes
- [ ] `scripts/verify.sh` passes
- [ ] Docs updated for behavioral changes

Keep changes small, evidence-backed, and aligned with the current live
surface. Do not commit secrets, wallet material, authenticated endpoints,
generated local state, or unrelated build output. Separate testnet evidence
from mainnet identity and production claims.

Production deployment, wallet signing, and funded transactions require the
existing owner approval and release process.
