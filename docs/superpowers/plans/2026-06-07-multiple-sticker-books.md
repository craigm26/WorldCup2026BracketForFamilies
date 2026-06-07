# Multiple Sticker Books per Person — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let each family member own several named sticker books (e.g. "My album" + "Swaps"), each with independent counts, used as the unit of trading locally and in Family Sync.

**Architecture:** A new pure dual-export module `sticker-books.js` (`window.WCSTKBOOKS`) holds all book-registry logic (default/migrate/add/rename/remove/active). `useHubStore` consumes it: `collections` becomes keyed by **bookId** (the default book's id == playerId, so existing data never moves), and a per-player `books` registry is stored at `wc26books:<playerId>`. The Stickers UI gains a book switcher in My Book; Trade Matcher and Overview iterate `(player, book)` pairs; Family Sync pushes each of the active player's books as its own row (`bookId`/`bookLabel`), one entry per (member, book).

**Tech Stack:** Static React-via-Babel (no build), localStorage, Google Apps Script backend, `node --test` for pure modules, Puppeteer (`puppeteer-core` + `/usr/bin/chromium`) for UI smoke.

**How to run the unit suite (all 42 existing + new):**
```bash
cd /home/craigm26/kiosk-work/repo
node --test stickertest.js stickersync.test.js globetest.js helptest.js setuptest.js stickerbookstest.js
```

---

## Task 1: Pure books-registry module

**Files:**
- Create: `worldcup/sticker-books.js`
- Test: `stickerbookstest.js`

- [ ] **Step 1: Write the failing test**

Create `stickerbookstest.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const B = require('./worldcup/sticker-books.js');

test('defaultRegistry: one book whose id == playerId, labelled "My album", active', () => {
  const r = B.defaultRegistry('family');
  assert.deepEqual(r, { list: [{ id: 'family', label: 'My album' }], active: 'family' });
});

test('migrateRegistry: absent/empty -> default registry (no data move; default id == playerId)', () => {
  assert.deepEqual(B.migrateRegistry(null, 'p1'), B.defaultRegistry('p1'));
  assert.deepEqual(B.migrateRegistry({ list: [] }, 'p1'), B.defaultRegistry('p1'));
});

test('migrateRegistry: a valid registry is preserved (labels normalized, active repaired)', () => {
  const existing = { list: [{ id: 'p1', label: 'Main' }, { id: 'b2', label: 'Swaps' }], active: 'gone' };
  const r = B.migrateRegistry(existing, 'p1');
  assert.deepEqual(r.list.map((b) => b.id), ['p1', 'b2']);
  assert.equal(r.active, 'p1'); // active 'gone' not in list -> first book
});

test('addBook: appends with given id, normalizes label, becomes active', () => {
  const r = B.addBook(B.defaultRegistry('p1'), 'Swaps', 'b2');
  assert.deepEqual(r.list, [{ id: 'p1', label: 'My album' }, { id: 'b2', label: 'Swaps' }]);
  assert.equal(r.active, 'b2');
});

test('addBook: blank label falls back to "Book N"; long label is capped', () => {
  const r = B.addBook(B.defaultRegistry('p1'), '   ', 'b2');
  assert.equal(r.list[1].label, 'Book 2');
  const r2 = B.addBook(B.defaultRegistry('p1'), 'x'.repeat(40), 'b3');
  assert.ok(r2.list[1].label.length <= 20);
});

test('renameBook: changes only the target label', () => {
  const start = B.addBook(B.defaultRegistry('p1'), 'Swaps', 'b2');
  const r = B.renameBook(start, 'b2', 'Spares');
  assert.equal(B.labelOf(r, 'b2'), 'Spares');
  assert.equal(B.labelOf(r, 'p1'), 'My album');
});

test('removeBook: refuses to remove the last book', () => {
  const res = B.removeBook(B.defaultRegistry('p1'), 'p1');
  assert.equal(res.removed, false);
  assert.deepEqual(res.reg, B.defaultRegistry('p1'));
});

test('removeBook: removing the active book re-points active to a remaining book', () => {
  const reg = B.addBook(B.defaultRegistry('p1'), 'Swaps', 'b2'); // active b2
  const res = B.removeBook(reg, 'b2');
  assert.equal(res.removed, true);
  assert.deepEqual(res.reg.list.map((b) => b.id), ['p1']);
  assert.equal(res.reg.active, 'p1');
});

test('removeBook: removing a non-active book keeps active', () => {
  const reg = { list: [{ id: 'p1', label: 'My album' }, { id: 'b2', label: 'Swaps' }], active: 'p1' };
  const res = B.removeBook(reg, 'b2');
  assert.equal(res.removed, true);
  assert.equal(res.reg.active, 'p1');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test stickerbookstest.js`
Expected: FAIL — `Cannot find module './worldcup/sticker-books.js'`.

- [ ] **Step 3: Write minimal implementation**

Create `worldcup/sticker-books.js`:

```js
/* Sticker-book registry: pure logic for "multiple books per person".
   A registry is { list:[{id,label}], active }. The DEFAULT book's id === the playerId,
   so the existing wc26stickers:<playerId> collection IS that book — migration moves no data.
   Dual export: window.WCSTKBOOKS (browser) + module.exports (Node tests). */
(function (root, factory) {
  const api = factory();
  if (typeof window !== 'undefined') window.WCSTKBOOKS = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(this, function () {
  var DEFAULT_LABEL = 'My album';
  var MAXLABEL = 20;

  function normalizeLabel(label, n) {
    var s = (label == null ? '' : String(label)).trim().slice(0, MAXLABEL);
    return s || ('Book ' + (n || 1));
  }
  function defaultBook(playerId) { return { id: playerId, label: DEFAULT_LABEL }; }
  function defaultRegistry(playerId) { return { list: [defaultBook(playerId)], active: playerId }; }

  function migrateRegistry(existing, playerId) {
    if (existing && existing.list && existing.list.length) {
      var list = existing.list.map(function (b, i) { return { id: b.id, label: normalizeLabel(b.label, i + 1) }; });
      var active = list.some(function (b) { return b.id === existing.active; }) ? existing.active : list[0].id;
      return { list: list, active: active };
    }
    return defaultRegistry(playerId);
  }

  function addBook(reg, label, id) {
    var list = (reg && reg.list) ? reg.list.slice() : [];
    list.push({ id: id, label: normalizeLabel(label, list.length + 1) });
    return { list: list, active: id };
  }
  function renameBook(reg, bookId, label) {
    var list = (reg.list || []).map(function (b, i) {
      return b.id === bookId ? { id: b.id, label: normalizeLabel(label, i + 1) } : b;
    });
    return { list: list, active: reg.active };
  }
  function removeBook(reg, bookId) {
    var list = reg.list || [];
    if (list.length <= 1) return { reg: reg, removed: false };
    var nl = list.filter(function (b) { return b.id !== bookId; });
    if (nl.length === list.length) return { reg: reg, removed: false };
    var active = reg.active === bookId ? nl[0].id : reg.active;
    return { reg: { list: nl, active: active }, removed: true };
  }
  function activeBookId(reg) { return reg && reg.active; }
  function labelOf(reg, bookId) {
    var b = ((reg && reg.list) || []).find(function (x) { return x.id === bookId; });
    return b ? b.label : '';
  }

  return { DEFAULT_LABEL: DEFAULT_LABEL, normalizeLabel: normalizeLabel, defaultBook: defaultBook,
    defaultRegistry: defaultRegistry, migrateRegistry: migrateRegistry, addBook: addBook,
    renameBook: renameBook, removeBook: removeBook, activeBookId: activeBookId, labelOf: labelOf };
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test stickerbookstest.js`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add worldcup/sticker-books.js stickerbookstest.js
git commit -m "feat(stickers): pure books-registry module (default/migrate/add/rename/remove) + tests

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Load `sticker-books.js` in the page

**Files:**
- Modify: `worldcup/index.html:36`

- [ ] **Step 1: Add the script tag before `hub-data.js`**

In `worldcup/index.html`, the store consumes `window.WCSTKBOOKS` at runtime. Insert the line directly **before** `<script src="hub-data.js"></script>` (line 36):

```html
<script src="sticker-books.js"></script>
<script src="hub-data.js"></script>
```

- [ ] **Step 2: Verify the page still loads with no console errors**

Run (server in background, then a short smoke):
```bash
cd /home/craigm26/kiosk-work/repo/worldcup
python3 -m http.server 8088 >/tmp/wc-srv.log 2>&1 &
SRV=$!
sleep 1
node -e "const p=require('puppeteer-core');(async()=>{const b=await p.launch({executablePath:'/usr/bin/chromium',headless:'new',args:['--no-sandbox','--disable-gpu']});const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error'&&!/favicon/i.test(m.text()))errs.push(m.text())});await pg.goto('http://localhost:8088/?tab=stickers',{waitUntil:'networkidle2',timeout:35000});await new Promise(r=>setTimeout(r,3000));console.log('WCSTKBOOKS loaded:',await pg.evaluate(()=>!!window.WCSTKBOOKS));console.log('errors:',errs.length,errs.slice(0,3).join(' | '));await b.close();})();"
kill $SRV 2>/dev/null
```
Expected: `WCSTKBOOKS loaded: true` and `errors: 0`.

- [ ] **Step 3: Commit**

```bash
git add worldcup/index.html
git commit -m "feat(stickers): load sticker-books.js before the store

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Store wiring — books state, bookId-keyed collections, book CRUD

**Files:**
- Modify: `worldcup/hub-data.js:60-142` (the keys, loaders, `useHubStore`, return object)

This is the core change. `collections` becomes keyed by **bookId**; a `books` map is added; `setSticker` takes a `bookId`; book CRUD is added; `addPlayer`/`importPlayer`/`removePlayer` thread through the registry.

- [ ] **Step 1: Add key helpers + loaders**

Replace the block that defines `skey`/`SYNC_KEY` and `loadPlayers` (currently `hub-data.js:63-83`) so it also has a books key and loaders. The new block:

```js
const bkey = (id) => "wc26bracket:" + id;
const skey = (id) => "wc26stickers:" + id;     // keyed by bookId (default book's id == playerId)
const bkkey = (id) => "wc26books:" + id;        // per-player book registry
const SYNC_KEY = "wc26sync";
function loadSync() {
  let cur = null;
  try { cur = JSON.parse(localStorage.getItem(SYNC_KEY)); } catch (e) { cur = null; }
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
function loadPlayers() {
  try { const p = JSON.parse(localStorage.getItem("wc26players")); if (p && p.list && p.list.length) return p; } catch (e) {}
  return { list: [{ id: "family", name: "Family", emoji: "👪" }], active: "family" };
}
// Per-player book registries; migrates (and persists) a default book for any player missing one.
// Metadata-only: never reads or writes wc26stickers:* — the default book's id == playerId, so the
// existing per-player collection already IS that book.
function loadBooks(players) {
  const B = window.WCSTKBOOKS;
  const out = {};
  (players.list || []).forEach((pl) => {
    let existing = null;
    try { existing = JSON.parse(localStorage.getItem(bkkey(pl.id))); } catch (e) { existing = null; }
    const reg = B ? B.migrateRegistry(existing, pl.id)
                  : (existing && existing.list && existing.list.length ? existing
                     : { list: [{ id: pl.id, label: "My album" }], active: pl.id });
    out[pl.id] = reg;
    try { localStorage.setItem(bkkey(pl.id), JSON.stringify(reg)); } catch (e) {}
  });
  return out;
}
// Collections keyed by bookId, read across every book of every player.
function loadCollections(books) {
  const out = {};
  Object.keys(books).forEach((pid) => {
    (books[pid].list || []).forEach((bk) => {
      try { out[bk.id] = JSON.parse(localStorage.getItem(skey(bk.id))) || {}; }
      catch (e) { out[bk.id] = {}; }
    });
  });
  return out;
}
```

- [ ] **Step 2: Rewire the state + effects in `useHubStore`**

Replace the `collections` state initializer and its persistence effect (currently `hub-data.js:100-115`) and add the `books` state. The state/effect section becomes:

```js
  const [players, setPlayers] = React.useState(loadPlayers);
  const [results, setResults] = React.useState(() => { try { return JSON.parse(localStorage.getItem("wc26results")) || {}; } catch (e) { return {}; } });
  const [brackets, setBrackets] = React.useState(() => {
    const out = {}; loadPlayers().list.forEach((pl) => { try { out[pl.id] = JSON.parse(localStorage.getItem(bkey(pl.id))) || {}; } catch (e) { out[pl.id] = {}; } }); return out;
  });
  const [books, setBooks] = React.useState(() => loadBooks(loadPlayers()));
  const [collections, setCollections] = React.useState(() => loadCollections(loadBooks(loadPlayers())));
  React.useEffect(() => { try { localStorage.setItem("wc26players", JSON.stringify(players)); } catch (e) {} }, [players]);
  React.useEffect(() => { try { localStorage.setItem("wc26results", JSON.stringify(results)); } catch (e) {} }, [results]);
  React.useEffect(() => { try { Object.keys(brackets).forEach((id) => localStorage.setItem(bkey(id), JSON.stringify(brackets[id]))); } catch (e) {} }, [brackets]);
  React.useEffect(() => { try { Object.keys(books).forEach((pid) => localStorage.setItem(bkkey(pid), JSON.stringify(books[pid]))); } catch (e) {} }, [books]);
  React.useEffect(() => { try { Object.keys(collections).forEach((id) => localStorage.setItem(skey(id), JSON.stringify(collections[id]))); } catch (e) {} }, [collections]);
```

(Leave the `sync` state/effect block immediately below unchanged.)

- [ ] **Step 3: Change `setSticker` to key by bookId, and add book CRUD**

Replace the existing `setSticker` (currently `hub-data.js:123-127`) with the bookId version and the book-CRUD actions:

```js
  const setSticker = (bookId, n, count) => setCollections((c) => {
    const cur = Object.assign({}, c[bookId] || {});
    if (count <= 0) delete cur[String(n)]; else cur[String(n)] = count;
    return Object.assign({}, c, { [bookId]: cur });
  });

  const B = window.WCSTKBOOKS;
  const regOf = (pid) => (books[pid] || (B ? B.defaultRegistry(pid) : { list: [{ id: pid, label: "My album" }], active: pid }));
  const addBook = (playerId, label) => {
    const id = "b" + Date.now();
    setBooks((bk) => Object.assign({}, bk, { [playerId]: B.addBook(bk[playerId] || B.defaultRegistry(playerId), label, id) }));
    setCollections((c) => Object.assign({}, c, { [id]: {} }));
  };
  const renameBook = (playerId, bookId, label) => setBooks((bk) =>
    Object.assign({}, bk, { [playerId]: B.renameBook(bk[playerId] || B.defaultRegistry(playerId), bookId, label) }));
  const switchBook = (playerId, bookId) => setBooks((bk) => {
    const r = bk[playerId]; if (!r) return bk;
    return Object.assign({}, bk, { [playerId]: { list: r.list, active: bookId } });
  });
  const removeBook = (playerId, bookId) => setBooks((bk) => {
    const r = bk[playerId] || B.defaultRegistry(playerId);
    const res = B.removeBook(r, bookId);
    if (!res.removed) return bk;
    try { localStorage.removeItem(skey(bookId)); } catch (e) {}
    setCollections((c) => { const n = Object.assign({}, c); delete n[bookId]; return n; });
    return Object.assign({}, bk, { [playerId]: res.reg });
  });
```

- [ ] **Step 4: Thread the registry through add/import/remove player**

Replace `addPlayer`, `removePlayer`, and `importPlayer` (currently `hub-data.js:133-136`) with versions that maintain the books registry. The default book's id == the new playerId, so `collections[id] = {}` is both the player's default book and its collection:

```js
  const addPlayer = (name, emoji) => {
    const id = "p" + Date.now();
    setBrackets((b) => Object.assign({}, b, { [id]: {} }));
    setCollections((c) => Object.assign({}, c, { [id]: {} }));
    setBooks((bk) => Object.assign({}, bk, { [id]: B.defaultRegistry(id) }));
    setPlayers((p) => ({ list: p.list.concat([{ id: id, name: (name || "Player").slice(0, 14), emoji: emoji || "🙂" }]), active: id }));
  };
  const switchPlayer = (id) => setPlayers((p) => Object.assign({}, p, { active: id }));
  const removePlayer = (id) => setPlayers((p) => {
    if (p.list.length <= 1) return p;
    const reg = books[id] || B.defaultRegistry(id);
    try { localStorage.removeItem(bkkey(id)); localStorage.removeItem(bkey(id)); reg.list.forEach((bk) => localStorage.removeItem(skey(bk.id))); } catch (e) {}
    setBooks((bk) => { const n = Object.assign({}, bk); delete n[id]; return n; });
    setCollections((c) => { const n = Object.assign({}, c); reg.list.forEach((bk) => delete n[bk.id]); return n; });
    const list = p.list.filter((x) => x.id !== id);
    return { list: list, active: p.active === id ? list[0].id : p.active };
  });
  const importPlayer = (name, emoji, bracketObj) => {
    const id = "p" + Date.now();
    setBrackets((b) => Object.assign({}, b, { [id]: bracketObj || {} }));
    setCollections((c) => Object.assign({}, c, { [id]: {} }));
    setBooks((bk) => Object.assign({}, bk, { [id]: B.defaultRegistry(id) }));
    setPlayers((p) => ({ list: p.list.concat([{ id: id, name: (name || "Player").slice(0, 14), emoji: emoji || "📥" }]), active: id }));
  };
```

- [ ] **Step 5: Export the new fields from the store**

Replace the `return { ... }` of `useHubStore` (currently `hub-data.js:137-141`) with:

```js
  return { store: { results: results, bracket: bracket }, brackets: brackets,
           collections: collections, setSticker: setSticker, sync: sync, setSync: setSync,
           setResult: setResult, setPick: setPick, reset: reset,
           players: players, addPlayer: addPlayer, switchPlayer: switchPlayer,
           removePlayer: removePlayer, importPlayer: importPlayer,
           books: books, addBook: addBook, renameBook: renameBook, removeBook: removeBook, switchBook: switchBook };
```

- [ ] **Step 6: Verify existing collections survive (migration) + no console errors**

This task changes `setSticker`'s signature, so the app is temporarily inconsistent with `hub-stickers.jsx` (fixed in Task 4). Verify only the store-level invariants here:

```bash
cd /home/craigm26/kiosk-work/repo/worldcup
python3 -m http.server 8088 >/tmp/wc-srv.log 2>&1 &
SRV=$!
sleep 1
node -e "const p=require('puppeteer-core');(async()=>{const b=await p.launch({executablePath:'/usr/bin/chromium',headless:'new',args:['--no-sandbox','--disable-gpu']});const pg=await b.newPage();
// Seed a legacy single-collection player BEFORE the app boots, then load.
await pg.goto('http://localhost:8088/?tab=stickers',{waitUntil:'networkidle2',timeout:35000});
await pg.evaluate(()=>{localStorage.clear();localStorage.setItem('wc26players',JSON.stringify({list:[{id:'family',name:'Family',emoji:'👪'}],active:'family'}));localStorage.setItem('wc26stickers:family',JSON.stringify({MEX5:2}));});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error'&&!/favicon/i.test(m.text()))errs.push(m.text())});
await pg.reload({waitUntil:'networkidle2',timeout:35000});await new Promise(r=>setTimeout(r,3000));
const reg=await pg.evaluate(()=>JSON.parse(localStorage.getItem('wc26books:family')));
const coll=await pg.evaluate(()=>JSON.parse(localStorage.getItem('wc26stickers:family')));
console.log('default book id==playerId:',reg&&reg.list[0].id==='family'&&reg.list[0].label==='My album');
console.log('legacy collection untouched (MEX5:2):',coll&&coll.MEX5===2);
console.log('errors:',errs.length,errs.slice(0,3).join(' | '));
await b.close();})();"
kill $SRV 2>/dev/null
```
Expected: `default book id==playerId: true`, `legacy collection untouched (MEX5:2): true`, `errors: 0`.

- [ ] **Step 7: Commit**

```bash
git add worldcup/hub-data.js
git commit -m "feat(stickers): store keeps a per-player books registry; collections keyed by bookId

Default book id == playerId so existing wc26stickers:<playerId> data never moves.
setSticker now takes a bookId; adds addBook/renameBook/removeBook/switchBook and
threads the registry through add/import/removePlayer.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: My Book — book switcher + edit the active book

**Files:**
- Modify: `worldcup/hub.jsx:457,574` (destructure + pass new props)
- Modify: `worldcup/hub-stickers.jsx` (`StickersTab`, `MyBookView`; add `BookBar`)

- [ ] **Step 1: Pass the new store fields into `StickersTab`**

In `worldcup/hub.jsx`, the destructure at line 457 already lists store fields; add the books fields:

```js
  const { store, brackets, collections, setSticker, sync, setSync, setResult, setPick, reset, players, addPlayer, switchPlayer, removePlayer, importPlayer, books, addBook, renameBook, removeBook, switchBook } = useHubStore();
```

And the `StickersTab` usage at line 574 becomes:

```js
        {tab === "stickers" && <StickersTab collections={collections} setSticker={setSticker} players={players} books={books} addBook={addBook} renameBook={renameBook} removeBook={removeBook} switchBook={switchBook} addPlayer={addPlayer} sync={sync} setSync={setSync} goHelp={goHelp} />}
```

- [ ] **Step 2: Add a `BookBar` component (inline add/rename/delete — NO browser dialogs)**

In `worldcup/hub-stickers.jsx`, add this component just above `MyBookView` (after `ScanSwap`/`StickerDetail`). It uses inline inputs (Puppeteer-friendly), never `window.prompt`/`confirm`.

**Important:** the ✏️ button uses `aria-label`, NOT `title`. The sticker smoke's `tap()` selects `document.querySelector('[title]')` expecting the first sticker slot — if `BookBar` (which renders above the grid) had a `title` anywhere, it would become the first `[title]` and every sticker tap would hit the button instead. Keep `aria-label` here, and do not add `title` to any other `BookBar` element.

```jsx
function BookBar({ reg, playerId, addBook, renameBook, removeBook, switchBook }) {
  const [adding, setAdding] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [label, setLabel] = React.useState("");
  const active = reg.active;
  const activeBook = reg.list.find((b) => b.id === active) || reg.list[0];
  const canDelete = reg.list.length > 1;

  const doAdd = () => { const n = label.trim(); if (n) { addBook(playerId, n); setLabel(""); setAdding(false); } };
  const doRename = () => { const n = label.trim(); if (n) { renameBook(playerId, active, n); } setEditing(false); setLabel(""); };

  const pill = (b) => (
    <button key={b.id} onClick={() => switchBook(playerId, b.id)}
      style={{ border: "none", cursor: "pointer", borderRadius: 20, padding: "6px 14px", fontSize: 14, fontWeight: 700,
        background: b.id === active ? "#34c77b" : "rgba(255,255,255,.1)", color: b.id === active ? "#06351f" : "#dfe6ff" }}>
      📗 {b.label}
    </button>
  );

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
      {reg.list.map(pill)}
      {!adding ? (
        <button onClick={() => { setAdding(true); setLabel(""); }} style={{ border: "none", cursor: "pointer", borderRadius: 20,
          padding: "6px 12px", fontSize: 14, fontWeight: 700, background: "rgba(255,255,255,.12)", color: "#dfe6ff" }}>＋ Book</button>
      ) : (
        <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input value={label} autoFocus onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") doAdd(); }}
            placeholder="Book name e.g. Swaps" style={{ fontFamily: "inherit", fontSize: 14, borderRadius: 8, border: "none", padding: "6px 10px", background: "rgba(255,255,255,.14)", color: "#fff", width: 150 }} />
          <button onClick={doAdd} style={{ border: "none", cursor: "pointer", background: "#34c77b", color: "#06351f", fontWeight: 700, borderRadius: 8, padding: "6px 12px" }}>Add</button>
          <button onClick={() => setAdding(false)} style={{ border: "none", cursor: "pointer", background: "rgba(255,255,255,.12)", color: "#dfe6ff", borderRadius: 8, padding: "6px 10px" }}>✕</button>
        </span>
      )}
      <button onClick={() => { setEditing((v) => !v); setLabel(activeBook.label); }} aria-label="Rename or delete this book"
        style={{ border: "none", cursor: "pointer", background: "transparent", color: "#9fb0e0", fontSize: 14, padding: "6px 4px" }}>✏️</button>
      {editing && (
        <span style={{ display: "flex", gap: 6, alignItems: "center", flexBasis: "100%" }}>
          <input value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") doRename(); }}
            style={{ fontFamily: "inherit", fontSize: 14, borderRadius: 8, border: "none", padding: "6px 10px", background: "rgba(255,255,255,.14)", color: "#fff", width: 150 }} />
          <button onClick={doRename} style={{ border: "none", cursor: "pointer", background: "#34c77b", color: "#06351f", fontWeight: 700, borderRadius: 8, padding: "6px 12px" }}>Rename</button>
          <button onClick={() => { if (canDelete) { removeBook(playerId, active); setEditing(false); } }} disabled={!canDelete}
            style={{ border: "none", cursor: canDelete ? "pointer" : "default", background: "rgba(226,71,59,.2)", color: "#ffd7d2", fontWeight: 700, borderRadius: 8, padding: "6px 12px", opacity: canDelete ? 1 : .4 }}>Delete book</button>
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Render `BookBar` in `MyBookView` and edit the active book**

Change `MyBookView`'s signature and its `setSticker` calls from `activeId` to `activeBook`, and render `BookBar` at the top. Replace the `function MyBookView(...)` signature line and the three `setSticker(activeId, ...)` / `<StickerPage ... activeId={activeId}>` references:

```jsx
function MyBookView({ map, setSticker, activeBook, reg, playerId, addBook, renameBook, removeBook, switchBook }) {
  const WCSTK = window.WCSTK, L = window.WCSTKLOGIC;
  const idx = React.useMemo(() => L.buildIndex(WCSTK), [WCSTK]);
  const totals = L.playerTotals(map, idx);
  const [filter, setFilter] = React.useState("all");
  const [q, setQ] = React.useState("");
  const [info, setInfo] = React.useState(null);

  const onTap = (n) => setSticker(activeBook, n, L.cycleCount(map[n]));
  const onMinus = (n) => setSticker(activeBook, n, Math.max(0, (map[n] || 0) - 1));
```

Then, immediately inside the returned `<div>` (before the sticky filter bar `<div style={{ position: "sticky" ...`), add:

```jsx
      <BookBar reg={reg} playerId={playerId} addBook={addBook} renameBook={renameBook} removeBook={removeBook} switchBook={switchBook} />
```

Change the `<StickerPage ... setSticker={setSticker} activeId={activeId} />` call to pass `activeId={activeBook}` (StickerPage forwards it to `setSticker` only via props it already receives — update that prop name), and the `StickerDetail` `onSet` from `setSticker(activeId, n, c)` to `setSticker(activeBook, n, c)`:

```jsx
            <StickerPage page={p} map={map} onTap={onTap} onMinus={onMinus} onInfo={setInfo} setSticker={setSticker} activeId={activeBook} />
```
```jsx
      <StickerDetail slot={info} count={info ? (map[info.n] || 0) : 0} onClose={() => setInfo(null)} onSet={(n, c) => setSticker(activeBook, n, c)} />
```

(`StickerPage` itself passes `setSticker`/`activeId` through but never calls `setSticker` directly — grep confirms only `onTap`/`onMinus`/`onInfo` are used in its body — so no further change is needed there. The `activeId` prop it receives is now the bookId.)

- [ ] **Step 4: Update `StickersTab` to resolve the active book and pass it down**

Replace the body of `StickersTab` (currently `hub-stickers.jsx:517-540`) with:

```jsx
function StickersTab({ collections, setSticker, players, books, addBook, renameBook, removeBook, switchBook, addPlayer, sync, setSync, goHelp }) {
  const [view, setView] = React.useState("book"); // book | trade | overview | family
  const B = window.WCSTKBOOKS;
  const activeId = players.active;
  const reg = (books && books[activeId]) || (B ? B.defaultRegistry(activeId) : { list: [{ id: activeId, label: "My album" }], active: activeId });
  const activeBook = reg.active;
  const map = (collections && collections[activeBook]) || {};

  const seg = (id, label) => (
    <button onClick={() => setView(id)} style={{ border: "none", cursor: "pointer", borderRadius: 12,
      padding: "9px 16px", fontSize: 15, fontWeight: 700,
      background: view === id ? "#f4b740" : "rgba(255,255,255,.1)", color: view === id ? "#16235a" : "#dfe6ff" }}>{label}</button>
  );

  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        {seg("book", "📖 My Book")}{seg("trade", "🔄 Trade Matcher")}{seg("overview", "📊 Overview")}{seg("family", "👨‍👩‍👧 Family")}
        {goHelp && <span style={{ marginLeft: "auto" }}><HelpLink goHelp={goHelp} id="stk-mark" label="How stickers work" /></span>}
      </div>
      {view === "book" && <MyBookView map={map} setSticker={setSticker} activeBook={activeBook} reg={reg} playerId={activeId} addBook={addBook} renameBook={renameBook} removeBook={removeBook} switchBook={switchBook} />}
      {view === "trade" && <TradeMatcherView collections={collections} players={players} books={books} activeId={activeId} addPlayer={addPlayer} />}
      {view === "overview" && <OverviewView collections={collections} players={players} books={books} addPlayer={addPlayer} />}
      {view === "family" && <FamilyView map={map} players={players} books={books} collections={collections} activeId={activeId} sync={sync} setSync={setSync} goHelp={goHelp} />}
    </div>
  );
}
```

(Trade Matcher, Overview, and Family receive `books`/`collections`; their internals are updated in Tasks 5–6. They keep working in the meantime because a single default book per player reproduces today's behavior.)

- [ ] **Step 5: Extend the smoke harness with book switching**

Append to `stickersmoke.js`, just before the final `console.log('JS errors'...)` line, a block that adds a second book, edits it independently, and switches back. Insert:

```js
  // --- multiple books per person ---
  await clickSeg('My Book'); await new Promise(r => setTimeout(r, 300));
  // add a "Swaps" book
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /＋ Book/.test(x.textContent)); if (b) b.click(); });
  await new Promise(r => setTimeout(r, 200));
  await page.type('input[placeholder*="Book name"]', 'Swaps');
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent === 'Add'); if (b) b.click(); });
  await new Promise(r => setTimeout(r, 400));
  const hasSwaps = await page.evaluate(() => /📗 Swaps/.test(document.body.innerText));
  console.log('second book "Swaps" added + active:', hasSwaps);
  // the new book starts empty: the ×2 from earlier must be gone in this book
  const swapsEmpty = await page.evaluate(() => !/×2/.test(document.body.innerText));
  console.log('new book has independent (empty) counts:', swapsEmpty);
  // tap one sticker in Swaps, then switch back to "My album" — Swaps edit must not bleed
  await tap(); await new Promise(r => setTimeout(r, 250));
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /📗 My album/.test(x.textContent)); if (b) b.click(); });
  await new Promise(r => setTimeout(r, 350));
  const backOnAlbum = await page.evaluate(() => /📗 My album/.test(document.body.innerText));
  console.log('switched back to My album:', backOnAlbum);
```

And extend the final pass condition:

```js
  const ok = onBook && hasDouble && overviewAdd && tradeAdd && matcherWorks && hasSwaps && swapsEmpty && backOnAlbum && errs.length === 0;
```

- [ ] **Step 6: Run the smoke**

```bash
cd /home/craigm26/kiosk-work/repo/worldcup
python3 -m http.server 8088 >/tmp/wc-srv.log 2>&1 &
SRV=$!
sleep 1
cd /home/craigm26/kiosk-work/repo
node stickersmoke.js; RC=$?
kill $SRV 2>/dev/null
echo "smoke exit: $RC"
```
Expected: all lines true, `JS errors: 0`, `smoke exit: 0`.

- [ ] **Step 7: Commit**

```bash
git add worldcup/hub.jsx worldcup/hub-stickers.jsx stickersmoke.js
git commit -m "feat(stickers): book switcher in My Book; edit the active book

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Trade Matcher + Overview iterate (player, book) pairs

**Files:**
- Modify: `worldcup/hub-stickers.jsx` (`TradeMatcherView`, `OverviewView`; add a shared `bookEntries` helper)

- [ ] **Step 1: Add a `bookEntries` helper near the top of `hub-stickers.jsx`**

After `fmtWhen` (line 8), add a helper that flattens players × books into labelled entries. A default book ("My album" whose id == playerId) collapses to just the person's name so the single-book case looks unchanged:

```jsx
// Flatten players × their books into trade/overview entries. The default book
// (id == playerId, label "My album") shows as just the person's name.
function bookEntries(players, books, collections) {
  const B = window.WCSTKBOOKS;
  const out = [];
  (players.list || []).forEach((p) => {
    const reg = (books && books[p.id]) || (B ? B.defaultRegistry(p.id) : { list: [{ id: p.id, label: "My album" }] });
    (reg.list || []).forEach((bk) => {
      const isDefault = bk.id === p.id && bk.label === ((B && B.DEFAULT_LABEL) || "My album");
      out.push({ key: bk.id, playerId: p.id, bookId: bk.id, emoji: p.emoji,
        name: isDefault ? p.name : (p.name + " · " + bk.label),
        map: (collections && collections[bk.id]) || {} });
    });
  });
  return out;
}
```

- [ ] **Step 2: Rewrite `TradeMatcherView` to match book-to-book**

Replace `TradeMatcherView` (currently `hub-stickers.jsx:270-306`) with:

```jsx
function TradeMatcherView({ collections, players, books, activeId, addPlayer }) {
  const L = window.WCSTKLOGIC, WCSTK = window.WCSTK, B = window.WCSTKBOOKS;
  const idx = React.useMemo(() => L.buildIndex(WCSTK), [WCSTK]);
  const entries = bookEntries(players, books, collections);
  const reg = (books && books[activeId]) || (B ? B.defaultRegistry(activeId) : { active: activeId });
  const activeBook = reg.active;
  const mineEntry = entries.find((e) => e.bookId === activeBook) || entries.find((e) => e.playerId === activeId);
  const others = entries.filter((e) => e.bookId !== (mineEntry ? mineEntry.bookId : activeBook));
  const [otherKey, setOtherKey] = React.useState(others.length ? others[0].key : null);

  if (!others.length) return (
    <AddPlayerCard addPlayer={addPlayer}
      title="🔄 Trading needs at least two books"
      blurb="Add another family member as a player — or add a second book (like a 'Swaps' book) in 📖 My Book — then the Trade Matcher shows exactly which of your doubles you can swap for the stickers they still need. (Players are shared with the 🏠 Home Pick'em.)" />
  );

  const validKey = others.some((e) => e.key === otherKey) ? otherKey : others[0].key;
  const them = others.find((e) => e.key === validKey);
  const mine = mineEntry ? mineEntry.map : {};
  const r = L.tradeMatch(mine, them.map, idx);

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ color: "#dfe6ff", fontWeight: 600 }}>Trade {mineEntry ? mineEntry.emoji + " " + mineEntry.name : "you"} with</span>
        <select value={validKey} onChange={(e) => setOtherKey(e.target.value)} style={{ fontFamily: "inherit", fontSize: 15,
          fontWeight: 700, color: "#16235a", background: "#f4b740", border: "none", borderRadius: 8, padding: "6px 10px" }}>
          {others.map((e) => <option key={e.key} value={e.key}>{e.emoji} {e.name}</option>)}
        </select>
        <span style={{ marginLeft: "auto", fontSize: 16, fontWeight: 800, color: "#34c77b" }}>🤝 {r.swaps} perfect swap{r.swaps === 1 ? "" : "s"}</span>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <TradeColumn title={"You give → " + them.name} nums={r.iGive} idx={idx} accent="#f4b740" />
        <TradeColumn title={them.name + " gives → you"} nums={r.iWant} idx={idx} accent="#9fc0ff" />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Rewrite `OverviewView` to list every (player, book) entry**

Replace `OverviewView` (currently `hub-stickers.jsx:308-350`) with:

```jsx
function OverviewView({ collections, players, books, addPlayer }) {
  const L = window.WCSTKLOGIC, WCSTK = window.WCSTK;
  const idx = React.useMemo(() => L.buildIndex(WCSTK), [WCSTK]);
  const entries = bookEntries(players, books, collections);
  const rarest = L.rarestNeeded(entries.map((e) => e.map), idx);
  return (
    <div>
      {entries.length < 2 && (
        <div style={{ marginBottom: 16 }}>
          <AddPlayerCard addPlayer={addPlayer}
            title="👪 Add the whole family to compare"
            blurb="Each person gets their own collection — and can keep more than one book. Add a player for each family member (or a second book) to see everyone’s progress side by side, and who needs what for trading." />
        </div>
      )}
      <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
        {entries.map((e) => {
          const t = L.playerTotals(e.map, idx);
          const pct = t.total ? Math.round((t.have / t.total) * 100) : 0;
          return (
            <div key={e.key} style={{ background: "rgba(255,255,255,.06)", borderRadius: 12, padding: "10px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, color: "#fff", marginBottom: 6 }}>
                <span>{e.emoji} {e.name}</span>
                <span style={{ color: "#f4b740", fontWeight: 700 }}>{t.have}/{t.total} · {t.doubles} dbl</span>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,.1)", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ width: pct + "%", height: "100%", background: "#34c77b" }} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ background: "rgba(244,183,64,.14)", border: "2px solid rgba(244,183,64,.4)", borderRadius: 14, padding: "12px 14px" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#f4b740", marginBottom: 6 }}>🔎 Rarest — nobody has these ({rarest.length})</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {rarest.slice(0, 40).map((n) => (
            <span key={n} style={{ background: "rgba(255,255,255,.1)", color: "#dfe6ff", borderRadius: 8, padding: "3px 8px", fontSize: 13 }}>#{n}</span>
          ))}
          {rarest.length > 40 && <span style={{ color: "#9fb0e0", fontSize: 13 }}>+{rarest.length - 40} more</span>}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Extend the smoke to prove book-to-book matching with a single player**

Append to `stickersmoke.js` (after the book-switch block from Task 4, before the final `console.log('JS errors'...)`). With one player but two books, the Trade Matcher must now work without adding a second person:

```js
  // book-to-book trading works with a single person who has two books
  await clickSeg('Trade Matcher'); await new Promise(r => setTimeout(r, 400));
  const bookToBook = await page.evaluate(() => /perfect swap/i.test(document.body.innerText));
  console.log('Trade Matcher matches book-to-book (1 person, 2 books):', bookToBook);
```

(Note: by this point in the smoke a second player "Mia" was already added in the existing flow, so there are ≥2 entries regardless; this assertion still holds. Keep the earlier `tradeAdd`/`matcherWorks` assertions.)

Extend the pass condition:

```js
  const ok = onBook && hasDouble && overviewAdd && tradeAdd && matcherWorks && hasSwaps && swapsEmpty && backOnAlbum && bookToBook && errs.length === 0;
```

- [ ] **Step 5: Run the smoke**

```bash
cd /home/craigm26/kiosk-work/repo/worldcup
python3 -m http.server 8088 >/tmp/wc-srv.log 2>&1 &
SRV=$!
sleep 1
cd /home/craigm26/kiosk-work/repo
node stickersmoke.js; RC=$?
kill $SRV 2>/dev/null
echo "smoke exit: $RC"
```
Expected: all lines true, `JS errors: 0`, `smoke exit: 0`.

- [ ] **Step 6: Commit**

```bash
git add worldcup/hub-stickers.jsx stickersmoke.js
git commit -m "feat(stickers): Trade Matcher + Overview iterate (player, book) pairs

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Family Sync — one entry per (member, book)

**Files:**
- Modify: `worldcup/sticker-sync.js` (`summarizeFamily`)
- Test: `stickersync.test.js`
- Modify: `worldcup/hub-stickers.jsx` (`FamilyView`, `FamilyConnected`, `FamilyTrades`)
- Modify: `worldcup/family-sync.gs` (reference backend)

- [ ] **Step 1: Write the failing sync test**

Append to `stickersync.test.js`:

```js
test('summarizeFamily: one entry per (member, book), keyed by memberId+bookId, carries bookLabel', () => {
  const rows = [
    { memberId: 'm1', bookId: 'm1', bookLabel: 'My album', name: 'Jake', emoji: '🙂', collectionJSON: JSON.stringify({ MEX5: 2 }) },
    { memberId: 'm1', bookId: 'b9', bookLabel: 'Swaps', name: 'Jake', emoji: '🙂', collectionJSON: JSON.stringify({ ARG1: 3 }) },
    { memberId: 'm2', bookId: 'm2', bookLabel: 'My album', name: 'Mia', emoji: '👧', collectionJSON: JSON.stringify({ MEX5: 1 }) },
  ];
  const totalsOf = (m) => ({ have: Object.keys(m).length, total: 980, doubles: Object.values(m).filter((c) => c >= 2).length });
  const fam = SY.summarizeFamily(rows, 'm1', totalsOf);
  assert.equal(fam.length, 3);
  assert.equal(fam[0].id, 'm1::m1');
  assert.equal(fam[1].id, 'm1::b9');
  assert.equal(fam[1].bookLabel, 'Swaps');
  assert.equal(fam[0].isMe, true);   // member-level identity
  assert.equal(fam[2].isMe, false);
});

test('summarizeFamily: a legacy row without bookId resolves to one "My album" book (bookId = memberId)', () => {
  const rows = [{ memberId: 'm1', name: 'Jake', emoji: '🙂', collectionJSON: JSON.stringify({ MEX5: 2 }) }];
  const totalsOf = (m) => ({ have: Object.keys(m).length, total: 980, doubles: 0 });
  const fam = SY.summarizeFamily(rows, 'mX', totalsOf);
  assert.equal(fam.length, 1);
  assert.equal(fam[0].bookId, 'm1');
  assert.equal(fam[0].id, 'm1::m1');
  assert.equal(fam[0].bookLabel, 'My album');
});
```

Check the top of `stickersync.test.js` already does `const SY = require('./worldcup/sticker-sync.js');` — if the variable is named differently, match it.

- [ ] **Step 2: Run to verify it fails**

Run: `node --test stickersync.test.js`
Expected: FAIL (entries lack `id`/`bookId`/`bookLabel` in the expected shape).

- [ ] **Step 3: Update `summarizeFamily`**

In `worldcup/sticker-sync.js`, replace `summarizeFamily` (lines 37–45) with:

```js
  function summarizeFamily(rows, myId, totalsOf) {
    return (rows || []).map((r) => {
      let collection = {};
      try { collection = JSON.parse(r.collectionJSON || '{}') || {}; } catch (e) { collection = {}; }
      const t = totalsOf(collection);
      const bookId = r.bookId || r.memberId;
      const bookLabel = r.bookLabel || 'My album';
      return { id: r.memberId + '::' + bookId, memberId: r.memberId, bookId: bookId, bookLabel: bookLabel,
               name: r.name, emoji: r.emoji, updatedAt: r.updatedAt,
               have: t.have, total: t.total, doubles: t.doubles, isMe: r.memberId === myId, collection: collection };
    });
  }
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test stickersync.test.js`
Expected: PASS (existing + 2 new).

- [ ] **Step 5: Publish each book; show `Name · Book`; keep cross-household proposals at the person level**

In `worldcup/hub-stickers.jsx`:

(a) `FamilyView` now receives `books`/`collections`/`activeId` (wired in Task 4). Replace its signature and the `FamilyConnected` render call:

```jsx
function FamilyView({ map, players, books, collections, activeId, sync, setSync, goHelp }) {
```
and at the end of `FamilyView` (the `return <FamilyConnected .../>` line):
```jsx
  return <FamilyConnected players={players} books={books} collections={collections} activeId={activeId} sync={sync} setSync={setSync} />;
```

(b) Replace `FamilyConnected`'s signature and its `me`/`publish`/`fam` so it publishes one row per book of the active player and labels family entries `Name · Book`:

```jsx
function FamilyConnected({ players, books, collections, activeId, sync, setSync }) {
  const SY = window.WCSTKSYNC, L = window.WCSTKLOGIC, WCSTK = window.WCSTK, B = window.WCSTKBOOKS;
  const idx = React.useMemo(() => L.buildIndex(WCSTK), [WCSTK]);
  const me = players.list.find((p) => p.id === activeId) || { name: "Me", emoji: "🙂" };
  const reg = (books && books[activeId]) || (B ? B.defaultRegistry(activeId) : { list: [{ id: activeId, label: "My album" }], active: activeId });
  const activeBook = reg.active;
  const map = (collections && collections[activeBook]) || {};
  const [data, setData] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [lastSync, setLastSync] = React.useState("");
  const [viewing, setViewing] = React.useState(null);

  const load = React.useCallback(async () => {
    setErr(""); setBusy(true);
    try {
      setData(await SY.postAction(sync, "getFamily", {}));
      setLastSync(new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }));
    }
    catch (e) { setErr(String(e.message || e)); }
    setBusy(false);
  }, [sync]);
  React.useEffect(() => { load(); }, [load]);

  const publish = async () => {
    setErr(""); setBusy(true);
    try {
      for (const bk of reg.list) {
        await SY.postAction(sync, "publishCollection",
          { name: me.name, emoji: me.emoji, bookId: bk.id, bookLabel: bk.label,
            collection: SY.serializeCollection(collections[bk.id] || {}) });
      }
      await load();
    } catch (e) { setErr(String(e.message || e)); setBusy(false); }
  };

  const totalsOf = (m) => L.playerTotals(m, idx);
  const fam = data ? SY.summarizeFamily(data.members, sync.memberId, totalsOf) : [];
  const famLabel = (f) => f.name + (f.bookLabel && f.bookLabel !== "My album" ? " · " + f.bookLabel : "");
```

Then in `FamilyConnected`'s JSX, change the publish button label to reflect books and use `famLabel(f)` for each row's name. The publish button:
```jsx
        <button onClick={publish} disabled={busy} style={{ border: "none", cursor: "pointer", background: "#34c77b", color: "#06351f", fontWeight: 800, borderRadius: 10, padding: "9px 16px", fontSize: 15, opacity: busy ? .6 : 1 }}>⬆️ Publish my book{reg.list.length > 1 ? "s" : ""}</button>
```
The family row name span:
```jsx
                <span>{f.emoji} {famLabel(f)} {f.isMe ? "(you)" : ""}</span>
```
And pass `map` into `FamilyTrades` as before (it already receives `map`, `me`, `idx`):
```jsx
      <FamilyTrades data={data} fam={fam} sync={sync} idx={idx} map={map} me={me} reload={load} setErr={setErr} setBusy={setBusy} busy={busy} />
```

(c) In `FamilyTrades`, the proposal target is now a per-book entry but the trade is addressed to a **person** (memberId), keeping the existing backend trade keys intact. Change the two places that use `target.id`:

- the matcher uses the entry's collection (unchanged: `target.collection`),
- `propose()` sends the **person** as `toId`:

```jsx
      await SY.postAction(sync, "proposeTrade", { toId: target.memberId, toName: target.name, fromName: me.name,
        giveCodes: match.iGive, wantCodes: match.iWant });
```
and the dropdown keys by entry id:
```jsx
            <select value={target ? target.id : ""} onChange={(e) => setWithId(e.target.value)} style={{ fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: "#16235a", background: "#f4b740", border: "none", borderRadius: 8, padding: "5px 8px" }}>
              {others.map((o) => <option key={o.id} value={o.id}>{o.emoji} {o.name}</option>)}
            </select>
```
(`others` and `target` come from `fam`, which `summarizeFamily` now returns per book, each carrying `memberId`. `withId` matches `o.id` = `memberId::bookId`.)

- [ ] **Step 6: Update the reference Apps Script for the book dimension**

In `worldcup/family-sync.gs`, the `publishCollection` upsert must key on **memberId + bookId** and persist `bookId`/`bookLabel`; reads must tolerate old rows. Read the current file first, then:
- Add `bookId` and `bookLabel` to the members sheet header/columns.
- In the publish handler, compute `bookId = String(b.bookId || b.memberId)` and `bookLabel = String(b.bookLabel || 'My album')`; find the existing row by matching **both** `memberId` AND `bookId` (today it matches `memberId` alone); write `bookId`/`bookLabel` alongside `collectionJSON`.
- In `getFamily`, include `bookId`/`bookLabel` in each returned member row (default `bookId = memberId`, `bookLabel = ''` when the columns are absent/blank).

Add a header comment noting operators must **re-deploy** the Apps Script for per-book sync; old clients (no `bookId`) still work and read back as a single "My album" book.

**Rollout ordering (call out loudly in the `.gs` header and the deploy runbook):** the *read* path degrades gracefully, but the *write* path does not. Until the backend is redeployed, the live script still upserts on `memberId` alone — so a user who adds a second book and taps "Publish my books" sends two `publishCollection` calls with the same `memberId`, and last-write-wins leaves only one book in the sheet (order-dependent). Therefore **re-deploy the Apps Script BEFORE anyone adds a second book.** Single-book users are unaffected either way.

- [ ] **Step 7: Run the full unit suite + smoke**

```bash
cd /home/craigm26/kiosk-work/repo
node --test stickertest.js stickersync.test.js globetest.js helptest.js setuptest.js stickerbookstest.js 2>&1 | grep -E "^# (tests|pass|fail)"
cd worldcup && python3 -m http.server 8088 >/tmp/wc-srv.log 2>&1 &
SRV=$!; sleep 1; cd /home/craigm26/kiosk-work/repo; node stickersmoke.js; RC=$?; kill $SRV 2>/dev/null; echo "smoke exit: $RC"
```
Expected: `# pass` = 44+ (42 existing + new sync tests + books tests), `# fail 0`; smoke exit 0.

- [ ] **Step 8: Commit**

```bash
git add worldcup/sticker-sync.js stickersync.test.js worldcup/hub-stickers.jsx worldcup/family-sync.gs
git commit -m "feat(stickers): Family Sync publishes each book as its own entry (memberId+bookId)

Per-book rows with bookLabel; legacy no-bookId rows resolve to one My album book.
Cross-household trade proposals stay addressed to the person (memberId).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: README note

**Files:**
- Modify: `README.md` (the sticker-tracker feature section)

- [ ] **Step 1: Document multiple books per person**

Find the sticker-tracker description in `README.md` (search for "Trade Matcher" or "My Book") and add one sentence: each family member can keep **more than one book** (e.g. a main album plus a "Swaps" book of duplicates); books are the unit of trading both locally (book-to-book Trade Matcher) and across households (each book shared as its own entry). Do not re-introduce any camera-scanning copy.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: note multiple sticker books per person

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Final verification (after all tasks)

- [ ] Full unit suite green:
  ```bash
  cd /home/craigm26/kiosk-work/repo
  node --test stickertest.js stickersync.test.js globetest.js helptest.js setuptest.js stickerbookstest.js 2>&1 | grep -E "^# (tests|pass|fail)"
  ```
  Expected: `# fail 0`, pass count = 42 + (9 books) + (2 sync) = 53.
- [ ] Smoke green (`node stickersmoke.js` → exit 0, `JS errors: 0`).
- [ ] Manual sanity: legacy single-collection device still shows its stickers as "My album" with no data loss; adding/renaming/deleting books works; last book can't be deleted; Trade Matcher lists `Name · Book`; Family publish sends one row per book.
- [ ] Then use **superpowers:finishing-a-development-branch** to merge `feat/multiple-sticker-books`, and (separately, operator-gated) deploy to the kiosk and re-deploy the Apps Script.
