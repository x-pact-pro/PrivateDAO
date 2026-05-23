#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-https://api.privatedao.org}"
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
freshness_json="$(fetch_json /api/v1/freshness/latest)"
visitors_json="$(fetch_json /api/v1/visitors/stats)"
chain_json="$(fetch_json /api/v1/chain/latest)"
quicknode_json="$(fetch_json /api/v1/quicknode/stream/stats)"
readiness_json="$(fetch_json /api/v1/readiness)"

python3 - <<'PY' "$EXPECTED_PROGRAM_ID" "$health_json" "$config_json" "$metrics_json" "$qvac_json" "$umbra_json" "$freshness_json" "$visitors_json" "$chain_json" "$quicknode_json" "$readiness_json"
import json, sys

expected_program_id, health_json, config_json, metrics_json, qvac_json, umbra_json, freshness_json, visitors_json, chain_json, quicknode_json, readiness_json = sys.argv[1:]
health = json.loads(health_json)
config = json.loads(config_json)
metrics = json.loads(metrics_json)
qvac = json.loads(qvac_json)
umbra = json.loads(umbra_json)
freshness = json.loads(freshness_json)
visitors = json.loads(visitors_json)
chain = json.loads(chain_json)
quicknode = json.loads(quicknode_json)
readiness = json.loads(readiness_json)

assert health["ok"] is True and health["health"] == "healthy", "remote /healthz failed"
assert health["runtime"]["programId"] == expected_program_id, f"remote /healthz program drift: {health['runtime']['programId']} != {expected_program_id}"
rpc_endpoint = health["runtime"]["rpcEndpoint"]
assert (
    rpc_endpoint == "https://api.testnet.solana.com"
    or "solana-testnet.quiknode.pro/[redacted]" in rpc_endpoint
), f"remote /healthz RPC drift or leaked secret: {rpc_endpoint}"
for endpoint in config["config"].get("rpcEndpoints", []):
    assert "/[redacted]" in endpoint or endpoint == "https://api.testnet.solana.com", f"remote /api/v1/config leaked or drifted RPC endpoint: {endpoint}"
assert health["runtime"]["programExecutable"] is True, "remote /healthz program is not executable on Testnet"
assert config["ok"] is True and config["config"]["readPath"] == "backend-indexer", "remote /api/v1/config is not backend-indexer"
assert config["config"]["programId"] == expected_program_id, f"remote /api/v1/config program drift: {config['config']['programId']} != {expected_program_id}"
assert metrics["ok"] is True and "requestsTotal" in metrics["metrics"], "remote /api/v1/metrics missing requestsTotal"
assert metrics["metrics"]["programId"] == expected_program_id, f"remote /api/v1/metrics program drift: {metrics['metrics']['programId']} != {expected_program_id}"
assert qvac["ok"] is True and qvac["source"] == "qvac-runtime", "remote QVAC runtime endpoint failed"
assert qvac["proof"].get("sdkLoaded") is True, "remote QVAC runtime proof did not load @qvac/sdk"
assert qvac["proof"].get("sdkVersion") == "0.10.0", f"remote QVAC SDK version drift: {qvac['proof'].get('sdkVersion')}"
assert qvac["proof"].get("model") == "qvac/fabric-llm-finetune", "remote QVAC runtime proof missing qvac/fabric-llm-finetune"
assert qvac["proof"].get("runtimeMode") == "browser-local-first", "remote QVAC runtime proof missing browser-local-first mode"
assert "completion" in qvac["proof"].get("exportedCapabilities", []), "remote QVAC runtime proof missing completion capability"
assert "translate" in qvac["proof"].get("exportedCapabilities", []), "remote QVAC runtime proof missing translation capability"
assert "ocr" in qvac["proof"].get("exportedCapabilities", []), "remote QVAC runtime proof missing OCR capability"
assert umbra["ok"] is True and umbra["source"] == "umbra-relayer", "remote Umbra relayer endpoint failed"
assert umbra["health"].get("status") == "ok", f"remote Umbra relayer unhealthy: {umbra['health']}"
assert freshness["ok"] is True and "latest" in freshness, "remote freshness endpoint failed"
assert visitors["ok"] is True and "totalSessions" in visitors, "remote visitor stats endpoint failed"
assert chain["ok"] is True and "transactions" in chain, "remote chain watcher endpoint failed"
assert quicknode["ok"] is True and quicknode["stats"]["auth"] == "configured", "remote QuickNode stream stats failed"
assert quicknode["stats"]["rawPayloadStorage"] == "disabled", "remote QuickNode stream raw payload storage boundary drifted"
assert readiness["ok"] is True and readiness["posture"] == "solana-testnet-production-candidate", "remote readiness aggregate failed"
assert readiness["quickNodeStream"]["statePersistence"] == "runtime-volume", "remote readiness missing persistent QuickNode telemetry"
print("Remote primary host verification: PASS")
PY
