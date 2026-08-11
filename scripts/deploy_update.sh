#!/usr/bin/env bash
# Run on EC2 after git pull — mirrors bingo frontend build + service restart
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT/backend"
npm install
npm run migrate

cd "$ROOT/frontend"
npm install
npm run build

sudo systemctl restart get-rewards-api get-rewards-telegram-bot
echo "Deploy complete."
