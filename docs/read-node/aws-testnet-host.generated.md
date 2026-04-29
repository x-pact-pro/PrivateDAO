# PrivateDAO Read-Node AWS Testnet Host

Generated at: 2026-04-29T09:05:17Z
HTTPS enabled at: 2026-04-29T13:25:50Z

## Host

- AWS region: `eu-north-1`
- Instance ID: `i-08accd60a2ff2925a`
- Instance name: `privatedao-read-node-testnet`
- Public IPv4: `13.60.187.225`
- Public DNS: `ec2-13-60-187-225.eu-north-1.compute.amazonaws.com`
- Runtime user: `ec2-user`
- Service manager: `systemd`
- Service name: `privatedao-read-node`
- Reverse proxy: `nginx`
- TLS: Let's Encrypt via `certbot --nginx`

## Network

- Security group: `sg-0d20f35d62f8ff6c4`
- SSH: `22/tcp` from `104.28.162.227/32`
- HTTP: `80/tcp` from `0.0.0.0/0`
- HTTPS: `443/tcp` from `0.0.0.0/0`

## Runtime

- Read-node URL before DNS: `http://13.60.187.225`
- Canonical API URL: `https://api.privatedao.org`
- HTTP behavior: redirects to HTTPS
- Internal app listener: `127.0.0.1:8787`
- Solana runtime RPC: `https://api.testnet.solana.com`
- Program ID: `5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx`
- Umbra relayer endpoint: `https://relayer.api-devnet.umbraprivacy.com`

## Verified Endpoints

- `GET https://api.privatedao.org/healthz`
- `GET https://api.privatedao.org/api/v1/config`
- `GET https://api.privatedao.org/api/v1/umbra/relayer/health`
- `GET https://api.privatedao.org/api/v1/qvac/runtime-proof`
- `POST https://api.privatedao.org/api/v1/private-settlement/intent`

## DNS Next Step

Create or update this Namecheap DNS record after confirming the host remains stable:

- Type: `A`
- Host: `api`
- Value: `13.60.187.225`
- TTL: `Automatic`

After propagation, verify:

```bash
curl -fsS https://api.privatedao.org/healthz
curl -fsS https://api.privatedao.org/api/v1/umbra/relayer/health
curl -fsS https://api.privatedao.org/api/v1/qvac/runtime-proof
```
