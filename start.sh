#!/usr/bin/env bash
# World Cup 2026 Hub — start a local server and open the Hub. Mac/Linux.
set -e
cd "$(dirname "$0")"
PORT="${PORT:-8080}"
URL="http://localhost:${PORT}/worldcup/"
open_browser() { (command -v open >/dev/null && open "$URL") || (command -v xdg-open >/dev/null && xdg-open "$URL") || true; }
echo "World Cup Hub → $URL  (press Ctrl-C to stop)"
if command -v python3 >/dev/null 2>&1; then ( sleep 1; open_browser ) & exec python3 -m http.server "$PORT"
elif command -v python >/dev/null 2>&1; then ( sleep 1; open_browser ) & exec python -m http.server "$PORT"
elif command -v node >/dev/null 2>&1; then ( sleep 1; open_browser ) & PORT="$PORT" exec node serve.js
else
  echo "Couldn't find Python or Node. Install either one (python.org or nodejs.org),"
  echo "or just use the online version: https://craigm26.github.io/WorldCup2026BracketForFamilies/"
  exit 1
fi
