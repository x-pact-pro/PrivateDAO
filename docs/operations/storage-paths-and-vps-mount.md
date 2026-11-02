# PrivateDAO Storage Paths and VPS Mount

Status: operational path record, not a deployment authorization.

## Authoritative source boundaries

- PrivateDAO source of truth: `/home/x-pact/PrivateDAO-WALLET-PRODUCTION` and its approved GitHub branch/PR.
- Agent Exchange standalone review repository: `https://github.com/x-pact-pro/PrivateDAO-Agent-Exchange`.
- AWS, MongoDB, GitHub Actions, and hosted domains remain the production authorities. The VPS mount is not a replacement for those systems.
- Institutional PrivateDAO, kernel, network, and product boundaries must not be copied, deleted, or redirected through this mount without a separate release decision.

## SSHFS mount

The verified local mount is:

```bash
sshfs -o IdentityFile=/home/x-pact/.ssh/privatedao_vps_ed25519 \
  -o IdentitiesOnly=yes,reconnect,ServerAliveInterval=15,ServerAliveCountMax=3 \
  pdaoops@13.140.171.66:/home/pdaoops /home/x-pact/VPS
```

Verified mapping:

```text
local:  /home/x-pact/VPS
remote: pdaoops@13.140.171.66:/home/pdaoops
status: mounted and readable
```

Check or remove the mount locally:

```bash
mountpoint /home/x-pact/VPS
fusermount3 -u /home/x-pact/VPS
```

## VPS storage layout

Use the following non-secret storage area for operational evidence:

```text
/home/x-pact/VPS/workspaces/pdao-ops/
├── artifacts/   build packages, test reports, and release bundles
├── logs/        bounded operational logs without credentials or payload secrets
└── manifests/   checksums, deployment manifests, and run metadata
```

The corresponding remote path is `/home/pdaoops/workspaces/pdao-ops/`.

The existing VPS checkout is:

```text
/home/x-pact/VPS/workspaces/privatedao-commercial
```

It is retained as a remote working copy/reference. It must not be treated as the canonical GitHub source, and it must not be used as an automatic production deployment source.

## Local and temporary paths

```text
PrivateDAO wallet checkout: /home/x-pact/PrivateDAO-WALLET-PRODUCTION
Agent Exchange extraction worktree: /tmp/PrivateDAO-Agent-Exchange-work
VPS web build area: /home/x-pact/VPS/web-build
VPS download area: /home/x-pact/VPS/download
```

The `/tmp` extraction worktree is disposable and is not a backup. Preserve committed work in GitHub before removing it.

## Storage rules

1. Never copy `.env`, seed phrases, private keys, signing shares, AWS credentials, GitHub tokens, MongoDB credentials, or wallet exports to the VPS storage area.
2. Store only redacted reports, checksums, unsigned transaction artifacts, public metadata, and bounded logs.
3. Do not run funded transactions from an artifact stored on the VPS without the user reviewing and approving the exact transaction in a wallet.
4. Do not switch AWS Lambda, API Gateway, DNS, MongoDB, or hosted routing to the VPS path.
5. Before using the path, verify `mountpoint /home/x-pact/VPS`; a plain local directory with the same name is not the VPS.
