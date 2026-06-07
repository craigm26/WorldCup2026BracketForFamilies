# 3D Globe for the Map & Facts Tab — Design

**Date:** 2026-06-07
**Project:** World Cup 2026 — Family Bracket & Hub
**Status:** Approved design, pre-implementation

## 1. Summary

Add a **spinnable three.js WebGL globe** to the 🌍 Map & Facts tab so families can explore
**all 48 participating nations across the whole planet** (not just the three host countries).
A stylized ocean sphere shows every country's borders from the world map the Hub **already
vendors**; the **48 participants are highlighted in team colors** with a tappable pin; tapping a
nation drives the existing **rotating facts + ★ Follow** panel. The current **host-city stadium
map stays** behind a small toggle. On devices without WebGL it **falls back** to the existing
all-48 flag grid. No earth-photo texture (keeps the offline bundle lean).

## 2. Goals & non-goals

### Goals
- A drag-to-spin (and gently auto-rotating) globe highlighting all 48 nations in team colors.
- Tapping a nation on the globe selects it → the existing facts panel + Follow update.
- Reuse the already-vendored world topojson and already-loaded `d3` — add only **three.js**.
- Work **offline** on the kiosk and degrade gracefully where WebGL is unavailable.
- Keep the existing host-city stadium map reachable (a toggle), and the flag grid + facts intact.

### Non-goals (YAGNI)
- Photo-realistic earth texture / atmosphere / clouds.
- Stadium pins on the globe (the Host-cities toggle keeps those).
- The `three-globe` helper library (hand-build on three.js core → one new dependency).
- Separating England/Scotland as map shapes (the world map merges the UK — see §6).

## 3. Constraints (from the existing project)

- Static, no-build; libs are plain `<script>` globals (`window.d3`, `window.topojson`). three.js
  must be a **pre-r160 UMD/global build** exposing `window.THREE` (no ESM/import-map).
- `*.jsx` transpiled in-browser via Babel. The Map & Facts tab is `FactsTab` in `hub.jsx`;
  the host-city map is `poster-map.jsx` (`d3.geoMercator` over `window.NA_TOPO_URL`).
- The whole-world topojson is already vendored: `vendor/countries-50m.json`, exposed as
  `window.NA_TOPO_URL` (offline) / a CDN fallback. `make-offline.sh` vendors libs for the kiosk.
- Runs on phones, smart-TV browsers, and the Pi — WebGL and GPU are NOT guaranteed.

## 4. Architecture

| Unit | File | Responsibility | Depends on |
|---|---|---|---|
| Globe geometry/data (pure) | `globe-data.js` | `lonLatToVec3`, the `TEAM_GEO` map (48 codes → pin lon/lat + optional ISO id), `hasWebGL()`; dual export | none |
| 3D globe component | `hub-globe.jsx` | `Globe3D` — mounts the three.js scene (sphere + borders + 48 highlights + pins), drag/auto-rotate, raycast-click → `onSelect`, dispose on unmount; renders the **fallback** when WebGL/topojson unavailable | `window.THREE`, `window.d3`, `window.topojson`, `TEAM_GEO` |
| Map & Facts tab | `hub.jsx` (`FactsTab`) | a 🌐 Globe / 🗺️ Host cities toggle; Globe drives `sel`; keep flag grid + facts + Follow | `Globe3D`, existing `PosterMap` |
| Load + vendor | `index.html`, `make-offline.sh` | load three.js global build; vendor it for offline | three.js |
| Tests | `globetest.js` (Node) | `lonLatToVec3` math, `TEAM_GEO` completeness/validity, `hasWebGL` shape | `globe-data.js` |

### Data flow
1. `Globe3D` mounts → `hasWebGL()`? no → render fallback (flag grid). yes ↓
2. fetch `window.NA_TOPO_URL` topojson → `topojson.mesh(...)` = all-country borders (grey lines on the sphere).
3. For each of the 48 teams in `TEAM_GEO`: if its feature exists, draw its border in the team color; always place a small **team-color pin** (a tiny sphere) at its `pin` lon/lat with `userData.team`.
4. Pointer drag rotates the globe group; idle → slow auto-rotate; `requestAnimationFrame` paused when the tab/screen isn't visible.
5. Click → `THREE.Raycaster` against the pin spheres → `onSelect(team)` → `FactsTab` sets `sel`.
6. Unmount → dispose geometries/materials/renderer, cancel rAF, remove listeners.

## 5. `globe-data.js` (pure, testable)

```js
lonLatToVec3(lon, lat, r) -> { x, y, z }   // standard sphere mapping (lat/lon in degrees)
hasWebGL() -> boolean                       // try to get a webgl/experimental-webgl context
TEAM_GEO = { MEX: { pin: [-102, 23], iso: "484" }, ENG: { pin: [-1.5, 52.5], iso: "826" },
             SCO: { pin: [-4, 56.8], iso: "826" }, CPV: { pin: [-24, 16], iso: "132" }, … }  // all 48
```
- `pin` is a hardcoded `[lon, lat]` centroid for **all 48** (reliable even for tiny nations the
  50m map may omit). `iso` is the world-atlas numeric country id used to color that country's
  border when the feature is present (`null`/absent → pin-only highlight).
- Dual export (`window.WCGLOBE` + `module.exports`).

## 6. `hub-globe.jsx` — `Globe3D`

`Globe3D({ sel, onSelect })`:
- **WebGL/topojson guard:** if `!WCGLOBE.hasWebGL()` or `window.THREE`/`window.topojson` missing,
  render the **fallback**: the existing all-48 flag grid (lifted into a shared `FlagPicker` so it's
  reused, not duplicated) + a one-line "Your device can't show the 3D globe — tap a flag instead."
- **Scene:** a low-poly sphere (ocean blue, subtle), a group holding: grey border `LineSegments`
  (all countries), per-team colored border `Line`s (the 48 where a feature exists), and per-team
  pin meshes (small spheres at `pin`, `userData.team = code`, scaled up slightly when `sel===code`).
- **Rotation:** hand-rolled pointer drag (pointerdown/move/up → rotate the group's y/x), with a
  slow auto-rotate when idle. No OrbitControls addon (one fewer vendored file).
- **Picking:** `Raycaster` from the camera through the pointer → nearest pin → `onSelect(team)`.
- **England/Scotland:** both color the shared UK border; each gets its **own pin** at its hardcoded
  `pin`, so they're individually selectable without a chooser.
- **Lifecycle:** capped `devicePixelRatio` (≤2), `ResizeObserver` for the container, dispose all
  three.js resources + cancel rAF + remove listeners on unmount; pause rAF on
  `document.visibilitychange` hidden.

## 7. `FactsTab` integration (`hub.jsx`)

- Add a small segmented toggle at the top of the map area: **🌐 Globe** (default) / **🗺️ Host cities**.
- Globe view renders `<Globe3D sel={sel} onSelect={setSel} />`; Host-cities renders the existing
  `PosterMap` (unchanged). The **flag grid, facts rotation, and ★ Follow stay below**, driven by `sel`.
- Lift the existing flag-button grid into a `FlagPicker({ sel, onSelect })` so both the fallback and
  the normal tab use one implementation (DRY; removes a chunk from `FactsTab`).

## 8. Load + offline (`index.html`, `make-offline.sh`)

- `index.html`: add `<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/0.158.0/three.min.js"></script>`
  (a pre-r160 global build → `window.THREE`) after the existing `d3`/`topojson` tags, and
  `<script type="text/babel" src="hub-globe.jsx"></script>` + `<script src="globe-data.js"></script>`
  in the hub script block.
- `make-offline.sh`: `dl` three.min.js into `vendor/three.min.js` and add it to the CDN→vendor
  rewrite map (same pattern as d3/topojson). The globe reuses the already-vendored
  `countries-50m.json`. No new image assets.

## 9. Error handling & performance

- No WebGL / context-lost / topojson fetch fails / `THREE` missing → fallback flag grid, never a blank tab or throw.
- `webglcontextlost` listener → show the fallback.
- Low-poly sphere, cheap line geometry, capped pixel ratio, rAF paused when hidden, resources
  disposed on unmount → smooth on phones/TVs, gentle on the Pi.

## 10. Testing

- `globetest.js` (Node `node:test`):
  - `lonLatToVec3`: known points (lon/lat 0,0 → +X axis; lat 90 → +Y pole; magnitude == r).
  - `TEAM_GEO`: **all 48 team codes present**, each `pin` a `[lon,lat]` in range
    (−180..180, −90..90), `iso` is string-or-null; ENG and SCO both present with distinct pins.
  - `hasWebGL`: returns a boolean and doesn't throw under Node (no `document`).
- Smoke (Puppeteer): Map & Facts tab renders; with WebGL available a `<canvas>` mounts and a
  team pin click updates the selected country/facts; with WebGL forced off, the **fallback flag
  grid** shows; **0 JS errors**; switching away from the tab doesn't error (dispose path).

## 11. Build order (for the implementation plan)

1. `globe-data.js` (`lonLatToVec3`, `hasWebGL`, `TEAM_GEO` for all 48) + `globetest.js` (TDD).
2. Lift the flag grid into `FlagPicker` in `hub.jsx` (no behavior change) + smoke.
3. `hub-globe.jsx` `Globe3D`: WebGL guard + fallback first, then the three.js scene (sphere +
   borders + highlights + pins), drag/auto-rotate, raycast select, dispose-on-unmount.
4. Wire the 🌐/🗺️ toggle into `FactsTab`; load `three.min.js` + `globe-data.js` + `hub-globe.jsx`
   in `index.html`; smoke (canvas mounts / fallback path / select works / no errors).
5. `make-offline.sh`: vendor `three.min.js` + add to the rewrite map.
6. README: note the explorable 3D globe.

## 12. Definition of done

- The Map & Facts tab shows a spinnable globe highlighting all 48 nations; tapping one updates the
  facts; the Host-cities map is still reachable; the flag grid + facts + Follow still work.
- WebGL-absent devices fall back to the flag grid with no errors; tab-switching disposes cleanly.
- `globetest.js` green; existing tests + smokes stay green; offline build vendors three.js and the
  globe works with no internet on the kiosk (where WebGL exists).
