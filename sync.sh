#!/usr/bin/env bash
# Thin wrapper around the cross-platform Node sync engine (`npm run sync`).
set -euo pipefail
exec node "$(dirname "$0")/scripts/sync.mjs" "$@"

