#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[1/5] Stop and remove optional caddy service (if present)"
docker compose -f docker-compose.prod.yml -f docker-compose.caddy.yml stop caddy || true
docker compose -f docker-compose.prod.yml -f docker-compose.caddy.yml rm -f caddy || true

echo "[2/5] Build and start production services (nginx-only flow)"
docker compose -f docker-compose.prod.yml up -d --build db backend frontend

echo "[3/5] Validate backend health endpoint"
curl --retry 15 --retry-connrefused --retry-delay 1 -fsS http://127.0.0.1:8000/api/healthz/ > /dev/null

echo "[4/5] Validate and reload host nginx"
sudo nginx -t
sudo systemctl reload nginx

echo "[5/5] Service status"
docker compose -f docker-compose.prod.yml ps

echo "Done: production deploy completed with nginx only."
