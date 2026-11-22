#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
project_name="smartfarm-e2e-$$"
compose=(docker compose -f e2e/compose.yaml -p "$project_name")

cleanup() {
  "${compose[@]}" down --volumes --remove-orphans >/dev/null 2>&1
}
trap cleanup EXIT

"${compose[@]}" up --build --detach

for attempt in {1..45}; do
  fog_logs="$("${compose[@]}" logs --no-color fog 2>&1)"
  missing_alerts=0
  for group in a b; do
    for plot in 1 2 3; do
      address="plot-${group}${plot}:500${plot}"
      if ! grep -Fq "[Fog::Client][gateway-${group}:8080] Talhão ${address}: temperatura alta" <<< "$fog_logs"; then
        missing_alerts=$((missing_alerts + 1))
      fi
    done
  done

  if ((missing_alerts == 0)); then
    gateway_a_addresses="$("${compose[@]}" exec -T gateway-a node --input-type=module -e 'import { DatabaseSync } from "node:sqlite"; const db = new DatabaseSync("data/gateway-5001-5002-5003.sqlite"); console.log(db.prepare("SELECT DISTINCT plot_address FROM averages ORDER BY plot_address").all().map((row) => row.plot_address).join(",")); db.close()')"
    gateway_b_addresses="$("${compose[@]}" exec -T gateway-b node --input-type=module -e 'import { DatabaseSync } from "node:sqlite"; const db = new DatabaseSync("data/gateway-5001-5002-5003.sqlite"); console.log(db.prepare("SELECT DISTINCT plot_address FROM averages ORDER BY plot_address").all().map((row) => row.plot_address).join(",")); db.close()')"
    if [[ "$gateway_a_addresses" == 'plot-a1:5001,plot-a2:5002,plot-a3:5003' && "$gateway_b_addresses" == 'plot-b1:5001,plot-b2:5002,plot-b3:5003' ]]; then
      echo 'E2E OK: seis talhões nos SQLite corretos e seis alertas identificados na FOG'
      exit 0
    fi
  fi
  sleep 1
done

"${compose[@]}" logs
echo 'E2E falhou: faltam médias ou alertas de algum talhão após 45 segundos' >&2
exit 1
