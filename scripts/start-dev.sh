#!/usr/bin/env bash
set -euo pipefail

mkdir -p .logs

# Always stop any previous dev instance and clear the log.
pnpm run dev:stop >/dev/null 2>&1 || true
: > .logs/dev.log

echo "starting next dev on http://127.0.0.1:3000" >&2

# Spawn the dev server in a fresh session so the pid file can stop it later.
setsid pnpm next dev -H 127.0.0.1 -p 3000 >> .logs/dev.log 2>&1 < /dev/null &
echo $! > .logs/dev.pid
echo "started"
