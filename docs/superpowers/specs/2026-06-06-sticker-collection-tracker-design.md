# Sticker Collection Tracker — Design

**Date:** 2026-06-06
**Project:** World Cup 2026 — Family Bracket & Hub
**Status:** Approved design, pre-implementation

## 1. Summary

Add a **Panini FIFA World Cup 2026 sticker-collection tracker** to the Hub. Each
family member tracks which stickers they have, are missing, or have as doubles,
and a local **Trade Matcher** turns that into "who can give what to whom" so the
family can swap easily.

It ships **manual-first** (reliable tap-to-mark), then grows **progressively more
automatic camera steps**. The book is rendered with **structural page fidelity**:
the real page-by-page layout (page numbers, headers, each numbered slot in its
true position, foil/team-crest markers) — but slots show number + name + type,
**not** Panini's copyrighted artwork.

## 2. Goals & non-goals

### Goals
- Per-player collection tracking that reuses the existing **Family Pick'em** player model.
- A **Trade Matcher** that computes giveable/wanted stickers between local players.
- **Structural page fidelity** of the official album (layout, page numbers, slot order, foil/crest markers).
- A **camera ladder** that adds automation in stages without changing the data model.
- Stay **fully static**: no backend, no accounts, no tracking, offline-capable on the kiosk.

### Non-goals (YAGNI for now)
- Cross-device / cloud-shared collections (trade scope is same-household).
- In-app editing of the canonical sticker list (correct numbers by editing `sticker-data.js`; possible v2).
- Reproducing Panini's actual sticker photos/artwork (copyright risk; structural fidelity only).
- Bundling per-slot images (no image-asset pipeline; preserves offline/static simplicity).

## 3. Constraints (from the existing project)

- Plain static HTML/JS. `*.js` files set `window.*` globals (e.g. `data.js` → `window.WC`);
  `*.jsx` files are transpiled in-browser via `@babel/standalone` (`<script type="text/babel">`).
- Players live in `localStorage["wc26players"]` = `{ list:[{id,name,emoji}], active }`;
  per-player data is keyed like `wc26bracket:<id>`. The store hook is `window.useHubStore` in `hub-data.js`.
- The Hub is a tabbed app (`TABS` array + a render switch in `hub.jsx`).
- `make-offline.sh` vendors CDN deps and copies the file list for the offline kiosk bundle.
- The repo is **public** — no copyrighted assets, no private/kiosk data committed.

## 4. Architecture

A new **"🎟️ Stickers" tab** inside the Hub (approach A — sibling of Family Pick'em),
made of:

| Unit | File | Responsibility | Depends on |
|---|---|---|---|
| Sticker dataset | `worldcup/sticker-data.js` | `window.WCSTK`: the album as ordered pages of slots, with layout + fidelity metadata | none (plain data) |
| Store extension | `worldcup/hub-data.js` (extend `useHubStore`) | per-player `collections`, `setSticker`, cleanup on `removePlayer`; pure logic `tradeMatch`/`sectionProgress`/`cycleCount` | `WCSTK`, players |
| Stickers tab UI | `worldcup/hub-stickers.jsx` | the three views (My Book / Trade Matcher / Overview) + camera ladder layers | `WCSTK`, store, `WC.T` (flags/colors) |
| Wiring | `worldcup/hub.jsx`, `worldcup/index.html`, `worldcup/make-offline.sh` | add tab + render case; load new files; include in offline bundle | above |
| Tests | `stickertest.js` (repo root, Node) | trade matching, count cycling, dataset integrity | `WCSTK` logic |

### Data flow
1. `sticker-data.js` defines the album (pages → slots) → `window.WCSTK`.
2. `useHubStore` loads each player's `wc26stickers:<id>` map (`{ "<n>": count }`).
3. **My Book** renders `WCSTK` pages, overlaying the active player's counts as slot states.
4. Tapping a slot calls `setSticker(playerId, n, nextCount)` → persists to localStorage.
5. **Trade Matcher** runs `tradeMatch(playerA, playerB)` over two players' maps → matched lists.
6. Camera stages produce the same `setSticker` calls (single number, or bulk per page).

## 5. Data model

### 5.1 Sticker dataset — `window.WCSTK`

```js
window.WCSTK = {
  // NOTE: shipped total is the owner-supplied 980 (20 specials + 48 teams × 20); 678 was an early estimate.
  meta: { title: "Panini FIFA World Cup 2026", total: 980, confirmed: false, updated: "2026-06-06" },
  // Slot/sticker types drive markers + filtering.
  // types: "badge" | "player" | "legend" | "stadium" | "special"
  pages: [
    {
      page: 4,                       // real album page number
      section: "intro",              // logical grouping id
      title: "Welcome & Logos",      // page header as printed
      team: null,                    // or a WC.T code (e.g. "ARG") → crest/flag + colors
      cols: 4, rows: 3,              // slot grid for layout + camera overlay
      confirmed: false,              // page-level: layout verified against a real book?
      slots: [
        { n: 1, name: "Tournament logo", type: "special", foil: true,  confirmed: false },
        { n: 2, name: "Official emblem", type: "special", foil: false, confirmed: false },
        // ... in printed order, left→right, top→bottom (matches cols×rows)
      ]
    },
    {
      page: 18, section: "ARG", title: "Argentina", team: "ARG",
      cols: 4, rows: 5, confirmed: false,
      slots: [
        { n: 54, name: "Team badge", type: "badge", foil: true,  confirmed: false },
        { n: 55, name: "Line-up",    type: "special", confirmed: false },
        { n: 56, name: "Player",     type: "player", confirmed: false },
        // ...
      ]
    }
    // ... one+ page(s) per team (reusing WC.T for flag/crest/colors), then Legends / Stadiums / Specials
  ]
};
```

Field notes:
- **Page fidelity**: `page`, `title`, `cols`, `rows`, and slot order reproduce the real
  album layout. `cols×rows` is the canvas grid the **Stage 2 camera** overlays onto.
- `foil: true` renders a shiny/holo marker (these are the sought-after swaps).
- `team` links to `WC.T[code]` for the crest/flag + team colors already in `data.js`.
- `confirmed` (slot- and page-level) is `false` until verified against a physical book.
  Unconfirmed entries render a subtle `?` so families can spot and correct them.
- A derived `WCSTK.byNumber` index (`{ n → {slot, page} }`) is built once at load for O(1) lookups.

> **Data accuracy:** the list is populated **best-effort** and explicitly flagged
> `confirmed: false` where unverified. Corrections are made by editing
> `sticker-data.js` (it's the family's own repo). The tracker is fully usable even
> with placeholder/unconfirmed entries.

### 5.2 Per-player collection — `localStorage["wc26stickers:<playerId>"]`

```js
{ "1": 1, "54": 2, "55": 0, "112": 3 }   // sticker number → count
```

Count semantics:
- **absent / `0`** → **Need** (don't have it)
- **`1`** → **Have**
- **`≥2`** → **Have + (count − 1) doubles** available to trade

Mirrors the per-player `wc26bracket:<id>` storage pattern. `removePlayer` also removes
the player's `wc26stickers:<id>` key.

## 6. Store logic (pure, testable) — in `hub-data.js`

```
cycleCount(count)              → next count on tap: 0→1→2→3… (a − control / long-press decrements)
sectionProgress(map, page)    → { have, total } for a page/section progress bar
playerTotals(map)             → { have, total, doubles } for the header
tradeMatch(mineMap, theirMap) → {
    iGive:  [ n … ],   // my doubles (count≥2) that they need (their count 0/absent)
    iWant:  [ n … ],   // their doubles that I need
    swaps:  k          // min(iGive,iWant) — "perfect swaps" headline number
}
rarestNeeded(allMaps)         → stickers nobody in the family has (for Overview)
```

`useHubStore` returns added fields: `collections` (`{ playerId → map }`), `setSticker(playerId, n, count)`.

## 7. UI — `hub-stickers.jsx`

A segmented control with three views; respects the existing `useIsPhone()` responsive
pattern, the dark-blue theme, and the `#f4b740` accent.

### 7.1 My Book (default)
- **Page-fidelity layout**: renders `WCSTK.pages` in order; each page shows its header
  (page number, title, team crest via `WC.T`), and a `cols×rows` grid of slots in true
  position. A page-jump/section rail lets you flip quickly (book-like on TV, scroll on phone).
- **Slot states** (active player's count): Need = dim outline; Have = filled green;
  Doubles = gold ring + `×n` badge; `foil` slots get a shiny marker; unconfirmed = subtle `?`.
- **Tap** cycles Need → Have → Have×2 → … ; a `−` affordance (or long-press) decrements.
- **Per-page progress bar** ("Argentina 14/20") and a sticky header
  ("You: 212/678 · 41 doubles").
- **Filters**: `All · Need · Doubles` chips; **search** by number or name.

### 7.2 Trade Matcher (the magic)
- Pick two players (or **me vs everyone**, aggregating per other-player results).
- Two matched columns: **You give → Mia** (my doubles ∩ their needs) and
  **Mia gives → You** (their doubles ∩ my needs), each entry showing number + name +
  page, foil highlighted.
- Headline **perfect-swaps** count = `min(iGive, iWant)`.

### 7.3 Overview
- Per-player completion bars, **family unique-sticker total**, and
  **"rarest still-needed"** (stickers nobody has) to focus future packs.

## 8. Camera ladder (progressive; all on-device — no uploads)

Each stage is a thin layer over My Book and emits the same `setSticker` calls.
All use `getUserMedia` + `<canvas>`; number reading uses `BarcodeDetector` where
available with an OCR-lite fallback. **Graceful degradation**: if camera/detector is
absent, the manual keypad path always works.

- **Stage 0 — Manual** (§7). Ships first.
- **Stage 1 — "Scan a swap"**: 📷 reads the printed **number off one loose sticker**,
  prefills the increment, you confirm. Fallback = numeric quick-add ("add #112").
  High value, low risk — ships early.
- **Stage 2 — "Scan a page"**: photograph an album page; the app overlays that page's
  known `cols×rows` slot grid (from `WCSTK`) and per-cell guesses filled/empty
  (brightness/edge heuristic on the canvas); you confirm/correct → bulk-mark.
- **Stage 3 — "Auto page"**: Stage 2 minus the confirm step; opt-in, gated behind
  proven reliability per page layout.

> On-device only (no image leaves the device) preserves the project's no-tracking promise.

## 9. Storage, offline, wiring

- **Additive only**: new `wc26stickers:<id>` keys; no migration of existing data.
- `index.html`: add `<script src="sticker-data.js">` (plain) and
  `<script type="text/babel" src="hub-stickers.jsx">` after the other hub scripts.
- `hub.jsx`: add `{ id:"stickers", label:"🎟️ Stickers" }` to `TABS` and a render case.
- `make-offline.sh`: add the two new files to the copied/vendored file list. **No new
  CDN deps** (camera/canvas/`BarcodeDetector` are native; `qrcodejs` already loaded).

## 10. Testing

- `stickertest.js` (Node, like the existing `bracktest.js`) asserts:
  - `tradeMatch` (give/want/perfect-swaps) across crafted maps incl. doubles edge cases.
  - `cycleCount` increment/decrement wraparound.
  - `sectionProgress` / `playerTotals` arithmetic.
  - **Dataset integrity** of `WCSTK`: sticker numbers unique, slot counts per page
    == `cols×rows` (or explicitly flagged), totals add to `meta.total`.
- Manual smoke on phone + kiosk: add players, mark stickers, run a trade match,
  verify offline bundle includes the new files.

## 11. Build order (for the implementation plan)

1. `sticker-data.js` schema + a best-effort starter dataset (≥2 full pages confirmed shape) + `byNumber` index.
2. `useHubStore` extension + pure logic functions + `stickertest.js` (TDD).
3. `hub-stickers.jsx` **My Book** (page-fidelity render + tap-to-cycle + filters/search).
4. Wire tab into `hub.jsx` / `index.html` / `make-offline.sh`; smoke on kiosk.
5. **Trade Matcher** view + **Overview** view.
6. Camera **Stage 1** (scan a swap) with manual-keypad fallback.
7. Per-page layout metadata fill-out; camera **Stage 2** (assisted page scan).
8. Camera **Stage 3** (auto page) — opt-in, after Stage 2 proves reliable.
