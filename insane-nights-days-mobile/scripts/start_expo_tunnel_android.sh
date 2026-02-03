#!/usr/bin/env bash
set -euo pipefail

# Fix for Android "Invalid input to toASCII" when the Expo tunnel subdomain contains
# invalid hostname characters (like underscores). We force a safe subdomain.
#
# Usage:
#   bash scripts/start_expo_tunnel_android.sh [port]
#
# Notes:
# - This is for Expo Go + tunnel.
# - If you are using a Dev Client build, use `expo start --dev-client` instead.

user="${USER:-user}"
host="$(hostname 2>/dev/null || echo host)"

base="insane-${user}-${host}"
base="$(printf '%s' "$base" | tr '[:upper:]' '[:lower:]')"
# Keep only [a-z0-9-] for hostname safety, collapse other chars to '-'
safe="$(printf '%s' "$base" | tr -cs 'a-z0-9' '-' | sed -E 's/^-+//; s/-+$//; s/-+/-/g')"

# Add timestamp to reduce collisions (Expo requires globally unique-ish subdomain)
safe="${safe}-$(date +%s)"

export EXPO_TUNNEL_SUBDOMAIN="$safe"
echo "Using EXPO_TUNNEL_SUBDOMAIN=${EXPO_TUNNEL_SUBDOMAIN}"

# Allow overriding Metro port (useful when running 2 servers at once)
PORT="${1:-8081}"

# Force Expo Go (otherwise Expo may default to dev-client QR)
npx expo start --tunnel --clear --go --port "$PORT"

