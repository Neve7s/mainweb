#!/bin/sh
# Entrypoint del contenedor api en Coolify: migra y arranca.
# Reintenta 5 veces (Postgres puede tardar en aceptar conexiones).
set -e
echo "[entrypoint] running migrations..."
for i in 1 2 3 4 5; do
  if node dist/migrate.js; then
    echo "[entrypoint] migrate OK"
    break
  fi
  echo "[entrypoint] migrate failed (attempt $i/5), retrying in 3s..."
  sleep 3
  if [ "$i" = "5" ]; then
    echo "[entrypoint] migrate failed after 5 attempts"
    exit 1
  fi
done
echo "[entrypoint] starting api..."
exec node dist/index.js
