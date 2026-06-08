# Shared Family Library (all books editable everywhere) — Design

**Date:** 2026-06-07
**Project:** World Cup 2026 — Family Bracket & Hub
**Status:** Approved backbone (brainstorm), pre-implementation

## 1. Summary

Make the family's **entire roster of players + books + collections a shared, read/write set**
that every device — and the kiosk — presents and can edit. The existing **Google Sheet** is the
shared store; the kiosk **seeds** it and stays the canonical copy. Each device is **local-first**
(instant edits, offline-capable); a background **sync engine** reconciles with the Sheet
(**pull on load + every ~20s; debounced push of edited books; per-book last-write-wins by
`updatedAt`**). Eventually-consistent (~20s), not real-time.

## 2. Decisions (from brainstorm)
- **Model:** all members' books, **editable from anywhere**; kiosk = master.
- **Backbone:** Google Sheet shared store, **local-first + auto-sync**, per-book last-write-wins.

## 3. Goals & non-goals
### Goals
- Every device presents the **whole family roster** (all players + books) and can edit any book.
- Edits apply instantly locally and converge across devices within ~20s.
- The kiosk's current roster **seeds** the shared store with no data loss (Ethan's books preserved).
- Works for both Tailscale and public family (anything that can reach the Sheet's `/exec`).
- The reconcile/merge logic is a **pure, node-tested module** (the risky core).

### Non-goals (YAGNI)
- Real-time/websocket sync (Sheets has no push).
- Field-level merge of the same book (per-book last-write-wins is the conflict rule).
- A separate sync server on the Pi (rejected in brainstorm).
- Auth/permissions beyond the existing shared family code.

## 4. Identity & data model

### 4.1 Family-global identity
- A **player** has a family-global `playerId`; a **book** a family-global `bookId` (default book's
  id == its playerId, preserved). New ids created on any device are **memberId-prefixed**
  (`<memberId>:<localseq>`) so two devices never collide. The kiosk's existing ids seed the roster.
- A fresh device in shared mode **pulls-and-adopts** the roster instead of creating a local default player.

### 4.2 Sheet schema (Members sheet, additive)
Columns: `familyCode, playerId, name, emoji, bookId, bookLabel, updatedAt, deleted, collectionJSON`.
- Rows are keyed by **`(familyCode, playerId, bookId)`** (was `memberId+bookId`).
- `updatedAt` = ISO time of the last edit to that book (drives last-write-wins).
- `deleted` = `"1"` soft-deletes a book/player (so removals propagate; absence ≠ deletion).
- Back-compat: old rows (no `playerId`) are read with `playerId = memberId`.

### 4.3 Local state (localStorage, per device)
- Existing `wc26players`, `wc26books:<playerId>`, `wc26stickers:<bookId>` stay (local-first).
- New `wc26sync_meta` = `{ [bookId]: { updatedAt, dirty } }` — per-book last-edit time + a dirty flag
  (set on local edit, cleared after a successful push).

## 5. The reconcile engine (pure, tested) — `family-store.js`

`window.WCFAMSTORE` (dual-export). The heart of the feature; **fully node-testable**.

```
reconcile(local, remoteRows, now) -> { roster, toPush, changed }
```
- **Inputs:**
  - `local` = `{ players:[{id,name,emoji}], books:{[pid]:[{id,label}]}, collections:{[bid]:map},
                 meta:{[bid]:{updatedAt,dirty}} }`
  - `remoteRows` = array of `{ playerId, name, emoji, bookId, bookLabel, updatedAt, deleted, collectionJSON }`
  - `now` = caller-supplied ISO timestamp (so the function stays pure/deterministic).
- **Rules (per `(playerId, bookId)`):**
  1. Remote-only book → **add** locally (and its player if new) with remote collection + `updatedAt`.
  2. Both exist, **local not dirty**, `remote.updatedAt > local.updatedAt` → **adopt remote** (collection + label).
  3. Both exist, **local dirty** → keep local (it will be pushed; local wins this round).
  4. `remote.deleted` and local not dirty → **remove** locally.
  5. Local-only book (not in remote) with `dirty` or never-synced → include in **`toPush`**.
- **Output:** the merged `roster` (players/books/collections/meta), `toPush` (rows to write), and a
  `changed` flag (did anything local change → persist + re-render).
- Helpers (also pure, tested): `rowsFromLocal(local, dirtyOnly)` (build sheet rows), `newId(memberId, seq)`,
  `markDirty(meta, bookId, now)`, `clearDirty(meta, bookIds)`.

## 6. Sync engine wiring (`hub-data.js` / a small driver)

When `sync` is configured (the kiosk auto-has it via `sync-config.js`), shared mode is active:
- **On load:** pull (`getFamily`) → `reconcile` → adopt roster.
- **Poll:** every ~20s, pull → reconcile → adopt (skip while a push is in flight).
- **On edit** (`setSticker`, add/rename/remove book/player): apply locally instantly, `markDirty`, and
  schedule a **debounced push** (~2–3s) of dirty rows via `publishCollection` (now carrying
  `playerId, bookId, bookLabel, updatedAt, deleted, collection`). On success, `clearDirty`.
- **Seeding:** if the device has local books and the pulled roster lacks them, they're dirty → pushed
  (the kiosk thus seeds the Sheet on first sync).
- **Offline / errors:** pushes/pulls fail silently and retry next cycle; local edits are never lost.
- A subtle-but-important guard: a freshly-auto-joined device with the **default "family" player** and an
  empty collection must NOT clobber the shared roster — if the pulled roster is non-empty, the empty
  default player is replaced by the shared roster rather than pushed.

## 7. `family-sync.gs` changes (re-deploy required)
- `publishCollection`: key the upsert on `(familyCode, playerId, bookId)`; store `playerId, name, emoji,
  bookId, bookLabel, updatedAt, deleted, collectionJSON`; **last-write-wins** — only overwrite if the
  incoming `updatedAt` ≥ the stored one (server-side guard against out-of-order writes). `ensureHeaders`
  adds the new columns. Accept a `deleted` flag.
- `getFamily`: return all the above fields; default `playerId = memberId`, `deleted = ""` for legacy rows.
- Keep `clearByCode` (already added). Operators **must re-deploy**.

## 8. UI
- The Family/roster the device shows is now the **shared** roster (all players + books). My Book, Trade
  Matcher, Overview, and the player switcher operate on it unchanged (they already read `players/books/collections`).
- A small **sync status** line (e.g. "Synced ✓ · 3 family members" / "Syncing…" / "Offline — will sync")
  in the Family area. No new tab.

## 9. Error handling & risks
- **Conflict:** per-book last-write-wins; concurrent edits to the *same* book can lose the earlier one
  (documented; rare in practice).
- **Consistency:** ~20s lag.
- **Quota:** debounced per-book pushes keep Apps Script calls modest.
- **Data safety:** local-first means a sync bug can't lose local edits; the seed preserves Ethan's books.
  A bad merge could, however, surface another device's stale data — mitigated by `updatedAt` LWW + the
  empty-default-player guard (§6).

## 10. Testing
- **Node (`familystore.test.js`)** — heavy, since this is the risky core and is browser-free:
  - `reconcile`: remote-only add; remote-newer adopt; dirty keeps local; remote delete removes;
    local-only → toPush; legacy rows (no `playerId`); the empty-default-player-doesn't-clobber guard;
    idempotence (reconcile twice = stable).
  - `rowsFromLocal`, `newId` (no collisions across two memberIds), `markDirty`/`clearDirty`.
- **Browser smoke (DEFERRED — host Chromium broken):** two simulated devices against a fake server:
  edit on A → appears on B after a poll; offline edit syncs on reconnect; seed populates an empty Sheet.
  Until a browser is available, ship is gated on the Node suite + code review + **operator real-device check**.

## 11. Build order
1. `family-store.js` `reconcile` + helpers + `familystore.test.js` (TDD) — **the core, fully verifiable now.**
2. `family-sync.gs` schema (playerId/updatedAt/deleted, LWW) — reference only; redeploy gated.
3. `hub-data.js` shared-mode driver (pull/poll/debounced push/seed/guard) + `sync-meta` persistence.
4. Sync status line in the Family UI.
5. README.
6. **Gate:** merge after Node suite + review; **hold kiosk deploy + .gs redeploy for real-device verification.**

## 12. Definition of done
- `reconcile` + helpers fully node-tested (incl. conflict, legacy, seed, guard, idempotence).
- With the Sheet redeployed, every device presents + edits the whole family roster; edits converge ~20s;
  per-book last-write-wins; the kiosk seeds with no data loss.
- Local-first: offline edits never lost; the empty-default device can't clobber the shared roster.
- Existing tests stay green. Live multi-device behavior verified on real devices before the kiosk deploy.
