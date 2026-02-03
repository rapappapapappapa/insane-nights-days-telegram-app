#!/usr/bin/env bash
set -euo pipefail

# Tunnel for Android Dev Client builds (remote testers).
# Fixes Android "toASCII" by forcing a hostname-safe tunnel subdomain.
#
# Usage:
#   bash scripts/start_expo_tunnel_devclient.sh [port]

user="${USER:-user}"
host="$(hostname 2>/dev/null || echo host)"

base="insane-devclient-${user}-${host}"
base="$(printf '%s' "$base" | tr '[:upper:]' '[:lower:]')"
safe="$(printf '%s' "$base" | tr -cs 'a-z0-9' '-' | sed -E 's/^-+//; s/-+$//; s/-+/-/g')"
safe="${safe}-$(date +%s)"

export EXPO_TUNNEL_SUBDOMAIN="$safe"
echo "Using EXPO_TUNNEL_SUBDOMAIN=${EXPO_TUNNEL_SUBDOMAIN}"

PORT="${1:-8082}"

npx expo start --tunnel --clear --dev-client --port "$PORT"

