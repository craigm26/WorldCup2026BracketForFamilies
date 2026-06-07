# Easy Family Setup — Design

**Date:** 2026-06-07
**Project:** World Cup 2026 — Family Bracket & Hub
**Status:** Approved design, pre-implementation

## 1. Summary

Make it **extremely easy** for a family to get going from the landing page
(`https://craigm26.github.io/WorldCup2026BracketForFamilies/`):

1. **`setup.html`** — a guided **Family-Sync host helper** that turns the hardest task
   (create a Google Sheet + Apps Script + hand-build a `?sync=…&code=…` link) into copy-paste
   steps and an instant **share link + QR generator**.
2. **Landing refresh** (`index.html`) — a one-tap **"Get started"** band that triages every
   visitor, with content brought current (ten tabs, Stickers, Family Sync). No camera/scan.
3. **Laptop launchers** — `serve.js` + `start.command`/`start.sh`/`start.bat` (+ optional
   `Dockerfile`) so non-Pi owners run the Hub by double-click.

Everything stays **static / no-build / no-tracking**; the share link is generated entirely
client-side (the host's `/exec` URL + family code never leave the browser).

## 2. Goals & non-goals

### Goals
- A host can stand up Family Sync from `setup.html` without reading the README — copy the
  script, deploy, paste the `/exec` URL + a code, and get a ready-to-send link + QR.
- A first-time visitor instantly sees what to do: open the Hub, run it on their computer,
  set up family trading, or "got a link? tap it".
- Non-Pi owners (Mac/Windows/Linux) run the Hub locally by double-clicking one file, with
  zero install where Python or Node already exists.
- Landing content matches what shipped (Stickers, Family Sync, ten tabs).

### Non-goals (YAGNI / out of scope)
- Auto-creating the Google Sheet/Apps Script (can't touch the host's Google account).
- Any camera/scan UI (removed) — `setup.html`/landing must not mention scanning.
- Kiosk HTTPS (was only for the camera — dropped).
- Native installers (.dmg/.exe/.AppImage); a hosted offline build wizard.
- The 47-team enrichment (separate background track).

## 3. Constraints (from the existing project)

- Plain static HTML/JS; the Hub lives in `worldcup/`, the landing is the repo-root
  `index.html`. The Hub already honors `?sync=…&code=…` setup links (`wc26sync`).
- The reference Apps Script is `worldcup/family-sync.gs` (single source of truth).
- `qrcodejs` is already used by the Hub (loadable from cdnjs) for QR rendering.
- Served from GitHub Pages (https) and the offline pi-nas kiosk. New top-level files are
  fine on Pages; the launchers serve the **repo root** so both the landing and `worldcup/` work.

## 4. Architecture

| Unit | File | Responsibility | Depends on |
|---|---|---|---|
| Share-link logic (pure) | `setup-link.js` | `buildShareLink(origin, basePath, exec, code)` → the `…/worldcup/?sync=&code=` URL (encoding, trimming, validation); dual export | none |
| Setup helper page | `setup.html` | guided steps + copy-the-script + the link/QR generator UI | `setup-link.js`, `qrcodejs`, fetch `worldcup/family-sync.gs` |
| Landing | `index.html` | refreshed copy + a "Get started" band of cards | links only |
| Local server (pure-ish) | `serve.js` | zero-dependency Node static file server (content-types, 404, path-traversal guard) | Node built-ins |
| Launchers | `start.command`, `start.sh`, `start.bat` | detect python3/python/node → serve repo root → open `…/worldcup/` | python or node |
| Container (optional) | `Dockerfile` | serve the repo on a port via a tiny base image | Docker |
| Tests | `setuptest.js` (Node) | `buildShareLink` cases + `serve.js` behavior | the two modules |
| Docs | `README.md` | "Run it on your laptop" + link to `setup.html` | — |

## 5. `setup-link.js` (pure, testable)

```js
// buildShareLink("https://craigm26.github.io", "/WorldCup2026BracketForFamilies/",
//                "https://script.google.com/macros/s/AAA/exec", "merry fam")
//   => "https://craigm26.github.io/WorldCup2026BracketForFamilies/worldcup/?sync=...&code=merry%20fam"
buildShareLink(origin, basePath, exec, code) -> string | null   // null if exec/code missing
```
- Normalizes `basePath` to start+end with `/`; appends `worldcup/`; `encodeURIComponent`s
  `exec` and `code`; returns `null` when `exec` or `code` is empty/whitespace.
- Dual export (`window.WCSETUP` + `module.exports`) so it powers `setup.html` and Node tests.

## 6. `setup.html` — guided host helper

A single static page, dark theme matching the Hub, sections:
- **Intro:** "Set up sticker trading for your family (one-time, ~5 minutes)."
- **Step 1 — Make a Sheet:** a button/link to `https://sheets.new`.
- **Step 2 — Paste the script:** a `<pre>` showing `worldcup/family-sync.gs` (fetched at load)
  with a **📋 Copy** button. If the fetch fails (e.g. opened via `file://`), show a link to the
  raw file on GitHub instead of an empty box.
- **Step 3 — Deploy:** exact clicks — *Deploy → New deployment → Web app → Execute as: Me →
  Who has access: **Anyone** → Deploy* — and "copy the **/exec URL**".
- **Step 4 — Make your family link:** inputs for **/exec URL** and **family code**; on input,
  call `buildShareLink(location.origin, <basePath>, exec, code)` and show the **link**
  (read-only field + **📋 Copy**), an **✉️ Text/email it** (`mailto:`/share), and a **QR code**
  (qrcodejs). `basePath` is derived from `setup.html`'s own URL so links are correct for any host.
- **Security note:** the link is built in your browser; the URL + code aren't sent anywhere;
  anyone with the link can read/write your family's sticker data, so share it privately.
- A footer link back to the Hub + the landing.

## 7. Landing refresh (`index.html`)

- Add a **"🚀 Get started"** band under the hero with four cards:
  - **▶ Open the Hub** → `worldcup/`
  - **💻 Run it on your computer** → anchors to a short "Run locally" section (the launchers)
  - **👨‍👩‍👧 Set up family trading** → `setup.html`
  - **🔗 Got a family link?** → "Just tap the link someone shared — you're in."
- Refresh stale copy: "eight tabs" → "ten", add **🎟️ Stickers** and **👨‍👩‍👧 Family Sync** to the
  feature grid. Add a short **"Run it on your computer"** section describing the launchers
  (download/clone → double-click `start.command`/`start.bat`/`start.sh`).
- **No camera/scan wording anywhere.**

## 8. Laptop launchers

- **`serve.js`** — zero-dependency Node static server (Node `http`/`fs`/`path` only): serves the
  repo root on `PORT` (default 8080), correct content-types for `.html/.js/.css/.json/.png/.svg/.ico`,
  `404` for missing, and a **path-traversal guard** (resolve + ensure inside root). Prints the URL.
- **`start.sh`** (POSIX, Linux/Mac): `cd` to script dir; pick `python3` → `python` → `node serve.js`;
  serve on 8080; open `http://localhost:8080/worldcup/` via `xdg-open`/`open`; if none found, print a
  friendly "install Python or Node, or use the live link" message. Handles spaces in paths.
- **`start.command`** (macOS double-click): thin wrapper that `cd`s to its dir and runs the same
  logic as `start.sh` (Finder opens `.command` in Terminal).
- **`start.bat`** (Windows double-click): detect `py`/`python`/`node`; serve; `start ""` the browser.
- **`Dockerfile`** (optional): `python:3-alpine`, copy repo, `CMD python -m http.server 8080`;
  documented one-liner `docker run -p 8080:8080 ...`. No compose needed.

## 9. Testing

- `setuptest.js` (Node `node:test`):
  - `buildShareLink`: happy path, missing exec/code → `null`, code/exec URL-encoding, basePath
    normalization (with/without trailing slash).
  - `serve.js`: start on an ephemeral port; GET an existing file → 200 + right `Content-Type`;
    GET missing → 404; **GET `/../serve.js` style traversal → 403/404, never escapes root**.
- Puppeteer smokes:
  - `setup.html`: type a fake `/exec` URL + code → the share-link field fills, a QR `<canvas>/<img>`
    appears, the script `<pre>` is non-empty; 0 JS errors.
  - `index.html`: loads; the four "Get started" cards link to `worldcup/`, `#run-locally`,
    `setup.html`, and contain the "got a link" text; no "scan"/"camera" text present.
  - `start.sh`: run it on Linux (background), `curl` `http://localhost:8080/worldcup/` → Hub HTML;
    then stop it.

## 10. Build order (for the implementation plan)

1. `setup-link.js` + `setuptest.js` (`buildShareLink` TDD).
2. `serve.js` + its tests (serve/404/traversal).
3. `setup.html` (steps + copy-script + generator) + smoke.
4. `index.html` landing refresh (Get started band + current copy + Run-locally section) + smoke.
5. `start.sh` / `start.command` / `start.bat` (+ `Dockerfile`); `start.sh` smoke.
6. README "Run it on your laptop" + link to `setup.html`.

## 11. Definition of done

- A host can go from `setup.html` to a working share link + QR without the README; the link
  opens the Hub's Family tab configured.
- The landing's "Get started" cards route correctly; copy is current; no scan/camera mentions.
- `start.command`/`.bat`/`.sh` serve the Hub locally on a fresh Mac/Windows/Linux machine that
  has Python or Node; `serve.js` covers the no-Python case.
- `setuptest.js` green; existing tests + sticker smoke stay green; everything static/offline-safe.
