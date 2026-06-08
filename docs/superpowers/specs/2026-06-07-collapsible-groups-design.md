# Collapsible Groups + Flags in My Book — Design

**Date:** 2026-06-07
**Project:** World Cup 2026 — Family Bracket & Hub
**Status:** Approved design (brainstorm Q&A), pre-implementation

## 1. Summary

In the 🎟️ Stickers **My Book** view, replace the plain "Group A" text dividers with **collapsible
group headers**. Each group header shows a collapse arrow, the label, the **4 team flags** of that
group (a "who's in this group" shortcut), and an **aggregate progress** for the active book. The
opener stickers get a collapsible **"⭐ Specials"** section. Tapping the header toggles the whole
group; **tapping a flag** expands the group and jumps to that team. Groups start **expanded**, and
collapse state is **remembered per book**.

## 2. Decisions (from brainstorm)
- **Unit:** whole group (4 teams) collapses together; Specials is its own section.
- **Flags:** the group's 4 team flags sit in the header; tapping one expands + scrolls to that team.
- **Default:** expanded; collapse state persisted **per book** in localStorage.
- **Header toggle:** tapping the arrow/label/aggregate toggles collapse.

## 3. Constraints
- Static, no-build; `*.jsx` Babel-in-browser; pure logic in dual-export modules.
- The Stickers smoke selects the first sticker via `document.querySelector('[title]')`. Group-header
  flags use `<Flag>` (an `<img alt>` with **no `title`**) and the arrow/label use `aria-label`/spans —
  so the first `[title]` stays the first `StickerSlot`. **No `title` may be added above the grid.**
- `window.WC` provides `WC.T[code].c` (flag iso) and `WC.F(code,size)` (flag URL via `<Flag>`).
- `WCSTKLOGIC.sectionProgress(map, page)` already gives `{have,total}` for one page.

## 4. Architecture

| Unit | File | Responsibility |
|---|---|---|
| Section grouping (pure) | `sticker-logic.js` | `groupSections(pages)` → ordered `[{key,label,isSpecials,pages}]` (Specials, then A–L); dual-export; tested |
| Group header | `hub-stickers.jsx` (`GroupHeader`) | arrow + label + 4 flags (jump buttons) + aggregate; whole row toggles collapse |
| My Book | `hub-stickers.jsx` (`MyBookView`) | render full sections with collapsible bodies; per-book collapse state in `localStorage["wc26groups"]`; search auto-expands; flag-jump via team anchors |
| Tests | `stickertest.js` | `groupSections` shape/order |

### 4.1 `groupSections(pages)` (pure)
```js
groupSections(pages) -> [{ key, label, isSpecials, pages:[...] }]
// key = p.group or 'specials'; label = 'Group '+group or 'Specials'; isSpecials = !p.group;
// preserves dataset order → Specials first, then A..L (13 sections for the real dataset)
```

### 4.2 Collapse state
- `collapsed` state shape: `{ [bookId]: { [groupKey]: true } }`, persisted whole to `localStorage["wc26groups"]`.
- `bookCollapsed = collapsed[activeBook] || {}`. A group is **expanded** when `searchActive || !bookCollapsed[key]`.
- `toggleGroup(key)` flips the key under `activeBook`; `expandGroup(key)` removes it (used by flag-jump).
- Per book: indexing by `activeBook` means switching books shows that book's own collapse state with no reload.

### 4.3 Render (replaces the flat page map in `MyBookView`)
1. `fullSections = useMemo(() => L.groupSections(WCSTK.pages), [])` — headers (flags + aggregate) come from the **full** dataset.
2. Existing `pages` (filtered by chips/search) → group into `filteredByKey[key] = [pages…]`.
3. If no page matches at all → "No stickers match." (unchanged).
4. For each `fullSections` entry **that has filtered pages**: render `<GroupHeader>` then, when expanded,
   its filtered `StickerPage`s — each wrapped in `<div id={"stk-team-"+p.team}>` (team pages) for flag-jump.
   A section with **no** matching filtered pages is omitted (so Need/search still narrows).
5. **Search override:** when the search box is non-empty, all matching sections render expanded (so results
   are never hidden behind a collapse). Chips (Need/Doubles) honor collapse.
6. **Aggregate:** per header, sum `L.sectionProgress(map, fullPage)` over the section's **full** pages.

### 4.4 `GroupHeader`
- Row (tappable → `onToggle`): arrow (`▾`/`▸`), label (`⭐ Specials` or `Group X`), the team flags, and
  `have/total` aggregate (green at 100%).
- **Flags:** for non-Specials, one `<Flag>` per team page (`iso = p.flag || WC.T[p.team].c`), wrapped in a
  `<button aria-label="Jump to <code>">` that `stopPropagation()`s and calls `onFlag(code)`. Specials shows no flags.
- **Flag-jump:** `onFlag(code)` → `expandGroup(key)` then (after a short delay for the re-render)
  `document.getElementById("stk-team-"+code)?.scrollIntoView({behavior:"smooth",block:"start"})`. If the team is
  filtered out (e.g. "Need" + complete team), it simply expands with nothing to scroll to.

## 5. Error handling & edge cases
- Unknown/missing flag iso → that flag is skipped (no broken image); header still toggles.
- Collapsed group under a filter still shows its header (so you can see/needs exist and expand it).
- `localStorage` failures swallowed (try/catch), as elsewhere.
- No `title` attribute anywhere above the sticker grid (smoke-selector safety).

## 6. Testing
- `stickertest.js`: `groupSections(DATA.pages)` → **13** sections; `[0].isSpecials===true` with **2** pages;
  `[1..12]` are `Group A`..`Group L` with **4** pages each, in order; a tiny synthetic-pages case for the grouping rule.
- Smoke (`stickersmoke.js`, when a browser is available): a group header renders with flags + aggregate; tapping it
  hides the group's grids and the header stays; tapping again restores; the first sticker stays tappable (`[title]`
  unbroken); **0 JS errors**. *(Host Chromium is currently down; if it can't run, validate via the pure-helper tests
  + a Babel transpile-check + code review, deploy, and confirm visually on the kiosk.)*

## 7. Build order
1. `sticker-logic.js` `groupSections` + `stickertest.js` (TDD).
2. `GroupHeader` + rewrite `MyBookView`'s render to collapsible sections (collapse state, search-override, flag-jump).
3. Smoke / transpile-check; deploy to kiosk.
4. README: note collapsible groups with team flags.

## 8. Definition of done
- My Book shows collapsible group headers (arrow + label + 4 flags + aggregate) and a Specials section.
- Groups start expanded; collapse is remembered per book; tapping a flag expands + jumps to that team;
  search auto-expands matches; the sticker grid + filters still work and the smoke's sticker tap is unbroken.
- `groupSections` tests green; existing tests stay green.
