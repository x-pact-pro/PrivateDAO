#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-https://privatedao.org}"
EXPECTED_PROGRAM_ID="${PRIVATE_DAO_EXPECTED_PROGRAM_ID:-EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva}"

fetch_json() {
  local path="$1"
  curl -fsS --max-time "${PRIVATE_DAO_REMOTE_VERIFY_TIMEOUT_SECONDS:-20}" "${BASE_URL}${path}"
}

health_json="$(fetch_json /healthz)"
config_json="$(fetch_json /api/v1/config)"
metrics_json="$(fetch_json /api/v1/metrics)"
qvac_json="$(fetch_json /api/v1/qvac/runtime-proof)"
umbra_json="$(fetch_json /api/v1/umbra/relayer/health)"

python3 - <<'PY' "$EXPECTED_PROGRAM_ID" "$health_json" "$config_json" "$metrics_json" "$qvac_json" "$umbra_json"
import json, sys

expected_program_id, health_json, config_json, metrics_json, qvac_json, umbra_json = sys.argv[1:]
health = json.loads(health_json)
config = json.loads(config_json)
metrics = json.loads(metrics_json)
qvac = json.loads(qvac_json)
umbra = json.loads(umbra_json)

assert health["ok"] is True and health["health"] == "healthy", "remote /healthz failed"
assert health["runtime"]["programId"] == expected_program_id, f"remote /healthz program drift: {health['runtime']['programId']} != {expected_program_id}"
assert health["runtime"]["rpcEndpoint"] == "https://api.testnet.solana.com", f"remote /healthz RPC drift: {health['runtime']['rpcEndpoint']}"
assert health["runtime"]["programExecutable"] is True, "remote /healthz program is not executable on Testnet"
assert config["ok"] is True and config["config"]["readPath"] == "backend-indexer", "remote /api/v1/config is not backend-indexer"
assert config["config"]["programId"] == expected_program_id, f"remote /api/v1/config program drift: {config['config']['programId']} != {expected_program_id}"
assert metrics["ok"] is True and "requestsTotal" in metrics["metrics"], "remote /api/v1/metrics missing requestsTotal"
assert metrics["metrics"]["programId"] == expected_program_id, f"remote /api/v1/metrics program drift: {metrics['metrics']['programId']} != {expected_program_id}"
assert qvac["ok"] is True and qvac["source"] == "qvac-runtime", "remote QVAC runtime endpoint failed"
assert qvac["proof"].get("model") == "qvac/fabric-llm-finetune", "remote QVAC runtime proof missing qvac/fabric-llm-finetune"
assert qvac["proof"].get("runtimeMode") == "browser-local-first", "remote QVAC runtime proof missing browser-local-first mode"
assert umbra["ok"] is True and umbra["source"] == "umbra-relayer", "remote Umbra relayer endpoint failed"
assert umbra["health"].get("status") == "ok", f"remote Umbra relayer unhealthy: {umbra['health']}"
print("Remote primary host verification: PASS")
PY
