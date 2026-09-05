#!/usr/bin/env bash
# Nexora.Find — local preview launcher (dev tool)
# Ensures the local Postgres (port 5433, matches .env) is running,
# then starts the preview server on 0.0.0.0:8080.
set -e
export PATH=/usr/lib/postgresql/17/bin:$PATH

if ! pg_isready -h 127.0.0.1 -p 5433 -q 2>/dev/null; then
  echo "Starting local Postgres on :5433…"
  pg_ctl -D /home/user/.pgdata \
    -o "-p 5433 -c listen_addresses=127.0.0.1 -c unix_socket_directories=/tmp" \
    -l /home/user/.pgdata/logfile start >/dev/null 2>&1 || true
  for i in $(seq 1 15); do
    pg_isready -h 127.0.0.1 -p 5433 -q 2>/dev/null && break
    sleep 1
  done
fi

cd /home/user/Nexora-find
exec node tools/preview-server.mjs
