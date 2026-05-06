# AWS / Namecheap Read-Node Cutover

Date: 2026-04-29

This is the shortest production-style path for making `/api/v1` real while keeping the frontend build unchanged.

## Target Shape

- Canonical frontend: `https://privatedao.org/`
- Read-node API: `https://api.privatedao.org/api/v1/*`
- Health: `https://api.privatedao.org/healthz`
- Metrics: `https://api.privatedao.org/api/v1/metrics`
- Private settlement endpoint: `POST https://api.privatedao.org/api/v1/private-settlement/intent`
- Umbra relayer health: `GET https://api.privatedao.org/api/v1/umbra/relayer/health`
- Umbra claim status proxy: `GET https://api.privatedao.org/api/v1/umbra/claims/{request_id}`
- QVAC proof endpoint: `GET https://api.privatedao.org/api/v1/qvac/runtime-proof`

## AWS Host

Use one small Ubuntu EC2 instance in `eu-north-1`.

Required inbound rules:

- TCP `22` from operator IP only.
- TCP `80` from `0.0.0.0/0`.
- TCP `443` from `0.0.0.0/0`.

Install on the host:

```bash
sudo apt-get update
sudo apt-get install -y git docker.io docker-compose-plugin
sudo usermod -aG docker ubuntu
```

Then:

```bash
git clone https://github.com/X-PACT/PrivateDAO.git
cd PrivateDAO
cp deploy/primary-host/.env.example deploy/primary-host/.env
```

Set:

```text
PRIMARY_DOMAIN=api.privatedao.org
ACME_EMAIL=ops@privatedao.org
PRIMARY_EDGE_HTTP_BIND_PORT=80
PRIMARY_EDGE_HTTPS_BIND_PORT=443
PRIVATE_DAO_READ_ALLOWED_ORIGIN=https://privatedao.org
PRIVATE_DAO_PROGRAM_ID=EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva
SOLANA_CLUSTER=testnet
```

Umbra devnet relayer readiness is public and should be set server-side:

```text
UMBRA_RELAYER_API_ENDPOINT=https://relayer.api-devnet.umbraprivacy.com
```

If a project-owned Umbra claim proxy or Cloak relay is available, add only server-side values:

```text
UMBRA_CLAIM_PROXY_URL=
UMBRA_API_KEY=
CLOAK_RELAY_URL=
CLOAK_API_KEY=
```

Never place wallet keypairs, seed phrases, or treasury authority keys in this host.

## Namecheap DNS

Create:

```text
Type: A
Host: api
Value: <EC2_PUBLIC_IPV4>
TTL: Automatic
```

Do not move the apex `privatedao.org` until the API subdomain is healthy.

## Deploy

```bash
npm ci
PRIVATE_DAO_SKIP_SOURCE_PREFLIGHT=1 npm run deploy:primary-host:up
```

## Verify

```bash
curl -fsS https://api.privatedao.org/healthz
curl -fsS https://api.privatedao.org/api/v1/runtime
curl -fsS https://api.privatedao.org/api/v1/metrics
curl -fsS https://api.privatedao.org/api/v1/qvac/runtime-proof
curl -fsS https://api.privatedao.org/api/v1/umbra/relayer/info
curl -fsS https://api.privatedao.org/api/v1/umbra/relayer/health
curl -fsS -X POST https://api.privatedao.org/api/v1/private-settlement/intent \
  -H 'Content-Type: application/json' \
  -d '{"rail":"umbra","operationType":"private-payroll","asset":"USDC","amount":"1","recipient":"RecipientWalletxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}'
```

The hosted read node must report the current Anchor 1.0.1 Testnet program:

```bash
curl -fsS https://api.privatedao.org/healthz \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);const got=j.runtime.programId;const want='EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva';if(got!==want){console.error(`program drift: ${got} != ${want}`);process.exit(1)}console.log(`program aligned: ${got}`)})"
```

If this check fails on the EC2 host, update the stack env and rebuild:

```bash
cd PrivateDAO
git pull --ff-only
cp deploy/primary-host/.env.example deploy/primary-host/.env
sed -i 's#^PRIMARY_DOMAIN=.*#PRIMARY_DOMAIN=api.privatedao.org#' deploy/primary-host/.env
sed -i 's#^PRIMARY_EDGE_HTTP_BIND_PORT=.*#PRIMARY_EDGE_HTTP_BIND_PORT=80#' deploy/primary-host/.env
sed -i 's#^PRIMARY_EDGE_HTTPS_BIND_PORT=.*#PRIMARY_EDGE_HTTPS_BIND_PORT=443#' deploy/primary-host/.env
sed -i 's#^PRIVATE_DAO_PROGRAM_ID=.*#PRIVATE_DAO_PROGRAM_ID=EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva#' deploy/primary-host/.env
sed -i 's#^SOLANA_CLUSTER=.*#SOLANA_CLUSTER=testnet#' deploy/primary-host/.env || printf '\nSOLANA_CLUSTER=testnet\n' >> deploy/primary-host/.env
PRIVATE_DAO_SKIP_SOURCE_PREFLIGHT=1 npm run deploy:primary-host:up
npm run verify:remote-primary-host -- https://api.privatedao.org
```

After a real SDK-generated claim returns a `request_id`, poll:

```bash
curl -fsS https://api.privatedao.org/api/v1/umbra/claims/<request_id>
```

Polling policy: every 3 seconds, stop at `completed`, `failed`, or `timed_out`, and use a 120-second operator timeout.

## Web Environment

Set the frontend public endpoint to:

```text
NEXT_PUBLIC_PRIVATE_DAO_READ_NODE_ENDPOINT=https://api.privatedao.org
```

The web workbench will then forward private settlement intents to the hosted read-node endpoint.
