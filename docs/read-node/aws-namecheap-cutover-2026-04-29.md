# AWS / Namecheap Read-Node Cutover

Date: 2026-04-29

This is the shortest production-style path for making `/api/v1` real while keeping the frontend build unchanged.

## Target Shape

- Canonical frontend: `https://privatedao.org/`
- Read-node API: `https://api.privatedao.org/api/v1/*`
- Health: `https://api.privatedao.org/healthz`
- Metrics: `https://api.privatedao.org/api/v1/metrics`
- Private settlement endpoint: `POST https://api.privatedao.org/api/v1/private-settlement/intent`
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
```

If Umbra or Cloak relay credentials are available, add only server-side values:

```text
UMBRA_RELAY_URL=
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
curl -fsS -X POST https://api.privatedao.org/api/v1/private-settlement/intent \
  -H 'Content-Type: application/json' \
  -d '{"rail":"umbra","operationType":"private-payroll","asset":"USDC","amount":"1","recipient":"RecipientWalletxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}'
```

## Web Environment

Set the frontend public endpoint to:

```text
NEXT_PUBLIC_PRIVATE_DAO_READ_NODE_ENDPOINT=https://api.privatedao.org
```

The web workbench will then forward private settlement intents to the hosted read-node endpoint.
