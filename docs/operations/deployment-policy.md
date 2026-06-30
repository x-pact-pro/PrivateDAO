# PrivateDAO Deployment Policy

Last updated: 2026-06-30

PrivateDAO's live public site is deployed from AWS only.

GitHub is the canonical storage and history repository. It should contain the current live source, documentation, and archived product history, but it is not a publishing target for the production website.

## Production

- Public site: AWS static host for `privatedao.org`
- Runtime API: `api.privatedao.org`
- Database: Supabase
- Chain and data infrastructure: Solana Mainnet, TxLINE, QuickNode where configured

## Disabled Or Manual Targets

- GitHub Pages is disabled as a production deploy path.
- Vercel builds are skipped by `vercel.json`.
- CI, Devnet Canary, Review Automation, and Pages workflows are manual-only.

## Dependency Updates

Dependabot is enabled for npm packages and GitHub Actions. It should open update pull requests, not publish the production site.

Do not commit local secrets, wallet keypairs, PEM files, API keys, Supabase service keys, or the secure local archive.
