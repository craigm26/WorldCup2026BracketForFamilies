/* Hub · Home tab — today & next match + live countdown, favorite-team banner,
   and the Family Pick'em leaderboard + player switcher. */
function useNow(ms) {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => { const id = setInterval(() => setNow(new Date()), ms || 1000); return () => clearInterval(id); }, [ms]);
  return now;
}
function fmtCountdown(msLeft) {
  if (msLeft <= 0) return "0:00";
  const s = Math.floor(msLeft / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  const p = (n) => (n < 10 ? "0" + n : "" + n);
  if (d > 0) return d + "d " + h + "h " + m + "m";
  return p(h) + ":" + p(m) + ":" + p(ss);
}
function matchTeams(m, short) {
  const WC = window.WC;
  if (m.type === "group") return { a: WC.T[m.home].n, b: WC.T[m.away].n, ca: WC.T[m.home].c, cb: WC.T[m.away].c };
  return { a: WC.feeder(m.top, short), b: WC.feeder(m.bottom, short), ca: null, cb: null, tag: "M" + m.no + " · " + m.round };
}

function PlayerBar({ players, brackets, results, switchPlayer, addPlayer, removePlayer }) {
  const [adding, setAdding] = React.useState(false);
  const [name, setName] = React.useState("");
  const [emoji, setEmoji] = React.useState("🙂");
  const EMOJIS = ["🙂", "😎", "🦊", "🐯", "🦄", "⚽", "👦", "👧", "👩", "👨", "🐻", "🐲"];
  const lb = window.wcLeaderboard(results, players.list, brackets);
  const rank = {}; lb.forEach((r, i) => { rank[r.id] = i; });
  return (
    <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 18, padding: 16 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#f4b740", marginBottom: 10 }}>🏆 Family Pick'em</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {players.list.map((p) => {
          const active = p.id === players.active;
          return (
            <span key={p.id} onClick={() => switchPlayer(p.id)} style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7, background: active ? "#f4b740" : "rgba(255,255,255,.1)", color: active ? "#16235a" : "#dfe6ff", borderRadius: 20, padding: "7px 13px", fontWeight: 700, fontSize: 15 }}>
              <span style={{ fontSize: 18 }}>{p.emoji}</span>{p.name}
              {players.list.length > 1 && <span onClick={(e) => { e.stopPropagation(); removePlayer(p.id); }} title="remove" style={{ marginLeft: 2, opacity: .6, fontSize: 13 }}>✕</span>}
            </span>
          );
        })}
        {!adding && <button onClick={() => setAdding(true)} style={{ border: "2px dashed #6f86c9", background: "none", color: "#9fb0e0", borderRadius: 20, padding: "6px 13px", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>+ add player</button>}
      </div>
      {adding && (
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 320 }}>{EMOJIS.map((e) => <button key={e} onClick={() => setEmoji(e)} style={{ cursor: "pointer", border: emoji === e ? "2px solid #f4b740" : "2px solid transparent", background: "rgba(255,255,255,.1)", borderRadius: 8, padding: "3px 6px", fontSize: 18 }}>{e}</button>)}</div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" maxLength={14} style={{ fontFamily: "inherit", fontSize: 15, border: "none", borderRadius: 10, padding: "8px 12px", outline: "none", width: 120 }} />
          <button onClick={() => { if (name.trim()) { addPlayer(name.trim(), emoji); setName(""); setAdding(false); } }} style={{ border: "none", cursor: "pointer", background: "#34c77b", color: "#06351f", fontWeight: 700, borderRadius: 10, padding: "8px 16px", fontSize: 15 }}>Add</button>
          <button onClick={() => setAdding(false)} style={{ border: "none", cursor: "pointer", background: "rgba(255,255,255,.1)", color: "#9fb0e0", borderRadius: 10, padding: "8px 12px" }}>Cancel</button>
        </div>
      )}
      {/* leaderboard */}
      <div style={{ marginTop: 14, display: "grid", gap: 6 }}>
        {lb.map((r, i) => (
          <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, background: r.id === players.active ? "rgba(244,183,64,.14)" : "rgba(255,255,255,.05)", borderRadius: 10, padding: "7px 12px" }}>
            <span style={{ fontWeight: 700, color: "#9fb0e0", width: 20 }}>{i + 1}</span>
            <span style={{ fontSize: 18 }}>{r.emoji}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#fff", flex: 1 }}>{r.name}</span>
            <span style={{ fontSize: 13, color: "#9fb0e0" }}>{r.filled}/32 picked</span>
            <span style={{ fontWeight: 700, color: "#f4b740", minWidth: 56, textAlign: "right" }}>{r.hasResults ? r.pts + " pts" : "—"}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: "#7e8cc0", marginTop: 8 }}>{lb[0] && lb[0].hasResults ? "Points = how many of the 32 qualifiers you predicted (+5 if your champion is still alive)." : "Fill each player's 🗂️ Bracket. Points appear once group results come in."}</div>
    </div>
  );
}

function HomeTab({ tz, fav, results, players, brackets, switchPlayer, addPlayer, removePlayer, setTab }) {
  const WC = window.WC, WCTZ = window.WCTZ;
  const now = useNow(1000);
  const all = React.useMemo(() => WCTZ.matches(), []);
  const nowMs = now.getTime();
  const next = all.find((m) => m.dt.getTime() > nowMs);
  const live = all.filter((m) => { const s = m.dt.getTime(); return nowMs >= s && nowMs < s + 115 * 60000; });
  const zone = WCTZ.zoneOf(tz);
  const dayKey = (d) => { try { return new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d); } catch (e) { return ""; } };
  const today = dayKey(now);
  const todays = all.filter((m) => dayKey(m.dt) === today);
  const lt = (m) => WCTZ.local(m.date, m.et.h, m.et.m, tz);

  const MatchRow = ({ m, big }) => {
    const t = matchTeams(m, true), k = lt(m), isLive = live.indexOf(m) >= 0;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderTop: "1px solid rgba(255,255,255,.08)" }}>
        {isLive ? <span style={{ background: "#e2473b", color: "#fff", fontWeight: 700, fontSize: 10, borderRadius: 6, padding: "2px 6px", flex: "none" }}>● LIVE</span>
          : <span style={{ color: "#9fb0e0", fontWeight: 700, fontSize: 12, width: 64, flex: "none" }}>{k.icon} {k.time}</span>}
        {t.ca ? <Flag code={t.ca} w={24} style={{ border: "1.5px solid #fff", borderRadius: 3, flex: "none" }} /> : null}
        <span style={{ fontSize: big ? 16 : 14, color: "#fff", flex: 1, textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.a}</span>
        <span style={{ color: "#6f86c9", fontWeight: 700, fontSize: 12 }}>v</span>
        <span style={{ fontSize: big ? 16 : 14, color: "#fff", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.b}</span>
        {t.cb ? <Flag code={t.cb} w={24} style={{ border: "1.5px solid #fff", borderRadius: 3, flex: "none" }} /> : null}
        <span style={{ fontSize: 12, color: "#9fb0e0", flex: "none" }}>📍 {m.city}</span>
      </div>
    );
  };

  // favorite-team next match (group stage only — knockout teams aren't known yet)
  const favNext = (fav || []).map((code) => {
    const m = all.find((x) => x.type === "group" && (x.home === code || x.away === code) && x.dt.getTime() > nowMs);
    return m ? { code: code, m: m } : null;
  }).filter(Boolean);

  return (
    <div style={{ height: "100%", overflow: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* next match + countdown */}
      {next && (() => {
        const t = matchTeams(next, true), k = lt(next), opener = all.indexOf(next) === 0;
        return (
          <div style={{ background: "linear-gradient(135deg, rgba(244,183,64,.18), rgba(47,111,224,.16))", border: "2px solid rgba(244,183,64,.4)", borderRadius: 20, padding: "18px 22px", textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1, color: "#f4b740" }}>{opener ? "⚽ THE TOURNAMENT KICKS OFF IN" : "⚽ NEXT KICK-OFF IN"}</div>
            <div style={{ fontSize: 46, fontWeight: 700, color: "#fff", letterSpacing: 1, margin: "4px 0", fontVariantNumeric: "tabular-nums" }}>{fmtCountdown(next.dt.getTime() - nowMs)}</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#fff" }}>
              {t.ca && <Flag code={t.ca} w={32} style={{ border: "2px solid #fff", borderRadius: 4 }} />}{t.a}
              <span style={{ color: "#9fb0e0", fontSize: 16 }}>v</span>
              {t.b}{t.cb && <Flag code={t.cb} w={32} style={{ border: "2px solid #fff", borderRadius: 4 }} />}
            </div>
            <div style={{ fontSize: 14, color: "#cdd9ff", marginTop: 6 }}>{k.icon} {k.weekday} {k.time} ({WCTZ.labelOf(tz)}) · 📍 {next.city}{next.tag ? " · " + next.tag : ""}</div>
          </div>
        );
      })()}

      {/* favorite team banner */}
      {favNext.length > 0 && (
        <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 18, padding: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#f4b740", marginBottom: 8 }}>⭐ Your team{favNext.length > 1 ? "s" : ""}</div>
          {favNext.map(({ code, m }) => {
            const k = lt(m), st = window.computeStandings(m.g, results).find((x) => x.k === code);
            return (
              <div key={code} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                <Flag code={WC.T[code].c} w={36} style={{ border: "2px solid #fff", borderRadius: 4, flex: "none" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{WC.T[code].n}</div>
                  <div style={{ fontSize: 13, color: "#9fb0e0" }}>Next: v {WC.T[m.home === code ? m.away : m.home].n} · {k.icon} {k.weekday} {k.time} · 📍 {m.city}</div>
                </div>
                <div style={{ fontSize: 13, color: "#dfe6ff", textAlign: "right", flex: "none" }}>Group {m.g}<br />{st ? st.pts + " pts" : ""}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* live now / today's games */}
      <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 18, padding: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#f4b740", marginBottom: 4 }}>{live.length ? "🔴 Live & today" : "📅 Today's games"}</div>
        {todays.length ? todays.map((m, i) => <MatchRow key={i} m={m} big />)
          : <div style={{ fontSize: 14, color: "#9fb0e0", padding: "8px 0" }}>No games today. {next ? "First up: " + matchTeams(next, true).a + " v " + matchTeams(next, true).b + " on " + next.date + "." : ""} Tap 📅 Schedule for the full calendar.</div>}
      </div>

      {/* family pick'em */}
      <PlayerBar players={players} brackets={brackets} results={results} switchPlayer={switchPlayer} addPlayer={addPlayer} removePlayer={removePlayer} />
    </div>
  );
}
window.HomeTab = HomeTab;
