#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
STACK_DIR="$REPO_ROOT/deploy/primary-host"
ENV_FILE="$STACK_DIR/.env"
EXPECTED_PROGRAM_ID="${PRIVATE_DAO_EXPECTED_PROGRAM_ID:-EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva}"

bash "$SCRIPT_DIR/up-primary-host-stack.sh"

cleanup() {
  bash "$SCRIPT_DIR/down-primary-host-stack.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

LOCAL_PORT="$(
  grep -E '^PRIMARY_LOCAL_HTTP_BIND_PORT=' "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2
)"
LOCAL_PORT="${LOCAL_PORT:-8080}"
BASE_URL="http://127.0.0.1:${LOCAL_PORT}"

for _ in $(seq 1 60); do
  if curl -fsS "$BASE_URL/healthz" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

ROOT_HEADERS="$(mktemp)"
curl -fsSI "$BASE_URL/" >"$ROOT_HEADERS"
ROOT_BODY="$(curl -fsS "$BASE_URL/")"
HEALTH_JSON="$(curl -fsS "$BASE_URL/healthz")"
CONFIG_JSON="$(curl -fsS "$BASE_URL/api/v1/config")"
METRICS_JSON="$(curl -fsS "$BASE_URL/api/v1/metrics")"
SNAPSHOT_JSON="$(curl -fsS "$BASE_URL/api/v1/ops/snapshot")"

python3 - <<'PY' "$EXPECTED_PROGRAM_ID" "$ROOT_HEADERS" "$ROOT_BODY" "$HEALTH_JSON" "$CONFIG_JSON" "$METRICS_JSON" "$SNAPSHOT_JSON"
import json, pathlib, sys

expected_program_id, headers_path, root_body, health_json, config_json, metrics_json, snapshot_json = sys.argv[1:]
headers = pathlib.Path(headers_path).read_text().lower()
assert "x-privatedao-primary-host: candidate" in headers, "missing primary-host header"
assert "PrivateDAO" in root_body, "root static site did not render PrivateDAO"
health = json.loads(health_json)
config = json.loads(config_json)
metrics = json.loads(metrics_json)
snapshot = json.loads(snapshot_json)
assert health["ok"] is True and health["health"] == "healthy", "healthz did not report healthy"
assert health["runtime"]["programId"] == expected_program_id, f"healthz program drift: {health['runtime']['programId']} != {expected_program_id}"
assert config["ok"] is True and config["config"]["readPath"] == "backend-indexer", "config route lost backend-indexer mode"
assert config["config"]["programId"] == expected_program_id, f"config program drift: {config['config']['programId']} != {expected_program_id}"
assert metrics["ok"] is True and "requestsTotal" in metrics["metrics"], "metrics route missing requestsTotal"
assert snapshot["ok"] is True and snapshot["snapshot"]["deployment"]["readApiPath"] == "/api/v1", "ops snapshot readApiPath mismatch"
print("Primary host stack verification: PASS")
PY
