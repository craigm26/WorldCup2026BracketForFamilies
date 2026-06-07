# Family Sync (Stickers) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let family members in different households publish their sticker collection and propose/accept trades via a Google Sheet + Apps Script web app — an optional, local-first, no-account layer on the existing static Hub.

**Architecture:** A pure sync-client module (`sticker-sync.js`, dual browser/Node export) shapes requests/responses and reaches one Apps Script `/exec` endpoint via `POST` with `Content-Type: text/plain` (a CORS *simple request* → no preflight). Config (`wc26sync` = `{url, code, memberId}`) lives in `localStorage`, applied from a one-tap `?sync=&code=` setup link. A new 👨‍👩‍👧 Family segment in the Stickers tab publishes the active player's collection, shows the roster, and runs propose→accept trades. Everything degrades to a no-op when offline/unconfigured.

**Tech Stack:** Static HTML/JS, React 18 via in-browser Babel, `localStorage`, `fetch`. Server = Google Apps Script (`family-sync.gs`, operator-installed reference). Tests: Node `node:test` + a Node in-memory fake of the Apps Script server.

**Spec:** `docs/superpowers/specs/2026-06-06-family-sync-stickers-design.md`

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `worldcup/sticker-sync.js` | Create | Pure helpers (`genMemberId`, `parseSetupLink`, `serializeCollection`, `buildPayload`, `tradeTransition`, `summarizeFamily`) + impure `postAction(cfg, action, extra, fetchImpl?)`. Dual export `window.WCSTKSYNC` + `module.exports`. |
| `worldcup/family-sync.gs` | Create | Reference Apps Script the operator pastes into Google. NOT loaded by the web app. |
| `worldcup/hub-data.js` | Modify | `useHubStore`: `sync` state + `setSync`, init from `localStorage` and from `?sync=&code=`. |
| `worldcup/hub-stickers.jsx` | Modify | 👨‍👩‍👧 Family segment (setup / publish / roster / trades), wired into `StickersTab`. |
| `worldcup/hub.jsx` | Modify | Pass `sync`/`setSync` to `StickersTab`. |
| `worldcup/index.html` | Modify | Load `sticker-sync.js`. |
| `stickersync.test.js` | Create | Node tests: pure helpers + client end-to-end against the in-memory fake. |
| `README.md` / docs | Modify | Operator setup: create Sheet, paste `.gs`, deploy, share link. |

**Test commands:** `node --test stickersync.test.js` (and the existing `node --test stickertest.js`); UI smoke `node stickersmoke.js` after serving `worldcup/` on `:8088`.

---

## Task 1: Sync helpers — ids, setup link, collection serialize

**Files:**
- Create: `worldcup/sticker-sync.js`
- Create: `stickersync.test.js`

- [ ] **Step 1: Write the failing tests**

Create `stickersync.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const S = require('./worldcup/sticker-sync.js');

test('genMemberId returns a unique m_ id', () => {
  const a = S.genMemberId(), b = S.genMemberId();
  assert.match(a, /^m_[a-z0-9]+$/);
  assert.notEqual(a, b);
});

test('parseSetupLink extracts url + code, or null', () => {
  const r = S.parseSetupLink('?sync=https%3A%2F%2Fx.test%2Fexec&code=fam1');
  assert.deepEqual(r, { url: 'https://x.test/exec', code: 'fam1' });
  assert.equal(S.parseSetupLink('?tab=stickers'), null);
  assert.equal(S.parseSetupLink(''), null);
});

test('serializeCollection keeps owned counts, drops 0/negatives', () => {
  assert.deepEqual(S.serializeCollection({ MEX2: 2, ARG17: 1, FW1: 0, X: -1 }),
    { MEX2: 2, ARG17: 1 });
  assert.deepEqual(S.serializeCollection(null), {});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test stickersync.test.js`
Expected: FAIL — `Cannot find module './worldcup/sticker-sync.js'`.

- [ ] **Step 3: Write minimal implementation**

Create `worldcup/sticker-sync.js`:

```js
/* Family Sync client for the sticker tracker. Pure helpers + a single POST transport
   to a Google Apps Script web app (text/plain body => CORS simple request, no preflight).
   Dual export: window.WCSTKSYNC (browser) + module.exports (Node tests). */
(function (root, factory) {
  const api = factory();
  if (typeof window !== 'undefined') window.WCSTKSYNC = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(this, function () {
  let seq = 0;
  function rand() { return Math.floor((1 + Math.sin(++seq) * 0.5 + Math.random()) * 1e9).toString(36); }
  function genMemberId() { return 'm_' + (Math.random().toString(36).slice(2, 8) + rand().slice(0, 4)); }

  function parseSetupLink(search) {
    try {
      const q = new URLSearchParams(search || '');
      const url = q.get('sync'), code = q.get('code');
      if (url && code) return { url: url, code: code };
    } catch (e) {}
    return null;
  }

  function serializeCollection(map) {
    const out = {};
    Object.keys(map || {}).forEach((k) => { if ((map[k] || 0) >= 1) out[k] = map[k]; });
    return out;
  }

  return { genMemberId: genMemberId, parseSetupLink: parseSetupLink, serializeCollection: serializeCollection };
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test stickersync.test.js`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add worldcup/sticker-sync.js stickersync.test.js
git commit -m "feat(sync): sticker-sync helpers — ids, setup link, serialize"
```

---

## Task 2: Payload builder, trade transitions, family summary

**Files:**
- Modify: `worldcup/sticker-sync.js`
- Modify: `stickersync.test.js`

- [ ] **Step 1: Write the failing tests**

Append to `stickersync.test.js`:

```js
test('buildPayload merges action + familyCode + memberId', () => {
  const cfg = { url: 'u', code: 'fam1', memberId: 'm_a' };
  assert.deepEqual(S.buildPayload('getFamily', cfg, {}),
    { action: 'getFamily', familyCode: 'fam1', memberId: 'm_a' });
  assert.deepEqual(S.buildPayload('proposeTrade', cfg, { toId: 'm_b', giveCodes: ['MEX2'] }),
    { action: 'proposeTrade', familyCode: 'fam1', memberId: 'm_a', toId: 'm_b', giveCodes: ['MEX2'] });
});

test('tradeTransition only acts on pending trades', () => {
  assert.equal(S.tradeTransition({ status: 'pending' }, 'accept'), 'accepted');
  assert.equal(S.tradeTransition({ status: 'pending' }, 'decline'), 'declined');
  assert.equal(S.tradeTransition({ status: 'accepted' }, 'decline'), null);
  assert.equal(S.tradeTransition({ status: 'pending' }, 'bogus'), null);
});

test('summarizeFamily totals each member + flags me', () => {
  const rows = [
    { memberId: 'm_a', name: 'Dad', emoji: '👨', updatedAt: 1, collectionJSON: '{"MEX2":2}' },
    { memberId: 'm_b', name: 'Mia', emoji: '👧', updatedAt: 2, collectionJSON: 'oops-bad-json' },
  ];
  const totalsOf = (map) => ({ have: Object.keys(map).length, total: 980, doubles: 0 });
  const out = S.summarizeFamily(rows, 'm_b', totalsOf);
  assert.equal(out[0].name, 'Dad'); assert.equal(out[0].isMe, false); assert.equal(out[0].have, 1);
  assert.equal(out[1].isMe, true); assert.deepEqual(out[1].collection, {}); // bad JSON => {}
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test stickersync.test.js`
Expected: FAIL — `S.buildPayload is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `worldcup/sticker-sync.js`, add before the `return`:

```js
  function buildPayload(action, cfg, extra) {
    return Object.assign({ action: action, familyCode: cfg.code, memberId: cfg.memberId }, extra || {});
  }

  function tradeTransition(trade, response) {
    if (!trade || trade.status !== 'pending') return null;
    if (response === 'accept') return 'accepted';
    if (response === 'decline') return 'declined';
    return null;
  }

  function summarizeFamily(rows, myId, totalsOf) {
    return (rows || []).map((r) => {
      let collection = {};
      try { collection = JSON.parse(r.collectionJSON || '{}') || {}; } catch (e) { collection = {}; }
      const t = totalsOf(collection);
      return { id: r.memberId, name: r.name, emoji: r.emoji, updatedAt: r.updatedAt,
               have: t.have, total: t.total, doubles: t.doubles, isMe: r.memberId === myId, collection: collection };
    });
  }
```

Extend the returned object:

```js
  return { genMemberId: genMemberId, parseSetupLink: parseSetupLink, serializeCollection: serializeCollection,
           buildPayload: buildPayload, tradeTransition: tradeTransition, summarizeFamily: summarizeFamily };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test stickersync.test.js`
Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add worldcup/sticker-sync.js stickersync.test.js
git commit -m "feat(sync): payload builder, trade transitions, family summary"
```

---

## Task 3: Transport (`postAction`) + in-memory fake server, end-to-end

**Files:**
- Modify: `worldcup/sticker-sync.js`
- Modify: `stickersync.test.js`

> `postAction` is the only impure function. It POSTs `text/plain` JSON and parses the JSON
> reply, throwing on transport failure or `{ok:false}`. Tests inject a fake `fetchImpl` that
> mimics the Apps Script server in memory, so the whole client round-trips without Google.

- [ ] **Step 1: Write the failing tests**

Append to `stickersync.test.js`:

```js
// Minimal in-memory stand-in for the Apps Script web app. Mirrors family-sync.gs actions.
function makeFakeServer() {
  const members = []; // {familyCode,memberId,name,emoji,updatedAt,collectionJSON}
  const trades = [];  // {tradeId,familyCode,fromId,fromName,toId,toName,giveCodes,wantCodes,status,createdAt,updatedAt}
  let tid = 0;
  // returns a fetch-like impl
  return async function fakeFetch(url, opts) {
    const body = JSON.parse(opts.body);
    const fc = body.familyCode;
    let res;
    if (body.action === 'publishCollection') {
      let row = members.find((m) => m.familyCode === fc && m.memberId === body.memberId);
      if (!row) { row = { familyCode: fc, memberId: body.memberId }; members.push(row); }
      Object.assign(row, { name: body.name, emoji: body.emoji, updatedAt: 1,
        collectionJSON: JSON.stringify(body.collection || {}) });
      res = { ok: true };
    } else if (body.action === 'getFamily') {
      res = { ok: true, members: members.filter((m) => m.familyCode === fc),
              trades: trades.filter((t) => t.familyCode === fc) };
    } else if (body.action === 'proposeTrade') {
      const t = { tradeId: 't' + (++tid), familyCode: fc, fromId: body.memberId, fromName: body.fromName,
        toId: body.toId, toName: body.toName, giveCodes: (body.giveCodes || []).join(','),
        wantCodes: (body.wantCodes || []).join(','), status: 'pending', createdAt: 1, updatedAt: 1 };
      trades.push(t); res = { ok: true, tradeId: t.tradeId };
    } else if (body.action === 'respondTrade') {
      const t = trades.find((x) => x.tradeId === body.tradeId && x.familyCode === fc && x.toId === body.memberId);
      if (!t || t.status !== 'pending') res = { ok: false, error: 'not allowed' };
      else { t.status = body.response === 'accept' ? 'accepted' : 'declined'; res = { ok: true }; }
    } else { res = { ok: false, error: 'unknown action' }; }
    return { ok: true, json: async () => res, text: async () => JSON.stringify(res) };
  };
}

test('postAction sends text/plain and parses JSON', async () => {
  let seen = null;
  const fake = async (url, opts) => { seen = opts; return { ok: true, json: async () => ({ ok: true, hi: 1 }) }; };
  const cfg = { url: 'https://x.test/exec', code: 'fam1', memberId: 'm_a' };
  const r = await S.postAction(cfg, 'getFamily', {}, fake);
  assert.equal(r.hi, 1);
  assert.equal(seen.method, 'POST');
  assert.match(seen.headers['Content-Type'], /text\/plain/);
  assert.deepEqual(JSON.parse(seen.body), { action: 'getFamily', familyCode: 'fam1', memberId: 'm_a' });
});

test('postAction throws on ok:false', async () => {
  const fake = async () => ({ ok: true, json: async () => ({ ok: false, error: 'bad code' }) });
  await assert.rejects(() => S.postAction({ url: 'u', code: 'c', memberId: 'm' }, 'getFamily', {}, fake),
    /bad code/);
});

test('client round-trip: publish -> getFamily -> propose -> accept', async () => {
  const fake = makeFakeServer();
  const dad = { url: 'u', code: 'fam', memberId: 'm_dad' };
  const mia = { url: 'u', code: 'fam', memberId: 'm_mia' };
  await S.postAction(dad, 'publishCollection', { name: 'Dad', emoji: '👨', collection: { MEX2: 2 } }, fake);
  await S.postAction(mia, 'publishCollection', { name: 'Mia', emoji: '👧', collection: { ARG17: 2 } }, fake);
  let fam = await S.postAction(mia, 'getFamily', {}, fake);
  assert.equal(fam.members.length, 2);
  const prop = await S.postAction(dad, 'proposeTrade',
    { toId: 'm_mia', toName: 'Mia', fromName: 'Dad', giveCodes: ['MEX2'], wantCodes: ['ARG17'] }, fake);
  assert.ok(prop.tradeId);
  await S.postAction(mia, 'respondTrade', { tradeId: prop.tradeId, response: 'accept' }, fake);
  fam = await S.postAction(mia, 'getFamily', {}, fake);
  assert.equal(fam.trades[0].status, 'accepted');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test stickersync.test.js`
Expected: FAIL — `S.postAction is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `worldcup/sticker-sync.js`, add before the `return`:

```js
  async function postAction(cfg, action, extra, fetchImpl) {
    const f = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
    if (!f) throw new Error('no fetch available');
    if (!cfg || !cfg.url) throw new Error('Family Sync is not set up');
    const res = await f(cfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(buildPayload(action, cfg, extra)),
    });
    if (!res.ok) throw new Error('network error (' + res.status + ')');
    const data = await res.json();
    if (!data || data.ok === false) throw new Error((data && data.error) || 'request failed');
    return data;
  }
```

Add `postAction: postAction` to the returned object.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test stickersync.test.js`
Expected: PASS — 9 tests.

- [ ] **Step 5: Commit**

```bash
git add worldcup/sticker-sync.js stickersync.test.js
git commit -m "feat(sync): postAction transport + in-memory fake round-trip test"
```

---

## Task 4: Apps Script reference server (`family-sync.gs`)

**Files:**
- Create: `worldcup/family-sync.gs`

> Not loaded by the web app — it's the code the operator pastes into Google Apps Script.
> Its behaviour mirrors the Node fake from Task 3 exactly (same actions, same fields).

- [ ] **Step 1: Create the file**

Create `worldcup/family-sync.gs`:

```javascript
/* Family Sync server for the World Cup 2026 sticker tracker.
 * Paste into a Google Sheet → Extensions → Apps Script. Then:
 *   Deploy → New deployment → Web app → Execute as: Me → Who has access: Anyone → Deploy.
 * Copy the /exec URL; share <hub>/worldcup/?sync=<exec-url>&code=<your-family-code>.
 *
 * Optional: set SECRET below to reject any other code. Empty SECRET = any code works and
 * simply namespaces its own data (the code is the shared "room key").
 */
var SECRET = ''; // e.g. 'merry-fam-2026' to lock to one code; '' = accept any code.
var MEMBERS = 'Members';
var TRADES = 'Trades';

function doPost(e) {
  var out = {};
  try {
    var body = JSON.parse(e.postData.contents);
    if (SECRET && body.familyCode !== SECRET) { out = { ok: false, error: 'bad family code' }; }
    else { out = handle(body); }
  } catch (err) { out = { ok: false, error: String(err) }; }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function sheet(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(headers); }
  return sh;
}
function rows(sh) {
  var v = sh.getDataRange().getValues(); if (v.length < 2) return [];
  var h = v[0], out = [];
  for (var i = 1; i < v.length; i++) { var o = {}; for (var j = 0; j < h.length; j++) o[h[j]] = v[i][j]; o._row = i + 1; out.push(o); }
  return out;
}

function handle(b) {
  var fc = b.familyCode || '';
  if (b.action === 'publishCollection') {
    var sh = sheet(MEMBERS, ['familyCode','memberId','name','emoji','updatedAt','collectionJSON']);
    var rs = rows(sh), now = new Date().toISOString();
    var found = rs.filter(function (r) { return r.familyCode === fc && r.memberId === b.memberId; })[0];
    var rec = [fc, b.memberId, b.name || '', b.emoji || '🙂', now, JSON.stringify(b.collection || {})];
    if (found) sh.getRange(found._row, 1, 1, rec.length).setValues([rec]);
    else sh.appendRow(rec);
    return { ok: true };
  }
  if (b.action === 'getFamily') {
    var ms = rows(sheet(MEMBERS, ['familyCode','memberId','name','emoji','updatedAt','collectionJSON']))
      .filter(function (r) { return r.familyCode === fc; })
      .map(function (r) { return { memberId: r.memberId, name: r.name, emoji: r.emoji, updatedAt: r.updatedAt, collectionJSON: r.collectionJSON }; });
    var ts = rows(sheet(TRADES, ['tradeId','familyCode','fromId','fromName','toId','toName','giveCodes','wantCodes','status','createdAt','updatedAt']))
      .filter(function (r) { return r.familyCode === fc; });
    return { ok: true, members: ms, trades: ts };
  }
  if (b.action === 'proposeTrade') {
    var t = sheet(TRADES, ['tradeId','familyCode','fromId','fromName','toId','toName','giveCodes','wantCodes','status','createdAt','updatedAt']);
    var id = Utilities.getUuid(), now2 = new Date().toISOString();
    t.appendRow([id, fc, b.memberId, b.fromName || '', b.toId || '', b.toName || '',
      (b.giveCodes || []).join(','), (b.wantCodes || []).join(','), 'pending', now2, now2]);
    return { ok: true, tradeId: id };
  }
  if (b.action === 'respondTrade') {
    var sh3 = sheet(TRADES, ['tradeId','familyCode','fromId','fromName','toId','toName','giveCodes','wantCodes','status','createdAt','updatedAt']);
    var rs3 = rows(sh3);
    var row = rs3.filter(function (r) { return r.tradeId === b.tradeId && r.familyCode === fc && r.toId === b.memberId; })[0];
    if (!row || row.status !== 'pending') return { ok: false, error: 'not allowed' };
    sh3.getRange(row._row, 9).setValue(b.response === 'accept' ? 'accepted' : 'declined');
    sh3.getRange(row._row, 11).setValue(new Date().toISOString());
    return { ok: true };
  }
  return { ok: false, error: 'unknown action' };
}
```

- [ ] **Step 2: Verify it parses as JS (syntax only)**

Run: `node --check worldcup/family-sync.gs`
Expected: no output (exit 0). (It won't *run* in Node — it uses Google globals — but it must parse.)

- [ ] **Step 3: Commit**

```bash
git add worldcup/family-sync.gs
git commit -m "feat(sync): Apps Script reference server (family-sync.gs)"
```

---

## Task 5: Config plumbing in `useHubStore`

**Files:**
- Modify: `worldcup/hub-data.js`

> Adds a `sync` config (`{url, code, memberId}`) to the store, initialized from `localStorage`
> and auto-applied from a `?sync=&code=` setup link on first load (generating a `memberId`).

- [ ] **Step 1: Add the sync key + loader near the other keys**

In `worldcup/hub-data.js`, find `const skey = (id) => "wc26stickers:" + id;` and add below it:

```js
const SYNC_KEY = "wc26sync";
function loadSync() {
  let cur = null;
  try { cur = JSON.parse(localStorage.getItem(SYNC_KEY)); } catch (e) { cur = null; }
  // a one-tap setup link (?sync=&code=) configures/updates this device
  try {
    const link = window.WCSTKSYNC && window.WCSTKSYNC.parseSetupLink(window.location.search);
    if (link) {
      const memberId = (cur && cur.memberId) || window.WCSTKSYNC.genMemberId();
      cur = { url: link.url, code: link.code, memberId: memberId };
      try { localStorage.setItem(SYNC_KEY, JSON.stringify(cur)); } catch (e) {}
    }
  } catch (e) {}
  return cur || null;
}
```

- [ ] **Step 2: Add sync state + setter inside `useHubStore`**

Inside `window.useHubStore = function () { ... }`, after the `collections` state, add:

```js
  const [sync, setSyncState] = React.useState(loadSync);
  React.useEffect(() => { try {
    if (sync) localStorage.setItem(SYNC_KEY, JSON.stringify(sync)); else localStorage.removeItem(SYNC_KEY);
  } catch (e) {} }, [sync]);
  const setSync = (cfg) => setSyncState(cfg);
```

- [ ] **Step 3: Expose `sync` + `setSync` from the hook**

Add `sync` and `setSync` to the hook's final `return { ... }`:

```js
  return { store: { results: results, bracket: bracket }, brackets: brackets,
           collections: collections, setSticker: setSticker, sync: sync, setSync: setSync,
           setResult: setResult, setPick: setPick, reset: reset,
           players: players, addPlayer: addPlayer, switchPlayer: switchPlayer,
           removePlayer: removePlayer, importPlayer: importPlayer };
```

- [ ] **Step 4: Verify it still parses**

Run: `node -e "require('./worldcup/hub-data.js')" 2>&1 | head -3`
Expected: a `ReferenceError` (React/window/localStorage not defined) — NOT a `SyntaxError`.

Run: `node --test stickertest.js stickersync.test.js` → all prior tests still pass.

- [ ] **Step 5: Commit**

```bash
git add worldcup/hub-data.js
git commit -m "feat(sync): wc26sync config in useHubStore (+ setup-link apply)"
```

---

## Task 6: Family segment — setup (not-configured) state

**Files:**
- Modify: `worldcup/hub-stickers.jsx`
- Modify: `worldcup/index.html`
- Modify: `worldcup/hub.jsx`

- [ ] **Step 1: Load the sync script**

In `worldcup/index.html`, find `<script src="sticker-enrich.js"></script>` and add after it:

```html
<script src="sticker-sync.js"></script>
```

- [ ] **Step 2: Add the `FamilyView` setup state + the segment**

In `worldcup/hub-stickers.jsx`, add this component above `StickersTab`:

```jsx
function FamilyView({ map, players, activeId, sync, setSync }) {
  const SY = window.WCSTKSYNC;
  const [link, setLink] = React.useState("");

  if (!sync) {
    const connect = () => {
      let cfg = null;
      const fromLink = SY.parseSetupLink(link.indexOf("?") >= 0 ? link.slice(link.indexOf("?")) : "?" + link);
      if (fromLink) cfg = { url: fromLink.url, code: fromLink.code, memberId: SY.genMemberId() };
      if (cfg) setSync(cfg);
    };
    return (
      <div style={{ background: "rgba(52,199,123,.12)", border: "2px solid rgba(52,199,123,.45)", borderRadius: 14, padding: 16, maxWidth: 560 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#bdf0d3", marginBottom: 6 }}>👨‍👩‍👧 Trade with family far away</div>
        <div style={{ fontSize: 14, color: "#dfe6ff", marginBottom: 12, lineHeight: 1.45 }}>
          Paste the family setup link someone shared with you (it looks like <code>…/worldcup/?sync=…&code=…</code>). Then you can publish your collection and propose trades across households.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste setup link"
            style={{ fontFamily: "inherit", fontSize: 15, borderRadius: 10, border: "none", padding: "9px 12px", background: "rgba(255,255,255,.14)", color: "#fff", flex: "1 1 220px" }} />
          <button onClick={connect} style={{ border: "none", cursor: "pointer", background: "#34c77b", color: "#06351f", fontWeight: 800, borderRadius: 10, padding: "9px 18px", fontSize: 15 }}>Connect</button>
        </div>
      </div>
    );
  }
  return <FamilyConnected map={map} players={players} activeId={activeId} sync={sync} setSync={setSync} />;
}
```

Add a placeholder `FamilyConnected` (filled in Tasks 7–8) above `FamilyView`:

```jsx
function FamilyConnected({ sync }) {
  return <div style={{ color: "#9fb0e0", padding: 24 }}>Connected to family sync. (Roster & trades — Tasks 7–8.)</div>;
}
```

- [ ] **Step 3: Add the segment to `StickersTab`**

In `StickersTab`, change the signature and add the segment + render. Replace the function header:

```jsx
function StickersTab({ collections, setSticker, players, addPlayer, sync, setSync }) {
```

Add a 4th segment button (after the overview `seg`):

```jsx
        {seg("book", "📖 My Book")}{seg("trade", "🔄 Trade Matcher")}{seg("overview", "📊 Overview")}{seg("family", "👨‍👩‍👧 Family")}
```

Add the render case (after the overview line):

```jsx
      {view === "family" && <FamilyView map={map} players={players} activeId={activeId} sync={sync} setSync={setSync} />}
```

- [ ] **Step 4: Pass `sync`/`setSync` from `hub.jsx`**

In `worldcup/hub.jsx`, find the `useHubStore()` destructure (the line with `collections, setSticker`) and add `sync, setSync`:

```js
  const { store, brackets, collections, setSticker, sync, setSync, setResult, setPick, reset, players, addPlayer, switchPlayer, removePlayer, importPlayer } = useHubStore();
```

Then update the StickersTab render line:

```jsx
        {tab === "stickers" && <StickersTab collections={collections} setSticker={setSticker} players={players} addPlayer={addPlayer} sync={sync} setSync={setSync} />}
```

- [ ] **Step 5: Smoke (segment renders; unconfigured = setup card, no errors)**

Run:
```bash
( cd worldcup && python3 -m http.server 8088 >/tmp/stk_serve.log 2>&1 & echo $! > /tmp/stk_serve.pid ); sleep 1; node stickersmoke.js; echo "exit=$?"; kill "$(cat /tmp/stk_serve.pid)" 2>/dev/null || true
```
Expected: existing checks still pass, `JS errors: 0`. (The Family segment exists; default state shows the setup card.)

- [ ] **Step 6: Commit**

```bash
git add worldcup/hub-stickers.jsx worldcup/index.html worldcup/hub.jsx
git commit -m "feat(sync): Family segment + setup (not-configured) state"
```

---

## Task 7: Family connected — publish + roster

**Files:**
- Modify: `worldcup/hub-stickers.jsx`

- [ ] **Step 1: Replace `FamilyConnected` with publish + roster**

In `worldcup/hub-stickers.jsx`, replace the placeholder `FamilyConnected` with:

```jsx
function FamilyConnected({ map, players, activeId, sync, setSync }) {
  const SY = window.WCSTKSYNC, L = window.WCSTKLOGIC, WCSTK = window.WCSTK;
  const idx = React.useMemo(() => L.buildIndex(WCSTK), [WCSTK]);
  const me = players.list.find((p) => p.id === activeId) || { name: "Me", emoji: "🙂" };
  const [data, setData] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");

  const load = React.useCallback(async () => {
    setErr(""); setBusy(true);
    try { setData(await SY.postAction(sync, "getFamily", {})); }
    catch (e) { setErr(String(e.message || e)); }
    setBusy(false);
  }, [sync]);
  React.useEffect(() => { load(); }, [load]);

  const publish = async () => {
    setErr(""); setBusy(true);
    try {
      await SY.postAction(sync, "publishCollection",
        { name: me.name, emoji: me.emoji, collection: SY.serializeCollection(map) });
      await load();
    } catch (e) { setErr(String(e.message || e)); setBusy(false); }
  };

  const totalsOf = (m) => L.playerTotals(m, idx);
  const fam = data ? SY.summarizeFamily(data.members, sync.memberId, totalsOf) : [];

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <button onClick={publish} disabled={busy} style={{ border: "none", cursor: "pointer", background: "#34c77b", color: "#06351f", fontWeight: 800, borderRadius: 10, padding: "9px 16px", fontSize: 15, opacity: busy ? .6 : 1 }}>⬆️ Publish my collection</button>
        <button onClick={load} disabled={busy} style={{ border: "none", cursor: "pointer", background: "rgba(255,255,255,.12)", color: "#dfe6ff", fontWeight: 700, borderRadius: 10, padding: "9px 14px", fontSize: 14 }}>↻ Refresh</button>
        <button onClick={() => { if (window.confirm("Disconnect this device from family sync?")) setSync(null); }} style={{ marginLeft: "auto", border: "none", cursor: "pointer", background: "transparent", color: "#7e8cc0", fontSize: 13, textDecoration: "underline" }}>Disconnect</button>
      </div>
      {err && <div style={{ background: "rgba(226,71,59,.18)", border: "2px solid rgba(226,71,59,.5)", borderRadius: 12, padding: "10px 12px", color: "#ffd7d2", fontSize: 14, marginBottom: 12 }}>⚠️ {err}</div>}
      {busy && !data && <div style={{ color: "#9fb0e0", padding: 12 }}>Loading family…</div>}
      <div style={{ display: "grid", gap: 10 }}>
        {fam.map((f) => {
          const pct = f.total ? Math.round((f.have / f.total) * 100) : 0;
          return (
            <div key={f.id} style={{ background: "rgba(255,255,255,.06)", borderRadius: 12, padding: "10px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, color: "#fff", marginBottom: 6 }}>
                <span>{f.emoji} {f.name} {f.isMe ? "(you)" : ""}</span>
                <span style={{ color: "#f4b740", fontWeight: 700 }}>{f.have}/{f.total} · {f.doubles} dbl</span>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,.1)", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ width: pct + "%", height: "100%", background: "#34c77b" }} />
              </div>
            </div>
          );
        })}
        {data && !fam.length && <div style={{ color: "#9fb0e0", padding: 12 }}>No one has published yet — tap “Publish my collection”.</div>}
      </div>
      <FamilyTrades data={data} fam={fam} sync={sync} idx={idx} map={map} me={me} reload={load} setErr={setErr} setBusy={setBusy} busy={busy} />
    </div>
  );
}
```

Add a temporary stub for `FamilyTrades` (filled in Task 8) just above `FamilyConnected`:

```jsx
function FamilyTrades() { return null; }
```

- [ ] **Step 2: Smoke (still graceful; no errors on load)**

Run the Task 6 serve+smoke block. Expected: existing checks pass, `JS errors: 0`. (Family still shows the setup card by default since no `wc26sync` is configured in the smoke profile.)

- [ ] **Step 3: Commit**

```bash
git add worldcup/hub-stickers.jsx
git commit -m "feat(sync): publish collection + family roster"
```

---

## Task 8: Family trades — propose + accept/decline

**Files:**
- Modify: `worldcup/hub-stickers.jsx`

- [ ] **Step 1: Replace the `FamilyTrades` stub**

In `worldcup/hub-stickers.jsx`, replace `function FamilyTrades() { return null; }` with:

```jsx
function FamilyTrades({ data, fam, sync, idx, map, me, reload, setErr, setBusy, busy }) {
  const SY = window.WCSTKSYNC, L = window.WCSTKLOGIC;
  const [withId, setWithId] = React.useState("");
  if (!data) return null;
  const others = fam.filter((f) => !f.isMe);
  const trades = data.trades || [];
  const incoming = trades.filter((t) => t.toId === sync.memberId && t.status === "pending");
  const mineOut = trades.filter((t) => t.fromId === sync.memberId);

  const target = others.find((o) => o.id === withId) || others[0];
  const match = target ? L.tradeMatch(SY.serializeCollection(map), target.collection, idx) : { iGive: [], iWant: [], swaps: 0 };

  const propose = async () => {
    if (!target) return;
    setErr(""); setBusy(true);
    try {
      await SY.postAction(sync, "proposeTrade", { toId: target.id, toName: target.name, fromName: me.name,
        giveCodes: match.iGive, wantCodes: match.iWant });
      await reload();
    } catch (e) { setErr(String(e.message || e)); setBusy(false); }
  };
  const respond = async (tradeId, response) => {
    setErr(""); setBusy(true);
    try { await SY.postAction(sync, "respondTrade", { tradeId: tradeId, response: response }); await reload(); }
    catch (e) { setErr(String(e.message || e)); setBusy(false); }
  };

  const chip = (c) => <span key={c} style={{ background: "rgba(255,255,255,.1)", color: "#dfe6ff", borderRadius: 8, padding: "3px 8px", fontSize: 13, marginRight: 4 }}>#{c}</span>;

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: "#f4b740", marginBottom: 8 }}>🤝 Trades</div>

      {incoming.length > 0 && <div style={{ fontSize: 13, color: "#9fb0e0", marginBottom: 6 }}>Waiting for you:</div>}
      {incoming.map((t) => (
        <div key={t.tradeId} style={{ background: "rgba(255,255,255,.06)", borderRadius: 12, padding: "10px 12px", marginBottom: 8 }}>
          <div style={{ fontSize: 14, color: "#fff", marginBottom: 6 }}><b>{t.fromName}</b> offers {String(t.giveCodes || "").split(",").filter(Boolean).map(chip)} for your {String(t.wantCodes || "").split(",").filter(Boolean).map(chip)}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => respond(t.tradeId, "accept")} disabled={busy} style={{ border: "none", cursor: "pointer", background: "#34c77b", color: "#06351f", fontWeight: 700, borderRadius: 8, padding: "6px 14px" }}>Accept</button>
            <button onClick={() => respond(t.tradeId, "decline")} disabled={busy} style={{ border: "none", cursor: "pointer", background: "rgba(255,255,255,.12)", color: "#dfe6ff", fontWeight: 700, borderRadius: 8, padding: "6px 14px" }}>Decline</button>
          </div>
        </div>
      ))}

      {others.length > 0 ? (
        <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 12, padding: "10px 12px", marginTop: 6 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
            <span style={{ color: "#dfe6ff", fontSize: 14 }}>Propose a trade with</span>
            <select value={target ? target.id : ""} onChange={(e) => setWithId(e.target.value)} style={{ fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: "#16235a", background: "#f4b740", border: "none", borderRadius: 8, padding: "5px 8px" }}>
              {others.map((o) => <option key={o.id} value={o.id}>{o.emoji} {o.name}</option>)}
            </select>
            <button onClick={propose} disabled={busy || (!match.iGive.length && !match.iWant.length)} style={{ marginLeft: "auto", border: "none", cursor: "pointer", background: "#34c77b", color: "#06351f", fontWeight: 700, borderRadius: 8, padding: "6px 14px", opacity: (!match.iGive.length && !match.iWant.length) ? .5 : 1 }}>Send proposal</button>
          </div>
          <div style={{ fontSize: 13, color: "#dfe6ff" }}>You give: {match.iGive.length ? match.iGive.map(chip) : <span style={{ color: "#7e8cc0" }}>—</span>}</div>
          <div style={{ fontSize: 13, color: "#dfe6ff", marginTop: 4 }}>You get: {match.iWant.length ? match.iWant.map(chip) : <span style={{ color: "#7e8cc0" }}>—</span>}</div>
        </div>
      ) : <div style={{ color: "#9fb0e0", fontSize: 14 }}>When others publish, you can propose trades here.</div>}

      {mineOut.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 13, color: "#9fb0e0" }}>
          Your proposals: {mineOut.map((t) => <span key={t.tradeId} style={{ marginRight: 8 }}>→ {t.toName}: <b style={{ color: t.status === "accepted" ? "#34c77b" : t.status === "declined" ? "#e2473b" : "#f4b740" }}>{t.status}</b></span>)}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Smoke (no errors)**

Run the Task 6 serve+smoke block. Expected: existing checks pass, `JS errors: 0`.

- [ ] **Step 3: Run all logic tests**

Run: `node --test stickertest.js stickersync.test.js`
Expected: all pass (19 + 9).

- [ ] **Step 4: Commit**

```bash
git add worldcup/hub-stickers.jsx
git commit -m "feat(sync): propose + accept/decline family trades"
```

---

## Task 9: Settings status line + operator setup docs

**Files:**
- Modify: `worldcup/hub.jsx` (Settings tab area) — OR `worldcup/hub-extras.jsx` if Settings lives there; grep first
- Modify: `README.md`

- [ ] **Step 1: Find where the Settings tab is rendered**

Run: `grep -rn "SettingsTab\|scoreMode\|Manual — you type" worldcup/*.jsx | head`
Expected: identifies the Settings component file + function.

- [ ] **Step 2: Add a Family-Sync status line to Settings**

In the Settings component identified above, add (inside its returned JSX, near the end, adjust prop access to match how that component receives store data — if it doesn't receive `sync`, thread `sync` to it the same way other props are passed from `hub.jsx`):

```jsx
      <div style={{ marginTop: 16, fontSize: 13.5, color: "#9fb0e0" }}>
        👨‍👩‍👧 <b style={{ color: "#dfe6ff" }}>Family Sync:</b> {sync ? "connected" : "not set up"} — manage it on the 🎟️ Stickers → Family tab.
      </div>
```

If threading `sync` into Settings is more than a one-line prop pass, SKIP this step and note it — the Family tab already exposes connect/disconnect, so this is optional polish. Record the decision in the commit message.

- [ ] **Step 3: Document operator setup in the README**

In `README.md`, add a subsection under the Hub section:

```markdown
### 👨‍👩‍👧 Family Sync (trade stickers with relatives far away) — optional

Stickers can be shared across households with a free Google Sheet as the backend. The Hub
works fully without this — it's opt-in.

1. Create a Google Sheet. **Extensions → Apps Script**, paste `worldcup/family-sync.gs`, Save.
2. **Deploy → New deployment → Web app** — *Execute as: Me*, *Who has access: Anyone* — Deploy, and copy the **/exec URL**.
3. Pick a **family code** (any word). Share this one link with relatives (a QR works too):
   `https://<your-hub>/worldcup/?sync=<EXEC_URL>&code=<FAMILY_CODE>`
4. Each person opens the link once on their phone, creates their player, taps **Publish my
   collection**, and can propose trades on the **🎟️ Stickers → 👨‍👩‍👧 Family** tab.

> Security: the endpoint is gated only by the family code — anyone with the link can read/write
> your family's sticker data, so don't post it publicly. Data lives in your private Sheet
> (names + sticker counts only). The `/exec` URL is a secret — never commit it.
```

- [ ] **Step 4: Smoke + commit**

Run the Task 6 serve+smoke block → `JS errors: 0`.

```bash
git add worldcup/hub.jsx worldcup/hub-extras.jsx README.md 2>/dev/null; git add -A
git commit -m "docs(sync): Settings status line + operator setup guide"
```

---

## Task 10: Manual end-to-end verification (documented)

**Files:** none (verification only)

- [ ] **Step 1: Deploy a throwaway test Sheet**

Follow the README steps with a temporary Sheet + code `test1`. Copy the `/exec` URL.

- [ ] **Step 2: Two-profile round trip**

In one browser profile open `…/worldcup/?sync=<url>&code=test1`, create player “Dad”, mark some
doubles, **Publish**. In a second profile (or incognito) open the same link, create “Mia”,
mark different doubles, **Publish**, **Refresh** → Dad appears in the roster. As Dad, propose a
trade to Mia; as Mia, **Refresh** → Accept it; as Dad, **Refresh** → status shows `accepted`.

- [ ] **Step 3: Confirm graceful offline**

Load `…/worldcup/?tab=stickers` with NO sync configured (and/or offline) → Family tab shows the
setup card; My Book / Trade Matcher / Overview work normally; no console errors.

- [ ] **Step 4: Record the result**

Note pass/fail + the test `/exec` URL used (do not commit the URL). Delete the test deployment
when done.

---

## Notes for the implementer

- **CORS:** always POST with `Content-Type: text/plain;charset=utf-8` and a JSON string body.
  Do NOT use `application/json` (triggers a preflight Apps Script can't answer). Reads are POSTs too.
- **No secrets in the repo:** the `/exec` URL + family code live only in the setup link / `localStorage`.
  Never hardcode them in any committed file.
- **Graceful always:** every `postAction` call in the UI is wrapped in try/catch and surfaces a
  friendly inline error — a sync failure must never blank the tab or throw.
- **Local-first:** publishing is explicit; the owner's `localStorage` collection stays the source
  of truth. Family Sync never overwrites the local collection.
- **`window.confirm`** is used for Disconnect — acceptable for a real user action (not in the headless smoke path).
