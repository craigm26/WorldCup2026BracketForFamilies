const test = require('node:test');
const assert = require('node:assert');
const S = require('./setup-link.js');

test('buildShareLink builds a worldcup sync URL', () => {
  const u = S.buildShareLink('https://craigm26.github.io', '/WorldCup2026BracketForFamilies/',
    'https://script.google.com/macros/s/AAA/exec', 'fam');
  assert.equal(u,
    'https://craigm26.github.io/WorldCup2026BracketForFamilies/worldcup/?sync=' +
    encodeURIComponent('https://script.google.com/macros/s/AAA/exec') + '&code=fam');
});

test('buildShareLink returns null without exec or code', () => {
  assert.equal(S.buildShareLink('https://x', '/', '', 'fam'), null);
  assert.equal(S.buildShareLink('https://x', '/', 'https://e/exec', '   '), null);
});

test('buildShareLink normalizes basePath and encodes code', () => {
  const u = S.buildShareLink('https://x', 'Repo', 'https://e/exec', 'merry fam');
  assert.ok(u.startsWith('https://x/Repo/worldcup/?sync='));
  assert.ok(u.endsWith('&code=merry%20fam'));
});

const path = require('node:path');
const http = require('node:http');
const SRV = require('./serve.js');
const ROOT = path.resolve(__dirname);

test('safePath maps a dir to index.html and resolves inside root', () => {
  assert.equal(SRV.safePath(ROOT, '/'), path.join(ROOT, 'index.html'));
  assert.equal(SRV.safePath(ROOT, '/worldcup/'), path.join(ROOT, 'worldcup', 'index.html'));
  assert.equal(SRV.safePath(ROOT, '/setup-link.js'), path.join(ROOT, 'setup-link.js'));
});

test('safePath blocks traversal outside root', () => {
  assert.equal(SRV.safePath(ROOT, '/../setup-link.js'), null);
  assert.equal(SRV.safePath(ROOT, '/../../etc/passwd'), null);
  assert.equal(SRV.safePath(ROOT, '/%2e%2e/secret'), null);
  assert.equal(SRV.safePath(ROOT, '/foo\u0000bar.js'), null); // null byte rejected
});

test('server serves an existing file (200) and 404s a missing one', async () => {
  const s = SRV.createServer(ROOT);
  await new Promise((r) => s.listen(0, r));
  const port = s.address().port;
  const get = (p) => new Promise((resolve) => {
    http.get({ host: '127.0.0.1', port, path: p }, (res) => {
      let body = ''; res.on('data', (d) => body += d); res.on('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'], body }));
    });
  });
  const ok = await get('/setup-link.js');
  assert.equal(ok.status, 200); assert.match(ok.type, /javascript/);
  const miss = await get('/does-not-exist.xyz');
  assert.equal(miss.status, 404);
  await new Promise((r) => s.close(r));
});
