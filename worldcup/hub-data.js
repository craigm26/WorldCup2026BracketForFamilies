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
   the Pi). Schema: { updated:"ISO", matches:[{home:"MEX",away:"RSA",hg:2,ag:1,status:"FT"}] }
   home/away are our 3-letter codes. liveToResults maps it onto the standings. */
window.liveToResults = function (live) {
  const WC = window.WC, out = {}, status = {};
  if (!live || !Array.isArray(live.matches)) return { out, status };
  live.matches.forEach((m) => {
    Object.keys(WC.FIXTURES).forEach((g) => WC.FIXTURES[g].forEach((f, i) => {
      if (f[0] === m.home && f[1] === m.away) {
        if (m.hg != null && m.ag != null) out[g + "-" + i] = [m.hg, m.ag];
        if (m.status) status[g + "-" + i] = m.status; // FT / LIVE / etc.
      }
    }));
  });
  return { out, status };
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
  const [brackets, setBrackets] = React.useState(() => {
    const out = {}; loadPlayers().list.forEach((pl) => { try { out[pl.id] = JSON.parse(localStorage.getItem(bkey(pl.id))) || {}; } catch (e) { out[pl.id] = {}; } }); return out;
  });
  const [books, setBooks] = React.useState(() => loadBooks(loadPlayers()));
  const [collections, setCollections] = React.useState(() => loadCollections(loadBooks(loadPlayers())));
  React.useEffect(() => { try { localStorage.setItem("wc26players", JSON.stringify(players)); } catch (e) {} }, [players]);
  React.useEffect(() => { try { localStorage.setItem("wc26results", JSON.stringify(results)); } catch (e) {} }, [results]);
  React.useEffect(() => { try { Object.keys(brackets).forEach((id) => localStorage.setItem(bkey(id), JSON.stringify(brackets[id]))); } catch (e) {} }, [brackets]);
  React.useEffect(() => { try { Object.keys(books).forEach((pid) => localStorage.setItem(bkkey(pid), JSON.stringify(books[pid]))); } catch (e) {} }, [books]);
  React.useEffect(() => { try { Object.keys(collections).forEach((id) => localStorage.setItem(skey(id), JSON.stringify(collections[id]))); } catch (e) {} }, [collections]);

  const [sync, setSyncState] = React.useState(loadSync);
  React.useEffect(() => { try {
    if (sync) localStorage.setItem(SYNC_KEY, JSON.stringify(sync)); else localStorage.removeItem(SYNC_KEY);
  } catch (e) {} }, [sync]);
  const setSync = (cfg) => setSyncState(cfg);

  const setSticker = (bookId, n, count) => setCollections((c) => {
    const cur = Object.assign({}, c[bookId] || {});
    if (count <= 0) delete cur[String(n)]; else cur[String(n)] = count;
    return Object.assign({}, c, { [bookId]: cur });
  });

  const B = window.WCSTKBOOKS;
  const regOf = (pid) => (books[pid] || (B ? B.defaultRegistry(pid) : { list: [{ id: pid, label: "My album" }], active: pid }));
  const addBook = (playerId, label) => {
    if (!B) return;
    const id = "b" + Date.now();
    setBooks((bk) => Object.assign({}, bk, { [playerId]: B.addBook(bk[playerId] || B.defaultRegistry(playerId), label, id) }));
    setCollections((c) => Object.assign({}, c, { [id]: {} }));
  };
  const renameBook = (playerId, bookId, label) => {
    if (!B) return;
    setBooks((bk) => Object.assign({}, bk, { [playerId]: B.renameBook(bk[playerId] || B.defaultRegistry(playerId), bookId, label) }));
  };
  const switchBook = (playerId, bookId) => setBooks((bk) => {
    const r = bk[playerId]; if (!r) return bk;
    return Object.assign({}, bk, { [playerId]: { list: r.list, active: bookId } });
  });
  const removeBook = (playerId, bookId) => {
    if (!B) return;
    setBooks((bk) => {
      const r = bk[playerId] || B.defaultRegistry(playerId);
      const res = B.removeBook(r, bookId);
      if (!res.removed) return bk;
      try { localStorage.removeItem(skey(bookId)); } catch (e) {}
      setCollections((c) => { const n = Object.assign({}, c); delete n[bookId]; return n; });
      return Object.assign({}, bk, { [playerId]: res.reg });
    });
  };

  const bracket = brackets[players.active] || {};
  const setResult = (gKey, side, val) => setResults((p) => { const cur = p[gKey] || ["", ""]; const nx = side === 0 ? [val, cur[1]] : [cur[0], val]; return Object.assign({}, p, { [gKey]: nx }); });
  const setPick = (slot, team) => setBrackets((b) => { const cur = b[players.active] || {}; return Object.assign({}, b, { [players.active]: Object.assign({}, cur, { [slot]: team }) }); });
  const reset = () => { setResults({}); setBrackets((b) => Object.assign({}, b, { [players.active]: {} })); };
  const addPlayer = (name, emoji) => {
    if (!B) return;
    const id = "p" + Date.now();
    setBrackets((b) => Object.assign({}, b, { [id]: {} }));
    setCollections((c) => Object.assign({}, c, { [id]: {} }));
    setBooks((bk) => Object.assign({}, bk, { [id]: B.defaultRegistry(id) }));
    setPlayers((p) => ({ list: p.list.concat([{ id: id, name: (name || "Player").slice(0, 14), emoji: emoji || "🙂" }]), active: id }));
  };
  const switchPlayer = (id) => setPlayers((p) => Object.assign({}, p, { active: id }));
  const removePlayer = (id) => setPlayers((p) => {
    if (p.list.length <= 1) return p;
    const reg = books[id] || B.defaultRegistry(id);
    try { localStorage.removeItem(bkkey(id)); localStorage.removeItem(bkey(id)); reg.list.forEach((bk) => localStorage.removeItem(skey(bk.id))); } catch (e) {}
    setBooks((bk) => { const n = Object.assign({}, bk); delete n[id]; return n; });
    setCollections((c) => { const n = Object.assign({}, c); reg.list.forEach((bk) => delete n[bk.id]); return n; });
    const list = p.list.filter((x) => x.id !== id);
    return { list: list, active: p.active === id ? list[0].id : p.active };
  });
  const importPlayer = (name, emoji, bracketObj) => {
    if (!B) return;
    const id = "p" + Date.now();
    setBrackets((b) => Object.assign({}, b, { [id]: bracketObj || {} }));
    setCollections((c) => Object.assign({}, c, { [id]: {} }));
    setBooks((bk) => Object.assign({}, bk, { [id]: B.defaultRegistry(id) }));
    setPlayers((p) => ({ list: p.list.concat([{ id: id, name: (name || "Player").slice(0, 14), emoji: emoji || "📥" }]), active: id }));
  };
  return { store: { results: results, bracket: bracket }, brackets: brackets,
           collections: collections, setSticker: setSticker, sync: sync, setSync: setSync,
           setResult: setResult, setPick: setPick, reset: reset,
           players: players, addPlayer: addPlayer, switchPlayer: switchPlayer,
           removePlayer: removePlayer, importPlayer: importPlayer,
           books: books, addBook: addBook, renameBook: renameBook, removeBook: removeBook, switchBook: switchBook };
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

/* ---- Time-zone helper: educate kids + show kick-offs in any family's zone ----
   Base kick-off times are US Eastern (EDT = UTC-4 during Jun-Jul 2026). We convert
   to the chosen zone with the browser's Intl API and tag each with a day/night icon.
   Per-match times use the tournament's typical Eastern windows (12/3/6/9 PM ET) — the
   value here is the time-zone math + day/night, not a claim of exact per-match minutes. */
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
    const SLOTS = [[12, 0], [15, 0], [18, 0], [21, 0]];
    const k = (((g.charCodeAt(0) - 65) + idx * 3) % 4 + 4) % 4;
    return SLOTS[k];
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
      const k = kickoffET(g, idx);
      out.push({ type: "group", g: g, idx: idx, home: f[0], away: f[1], date: f[2], city: f[3], et: { h: k[0], m: k[1] }, dt: etToDate(f[2], k[0], k[1]) });
    }));
    const KM = WC.KO_M || {};
    Object.keys(KM).forEach((no) => { const x = KM[no]; const p = parseET(x.et); if (p) out.push({ type: "ko", no: x.no, round: x.round, top: x.top, bottom: x.bottom, date: x.date, city: x.city, et: { h: p[0], m: p[1] }, dt: etToDate(x.date, p[0], p[1]) }); });
    out.sort((a, b) => a.dt - b.dt);
    return out;
  }
  return { ZONES: ZONES, zoneOf: zoneOf, labelOf: labelOf, local: local, kickoffET: kickoffET, dayNight: dayNight, etToDate: etToDate, parseET: parseET, matches: matches };
})();
