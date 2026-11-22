#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
project_name="smartfarm-e2e-$$"
compose=(docker compose -f e2e/compose.yaml -p "$project_name")

cleanup() {
  "${compose[@]}" down --volumes --remove-orphans >/dev/null
}
trap cleanup EXIT

"${compose[@]}" up --build --detach

for attempt in {1..30}; do
  if "${compose[@]}" logs fog 2>&1 | grep -q 'Talhão plot:5001: temperatura alta'; then
    rows="$("${compose[@]}" exec -T gateway node --input-type=module -e 'import { DatabaseSync } from "node:sqlite"; const db = new DatabaseSync("data/gateway-5001.sqlite"); console.log(db.prepare("SELECT COUNT(*) AS count FROM averages WHERE plot_address = ?").get("plot:5001").count); db.close()')"
    if [[ "$rows" =~ ^[1-9][0-9]*$ ]]; then
      echo "E2E OK: $rows médias no SQLite e alerta do talhão plot:5001 na FOG"
      exit 0
    fi
  fi
  sleep 1
done

"${compose[@]}" logs
echo 'E2E falhou: média ou alerta não apareceu em 30 segundos' >&2
exit 1
