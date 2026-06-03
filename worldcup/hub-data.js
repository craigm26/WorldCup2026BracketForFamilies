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

/* ---- localStorage-backed store hook ---- */
window.useHubStore = function () {
  const KEY = "wc26hub";
  const [s, setS] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || { results: {}, bracket: {} }; }
    catch (e) { return { results: {}, bracket: {} }; }
  });
  React.useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }, [s]);
  const setResult = (gKey, side, val) =>
    setS((p) => {
      const cur = p.results[gKey] || ["", ""];
      const nx = side === 0 ? [val, cur[1]] : [cur[0], val];
      return { ...p, results: { ...p.results, [gKey]: nx } };
    });
  const setPick = (slot, team) => setS((p) => ({ ...p, bracket: { ...p.bracket, [slot]: team } }));
  const reset = () => setS({ results: {}, bracket: {} });
  return { store: s, setResult, setPick, reset };
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
  return { ZONES: ZONES, zoneOf: zoneOf, labelOf: labelOf, local: local, kickoffET: kickoffET, dayNight: dayNight, etToDate: etToDate };
})();
