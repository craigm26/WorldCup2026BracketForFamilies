# Family Sync (Stickers) via Google Sheets — Design

**Date:** 2026-06-06
**Project:** World Cup 2026 — Family Bracket & Hub
**Status:** Approved design, pre-implementation
**Builds on:** the sticker-collection tracker (`worldcup/sticker-*.js`, `hub-stickers.jsx`)

## 1. Summary

Let family members in different households **publish their sticker collection** and
**propose/accept trades** with each other, using a **Google Sheet + Apps Script web app**
as a cheap, "invisible" shared backend. The app stays **local-first and fully static**:
Family Sync is an **optional, progressive-enhancement layer** that does nothing unless a
sync endpoint is configured and the device is online. Scope is **stickers only** for now;
the shared layer is designed so the bracket / Pick'em can plug in later.

## 2. Goals & non-goals

### Goals
- Remote relatives publish a (read-only to others) view of their collection.
- Async **trade proposals** between households: propose → the other person Accepts/Declines.
- **No accounts, no install** for relatives — they open the same static Hub URL via a
  one-tap setup link.
- Stay **local-first**: the owner's `localStorage` collection remains the source of truth;
  publishing is explicit and opt-in. Offline / unconfigured = today's behaviour, unchanged.
- Keep the public repo free of secrets (the Apps Script URL is never committed).

### Non-goals (YAGNI / deferred)
- Live/real-time sync (Apps Script latency makes this poll-on-open + after-action).
- Per-person PINs / real auth (family-code-only for v1; PIN noted as future).
- Syncing the bracket, Pick'em leaderboard, or quiz scores (designed-for, not built now).
- Moderation workflows beyond "the operator can edit the Sheet by hand".

## 3. Constraints (from the existing project)

- Plain static HTML/JS; `*.js` files set `window.*` globals, `*.jsx` transpiled in-browser
  via `@babel/standalone`. Per-player data in `localStorage` (`wc26stickers:<id>`).
- The Hub is served both from GitHub Pages (public) and the offline-vendored pi-nas kiosk.
  **Family Sync must degrade to a no-op** when offline or unconfigured (the kiosk is offline).
- The repo is **public** — the Apps Script `/exec` URL must not be committed.

## 4. Architecture

```
device (kiosk + each relative's phone)            Apps Script web app           private Google Sheet
  localStorage: own collection + memberId  ──POST(text/plain JSON)──▶  doPost(e)  ──▶  Members / Trades tabs
  Family view (others' collections+trades) ◀────────  JSON  ─────────  (validates familyCode)
```

- **One endpoint, POST-only.** Body is sent with `Content-Type: text/plain;charset=utf-8`
  so the browser treats it as a CORS *simple request* — **no preflight**, which is the usual
  Apps Script CORS failure. `doPost` reads `e.postData.contents` (a JSON string), returns
  `ContentService.createTextOutput(JSON.stringify(res)).setMimeType(JSON)`.
- The web app is deployed **"Execute as me / Who has access: Anyone"** so relatives need no
  Google login. The **`familyCode` in every request body is the access gate**; the script
  rejects mismatches.
- **Reads also go through POST** (with an `action`) to avoid any GET/CORS edge cases.

### Units (each small, testable, one responsibility)

| Unit | File | Responsibility | Depends on |
|---|---|---|---|
| Sync client (pure) | `worldcup/sticker-sync.js` | build request payloads, parse responses, trade-state transitions, collection (de)serialize; `window.WCSTKSYNC` + `module.exports` | none (pure) |
| Sync transport | inside `sticker-sync.js` | `postAction(cfg, action, payload)` → `fetch` POST text/plain; injectable `fetchImpl` for tests | `fetch` |
| Config | `worldcup/hub-data.js` (extend) | read/write `wc26sync` (`{url, code, memberId}`) in localStorage; parse `?sync=&code=` setup link | localStorage |
| Family UI | `worldcup/hub-stickers.jsx` (extend) | the 👨‍👩‍👧 Family segment: roster, publish, propose/respond trades | sync client, store |
| Apps Script | `worldcup/family-sync.gs` (NOT served; reference copy for the operator) | the server: validate code, read/write Members & Trades | Google Sheet |
| Tests | `stickersync.test.js` (repo root, Node) | pure logic + sync client against a fake transport | sync client |

## 5. Data model

### 5.1 Google Sheet (two tabs)

**Members**
| familyCode | memberId | name | emoji | updatedAt | collectionJSON |
|---|---|---|---|---|---|

- one row per member's *published* collection. `collectionJSON` = compact `{"<code>":count}`
  (only owned/doubled entries; needs are implied by absence).
- a device owns exactly one row (its `memberId`); `publishCollection` upserts that row.

**Trades**
| tradeId | familyCode | fromId | fromName | toId | toName | giveCodes | wantCodes | status | createdAt | updatedAt |
|---|---|---|---|---|---|---|---|---|---|---|

- `giveCodes` / `wantCodes` = comma-joined sticker codes. `status` ∈ `pending|accepted|declined`.

### 5.2 Local config — `localStorage["wc26sync"]`

```js
{ url: "https://script.google.com/macros/s/…/exec", code: "merry-fam", memberId: "m_<rand>" }
```

- `memberId` is generated once per device. Absence of `wc26sync` ⇒ Family Sync is **off**.

## 6. Sync client API (`window.WCSTKSYNC`, pure where possible)

```
genMemberId()                                  → "m_" + base36 random (stamped via caller; no Date.now in module)
parseSetupLink(search)                         → { url, code } | null   (from "?sync=&code=")
serializeCollection(map)                       → { "<code>": count }    (drop count<=0)
buildPayload(action, cfg, extra)               → { action, familyCode, memberId, ...extra }
tradeTransition(trade, action)                 → next status ('accept'→accepted, 'decline'→declined; guards)
summarizeFamily(membersRows, myId)             → [{id,name,emoji,have,total,doubles,updatedAt,isMe}]
crossTrade(myMap, theirMap, index)             → {iGive, iWant} (reuses WCSTKLOGIC.tradeMatch shape)
postAction(cfg, action, extra, fetchImpl?)     → Promise<result>  (POST text/plain; fetchImpl defaults to window.fetch)
```

`postAction` is the only impure piece; tests inject a `fetchImpl` fake.

## 7. Apps Script server (`family-sync.gs`, operator-installed)

`doPost(e)` parses `JSON.parse(e.postData.contents)`, switches on `action`:
- **publishCollection** — validate `familyCode`; upsert the `memberId` row in Members.
- **getFamily** — return `{members:[…], trades:[…]}` for that `familyCode`.
- **proposeTrade** — append a Trades row (`status:pending`, generated `tradeId`).
- **respondTrade** — set `status` for `tradeId` (only if it belongs to the family + addressee).

All responses `{ ok:true, ... }` or `{ ok:false, error }`. The `.gs` file is a **reference copy
in the repo for the operator to paste into Apps Script** — it is not loaded by the web app.

## 8. Onboarding & security

1. Operator creates a Google Sheet (2 tabs), opens Extensions → Apps Script, pastes
   `family-sync.gs`, sets a `FAMILY_CODE` (or accepts any code), **Deploy → Web app**
   ("Execute as me", "Anyone"), copies the `/exec` URL.
2. Operator shares **one link**: `…/worldcup/?sync=<exec-url>&code=<family-code>` (also a QR).
3. A relative taps it → app stores `wc26sync` (generates `memberId`) → creates their player →
   publishes → proposes trades. No login, no install.

**Security posture (explicit):** the endpoint is public-but-obscure and **gated only by the
family code**; anyone with the URL+code can read/write the family's sticker data. Acceptable
for a private family sticker app; **not** for anything sensitive. Data lives in the operator's
private Sheet; only family-chosen names + sticker counts are stored. The URL+code are secrets —
kept out of the repo, lived in the link / Settings. Future hardening (out of scope): per-person
PIN, rotating code, request throttling.

## 9. UI

New **👨‍👩‍👧 Family** segment in the Stickers tab (4th, after My Book / Trade Matcher / Overview):
- **Not configured:** a short explainer + a field to paste a setup link or URL+code (mirrors
  the AddPlayerCard styling), so a relative who typed the bare URL can still join.
- **Configured:** "Publish my collection" button (pushes the active player's map), a **roster**
  of relatives (emoji, name, have/total, last-updated) with a tap to view their collection
  read-only, and **Trades**: incoming `pending` proposals with Accept/Decline, plus a
  "Propose a trade" flow that reuses the Trade-Matcher computation against a chosen relative's
  published collection.
- **Status/refresh:** a small "↻ Refresh" + last-synced time; errors shown inline (never throw).

Settings tab gains a one-line "Family Sync: connected / not set up" with a manual config field.

## 10. Error handling & offline

- Every network call is wrapped; failures show a friendly inline message, never crash the tab.
- If `wc26sync` is absent or `fetch` rejects (offline kiosk), the Family segment shows the
  "set up / offline" state; the rest of the app is unaffected.
- Responses validated (`ok` flag) before use; malformed → treated as error.

## 11. Build order (for the implementation plan)

1. `sticker-sync.js` pure helpers + `stickersync.test.js` (TDD): payloads, parse,
   `serializeCollection`, `tradeTransition`, `summarizeFamily`, `crossTrade`.
2. `postAction` with injected fake `fetchImpl` (assert text/plain + body shape + response parse).
3. `family-sync.gs` reference server + a Node **fake** implementing the same 4 actions in-memory,
   used to integration-test the client end-to-end without Google.
4. Config plumbing in `hub-data.js` (`wc26sync` read/write, `parseSetupLink`, auto-apply
   `?sync=&code=` on load) + tests.
5. `hub-stickers.jsx` Family segment — not-configured state (paste link) first; wire into
   `StickersTab`; load `sticker-sync.js` in `index.html`.
6. Publish + roster (read others' collections).
7. Propose trade (reuse Trade Matcher) + incoming Accept/Decline.
8. Settings status line + refresh/last-synced + error states.
9. Operator setup doc (README/`docs`): create Sheet, paste `.gs`, deploy, share link.
10. Manual end-to-end verification against a real deployed test Sheet (documented checklist).

## 12. Definition of done

- Pure logic + client (against fake transport) covered by Node tests; existing
  `stickertest.js` + smoke stay green; Family segment degrades gracefully offline.
- A relative can open a setup link on a phone, publish a collection, and complete a
  propose→accept trade visible to both households (manual e2e against a test Sheet).
