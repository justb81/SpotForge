#!/usr/bin/env bash
# Einmaliges Bootstrap eines frischen Garage-Single-Node (ADR 0013):
# Layout zuweisen + anwenden, Zugriffsschlüssel anlegen, Bucket erzeugen und dem
# Schlüssel Rechte geben. Idempotent genug für ein Dev-Setup – bei bereits
# vorhandenem Layout/Bucket meldet Garage das und bricht den jeweiligen Schritt
# folgenlos ab.
#
# Voraussetzung: `docker compose -f docker-compose.dev.yml up -d garage` läuft.
#
#   tools/garage/bootstrap.sh [BUCKET] [KEY_NAME]
#
# Gibt am Ende Access-Key-ID + Secret aus → in .env als S3_ACCESS_KEY_ID /
# S3_SECRET_ACCESS_KEY eintragen.
set -euo pipefail

BUCKET="${1:-spotforge-media}"
KEY_NAME="${2:-spotforge-app}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.dev.yml}"
ZONE="${GARAGE_ZONE:-dc1}"
CAPACITY="${GARAGE_CAPACITY:-1G}"

g() { docker compose -f "$COMPOSE_FILE" exec -T garage /garage "$@"; }

echo "==> Warte auf Garage…"
until g status >/dev/null 2>&1; do sleep 1; done

NODE_ID="$(g status | awk 'NR>2 && $1 != "" {print $1; exit}')"
echo "==> Node: $NODE_ID"

echo "==> Layout zuweisen ($ZONE, $CAPACITY) und anwenden…"
g layout assign -z "$ZONE" -c "$CAPACITY" "$NODE_ID" || true
g layout apply --version 1 || true

echo "==> Schlüssel '$KEY_NAME' anlegen…"
g key create "$KEY_NAME" || true

echo "==> Bucket '$BUCKET' anlegen und Rechte vergeben…"
g bucket create "$BUCKET" || true
g bucket allow --read --write --owner "$BUCKET" --key "$KEY_NAME" || true

echo "==> Fertig. Zugangsdaten für .env (S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY):"
g key info --show-secret "$KEY_NAME"
