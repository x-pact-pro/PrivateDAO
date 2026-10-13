#!/usr/bin/env bash
set -euo pipefail

# Local operator helper. It never prints the sourced environment.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VAULT_ENV="${PDAO_SECURE_TESTNET_ENV_FILE:-$HOME/.privatedao-secret-vault/files/multichain-testnet.env}"
ALCHEMY_FILE="${PDAO_ALCHEMY_API_KEY_FILE:-$HOME/Desktop/ALCHEMY_API_KEY,env}"

if [[ "$#" -eq 0 ]]; then
  echo "usage: $0 <command> [args...]" >&2
  exit 64
fi

for file in "$VAULT_ENV" "$ALCHEMY_FILE"; do
  [[ -f "$file" ]] || { echo "secure environment file is missing: $file" >&2; exit 1; }
  [[ "$(stat -c '%u:%a' "$file")" == "$(id -u):600" ]] || {
    echo "secure environment file must be owned by the current user with mode 600: $file" >&2
    exit 1
  }
done

set +u
set -a
source "$VAULT_ENV"
set +a
set -u
export PDAO_ALCHEMY_API_KEY_FILE="$ALCHEMY_FILE"
export PDAO_EVM_NETWORK="${PDAO_EVM_NETWORK:-ethereum-sepolia}"
case "$PDAO_EVM_NETWORK" in
  ethereum-sepolia|arbitrum-sepolia|base-sepolia|hyperliquid-testnet|tempo-testnet) ;;
  *) echo "refusing unsupported or non-testnet EVM network: $PDAO_EVM_NETWORK" >&2; exit 1 ;;
esac

cd "$ROOT_DIR"
exec "$@"
