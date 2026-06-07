# Sticker Collection Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Panini FIFA World Cup 2026 sticker-collection tracker to the family Hub — manual-first, with a local Trade Matcher and structural page fidelity — then layer on progressive camera automation.

**Architecture:** A new "🎟️ Stickers" Hub tab (sibling of Family Pick'em). A dual-export pure-logic module (`sticker-logic.js`) holds all testable functions (browser global + CommonJS) so Node unit tests run fast. The album lives in `sticker-data.js` as ordered pages of slots with real layout metadata. Per-player collections persist under `wc26stickers:<id>`, mirroring the existing `wc26bracket:<id>` pattern. The UI (`hub-stickers.jsx`) renders pages with structural fidelity and emits `setSticker` calls; camera stages reuse the same calls.

**Tech Stack:** Plain static HTML/JS, React 18 via in-browser `@babel/standalone` (`<script type="text/babel">`), `localStorage`, native `getUserMedia` / `<canvas>` / `BarcodeDetector`. Tests: Node built-in `node:test` + `node:assert` (logic) and Puppeteer (`puppeteer-core`, UI smoke).

**Spec:** `docs/superpowers/specs/2026-06-06-sticker-collection-tracker-design.md`

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `worldcup/sticker-logic.js` | Create | Pure functions: `buildIndex`, `cycleCount`, `sectionProgress`, `playerTotals`, `tradeMatch`, `rarestNeeded`. Dual export (`window.WCSTKLOGIC` + `module.exports`). |
| `worldcup/sticker-data.js` | Create | `window.WCSTK` album dataset (pages → slots + layout) + dual export. Best-effort, `confirmed:false` flagged. |
| `worldcup/hub-data.js` | Modify | Extend `useHubStore`: `collections`, `setSticker`, `removePlayer` cleanup of `wc26stickers:<id>`. |
| `worldcup/hub-stickers.jsx` | Create | The "Stickers" tab: My Book / Trade Matcher / Overview views + camera ladder. |
| `worldcup/hub.jsx` | Modify | Add tab to `TABS` + render case. |
| `worldcup/index.html` | Modify | Load `sticker-logic.js`, `sticker-data.js` (plain) + `hub-stickers.jsx` (babel). |
| `worldcup/make-offline.sh` | Modify | Add the three new files to the offline bundle file list. |
| `stickertest.js` | Create | Node unit tests for `sticker-logic.js` + `sticker-data.js` integrity. |

**Test commands** (run from repo root unless noted):
- Logic/data: `node --test stickertest.js`
- UI smoke: serve `worldcup/` on `:8088` then `node stickersmoke.js` (Task 8).

---

## Task 1: Pure logic — index + count cycling

**Files:**
- Create: `worldcup/sticker-logic.js`
- Create: `stickertest.js`

- [ ] **Step 1: Write the failing tests**

Create `stickertest.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const L = require('./worldcup/sticker-logic.js');

const SAMPLE = {
  meta: { title: 'Test', total: 4 },
  pages: [
    { page: 1, section: 'intro', title: 'Intro', team: null, cols: 2, rows: 1,
      slots: [ { n: 1, name: 'Logo', type: 'special' }, { n: 2, name: 'Emblem', type: 'special' } ] },
    { page: 2, section: 'ARG', title: 'Argentina', team: 'ARG', cols: 2, rows: 1,
      slots: [ { n: 3, name: 'Badge', type: 'badge' }, { n: 4, name: 'Player', type: 'player' } ] },
  ],
};

test('buildIndex maps every sticker number to its slot + page', () => {
  const idx = L.buildIndex(SAMPLE);
  assert.equal(idx[3].page, 2);
  assert.equal(idx[3].slot.name, 'Badge');
  assert.equal(Object.keys(idx).length, 4);
});

test('cycleCount increments 0->1->2->3', () => {
  assert.equal(L.cycleCount(0), 1);
  assert.equal(L.cycleCount(1), 2);
  assert.equal(L.cycleCount(2), 3);
  assert.equal(L.cycleCount(undefined), 1);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test stickertest.js`
Expected: FAIL — `Cannot find module './worldcup/sticker-logic.js'`.

- [ ] **Step 3: Write minimal implementation**

Create `worldcup/sticker-logic.js`:

```js
/* Pure, side-effect-free sticker logic. Loadable in the browser (window.WCSTKLOGIC)
   and in Node (module.exports) so it can be unit-tested without a DOM. */
(function (root, factory) {
  const api = factory();
  if (typeof window !== 'undefined') window.WCSTKLOGIC = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(this, function () {
  // number -> { slot, page, section } for O(1) lookups
  function buildIndex(data) {
    const idx = {};
    (data.pages || []).forEach((pg) => {
      (pg.slots || []).forEach((slot) => {
        idx[slot.n] = { slot: slot, page: pg.page, section: pg.section };
      });
    });
    return idx;
  }

  // tap a slot: 0 -> 1 -> 2 -> 3 ... (decrement is handled by callers via Math.max(0, c-1))
  function cycleCount(count) {
    return (count || 0) + 1;
  }

  return { buildIndex: buildIndex, cycleCount: cycleCount };
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test stickertest.js`
Expected: PASS — 2 tests passing.

- [ ] **Step 5: Commit**

```bash
git add worldcup/sticker-logic.js stickertest.js
git commit -m "feat(stickers): pure logic module with index + count cycling"
```

---

## Task 2: Pure logic — progress + totals

**Files:**
- Modify: `worldcup/sticker-logic.js`
- Modify: `stickertest.js`

- [ ] **Step 1: Write the failing tests**

Append to `stickertest.js`:

```js
test('sectionProgress counts owned slots on a page', () => {
  const page = SAMPLE.pages[1]; // ARG, slots 3 & 4
  assert.deepEqual(L.sectionProgress({ '3': 1 }, page), { have: 1, total: 2 });
  assert.deepEqual(L.sectionProgress({ '3': 2, '4': 1 }, page), { have: 2, total: 2 });
  assert.deepEqual(L.sectionProgress({}, page), { have: 0, total: 2 });
});

test('playerTotals sums have + doubles across the album', () => {
  const idx = L.buildIndex(SAMPLE);
  // have 1,3; double of 3 (count 2 => 1 double); need 2,4
  const totals = L.playerTotals({ '1': 1, '3': 2 }, idx);
  assert.deepEqual(totals, { have: 2, total: 4, doubles: 1 });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test stickertest.js`
Expected: FAIL — `L.sectionProgress is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `worldcup/sticker-logic.js`, add these functions before the `return`:

```js
  // owned (count>=1) slots on one page
  function sectionProgress(map, page) {
    map = map || {};
    let have = 0;
    (page.slots || []).forEach((s) => { if ((map[s.n] || 0) >= 1) have++; });
    return { have: have, total: (page.slots || []).length };
  }

  // album-wide totals for the header
  function playerTotals(map, index) {
    map = map || {};
    let have = 0, doubles = 0;
    Object.keys(index).forEach((n) => {
      const c = map[n] || 0;
      if (c >= 1) have++;
      if (c >= 2) doubles += c - 1;
    });
    return { have: have, total: Object.keys(index).length, doubles: doubles };
  }
```

Then extend the returned object:

```js
  return { buildIndex: buildIndex, cycleCount: cycleCount,
           sectionProgress: sectionProgress, playerTotals: playerTotals };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test stickertest.js`
Expected: PASS — 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add worldcup/sticker-logic.js stickertest.js
git commit -m "feat(stickers): sectionProgress + playerTotals logic"
```

---

## Task 3: Pure logic — trade matching + rarest-needed

**Files:**
- Modify: `worldcup/sticker-logic.js`
- Modify: `stickertest.js`

- [ ] **Step 1: Write the failing tests**

Append to `stickertest.js`:

```js
test('tradeMatch pairs my doubles with their needs and vice versa', () => {
  const idx = L.buildIndex(SAMPLE);
  const mine =  { '1': 2, '3': 1 };        // double of 1; have 3; need 2,4
  const theirs = { '1': 0, '4': 3 };       // need 1; double of 4; need 2,3
  const r = L.tradeMatch(mine, theirs, idx);
  assert.deepEqual(r.iGive.map(Number).sort(), [1]);   // my double 1, they need 1
  assert.deepEqual(r.iWant.map(Number).sort(), [4]);   // their double 4, I need 4
  assert.equal(r.swaps, 1);                            // min(1,1)
});

test('tradeMatch swaps headline is the min of the two lists', () => {
  const idx = L.buildIndex(SAMPLE);
  const mine =  { '1': 2, '2': 2 };   // doubles 1,2
  const theirs = { '3': 2 };          // double 3; needs 1,2
  const r = L.tradeMatch(mine, theirs, idx);
  assert.deepEqual(r.iGive.map(Number).sort(), [1, 2]);
  assert.deepEqual(r.iWant.map(Number).sort(), [3]);
  assert.equal(r.swaps, 1);           // min(2,1)
});

test('rarestNeeded lists numbers nobody owns', () => {
  const idx = L.buildIndex(SAMPLE);
  const maps = [ { '1': 1, '3': 2 }, { '3': 1, '4': 1 } ]; // owned union: 1,3,4 ; missing: 2
  assert.deepEqual(L.rarestNeeded(maps, idx).map(Number), [2]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test stickertest.js`
Expected: FAIL — `L.tradeMatch is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `worldcup/sticker-logic.js`, add before the `return`:

```js
  const has = (map, n) => (map[n] || 0) >= 1;
  const needs = (map, n) => (map[n] || 0) === 0;
  const isDouble = (map, n) => (map[n] || 0) >= 2;

  // what mine can give theirs, what mine wants from theirs, perfect-swap count
  function tradeMatch(mine, theirs, index) {
    mine = mine || {}; theirs = theirs || {};
    const iGive = [], iWant = [];
    Object.keys(index).forEach((n) => {
      if (isDouble(mine, n) && needs(theirs, n)) iGive.push(n);
      if (isDouble(theirs, n) && needs(mine, n)) iWant.push(n);
    });
    return { iGive: iGive, iWant: iWant, swaps: Math.min(iGive.length, iWant.length) };
  }

  // numbers no player in `maps` owns at all
  function rarestNeeded(maps, index) {
    return Object.keys(index).filter((n) => !maps.some((m) => has(m, n)));
  }
```

Then extend the returned object to include all functions:

```js
  return { buildIndex: buildIndex, cycleCount: cycleCount,
           sectionProgress: sectionProgress, playerTotals: playerTotals,
           tradeMatch: tradeMatch, rarestNeeded: rarestNeeded };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test stickertest.js`
Expected: PASS — 7 tests passing.

- [ ] **Step 5: Commit**

```bash
git add worldcup/sticker-logic.js stickertest.js
git commit -m "feat(stickers): tradeMatch + rarestNeeded logic"
```

---

## Task 4: Album dataset + integrity test

**Files:**
- Create: `worldcup/sticker-data.js`
- Modify: `stickertest.js`

> **UPDATE (real data supplied):** the album owner provided the authoritative checklist —
> **20 Specials (`00` + `FW1..FW19`) and 48 teams × 20 stickers, grouped A–L = 980 stickers**.
> Sticker ids are **string codes** (`MEX5`, `FW3`, `00`), not numbers. `sticker-data.js`
> builds these deterministically from a 48-team table (all `confirmed:true`), and the
> integrity test enforces: string codes, uniqueness, slots ≤ grid, valid types, 49 pages /
> 980 total, the `Che16`→`CZE16` fix, and a valid group A–L on every team page.
> (Historical note: an earlier draft of this task shipped a numeric-id placeholder dataset;
> it was replaced before later tasks were built, which is why Tasks 11–12 use string codes.)

- [ ] **Step 1: Write the failing tests**

Append to `stickertest.js`:

```js
const DATA = require('./worldcup/sticker-data.js');

test('dataset: every sticker number is unique', () => {
  const nums = [];
  DATA.pages.forEach((p) => p.slots.forEach((s) => nums.push(s.n)));
  assert.equal(new Set(nums).size, nums.length, 'duplicate sticker number(s)');
});

test('dataset: each page slot count does not exceed its grid', () => {
  DATA.pages.forEach((p) => {
    assert.ok(p.slots.length <= p.cols * p.rows,
      `page ${p.page} has ${p.slots.length} slots > ${p.cols}x${p.rows}`);
  });
});

test('dataset: every slot has n, name, and a known type', () => {
  const TYPES = new Set(['badge', 'player', 'legend', 'stadium', 'special']);
  DATA.pages.forEach((p) => p.slots.forEach((s) => {
    assert.equal(typeof s.n, 'number');
    assert.ok(s.name && typeof s.name === 'string');
    assert.ok(TYPES.has(s.type), `bad type ${s.type} on #${s.n}`);
  }));
});

test('dataset: buildIndex round-trips with no collisions', () => {
  const idx = L.buildIndex(DATA);
  let count = 0;
  DATA.pages.forEach((p) => count += p.slots.length);
  assert.equal(Object.keys(idx).length, count);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test stickertest.js`
Expected: FAIL — `Cannot find module './worldcup/sticker-data.js'`.

- [ ] **Step 3: Write minimal implementation**

Create `worldcup/sticker-data.js`:

```js
/* Panini FIFA World Cup 2026 sticker album — structural data (no copyrighted art).
   Pages reproduce the real layout (page number, header, cols x rows, slot order).
   BEST-EFFORT: confirmed:false marks unverified entries — correct numbers/names here.
   Dual export: window.WCSTK (browser) + module.exports (Node tests). */
(function (root, factory) {
  const data = factory();
  if (typeof window !== 'undefined') window.WCSTK = data;
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
})(this, function () {
  // helper: build a team page of N players after the badge, numbered from `start`
  function teamPage(page, code, name, start, playerCount) {
    const slots = [{ n: start, name: 'Team badge', type: 'badge', foil: true, confirmed: false }];
    for (let i = 1; i <= playerCount; i++) {
      slots.push({ n: start + i, name: 'Player ' + i, type: 'player', confirmed: false });
    }
    const cols = 4, rows = Math.ceil(slots.length / cols);
    return { page: page, section: code, title: name, team: code, cols: cols, rows: rows,
             confirmed: false, slots: slots };
  }

  const pages = [
    { page: 4, section: 'intro', title: 'Welcome & Logos', team: null, cols: 4, rows: 2,
      confirmed: false, slots: [
        { n: 1, name: 'Tournament logo', type: 'special', foil: true, confirmed: false },
        { n: 2, name: 'Official emblem', type: 'special', foil: true, confirmed: false },
        { n: 3, name: 'Mascot', type: 'special', confirmed: false },
        { n: 4, name: 'Trophy', type: 'special', foil: true, confirmed: false },
      ] },
    // Starter team pages (numbers are placeholders until verified against a real album).
    teamPage(18, 'ARG', 'Argentina', 50, 19),
    teamPage(20, 'BRA', 'Brazil', 70, 19),
    teamPage(22, 'USA', 'United States', 90, 19),
    // Specials closing page
    { page: 80, section: 'legends', title: 'Legends', team: null, cols: 4, rows: 1,
      confirmed: false, slots: [
        { n: 660, name: 'Legend 1', type: 'legend', foil: true, confirmed: false },
        { n: 661, name: 'Legend 2', type: 'legend', foil: true, confirmed: false },
      ] },
  ];

  let total = 0;
  pages.forEach((p) => { total += p.slots.length; });

  return { meta: { title: 'Panini FIFA World Cup 2026', total: total, confirmed: false, updated: '2026-06-06' },
           pages: pages };
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test stickertest.js`
Expected: PASS — 11 tests passing.

- [ ] **Step 5: Commit**

```bash
git add worldcup/sticker-data.js stickertest.js
git commit -m "feat(stickers): starter album dataset + integrity tests"
```

---

## Task 5: Store extension — per-player collections

**Files:**
- Modify: `worldcup/hub-data.js` (the `useHubStore` function and the `bkey` area)

> Mirror the existing per-player bracket pattern. `bkey(id)` is `"wc26bracket:" + id`;
> add a parallel `skey(id)` = `"wc26stickers:" + id`.

- [ ] **Step 1: Add the collections state + loader**

In `worldcup/hub-data.js`, find `const bkey = (id) => "wc26bracket:" + id;` and add below it:

```js
const skey = (id) => "wc26stickers:" + id;
```

Inside `window.useHubStore = function () { ... }`, find the line that initializes
`brackets` state (it uses `loadPlayers().list.forEach(...)` with `bkey`). Immediately
after the `brackets` `useState`, add a parallel collections state:

```js
  const [collections, setCollections] = React.useState(() => {
    const out = {};
    loadPlayers().list.forEach((pl) => {
      try { out[pl.id] = JSON.parse(localStorage.getItem(skey(pl.id))) || {}; }
      catch (e) { out[pl.id] = {}; }
    });
    return out;
  });
```

- [ ] **Step 2: Persist on change + add the setter**

After the existing `React.useEffect` that persists `brackets`, add:

```js
  React.useEffect(() => {
    try { Object.keys(collections).forEach((id) => localStorage.setItem(skey(id), JSON.stringify(collections[id]))); }
    catch (e) {}
  }, [collections]);

  const setSticker = (playerId, n, count) => setCollections((c) => {
    const cur = Object.assign({}, c[playerId] || {});
    if (count <= 0) delete cur[String(n)]; else cur[String(n)] = count;
    return Object.assign({}, c, { [playerId]: cur });
  });
```

- [ ] **Step 3: Initialize collections for new/imported players + clean up on remove**

In `addPlayer`, after `setBrackets((b) => Object.assign({}, b, { [id]: {} }));` add:

```js
    setCollections((c) => Object.assign({}, c, { [id]: {} }));
```

In `importPlayer`, after its `setBrackets(...)` line add the same:

```js
    setCollections((c) => Object.assign({}, c, { [id]: {} }));
```

In `removePlayer`, find `try { localStorage.removeItem(bkey(id)); } catch (e) {}` and
change it to also remove the sticker key:

```js
    try { localStorage.removeItem(bkey(id)); localStorage.removeItem(skey(id)); } catch (e) {}
```

Still in `removePlayer`, the function returns a new players object; also prune the
collection from state by wrapping the existing logic — after computing `list`, add a
`setCollections` call. Locate the `removePlayer` body and add this line just before its `return`:

```js
    setCollections((c) => { const n = Object.assign({}, c); delete n[id]; return n; });
```

- [ ] **Step 4: Expose collections + setSticker from the hook**

Find the hook's final `return { ... };` and add `collections` and `setSticker`:

```js
  return { store: { results: results, bracket: bracket }, brackets: brackets,
           collections: collections, setSticker: setSticker,
           setResult: setResult, setPick: setPick, reset: reset,
           players: players, addPlayer: addPlayer, switchPlayer: switchPlayer,
           removePlayer: removePlayer, importPlayer: importPlayer };
```

- [ ] **Step 5: Verify no syntax errors**

Run: `node -e "require('./worldcup/hub-data.js')" 2>&1 | head -5 || true`
Expected: It will error on `React`/`localStorage` not defined — that's fine. It must
**NOT** print a `SyntaxError`. If you see only `ReferenceError: React is not defined`
(or `localStorage`/`window`), the file parses correctly.

- [ ] **Step 6: Commit**

```bash
git add worldcup/hub-data.js
git commit -m "feat(stickers): per-player collections in useHubStore"
```

---

## Task 6: Stickers tab — My Book view (page fidelity + tap to cycle)

**Files:**
- Create: `worldcup/hub-stickers.jsx`

> This task creates the file and the My Book view only. Trade Matcher and Overview are
> added in later tasks; for now the segmented control shows My Book + placeholders that
> are replaced (not removed) later.

- [ ] **Step 1: Create the component file**

Create `worldcup/hub-stickers.jsx`:

```jsx
/* 🎟️ Stickers tab — Panini WC2026 collection tracker (manual-first). */
function StickerSlot({ slot, count, onTap, onMinus }) {
  const have = count >= 1, dbl = count >= 2;
  const bg = dbl ? "rgba(244,183,64,.22)" : have ? "rgba(52,199,123,.22)" : "rgba(255,255,255,.05)";
  const border = dbl ? "2px solid #f4b740" : have ? "2px solid #34c77b" : "2px dashed rgba(255,255,255,.22)";
  return (
    <div onClick={() => onTap(slot.n)} title={slot.name}
      style={{ position: "relative", cursor: "pointer", background: bg, border: border, borderRadius: 10,
        padding: "8px 6px", minHeight: 64, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: have ? "#fff" : "#9fb0e0" }}>#{slot.n}</span>
        <span style={{ fontSize: 11 }}>{slot.foil ? "✨" : ""}{slot.confirmed === false ? " ?" : ""}</span>
      </div>
      <div style={{ fontSize: 11.5, color: have ? "#dfe6ff" : "#7e8cc0", lineHeight: 1.15,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{slot.name}</div>
      {dbl && (
        <span onClick={(e) => { e.stopPropagation(); onMinus(slot.n); }}
          style={{ position: "absolute", top: -8, right: -8, background: "#f4b740", color: "#16235a",
            borderRadius: 12, fontSize: 11, fontWeight: 800, padding: "1px 7px", border: "2px solid #16235a" }}>
          ×{count}
        </span>
      )}
    </div>
  );
}

function StickerPage({ page, map, onTap, onMinus }) {
  const WC = window.WC, L = window.WCSTKLOGIC;
  const prog = L.sectionProgress(map, page);
  const pct = prog.total ? Math.round((prog.have / prog.total) * 100) : 0;
  const team = page.team && WC.T[page.team];
  return (
    <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 16, padding: 14, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        {team && <Flag code={team.c} w={28} style={{ border: "1.5px solid #fff", borderRadius: 3 }} />}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>{page.title}</div>
          <div style={{ fontSize: 12, color: "#9fb0e0" }}>Page {page.page}</div>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: pct === 100 ? "#34c77b" : "#f4b740" }}>{prog.have}/{prog.total}</div>
      </div>
      <div style={{ height: 6, background: "rgba(255,255,255,.1)", borderRadius: 6, marginBottom: 12, overflow: "hidden" }}>
        <div style={{ width: pct + "%", height: "100%", background: pct === 100 ? "#34c77b" : "#f4b740" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${page.cols}, 1fr)`, gap: 8 }}>
        {page.slots.map((s) => (
          <StickerSlot key={s.n} slot={s} count={map[s.n] || 0} onTap={onTap} onMinus={onMinus} />
        ))}
      </div>
    </div>
  );
}

function MyBookView({ map, setSticker, activeId }) {
  const WCSTK = window.WCSTK, L = window.WCSTKLOGIC;
  const idx = React.useMemo(() => L.buildIndex(WCSTK), [WCSTK]);
  const totals = L.playerTotals(map, idx);
  const [filter, setFilter] = React.useState("all"); // all | need | doubles
  const [q, setQ] = React.useState("");

  const onTap = (n) => setSticker(activeId, n, L.cycleCount(map[n]));
  const onMinus = (n) => setSticker(activeId, n, Math.max(0, (map[n] || 0) - 1));

  const matchSlot = (s) => {
    const c = map[s.n] || 0;
    if (filter === "need" && c >= 1) return false;
    if (filter === "doubles" && c < 2) return false;
    if (q) { const t = (s.name + " " + s.n).toLowerCase(); if (!t.includes(q.toLowerCase())) return false; }
    return true;
  };
  const pages = WCSTK.pages
    .map((p) => Object.assign({}, p, { slots: p.slots.filter(matchSlot) }))
    .filter((p) => p.slots.length);

  const chip = (id, label) => (
    <button onClick={() => setFilter(id)} style={{ border: "none", cursor: "pointer", borderRadius: 20,
      padding: "6px 14px", fontSize: 14, fontWeight: 700,
      background: filter === id ? "#f4b740" : "rgba(255,255,255,.1)", color: filter === id ? "#16235a" : "#dfe6ff" }}>{label}</button>
  );

  return (
    <div>
      <div style={{ position: "sticky", top: 0, zIndex: 2, background: "rgba(21,50,127,.92)", padding: "10px 0",
        display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>
          You: <span style={{ color: "#f4b740" }}>{totals.have}/{totals.total}</span>
          <span style={{ color: "#9fb0e0", fontWeight: 600, fontSize: 14 }}> · {totals.doubles} doubles</span>
        </div>
        <div style={{ display: "flex", gap: 8, marginLeft: "auto", flexWrap: "wrap" }}>
          {chip("all", "All")}{chip("need", "Need")}{chip("doubles", "Doubles")}
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search # or name"
          style={{ fontFamily: "inherit", fontSize: 14, borderRadius: 10, border: "none", padding: "7px 12px",
            background: "rgba(255,255,255,.12)", color: "#fff", flex: "1 1 160px" }} />
      </div>
      {pages.length ? pages.map((p, i) => {
        const prev = i ? pages[i - 1] : null;
        const showGroup = p.group && (!prev || prev.group !== p.group);
        return (
          <React.Fragment key={p.page}>
            {showGroup && (
              <div style={{ fontSize: 18, fontWeight: 800, color: "#9fc0ff", margin: "6px 2px 10px",
                borderBottom: "2px solid rgba(159,192,255,.3)", paddingBottom: 4 }}>Group {p.group}</div>
            )}
            <StickerPage page={p} map={map} onTap={onTap} onMinus={onMinus} />
          </React.Fragment>
        );
      }) : <div style={{ color: "#9fb0e0", padding: 24, textAlign: "center" }}>No stickers match.</div>}
    </div>
  );
}

function StickersTab({ collections, setSticker, players }) {
  const [view, setView] = React.useState("book"); // book | trade | overview
  const activeId = players.active;
  const map = (collections && collections[activeId]) || {};

  const seg = (id, label) => (
    <button onClick={() => setView(id)} style={{ border: "none", cursor: "pointer", borderRadius: 12,
      padding: "9px 16px", fontSize: 15, fontWeight: 700,
      background: view === id ? "#f4b740" : "rgba(255,255,255,.1)", color: view === id ? "#16235a" : "#dfe6ff" }}>{label}</button>
  );

  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        {seg("book", "📖 My Book")}{seg("trade", "🔄 Trade Matcher")}{seg("overview", "📊 Overview")}
      </div>
      {view === "book" && <MyBookView map={map} setSticker={setSticker} activeId={activeId} />}
      {view === "trade" && <div style={{ color: "#9fb0e0", padding: 24 }}>Trade Matcher — coming in Task 9.</div>}
      {view === "overview" && <div style={{ color: "#9fb0e0", padding: 24 }}>Overview — coming in Task 10.</div>}
    </div>
  );
}
```

- [ ] **Step 2: Verify it parses as JSX**

Run: `npx --yes @babel/core --version >/dev/null 2>&1; node -e "require('@babel/core').transformFileSync('worldcup/hub-stickers.jsx',{presets:[require('@babel/preset-react')]}); console.log('JSX OK')"`
Expected: `JSX OK` (no syntax error). If `@babel/preset-react` is missing, instead run
`node --check worldcup/hub-stickers.jsx` — note plain `node --check` will reject JSX, so
prefer the Babel transform; if neither is available, defer verification to the Task 8 smoke test.

- [ ] **Step 3: Commit**

```bash
git add worldcup/hub-stickers.jsx
git commit -m "feat(stickers): My Book view with page fidelity + tap-to-cycle"
```

---

## Task 7: Wire the Stickers tab into the Hub + offline bundle

**Files:**
- Modify: `worldcup/index.html`
- Modify: `worldcup/hub.jsx`
- Modify: `worldcup/make-offline.sh`

- [ ] **Step 1: Load the new scripts**

In `worldcup/index.html`, find the line `<script src="hub-data.js"></script>` and add the
two plain data scripts right after it:

```html
<script src="sticker-logic.js"></script>
<script src="sticker-data.js"></script>
```

Then find `<script type="text/babel" src="hub-extras.jsx"></script>` and add after it:

```html
<script type="text/babel" src="hub-stickers.jsx"></script>
```

- [ ] **Step 2: Add the tab to the TABS array**

In `worldcup/hub.jsx`, find the `TABS` array and add an entry before the `settings` entry:

```js
  { id: "stickers", label: "🎟️ Stickers" },
```

- [ ] **Step 3: Destructure the new store fields**

In `worldcup/hub.jsx`, find the line beginning `const { store, brackets, setResult, ...`
(the `useHubStore()` destructure, ~line 431) and add `collections` and `setSticker`:

```js
  const { store, brackets, collections, setSticker, setResult, setPick, reset, players, addPlayer, switchPlayer, removePlayer, importPlayer } = useHubStore();
```

- [ ] **Step 4: Add the render case**

In `worldcup/hub.jsx`, find the render switch (the `{tab === "..." && <...Tab .../>}`
block, ~line 544). Add after the `home` line:

```jsx
        {tab === "stickers" && <StickersTab collections={collections} setSticker={setSticker} players={players} />}
```

- [ ] **Step 5: Confirm the offline bundle picks up the new files**

**CORRECTION (verified):** `worldcup/make-offline.sh` does NOT keep a source-file copy
list — it builds the offline bundle **in place** (it downloads vendor libs/flags/fonts and
rewrites each HTML's CDN URLs to local paths, leaving relative `*.js`/`*.jsx` `<script src>`
references untouched). Because `sticker-logic.js`, `sticker-data.js`, and `hub-stickers.jsx`
live in `worldcup/` and are referenced by `index.html` with relative paths (no
`integrity`/`crossorigin`), they are automatically part of the offline build. **No edit to
`make-offline.sh` is required.** Just confirm the three files exist in `worldcup/` and are
referenced in `index.html`.

Run: `grep -c "sticker-logic.js\|sticker-data.js\|hub-stickers.jsx" worldcup/index.html`
Expected: `3`.

- [ ] **Step 6: Commit**

```bash
git add worldcup/index.html worldcup/hub.jsx worldcup/make-offline.sh
git commit -m "feat(stickers): wire Stickers tab into Hub + offline bundle"
```

---

## Task 8: UI smoke test (Puppeteer)

**Files:**
- Create: `stickersmoke.js`

- [ ] **Step 1: Write the smoke test**

Create `stickersmoke.js` (mirrors `bracktest.js` conventions):

```js
const puppeteer = require('puppeteer-core');
(async () => {
  const errs = [];
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-gpu'] });
  const page = await browser.newPage();
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
  await page.setViewport({ width: 1200, height: 900 });
  await page.goto('http://localhost:8088/?tab=stickers', { waitUntil: 'networkidle2', timeout: 35000 });
  await new Promise(r => setTimeout(r, 3500));

  const onBook = await page.evaluate(() => document.body.innerText.includes('My Book'));
  console.log('Stickers tab rendered:', onBook);

  // tap the first sticker slot twice -> should show a ×2 doubles badge
  const tap = () => page.evaluate(() => { const el = document.querySelector('[title]'); if (el) { el.click(); return true; } return false; });
  await tap(); await new Promise(r => setTimeout(r, 200));
  await tap(); await new Promise(r => setTimeout(r, 300));
  const hasDouble = await page.evaluate(() => /×2/.test(document.body.innerText));
  console.log('double badge after two taps:', hasDouble);

  await page.screenshot({ path: '/tmp/stickers_book.png' });
  console.log('JS errors:', errs.length, errs.slice(0, 3).join(' | '));
  await browser.close();
  process.exit(errs.length ? 1 : 0);
})();
```

- [ ] **Step 2: Serve the kit and run the smoke test**

Run (from repo root):

```bash
( cd worldcup && python3 -m http.server 8088 >/tmp/stk_serve.log 2>&1 & echo $! > /tmp/stk_serve.pid )
sleep 1
node stickersmoke.js
kill "$(cat /tmp/stk_serve.pid)" 2>/dev/null || true
```

Expected output:
```
Stickers tab rendered: true
double badge after two taps: true
JS errors: 0
```

- [ ] **Step 3: Commit**

```bash
git add stickersmoke.js
git commit -m "test(stickers): Puppeteer smoke for the Stickers tab"
```

---

## Task 9: Trade Matcher view

**Files:**
- Modify: `worldcup/hub-stickers.jsx`

- [ ] **Step 1: Add the TradeMatcherView component**

In `worldcup/hub-stickers.jsx`, add this component **above** `StickersTab`:

```jsx
function TradeColumn({ title, nums, idx, accent }) {
  return (
    <div style={{ flex: "1 1 240px", background: "rgba(255,255,255,.06)", borderRadius: 14, padding: 12 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: accent, marginBottom: 8 }}>{title} <span style={{ color: "#9fb0e0" }}>({nums.length})</span></div>
      {nums.length ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {nums.map((n) => {
            const slot = idx[n] && idx[n].slot;
            return (
              <span key={n} title={slot ? slot.name : ""} style={{ background: "rgba(255,255,255,.1)", color: "#dfe6ff",
                borderRadius: 8, padding: "4px 9px", fontSize: 13, fontWeight: 600 }}>
                #{n}{slot && slot.foil ? " ✨" : ""}
              </span>
            );
          })}
        </div>
      ) : <div style={{ color: "#7e8cc0", fontSize: 13 }}>Nothing to swap.</div>}
    </div>
  );
}

function TradeMatcherView({ collections, players, activeId }) {
  const L = window.WCSTKLOGIC, WCSTK = window.WCSTK;
  const idx = React.useMemo(() => L.buildIndex(WCSTK), [WCSTK]);
  const others = players.list.filter((p) => p.id !== activeId);
  const [otherId, setOtherId] = React.useState(others.length ? others[0].id : null);

  if (!others.length) return <div style={{ color: "#9fb0e0", padding: 24 }}>Add another family member to trade with (🏠 Home → + Add player).</div>;

  const mine = collections[activeId] || {};
  const theirs = collections[otherId] || {};
  const r = L.tradeMatch(mine, theirs, idx);
  const me = players.list.find((p) => p.id === activeId);
  const them = players.list.find((p) => p.id === otherId);

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ color: "#dfe6ff", fontWeight: 600 }}>Trade {me ? me.emoji + " " + me.name : "you"} with</span>
        <select value={otherId} onChange={(e) => setOtherId(e.target.value)} style={{ fontFamily: "inherit", fontSize: 15,
          fontWeight: 700, color: "#16235a", background: "#f4b740", border: "none", borderRadius: 8, padding: "6px 10px" }}>
          {others.map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
        </select>
        <span style={{ marginLeft: "auto", fontSize: 16, fontWeight: 800, color: "#34c77b" }}>🤝 {r.swaps} perfect swap{r.swaps === 1 ? "" : "s"}</span>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <TradeColumn title={"You give → " + (them ? them.name : "")} nums={r.iGive} idx={idx} accent="#f4b740" />
        <TradeColumn title={(them ? them.name : "") + " gives → you"} nums={r.iWant} idx={idx} accent="#9fc0ff" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace the Trade placeholder in StickersTab**

In `StickersTab`, change the trade line from the placeholder to:

```jsx
      {view === "trade" && <TradeMatcherView collections={collections} players={players} activeId={activeId} />}
```

- [ ] **Step 3: Verify + smoke**

Run:
```bash
( cd worldcup && python3 -m http.server 8088 >/tmp/stk_serve.log 2>&1 & echo $! > /tmp/stk_serve.pid )
sleep 1
node stickersmoke.js
kill "$(cat /tmp/stk_serve.pid)" 2>/dev/null || true
```
Expected: still `Stickers tab rendered: true` and `JS errors: 0`.

- [ ] **Step 4: Commit**

```bash
git add worldcup/hub-stickers.jsx
git commit -m "feat(stickers): Trade Matcher view (doubles ∩ needs)"
```

---

## Task 10: Overview view

**Files:**
- Modify: `worldcup/hub-stickers.jsx`

- [ ] **Step 1: Add the OverviewView component**

In `worldcup/hub-stickers.jsx`, add above `StickersTab`:

```jsx
function OverviewView({ collections, players }) {
  const L = window.WCSTKLOGIC, WCSTK = window.WCSTK;
  const idx = React.useMemo(() => L.buildIndex(WCSTK), [WCSTK]);
  const maps = players.list.map((p) => collections[p.id] || {});
  const rarest = L.rarestNeeded(maps, idx);
  return (
    <div>
      <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
        {players.list.map((p) => {
          const t = L.playerTotals(collections[p.id] || {}, idx);
          const pct = t.total ? Math.round((t.have / t.total) * 100) : 0;
          return (
            <div key={p.id} style={{ background: "rgba(255,255,255,.06)", borderRadius: 12, padding: "10px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, color: "#fff", marginBottom: 6 }}>
                <span>{p.emoji} {p.name}</span>
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

- [ ] **Step 2: Replace the Overview placeholder in StickersTab**

```jsx
      {view === "overview" && <OverviewView collections={collections} players={players} />}
```

- [ ] **Step 3: Smoke**

Run the Task 8 serve+smoke block. Expected: `Stickers tab rendered: true`, `JS errors: 0`.

- [ ] **Step 4: Commit**

```bash
git add worldcup/hub-stickers.jsx
git commit -m "feat(stickers): Overview view (per-player bars + rarest-needed)"
```

---

## Task 11: Camera Stage 1 — "Scan a swap" (single number)

**Files:**
- Modify: `worldcup/hub-stickers.jsx`

> Reads the number off one loose sticker via `BarcodeDetector` when available; always
> offers a numeric quick-add fallback so the feature works on every device.

- [ ] **Step 1: Add a QuickAdd + camera component**

In `worldcup/hub-stickers.jsx`, add above `MyBookView`:

```jsx
function ScanSwap({ onAdd }) {
  const [open, setOpen] = React.useState(false);
  const [num, setNum] = React.useState("");
  const [camMsg, setCamMsg] = React.useState("");
  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);

  const stop = () => { if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; } };
  React.useEffect(() => stop, []);

  const startCam = async () => {
    setCamMsg("");
    if (!("BarcodeDetector" in window)) { setCamMsg("This device can't auto-read numbers — type it below."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      const det = new window.BarcodeDetector({ formats: ["code_128", "ean_13", "qr_code"] });
      const tick = async () => {
        if (!streamRef.current || !videoRef.current) return;
        try {
          const codes = await det.detect(videoRef.current);
          // sticker codes are alphanumeric (MEX5, FW3, 00) — grab the first token
          const hit = codes.map((c) => (c.rawValue || "").toUpperCase().match(/[A-Z0-9]+/)).find(Boolean);
          if (hit) { setNum(hit[0]); setCamMsg("Read " + hit[0] + " — confirm below."); stop(); return; }
        } catch (e) {}
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch (e) { setCamMsg("Camera unavailable — type the code below."); }
  };

  // sticker codes are STRING codes (e.g. MEX5). Add the code as-is.
  const add = () => { const n = num.trim(); if (n) { onAdd(n); setNum(""); setOpen(false); stop(); } };

  if (!open) return (
    <button onClick={() => { setOpen(true); startCam(); }} style={{ border: "none", cursor: "pointer", borderRadius: 20,
      padding: "6px 14px", fontSize: 14, fontWeight: 700, background: "rgba(255,255,255,.12)", color: "#dfe6ff" }}>📷 Scan a swap</button>
  );

  return (
    <div style={{ background: "rgba(0,0,0,.35)", borderRadius: 12, padding: 10, display: "flex", flexDirection: "column", gap: 8, flex: "1 1 220px" }}>
      <video ref={videoRef} muted playsInline style={{ width: "100%", maxHeight: 160, borderRadius: 8, background: "#000", objectFit: "cover" }} />
      {camMsg && <div style={{ fontSize: 12.5, color: "#9fc0ff" }}>{camMsg}</div>}
      <div style={{ display: "flex", gap: 6 }}>
        <input value={num} onChange={(e) => setNum(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="Code e.g. MEX5"
          style={{ fontFamily: "inherit", fontSize: 14, borderRadius: 8, border: "none", padding: "7px 10px", width: 120, background: "rgba(255,255,255,.14)", color: "#fff" }} />
        <button onClick={add} style={{ border: "none", cursor: "pointer", background: "#34c77b", color: "#06351f", fontWeight: 700, borderRadius: 8, padding: "7px 14px" }}>Add +1</button>
        <button onClick={() => { setOpen(false); stop(); }} style={{ border: "none", cursor: "pointer", background: "rgba(255,255,255,.12)", color: "#dfe6ff", borderRadius: 8, padding: "7px 12px" }}>Close</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire ScanSwap into the My Book header**

In `MyBookView`, add an adder and render `ScanSwap` in the sticky header. After the
`onMinus` definition add:

```jsx
  const onAdd = (n) => setSticker(activeId, n, L.cycleCount(map[n]));
```

Then inside the sticky-header `div`, after the search `<input .../>`, add:

```jsx
        <ScanSwap onAdd={onAdd} />
```

- [ ] **Step 3: Smoke (graceful with no camera)**

The smoke test runs headless (no camera). Run the Task 8 serve+smoke block.
Expected: `Stickers tab rendered: true`, `JS errors: 0` (clicking "Scan a swap" is not
part of the smoke; absence of camera must not throw on load).

- [ ] **Step 4: Commit**

```bash
git add worldcup/hub-stickers.jsx
git commit -m "feat(stickers): camera Stage 1 — scan-a-swap with numeric fallback"
```

---

## Task 12: Camera Stage 2 — assisted page scan

**Files:**
- Modify: `worldcup/sticker-logic.js`
- Modify: `stickertest.js`
- Modify: `worldcup/hub-stickers.jsx`

> Photograph a page; overlay its `cols×rows` grid; estimate filled vs empty per cell from
> brightness variance; user confirms/corrects; bulk-mark. The brightness→filled decision
> is pure and unit-tested; the camera/canvas plumbing is UI.

- [ ] **Step 1: Write the failing test for the cell classifier**

Append to `stickertest.js`:

```js
test('guessFilled: high variance cell = filled, flat cell = empty', () => {
  // a flat (empty slot) cell: all pixels similar -> low variance
  const flat = new Array(64).fill(200);
  // a busy (sticker) cell: alternating -> high variance
  const busy = []; for (let i = 0; i < 64; i++) busy.push(i % 2 ? 30 : 220);
  assert.equal(L.guessFilled(flat, 40), false);
  assert.equal(L.guessFilled(busy, 40), true);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test stickertest.js`
Expected: FAIL — `L.guessFilled is not a function`.

- [ ] **Step 3: Implement guessFilled**

In `worldcup/sticker-logic.js`, add before the `return`:

```js
  // grayscale[] = luminance samples of one grid cell; filled if stddev > threshold
  function guessFilled(gray, threshold) {
    if (!gray.length) return false;
    let sum = 0; for (let i = 0; i < gray.length; i++) sum += gray[i];
    const mean = sum / gray.length;
    let v = 0; for (let i = 0; i < gray.length; i++) { const d = gray[i] - mean; v += d * d; }
    return Math.sqrt(v / gray.length) > (threshold == null ? 40 : threshold);
  }
```

Add `guessFilled: guessFilled` to the returned object.

- [ ] **Step 4: Run to verify it passes**

Run: `node --test stickertest.js`
Expected: PASS — all prior tests + the new one.

- [ ] **Step 5: Add the ScanPage UI component**

In `worldcup/hub-stickers.jsx`, add above `MyBookView`:

```jsx
function ScanPage({ page, map, onApply }) {
  const L = window.WCSTKLOGIC;
  const [open, setOpen] = React.useState(false);
  const [guesses, setGuesses] = React.useState(null); // { n: bool }
  const [msg, setMsg] = React.useState("");
  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const stop = () => { if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; } };
  React.useEffect(() => stop, []);

  const start = async () => {
    setMsg(""); setGuesses(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = s; if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play(); }
    } catch (e) { setMsg("Camera unavailable on this device."); }
  };

  const capture = () => {
    const v = videoRef.current; if (!v || !v.videoWidth) { setMsg("Point the camera at the page first."); return; }
    const cv = document.createElement("canvas"); cv.width = v.videoWidth; cv.height = v.videoHeight;
    const ctx = cv.getContext("2d"); ctx.drawImage(v, 0, 0);
    const cellW = cv.width / page.cols, cellH = cv.height / page.rows;
    const out = {};
    page.slots.forEach((slot, i) => {
      const r = Math.floor(i / page.cols), c = i % page.cols;
      const data = ctx.getImageData(c * cellW, r * cellH, cellW, cellH).data;
      const gray = [];
      for (let p = 0; p < data.length; p += 4 * 37) gray.push(0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]);
      out[slot.n] = L.guessFilled(gray, 40);
    });
    setGuesses(out); setMsg("Tap any cell to fix it, then Apply."); stop();
  };

  const toggle = (n) => setGuesses((g) => Object.assign({}, g, { [n]: !g[n] }));
  const apply = () => { onApply(guesses); setOpen(false); setGuesses(null); stop(); };

  if (!open) return (
    <button onClick={() => { setOpen(true); start(); }} style={{ border: "none", cursor: "pointer", borderRadius: 10,
      padding: "6px 12px", fontSize: 13, fontWeight: 700, background: "rgba(255,255,255,.12)", color: "#dfe6ff" }}>📷 Scan this page</button>
  );

  return (
    <div style={{ background: "rgba(0,0,0,.4)", borderRadius: 12, padding: 10, marginBottom: 10 }}>
      {!guesses && <video ref={videoRef} muted playsInline style={{ width: "100%", maxHeight: 240, borderRadius: 8, background: "#000", objectFit: "cover" }} />}
      {guesses && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${page.cols}, 1fr)`, gap: 6, marginBottom: 8 }}>
          {page.slots.map((s) => (
            <div key={s.n} onClick={() => toggle(s.n)} style={{ cursor: "pointer", textAlign: "center", borderRadius: 8, padding: "8px 4px", fontSize: 12, fontWeight: 700,
              background: guesses[s.n] ? "rgba(52,199,123,.3)" : "rgba(255,255,255,.06)", border: guesses[s.n] ? "2px solid #34c77b" : "2px dashed rgba(255,255,255,.2)", color: "#fff" }}>
              #{s.n}<br />{guesses[s.n] ? "have" : "—"}
            </div>
          ))}
        </div>
      )}
      {msg && <div style={{ fontSize: 12.5, color: "#9fc0ff", marginBottom: 8 }}>{msg}</div>}
      <div style={{ display: "flex", gap: 6 }}>
        {!guesses && <button onClick={capture} style={{ border: "none", cursor: "pointer", background: "#f4b740", color: "#16235a", fontWeight: 700, borderRadius: 8, padding: "7px 14px" }}>Capture</button>}
        {guesses && <button onClick={apply} style={{ border: "none", cursor: "pointer", background: "#34c77b", color: "#06351f", fontWeight: 700, borderRadius: 8, padding: "7px 14px" }}>Apply</button>}
        <button onClick={() => { setOpen(false); setGuesses(null); stop(); }} style={{ border: "none", cursor: "pointer", background: "rgba(255,255,255,.12)", color: "#dfe6ff", borderRadius: 8, padding: "7px 12px" }}>Close</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Wire ScanPage into StickerPage, applying guesses**

In `StickerPage`, add a handler that marks any guessed-filled slot the player does not
already own (count stays whatever it is if already owned; newly-confirmed becomes 1).
Change the `StickerPage` signature to also accept `setSticker` and `activeId`, and add
`ScanPage` under the header. Replace the `StickerPage` function header line:

```jsx
function StickerPage({ page, map, onTap, onMinus, setSticker, activeId }) {
```

Immediately inside the component (before the `return`), add:

```jsx
  const applyScan = (guesses) => {
    // keys are string sticker codes — pass them through unchanged
    Object.keys(guesses).forEach((n) => { if (guesses[n] && (map[n] || 0) < 1) setSticker(activeId, n, 1); });
  };
```

In the returned JSX, right after the progress-bar `div` and before the slots grid `div`, add:

```jsx
      <div style={{ marginBottom: 10 }}><ScanPage page={page} map={map} onApply={applyScan} /></div>
```

In `MyBookView`'s pages render, add `setSticker={setSticker} activeId={activeId}` to the
`<StickerPage ... />` element inside the group-divider `React.Fragment`:

```jsx
            <StickerPage page={p} map={map} onTap={onTap} onMinus={onMinus} setSticker={setSticker} activeId={activeId} />
```

- [ ] **Step 7: Smoke + unit tests**

Run: `node --test stickertest.js` → all PASS.
Run the Task 8 serve+smoke block → `Stickers tab rendered: true`, `JS errors: 0`.

- [ ] **Step 8: Commit**

```bash
git add worldcup/sticker-logic.js stickertest.js worldcup/hub-stickers.jsx
git commit -m "feat(stickers): camera Stage 2 — assisted page scan with confirm"
```

---

## Task 13: Camera Stage 3 — auto-apply (opt-in)

**Files:**
- Modify: `worldcup/hub-stickers.jsx`

> Stage 3 is Stage 2 minus the confirm step, behind an explicit toggle. It reuses
> `ScanPage`'s capture + `guessFilled`; on capture it applies immediately when "Auto" is on.

- [ ] **Step 1: Add an auto toggle to ScanPage**

In `worldcup/hub-stickers.jsx`, in `ScanPage`, add state near the top:

```jsx
  const [auto, setAuto] = React.useState(false);
```

Change the end of `capture()` so that when `auto` is on it applies immediately instead of
waiting for confirm. Replace the last two statements of `capture` (`setGuesses(out); setMsg(...); stop();`) with:

```jsx
    stop();
    if (auto) { onApply(out); setOpen(false); setGuesses(null); setMsg(""); return; }
    setGuesses(out); setMsg("Tap any cell to fix it, then Apply.");
```

- [ ] **Step 2: Render the toggle**

In `ScanPage`'s returned JSX, in the button row, add before the Capture button:

```jsx
        <label style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#dfe6ff", fontSize: 12.5, marginRight: "auto" }}>
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Auto (no confirm)
        </label>
```

- [ ] **Step 3: Smoke**

Run the Task 8 serve+smoke block → `Stickers tab rendered: true`, `JS errors: 0`.

- [ ] **Step 4: Commit**

```bash
git add worldcup/hub-stickers.jsx
git commit -m "feat(stickers): camera Stage 3 — opt-in auto page apply"
```

---

## Task 14: README + finish

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document the tab**

In `README.md`, in the Hub tabs table, add a row (keep the existing style):

```markdown
| 🎟️ **Stickers** | Track each family member's **Panini WC2026** album with full page-by-page fidelity — tap to mark Have / Need / doubles, then the **Trade Matcher** shows exactly who can swap what. Scan stickers or whole pages with the phone camera (manual entry always works). |
```

- [ ] **Step 2: Run the full test suite one last time**

Run:
```bash
node --test stickertest.js
( cd worldcup && python3 -m http.server 8088 >/tmp/stk_serve.log 2>&1 & echo $! > /tmp/stk_serve.pid ); sleep 1; node stickersmoke.js; kill "$(cat /tmp/stk_serve.pid)" 2>/dev/null || true
```
Expected: unit tests all PASS; smoke prints `Stickers tab rendered: true` and `JS errors: 0`.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: document the Stickers tab in the README"
```

---

## Notes for the implementer

- **Data is best-effort.** The starter `sticker-data.js` uses placeholder player names and
  numbers, all flagged `confirmed:false`. Filling the real 678-sticker checklist is a data
  chore done by editing `sticker-data.js`; the integrity test (Task 4) guards the schema.
- **Camera is progressive enhancement.** Every stage degrades to manual entry. Never let a
  missing camera / missing `BarcodeDetector` throw on load — guard with feature checks.
- **No uploads, ever.** All camera frames stay on-device (canvas only). This preserves the
  project's no-tracking promise — do not add any network calls.
- **Chromium path** in the smoke test is `/usr/bin/chromium` (matches `bracktest.js`); adjust
  if the environment differs.
