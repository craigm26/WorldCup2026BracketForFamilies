# Easy Family Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the project trivially easy to set up — a guided `setup.html` Family-Sync helper, a one-tap "Get started" landing, and double-click laptop launchers.

**Architecture:** A pure dual-export `setup-link.js` (`buildShareLink`) powers a static `setup.html` that copies the Apps Script and generates a share link + QR client-side. The landing (`index.html`) gets a "Get started" band. A zero-dependency `serve.js` plus `start.command`/`start.sh`/`start.bat` (+ optional `Dockerfile`) let non-Pi owners run the Hub by double-click.

**Tech Stack:** Static HTML/JS, `qrcodejs` (cdnjs), Node built-ins (`http`/`fs`/`path`) for the launcher. Tests: Node `node:test` + Puppeteer (`puppeteer-core`).

**Spec:** `docs/superpowers/specs/2026-06-07-easy-setup-design.md`

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `setup-link.js` | Create | `buildShareLink(origin, basePath, exec, code)` pure helper; dual export `window.WCSETUP` + `module.exports`. |
| `serve.js` | Create | Zero-dependency static file server (`safePath` guard + content-types); `createServer(root)` factory + run-as-main. |
| `setuptest.js` | Create | Node tests: `buildShareLink` + `serve.js` (`safePath`, 200/404). |
| `setup.html` | Create | Guided Family-Sync host helper (copy script + link/QR generator). |
| `index.html` | Modify | Landing "Get started" band + current copy + Run-locally section. |
| `start.sh` / `start.command` / `start.bat` | Create | Double-click launchers (detect python/node → serve → open browser). |
| `Dockerfile` | Create | Optional minimal container. |
| `README.md` | Modify | "Run it on your laptop" + link to `setup.html`. |

**Test commands:** `node --test setuptest.js` (+ existing `node --test stickertest.js stickersync.test.js helptest.js`); serve `worldcup/` on `:8088` for the existing `stickersmoke.js`; new Puppeteer smokes inline in their tasks.

---

## Task 1: `buildShareLink` (pure)

**Files:**
- Create: `setup-link.js`
- Create: `setuptest.js`

- [ ] **Step 1: Write the failing tests**

Create `setuptest.js`:

```js
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test setuptest.js`
Expected: FAIL — `Cannot find module './setup-link.js'`.

- [ ] **Step 3: Implement**

Create `setup-link.js`:

```js
/* Pure helper that builds a family Hub setup link. Dual export: window.WCSETUP + module.exports. */
(function (root, factory) {
  const api = factory();
  if (typeof window !== 'undefined') window.WCSETUP = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(this, function () {
  function buildShareLink(origin, basePath, exec, code) {
    exec = (exec || '').trim(); code = (code || '').trim();
    if (!exec || !code) return null;
    let bp = basePath || '/';
    if (bp.charAt(0) !== '/') bp = '/' + bp;
    if (bp.charAt(bp.length - 1) !== '/') bp = bp + '/';
    return origin + bp + 'worldcup/?sync=' + encodeURIComponent(exec) + '&code=' + encodeURIComponent(code);
  }
  return { buildShareLink: buildShareLink };
});
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test setuptest.js`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add setup-link.js setuptest.js
git commit -m "feat(setup): buildShareLink helper + tests"
```

---

## Task 2: `serve.js` zero-dependency static server

**Files:**
- Create: `serve.js`
- Modify: `setuptest.js`

- [ ] **Step 1: Write the failing tests**

Append to `setuptest.js`:

```js
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test setuptest.js`
Expected: FAIL — `Cannot find module './serve.js'`.

- [ ] **Step 3: Implement**

Create `serve.js`:

```js
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test setuptest.js`
Expected: PASS — 6 tests total.

- [ ] **Step 5: Commit**

```bash
git add serve.js setuptest.js
git commit -m "feat(setup): zero-dependency serve.js static server + tests"
```

---

## Task 3: `setup.html` guided helper

**Files:**
- Create: `setup.html`

- [ ] **Step 1: Create the page**

Create `setup.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Set up Family Sync — World Cup 2026 Hub</title>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Fredoka', sans-serif; color: #fff;
    background: radial-gradient(circle at 18% 0%, #3a7bef 0%, #244fb5 42%, #15327f 78%, #0f2566 100%); min-height: 100vh; }
  .wrap { max-width: 760px; margin: 0 auto; padding: 24px 18px 60px; }
  h1 { font-size: 28px; margin: 8px 0 4px; }
  .sub { color: #9fb0e0; margin: 0 0 22px; }
  .step { background: rgba(255,255,255,.06); border-radius: 16px; padding: 16px 18px; margin-bottom: 14px; }
  .step h2 { font-size: 18px; margin: 0 0 8px; }
  .step p { color: #dfe6ff; line-height: 1.5; margin: 0 0 10px; }
  a.btn, button.btn { display: inline-block; border: none; cursor: pointer; font-family: inherit; font-weight: 700;
    border-radius: 10px; padding: 9px 16px; font-size: 15px; text-decoration: none; }
  .btn.primary { background: #f4b740; color: #16235a; } .btn.green { background: #34c77b; color: #06351f; }
  .btn.ghost { background: rgba(255,255,255,.12); color: #dfe6ff; }
  pre { background: #0c1740; border: 1px solid rgba(255,255,255,.15); border-radius: 10px; padding: 12px;
    overflow: auto; max-height: 240px; font-size: 12px; color: #cfe0ff; white-space: pre; }
  input { font-family: inherit; font-size: 15px; border-radius: 10px; border: none; padding: 10px 12px;
    background: rgba(255,255,255,.14); color: #fff; width: 100%; margin-bottom: 8px; }
  label { display: block; font-size: 13.5px; color: #9fb0e0; margin-bottom: 4px; }
  #out { display: none; margin-top: 12px; }
  #qr { background: #fff; padding: 10px; border-radius: 12px; display: inline-block; margin-top: 10px; }
  .note { font-size: 13px; color: #9fb0e0; margin-top: 10px; line-height: 1.5; }
  .muted { color: #7e8cc0; }
</style>
</head>
<body>
<div class="wrap">
  <h1>👨‍👩‍👧 Set up Family Sync</h1>
  <p class="sub">One-time, about 5 minutes. This lets relatives in other homes trade stickers with you. Free — it uses your own Google Sheet.</p>

  <div class="step">
    <h2>1 · Make a Google Sheet</h2>
    <p>It will quietly store who has which stickers.</p>
    <a class="btn primary" href="https://sheets.new" target="_blank" rel="noopener">Create a blank Sheet ↗</a>
  </div>

  <div class="step">
    <h2>2 · Add the script</h2>
    <p>In your Sheet: <b>Extensions → Apps Script</b>. Delete anything there, then paste this and click <b>Save</b>:</p>
    <button class="btn green" id="copyScript">📋 Copy the script</button>
    <pre id="script">Loading…</pre>
  </div>

  <div class="step">
    <h2>3 · Publish it</h2>
    <p><b>Deploy → New deployment → Web app</b>. Set <b>Execute as: Me</b> and <b>Who has access: Anyone</b>, then <b>Deploy</b>. Copy the <b>/exec URL</b> it gives you.</p>
  </div>

  <div class="step">
    <h2>4 · Make your family link</h2>
    <label for="exec">Paste the /exec URL</label>
    <input id="exec" placeholder="https://script.google.com/macros/s/…/exec" />
    <label for="code">Pick a family code (a secret word everyone uses)</label>
    <input id="code" placeholder="e.g. merry-fam" />
    <div id="out">
      <label>Share this link with your family (text or email it):</label>
      <input id="link" readonly />
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:4px;">
        <button class="btn green" id="copyLink">📋 Copy link</button>
        <a class="btn ghost" id="mailLink" href="#">✉️ Email it</a>
      </div>
      <div id="qr"></div>
      <p class="note">🔒 This link is built right here in your browser — the URL and code aren't sent anywhere. Anyone with the link can see and edit your family's stickers, so only share it with family.</p>
    </div>
    <p class="note muted" id="hint">Paste your /exec URL and a code above to get your link + QR.</p>
  </div>

  <p class="note"><a class="btn ghost" href="worldcup/">← Back to the Hub</a></p>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script src="setup-link.js"></script>
<script>
  // base path = the folder this setup.html lives in (so links are correct for any host)
  var BASEPATH = location.pathname.replace(/setup\.html$/, '');
  // 1) load the reference Apps Script into the copy box (single source of truth)
  fetch('worldcup/family-sync.gs').then(function (r) { return r.ok ? r.text() : Promise.reject(); })
    .then(function (t) { document.getElementById('script').textContent = t; })
    .catch(function () {
      document.getElementById('script').innerHTML =
        'Couldn’t load the script here. Open it on GitHub: ' +
        '<a href="https://github.com/craigm26/WorldCup2026BracketForFamilies/blob/main/worldcup/family-sync.gs" target="_blank" rel="noopener" style="color:#9fc0ff">family-sync.gs</a>';
    });
  document.getElementById('copyScript').onclick = function () {
    navigator.clipboard.writeText(document.getElementById('script').textContent || '')
      .then(function () { document.getElementById('copyScript').textContent = '✓ Copied!'; });
  };
  // 4) live link + QR generator
  var qr = null;
  function regen() {
    var exec = document.getElementById('exec').value;
    var code = document.getElementById('code').value;
    var link = window.WCSETUP.buildShareLink(location.origin, BASEPATH, exec, code);
    var out = document.getElementById('out'), hint = document.getElementById('hint');
    if (!link) { out.style.display = 'none'; hint.style.display = 'block'; return; }
    out.style.display = 'block'; hint.style.display = 'none';
    document.getElementById('link').value = link;
    document.getElementById('mailLink').href =
      'mailto:?subject=' + encodeURIComponent('Join our World Cup sticker swap') +
      '&body=' + encodeURIComponent('Tap this to join our family sticker tracker:\n\n' + link);
    var box = document.getElementById('qr'); box.innerHTML = '';
    qr = new QRCode(box, { text: link, width: 180, height: 180 });
  }
  document.getElementById('exec').addEventListener('input', regen);
  document.getElementById('code').addEventListener('input', regen);
  document.getElementById('copyLink').onclick = function () {
    navigator.clipboard.writeText(document.getElementById('link').value || '')
      .then(function () { document.getElementById('copyLink').textContent = '✓ Copied!'; });
  };
</script>
</body>
</html>
```

- [ ] **Step 2: Smoke the generator**

Run (serve the repo ROOT so `setup-link.js` + `worldcup/family-sync.gs` resolve):

```bash
( python3 -m http.server 8099 >/tmp/setup_serve.log 2>&1 & echo $! > /tmp/setup.pid ); sleep 1
node -e "const p=require('puppeteer-core');(async()=>{const b=await p.launch({executablePath:'/usr/bin/chromium',headless:'new',args:['--no-sandbox','--disable-gpu']});const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));await pg.goto('http://localhost:8099/setup.html',{waitUntil:'networkidle2',timeout:35000});await new Promise(r=>setTimeout(r,1500));await pg.type('#exec','https://script.google.com/macros/s/AAA/exec');await pg.type('#code','famtest');await new Promise(r=>setTimeout(r,500));const link=await pg.evaluate(()=>document.getElementById('link').value);const qr=await pg.evaluate(()=>!!document.querySelector('#qr canvas, #qr img'));const script=await pg.evaluate(()=>(document.getElementById('script').textContent||'').includes('doPost'));console.log('link:',/worldcup\/\?sync=.*code=famtest/.test(link),'| qr:',qr,'| script loaded:',script,'| errors:',errs.length);await b.close();})();"
kill "$(cat /tmp/setup.pid)" 2>/dev/null || true
```
Expected: `link: true | qr: true | script loaded: true | errors: 0`.

- [ ] **Step 3: Commit**

```bash
git add setup.html
git commit -m "feat(setup): guided Family-Sync setup.html (copy script + link/QR generator)"
```

---

## Task 4: Landing "Get started" refresh

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add the Get-started band after the hero**

In `index.html`, find the closing `</header>` of the hero (grep: `grep -n "</header>" index.html`) and insert immediately after it:

```html
  <div class="wrap">
    <section class="panel">
      <h2>🚀 Get started in a tap</h2>
      <div class="printrow">
        <a class="printcard" href="worldcup/"><b>▶ Open the Hub</b><span>Bracket, stickers, schedule, games — jump right in. Add a player for each family member on the Home tab.</span></a>
        <a class="printcard" href="#run-locally"><b>💻 Run it on your computer</b><span>No Raspberry Pi needed — download it and double-click one file on Mac, Windows or Linux.</span></a>
        <a class="printcard" href="setup.html"><b>👨‍👩‍👧 Set up family trading</b><span>A 5-minute guided helper so relatives in other homes can trade stickers — it makes the link for you.</span></a>
        <a class="printcard" href="worldcup/?tab=help"><b>🔗 Got a family link?</b><span>Just tap the link someone shared with you — you're in. New here? Open the ❓ Help tab anytime.</span></a>
      </div>
    </section>
  </div>
```

- [ ] **Step 2: Refresh stale copy**

Run `grep -n "Eight tabs\|eight tabs" index.html`; change "Eight tabs" → "Ten tabs" in that sentence.

In the feature grid (the `<div class="grid cols-3">` under "📺 The interactive Hub"), add two `feat` cards right before that grid's closing `</div>` (grep for `Quiz &amp; Family Pick` to locate the last feat):

```html
        <div class="feat"><div class="ic">🎟️</div><b>Panini sticker tracker</b><span>Track all 980 stickers with real player names, mark Have/Need/doubles, and a Trade Matcher shows who can swap what.</span></div>
        <div class="feat"><div class="ic">👨‍👩‍👧</div><b>Trade with family far away</b><span>Optional free Family Sync (a Google Sheet) lets relatives in other homes propose and accept trades.</span></div>
```

- [ ] **Step 3: Add the Run-locally section (anchor target)**

Find the "🚀 Host it yourself" section (grep `Host it yourself`). Replace that whole `<section class="panel">…</section>` with one that has the `id` and launcher steps:

```html
    <section class="panel" id="run-locally">
      <h2>💻 Run it on your computer</h2>
      <p class="sub">No server skills needed. Works on Mac, Windows &amp; Linux — uses Python or Node if you already have them.</p>
      <ol style="line-height:1.7; color:#dfe6ff;">
        <li><b>Download</b> the project: the green <b>Code → Download ZIP</b> button on <a href="https://github.com/craigm26/WorldCup2026BracketForFamilies">GitHub</a>, then unzip it.</li>
        <li><b>Double-click</b> the launcher for your computer: <code>start.command</code> (Mac), <code>start.bat</code> (Windows), or <code>start.sh</code> (Linux).</li>
        <li>Your browser opens the Hub at <code>http://localhost:8080/worldcup/</code>. That's it!</li>
      </ol>
      <p class="note">Prefer Docker? <code>docker build -t worldcup . &amp;&amp; docker run -p 8080:8080 worldcup</code>, then open <code>localhost:8080/worldcup/</code>. Full notes are in the <a href="https://github.com/craigm26/WorldCup2026BracketForFamilies#readme">README</a>.</p>
    </section>
```

- [ ] **Step 4: Smoke the landing**

Run:
```bash
( python3 -m http.server 8099 >/tmp/setup_serve.log 2>&1 & echo $! > /tmp/setup.pid ); sleep 1
node -e "const p=require('puppeteer-core');(async()=>{const b=await p.launch({executablePath:'/usr/bin/chromium',headless:'new',args:['--no-sandbox','--disable-gpu']});const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));await pg.goto('http://localhost:8099/index.html',{waitUntil:'networkidle2',timeout:35000});await new Promise(r=>setTimeout(r,800));const hrefs=await pg.evaluate(()=>[...document.querySelectorAll('.printcard')].map(a=>a.getAttribute('href')));const noScan=await pg.evaluate(()=>!/scan|camera/i.test(document.body.innerText));const setupLink=await pg.evaluate(()=>!!document.querySelector('a[href=\"setup.html\"]'));console.log('cards:',JSON.stringify(hrefs),'| setup link:',setupLink,'| no scan/camera:',noScan,'| errors:',errs.length);await b.close();})();"
kill "$(cat /tmp/setup.pid)" 2>/dev/null || true
```
Expected: cards include `worldcup/`, `#run-locally`, `setup.html`, `worldcup/?tab=help`; `setup link: true`; `no scan/camera: true`; `errors: 0`.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(setup): landing 'Get started' band + current copy + run-locally section"
```

---

## Task 5: Laptop launchers + Dockerfile

**Files:**
- Create: `start.sh`, `start.command`, `start.bat`, `Dockerfile`

- [ ] **Step 1: Create `start.sh`**

Create `start.sh`:

```bash
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
```

Make it executable:
```bash
chmod +x start.sh
```

- [ ] **Step 2: Create `start.command` (macOS double-click)**

Create `start.command`:

```bash
#!/usr/bin/env bash
# Double-click on macOS to launch the Hub. Delegates to start.sh.
cd "$(dirname "$0")"
exec bash ./start.sh
```

```bash
chmod +x start.command
```

- [ ] **Step 3: Create `start.bat` (Windows double-click)**

Create `start.bat`:

```bat
@echo off
REM World Cup 2026 Hub - start a local server and open the Hub. Windows.
cd /d "%~dp0"
set PORT=8080
set URL=http://localhost:%PORT%/worldcup/
where py >nul 2>nul && ( start "" "%URL%" & py -m http.server %PORT% & goto :eof )
where python >nul 2>nul && ( start "" "%URL%" & python -m http.server %PORT% & goto :eof )
where node >nul 2>nul && ( start "" "%URL%" & node serve.js & goto :eof )
echo Could not find Python or Node. Install either (python.org or nodejs.org),
echo or use the online version: https://craigm26.github.io/WorldCup2026BracketForFamilies/
pause
```

- [ ] **Step 4: Create `Dockerfile`**

Create `Dockerfile`:

```dockerfile
# Optional: run the World Cup Hub in a container.
#   docker build -t worldcup .
#   docker run --rm -p 8080:8080 worldcup
# then open http://localhost:8080/worldcup/
FROM python:3-alpine
WORKDIR /app
COPY . /app
EXPOSE 8080
CMD ["python", "-m", "http.server", "8080"]
```

- [ ] **Step 5: Smoke `start.sh` on Linux**

Run:
```bash
PORT=8097 ./start.sh >/tmp/start.log 2>&1 & echo $! > /tmp/start.pid
sleep 2
curl -s -o /dev/null -w "hub HTTP %{http_code}\n" http://localhost:8097/worldcup/
kill "$(cat /tmp/start.pid)" 2>/dev/null; pkill -f "http.server 8097" 2>/dev/null || true
```
Expected: `hub HTTP 200`.

- [ ] **Step 6: Commit**

```bash
git add start.sh start.command start.bat Dockerfile
git commit -m "feat(setup): double-click launchers (Mac/Win/Linux) + optional Dockerfile"
```

---

## Task 6: README "Run it on your laptop"

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a section**

In `README.md`, under the Hub section (near "Quick deploy" / "Host it yourself"), add:

```markdown
### ▶ Run it on your own computer (Mac / Windows / Linux)

No Raspberry Pi required:

1. **Download** this project (green **Code → Download ZIP** on GitHub) and unzip it.
2. **Double-click** your launcher: `start.command` (Mac), `start.bat` (Windows), or `start.sh` (Linux).
   It uses Python or Node (whichever you have) to serve the Hub and opens your browser.
3. The Hub opens at `http://localhost:8080/worldcup/`.

Prefer Docker? `docker build -t worldcup . && docker run --rm -p 8080:8080 worldcup`, then open `localhost:8080/worldcup/`.

**Family Sync setup:** open **`setup.html`** (in this project, or at the hosted site) for a guided, ~5-minute helper that writes your shareable family link for you.
```

- [ ] **Step 2: Verify + commit**

Run: `node --test setuptest.js` → PASS.

```bash
git add README.md
git commit -m "docs: how to run the Hub on a laptop + the setup.html helper"
```

---

## Notes for the implementer

- **Static/offline:** all new files are plain/relative; the offline build picks them up. Do NOT edit `make-offline.sh`.
- **`serve.js` serves the repo ROOT** (so both the landing `/` and `/worldcup/` work) and must keep the `safePath` traversal guard.
- **`setup.html` builds the link client-side** via `window.WCSETUP.buildShareLink` — never POST the `/exec` URL or code anywhere. Keep the privacy note.
- **No camera/scan wording** anywhere in `setup.html`, `index.html`, or the README additions.
- **`start.command` delegates to `start.sh`** (don't duplicate the logic).
