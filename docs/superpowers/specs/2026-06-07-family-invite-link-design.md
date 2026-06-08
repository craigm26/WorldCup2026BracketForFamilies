# Easy Family Invite Link + Sticky Shared Sync — Design

**Date:** 2026-06-07
**Project:** World Cup 2026 — Family Bracket & Hub
**Status:** Approved design, pre-implementation

## 1. Summary

Make it **trivial to invite remote family** onto the shared sticker-book system, and make
the connection **sticky across every screen** — without ever putting the secret write-key on
the public web.

Two parts:
1. **In-app invite card** (🎟️ Stickers → 👨‍👩‍👧 Family, when connected): up to **two** invite
   options, each with a one-tap **Copy** (with an `http://`-kiosk clipboard fallback) and a **QR**:
   - **🏠 Tailscale link** — the kiosk's own URL over the user's tailnet
     (`http://100.x.y.z/worldcup/`). **No key in the link**: family on the tailnet open it,
     load the app from the kiosk, and the kiosk's `sync-config.js` auto-joins them. The `/exec`
     write-key never leaves the private network.
   - **🌍 Public link** — the public hub (GitHub Pages `…/worldcup/`) with `?sync=…&code=…` embedded,
     for family **not** on the tailnet. Carries the key, so it's shared privately.
2. **Sticky default config**: `loadSync()` falls back to an optional `window.WCSYNC_DEFAULT`
   (url + code, plus `tailscaleHub`/`publicHub` for the card) when a device has no saved sync. On the
   **kiosk only**, a **git-ignored** `sync-config.js` supplies that default, so every screen there
   (LAN *and* tailnet visitors) auto-joins the same family system and survives cache wipes. The
   public build ships no such file.

## 2. Goals & non-goals

### Goals
- One-tap copy + QR of the family invite link, reachable from inside the running app.
- The invite link points at a public, openable hub URL (not the kiosk's LAN address).
- A fresh device with a configured default auto-connects to Family Sync (no manual link entry).
- The kiosk's secret config (`/exec` URL + family code + public hub) lives **only** in a
  git-ignored file on the Pi — never committed, never on GitHub Pages.
- Remote devices keep working as today: open the link once → localStorage remembers it.

### Non-goals (YAGNI)
- Embedding the `/exec` URL or family code in the committed repo or the public Pages build.
- A server-side account/login system. The "code" stays the shared room key.
- Changing the existing standalone `setup.html` helper (it keeps working; this just adds an
  in-app path).

## 3. Constraints

- Static, no-build. Pure logic modules use the dual-export UMD pattern; `*.jsx` is Babel-in-browser.
- The kiosk is served over **`http://`** (LAN), so `navigator.clipboard` is unavailable there →
  the Copy button needs an `execCommand('copy')` fallback.
- `window.QRCode` (qrcodejs 1.0.0) is already loaded by `worldcup/index.html`; `new QRCode(el,{text,width,height})`.
- `window.WCSETUP.buildShareLink` (in `setup-link.js`) already builds setup links; this design adds
  a sibling `buildInviteLink(hubBase, exec, code)` for the simpler "I already have a hub base URL" case.
- `loadSync()` runs in the store (`hub-data.js`); secrets must never reach the committed repo.

## 4. Architecture

| Unit | File | Responsibility | Depends on |
|---|---|---|---|
| Invite-link builder (pure) | `setup-link.js` (`WCSETUP`) | `buildInviteLink(hubBase, exec, code)` → `hubBase?sync=<enc>&code=<enc>`; trims; null if missing | none |
| Sync default fallback | `hub-data.js` (`loadSync`) | when no saved sync + no URL param, adopt `window.WCSYNC_DEFAULT` (url/code) and persist a memberId | `window.WCSYNC_DEFAULT` |
| Invite card UI | `hub-stickers.jsx` (`FamilyConnected`) | show link + Copy (clipboard w/ `execCommand` fallback) + QR | `WCSETUP`, `window.QRCode` |
| Kiosk default (private) | `worldcup/sync-config.js` (git-ignored, kiosk-only) | sets `window.WCSYNC_DEFAULT = {url, code, hub}` | — |
| Git hygiene | `.gitignore` | ignore `worldcup/sync-config.js` so the secret is never committed | — |
| Tests | `setuptest.js` | `buildInviteLink` cases | `setup-link.js` |

### 4.1 Which links the card shows
Let `D = window.WCSYNC_DEFAULT || {}` and `fallbackHub = location.origin + location.pathname.replace(/[^/]*$/, '')` (strip filename → `.../worldcup/`).
- **Tailscale link** = `D.tailscaleHub` (shown only if set). It is the bare hub URL — **no** `?sync`/`code`
  params — because opening it loads the kiosk's `sync-config.js`, which auto-joins the visitor.
- **Public link** = `buildInviteLink(publicHub, sync.url, sync.code)` where
  `publicHub = D.publicHub || (D.tailscaleHub ? null : fallbackHub)`:
  - Kiosk config provides `publicHub` → use it.
  - Device loaded **from the public hub** (no `WCSYNC_DEFAULT` at all) → `fallbackHub` is its own
    public `…/worldcup/` → correct.
  - Kiosk with only `tailscaleHub` set → no public link (don't guess one).
- If neither link resolves, the card renders nothing.

### 4.2 `loadSync()` fallback (data flow)
1. Read `wc26sync` from localStorage (existing).
2. If a `?sync=&code=` URL param is present, it configures/updates the device (existing).
3. **New:** if still no config, and `window.WCSYNC_DEFAULT` has `url`+`code`, adopt it —
   `{ url, code, memberId: genMemberId() }` — and persist to localStorage (so the memberId is stable).
4. Return the config (or null).

### 4.3 Invite card (when `sync` is set)
- Renders an `InviteRow` for each available link (Tailscale and/or public). Each row: a QR, a
  label + hint, the link text (selectable, word-break), and a **📋 Copy** button.
- **Copy:** `navigator.clipboard.writeText(link)` when available (secure context); otherwise select a
  hidden `<textarea>` holding the link and `document.execCommand('copy')`. Show a transient "Copied!".
- **QR:** per row, on mount/`link` change, clear the container and `new window.QRCode(el, {text: link, width, height})`;
  guard if `window.QRCode` is undefined (skip QR, keep link+copy).

## 5. `setup-link.js` — `buildInviteLink`
```js
buildInviteLink(hubBase, exec, code) -> string|null
// trims exec/code; null if either missing; ensures hubBase ends with '/';
// returns hubBase + '?sync=' + encodeURIComponent(exec) + '&code=' + encodeURIComponent(code)
```
Dual-export stays (`window.WCSETUP` + `module.exports`).

## 6. Kiosk deploy (out of repo)
- Write `worldcup/sync-config.js` **on the Pi only**:
  ```js
  window.WCSYNC_DEFAULT = {
    url: "<exec>", code: "<family code>",
    tailscaleHub: "http://100.x.y.z/worldcup/",          // secret-free, auto-joins on the tailnet
    publicHub: "https://<public-pages>/worldcup/"             // for the public link (key embedded)
  };
  ```
- Add `<script src="sync-config.js"></script>` to the **kiosk's** `index.html` (before `hub-data.js`),
  the same idempotent patch pattern used for `sticker-books.js`. The **repo** `index.html` is NOT
  changed, so the public build never references it (no 404, no leak).
- `.gitignore` ignores `worldcup/sync-config.js` so it can never be committed.

## 7. Error handling & security

- **Secret containment:** the `/exec` URL + family code appear only in (a) the user-shared invite
  link and (b) the kiosk's git-ignored `sync-config.js`. Never in the committed repo or public Pages.
- **No QR lib:** card still shows the link + Copy; QR is skipped silently.
- **No clipboard API (`http` kiosk):** `execCommand('copy')` fallback; if that also fails, the link
  text is selectable so it can be copied manually.
- **No default config:** `loadSync` returns null → the app behaves exactly as today (unconnected).
- **localStorage failures:** swallowed as today.

## 8. Testing

- `setuptest.js` (`buildInviteLink`): builds `hub?sync=…&code=…` with URL-encoding; trims inputs;
  returns null when exec or code is missing; tolerates a `hubBase` with or without a trailing `/`.
- Smoke (Puppeteer, `stickersmoke.js` or a focused script):
  - **Default fallback:** with `window.WCSYNC_DEFAULT` injected before load (and no saved sync),
    the device auto-connects (`wc26sync` gets set with url/code + a memberId).
  - **Invite card (public):** a connected device with no `WCSYNC_DEFAULT` shows a public invite link
    (with `?sync=&code=`), a Copy button, and a QR; **0 JS errors**.
  - **Invite card (Tailscale + public):** with `WCSYNC_DEFAULT.tailscaleHub`+`publicHub` injected, the
    card shows BOTH a secret-free Tailscale link and the public link. (Clipboard isn't asserted headless.)

## 9. Build order (for the plan)

1. `setup-link.js`: add `buildInviteLink` + `setuptest.js` cases (TDD).
2. `hub-data.js`: `loadSync` `WCSYNC_DEFAULT` fallback (persist memberId) + a focused load smoke.
3. `hub-stickers.jsx`: invite card in `FamilyConnected` (link + Copy w/ fallback + QR) + smoke.
4. `.gitignore`: ignore `worldcup/sync-config.js`.
5. Kiosk deploy (operator-gated): write `sync-config.js` on the Pi + patch the kiosk `index.html`.
6. README: a short "Invite your family / every screen stays in sync" note.

## 10. Definition of done

- The Family tab (connected) shows a copyable invite link + QR pointing at the public hub.
- Copy works on the `http://` kiosk (fallback) and on `https` devices.
- A device with `window.WCSYNC_DEFAULT` auto-connects on first load and persists.
- `worldcup/sync-config.js` is git-ignored; the committed repo and public Pages contain no `/exec`
  URL or family code.
- `setuptest.js` green; existing tests + smoke stay green.
