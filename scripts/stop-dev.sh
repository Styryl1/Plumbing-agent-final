#!/usr/bin/env bash
set +e
trap '' TERM HUP INT
exec 2>/dev/null

mkdir -p .logs

# Kill any tracked session first.
if [ -f .logs/dev.pid ]; then
  kill -- -$(cat .logs/dev.pid) 2>/dev/null || true
fi

# Kill any remaining Next.js dev instances.
pkill -f "next dev" 2>/dev/null || true

# Ensure the port is free.
lsof -ti:3000 | xargs -r kill -9

# Clear pid file and truncate logs so each session starts fresh.
rm -f .logs/dev.pid
: > .logs/dev.log

echo "stopped"
exit 0
