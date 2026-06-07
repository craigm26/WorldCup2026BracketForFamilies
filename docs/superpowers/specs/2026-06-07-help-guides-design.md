# In-App Help Guides — Design

**Date:** 2026-06-07
**Project:** World Cup 2026 — Family Bracket & Hub
**Status:** Approved design, pre-implementation

## 1. Summary

Add a **❓ Help tab** to the Hub plus small **contextual "?" links** on the trickiest
features, so family members (kids, parents, and far-away relatives) can learn every feature
in **kid-friendly, complete** language. Content lives in a static, testable data file; the UI
just renders it. Fully static/offline, consistent with the rest of the Hub.

## 2. Goals & non-goals

### Goals
- A browsable **❓ Help tab**: searchable, collapsible how-to cards grouped by area, covering
  every Hub feature in plain language a child can follow, with numbered steps for fiddly flows.
- **Contextual "?"** on the hardest spots (Stickers, Bracket, the Family Sync segment) that
  deep-links into the Help tab, opening the right card.
- `?help=<id>` URL support (matches the existing `?tab=` convention) so a printed QR can point
  at a specific card.
- Stay **static/offline**; no new dependencies; `make-offline.sh` unchanged (in-place build).

### Non-goals (YAGNI / deferred)
- First-run interactive tour/overlay.
- A printable one-pager (the existing print materials + README cover that).
- In-app operator setup walkthrough for Family Sync (stays in the README; the Family help
  card points to it).

## 3. Constraints (from the existing project)

- Plain static HTML/JS; `*.js` files set `window.*` globals, `*.jsx` transpiled in-browser via
  `@babel/standalone`. The Hub is a tabbed app (`TABS` array + render switch in `hub.jsx`); it
  already honors `?tab=` and number/arrow-key tab switching, and has a `useIsPhone()` helper.
- Served from GitHub Pages + the offline-vendored pi-nas kiosk. New files must be relative-path
  (no CDN) so the offline build picks them up with no `make-offline.sh` change.

## 4. Architecture

```
help-data.js  (window.WCHELP: ordered help cards)  ──▶  hub-help.jsx (HelpTab renders cards)
hub.jsx: ❓ Help tab + helpTarget state + goHelp(id) + ?help= ──▶ HelpTab (opens/scrolls to card)
HelpLink "?" on Stickers / Bracket / Family ──goHelp(id)──▶ switch to Help + expand that card
```

### Units

| Unit | File | Responsibility | Depends on |
|---|---|---|---|
| Help content | `worldcup/help-data.js` | `window.WCHELP` — ordered array of grouped cards; dual export for tests | none |
| Help tab UI | `worldcup/hub-help.jsx` | `HelpTab` (search + grouped collapsible cards) + `HelpLink` ("?" deep-link button) | `WCHELP` |
| Wiring | `worldcup/hub.jsx` | `❓ Help` in `TABS`; render case; `helpTarget` state + `goHelp`; `?help=` param | `HelpTab` |
| Contextual links | `worldcup/hub-stickers.jsx`, `worldcup/hub.jsx` (Bracket header) | place `HelpLink` on Stickers / Bracket / Family | `goHelp` |
| Load | `worldcup/index.html` | load `help-data.js` + `hub-help.jsx` | — |
| Tests | `helptest.js` (repo root, Node) | content integrity + no-dead-deep-link check | `WCHELP` |

## 5. Content model — `window.WCHELP`

```js
window.WCHELP = [
  { group: "Stickers", id: "stk-scan", icon: "📷",
    title: "Scan stickers with the camera",
    summary: "Point your phone at a sticker to add it fast — typing the code always works too.",
    steps: [
      "Open 🎟️ Stickers → 📖 My Book",
      "Tap 📷 Scan a swap",
      "Hold the sticker in view, or type its code (like MEX5)",
      "Tap Add +1",
    ] },
  // …one entry per card below
];
```

Each card: `group` (section header), `id` (unique, kebab-case), `icon`, `title`, `summary`
(one kid-friendly sentence), optional `steps[]` (numbered). Dual export
(`window.WCHELP` + `module.exports`) like `sticker-data.js`.

### 5.1 Cards (coverage)

Grouped, in display order:

- **Getting started** — `start-what` (what this is), `start-tabs` (move between tabs: tap, or ← → / number keys).
- **Bracket & predictions** — `pickem` (add a player per person; everyone keeps their own bracket; the leaderboard), `bracket` (tap a slot to pick; crown a champion; what "feeders" mean), `scores` (Manual / Semi-auto / Auto, no-spoiler).
- **Stickers** — `stk-mark` (tap to cycle Have → Need → doubles; ⓘ for player info; filters & search; groups A–L), `stk-scan` (camera: scan a swap / scan a page / auto; manual always works), `stk-trade` (Trade Matcher: your doubles ↔ their needs; "perfect swaps").
- **Trading with family far away** — `family-relative` (paste the setup link → Publish → propose/accept trades), `family-host` (first-time setup lives in the project README — short pointer).
- **Watching** — `schedule` (your time zone, day/night icon), `watch` (where & how, incl. free).
- **Explore & games** — `facts` (host-city map + follow your team), `play` (the quiz).
- **Extras & settings** — `extras` (screensaver, add-to-calendar `.ics`, share bracket by QR), `settings` (score modes, time zone, Family Sync status).

(~16 cards.) Numbered `steps[]` are included for: `start-tabs`, `pickem`, `bracket`,
`stk-mark`, `stk-scan`, `stk-trade`, `family-relative`, `extras`.

## 6. Help tab UI (`hub-help.jsx`)

- `HelpTab({ target, clearTarget })`: a sticky search box (filters cards by title/summary/steps),
  then cards rendered grouped by `group` (a group header when it changes). Each card is
  **collapsible**: title + icon + summary always visible; tapping expands the `steps`.
  The card whose `id === target` starts expanded and is scrolled into view on mount / when
  `target` changes (via a `ref` + `scrollIntoView`), then `clearTarget()` is called.
- `HelpLink({ goHelp, id, label })`: a small inline "❓" button (muted, theme-consistent) that
  calls `goHelp(id)`. Used on complex tabs.

## 7. Deep-linking (`hub.jsx`)

- Add `{ id: "help", label: "❓ Help" }` to `TABS` (before `settings`) and a render case
  `{tab === "help" && <HelpTab target={helpTarget} clearTarget={() => setHelpTarget(null)} />}`.
- `const [helpTarget, setHelpTarget] = useState(null)`; `const goHelp = (id) => { setHelpTarget(id); setTab("help"); }`.
- On load, honor `?help=<id>`: if present, set the initial tab to `help` and `helpTarget` to that id.
- Pass `goHelp` to the tabs that host a `HelpLink` (Stickers tab → its header + Family segment;
  Bracket tab → its header).

## 8. Error handling & edge cases

- Unknown `?help=<id>` or `target` not found → Help tab just opens normally (no expand, no throw).
- Search with no matches → a friendly "No help matches — try another word." line.
- Everything is static render over `WCHELP`; nothing networked; nothing can fail at runtime.

## 9. Testing

- `helptest.js` (Node, like `stickertest.js`):
  - `WCHELP` integrity: every card has non-empty `group`, `id`, `icon`, `title`, `summary`;
    `id`s are unique; `steps` (when present) is a non-empty array of strings.
  - **Coverage checklist:** a hard-coded list of required ids (the ~16 above) all present —
    guards against silently dropping a feature's help.
  - **No dead deep-links:** `hub-help.jsx` exports (or `help-data.js` declares) the set of
    `HelpLink` target ids actually used in the UI; assert each exists in `WCHELP`.
- UI smoke (extend `stickersmoke.js` or a new `helpsmoke.js`): the ❓ Help tab renders cards;
  a contextual "?" on the Stickers tab navigates to Help and expands the right card; 0 JS errors.

## 10. Build order (for the implementation plan)

1. `help-data.js` (`window.WCHELP`) with all cards + `helptest.js` integrity + coverage tests (TDD).
2. `hub-help.jsx` `HelpTab` (search + grouped collapsible cards) + load in `index.html`; wire the
   `❓ Help` tab into `hub.jsx` (TABS + render); smoke it renders.
3. `helpTarget`/`goHelp` + `?help=` deep-linking; `HelpLink` component; assert no dead links.
4. Place `HelpLink` "?" on Stickers (header + Family segment) and Bracket; smoke a deep-link.
5. README: one line noting the in-app ❓ Help tab.

## 11. Definition of done

- ❓ Help tab covers every Hub feature in kid-friendly cards; search works; cards expand.
- Contextual "?" on Stickers/Bracket/Family deep-links to the right card; `?help=<id>` works.
- `helptest.js` (integrity + coverage + no-dead-links) green; existing tests + smoke stay green;
  fully offline (no new CDN); deployed kiosk unaffected when not on the Help tab.
