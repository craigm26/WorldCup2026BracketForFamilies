#!/usr/bin/env bash
# make-offline.sh — turn the Hub into a fully offline build (no internet needed at runtime).
# Run this ONCE on the Pi WHILE IT HAS INTERNET. It downloads all libraries, the map
# data, and all 48 flags into local folders, then rewrites the HTML to use them.
#
#   cd /path/to/worldcup && bash make-offline.sh
#
# Re-runnable. Makes .bak backups of each HTML the first time. Also vendors the
# Fredoka font so the offline build keeps its look (no internet, no fallback font).
set -e
cd "$(dirname "$0")"
mkdir -p vendor flags fonts
echo "→ downloading libraries…"
dl() { curl -fsSL "$1" -o "$2" && echo "   $2"; }

dl https://unpkg.com/react@18.3.1/umd/react.development.js               vendor/react.development.js
dl https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js       vendor/react-dom.development.js
dl https://unpkg.com/@babel/standalone@7.29.0/babel.min.js               vendor/babel.min.js
dl https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js                      vendor/d3.min.js
dl https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js vendor/topojson-client.min.js
dl https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js   vendor/qrcode.min.js
dl https://cdnjs.cloudflare.com/ajax/libs/three.js/0.158.0/three.min.js  vendor/three.min.js
dl https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json         vendor/countries-50m.json

echo "→ downloading 48 flags…"
FLAGS="mx za kr cz ca ch qa ba br ma ht gb-sct us py au tr de cw ci ec nl jp se tn be eg ir nz es cv sa uy fr sn iq no ar dz at jo pt cd uz co gb-eng hr gh pa it"
for code in $FLAGS; do
  curl -fsSL "https://flagcdn.com/w320/${code}.png" -o "flags/${code}.png"
done
echo "   ${FLAGS}"

echo "→ vendoring the Fredoka font…"
for w in 400 500 600 700; do
  curl -fsSL "https://cdn.jsdelivr.net/fontsource/fonts/fredoka@latest/latin-${w}-normal.woff2" -o "fonts/fredoka-${w}.woff2" \
    && echo "   fonts/fredoka-${w}.woff2"
done
cat > fonts/fredoka.css <<'EOF'
/* Vendored Fredoka (offline). */
@font-face { font-family:'Fredoka'; font-style:normal; font-weight:400; font-display:swap; src:url(./fredoka-400.woff2) format('woff2'); }
@font-face { font-family:'Fredoka'; font-style:normal; font-weight:500; font-display:swap; src:url(./fredoka-500.woff2) format('woff2'); }
@font-face { font-family:'Fredoka'; font-style:normal; font-weight:600; font-display:swap; src:url(./fredoka-600.woff2) format('woff2'); }
@font-face { font-family:'Fredoka'; font-style:normal; font-weight:700; font-display:swap; src:url(./fredoka-700.woff2) format('woff2'); }
EOF

echo "→ writing offline-config.js…"
cat > offline-config.js <<'EOF'
/* Offline build switches: serve flags + map data from local folders. */
window.FLAG_BASE   = "flags";
window.NA_TOPO_URL = "vendor/countries-50m.json";
EOF

echo "→ rewriting HTML to use local files…"
for html in *.html; do
  [ -f "$html.bak" ] || cp "$html" "$html.bak"
  python3 - "$html" <<'PY'
import sys, re
p = sys.argv[1]
s = open(p, encoding="utf-8").read()
repl = {
  "https://unpkg.com/react@18.3.1/umd/react.development.js": "vendor/react.development.js",
  "https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js": "vendor/react-dom.development.js",
  "https://unpkg.com/@babel/standalone@7.29.0/babel.min.js": "vendor/babel.min.js",
  "https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js": "vendor/d3.min.js",
  "https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js": "vendor/topojson-client.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js": "vendor/qrcode.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.158.0/three.min.js": "vendor/three.min.js",
}
for k, v in repl.items():
    s = s.replace(k, v)
# load offline-config before data.js
if "offline-config.js" not in s:
    s = s.replace('<script src="data.js"></script>',
                  '<script src="offline-config.js"></script>\n<script src="data.js"></script>', 1)
# drop the integrity/crossorigin checks (local files have a different origin context)
s = re.sub(r'\s+integrity="[^"]*"', '', s)
s = re.sub(r'\s+crossorigin="anonymous"', '', s)
# point the Google Fonts stylesheet <link> at our vendored Fredoka, then drop preconnects
s = re.sub(r'<link[^>]*href="https://fonts\.googleapis\.com/css2[^"]*"[^>]*/?>',
           '<link rel="stylesheet" href="fonts/fredoka.css">', s)
s = re.sub(r'<link[^>]*fonts\.(googleapis|gstatic)\.com[^>]*/?>', '', s)
open(p, "w", encoding="utf-8").write(s)
print("   rewrote", p)
PY
done

echo "✅ Offline build ready. Test with no internet:  python3 -m http.server 80"
echo "   (restore originals any time with:  for f in *.html.bak; do mv \"\$f\" \"\${f%.bak}\"; done )"
