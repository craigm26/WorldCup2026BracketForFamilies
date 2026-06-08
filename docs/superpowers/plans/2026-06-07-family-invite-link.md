# Easy Family Invite Link + Sticky Shared Sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline) — TDD where pure, smoke for UI.

**Goal:** Make the family invite link trivial to copy/share from inside the app (link + QR), and let a configured default auto-connect every screen — without putting the secret write-key in the committed repo.

**Architecture:** A pure `buildInviteLink` in `setup-link.js`; a `window.WCSYNC_DEFAULT` fallback in `loadSync`; an `InviteCard` (copy + QR) in `FamilyConnected`; the kiosk's secret default lives in a git-ignored `worldcup/sync-config.js` written only on the Pi.

**Run unit suite:** `node --test stickertest.js stickersync.test.js globetest.js helptest.js setuptest.js stickerbookstest.js`

---

## Task 1: `buildInviteLink` (pure) + tests

**Files:** Modify `setup-link.js`; Test `setuptest.js`.

- [ ] **Step 1 — failing tests.** Append to `setuptest.js` (after the `buildShareLink` tests):
```js
test('buildInviteLink builds hub?sync=&code= with encoding', () => {
  const u = S.buildInviteLink('https://x.io/wc/worldcup/', 'https://e/exec', 'yourcode');
  assert.equal(u, 'https://x.io/wc/worldcup/?sync=' + encodeURIComponent('https://e/exec') + '&code=yourcode');
});
test('buildInviteLink adds a trailing slash to hubBase and encodes the code', () => {
  const u = S.buildInviteLink('https://x.io/worldcup', 'https://e/exec', 'a b');
  assert.ok(u.startsWith('https://x.io/worldcup/?sync='));
  assert.ok(u.endsWith('&code=a%20b'));
});
test('buildInviteLink returns null without exec or code', () => {
  assert.equal(S.buildInviteLink('https://x/', '', 'c'), null);
  assert.equal(S.buildInviteLink('https://x/', 'https://e/exec', '  '), null);
});
```
- [ ] **Step 2 — run red:** `node --test setuptest.js` → the 3 new tests fail.
- [ ] **Step 3 — implement.** In `setup-link.js`, add the function and export it:
```js
  function buildInviteLink(hubBase, exec, code) {
    exec = (exec || '').trim(); code = (code || '').trim();
    if (!exec || !code) return null;
    let hb = String(hubBase || '');
    if (hb.charAt(hb.length - 1) !== '/') hb = hb + '/';
    return hb + '?sync=' + encodeURIComponent(exec) + '&code=' + encodeURIComponent(code);
  }
```
Change the return to `return { buildShareLink: buildShareLink, buildInviteLink: buildInviteLink };`.
- [ ] **Step 4 — run green:** `node --test setuptest.js` → all pass.
- [ ] **Step 5 — commit:** `git add setup-link.js setuptest.js && git commit`.

---

## Task 2: `loadSync` adopts `window.WCSYNC_DEFAULT`

**Files:** Modify `worldcup/hub-data.js` (`loadSync`).

- [ ] **Step 1 — implement.** In `loadSync`, immediately before `return cur || null;`, insert:
```js
  // device default (e.g. the kiosk's git-ignored sync-config.js sets window.WCSYNC_DEFAULT)
  if (!cur) {
    try {
      const d = window.WCSYNC_DEFAULT;
      if (d && d.url && d.code && window.WCSTKSYNC) {
        cur = { url: d.url, code: d.code, memberId: window.WCSTKSYNC.genMemberId() };
        try { localStorage.setItem(SYNC_KEY, JSON.stringify(cur)); } catch (e) {}
      }
    } catch (e) {}
  }
```
- [ ] **Step 2 — verify (focused smoke).** Inject a default before load, confirm the device auto-connects:
```bash
cd /home/craigm26/kiosk-work/repo/worldcup && python3 -m http.server 8088 >/tmp/inv.log 2>&1 &
SRV=$!; sleep 1.5; cd /home/craigm26/kiosk-work/repo
node -e "const p=require('puppeteer-core');(async()=>{const b=await p.launch({executablePath:'/usr/bin/chromium',headless:'new',args:['--no-sandbox','--disable-gpu']});const pg=await b.newPage();await pg.evaluateOnNewDocument(()=>{window.WCSYNC_DEFAULT={url:'https://e/exec',code:'yourcode',hub:'https://h/worldcup/'}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error'&&!/favicon/i.test(m.text()+m.location().url))errs.push(m.text())});await pg.goto('http://localhost:8088/?tab=stickers',{waitUntil:'networkidle2',timeout:35000});await new Promise(r=>setTimeout(r,2500));const s=await pg.evaluate(()=>JSON.parse(localStorage.getItem('wc26sync')||'null'));console.log('auto-connected:', !!s && s.url==='https://e/exec' && s.code==='yourcode' && /^m_/.test(s.memberId||''));console.log('errors:',errs.length);await b.close();})();" 2>&1 | tail -3
kill $SRV 2>/dev/null; true
```
Expected: `auto-connected: true`, `errors: 0`.
- [ ] **Step 3 — commit:** `git add worldcup/hub-data.js && git commit`.

---

## Task 3: `InviteCard` (Tailscale + public links, each copy + QR) in `FamilyConnected`

**Files:** Modify `worldcup/hub-stickers.jsx`.

- [ ] **Step 1 — add `InviteRow` + `InviteCard`** just above `function FamilyConnected`:
```jsx
function InviteRow({ label, hint, link }) {
  const [copied, setCopied] = React.useState(false);
  const qrRef = React.useRef(null);
  React.useEffect(() => {
    if (!qrRef.current || !link || typeof window.QRCode === "undefined") return;
    qrRef.current.innerHTML = "";
    try { new window.QRCode(qrRef.current, { text: link, width: 132, height: 132 }); } catch (e) {}
  }, [link]);
  const copy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(link); }
      else {
        const ta = document.createElement("textarea");
        ta.value = link; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.focus(); ta.select();
        document.execCommand("copy"); ta.remove();
      }
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    } catch (e) {}
  };
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", background: "rgba(0,0,0,.18)", borderRadius: 10, padding: 10, marginTop: 10 }}>
      <div ref={qrRef} style={{ background: "#fff", padding: 5, borderRadius: 6, lineHeight: 0 }} />
      <div style={{ flex: "1 1 220px", minWidth: 190 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#bdf0d3" }}>{label}</div>
        {hint && <div style={{ fontSize: 11.5, color: "#9fb0e0", margin: "2px 0 6px" }}>{hint}</div>}
        <div style={{ fontSize: 11.5, color: "#9fb0e0", wordBreak: "break-all", marginBottom: 6, userSelect: "all" }}>{link}</div>
        <button onClick={copy} style={{ border: "none", cursor: "pointer", background: copied ? "#2a9d63" : "#34c77b", color: "#06351f", fontWeight: 800, borderRadius: 10, padding: "8px 14px", fontSize: 13.5 }}>{copied ? "✓ Copied!" : "📋 Copy"}</button>
      </div>
    </div>
  );
}

function InviteCard({ sync }) {
  const D = window.WCSYNC_DEFAULT || {};
  const WS = window.WCSETUP;
  const fallbackHub = location.origin + location.pathname.replace(/[^/]*$/, "");
  const tsLink = D.tailscaleHub || null; // secret-free; opening it auto-joins via sync-config.js
  const publicHub = D.publicHub || (D.tailscaleHub ? null : fallbackHub);
  const publicLink = (WS && WS.buildInviteLink && publicHub) ? WS.buildInviteLink(publicHub, sync.url, sync.code) : null;
  if (!tsLink && !publicLink) return null;
  return (
    <div style={{ background: "rgba(52,199,123,.12)", border: "2px solid rgba(52,199,123,.45)", borderRadius: 14, padding: 14, marginBottom: 14 }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: "#bdf0d3" }}>📨 Invite your family</div>
      <div style={{ fontSize: 12.5, color: "#dfe6ff", marginTop: 4 }}>They join the same sticker system — scan a code or send a link.</div>
      {tsLink && <InviteRow label="🏠 On our network (Tailscale)" hint="Family on your Tailscale network: open this — it auto-joins, no key shared." link={tsLink} />}
      {publicLink && <InviteRow label="🌍 Anywhere (private link)" hint="Works on any device. This link includes your family key — send it privately." link={publicLink} />}
    </div>
  );
}
```
- [ ] **Step 2 — render it** in `FamilyConnected`, immediately after the toolbar `</div>` (the one holding Publish/Refresh/Disconnect) and before the `{err && ...}` line:
```jsx
      <InviteCard sync={sync} />
```
- [ ] **Step 3 — smoke.** (a) Public-only (no default) shows the public link + copy + QR; (b) with a Tailscale+public default, BOTH links show; 0 errors:
```bash
cd /home/craigm26/kiosk-work/repo/worldcup && python3 -m http.server 8088 >/tmp/inv.log 2>&1 &
SRV=$!; sleep 1.5; cd /home/craigm26/kiosk-work/repo
node -e "const p=require('puppeteer-core');(async()=>{const b=await p.launch({executablePath:'/usr/bin/chromium',headless:'new',args:['--no-sandbox','--disable-gpu']});
async function check(setDefault){const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error'&&!/favicon/i.test(m.text()+m.location().url))errs.push(m.text())});if(setDefault)await pg.evaluateOnNewDocument(()=>{window.WCSYNC_DEFAULT={url:'https://e/exec',code:'yourcode',tailscaleHub:'http://100.x.y.z/worldcup/',publicHub:'https://h/worldcup/'}});await pg.goto('http://localhost:8088/?tab=stickers',{waitUntil:'networkidle2',timeout:35000});await pg.evaluate(()=>localStorage.setItem('wc26sync',JSON.stringify({url:'https://e/exec',code:'yourcode',memberId:'m_x'})));await pg.reload({waitUntil:'networkidle2',timeout:35000});await new Promise(r=>setTimeout(r,2200));await pg.evaluate(()=>{const el=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Family'));if(el)el.click()});await new Promise(r=>setTimeout(r,1500));const r=await pg.evaluate(()=>({invite:/Invite your family/.test(document.body.innerText),ts:/100\\.64\\.76\\.122\\/worldcup\\//.test(document.body.innerText),pub:/code=yourcode/.test(document.body.innerText),copy:[...document.querySelectorAll('button')].some(b=>/Copy/.test(b.textContent)),qr:document.querySelectorAll('canvas, img[src^=\"data:image\"]').length}));await pg.close();return {r,errs:errs.length};}
const a=await check(false);console.log('PUBLIC-ONLY  invite:',a.r.invite,'| public link:',a.r.pub,'| copy:',a.r.copy,'| QRs:',a.r.qr,'| errors:',a.errs);
const c=await check(true);console.log('TS+PUBLIC    invite:',c.r.invite,'| ts link:',c.r.ts,'| public link:',c.r.pub,'| QRs:',c.r.qr,'| errors:',c.errs);
await b.close();})().catch(e=>{console.error('FAIL',e.message);process.exit(1)});" 2>&1 | tail -3
kill $SRV 2>/dev/null; true
```
Expected: PUBLIC-ONLY → `invite:true public link:true copy:true QRs:1 errors:0`; TS+PUBLIC → `invite:true ts link:true public link:true QRs:2 errors:0`.
- [ ] **Step 4 — full smoke + unit suite stay green** (`node stickersmoke.js`, full `node --test ...`).
- [ ] **Step 5 — commit:** `git add worldcup/hub-stickers.jsx && git commit`.

---

## Task 4: git-ignore the kiosk secret config

**Files:** Modify `.gitignore`.

- [ ] **Step 1** — append to `.gitignore` (create if absent):
```
# Kiosk-only Family Sync default (contains the /exec URL + family code — never commit)
worldcup/sync-config.js
```
- [ ] **Step 2 — commit:** `git add .gitignore && git commit`.

---

## Task 5: README note

**Files:** Modify `README.md`.

- [ ] Add a sentence near the Family Sync section: each connected device shows an **Invite your family** card (copyable link + QR) pointing at the public hub; one tap to share, and a configured kiosk auto-joins every screen. Don't reveal any real `/exec` URL or code.
- [ ] Commit.

---

## Post-merge (operator-gated kiosk deploy — NOT a repo change)
1. Write `worldcup/sync-config.js` on the Pi (git-ignored):
   ```js
   window.WCSYNC_DEFAULT = { url:"<exec>", code:"yourcode",
     tailscaleHub:"http://100.x.y.z/worldcup/",
     publicHub:"https://craigm26.github.io/WorldCup2026BracketForFamilies/worldcup/" };
   ```
2. Idempotently add `<script src="sync-config.js"></script>` before `hub-data.js` in the **kiosk's** `index.html`.
3. Deploy the changed `setup-link.js` + `hub-data.js` + `hub-stickers.jsx` to the kiosk.
4. Verify on the kiosk (LAN + Tailscale IP) that a fresh device auto-joins and the card shows both links.

## Final verification
- `setuptest.js` green; full suite green; smokes green.
- Repo grep for the real `/exec` URL / `yourcode` returns nothing (secret containment).
- Then finishing-a-development-branch.
