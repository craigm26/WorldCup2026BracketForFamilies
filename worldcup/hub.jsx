/* World Cup 2026 Hub — interactive TV/phone app served from the family Pi-NAS. */
const TABS = [
  { id: "bracket",   label: "🗂️ Bracket" },
  { id: "standings", label: "📊 Standings" },
  { id: "schedule",  label: "📅 Schedule" },
  { id: "watch",     label: "📺 Watch" },
  { id: "facts",     label: "🌍 Map & Facts" },
  { id: "settings",  label: "⚙️ Settings" },
];

/* ---- shared time-zone picker (drives the schedule + watch tabs) ---- */
function TimeZoneSelect({ tz, setTz, compact }) {
  const ZONES = window.WCTZ.ZONES;
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.08)", borderRadius: 12, padding: compact ? "5px 10px" : "7px 12px", whiteSpace: "nowrap" }}>
      <span style={{ fontSize: 14, color: "#9fb0e0", fontWeight: 600 }}>🕓 Your time zone</span>
      <select value={tz} onChange={(e) => setTz(e.target.value)} style={{ fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: "#16235a", background: "#f4b740", border: "none", borderRadius: 8, padding: "5px 8px", cursor: "pointer" }}>
        {ZONES.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}
      </select>
    </label>
  );
}

function ScheduleTab({ results, tz, setTz }) {
  const WC = window.WC, WCTZ = window.WCTZ;
  results = results || {};
  const all = [];
  Object.keys(WC.FIXTURES).forEach((g) => WC.FIXTURES[g].forEach((f, idx) => all.push({ g, idx, h: f[0], a: f[1], date: f[2], city: f[3] })));
  const dayNum = (d) => parseInt(d.split(" ")[1], 10);
  all.sort((x, y) => dayNum(x.date) - dayNum(y.date) || x.g.localeCompare(y.g));
  const byDate = {};
  all.forEach((m) => { (byDate[m.date] = byDate[m.date] || []).push(m); });
  const cityObj = (n) => WC.CITIES.find((c) => c.city === n) || { pin: "?", nat: "US" };
  const NATC = { CA: "#e2473b", US: "#2f6fe0", MX: "#1f9d57" };
  const zoneLabel = WCTZ.labelOf(tz);
  const ref = WCTZ.local("Jun 14", 18, 0, tz);   // a 6 PM ET evening kick-off, in your zone
  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ fontSize: 15, color: "#9fb0e0", flex: "1 1 320px" }}>Group stage · June 11–27 · all 72 matches, then the knockouts. Kick-off times below are shown in <b style={{ color: "#f4b740" }}>{zoneLabel}</b>.</div>
        <TimeZoneSelect tz={tz} setTz={setTz} />
      </div>
      {/* time-zone classroom */}
      <div style={{ background: "rgba(47,111,224,.14)", border: "2px solid rgba(47,111,224,.4)", borderRadius: 14, padding: "10px 14px", marginBottom: 14, fontSize: 14, color: "#dfe6ff", lineHeight: 1.45 }}>
        🌍 <b style={{ color: "#9fc0ff" }}>Time-zone trick:</b> when a game kicks off at <b>6:00 PM in New York</b>, it's <b style={{ color: "#f4b740" }}>{ref.weekday} {ref.time} {ref.icon}</b> in {zoneLabel}. The Earth spins, so the same moment is a different time everywhere! {ref.h24 >= 23 || ref.h24 < 6 ? "Some families watch in their pyjamas. 😴" : ""}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
        {Object.keys(byDate).map((d) => (
          <div key={d} style={{ background: "rgba(255,255,255,.06)", borderRadius: 16, padding: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#f4b740", marginBottom: 8 }}>{d}</div>
            {byDate[d].map((m, i) => {
              const o = cityObj(m.city);
              const r = results[m.g + "-" + m.idx];
              const played = r && r[0] !== "" && r[1] !== "";
              const [eh, em] = WCTZ.kickoffET(m.g, m.idx);
              const lk = WCTZ.local(m.date, eh, em, tz);
              return (
                <div key={i} style={{ padding: "7px 0", borderTop: "1px solid rgba(255,255,255,.08)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: "rgba(255,255,255,.12)", borderRadius: 6, padding: "1px 6px", flex: "none" }}>{m.g}</span>
                    <Flag code={WC.T[m.h].c} w={26} style={{ border: "1.5px solid #fff", borderRadius: 3, flex: "none" }} />
                    <span style={{ fontSize: 14, color: "#fff", flex: 1, textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{WC.T[m.h].n}</span>
                    <span style={{ color: played ? "#f4b740" : "#6f86c9", fontWeight: 700, fontSize: played ? 14 : 12, flex: "none", minWidth: 28, textAlign: "center" }}>{played ? `${r[0]}-${r[1]}` : "v"}</span>
                    <span style={{ fontSize: 14, color: "#fff", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{WC.T[m.a].n}</span>
                    <Flag code={WC.T[m.a].c} w={26} style={{ border: "1.5px solid #fff", borderRadius: 3, flex: "none" }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, fontSize: 12.5, color: "#9fb0e0", paddingLeft: 2 }}>
                    <span title="kick-off in your time zone" style={{ color: "#dfe6ff", fontWeight: 600 }}>{lk.icon} {lk.weekday} {lk.time}</span>
                    <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 16, height: 16, borderRadius: "50%", background: NATC[o.nat], color: "#fff", fontWeight: 700, fontSize: 9, display: "grid", placeItems: "center" }}>{o.pin}</span>
                      {m.city}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div style={{ background: "rgba(244,183,64,.14)", borderRadius: 16, padding: 14, border: "2px solid rgba(244,183,64,.4)" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#f4b740", marginBottom: 8 }}>🏆 Knockouts</div>
          {WC.KO.map((k, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderTop: "1px solid rgba(255,255,255,.08)" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{k.r}</span>
              <span style={{ fontSize: 14, color: "#dfe6ff" }}>{k.d}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 12, color: "#7e8cc0", marginTop: 12, lineHeight: 1.5 }}>⏰ Times use the tournament's typical Eastern kick-off windows (12, 3, 6 &amp; 9 PM ET), converted to your zone — confirm exact kick-offs with your local listings closer to the date.</div>
    </div>
  );
}

function WatchTab({ tz, setTz }) {
  const HUB = window.HUB, WC = window.WC, WCTZ = window.WCTZ;
  const zoneLabel = WCTZ.labelOf(tz);
  const Pills = ({ items, bg, fg }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 10 }}>
      {items.map((t, j) => <span key={j} style={{ background: bg, color: fg, borderRadius: 20, padding: "5px 12px", fontSize: 14, fontWeight: 600 }}>{t}</span>)}
    </div>
  );
  const SLOTS = [[12, 0], [15, 0], [18, 0], [21, 0]];
  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      <div style={{ fontSize: 15, color: "#9fb0e0", marginBottom: 16 }}>{HUB.watchNote}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
        {HUB.channels.map((c, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,.06)", borderRadius: 18, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Flag code={c.flag} w={40} style={{ border: "2px solid #fff", borderRadius: 4 }} />
              <span style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{c.region}</span>
            </div>
            <div style={{ fontSize: 13, color: "#f4b740", fontWeight: 700, marginBottom: 5 }}>📺 ON TV</div>
            <Pills items={c.tv} bg="rgba(255,255,255,.12)" fg="#fff" />
            <div style={{ fontSize: 13, color: "#34c77b", fontWeight: 700, marginBottom: 5 }}>▶ STREAMING</div>
            <Pills items={c.stream} bg="rgba(52,199,123,.16)" fg="#bdf0d3" />
            {c.free && c.free.length > 0 && (
              <React.Fragment>
                <div style={{ fontSize: 13, color: "#ffd24a", fontWeight: 700, marginBottom: 5 }}>★ FREE WAYS TO WATCH</div>
                <Pills items={c.free} bg="rgba(255,210,74,.16)" fg="#ffe8a8" />
              </React.Fragment>
            )}
            {c.note && <div style={{ fontSize: 13.5, color: "#cdd9ff", lineHeight: 1.4, marginTop: 4 }}>💡 {c.note}</div>}
          </div>
        ))}
      </div>

      {/* kick-off windows, converted to the chosen zone */}
      <div style={{ background: "rgba(244,183,64,.12)", border: "2px solid rgba(244,183,64,.35)", borderRadius: 18, padding: 18, marginTop: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#f4b740", flex: "1 1 240px" }}>⏰ When do games kick off in {zoneLabel}?</div>
          <TimeZoneSelect tz={tz} setTz={setTz} compact />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
          {SLOTS.map(([h, m], i) => {
            const lk = WCTZ.local("Jun 14", h, m, tz);
            const etLabel = (h > 12 ? h - 12 : h) + " " + (h >= 12 ? "PM" : "AM") + " ET";
            return (
              <div key={i} style={{ background: "rgba(255,255,255,.06)", borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: "#9fb0e0", fontWeight: 600 }}>{etLabel}</span>
                <span style={{ color: "#6f86c9" }}>→</span>
                <span style={{ fontSize: 15, color: "#fff", fontWeight: 700 }}>{lk.time}</span>
                <span style={{ marginLeft: "auto", fontSize: 18 }} title={lk.word}>{lk.icon}</span>
              </div>
            );
          })}
        </div>
        {HUB.kickoffWindows && HUB.kickoffWindows.length > 0 && (
          <div style={{ marginTop: 12, display: "grid", gap: 4 }}>
            {HUB.kickoffWindows.map((k, i) => (
              <div key={i} style={{ fontSize: 13.5 }}><span style={{ fontWeight: 700, color: "#ffd24a" }}>{k.region}:</span> <span style={{ color: "#dfe6ff" }}>{k.text}</span></div>
            ))}
          </div>
        )}
      </div>

      {HUB.globalNote && (
        <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 18, padding: 16, marginTop: 16, fontSize: 14.5, color: "#dfe6ff", lineHeight: 1.5 }}>
          <span style={{ fontWeight: 700, color: "#9fb0e0" }}>🌍 Watching from somewhere else?</span> {HUB.globalNote}
        </div>
      )}
    </div>
  );
}

function CityPortal({ city, onClose }) {
  const WC = window.WC;
  const NATC = { CA: "#e2473b", US: "#2f6fe0", MX: "#1f9d57" };
  const NATFLAG = { CA: "ca", US: "us", MX: "mx" };
  const NATNAME = { CA: "Canada", US: "United States", MX: "Mexico" };
  const matches = [];
  Object.keys(WC.FIXTURES).forEach((g) => WC.FIXTURES[g].forEach((f) => { if (f[3] === city.city) matches.push({ g, h: f[0], a: f[1], date: f[2] }); }));
  const ko = WC.KO.filter((k) => k.d.includes(city.city));
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(8,16,40,.82)", zIndex: 100, display: "grid", placeItems: "center", padding: 30 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#16235a", borderRadius: 22, padding: 24, maxWidth: 620, width: "100%", maxHeight: "86vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.5)", borderTop: `6px solid ${NATC[city.nat]}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: NATC[city.nat], color: "#fff", fontWeight: 700, fontSize: 26, display: "grid", placeItems: "center", flex: "none" }}>{city.pin}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{city.city}</div>
            <div style={{ fontSize: 15, color: "#9fb0e0", display: "flex", alignItems: "center", gap: 7, marginTop: 4 }}>
              <Flag code={NATFLAG[city.nat]} w={22} style={{ borderRadius: 3, border: "1.5px solid #fff" }} /> {NATNAME[city.nat]}
            </div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "rgba(255,255,255,.15)", color: "#fff", fontWeight: 700, borderRadius: 10, padding: "8px 14px", cursor: "pointer", flex: "none" }}>✕</button>
        </div>
        <div style={{ background: "rgba(244,183,64,.16)", borderRadius: 12, padding: "10px 14px", marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f4b740" }}>🏟️ {city.stadium}</div>
          <div style={{ fontSize: 15, color: "#fff", lineHeight: 1.4, marginTop: 4 }}>{city.fact}</div>
        </div>
        {ko.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            {ko.map((k, i) => (
              <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(52,199,123,.2)", border: "2px solid rgba(52,199,123,.5)", borderRadius: 20, padding: "5px 14px", marginRight: 8, fontSize: 15, fontWeight: 700, color: "#bdf0d3" }}>🏆 {k.r} · {k.d}</div>
            ))}
          </div>
        )}
        <div style={{ fontSize: 14, fontWeight: 700, color: "#9fb0e0", marginBottom: 8 }}>GROUP-STAGE GAMES HERE ({matches.length})</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {matches.map((m, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,.06)", borderRadius: 10, padding: "8px 12px" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: "rgba(255,255,255,.12)", borderRadius: 6, padding: "1px 7px", flex: "none" }}>{m.g}</span>
              <Flag code={WC.T[m.h].c} w={28} style={{ border: "1.5px solid #fff", borderRadius: 3, flex: "none" }} />
              <span style={{ fontSize: 15, color: "#fff", flex: 1, textAlign: "right" }}>{WC.T[m.h].n}</span>
              <span style={{ color: "#6f86c9", fontWeight: 700, fontSize: 13 }}>v</span>
              <span style={{ fontSize: 15, color: "#fff", flex: 1 }}>{WC.T[m.a].n}</span>
              <Flag code={WC.T[m.a].c} w={28} style={{ border: "1.5px solid #fff", borderRadius: 3, flex: "none" }} />
              <span style={{ fontSize: 13, color: "#9fb0e0", flex: "none", width: 52, textAlign: "right" }}>{m.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FactsTab() {
  const WC = window.WC;
  const [sel, setSel] = React.useState("BRA");
  const [cityModal, setCityModal] = React.useState(null);
  const [factIdx, setFactIdx] = React.useState(0);
  const t = WC.T[sel];
  const facts = (t.facts && t.facts.length) ? t.facts : [t.fact];
  React.useEffect(() => { setFactIdx(0); }, [sel]);
  React.useEffect(() => {
    if (facts.length < 2) return;
    const id = setInterval(() => setFactIdx((i) => (i + 1) % facts.length), 6500);
    return () => clearInterval(id);
  }, [sel, facts.length]);
  const nextFact = () => setFactIdx((i) => (i + 1) % facts.length);
  return (
    <div style={{ height: "100%", overflow: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "2 1 360px", background: "#fff", borderRadius: 18, padding: 14, minHeight: 340, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#16235a", marginBottom: 6 }}>📍 Tap a pin to explore the city &amp; stadium</div>
          <div style={{ flex: 1, minHeight: 280 }}><StadiumMap onCityClick={setCityModal} /></div>
        </div>
        <div style={{ flex: "1 1 240px", background: "rgba(255,255,255,.06)", borderRadius: 18, padding: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#f4b740", marginBottom: 10 }}>⭐ Records</div>
          <div style={{ display: "grid", gap: 8 }}>
            {WC.RECORDS.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,.06)", borderRadius: 10, padding: "6px 10px" }}>
                <span style={{ fontWeight: 700, fontSize: 20, color: "#f4b740", flex: "none" }}>{r.big}</span>
                <span style={{ fontSize: 13, color: "#dfe6ff" }}>{r.small}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* country explorer */}
      <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 18, padding: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#f4b740", marginBottom: 10 }}>🌍 Tap a country</div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 360px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(46px,1fr))", gap: 7 }}>
            {Object.keys(WC.T).map((k) => (
              <button key={k} onClick={() => setSel(k)} title={WC.T[k].n} style={{ border: sel === k ? "3px solid #f4b740" : "3px solid transparent", borderRadius: 6, padding: 0, cursor: "pointer", background: "none", lineHeight: 0 }}>
                <Flag code={WC.T[k].c} w={46} style={{ borderRadius: 3, display: "block" }} />
              </button>
            ))}
          </div>
          <div style={{ flex: "1 1 280px", background: "rgba(255,255,255,.06)", borderRadius: 14, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <Flag code={t.c} w={64} style={{ border: "3px solid #fff", borderRadius: 5 }} />
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#fff" }}>{t.n}</div>
                <div style={{ fontSize: 13, color: "#9fb0e0" }}>FIFA rank #{t.r} · ⭐ {t.star}</div>
              </div>
            </div>
            <div onClick={nextFact} title="Tap for another fact" style={{ cursor: "pointer", background: "rgba(244,183,64,.10)", border: "1px solid rgba(244,183,64,.28)", borderRadius: 12, padding: "12px 14px", marginBottom: 10, minHeight: 84, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div key={sel + "-" + factIdx} style={{ fontSize: 16, color: "#fff", lineHeight: 1.4, animation: "factfade .45s ease" }}>{facts[factIdx]}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
                {facts.map((_, i) => (
                  <span key={i} style={{ width: i === factIdx ? 16 : 7, height: 7, borderRadius: 4, background: i === factIdx ? "#f4b740" : "rgba(255,255,255,.25)", transition: "all .3s" }}></span>
                ))}
                <span style={{ marginLeft: "auto", fontSize: 11, color: "#9fb0e0", fontWeight: 600 }}>tap for another ›</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 13 }}>
              <span style={{ background: "rgba(255,255,255,.1)", color: "#dfe6ff", borderRadius: 20, padding: "4px 12px" }}>🏛️ {t.cap}</span>
              <span style={{ background: "rgba(255,255,255,.1)", color: "#dfe6ff", borderRadius: 20, padding: "4px 12px" }}>🍽️ {t.food}</span>
            </div>
          </div>
        </div>
      </div>
      {cityModal && <CityPortal city={cityModal} onClose={() => setCityModal(null)} />}
    </div>
  );
}

/* ---- demo mode (?demo=1): auto-fill a complete, plausible example so families
   can SEE a finished bracket + standings. Never persisted; the real Hub starts empty. */
function buildDemo() {
  const WC = window.WC;
  const goalsFor = (myRank, oppRank) => {
    const gap = oppRank - myRank;            // positive = I'm the favourite
    if (gap > 25) return 3; if (gap > 8) return 2; if (gap < -25) return 0; return 1;
  };
  const results = {};
  Object.keys(WC.FIXTURES).forEach((g) => WC.FIXTURES[g].forEach((f, i) => {
    const rh = WC.T[f[0]].r, ra = WC.T[f[1]].r;
    results[g + "-" + i] = [goalsFor(rh, ra), goalsFor(ra, rh)];
  }));
  // qualifiers: top 2 of each group by rank + 8 best 3rd-place by rank
  const firsts = [], thirds = [];
  Object.keys(WC.GROUPS).forEach((g) => {
    const s = [...WC.GROUPS[g]].sort((a, b) => WC.T[a].r - WC.T[b].r);
    firsts.push(s[0], s[1]); thirds.push(s[2]);
  });
  thirds.sort((a, b) => WC.T[a].r - WC.T[b].r);
  const r32 = [...firsts, ...thirds.slice(0, 8)];   // 32 teams
  const bracket = {};
  for (let i = 0; i < 8; i++) { bracket["LR32-" + i + "-0"] = r32[i * 2]; bracket["LR32-" + i + "-1"] = r32[i * 2 + 1]; }
  for (let i = 0; i < 8; i++) { bracket["RR32-" + i + "-0"] = r32[16 + i * 2]; bracket["RR32-" + i + "-1"] = r32[16 + i * 2 + 1]; }
  const win = (a, b) => (!a ? b : !b ? a : (WC.T[a].r <= WC.T[b].r ? a : b));
  const advance = (side) => {
    const seq = [["R32", 8], ["R16", 4], ["QF", 2], ["SF", 1]];
    for (let ri = 0; ri < seq.length - 1; ri++) {
      const [rn, cnt] = seq[ri], nn = seq[ri + 1][0];
      for (let i = 0; i < cnt; i++) {
        const w = win(bracket[side + rn + "-" + i + "-0"], bracket[side + rn + "-" + i + "-1"]);
        bracket[side + nn + "-" + Math.floor(i / 2) + "-" + (i % 2)] = w;
      }
    }
    return win(bracket[side + "SF-0-0"], bracket[side + "SF-0-1"]);
  };
  bracket["CHAMP"] = win(advance("L"), advance("R"));
  return { results, bracket };
}
window.buildDemo = buildDemo;

function SettingsTab({ settings, setSetting, tz, setTz, fetchNow, lastFetch, liveActive, onAutofill, onReset }) {
  const WCTZ = window.WCTZ;
  const modes = [
    { id: "manual", icon: "✍️", title: "Manual — you type the scores", desc: "Best for kids! Watch the games, then type each score yourself on the Standings tab. Nothing changes on its own, so there are never any spoilers." },
    { id: "semi", icon: "🔄", title: "Semi-auto — update when YOU say", desc: "Watch first, peek later. Real scores stay hidden until you press “Update scores now.” Great if you record games and don't want spoilers." },
    { id: "full", icon: "⚡", title: "Auto — scores update by themselves", desc: "The Hub quietly checks for new scores every minute and fills in the Standings for you. (Needs live-scores.json set up on the Pi — see the README.)" },
  ];
  const Toggle = ({ on, onClick }) => (
    <button onClick={onClick} style={{ border: "none", cursor: "pointer", width: 52, height: 30, borderRadius: 20, padding: 3, background: on ? "#34c77b" : "rgba(255,255,255,.18)", transition: "background .2s", flex: "none" }}>
      <span style={{ display: "block", width: 24, height: 24, borderRadius: "50%", background: "#fff", transform: on ? "translateX(22px)" : "translateX(0)", transition: "transform .2s" }}></span>
    </button>
  );
  const card = { background: "rgba(255,255,255,.06)", borderRadius: 18, padding: 18, marginBottom: 16 };
  return (
    <div style={{ height: "100%", overflow: "auto", maxWidth: 760 }}>
      <div style={{ fontSize: 15, color: "#9fb0e0", marginBottom: 16 }}>Make the Hub work the way your family likes. Everything saves on this device.</div>

      <div style={card}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#f4b740", marginBottom: 4 }}>🏆 How should scores update?</div>
        <div style={{ fontSize: 13.5, color: "#9fb0e0", marginBottom: 12 }}>Pick one. You can switch any time.</div>
        <div style={{ display: "grid", gap: 10 }}>
          {modes.map((m) => {
            const on = settings.scoreMode === m.id;
            return (
              <button key={m.id} onClick={() => setSetting("scoreMode", m.id)} style={{ textAlign: "left", cursor: "pointer", display: "flex", gap: 12, alignItems: "flex-start", background: on ? "rgba(244,183,64,.16)" : "rgba(255,255,255,.05)", border: on ? "2px solid #f4b740" : "2px solid transparent", borderRadius: 14, padding: "12px 14px", color: "#fff" }}>
                <span style={{ fontSize: 26, flex: "none" }}>{m.icon}</span>
                <span>
                  <span style={{ display: "block", fontSize: 16, fontWeight: 700, marginBottom: 3 }}>{m.title}</span>
                  <span style={{ display: "block", fontSize: 13.5, color: "#cdd9ff", lineHeight: 1.45 }}>{m.desc}</span>
                </span>
                <span style={{ marginLeft: "auto", flex: "none", width: 22, height: 22, borderRadius: "50%", border: on ? "7px solid #f4b740" : "2px solid #6f86c9", background: on ? "#16235a" : "transparent" }}></span>
              </button>
            );
          })}
        </div>
        {settings.scoreMode !== "manual" && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
            <button onClick={fetchNow} style={{ border: "none", cursor: "pointer", background: "#34c77b", color: "#06351f", fontWeight: 700, borderRadius: 12, padding: "10px 18px", fontSize: 15 }}>🔄 Update scores now</button>
            <span style={{ fontSize: 13, color: "#9fb0e0" }}>{lastFetch ? "Last updated " + new Date(lastFetch).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : (liveActive ? "Live scores loaded." : "No live scores found yet — that's OK, you can still type your own.")}</span>
          </div>
        )}
      </div>

      <div style={card}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#f4b740", marginBottom: 12 }}>🗂️ Bracket helpers</div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          <Toggle on={settings.autoBracket} onClick={() => setSetting("autoBracket", !settings.autoBracket)} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Auto-advance the Round of 32</div>
            <div style={{ fontSize: 13.5, color: "#cdd9ff", lineHeight: 1.45 }}>When standings change, the computer drops the top 2 of each group (plus the 8 best 3rd-place teams) straight into your bracket. Knock-out winners are still yours to pick!</div>
          </div>
        </div>
        <button onClick={onAutofill} style={{ border: "none", cursor: "pointer", background: "#f4b740", color: "#16235a", fontWeight: 700, borderRadius: 12, padding: "10px 18px", fontSize: 15 }}>⚡ Fill my Round of 32 now</button>
        <div style={{ fontSize: 12.5, color: "#7e8cc0", marginTop: 8 }}>Tip: kids love filling the whole bracket by hand on the 🗂️ Bracket tab — leave this off for that.</div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#f4b740", marginBottom: 12 }}>🕓 Time zone</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <TimeZoneSelect tz={tz} setTz={setTz} />
          <span style={{ fontSize: 13.5, color: "#9fb0e0" }}>Used on the 📅 Schedule and 📺 Watch tabs so kick-off times show in <b style={{ color: "#dfe6ff" }}>{WCTZ.labelOf(tz)}</b>.</span>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#f4b740", marginBottom: 8 }}>🧹 Start over</div>
        <div style={{ fontSize: 13.5, color: "#cdd9ff", marginBottom: 12 }}>Clears every score and bracket pick on this device. Your settings above stay.</div>
        <button onClick={onReset} style={{ border: "none", cursor: "pointer", background: "#e2473b", color: "#fff", fontWeight: 700, borderRadius: 12, padding: "10px 18px", fontSize: 15 }}>↺ Reset scores &amp; bracket</button>
      </div>

      <div style={{ fontSize: 12.5, color: "#7e8cc0", lineHeight: 1.6 }}>Published by Craig Merry · Designed with Anthropic Claude Design</div>
    </div>
  );
}

function HubApp() {
  const { store, setResult, setPick, reset } = useHubStore();
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const demo = params.get("demo") === "1";
  const demoData = React.useMemo(() => (demo && window.buildDemo ? window.buildDemo() : null), [demo]);
  const tabParam = params.get("tab");
  const [tab, setTab] = React.useState(TABS.some((t) => t.id === tabParam) ? tabParam : "bracket");
  const [tz, setTz] = React.useState(() => { try { return localStorage.getItem("wc26tz") || "device"; } catch (e) { return "device"; } });
  React.useEffect(() => { try { localStorage.setItem("wc26tz", tz); } catch (e) {} }, [tz]);

  const [settings, setSettings] = React.useState(() => {
    try { return Object.assign({ scoreMode: "manual", autoBracket: false }, JSON.parse(localStorage.getItem("wc26settings")) || {}); }
    catch (e) { return { scoreMode: "manual", autoBracket: false }; }
  });
  React.useEffect(() => { try { localStorage.setItem("wc26settings", JSON.stringify(settings)); } catch (e) {} }, [settings]);
  const setSetting = (k, v) => setSettings((s) => Object.assign({}, s, { [k]: v }));
  const scoreMode = demo ? "full" : settings.scoreMode;

  const [live, setLive] = React.useState(window.LIVE_SCORES && Array.isArray(window.LIVE_SCORES.matches) ? window.LIVE_SCORES : null);
  const [lastFetch, setLastFetch] = React.useState(null);
  const fetchLive = React.useCallback(() => fetch("live-scores.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => { if (d && Array.isArray(d.matches)) { setLive(d); setLastFetch(Date.now()); } return d; })
    .catch(() => null), []);
  React.useEffect(() => {
    if (scoreMode !== "full") return;
    fetchLive();
    const id = setInterval(fetchLive, 60000);
    return () => clearInterval(id);
  }, [scoreMode, fetchLive]);

  const applyLive = scoreMode !== "manual" && !!live;
  const lr = applyLive ? window.liveToResults(live) : { out: null, status: {} };
  const liveActive = applyLive;
  const baseResults = lr.out ? Object.assign({}, store.results, lr.out) : store.results;
  const results = demoData ? demoData.results : baseResults;
  const bracketStore = demoData ? Object.assign({}, store, { bracket: demoData.bracket }) : store;

  const autofillR32 = React.useCallback(() => {
    const q = window.wcQualifiers ? window.wcQualifiers(results) : null;
    if (!q || !q.r32) return;
    const t = q.r32;
    for (let i = 0; i < 8; i++) { setPick("LR32-" + i + "-0", t[i * 2]); setPick("LR32-" + i + "-1", t[i * 2 + 1]); }
    for (let i = 0; i < 8; i++) { setPick("RR32-" + i + "-0", t[16 + i * 2]); setPick("RR32-" + i + "-1", t[16 + i * 2 + 1]); }
  }, [results, setPick]);
  const resultsKey = JSON.stringify(results);
  React.useEffect(() => {
    if (demo || !settings.autoBracket || scoreMode === "manual") return;
    autofillR32();
  }, [resultsKey, settings.autoBracket, scoreMode, demo]);
  React.useEffect(() => {
    const h = (e) => {
      if (e.target && /^(SELECT|INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
      const ids = TABS.map((t) => t.id);
      const i = ids.indexOf(tab);
      if (e.key === "ArrowRight") setTab(ids[(i + 1) % ids.length]);
      else if (e.key === "ArrowLeft") setTab(ids[(i - 1 + ids.length) % ids.length]);
      else if (/^[1-6]$/.test(e.key)) setTab(ids[+e.key - 1]);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [tab]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", color: "#fff", fontFamily: "'Fredoka', sans-serif" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 18, padding: "16px 26px", borderBottom: "1px solid rgba(255,255,255,.12)", flexWrap: "wrap" }}>
        <div style={{ fontWeight: 700, fontSize: 26, whiteSpace: "nowrap" }}>WORLD CUP <span style={{ color: "#f4b740" }}>2026</span></div>
        <nav style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: 1 }}>
          {TABS.map((tb) => (
            <button key={tb.id} onClick={() => setTab(tb.id)} style={{ border: "none", cursor: "pointer", borderRadius: 12, padding: "10px 18px", fontSize: 17, fontWeight: 600, whiteSpace: "nowrap",
              background: tab === tb.id ? "#f4b740" : "rgba(255,255,255,.1)", color: tab === tb.id ? "#16235a" : "#dfe6ff" }}>{tb.label}</button>
          ))}
        </nav>
        {demo && (
          <span style={{ background: "rgba(52,199,123,.2)", border: "2px solid #34c77b", borderRadius: 20, padding: "6px 12px", fontSize: 13, fontWeight: 700, color: "#bdf0d3", whiteSpace: "nowrap" }}>✨ DEMO — example picks</span>
        )}
        {liveActive && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(226,71,59,.22)", border: "2px solid #e2473b", borderRadius: 20, padding: "6px 12px", fontSize: 13, fontWeight: 700, color: "#ffb3ad", whiteSpace: "nowrap" }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#e2473b" }}></span>
            LIVE{live.updated ? " · " + new Date(live.updated).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""}
          </span>
        )}
        <button onClick={() => { if (confirm("Clear all scores & bracket picks?")) reset(); }} style={{ border: "none", cursor: "pointer", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 600, background: "rgba(255,255,255,.08)", color: "#9fb0e0" }}>↺ Reset</button>
      </header>
      <main style={{ flex: 1, minHeight: 0, padding: "20px 26px" }}>
        {tab === "bracket" && <BracketTab store={bracketStore} setPick={setPick} />}
        {tab === "standings" && <StandingsTab results={results} live={liveActive} status={lr.status} setResult={setResult} />}
        {tab === "schedule" && <ScheduleTab results={results} status={lr.status} tz={tz} setTz={setTz} />}
        {tab === "watch" && <WatchTab tz={tz} setTz={setTz} />}
        {tab === "facts" && <FactsTab />}
        {tab === "settings" && <SettingsTab settings={settings} setSetting={setSetting} tz={tz} setTz={setTz} fetchNow={fetchLive} lastFetch={lastFetch} liveActive={liveActive} onAutofill={autofillR32} onReset={() => { if (confirm("Clear all scores & bracket picks?")) reset(); }} />}
      </main>
      <footer style={{ padding: "8px 26px", borderTop: "1px solid rgba(255,255,255,.1)", fontSize: 12.5, color: "#7e8cc0", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span>📺 Use ← → or keys 1–5 to switch tabs · scores &amp; picks save on this device</span>
        <span style={{ color: "#8c9bd0" }}>Published by Craig Merry · Designed with Anthropic Claude Design</span>
        <span>pi-nas.local/worldcup</span>
      </footer>
    </div>
  );
}
ReactDOM.createRoot(document.getElementById("hub")).render(<HubApp />);
