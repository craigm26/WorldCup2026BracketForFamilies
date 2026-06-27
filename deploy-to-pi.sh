#!/usr/bin/env bash
# Deploy the World Cup Hub to the Pi NAS as a fully OFFLINE PWA, live at
#   https://pi-nas.local/worldcup/
#
# It builds a self-contained OFFLINE bundle in a throwaway staging dir (so the repo's
# index.html stays the online/CDN version), then rsyncs it to the Pi:
#   1. copy worldcup/ source -> staging
#   2. make-offline.sh   (vendors React/Babel/d3/three/flags/fonts; rewrites HTML to local)
#   3. node build-pwa.js (generates the /worldcup/-scoped service worker that precaches it all)
#   4. rsync staging -> Pi  (preserves the Pi's live-scores.json)
#
# Needs: internet (for make-offline downloads), node, python3, curl, ssh to the Pi.
# Override defaults with env vars; dry-run with DRYRUN=1.
#   HOST=pi-nas.local SSH_USER=merry WEBROOT=/var/www/html ./deploy-to-pi.sh
set -euo pipefail
cd "$(dirname "$0")"

HOST="${HOST:-pi-nas.local}"
SSH_USER="${SSH_USER:-merry}"
WEBROOT="${WEBROOT:-/var/www/html}"
DRYRUN="${DRYRUN:-0}"

command -v node >/dev/null   || { echo "✗ node is required (for build-pwa.js)"; exit 1; }
command -v python3 >/dev/null || { echo "✗ python3 is required (for make-offline.sh)"; exit 1; }

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
echo "→ staging offline build in $STAGE"

# 1. Copy source (skip prior build artefacts / tests / caches).
rsync -a \
  --exclude '.git' --exclude 'node_modules' --exclude '__pycache__' \
  --exclude '*.bak' --exclude 'vendor' --exclude 'flags' --exclude 'fonts' \
  ./worldcup/ "$STAGE/"

# 2. Vendor everything + rewrite HTML to local paths.
echo "→ make-offline (downloading libs, flags, fonts)…"
( cd "$STAGE" && bash make-offline.sh >/dev/null )
echo "   vendored: $(ls "$STAGE/vendor" | wc -l) libs, $(ls "$STAGE/flags" | wc -l) flags, $(ls "$STAGE/fonts" | wc -l) font files"

# 3. Generate the service worker over the now-complete offline tree.
echo "→ build-pwa (service worker + precache)…"
( cd "$STAGE" && node build-pwa.js )

# 4. Deploy. --delete cleans stale files; we PRESERVE the Pi's own live-scores.json
#    (it may be refreshed there independently) and never ship dev/build scripts.
RSYNC_OPTS=(-az --delete --human-readable --itemize-changes
  --exclude '.git' --exclude 'node_modules' --exclude '__pycache__'
  --exclude '*.test.js' --exclude '*.bak' --exclude 'build-*.js'
  --exclude 'make-offline.sh' --exclude 'deploy-to-pi.sh' --exclude 'start.*'
  --exclude '*.py' --exclude '*.pyc' --exclude '*.gs' --exclude 'setup-link.js'
  --exclude 'live-scores.json' --exclude 'live-scores.example.json'
  --exclude 'sync-config.js')   # git-ignored Pi-side secret (Family Sync default) — never delete/overwrite
[ "$DRYRUN" = "1" ] && RSYNC_OPTS+=(--dry-run) && echo "── DRY RUN (nothing will change) ──"

echo "→ Deploying offline Hub to ${SSH_USER}@${HOST}:${WEBROOT}/worldcup/"
rsync "${RSYNC_OPTS[@]}" "$STAGE/" "${SSH_USER}@${HOST}:${WEBROOT}/worldcup/"

echo "✓ Done. Open: https://${HOST}/worldcup/  (service worker scope: /worldcup/)"
echo "  Note: the Pi's existing live-scores.json is preserved; the SW caches it at install."
