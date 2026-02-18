#!/usr/bin/env bash
set -euo pipefail

# Simple deploy script for EC2: pull latest, build and run
DIR=$(cd "$(dirname "$0")" && pwd)
cd "$DIR"

if [ ! -f .env ]; then
  echo ".env file missing. Copy .env.example and fill values before running." >&2
  exit 1
fi

docker compose -f docker-compose.prod.yml pull || true
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans

echo "Services deployed. Use 'docker compose -f docker-compose.prod.yml logs -f' to watch logs." 
