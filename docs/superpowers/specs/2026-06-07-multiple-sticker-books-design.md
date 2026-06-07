# Multiple Sticker Books per Person — Design

**Date:** 2026-06-07
**Project:** World Cup 2026 — Family Bracket & Hub
**Status:** Approved design, pre-implementation

## 1. Summary

Let each family member own **more than one sticker book** (e.g. a "Main album" they're
completing plus a "Swaps" book of duplicates), instead of exactly one collection per person.
Each book tracks its own sticker counts. Books are the unit of trading: the local Trade Matcher
matches **book-to-book**, and Family Sync shares **each book as its own entry** to the
80-mile-away relatives, so a pure-swaps book reads as all-tradeable and everyone can see which
book holds what.

Players stay exactly as they are (they are shared with the bracket and Pick'em features). Books
are a sticker-only layer added *under* each player.

## 2. Goals & non-goals

### Goals
- A person can hold several named books; add / rename / delete (can't delete the last one).
- Each book has independent sticker counts; My Book edits the **active book** of the **active player**.
- Trade Matcher and Overview operate **book-to-book** (each book is its own tradeable pile, labelled `Name · Book`).
- Family Sync pushes **each of the active player's books as its own row** and lists family books per (member, book).
- **Zero sticker-data migration risk:** the existing per-player collection becomes that player's default book with no data move.
- All existing tests stay green; `sticker-logic.js` is unchanged.

### Non-goals (YAGNI)
- Dropping or restructuring `players` (bracket/Pick'em depend on them).
- Syncing *all local players'* books — sync continues to represent "you" on this device = the **active player** (now: the active player's books). Multi-player push is out of scope.
- Different album editions / multiple checklists (single 980-sticker dataset stays).
- Moving books between people, or merging books.

## 3. Constraints (from the existing project)

- Static, no-build. Logic modules use the dual-export UMD pattern
  (`window.X` + `module.exports`) so they run in the browser and under `node --test`.
- `*.jsx` is transpiled in-browser via Babel; the Stickers tab is `StickersTab` in `hub-stickers.jsx`.
- Store is `useHubStore` in `hub-data.js`, localStorage-backed. Today:
  - `wc26players` = `{ list:[{id,name,emoji}], active }`
  - `wc26stickers:<playerId>` = `{ <stickerCode>: count }`
  - `wc26sync` = `{ url, code, memberId }`
- Family Sync backend is a Google Apps Script web app; client posts `text/plain` (CORS simple
  request, no preflight). Reference script: `worldcup/family-sync.gs`.
- `make-offline.sh` rewrites CDN→vendor for the kiosk; no new libraries are added by this feature.

## 4. Architecture

| Unit | File | Responsibility | Depends on |
|---|---|---|---|
| Store | `hub-data.js` (`useHubStore`) | new `books` state per player; `collections` keyed by **bookId**; book add/rename/delete; active-book; migration | localStorage |
| Sticker math (pure) | `sticker-logic.js` | **unchanged** — operates on one flat `{code:count}` map (now a book) | none |
| Sync client (pure + transport) | `sticker-sync.js` | per-book payload (`bookId`,`bookLabel`); `summarizeFamily` → one entry per (member,book) | none |
| Backend reference | `family-sync.gs` | upsert rows keyed by **memberId+bookId**; store `bookLabel`; back-compat for old rows | — |
| Stickers UI | `hub-stickers.jsx` | book switcher in My Book; Trade Matcher/Overview iterate (player,book) pairs; Family view shows `Name · Book` | store, sync |
| Tests | `stickertest.js`, `stickersync.test.js` | books registry, bookId-keyed collections, migration, per-book sync | logic, sync, store helpers |

### 4.1 Data model

```
wc26players          (unchanged)  { list:[{id,name,emoji}], active }
wc26books:<playerId> (new)        { list:[{id,label}], active }
wc26stickers:<bookId>             { <stickerCode>: count }
```

- **bookId:** the *default* book of a player has `id === playerId`. New books get `id = "b" + Date.now()`.
  Because the default book's id is the playerId, the existing `wc26stickers:<playerId>` key already **is**
  the default book's collection — migration never moves sticker data.
- In memory: `books = { [playerId]: { list:[{id,label}], active } }`; `collections = { [bookId]: {code:count} }`.
- The book being edited = `books[players.active].active`.

### 4.2 Migration (one-time, metadata-only)

On store init, for every player in `wc26players.list`, if `wc26books:<playerId>` is absent, write:

```
wc26books:<playerId> = { list:[ { id:<playerId>, label:"My album" } ], active:<playerId> }
```

No `wc26stickers:*` key is read or written during migration. Runs once per player (guarded by the
key's absence), so it is idempotent and also covers players added before the feature shipped.

### 4.3 Data flow

1. **Edit:** My Book → `setSticker(bookId, code, count)` where `bookId = books[active].active` → updates
   `collections[bookId]` → persisted to `wc26stickers:<bookId>`.
2. **Add book:** `addBook(playerId, label)` → new `bookId`, append to `books[playerId].list`, set it active,
   seed `collections[bookId] = {}`.
3. **Rename / delete:** `renameBook(playerId, bookId, label)`; `removeBook(playerId, bookId)` (refuses the
   last book; if the removed book was active, fall back to the first remaining; deletes its `wc26stickers:<bookId>`).
4. **Trade / Overview:** iterate every `(player, book)` pair → each book's flat map runs through the
   unchanged `sticker-logic` totals/`tradeMatch`. Rows labelled `Name · Book`.
5. **Sync push:** for each book of the active player, POST `{action:'push', bookId, bookLabel, name, emoji,
   collectionJSON}`. **Pull:** rows → `summarizeFamily` → one entry per (member,book).

## 5. `hub-data.js` changes

- New state `books` initialised from `wc26books:<playerId>` for each player (running §4.2 migration to fill gaps).
- `collections` initialised by reading `wc26stickers:<bookId>` for every bookId across all players' book lists
  (default bookId == playerId preserves current load).
- Persist `books` (per-player keys) and `collections` (per-book keys) via effects, mirroring today's pattern.
- New API: `addBook(playerId,label)`, `renameBook(playerId,bookId,label)`, `removeBook(playerId,bookId)`,
  `switchBook(playerId,bookId)`. `setSticker` signature changes from `(playerId,n,count)` to `(bookId,n,count)`.
- `addPlayer`/`importPlayer`: also create the new player's default book registry
  (`{list:[{id:<newPlayerId>,label:"My album"}], active:<newPlayerId>}`) and seed `collections[newPlayerId]={}`.
- `removePlayer`: also remove that player's `wc26books:<playerId>` and every `wc26stickers:<bookId>` for the
  player's books; prune them from in-memory `books`/`collections`.

## 6. `hub-stickers.jsx` changes

- **My Book:** under the existing player switcher, a **book switcher** — a pill per book of the active player,
  a `+ Add book` (prompts for a label, max ~14 chars), and rename/delete affordances on the active book
  (delete disabled when only one book remains). The grid edits the active book.
- **Trade Matcher / Overview:** build a flat list of `(player, book)` entries (each with `collections[bookId]`),
  label each `Name · Book`, and run the existing comparison per entry (book-to-book). The single-default-book
  case still shows one entry per person (label collapses to just the name when the book is the default "My album").
- **Family view:** each synced row already corresponds to a book; show `Name · Book label`.

## 7. `sticker-sync.js` + `family-sync.gs` changes

- `buildPayload`/push: include `bookId` and `bookLabel`. Pull is unchanged in shape; rows now carry `bookId`/`bookLabel`.
- `summarizeFamily(rows, myId, totalsOf)`: key/identify entries by `memberId + bookId`; expose `bookLabel`;
  `isMe` stays per-member. Rows missing `bookId` (legacy) are treated as a single book labelled "My album"
  with `bookId = memberId`.
- `family-sync.gs` (reference): the sheet gains `bookId` and `bookLabel` columns; upsert matches on
  `memberId + bookId`; reads tolerate old rows lacking those columns (default `bookId=memberId`, `bookLabel=""`).

## 8. Error handling & edge cases

- **Last book:** `removeBook` refuses to delete the only remaining book (mirrors the last-player guard).
- **Active book removed:** active falls back to the first remaining book of that player.
- **Empty label:** default to "Book N"; trim and cap length.
- **Legacy sync rows** (no `bookId`): resolved to a single "My album" book — old and new clients interoperate.
- **localStorage failures:** swallowed in try/catch as today; the app keeps working in-memory.

## 9. Testing

- `stickertest.js` (Node `node:test`):
  - Migration: a player with an existing `wc26stickers:<playerId>` gets a default book `{id:playerId,label:"My album"}`
    and the collection is reachable under bookId == playerId with **no data move**.
  - Books registry helpers: add (new id, becomes active, seeded empty), rename, delete; deleting the last book is refused;
    deleting the active book re-points active to a remaining book.
  - `collections` keyed by bookId; `setSticker(bookId,…)` updates the right book only.
- `stickersync.test.js`:
  - `buildPayload` carries `bookId`/`bookLabel`; pushing a player with two books yields two rows.
  - `summarizeFamily` returns one entry per (member,book), keyed by memberId+bookId, with `bookLabel`;
    a legacy row without `bookId` resolves to one "My album" entry.
- Puppeteer smoke (`stickersmoke.js`): add a second book, switch between books, edit each independently
  (counts don't bleed across books), Trade Matcher lists book-to-book; **0 JS errors**; existing 42 tests stay green.

## 10. Build order (for the implementation plan)

1. `hub-data.js`: books state + migration + bookId-keyed collections + `setSticker(bookId,…)` + book CRUD; unit tests.
2. Thread `addPlayer`/`importPlayer`/`removePlayer` through the books registry; unit tests.
3. `hub-stickers.jsx`: book switcher in My Book (add/rename/delete/switch); smoke.
4. `hub-stickers.jsx`: Trade Matcher + Overview iterate (player,book) pairs, `Name · Book` labels; smoke.
5. `sticker-sync.js`: per-book payload + `summarizeFamily` per (member,book) + legacy fallback; unit tests.
6. `family-sync.gs`: memberId+bookId upsert + new columns + back-compat; Family view shows `Name · Book`; smoke.
7. README: note multiple books per person.

## 11. Definition of done

- A person can add, rename, switch, and delete books (last book protected); each book's counts are independent.
- Trade Matcher and Overview match book-to-book with `Name · Book` labels; the single-book case is unchanged visually.
- Family Sync pushes each of the active player's books as its own row and lists family books per (member,book);
  new and legacy (no-bookId) clients interoperate.
- Existing collections survive as the default "My album" book with no sticker-data move.
- `stickertest.js` / `stickersync.test.js` green; the 42 existing tests stay green; offline build unaffected.
