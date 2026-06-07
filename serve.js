/* Zero-dependency static file server for the World Cup Hub. Serves the repo root.
   Run: `node serve.js` (PORT env overrides 8080). Used by the start.* launchers. */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.gs': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.map': 'application/json',
};

function safePath(root, urlPath) {
  let p;
  try { p = decodeURIComponent((urlPath || '/').split('?')[0]); } catch (e) { return null; }
  if (p.indexOf("\u0000") !== -1) return null; // reject null bytes (safe as a standalone unit)
  if (p.endsWith('/')) p += 'index.html';
  const full = path.resolve(root, '.' + p);
  if (full !== root && !full.startsWith(root + path.sep)) return null;
  return full;
}

function createServer(root) {
  return http.createServer((req, res) => {
    const full = safePath(root, req.url);
    if (!full) { res.writeHead(403); res.end('Forbidden'); return; }
    fs.readFile(full, (err, data) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(full).toLowerCase()] || 'application/octet-stream' });
      res.end(data);
    });
  });
}

if (require.main === module) {
  createServer(ROOT).listen(PORT, () => {
    console.log('World Cup Hub — serving ' + ROOT);
    console.log('→ open  http://localhost:' + PORT + '/worldcup/');
    console.log('(press Ctrl-C to stop)');
  });
}

module.exports = { createServer: createServer, safePath: safePath, ROOT: ROOT };
