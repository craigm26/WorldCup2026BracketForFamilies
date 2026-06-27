/* Extra data for the interactive Hub: where-to-watch + simple helpers.
   Broadcasters reflect the official 2026 rights holders in the three host nations. */
window.HUB = {
  channels: [
    { region: "United States", flag: "us", tv: ["FOX", "FS1", "Telemundo (Spanish)", "Universo (Spanish)"], stream: ["Tubi", "Peacock", "Fubo", "FOX One", "FOX Sports app", "Telemundo app"], free: ["FOX over the air with an antenna (English, includes the Final)", "Telemundo over the air with an antenna (Spanish, all 104 matches across Telemundo/Universo)", "Tubi free in 4K for select marquee matches, no subscription"], note: "Grab an antenna and you can catch the big games in English on FOX and in Spanish on Telemundo for free, plus a few standouts free in 4K on Tubi." },
    { region: "Canada", flag: "ca", tv: ["TSN (English)", "CTV (English, select matches)", "RDS (French)"], stream: ["Crave", "TSN+", "RDS app"], free: ["CTV over the air for select matches (Canada national-team games, the opening match, and the Final)"], note: "Cheer on Canada for free on CTV over the air, including the opener and the Final; the full 104-match slate lives on TSN and RDS." },
    { region: "Mexico", flag: "mx", tv: ["Las Estrellas", "Canal 5", "Nu9ve / Canal 9", "TUDN", "Azteca Uno", "Azteca 7"], stream: ["ViX", "TV Azteca En Vivo"], free: ["Canal 5, Las Estrellas and Nu9ve over the air (TelevisaUnivision free-to-air matches)", "Azteca Uno and Azteca 7 over the air (includes Mexico national-team games)", "TV Azteca En Vivo free app and website for the Azteca matches"], note: "Every Mexico match and the Final are free over the air on both TV Azteca and Las Estrellas/Canal 5, so the whole family can gather around without a subscription." },
    { region: "Rest of the World (UK shown)", flag: "gb", tv: ["BBC", "ITV"], stream: ["BBC iPlayer", "ITVX"], free: ["All 104 matches free in the UK across BBC and ITV (broadcast and free streaming on BBC iPlayer / ITVX)", "Many countries have a national free-to-air broadcaster carrying the World Cup", "YouTube carries the first 10 minutes of every match free, plus select full matches in some regions"], note: "In the UK the whole tournament is free on BBC and ITV; elsewhere, look up your country's free-to-air channel and lean on YouTube for free highlights of every match." }
  ],
  kickoffWindows: [
    { region: "United States & Canada (Eastern Time)", text: "Most games kick off in friendly afternoon-to-evening windows, roughly around midday, mid-afternoon, early evening and prime time Eastern. No middle-of-the-night alarms for North American families." },
    { region: "Mexico (local time)", text: "Kickoffs land about an hour earlier than Eastern, filling late-morning through evening slots, easy to fit around a family day." },
    { region: "UK & Europe (BST / local)", text: "Because the games are in North America, kickoffs land in the evening and into the late night in the UK and Europe (BST is about 5 hours ahead of Eastern), great for an after-dinner watch." }
  ],
  watchNote: "The 2026 World Cup runs June 11 to July 19 across the USA, Canada and Mexico, so for North American families the games fall in comfortable daytime and evening hours, no late nights needed. Pick your language and your screen, settle in together, and enjoy the world's biggest party.",
  globalNote: "Outside the host nations, the easiest free path is your own country's free-to-air broadcaster, in the UK that's BBC and ITV (with free streaming on BBC iPlayer and ITVX) showing all 104 matches at no cost. Wherever you are, YouTube is an official partner streaming the first 10 minutes of every match for free, plus a selection of full matches in some regions, so you can always catch a taste of the action even without a subscription.",
};

/* ---- live scores ----
   The Hub fetches a same-origin ./live-scores.json (written by update_scores.py on
   the Pi). Schema: { updated:"ISO", matches:[{home:"MEX",away:"RSA",hg:2,ag:1,status:"FT",
     min:"67'",                       // last known match minute
     poss:[58,42], sh:[9,7], sot:[4,3],   // OPTIONAL in-game stats, home/away-oriented (like hg/ag)
     goals:[{min:"34'",team:"MEX",scorer:"Lozano"}]   // OPTIONAL; team is an ABSOLUTE kit code
   }] }
   home/away are our 3-letter codes. liveToResults maps it onto the standings AND, when present,
   returns a 4th `stats` map (keyed g-idx) carrying the in-game stats for the live hero. */
window.liveToResults = function (live) {
  const WC = window.WC, out = {}, status = {}, clock = {}, stats = {};
  if (!live || !Array.isArray(live.matches)) return { out, status, clock, stats };
  // Pack the optional in-game stats for a fixture, flipping the home/away-oriented arrays
  // (poss/sh/sot) when `flip` is set. goals[].team is an absolute kit code → never flipped.
  const packStats = (m, flip) => {
    const s = {};
    const arr = (a) => (Array.isArray(a) && a.length === 2 ? (flip ? [a[1], a[0]] : [a[0], a[1]]) : undefined);
    if (m.poss) s.poss = arr(m.poss);
    if (m.sh) s.sh = arr(m.sh);
    if (m.sot) s.sot = arr(m.sot);
    if (Array.isArray(m.goals) && m.goals.length) s.goals = m.goals;
    return (s.poss || s.sh || s.sot || s.goals) ? s : null;
  };
  live.matches.forEach((m) => {
    Object.keys(WC.FIXTURES).forEach((g) => WC.FIXTURES[g].forEach((f, i) => {
      const key = g + "-" + i;
      if (f[0] === m.home && f[1] === m.away) {
        if (m.hg != null && m.ag != null) out[key] = [m.hg, m.ag];
        if (m.status) status[key] = m.status; // FT / LIVE / HT
        if (m.min) clock[key] = m.min;        // last known match minute, e.g. "67'"
        const s = packStats(m, false); if (s) stats[key] = s;
      } else if (f[0] === m.away && f[1] === m.home) {
        // The feed reported this fixture with home/away reversed (the venue's "home"
        // side differs from our schedule order) — flip the goals so they line up.
        if (m.hg != null && m.ag != null) out[key] = [m.ag, m.hg];
        if (m.status) status[key] = m.status;
        if (m.min) clock[key] = m.min;
        const s = packStats(m, true); if (s) stats[key] = s;
      }
    }));
  });
  return { out, status, clock, stats };
};

/* ---- pool-play story facts (results-derived, always honest) ----
   results: the g-idx → [hg,ag] map. goalsLog: optional flat list of {team,scorer} from the
   accumulated feed (only present for matches we captured live). Returns the facts we can prove;
   goldenBoot is included ONLY when we have real scorer names (never fabricated). */
window.wcPoolStats = function (results, goalsLog) {
  const WC = window.WC, R = results || {};
  let mostGoals = null;       // { a, b, ha, ag, total, g }
  const shutouts = {};        // teamCode -> count of games conceding 0
  let biggestUpset = null;    // { winner, loser, wg, lg, gap }
  Object.keys(WC.FIXTURES).forEach((g) => WC.FIXTURES[g].forEach((f, i) => {
    const r = R[g + "-" + i];
    if (!r || r[0] === "" || r[1] === "" || r[0] == null || r[1] == null) return;
    const h = +r[0], a = +r[1]; if (Number.isNaN(h) || Number.isNaN(a)) return;
    const total = h + a;
    if (!mostGoals || total > mostGoals.total) mostGoals = { a: f[0], b: f[1], ha: h, ag: a, total, g };
    if (a === 0) shutouts[f[0]] = (shutouts[f[0]] || 0) + 1;
    if (h === 0) shutouts[f[1]] = (shutouts[f[1]] || 0) + 1;
    // upset = lower-FIFA-ranked side (bigger r) beats a much higher-ranked side; gap = rank delta
    if (h !== a) {
      const win = h > a ? f[0] : f[1], los = h > a ? f[1] : f[0];
      const wr = WC.T[win] ? WC.T[win].r : 999, lr = WC.T[los] ? WC.T[los].r : 999;
      const gap = wr - lr; // positive when the winner was the lower-ranked (underdog) side
      if (gap > 0 && (!biggestUpset || gap > biggestUpset.gap))
        biggestUpset = { winner: win, loser: los, wg: Math.max(h, a), lg: Math.min(h, a), gap };
    }
  }));
  let cleanestSheet = null;   // { team, n }
  Object.keys(shutouts).forEach((t) => { if (!cleanestSheet || shutouts[t] > cleanestSheet.n) cleanestSheet = { team: t, n: shutouts[t] }; });

  let goldenBoot = null;
  if (Array.isArray(goalsLog) && goalsLog.length) {
    const tally = {};
    goalsLog.forEach((g) => { if (g && g.scorer) { const k = g.scorer + "|" + (g.team || ""); tally[k] = (tally[k] || 0) + 1; } });
    const top = Object.keys(tally).map((k) => ({ scorer: k.split("|")[0], team: k.split("|")[1], n: tally[k] })).sort((x, y) => y.n - x.n)[0];
    if (top && top.n >= 2) goldenBoot = top;   // only surface a leader with a real lead (>=2)
  }
  return { mostGoals, cleanestSheet, biggestUpset, goldenBoot };
};

/* ---- standings computation ---- */
window.computeStandings = function (letter, results) {
  const WC = window.WC;
  const teams = WC.GROUPS[letter];
  const fixtures = WC.FIXTURES[letter];
  const st = {};
  teams.forEach((k) => (st[k] = { k, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }));
  fixtures.forEach((f, i) => {
    const r = results[letter + "-" + i];
    if (!r || r[0] === "" || r[1] === "" || r[0] == null || r[1] == null) return;
    const h = +r[0], a = +r[1];
    if (Number.isNaN(h) || Number.isNaN(a)) return;
    const H = st[f[0]], A = st[f[1]];
    H.p++; A.p++; H.gf += h; H.ga += a; A.gf += a; A.ga += h;
    if (h > a) { H.w++; A.l++; H.pts += 3; }
    else if (h < a) { A.w++; H.l++; A.pts += 3; }
    else { H.d++; A.d++; H.pts++; A.pts++; }
  });
  const arr = Object.values(st).map((s) => ({ ...s, gd: s.gf - s.ga }));
  arr.sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || WC.T[x.k].r - WC.T[y.k].r);
  return arr;
};

/* ---- localStorage-backed store: SHARED results + PER-PLAYER brackets ----
   Results (the objective scores) are shared by the whole family; each player keeps
   their own bracket prediction. Migrates the old single `wc26hub` store once. */
const bkey = (id) => "wc26bracket:" + id;
const skey = (id) => "wc26stickers:" + id;     // keyed by bookId (default book's id == playerId)
const bkkey = (id) => "wc26books:" + id;        // per-player book registry
const SYNC_KEY = "wc26sync";
function loadSync() {
  let cur = null;
  try { cur = JSON.parse(localStorage.getItem(SYNC_KEY)); } catch (e) { cur = null; }
  try {
    // a one-tap setup link (?sync=&code=) configures/updates this device
    const link = window.WCSTKSYNC && window.WCSTKSYNC.parseSetupLink(window.location.search);
    if (link) {
      const memberId = (cur && cur.memberId) || window.WCSTKSYNC.genMemberId();
      cur = { url: link.url, code: link.code, memberId: memberId };
      try { localStorage.setItem(SYNC_KEY, JSON.stringify(cur)); } catch (e) {}
    }
  } catch (e) {}
  // device default (e.g. the kiosk's git-ignored sync-config.js sets window.WCSYNC_DEFAULT) —
  // a fresh device auto-joins the family system without anyone pasting a setup link.
  if (!cur) {
    try {
      const d = window.WCSYNC_DEFAULT;
      if (d && d.url && d.code && window.WCSTKSYNC) {
        cur = { url: d.url, code: d.code, memberId: window.WCSTKSYNC.genMemberId() };
        try { localStorage.setItem(SYNC_KEY, JSON.stringify(cur)); } catch (e) {}
      }
    } catch (e) {}
  }
  return cur || null;
}
function loadPlayers() {
  try { const p = JSON.parse(localStorage.getItem("wc26players")); if (p && p.list && p.list.length) return p; } catch (e) {}
  return { list: [{ id: "family", name: "Family", emoji: "👪" }], active: "family" };
}
// Per-player book registries; migrates (and persists) a default book for any player missing one.
// Metadata-only: never reads or writes wc26stickers:* — the default book's id == playerId, so the
// existing per-player collection already IS that book.
function loadBooks(players) {
  const B = window.WCSTKBOOKS;
  const out = {};
  (players.list || []).forEach((pl) => {
    let existing = null;
    try { existing = JSON.parse(localStorage.getItem(bkkey(pl.id))); } catch (e) { existing = null; }
    const reg = B ? B.migrateRegistry(existing, pl.id)
                  : (existing && existing.list && existing.list.length ? existing
                     : { list: [{ id: pl.id, label: "My album" }], active: pl.id });
    out[pl.id] = reg;
    try { localStorage.setItem(bkkey(pl.id), JSON.stringify(reg)); } catch (e) {}
  });
  return out;
}
// Collections keyed by bookId, read across every book of every player.
function loadCollections(books) {
  const out = {};
  Object.keys(books).forEach((pid) => {
    (books[pid].list || []).forEach((bk) => {
      try { out[bk.id] = JSON.parse(localStorage.getItem(skey(bk.id))) || {}; }
      catch (e) { out[bk.id] = {}; }
    });
  });
  return out;
}
if (!window.__wc26migrated) {
  window.__wc26migrated = true;
  try {
    const old = JSON.parse(localStorage.getItem("wc26hub"));
    if (old) {
      if (old.results && localStorage.getItem("wc26results") === null) localStorage.setItem("wc26results", JSON.stringify(old.results));
      if (old.bracket && localStorage.getItem(bkey("family")) === null) localStorage.setItem(bkey("family"), JSON.stringify(old.bracket));
    }
  } catch (e) {}
}
window.useHubStore = function () {
  const [players, setPlayers] = React.useState(loadPlayers);
  const [results, setResults] = React.useState(() => { try { return JSON.parse(localStorage.getItem("wc26results")) || {}; } catch (e) { return {}; } });
  // knockout scores, hand-entered or filled from the live feed: { [matchNo]: [topGoals, botGoals] }
  const [koResults, setKoResults] = React.useState(() => { try { return JSON.parse(localStorage.getItem("wc26ko")) || {}; } catch (e) { return {}; } });
  const [brackets, setBrackets] = React.useState(() => {
    const out = {}; loadPlayers().list.forEach((pl) => { try { out[pl.id] = JSON.parse(localStorage.getItem(bkey(pl.id))) || {}; } catch (e) { out[pl.id] = {}; } }); return out;
  });
  const [books, setBooks] = React.useState(() => loadBooks(loadPlayers()));
  const [collections, setCollections] = React.useState(() => loadCollections(loadBooks(loadPlayers())));
  React.useEffect(() => { try { localStorage.setItem("wc26players", JSON.stringify(players)); } catch (e) {} }, [players]);
  React.useEffect(() => { try { localStorage.setItem("wc26results", JSON.stringify(results)); } catch (e) {} }, [results]);
  React.useEffect(() => { try { localStorage.setItem("wc26ko", JSON.stringify(koResults)); } catch (e) {} }, [koResults]);
  React.useEffect(() => { try { Object.keys(brackets).forEach((id) => localStorage.setItem(bkey(id), JSON.stringify(brackets[id]))); } catch (e) {} }, [brackets]);
  React.useEffect(() => { try { Object.keys(books).forEach((pid) => localStorage.setItem(bkkey(pid), JSON.stringify(books[pid]))); } catch (e) {} }, [books]);
  React.useEffect(() => { try { Object.keys(collections).forEach((id) => localStorage.setItem(skey(id), JSON.stringify(collections[id]))); } catch (e) {} }, [collections]);

  // ---- Shared Family Library: per-book sync metadata (updatedAt + dirty). Drives the reconcile engine. ----
  const FS = window.WCFAMSTORE;
  const [meta, setMeta] = React.useState(() => { try { return JSON.parse(localStorage.getItem("wc26sync_meta")) || {}; } catch (e) { return {}; } });
  React.useEffect(() => { try { localStorage.setItem("wc26sync_meta", JSON.stringify(meta)); } catch (e) {} }, [meta]);
  const [syncStatus, setSyncStatus] = React.useState("");
  const touch = (bookId) => { if (FS && bookId) setMeta((m) => FS.markDirty(m, bookId, new Date().toISOString())); };
  // Mark a book as a pending deletion (tombstone) so the delete propagates instead of resurrecting.
  const tomb = (playerId, bookId) => { if (FS && bookId) setMeta((m) => Object.assign({}, m, { [bookId]: { updatedAt: new Date().toISOString(), dirty: true, deleted: true, playerId: playerId } })); };

  const [sync, setSyncState] = React.useState(loadSync);
  React.useEffect(() => { try {
    if (sync) localStorage.setItem(SYNC_KEY, JSON.stringify(sync)); else localStorage.removeItem(SYNC_KEY);
  } catch (e) {} }, [sync]);
  const setSync = (cfg) => setSyncState(cfg);

  const setSticker = (bookId, n, count) => {
    setCollections((c) => {
      const cur = Object.assign({}, c[bookId] || {});
      if (count <= 0) delete cur[String(n)]; else cur[String(n)] = count;
      return Object.assign({}, c, { [bookId]: cur });
    });
    touch(bookId);
  };

  const B = window.WCSTKBOOKS;
  const regOf = (pid) => (books[pid] || (B ? B.defaultRegistry(pid) : { list: [{ id: pid, label: "My album" }], active: pid }));
  const idPrefix = () => ((sync && sync.memberId) || "d");
  const addBook = (playerId, label) => {
    if (!B) return;
    const id = idPrefix() + ":b" + Date.now();
    setBooks((bk) => Object.assign({}, bk, { [playerId]: B.addBook(bk[playerId] || B.defaultRegistry(playerId), label, id) }));
    setCollections((c) => Object.assign({}, c, { [id]: {} }));
    touch(id);
  };
  const renameBook = (playerId, bookId, label) => {
    if (!B) return;
    setBooks((bk) => Object.assign({}, bk, { [playerId]: B.renameBook(bk[playerId] || B.defaultRegistry(playerId), bookId, label) }));
    touch(bookId);
  };
  const switchBook = (playerId, bookId) => setBooks((bk) => {
    const r = bk[playerId]; if (!r) return bk;
    return Object.assign({}, bk, { [playerId]: { list: r.list, active: bookId } });
  });
  const removeBook = (playerId, bookId) => {
    if (!B) return;
    const res0 = B.removeBook(books[playerId] || B.defaultRegistry(playerId), bookId);
    if (!res0.removed) return;
    try { localStorage.removeItem(skey(bookId)); } catch (e) {}
    setBooks((bk) => Object.assign({}, bk, { [playerId]: B.removeBook(bk[playerId] || B.defaultRegistry(playerId), bookId).reg }));
    setCollections((c) => { const n = Object.assign({}, c); delete n[bookId]; return n; });
    tomb(playerId, bookId); // propagate the deletion (shared mode) instead of letting it resurrect
  };

  const bracket = brackets[players.active] || {};
  const setResult = (gKey, side, val) => setResults((p) => { const cur = p[gKey] || ["", ""]; const nx = side === 0 ? [val, cur[1]] : [cur[0], val]; return Object.assign({}, p, { [gKey]: nx }); });
  const setKoResult = (no, side, val) => setKoResults((p) => { const cur = p[no] || ["", ""]; const nx = side === 0 ? [val, cur[1]] : [cur[0], val]; return Object.assign({}, p, { [no]: nx }); });
  const setPick = (slot, team) => setBrackets((b) => { const cur = b[players.active] || {}; return Object.assign({}, b, { [players.active]: Object.assign({}, cur, { [slot]: team }) }); });
  const reset = () => { setResults({}); setKoResults({}); setBrackets((b) => Object.assign({}, b, { [players.active]: {} })); };
  const addPlayer = (name, emoji) => {
    if (!B) return;
    const id = idPrefix() + ":p" + Date.now();
    setBrackets((b) => Object.assign({}, b, { [id]: {} }));
    setCollections((c) => Object.assign({}, c, { [id]: {} }));
    setBooks((bk) => Object.assign({}, bk, { [id]: B.defaultRegistry(id) }));
    setPlayers((p) => ({ list: p.list.concat([{ id: id, name: (name || "Player").slice(0, 14), emoji: emoji || "🙂" }]), active: id }));
    touch(id);
  };
  const switchPlayer = (id) => setPlayers((p) => Object.assign({}, p, { active: id }));
  const removePlayer = (id) => setPlayers((p) => {
    if (!B) return p;
    if (p.list.length <= 1) return p;
    const reg = books[id] || B.defaultRegistry(id);
    try { localStorage.removeItem(bkkey(id)); localStorage.removeItem(bkey(id)); reg.list.forEach((bk) => localStorage.removeItem(skey(bk.id))); } catch (e) {}
    setBooks((bk) => { const n = Object.assign({}, bk); delete n[id]; return n; });
    setCollections((c) => { const n = Object.assign({}, c); reg.list.forEach((bk) => delete n[bk.id]); return n; });
    reg.list.forEach((bk) => tomb(id, bk.id)); // propagate the deletion in shared mode
    const list = p.list.filter((x) => x.id !== id);
    return { list: list, active: p.active === id ? list[0].id : p.active };
  });
  const importPlayer = (name, emoji, bracketObj) => {
    if (!B) return;
    const id = idPrefix() + ":p" + Date.now();
    setBrackets((b) => Object.assign({}, b, { [id]: bracketObj || {} }));
    setCollections((c) => Object.assign({}, c, { [id]: {} }));
    setBooks((bk) => Object.assign({}, bk, { [id]: B.defaultRegistry(id) }));
    setPlayers((p) => ({ list: p.list.concat([{ id: id, name: (name || "Player").slice(0, 14), emoji: emoji || "📥" }]), active: id }));
    touch(id);
  };

  // ---- Sync driver: pull → reconcile → apply → push. Activates only when WCSYNC_DEFAULT.shared
  //      (or localStorage wc26shared==="1"). Local-first: edits are never lost; rollback = turn the flag off. ----
  const sref = React.useRef({});
  sref.current = { players: players, books: books, collections: collections, meta: meta, sync: sync };
  const syncingRef = React.useRef(false);
  const sharedOn = () => {
    // Explicit kill-switch wins (rollback escape hatch): set wc26shared="0" to stop auto-sync.
    try { if (localStorage.getItem("wc26shared") === "0") return false; } catch (e) {}
    try { if (window.WCSYNC_DEFAULT && window.WCSYNC_DEFAULT.shared) return true; } catch (e) {}
    try { if (localStorage.getItem("wc26shared") === "1") return true; } catch (e) {}
    // Configured ⇒ back up continuously. Any device that joined (setup link or kiosk default)
    // syncs on its own, so a single device can never silently become the only copy.
    return !!(sref.current && sref.current.sync);
  };
  const syncOnce = React.useCallback(async () => {
    const SY = window.WCSTKSYNC, FX = window.WCFAMSTORE, cfg = sref.current.sync;
    if (!cfg || !SY || !FX || syncingRef.current) return;
    syncingRef.current = true;
    try {
      const data = await SY.postAction(cfg, "getFamily", {});
      // Re-read state AFTER the network round-trip so edits made during the await are included
      // (and applied/pushed), never clobbered. Reconcile + setState below run synchronously.
      const st = sref.current;
      const res = FX.reconcile(FX.toLocal(st.players, st.books, st.collections, st.meta), (data && data.members) || [], new Date().toISOString());
      if (res.changed) {
        const ap = FX.applyResult(res.roster, st.players, st.books);
        setPlayers(ap.players); setBooks(ap.books); setCollections(ap.collections); setMeta(ap.meta);
      }
      const pushRows = res.toPush.concat(FX.tombstoneRows(st.meta));
      const pushed = {};
      for (let i = 0; i < pushRows.length; i++) {
        const r = pushRows[i];
        await SY.postAction(cfg, "publishCollection", { playerId: r.playerId, name: r.name, emoji: r.emoji,
          bookId: r.bookId, bookLabel: r.bookLabel, updatedAt: r.updatedAt, deleted: r.deleted,
          collection: (function () { try { return JSON.parse(r.collectionJSON || "{}"); } catch (e) { return {}; } })() });
        pushed[r.bookId] = r.updatedAt;
      }
      if (Object.keys(pushed).length) setMeta((m) => {
        const out = {};
        Object.keys(m).forEach((b) => {
          if (pushed[b] !== undefined && m[b] && m[b].updatedAt === pushed[b]) {
            if (!m[b].deleted) out[b] = Object.assign({}, m[b], { dirty: false }); // clear dirty; drop pushed tombstones
          } else { out[b] = m[b]; } // re-edited during the push (different updatedAt) → keep dirty for next cycle
        });
        return out;
      });
      setSyncStatus("Synced " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    } catch (e) { setSyncStatus("Offline — will retry"); }
    syncingRef.current = false;
  }, []);
  React.useEffect(() => {
    if (!sync || !sharedOn()) return;
    syncOnce();
    const id = setInterval(syncOnce, 20000);
    return () => clearInterval(id);
  }, [sync, syncOnce]);
  React.useEffect(() => {
    if (!sync || !sharedOn()) return;
    if (!Object.keys(meta).some((b) => meta[b] && meta[b].dirty)) return;
    const t = setTimeout(syncOnce, 3000); // debounced push shortly after edits
    return () => clearTimeout(t);
  }, [meta, sync, syncOnce]);

  return { store: { results: results, bracket: bracket }, brackets: brackets, koResults: koResults,
           collections: collections, setSticker: setSticker, sync: sync, setSync: setSync,
           setResult: setResult, setKoResult: setKoResult, setPick: setPick, reset: reset,
           players: players, addPlayer: addPlayer, switchPlayer: switchPlayer,
           removePlayer: removePlayer, importPlayer: importPlayer,
           books: books, addBook: addBook, renameBook: renameBook, removeBook: removeBook, switchBook: switchBook,
           syncStatus: syncStatus, syncNow: syncOnce };
};

/* ---- Share a bracket as a compact URL (no backend): one char per slot ---- */
window.wcShare = (function () {
  const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-";
  function slots() {
    const out = [];
    ["L", "R"].forEach((side) => { [["R32", 8], ["R16", 4], ["QF", 2], ["SF", 1]].forEach((rn) => { for (let i = 0; i < rn[1]; i++) { out.push(side + rn[0] + "-" + i + "-0"); out.push(side + rn[0] + "-" + i + "-1"); } }); });
    out.push("CHAMP");
    return out;
  }
  function encode(bracket) {
    const codes = Object.keys(window.WC.T); const idx = {}; codes.forEach((c, i) => { idx[c] = i; });
    return slots().map((s) => { const t = bracket && bracket[s]; return (t != null && idx[t] != null) ? ALPHA[idx[t]] : "_"; }).join("");
  }
  function decode(str) {
    const SL = slots(); if (!str || str.length !== SL.length) return null;
    const codes = Object.keys(window.WC.T); const out = {};
    for (let i = 0; i < str.length; i++) { const ch = str[i]; if (ch !== "_") { const k = ALPHA.indexOf(ch); if (k >= 0 && codes[k]) out[SL[i]] = codes[k]; } }
    return out;
  }
  return { encode: encode, decode: decode };
})();

/* ---- Download an .ics calendar (whole tournament, or one team's group games) ---- */
window.wcICS = function (scope) {
  const WC = window.WC, WCTZ = window.WCTZ;
  const all = WCTZ.matches();
  let evs = all, calname = "World Cup 2026";
  if (scope && scope !== "all") { evs = all.filter((m) => m.type === "group" && (m.home === scope || m.away === scope)); calname = WC.T[scope].n + " · World Cup 2026"; }
  const pad = (n) => (n < 10 ? "0" : "") + n;
  const dt = (d) => d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + "T" + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + "00Z";
  const esc = (s) => String(s).replace(/([,;\\])/g, "\\$1").replace(/\n/g, " ");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//World Cup 2026 Family Hub//EN", "CALSCALE:GREGORIAN", "X-WR-CALNAME:" + esc(calname)];
  evs.forEach((m) => {
    const title = m.type === "group" ? WC.T[m.home].n + " v " + WC.T[m.away].n : "M" + m.no + " " + m.round + " — " + WC.feeder(m.top, true) + " v " + WC.feeder(m.bottom, true);
    const end = new Date(m.dt.getTime() + 115 * 60000);
    lines.push("BEGIN:VEVENT", "UID:wc2026-" + (m.type === "group" ? m.g + m.idx : "ko" + m.no) + "@familyhub", "DTSTAMP:" + dt(new Date()), "DTSTART:" + dt(m.dt), "DTEND:" + dt(end), "SUMMARY:" + esc("⚽ " + title), "LOCATION:" + esc(m.city), "DESCRIPTION:" + esc("World Cup 2026 · times shown are the typical Eastern kick-off windows — confirm locally."), "END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  try {
    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = (scope && scope !== "all" ? WC.T[scope].n.replace(/\W+/g, "") + "-" : "") + "worldcup2026.ics";
    document.body.appendChild(a); a.click(); setTimeout(() => { a.remove(); URL.revokeObjectURL(a.href); }, 100);
  } catch (e) {}
};

/* ---- Family Pick'em leaderboard: how many of the 32 actual qualifiers did each
   player predict in their Round of 32? (+5 if their Champion pick is still alive). */
window.wcLeaderboard = function (results, list, brackets) {
  const q = window.wcQualifiers(results || {}).r32;
  const qset = {}; q.forEach((k) => { qset[k] = true; });
  const anyResults = Object.keys(results || {}).some((k) => { const r = results[k]; return r && r[0] !== "" && r[1] !== ""; });
  return (list || []).map((pl) => {
    const b = (brackets && brackets[pl.id]) || {};
    const picks = []; Object.keys(b).forEach((slot) => { if (/R32-\d+-[01]$/.test(slot) && b[slot]) picks.push(b[slot]); });
    const uniq = Array.from(new Set(picks));
    const correct = uniq.filter((k) => qset[k]).length;
    const champ = b["CHAMP"]; const champAlive = !!(champ && qset[champ]);
    return { id: pl.id, name: pl.name, emoji: pl.emoji, filled: uniq.length, correct: correct, champ: champ, champAlive: champAlive, pts: correct + (champAlive ? 5 : 0), hasResults: anyResults };
  }).sort((a, b) => b.pts - a.pts || b.filled - a.filled);
};

/* ---- Round-of-32 qualifiers from current standings ----
   Top 2 of every group + the 8 best 3rd-place teams (2026 format). Used by the
   Settings "auto-advance bracket" helper. Falls back to FIFA rank for ties. */
window.wcQualifiers = function (results) {
  const WC = window.WC; results = results || {};
  const firsts = [], thirds = [];
  Object.keys(WC.GROUPS).forEach((g) => {
    const s = window.computeStandings(g, results);
    firsts.push(s[0].k, s[1].k);
    thirds.push(s[2]);
  });
  thirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || WC.T[a.k].r - WC.T[b.k].r);
  const r32 = firsts.concat(thirds.slice(0, 8).map((x) => x.k));
  return { r32 };
};

/* ---- Resolve the WHOLE bracket from results + live knockout scores ----
   R32 slots come from the group standings via each match's real feeders (1X = group
   winner, 2X = runner-up, 3XXXX = one of the 8 best 3rd-place teams). Knockout slots
   (R16 → Final) come from the live feed: a match is decided once both its teams are
   known and the feed has a non-drawn score for that pairing; the winner flows into the
   slot it feeds. Returns only the slots we can determine — never guesses a knockout
   winner — so a half-played tournament fills in as far as the scores allow.
   `live` is the raw feed object ({ matches:[{home,away,hg,ag,status}] }) or null.
   `koResults` is hand-entered knockout scores ({ [matchNo]: [topGoals, botGoals] }),
   used when the live feed has no score for a pairing (spoiler-free / manual families). */
window.wcResolveBracket = function (results, live, koResults) {
  const WC = window.WC, KO_M = WC.KO_M, KO_LAYOUT = WC.KO_LAYOUT;
  results = results || {};
  koResults = koResults || {};
  const matches = (live && Array.isArray(live.matches)) ? live.matches : [];
  const order = Object.keys(KO_M).map(Number).sort((a, b) => a - b);

  // group standings + the 8 best third-place teams (same tiebreak as wcQualifiers)
  const standings = {};
  Object.keys(WC.GROUPS).forEach((g) => { standings[g] = window.computeStandings(g, results); });
  const thirds = Object.keys(WC.GROUPS).map((g) => ({ g: g, k: standings[g][2].k, s: standings[g][2] }));
  thirds.sort((a, b) => b.s.pts - a.s.pts || b.s.gd - a.s.gd || b.s.gf - a.s.gf || WC.T[a.k].r - WC.T[b.k].r);
  const qThirds = thirds.slice(0, 8);
  // assign the qualifying thirds to the eight "3XXXX" R32 feeders, honoring each
  // slot's allowed groups where possible (greedy, deterministic by match order).
  const thirdAssign = {}, usedThird = {};
  order.forEach((no) => {
    [KO_M[no].top, KO_M[no].bottom].forEach((code) => {
      if (!/^3[A-L]+$/.test(code) || thirdAssign[code]) return;
      const allowed = code.slice(1).split("");
      let pick = qThirds.find((t) => !usedThird[t.k] && allowed.indexOf(t.g) >= 0);
      if (!pick) pick = qThirds.find((t) => !usedThird[t.k]);
      if (pick) { thirdAssign[code] = pick.k; usedThird[pick.k] = true; }
    });
  });

  const teamOf = {}, winnerOf = {};
  function winnerFromFeed(top, bot) {
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      if (m.hg == null || m.ag == null) continue;
      if (m.home === top && m.away === bot) return m.hg > m.ag ? top : m.hg < m.ag ? bot : null;
      if (m.home === bot && m.away === top) return m.hg > m.ag ? bot : m.hg < m.ag ? top : null;
    }
    return null; // not played yet, or a draw we can't break (penalties) — leave open
  }
  function winnerFromManual(no, top, bot) {
    const r = koResults[no];
    if (!r) return null;
    const tg = +r[0], bg = +r[1];
    if (r[0] === "" || r[1] === "" || r[0] == null || r[1] == null || Number.isNaN(tg) || Number.isNaN(bg)) return null;
    return tg > bg ? top : tg < bg ? bot : null;
  }
  function resolve(code) {
    if (!code) return null;
    let m;
    if (m = code.match(/^1([A-L])$/)) return standings[m[1]][0].k;
    if (m = code.match(/^2([A-L])$/)) return standings[m[1]][1].k;
    if (/^3[A-L]+$/.test(code)) return thirdAssign[code] || null;
    if (m = code.match(/^W(\d+)$/)) return winnerOf[+m[1]] || null;
    if (m = code.match(/^L(\d+)$/)) {
      const t = teamOf[+m[1]], w = winnerOf[+m[1]];
      if (!t || !w) return null;
      return t.top === w ? t.bot : t.top;
    }
    return null;
  }
  order.forEach((no) => {
    const top = resolve(KO_M[no].top), bot = resolve(KO_M[no].bottom);
    teamOf[no] = { top: top, bot: bot };
    if (top && bot) { const w = winnerFromFeed(top, bot) || winnerFromManual(no, top, bot); if (w) winnerOf[no] = w; }
  });

  const slots = {};
  ["L", "R"].forEach((side) => {
    [["R32", 8], ["R16", 4], ["QF", 2], ["SF", 1]].forEach((rn) => {
      const lay = KO_LAYOUT[side][rn[0]] || [];
      for (let i = 0; i < rn[1]; i++) {
        const t = teamOf[lay[i]] || {};
        if (t.top) slots[side + rn[0] + "-" + i + "-0"] = t.top;
        if (t.bot) slots[side + rn[0] + "-" + i + "-1"] = t.bot;
      }
    });
  });
  return { slots: slots, CHAMP: winnerOf[104] || null, matchTeams: teamOf, winners: winnerOf };
};

/* ---- Time-zone helper: educate kids + show kick-offs in any family's zone ----
   Base kick-off times are US Eastern (EDT = UTC-4 during Jun-Jul 2026). We convert
   to the chosen zone with the browser's Intl API and tag each with a day/night icon.
   Per-match times are from the official FIFA schedule (stored in FIXTURES[g][idx][4] as
   ET strings) and converted to the chosen zone with the browser's Intl API. */
window.WCTZ = (function () {
  const ZONES = [
    { id: "device", label: "📍 My device's time", tz: null },
    { id: "et", label: "🇺🇸 New York (Eastern)", tz: "America/New_York" },
    { id: "ct", label: "🇺🇸 Chicago (Central)", tz: "America/Chicago" },
    { id: "pt", label: "🇺🇸 Los Angeles (Pacific)", tz: "America/Los_Angeles" },
    { id: "mx", label: "🇲🇽 Mexico City", tz: "America/Mexico_City" },
    { id: "br", label: "🇧🇷 Brazil (São Paulo)", tz: "America/Sao_Paulo" },
    { id: "uk", label: "🇬🇧 UK (London)", tz: "Europe/London" },
    { id: "eu", label: "🇪🇸 Europe (Madrid/Paris)", tz: "Europe/Madrid" },
    { id: "ng", label: "🇳🇬 Nigeria (Lagos)", tz: "Africa/Lagos" },
    { id: "za", label: "🇿🇦 South Africa", tz: "Africa/Johannesburg" },
    { id: "ae", label: "🇦🇪 Dubai", tz: "Asia/Dubai" },
    { id: "in", label: "🇮🇳 India", tz: "Asia/Kolkata" },
    { id: "jp", label: "🇯🇵 Japan (Tokyo)", tz: "Asia/Tokyo" },
    { id: "au", label: "🇦🇺 Sydney", tz: "Australia/Sydney" },
  ];
  const MON = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  function deviceTz() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York"; } catch (e) { return "America/New_York"; } }
  function zoneOf(id) { const z = ZONES.find((z) => z.id === id); if (!z) return deviceTz(); return z.tz || deviceTz(); }
  function labelOf(id) {
    const z = ZONES.find((z) => z.id === id);
    if (!z) return "your time";
    if (z.id === "device") return "your time (" + deviceTz().split("/").pop().replace(/_/g, " ") + ")";
    return z.label.replace(/^\S+\s/, "");
  }
  function etToDate(dateStr, hh, mm) {
    const p = String(dateStr).trim().split(/\s+/);
    const mon = MON[p[0]]; const day = parseInt(p[1], 10);
    return new Date(Date.UTC(2026, mon, day, hh + 4, mm || 0));   // ET = UTC-4 in summer
  }
  function kickoffET(g, idx) {
    const f = window.WC.FIXTURES[g] && window.WC.FIXTURES[g][idx];
    if (f && f[4]) { const p = parseET(f[4]); if (p) return p; }
    return [15, 0];
  }
  function dayNight(h) {
    if (h >= 6 && h < 11) return { icon: "🌅", word: "morning" };
    if (h >= 11 && h < 17) return { icon: "🌞", word: "daytime" };
    if (h >= 17 && h < 20) return { icon: "🌇", word: "evening" };
    if (h >= 20 && h < 23) return { icon: "🌙", word: "night" };
    return { icon: "😴", word: "past bedtime" };
  }
  function local(dateStr, etHH, etMM, id) {
    const tz = zoneOf(id);
    const d = etToDate(dateStr, etHH, etMM);
    let time = etHH + ":" + (etMM < 10 ? "0" + etMM : etMM), weekday = "", h24 = etHH;
    try {
      const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", weekday: "short", hour12: true }).formatToParts(d);
      const get = (t) => { const p = parts.find((p) => p.type === t); return p ? p.value : ""; };
      time = get("hour") + ":" + get("minute") + " " + get("dayPeriod");
      weekday = get("weekday");
      h24 = parseInt(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hour12: false }).format(d), 10);
    } catch (e) {}
    const dn = dayNight(h24);
    return { time: time, weekday: weekday, h24: h24, icon: dn.icon, word: dn.word, tz: tz };
  }
  function parseET(s) {
    const m = /(\d+):(\d+)\s*(AM|PM)/i.exec(s || "");
    if (!m) return null;
    let h = parseInt(m[1], 10) % 12; if (/pm/i.test(m[3])) h += 12;
    return [h, parseInt(m[2], 10)];
  }
  // Every match (group + knockout) with a real Date, sorted by kick-off.
  function matches() {
    const WC = window.WC; const out = [];
    Object.keys(WC.FIXTURES).forEach((g) => WC.FIXTURES[g].forEach((f, idx) => {
      const k = f[4] ? parseET(f[4]) || [15, 0] : [15, 0];
      out.push({ type: "group", g: g, idx: idx, home: f[0], away: f[1], date: f[2], city: f[3], et: { h: k[0], m: k[1] }, dt: etToDate(f[2], k[0], k[1]) });
    }));
    const KM = WC.KO_M || {};
    Object.keys(KM).forEach((no) => { const x = KM[no]; const p = parseET(x.et); if (p) out.push({ type: "ko", no: x.no, round: x.round, top: x.top, bottom: x.bottom, date: x.date, city: x.city, et: { h: p[0], m: p[1] }, dt: etToDate(x.date, p[0], p[1]) }); });
    out.sort((a, b) => a.dt - b.dt);
    return out;
  }
  return { ZONES: ZONES, zoneOf: zoneOf, labelOf: labelOf, local: local, kickoffET: kickoffET, dayNight: dayNight, etToDate: etToDate, parseET: parseET, matches: matches };
})();
