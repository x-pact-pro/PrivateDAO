# PrivateDAO VPS Path Map

This file is the session-start reference for using the mounted VPS as a build and evidence worker.

## Canonical boundaries

```text
Local canonical checkout:
  /home/x-pact/PrivateDAO-WALLET-PRODUCTION

Local SSHFS mount:
  /home/x-pact/VPS

Remote SSHFS source:
  pdaoops@13.140.171.66:/home/pdaoops

Remote reference checkout:
  /home/pdaoops/workspaces/privatedao-commercial

Standalone Agent Exchange repository:
  https://github.com/x-pact-pro/PrivateDAO-Agent-Exchange
```

GitHub, AWS, MongoDB, and hosted domains remain authoritative. The VPS checkout is a build/reference copy, not an automatic deployment source.

Current VPS checkout note: `/home/pdaoops/workspaces/privatedao-commercial` was observed with an invalid Git object (`bad tree object HEAD`). Do not build from it or repair it in place. Use a trusted Git archive or a fresh clone into a disposable build directory.

## Mount and SSH

```bash
sshfs -o IdentityFile=/home/x-pact/.ssh/privatedao_vps_ed25519 \
  -o IdentitiesOnly=yes,reconnect,ServerAliveInterval=15,ServerAliveCountMax=3 \
  pdaoops@13.140.171.66:/home/pdaoops /home/x-pact/VPS

mountpoint /home/x-pact/VPS
ssh -o IdentityFile=/home/x-pact/.ssh/privatedao_vps_ed25519 \
  -o IdentitiesOnly=yes pdaoops@13.140.171.66 hostname
```

The SSH account has NVM with Node `v24.10.0` and npm `11.6.1`. Non-interactive commands must load it first:

```bash
. "$HOME/.nvm/nvm.sh"
nvm use 24.10.0
```

## VPS operational storage

```text
/home/pdaoops/workspaces/pdao-ops/artifacts
/home/pdaoops/workspaces/pdao-ops/logs
/home/pdaoops/workspaces/pdao-ops/manifests
```

Mounted equivalents:

```text
/home/x-pact/VPS/workspaces/pdao-ops/artifacts
/home/x-pact/VPS/workspaces/pdao-ops/logs
/home/x-pact/VPS/workspaces/pdao-ops/manifests
```

Use these directories for redacted build packages, test reports, checksums, and bounded logs. Never place `.env` files, private keys, seed phrases, signing shares, AWS credentials, GitHub tokens, MongoDB credentials, or wallet exports there.

## Build rule

Build on a disposable VPS worktree or a copied release checkout. Do not build by mutating the remote reference checkout in place, and do not switch Lambda, API Gateway, DNS, MongoDB, or hosted routing to the VPS.

Example read-only capability check:

```bash
ssh pdaoops@13.140.171.66 \
  'source "$HOME/.nvm/nvm.sh" && nvm use 24.10.0 >/dev/null && node --version && npm --version && nproc && df -h /home/pdaoops'
```

For funded transactions, keep signing in the user wallet. The VPS may hold unsigned artifacts and redacted evidence only; it must never receive a private signing secret.

Related detailed record: `docs/operations/storage-paths-and-vps-mount.md`.
