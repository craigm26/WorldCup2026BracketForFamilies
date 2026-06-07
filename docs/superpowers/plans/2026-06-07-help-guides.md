# In-App Help Guides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a ❓ Help tab with kid-friendly, searchable how-to cards for every Hub feature, plus contextual "?" deep-links on the trickiest tabs.

**Architecture:** A static, dual-export content file (`help-data.js` → `window.WCHELP` cards + `window.WCHELP_LINKS` deep-link ids) drives a dumb `HelpTab` UI (`hub-help.jsx`). `hub.jsx` adds the tab, a `helpTarget` state + `goHelp(id)`, and `?help=<id>` URL support; a small `HelpLink` "?" on Stickers/Bracket/Family calls `goHelp`. Fully static/offline; `make-offline.sh` unchanged.

**Tech Stack:** Static HTML/JS, React 18 via in-browser Babel. Tests: Node `node:test` + Puppeteer smoke.

**Spec:** `docs/superpowers/specs/2026-06-07-help-guides-design.md`

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `worldcup/help-data.js` | Create | `window.WCHELP` (ordered help cards) + `window.WCHELP_LINKS` (deep-link target ids); dual export. |
| `worldcup/hub-help.jsx` | Create | `HelpTab` (search + grouped collapsible cards), `HelpCard`, `HelpLink` ("?" button). |
| `worldcup/hub.jsx` | Modify | `❓ Help` in `TABS`; `helpTarget` state + `goHelp`; `?help=` init; render case; pass `goHelp` to Stickers/Bracket. |
| `worldcup/hub-stickers.jsx` | Modify | Accept `goHelp`; place `HelpLink` in the segment row + the Family setup card. |
| `worldcup/hub-bracket.jsx` | Modify | Accept `goHelp`; place a `HelpLink` near the Bracket heading. |
| `worldcup/index.html` | Modify | Load `help-data.js` (plain) + `hub-help.jsx` (babel, before `hub.jsx`). |
| `helptest.js` | Create | Node tests: content integrity + coverage checklist + links ⊆ card ids. |
| `README.md` | Modify | One line noting the in-app ❓ Help tab. |

**Test commands:** `node --test helptest.js` (+ existing `node --test stickertest.js stickersync.test.js`); UI smoke `node stickersmoke.js` after serving `worldcup/` on `:8088`.

---

## Task 1: Help content + integrity tests

**Files:**
- Create: `worldcup/help-data.js`
- Create: `helptest.js`

- [ ] **Step 1: Write the failing tests**

Create `helptest.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const H = require('./worldcup/help-data.js');

test('help-data exports cards + links', () => {
  assert.ok(Array.isArray(H.cards) && H.cards.length >= 15);
  assert.ok(Array.isArray(H.links) && H.links.length >= 1);
});

test('every card has group, id, icon, title, summary; ids unique', () => {
  const seen = new Set();
  H.cards.forEach((c) => {
    ['group', 'id', 'icon', 'title', 'summary'].forEach((k) =>
      assert.ok(c[k] && typeof c[k] === 'string', `card ${c.id} missing ${k}`));
    if ('steps' in c) {
      assert.ok(Array.isArray(c.steps) && c.steps.length > 0, `card ${c.id} has empty steps`);
      c.steps.forEach((s) => assert.equal(typeof s, 'string'));
    }
    assert.ok(!seen.has(c.id), `duplicate id ${c.id}`);
    seen.add(c.id);
  });
});

test('coverage: every required feature has a help card', () => {
  const ids = new Set(H.cards.map((c) => c.id));
  ['start-what','start-tabs','pickem','bracket','scores','stk-mark','stk-scan','stk-trade',
   'family-relative','family-host','schedule','watch','facts','play','extras','settings']
    .forEach((id) => assert.ok(ids.has(id), `missing help card: ${id}`));
});

test('no dead deep-links: every link id is a real card', () => {
  const ids = new Set(H.cards.map((c) => c.id));
  H.links.forEach((id) => assert.ok(ids.has(id), `deep-link target ${id} has no card`));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test helptest.js`
Expected: FAIL — `Cannot find module './worldcup/help-data.js'`.

- [ ] **Step 3: Write the content file**

Create `worldcup/help-data.js`:

```js
/* In-app Help content for the World Cup 2026 Hub. Kid-friendly how-to cards.
   Dual export: window.WCHELP (cards) + window.WCHELP_LINKS (deep-link ids) + module.exports. */
(function (root, factory) {
  const d = factory();
  if (typeof window !== 'undefined') { window.WCHELP = d.cards; window.WCHELP_LINKS = d.links; }
  if (typeof module !== 'undefined' && module.exports) module.exports = d;
})(this, function () {
  const cards = [
    { group: 'Getting started', id: 'start-what', icon: '🏆',
      title: 'What is this?',
      summary: 'Your family’s World Cup hub — pick winners, track stickers, and play games together.' },
    { group: 'Getting started', id: 'start-tabs', icon: '🧭',
      title: 'Moving around',
      summary: 'The buttons across the top are tabs — tap one to switch.',
      steps: ['Tap a tab at the top (like 🗂️ Bracket or 🎟️ Stickers)',
              'On a keyboard you can also press ← and →, or the number keys',
              'Everything you do saves on this device automatically'] },

    { group: 'Bracket & predictions', id: 'pickem', icon: '👪',
      title: 'Add each family member',
      summary: 'Everyone gets their own bracket and a spot on the leaderboard.',
      steps: ['Go to 🏠 Home', 'Tap “+ Add player” and type a name (Mom, Dad, each kid)',
              'Tap a name to switch to that person',
              'The leaderboard shows who predicted the most teams right'] },
    { group: 'Bracket & predictions', id: 'bracket', icon: '🗂️',
      title: 'Fill in the bracket',
      summary: 'Pick who you think wins each game, all the way to the champion.',
      steps: ['Go to 🗂️ Bracket', 'Tap an empty slot and choose a team',
              'Keep picking winners up the rounds',
              'Empty slots show hints like “Winner Group A” — those are called feeders'] },
    { group: 'Bracket & predictions', id: 'scores', icon: '📊',
      title: 'How scores update',
      summary: 'Choose whether scores fill in by hand or on their own — no surprise spoilers.' },

    { group: 'Stickers', id: 'stk-mark', icon: '🎟️',
      title: 'Mark your stickers',
      summary: 'Tap a sticker to say you Have it, need it, or have spares to trade.',
      steps: ['Go to 🎟️ Stickers → 📖 My Book',
              'Tap a sticker once for Have, again for a spare (×2), and so on',
              'Tap the ×number to take one away',
              'Use the All / Need / Doubles buttons or the search box to find stickers',
              'Tap ⓘ on a sticker to see the player’s position, club and a fun fact'] },
    { group: 'Stickers', id: 'stk-scan', icon: '📷',
      title: 'Scan stickers with the camera',
      summary: 'Point your phone at a sticker to add it fast — typing the code always works too.',
      steps: ['Open 🎟️ Stickers → 📖 My Book', 'Tap 📷 Scan a swap',
              'Hold the sticker in view, or type its code (like MEX5)', 'Tap Add +1',
              'To do a whole page, tap “📷 Scan this page” on a team and check the guesses'] },
    { group: 'Stickers', id: 'stk-trade', icon: '🔄',
      title: 'Find trades (Trade Matcher)',
      summary: 'See exactly which of your spares match what someone else needs.',
      steps: ['Go to 🎟️ Stickers → 🔄 Trade Matcher', 'Pick another player',
              '“You give” = your spares they need; “you get” = their spares you need',
              'The 🤝 number is how many perfect swaps you can make'] },

    { group: 'Trading with family far away', id: 'family-relative', icon: '👨‍👩‍👧',
      title: 'Trade with family far away',
      summary: 'Join your family’s sticker swap from anywhere — just open the link they send you.',
      steps: ['Open the setup link a family member sent (it has “?sync=…&code=…”)',
              'Go to 🎟️ Stickers → 👨‍👩‍👧 Family and tap “Publish my collection”',
              'Tap a relative to see their spares',
              'Use “Propose a trade”, then they tap Accept'] },
    { group: 'Trading with family far away', id: 'family-host', icon: '🛠️',
      title: 'Setting up Family Sync (grown-ups)',
      summary: 'The one-time setup that powers far-away trading is in the project’s README (look for “Family Sync”).' },

    { group: 'Watching', id: 'schedule', icon: '📅',
      title: 'Game schedule in your time',
      summary: 'Every match shows in your time zone, with a 🌞/🌙 for day or night.' },
    { group: 'Watching', id: 'watch', icon: '📺',
      title: 'Where to watch',
      summary: 'Find how to watch in your country — including the free options.' },

    { group: 'Explore & games', id: 'facts', icon: '🌍',
      title: 'Map & fun facts',
      summary: 'Explore the host cities and tap ☆ Follow to cheer for your team.' },
    { group: 'Explore & games', id: 'play', icon: '🎮',
      title: 'Play the quiz',
      summary: 'Guess flags, countries and foods — beat your best streak!' },

    { group: 'Extras & settings', id: 'extras', icon: '✨',
      title: 'Handy extras',
      summary: 'A screensaver, calendar reminders, and a way to share your bracket.',
      steps: ['Leave it idle and a fun screensaver appears — touch to wake it',
              'Use add-to-calendar to save game times to your phone',
              'Tap share to make a QR of your bracket for someone to scan'] },
    { group: 'Extras & settings', id: 'settings', icon: '⚙️',
      title: 'Settings',
      summary: 'Change how scores update, pick your time zone, and see Family Sync status.' },
  ];

  // ids used as contextual "?" deep-link targets in the UI (must all exist in cards)
  const links = ['bracket', 'stk-mark', 'family-relative'];

  return { cards: cards, links: links };
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test helptest.js`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add worldcup/help-data.js helptest.js
git commit -m "feat(help): kid-friendly help content + integrity/coverage tests"
```

---

## Task 2: Help tab UI + wiring + deep-link plumbing

**Files:**
- Create: `worldcup/hub-help.jsx`
- Modify: `worldcup/index.html`
- Modify: `worldcup/hub.jsx`

- [ ] **Step 1: Create the Help tab component**

Create `worldcup/hub-help.jsx`:

```jsx
/* ❓ Help tab — kid-friendly how-to cards (renders window.WCHELP). */
function HelpCard({ card, open, onToggle, innerRef }) {
  return (
    <div ref={innerRef} style={{ background: "rgba(255,255,255,.06)", borderRadius: 14, marginBottom: 10, overflow: "hidden" }}>
      <button onClick={onToggle} style={{ width: "100%", textAlign: "left", border: "none", cursor: "pointer", background: "transparent", color: "#fff", padding: "12px 14px", display: "flex", gap: 10, alignItems: "center" }}>
        <span style={{ fontSize: 22 }}>{card.icon}</span>
        <span style={{ flex: 1 }}>
          <span style={{ fontSize: 16, fontWeight: 700, display: "block" }}>{card.title}</span>
          <span style={{ fontSize: 13.5, color: "#9fb0e0" }}>{card.summary}</span>
        </span>
        <span style={{ color: "#9fb0e0", fontSize: 13 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && card.steps && card.steps.length > 0 && (
        <ol style={{ margin: 0, padding: "0 18px 14px 36px", color: "#dfe6ff", fontSize: 14.5, lineHeight: 1.5 }}>
          {card.steps.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
        </ol>
      )}
    </div>
  );
}

function HelpTab({ target, clearTarget }) {
  const CARDS = window.WCHELP || [];
  const [q, setQ] = React.useState("");
  const [openId, setOpenId] = React.useState(target || null);
  const refs = React.useRef({});
  React.useEffect(() => {
    if (target) {
      setOpenId(target);
      const el = refs.current[target];
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "center" });
      if (clearTarget) clearTarget();
    }
  }, [target]);

  const ql = q.trim().toLowerCase();
  const match = (c) => !ql || (c.title + " " + c.summary + " " + (c.steps || []).join(" ")).toLowerCase().includes(ql);
  const cards = CARDS.filter(match);
  let lastGroup = null;

  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 2, background: "rgba(21,50,127,.92)", padding: "10px 0", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>❓ How to use the Hub</div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search help…"
          style={{ fontFamily: "inherit", fontSize: 14, borderRadius: 10, border: "none", padding: "7px 12px", background: "rgba(255,255,255,.12)", color: "#fff", flex: "1 1 160px", marginLeft: "auto" }} />
      </div>
      {cards.length ? cards.map((c) => {
        const head = c.group !== lastGroup ? c.group : null; lastGroup = c.group;
        return (
          <React.Fragment key={c.id}>
            {head && <div style={{ fontSize: 18, fontWeight: 800, color: "#9fc0ff", margin: "10px 2px 8px" }}>{head}</div>}
            <HelpCard card={c} open={openId === c.id} onToggle={() => setOpenId(openId === c.id ? null : c.id)} innerRef={(el) => { refs.current[c.id] = el; }} />
          </React.Fragment>
        );
      }) : <div style={{ color: "#9fb0e0", padding: 24, textAlign: "center" }}>No help matches — try another word.</div>}
    </div>
  );
}

function HelpLink({ goHelp, id, label }) {
  return (
    <button onClick={() => goHelp(id)} title="How does this work?"
      style={{ border: "none", cursor: "pointer", background: "rgba(255,255,255,.12)", color: "#dfe6ff", borderRadius: 20, padding: "4px 10px", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>❓ {label || "Help"}</button>
  );
}
```

- [ ] **Step 2: Load the new scripts**

In `worldcup/index.html`, find `<script src="sticker-sync.js"></script>` and add after it:

```html
<script src="help-data.js"></script>
```

Then find `<script type="text/babel" src="hub-stickers.jsx"></script>` and add after it:

```html
<script type="text/babel" src="hub-help.jsx"></script>
```

- [ ] **Step 3: Add the Help tab + deep-link state to `hub.jsx`**

In `worldcup/hub.jsx`, add to the `TABS` array, immediately before the `settings` entry:

```js
  { id: "help",      label: "❓ Help" },
```

Find the tab-state init (around `const tabParam = params.get("tab");` / `const [tab, setTab] = React.useState(...)`). Add `help` handling right there:

```js
  const helpParam = params.get("help");
  const [helpTarget, setHelpTarget] = React.useState(helpParam || null);
```

and change the `tab` initializer so a `?help=` link opens the Help tab:

```js
  const [tab, setTab] = React.useState(helpParam ? "help" : (TABS.some((t) => t.id === tabParam) ? tabParam : "home"));
```

Then add a `goHelp` helper near the other handlers (e.g., just after `setTab` is defined / near `goHelp`-less handlers):

```js
  const goHelp = (id) => { setHelpTarget(id); setTab("help"); };
```

- [ ] **Step 4: Add the render case**

In `worldcup/hub.jsx`'s render switch, add after the `stickers` line:

```jsx
        {tab === "help" && <HelpTab target={helpTarget} clearTarget={() => setHelpTarget(null)} />}
```

- [ ] **Step 5: Verify the Help tab renders (smoke)**

Run:
```bash
( cd worldcup && python3 -m http.server 8088 >/tmp/stk_serve.log 2>&1 & echo $! > /tmp/stk_serve.pid ); sleep 1
node -e "const p=require('puppeteer-core');(async()=>{const b=await p.launch({executablePath:'/usr/bin/chromium',headless:'new',args:['--no-sandbox','--disable-gpu']});const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));await pg.goto('http://localhost:8088/?tab=help',{waitUntil:'networkidle2',timeout:35000});await new Promise(r=>setTimeout(r,3000));const ok=await pg.evaluate(()=>document.body.innerText.includes('How to use the Hub'));console.log('help renders:',ok,'| errors:',errs.length);await b.close();})();"
kill "$(cat /tmp/stk_serve.pid)" 2>/dev/null || true
```
Expected: `help renders: true | errors: 0`.

- [ ] **Step 6: Commit**

```bash
git add worldcup/hub-help.jsx worldcup/index.html worldcup/hub.jsx
git commit -m "feat(help): ❓ Help tab + ?help= deep-link plumbing"
```

---

## Task 3: Contextual "?" links on Stickers, Bracket, Family

**Files:**
- Modify: `worldcup/hub.jsx` (pass `goHelp` to Stickers + Bracket)
- Modify: `worldcup/hub-stickers.jsx`
- Modify: `worldcup/hub-bracket.jsx`

- [ ] **Step 1: Pass `goHelp` into the two tabs**

In `worldcup/hub.jsx`, update the Stickers and Bracket render lines to pass `goHelp`:

```jsx
        {tab === "bracket" && <BracketTab store={bracketStore} setPick={setPick} results={results} goHelp={goHelp} />}
```
```jsx
        {tab === "stickers" && <StickersTab collections={collections} setSticker={setSticker} players={players} addPlayer={addPlayer} sync={sync} setSync={setSync} goHelp={goHelp} />}
```
(Keep whatever other props each line already passes — only add `goHelp={goHelp}`. The Bracket line above shows the typical props; match the actual existing prop list and append `goHelp`.)

- [ ] **Step 2: Add a `HelpLink` to the Stickers segment row + Family setup**

In `worldcup/hub-stickers.jsx`, change `StickersTab`'s signature to accept `goHelp`:

```jsx
function StickersTab({ collections, setSticker, players, addPlayer, sync, setSync, goHelp }) {
```

In `StickersTab`'s segment-button row (the `<div>` containing `seg("book"...)`...`seg("family"...)`), add a HelpLink at the end of that row:

```jsx
        {goHelp && <span style={{ marginLeft: "auto" }}><HelpLink goHelp={goHelp} id="stk-mark" label="How stickers work" /></span>}
```

In `FamilyView`, in the **not-configured setup card** (the `if (!sync)` branch), add a HelpLink under the Connect row so newcomers get the steps:

```jsx
        {goHelp && <div style={{ marginTop: 10 }}><HelpLink goHelp={goHelp} id="family-relative" label="How family trading works" /></div>}
```

To make `goHelp` reach `FamilyView`, pass it through: in `StickersTab`'s render of the family view add `goHelp={goHelp}`, and add `goHelp` to `FamilyView`'s signature:

```jsx
      {view === "family" && <FamilyView map={map} players={players} activeId={activeId} sync={sync} setSync={setSync} goHelp={goHelp} />}
```
```jsx
function FamilyView({ map, players, activeId, sync, setSync, goHelp }) {
```

- [ ] **Step 3: Add a `HelpLink` to the Bracket header**

In `worldcup/hub-bracket.jsx`, add `goHelp` to the `BracketTab` signature, and place a HelpLink near the top heading/toolbar of the tab:

```jsx
        {goHelp && <HelpLink goHelp={goHelp} id="bracket" label="How the bracket works" />}
```
(Find `BracketTab`'s top header/controls row and add the line there; if the function is `function BracketTab({ store, setPick, results }) {`, change it to `function BracketTab({ store, setPick, results, goHelp }) {`.)

- [ ] **Step 4: Smoke — a contextual "?" deep-links to the right card**

Run:
```bash
( cd worldcup && python3 -m http.server 8088 >/tmp/stk_serve.log 2>&1 & echo $! > /tmp/stk_serve.pid ); sleep 1
node -e "const p=require('puppeteer-core');(async()=>{const b=await p.launch({executablePath:'/usr/bin/chromium',headless:'new',args:['--no-sandbox','--disable-gpu']});const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));await pg.goto('http://localhost:8088/?tab=stickers',{waitUntil:'networkidle2',timeout:35000});await new Promise(r=>setTimeout(r,3000));const clicked=await pg.evaluate(()=>{const el=[...document.querySelectorAll('button')].find(x=>/How stickers work/i.test(x.textContent));if(el){el.click();return true;}return false;});await new Promise(r=>setTimeout(r,600));const onHelp=await pg.evaluate(()=>document.body.innerText.includes('How to use the Hub')&&document.body.innerText.includes('Mark your stickers'));console.log('deep-link works:',clicked&&onHelp,'| errors:',errs.length);await b.close();})();"
kill "$(cat /tmp/stk_serve.pid)" 2>/dev/null || true
```
Expected: `deep-link works: true | errors: 0`.

- [ ] **Step 5: Run the full smoke + test suite**

Run:
```bash
node --test helptest.js stickertest.js stickersync.test.js
( cd worldcup && python3 -m http.server 8088 >/tmp/stk_serve.log 2>&1 & echo $! > /tmp/stk_serve.pid ); sleep 1; node stickersmoke.js; echo "exit=$?"; kill "$(cat /tmp/stk_serve.pid)" 2>/dev/null || true
```
Expected: all tests pass; `stickersmoke.js` checks pass with `exit=0`.

- [ ] **Step 6: Commit**

```bash
git add worldcup/hub.jsx worldcup/hub-stickers.jsx worldcup/hub-bracket.jsx
git commit -m "feat(help): contextual ❓ links on Stickers, Family, and Bracket"
```

---

## Task 4: README note

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Mention the Help tab**

In `README.md`'s Hub tabs table, add a row before the ⚙️ Settings row:

```markdown
| ❓ **Help** | Friendly, searchable **how-to cards** for every feature — how to fill the bracket, mark & scan stickers, find trades, and set up family trading. Tap the small **❓** on a tab for the matching guide. |
```

- [ ] **Step 2: Verify + commit**

Run: `node --test helptest.js` → PASS.

```bash
git add README.md
git commit -m "docs: note the in-app ❓ Help tab in the README"
```

---

## Notes for the implementer

- **Static/offline:** `help-data.js` + `hub-help.jsx` are relative-path; the offline build picks them up — do NOT edit `make-offline.sh`.
- **No dead links:** the contextual `HelpLink` ids used in the UI (`stk-mark`, `family-relative`, `bracket`) must stay in `help-data.js`'s `links` list (Task 1's test enforces `links ⊆ card ids`). If you add a new `HelpLink`, add its id to `links` too.
- **Graceful:** `HelpTab` renders only from `window.WCHELP`; an unknown `?help=<id>` or missing target just opens the tab normally (no throw). `HelpLink` is rendered only when `goHelp` is provided.
- **Keep the voice kid-friendly** — match the summaries/steps already written in `help-data.js`.
