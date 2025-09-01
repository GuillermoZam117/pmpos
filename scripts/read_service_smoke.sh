#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-4005}"
HOST="${HOST:-127.0.0.1}"
BASE="http://${HOST}:${PORT}"
KEY="${INTERNAL_API_KEY:-local-test-key}"

echo "==> Read-service smoke test against ${BASE}"

echo "\n-- GET /health (expect 200)"
curl -s -i "${BASE}/health" | sed -n '1,5p'

echo "\n-- GET /internal-api/health WITHOUT key (expect 401)"
curl -s -i "${BASE}/internal-api/health" | sed -n '1,10p'

echo "\n-- GET /internal-api/health WITH key (200 if DB ok, else 500 - both prove routing/auth)"
curl -s -i -H "X-INTERNAL-API-KEY: ${KEY}" "${BASE}/internal-api/health" | sed -n '1,10p'

echo "\n-- GET /internal-api/tables WITHOUT key (expect 401)"
curl -s -i "${BASE}/internal-api/tables" | sed -n '1,10p'

echo "\n-- GET /internal-api/tables WITH key (200 if DB ok, else 500)"
curl -s -i -H "X-INTERNAL-API-KEY: ${KEY}" "${BASE}/internal-api/tables" | sed -n '1,10p'

echo "\nDone."

