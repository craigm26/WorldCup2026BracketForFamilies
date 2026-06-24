/* Hub · Home tab — the family's at-a-glance command centre.
   Top→bottom: a morphing HERO band (big live scores, else next-kickoff countdown) →
   a "what just changed" DRAMA ticker (goals rippling into knockout placements) →
   the live group tables → a cross-group 1st/2nd/3rd/4th "race for the Round of 32" →
   a projected Round-of-32 preview → your favourite teams → today's games → Family Pick'em.
   All projection maths is exact + memoised on the played-scores hash, so the 1-second
   countdown clock never recomputes the engine and the tables never flicker. */
const GC = { A:"#e2473b",B:"#2f6fe0",C:"#1f9d57",D:"#f08a24",E:"#8a5cd1",F:"#13a8a8",G:"#e64f9b",H:"#d9a316",I:"#3f51c4",J:"#d8463c",K:"#1d77c9",L:"#2f9e4f" };

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
function playedHashOf(results) {
  return Object.keys(results || {}).filter((k) => { const r = results[k]; return r && r[0] !== "" && r[1] !== "" && r[0] != null && r[1] != null; })
    .sort().map((k) => k + ":" + results[k][0] + "-" + results[k][1]).join("|");
}
/* ProjectionsPanel-style verdict for a team, reused for the favourite-team spotlight. */
function favVerdict(pt) {
  if (!pt) return null;
  if (pt.clinchedWin) return { emoji: "👑", label: "Group winners", fg: "#ffd98a" };
  if (pt.clinchedTop2) return { emoji: "✅", label: "Through to the knockouts", fg: "#9af0c2" };
  if (pt.eliminated) return pt.pThird > 0.005 ? { emoji: "🟡", label: "3rd-place hopes only", fg: "#f4cd77" } : { emoji: "❌", label: "Out", fg: "#ffb3ad" };
  return { emoji: "⚔️", label: "Still fighting", fg: "#dfe6ff" };
}

/* ---- drama persistence: baseline snapshot + the visible event list both live in
   localStorage, so the ticker survives the Home remount-on-tab-switch and the 4h kiosk
   reload without re-firing. First load (no baseline) seeds silently → zero false drama. */
const DRAMA_SEEN = "wc26drama_seen", DRAMA_EVENTS = "wc26drama_events", DRAMA_ON = "wc26drama_on";
const DRAMA_STALE_MS = 30 * 60000; // a baseline older than this is re-seeded silently (no overnight flood)
function dramaTTL(sev) { return sev === "big" ? 30 * 60000 : sev === "medium" ? 15 * 60000 : 8 * 60000; }
// Drop pre-upgrade events (no `causeKey`) so an upgraded device starts the cause-led ticker
// clean instead of replaying the old un-summarized rows until they TTL out.
function loadDramaEvents() { try { const a = JSON.parse(localStorage.getItem(DRAMA_EVENTS)); return Array.isArray(a) ? a.filter((e) => e && e.causeKey !== undefined) : []; } catch (e) { return []; } }
function useHomeDrama(snapshot, enabled) {
  const [events, setEvents] = React.useState(loadDramaEvents);
  React.useEffect(() => {
    // remember the enable edge so re-enabling (manual→auto) seeds silently instead of dumping
    // a backlog of "just changed" at once.
    let prevOn; try { prevOn = localStorage.getItem(DRAMA_ON) === "1"; } catch (e) { prevOn = false; }
    try { localStorage.setItem(DRAMA_ON, enabled ? "1" : "0"); } catch (e) {}
    if (!enabled || !snapshot) return;
    let saved; try { saved = JSON.parse(localStorage.getItem(DRAMA_SEEN)); } catch (e) { return; } // unreadable ⇒ fire nothing
    const baseline = saved && saved.snap ? saved.snap : null;
    const now = Date.now();
    const stale = saved && saved.at && (now - saved.at > DRAMA_STALE_MS); // e.g. tab closed overnight
    const justEnabled = !prevOn;                                          // manual→auto edge / first run
    // [] on first load (null baseline), a stale baseline, a just-enabled edge, or an unchanged hash.
    const fresh = (baseline && !stale && !justEnabled) ? window.wcDramaDiff(baseline, snapshot) : [];
    setEvents((prev) => {
      const byId = {};
      prev.forEach((e) => { byId[e.id] = e; });
      fresh.forEach((e) => { if (!byId[e.id]) byId[e.id] = Object.assign({}, e, { ts: now }); });
      const merged = Object.keys(byId).map((k) => byId[k]).filter((e) => now - e.ts < dramaTTL(e.severity));
      merged.sort((a, b) => b.ts - a.ts);
      try { localStorage.setItem(DRAMA_EVENTS, JSON.stringify(merged)); } catch (e) {}
      return merged;
    });
    // advance the baseline (with a fresh timestamp) only AFTER folding in the new events, so a
    // quick tab-bounce still shows fresh drama once but a no-op live poll never re-fires it.
    try { localStorage.setItem(DRAMA_SEEN, JSON.stringify({ snap: snapshot, at: now })); } catch (e) {}
  }, [snapshot && snapshot.hash, enabled]);
  return events;
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

/* A compact group table for the Home page that slides teams as live scores land. */
function LiveGroupTable({ g, results, status }) {
  const WC = window.WC;
  const table = window.computeStandings(g, results || {});
  const liveSet = window.liveTeamSet ? window.liveTeamSet(status) : {};
  const Flip = window.FlipRows || (({ children }) => <div>{children}</div>);
  return (
    <div style={{ background: "rgba(255,255,255,.05)", borderRadius: 12, padding: 12, flex: "1 1 250px", minWidth: 230 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ width: 22, height: 22, borderRadius: 6, background: GC[g], color: "#fff", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{g}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#9fb0e0" }}>Group {g}</span>
      </div>
      <Flip>
        {table.map((r, idx) => {
          const adv = idx < 2, third = idx === 2;
          return (
            <div key={r.k} data-flip={r.k} style={{ display: "grid", gridTemplateColumns: "16px 22px 1fr 28px 26px", gap: 6, alignItems: "center", padding: "5px 4px", borderRadius: 8,
              background: adv ? "rgba(52,199,123,.14)" : third ? "rgba(244,183,64,.12)" : "transparent" }}>
              <span style={{ color: adv ? "#34c77b" : third ? "#f4b740" : "#9fb0e0", fontWeight: 700, fontSize: 13, textAlign: "center" }}>{idx + 1}</span>
              <Flag code={WC.T[r.k].c} w={22} style={{ border: "1.5px solid #fff", borderRadius: 2, flex: "none" }} />
              <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, color: "#fff", fontSize: 14, fontWeight: 600 }}>
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{WC.T[r.k].n}</span>
                {liveSet[r.k] && <span className="wc-live-dot" title="Playing now" />}
              </span>
              <span style={{ textAlign: "center", color: "#dfe6ff", fontSize: 13 }}>{(r.gd > 0 ? "+" : "") + r.gd}</span>
              <span style={{ textAlign: "center", color: "#fff", fontWeight: 700 }}>{r.pts}</span>
            </div>
          );
        })}
      </Flip>
    </div>
  );
}

/* ---- HERO band: one full-width face. Big live scores when a match is in play (and not
   spoiler-free), else the next-kickoff countdown, else a champion card. Never empty. ---- */
function HeroBand({ liveMatches, next, results, status, nowMs, tz, champ, scoreMode }) {
  const WC = window.WC, WCTZ = window.WCTZ;
  const lt = (m) => WCTZ.local(m.date, m.et.h, m.et.m, tz);
  const showLive = scoreMode !== "manual" && liveMatches.length > 0;

  if (showLive) {
    return (
      <div style={{ background: "linear-gradient(135deg, rgba(226,71,59,.20), rgba(47,111,224,.16))", border: "2px solid #e2473b", borderRadius: 20, padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
          <span className="wc-live-dot" /><span style={{ fontSize: 16, fontWeight: 700, letterSpacing: 1, color: "#ffb3ad" }}>LIVE NOW</span>
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {liveMatches.map((m) => {
            const key = m.g + "-" + m.idx, r = (results || {})[key] || ["", ""], st = (status || {})[key];
            const t = matchTeams(m, true);
            return (
              <div key={key} style={{ flex: "1 1 280px", minWidth: 250, background: "rgba(0,0,0,.22)", borderRadius: 16, padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#e2473b", color: "#fff", fontWeight: 700, fontSize: 11, borderRadius: 6, padding: "2px 8px" }}>
                    <span className="wc-live-dot" style={{ width: 6, height: 6, background: "#fff", boxShadow: "none" }} />{st === "HT" ? "HALF-TIME" : "LIVE"}
                  </span>
                  <span style={{ fontSize: 12, color: "#cdd9ff" }}>📍 {m.city}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end", minWidth: 0 }}>
                    <span style={{ fontSize: 17, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.a}</span>
                    <Flag code={t.ca} w={34} style={{ border: "2px solid #fff", borderRadius: 4, flex: "none" }} />
                  </span>
                  <span style={{ fontWeight: 700, color: "#fff", fontSize: 40, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{r[0] === "" || r[0] == null
                    ? <span style={{ color: "#8fa0d0" }}>–<span style={{ margin: "0 8px" }} />–</span>
                    : <React.Fragment>{r[0]}<span style={{ color: "#6f86c9", margin: "0 8px" }}>-</span>{r[1]}</React.Fragment>}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <Flag code={t.cb} w={34} style={{ border: "2px solid #fff", borderRadius: 4, flex: "none" }} />
                    <span style={{ fontSize: 17, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.b}</span>
                  </span>
                </div>
                <div style={{ textAlign: "center", fontSize: 12, color: "#9fb0e0", marginTop: 6 }}>Group {m.g} · watch the table move below 👇</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (champ) {
    return (
      <div style={{ background: "linear-gradient(135deg, rgba(244,183,64,.28), rgba(47,111,224,.16))", border: "2px solid #f4b740", borderRadius: 20, padding: "22px", textAlign: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1, color: "#f4b740" }}>🏆 WORLD CHAMPIONS 🏆</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12, justifyContent: "center", fontSize: 30, fontWeight: 700, color: "#fff", marginTop: 8 }}>
          <Flag code={WC.T[champ].c} w={48} style={{ border: "2px solid #fff", borderRadius: 5 }} />{WC.T[champ].n}
        </div>
      </div>
    );
  }

  if (next) {
    const t = matchTeams(next, true), k = lt(next);
    const isKO = next.type === "ko", opener = !isKO && window.WCTZ.matches().indexOf(next) === 0;
    const head = opener ? "⚽ THE TOURNAMENT KICKS OFF IN" : isKO ? "🏆 KNOCKOUTS — NEXT KICK-OFF IN" : "⚽ NEXT KICK-OFF IN";
    return (
      <div style={{ background: "linear-gradient(135deg, rgba(244,183,64,.18), rgba(47,111,224,.16))", border: "2px solid rgba(244,183,64,.4)", borderRadius: 20, padding: "18px 22px", textAlign: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1, color: "#f4b740" }}>{head}</div>
        <div style={{ fontSize: 46, fontWeight: 700, color: "#fff", letterSpacing: 1, margin: "4px 0", fontVariantNumeric: "tabular-nums" }}>{fmtCountdown(next.dt.getTime() - nowMs)}</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#fff" }}>
          {t.ca && <Flag code={t.ca} w={32} style={{ border: "2px solid #fff", borderRadius: 4 }} />}{t.a}
          <span style={{ color: "#9fb0e0", fontSize: 16 }}>v</span>
          {t.b}{t.cb && <Flag code={t.cb} w={32} style={{ border: "2px solid #fff", borderRadius: 4 }} />}
        </div>
        <div style={{ fontSize: 14, color: "#cdd9ff", marginTop: 6 }}>{k.icon} {k.weekday} {k.time} ({WCTZ.labelOf(tz)}) · 📍 {next.city}{next.tag ? " · " + next.tag : ""}</div>
      </div>
    );
  }
  // tournament over: nothing live, no next kick-off — never leave the hero blank.
  return (
    <div style={{ background: "linear-gradient(135deg, rgba(244,183,64,.22), rgba(47,111,224,.16))", border: "2px solid rgba(244,183,64,.4)", borderRadius: 20, padding: "22px", textAlign: "center" }}>
      <div style={{ fontSize: 30, fontWeight: 700, color: "#fff" }}>🏆 That's a wrap!</div>
      <div style={{ fontSize: 14, color: "#cdd9ff", marginTop: 6 }}>The 2026 World Cup is complete — relive the whole run on the 🗂️ Bracket.</div>
    </div>
  );
}

/* ---- DRAMA ticker: "what just changed" — each goal that ripples into a qualification
   or knockout placement, as a warm one-line pill. Newest first, max 5 + expand. ---- */
/* one effect line — a single team's transition OR a summarized cluster ("5 teams dropped…") */
function DramaSummaryRow({ row }) {
  const WC = window.WC;
  const tint = row.severity === "big" ? { bg: "rgba(244,183,64,.14)", bd: "rgba(244,183,64,.55)" }
    : row.severity === "medium" ? { bg: "rgba(52,199,123,.12)", bd: "rgba(52,199,123,.4)" }
    : { bg: "rgba(255,255,255,.06)", bd: "rgba(255,255,255,.16)" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: tint.bg, border: "1px solid " + tint.bd, borderRadius: 12, padding: "8px 12px" }}>
      <span style={{ fontSize: 19, flex: "none" }}>{row.emoji}</span>
      {(row.teams || []).slice(0, 12).map((kk) => WC.T[kk] ? <Flag key={kk} code={WC.T[kk].c} w={20} style={{ border: "1.5px solid #fff", borderRadius: 2, flex: "none" }} /> : null)}
      <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: "#fff", minWidth: 0 }}>{row.sentence}</span>
    </div>
  );
}
/* one cause→effect card: the goal that landed ("because"), then its summarized ripples */
function DramaBatch({ batch }) {
  const WC = window.WC;
  return (
    <div className="wc-drama-row" style={{ marginBottom: 12 }}>
      {batch.causeText ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
          <span style={{ fontSize: 18, flex: "none" }}>⚽</span>
          {batch.causeCode && WC.T[batch.causeCode] ? <Flag code={WC.T[batch.causeCode].c} w={24} style={{ border: "1.5px solid #fff", borderRadius: 3, flex: "none" }} /> : null}
          <span style={{ fontWeight: 700, color: "#fff", fontSize: 15, minWidth: 0 }}>{batch.causeText}</span>
          {batch.rows.length ? <span style={{ marginLeft: "auto", fontSize: 12.5, color: "#9fb0e0", whiteSpace: "nowrap", flex: "none" }}>↓ and that shifted</span> : null}
        </div>
      ) : null}
      <div style={{ display: "grid", gap: 6, paddingLeft: batch.causeText ? 12 : 0, borderLeft: batch.causeText ? "2px solid rgba(255,255,255,.14)" : "none" }}>
        {batch.rows.map((r, i) => <DramaSummaryRow key={i} row={r} />)}
      </div>
    </div>
  );
}
function DramaTicker({ events, nowMs }) {
  const [expanded, setExpanded] = React.useState(false);
  const visible = (events || []).filter((e) => nowMs - e.ts < dramaTTL(e.severity));
  if (!visible.length) return null;
  const batches = window.wcSummarizeDrama(visible);
  const shown = expanded ? batches : batches.slice(0, 3);
  const hidden = batches.slice(shown.length).reduce((n, b) => n + b.rows.length, 0);
  return (
    <div style={{ background: "linear-gradient(135deg, rgba(226,71,59,.14), rgba(255,255,255,.06))", border: "2px solid rgba(226,71,59,.35)", borderRadius: 18, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span className="wc-live-dot" />
        <span style={{ fontSize: 18, fontWeight: 700, color: "#ffb3ad" }}>⚡ What just changed</span>
        <span style={{ fontSize: 12.5, color: "#9fb0e0", marginLeft: "auto" }}>each goal, and the knockout shake-up it caused</span>
      </div>
      {shown.map((b) => <DramaBatch key={b.causeKey} batch={b} />)}
      {hidden > 0 && <button onClick={() => setExpanded(true)} style={{ border: "none", cursor: "pointer", background: "rgba(255,255,255,.1)", color: "#dfe6ff", borderRadius: 20, padding: "6px 14px", fontWeight: 700, fontSize: 13 }}>+{hidden} more</button>}
      {expanded && batches.length > 3 && <button onClick={() => setExpanded(false)} style={{ marginLeft: 8, border: "none", cursor: "pointer", background: "rgba(255,255,255,.1)", color: "#9fb0e0", borderRadius: 20, padding: "6px 14px", fontWeight: 700, fontSize: 13 }}>show less</button>}
    </div>
  );
}

/* ---- The race for the Round of 32: 1st / 2nd / 3rd / 4th across every group, with the
   best-3rd cutoff line that physically slides teams across as scores change. ---- */
function PlaceChips({ rows, status, tint }) {
  const WC = window.WC, liveSet = window.liveTeamSet ? window.liveTeamSet(status) : {};
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {rows.map((r) => (
        <span key={r.g + r.k} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: tint, borderRadius: 20, padding: "4px 9px 4px 5px" }}>
          <span style={{ width: 16, height: 16, borderRadius: 4, background: GC[r.g], color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{r.g}</span>
          <Flag code={WC.T[r.k].c} w={20} style={{ border: "1px solid #fff", borderRadius: 2, flex: "none" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{r.k}</span>
          {liveSet[r.k] && <span className="wc-live-dot" style={{ width: 6, height: 6 }} />}
          <span style={{ fontSize: 11.5, color: "#cdd9ff" }}>{r.pts}</span>
        </span>
      ))}
    </div>
  );
}
function PlacesAtAGlance({ results, status, setTab }) {
  const WC = window.WC, liveSet = window.liveTeamSet ? window.liveTeamSet(status) : {};
  const PT = React.useMemo(() => window.wcPositionTables(results || {}), [playedHashOf(results)]); // eslint-disable-line
  const Flip = window.FlipRows || (({ children }) => <div>{children}</div>);
  const thirdRow = (r, i) => {
    const adv = i < PT.thirdAdvance;
    return (
      <div key={r.g + r.k} data-flip={r.g + r.k} style={{ display: "grid", gridTemplateColumns: "34px 22px minmax(56px,1fr) 28px 28px", gap: "0 6px", alignItems: "center", padding: "6px 6px", borderTop: "1px solid rgba(255,255,255,.07)", background: adv ? "rgba(52,199,123,.14)" : "rgba(226,71,59,.13)", borderRadius: 8 }}>
        <span style={{ textAlign: "center", fontWeight: 700, color: adv ? "#34c77b" : "#ff9c93", fontSize: 13 }} title={adv ? "advancing" : "out as it stands"}>{adv ? "✓" : "✗"}{r.rank}</span>
        <span style={{ width: 20, height: 20, borderRadius: 5, background: GC[r.g], color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{r.g}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <Flag code={WC.T[r.k].c} w={22} style={{ border: "1.5px solid #fff", borderRadius: 2, flex: "none" }} />
          <span style={{ fontSize: 13.5, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{WC.T[r.k].n}</span>
          {liveSet[r.k] && <span className="wc-live-dot" style={{ width: 6, height: 6 }} />}
        </span>
        <span style={{ textAlign: "center", fontSize: 12.5, color: "#dfe6ff" }}>{(r.gd > 0 ? "+" : "") + r.gd}</span>
        <span style={{ textAlign: "center", fontSize: 15, fontWeight: 700, color: "#fff" }}>{r.pts}</span>
      </div>
    );
  };
  const lane = (title, fg) => ({ background: "rgba(0,0,0,.14)", borderRadius: 14, padding: 12, flex: "1 1 280px", minWidth: 250 });
  return (
    <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 18, padding: 16 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#f4b740", marginBottom: 2 }}>🏁 The race for the Round of 32</div>
      <div style={{ fontSize: 13, color: "#9fb0e0", marginBottom: 12 }}>Top 2 of every group go through, plus the 8 best 3rd-placed teams. It all reshuffles as scores change.</div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={lane()}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#9af0c2", marginBottom: 8 }}>🥇 Group winners <span style={{ color: "#7e8cc0", fontWeight: 600, fontSize: 12 }}>· all 12 through</span></div>
          <PlaceChips rows={PT.first} status={status} tint="rgba(52,199,123,.16)" />
        </div>
        <div style={lane()}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#9af0c2", marginBottom: 8 }}>🥈 Runners-up <span style={{ color: "#7e8cc0", fontWeight: 600, fontSize: 12 }}>· all 12 through</span></div>
          <PlaceChips rows={PT.second} status={status} tint="rgba(52,199,123,.16)" />
        </div>
      </div>
      {/* the star: the best-3rd race with the cutoff line */}
      <div style={{ background: "rgba(0,0,0,.18)", borderRadius: 14, padding: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#f4cd77", marginBottom: 6 }}>🥉 Best 3rd places — only 8 of 12 squeeze through</div>
        <Flip>
          {PT.third.map((r, i) => (
            <React.Fragment key={r.g + r.k}>
              {thirdRow(r, i)}
              {i === PT.thirdAdvance - 1 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px", margin: "2px 0" }}>
                  <div style={{ flex: 1, borderTop: "2px dashed rgba(244,183,64,.6)" }} />
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "#f4b740", whiteSpace: "nowrap" }}>✂ best-8 cutoff · need ≥ {PT.thirdCutoffPts} pts</span>
                  <div style={{ flex: 1, borderTop: "2px dashed rgba(244,183,64,.6)" }} />
                </div>
              )}
            </React.Fragment>
          ))}
        </Flip>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 220px", minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#ff9c93", marginRight: 8 }}>❌ 4th — going home:</span>
          <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 5, verticalAlign: "middle" }}>
            {PT.fourth.map((r) => <Flag key={r.g + r.k} code={WC.T[r.k].c} w={20} title={WC.T[r.k].n} style={{ border: "1px solid #fff", borderRadius: 2, opacity: .8 }} />)}
          </span>
        </div>
        <button onClick={() => setTab && setTab("standings")} style={{ marginLeft: "auto", border: "none", cursor: "pointer", background: "rgba(244,183,64,.18)", color: "#f4b740", borderRadius: 12, padding: "8px 14px", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}>📊 Full tables → By place</button>
      </div>
    </div>
  );
}

/* ---- Projected Round-of-32: how the group standings set up the knockout matchups
   (derives purely from group results). Pairings that just changed get a gold ring. ---- */
function ProjectedR32Mini({ results, changedMatches, setTab }) {
  const WC = window.WC, KO_M = WC.KO_M;
  const resolved = React.useMemo(() => window.wcResolveBracket(results || {}, null, {}), [playedHashOf(results)]); // eslint-disable-line
  const mt = resolved.matchTeams || {};
  const [showAll, setShowAll] = React.useState(false);
  const nos = Object.keys(KO_M).map(Number).filter((no) => KO_M[no].round === "R32").sort((a, b) => a - b);
  const shown = showAll ? nos : nos.slice(0, 6);
  const sideRow = (feeder, code, won) => {
    const known = code && WC.T[code];
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "3px 0" }}>
        {known ? <Flag code={WC.T[code].c} w={22} style={{ border: "1.5px solid #fff", borderRadius: 2, flex: "none" }} /> : <span style={{ width: 22, flex: "none" }} />}
        <span style={{ fontSize: 13.5, fontWeight: known ? 700 : 500, color: known ? "#fff" : "#8fa0d0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{known ? WC.T[code].n : WC.feeder(feeder, false)}</span>
      </div>
    );
  };
  return (
    <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 18, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: "#f4b740" }}>🗂️ Projected Round of 32</span>
        <span style={{ fontSize: 13, color: "#9fb0e0" }}>if the groups ended right now</span>
      </div>
      <div style={{ fontSize: 12.5, color: "#7e8cc0", marginBottom: 12 }}>Gold tiles depend on the wide-open best-3rd race · a gold ring means the matchup just changed.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
        {shown.map((no) => {
          const m = KO_M[no], t = mt[no] || {};
          const thirdFed = /^3[A-L]+$/.test(m.top) || /^3[A-L]+$/.test(m.bottom);
          const changed = changedMatches && changedMatches[no];
          return (
            <div key={no} onClick={() => setTab && setTab("bracket")} style={{ cursor: "pointer", background: thirdFed ? "rgba(244,183,64,.10)" : "rgba(255,255,255,.05)", border: changed ? "2px solid #f4b740" : "1px solid rgba(255,255,255,.08)", boxShadow: changed ? "0 0 0 3px rgba(244,183,64,.25)" : "none", borderRadius: 12, padding: "9px 12px" }}>
              <div style={{ fontSize: 11.5, color: "#9fb0e0", marginBottom: 2 }}><span style={{ color: "#f4b740", fontWeight: 700 }}>M{m.no}</span> · {m.city}{thirdFed ? " · 🟡 3rd-place tie" : ""}</div>
              {sideRow(m.top, t.top)}
              {sideRow(m.bottom, t.bot)}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        {!showAll && <button onClick={() => setShowAll(true)} style={{ border: "none", cursor: "pointer", background: "rgba(255,255,255,.1)", color: "#dfe6ff", borderRadius: 12, padding: "8px 14px", fontWeight: 700, fontSize: 13 }}>Show all 16 ties</button>}
        <button onClick={() => setTab && setTab("bracket")} style={{ marginLeft: "auto", border: "none", cursor: "pointer", background: "rgba(244,183,64,.18)", color: "#f4b740", borderRadius: 12, padding: "8px 14px", fontWeight: 700, fontSize: 13 }}>🗂️ Open the full bracket →</button>
      </div>
    </div>
  );
}

function HomeTab({ tz, fav, results, status, players, brackets, switchPlayer, addPlayer, removePlayer, setTab, scoreMode, demo }) {
  const WC = window.WC, WCTZ = window.WCTZ;
  const now = useNow(1000);
  const all = React.useMemo(() => WCTZ.matches(), []);
  const nowMs = now.getTime();
  const next = all.find((m) => m.dt.getTime() > nowMs);
  const lt = (m) => WCTZ.local(m.date, m.et.h, m.et.m, tz);

  // exact projections + drama snapshot, memoised on the played-scores hash (so the 1s clock
  // never re-runs the engine and the tables never flicker between identical live polls).
  const pHash = playedHashOf(results);
  // include the set of in-play games in the snapshot key so it recomputes both on a goal AND when
  // a game goes final (LIVE→FT with the same score) — that finalization is when a clinch may fire.
  const liveKeysStr = Object.keys(status || {}).filter((k) => status[k] === "LIVE" || status[k] === "HT").sort().join(",");
  const proj = React.useMemo(() => window.wcProjections(results || {}), [pHash]); // eslint-disable-line
  const snapshot = React.useMemo(() => window.wcQualSnapshot(results || {}, status || {}), [pHash + "|" + liveKeysStr]); // eslint-disable-line
  const dramaOn = scoreMode !== "manual" && !demo;
  const dramaEvents = useHomeDrama(snapshot, dramaOn);
  const visibleDrama = (dramaEvents || []).filter((e) => nowMs - e.ts < dramaTTL(e.severity));
  const changedMatches = {}; visibleDrama.forEach((e) => { if (e.type === "r32_opp_change" && e.matchNo) changedMatches[e.matchNo] = 1; });
  const dramaByTeam = {}; visibleDrama.forEach((e) => { if (e.teamCode && !dramaByTeam[e.teamCode]) dramaByTeam[e.teamCode] = e; });

  // matches actually in play right now (from the live feed status), big in the hero band
  const liveMatches = Object.keys(status || {})
    .filter((k) => status[k] === "LIVE" || status[k] === "HT")
    .map((k) => { const p = k.split("-"); return all.find((m) => m.type === "group" && m.g === p[0] && m.idx === +p[1]); })
    .filter(Boolean);
  // groups with a match in play right now — their live tables move
  const playingGroups = Array.from(new Set(liveMatches.map((m) => m.g))).sort();

  const zone = WCTZ.zoneOf(tz);
  const dayKey = (d) => { try { return new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d); } catch (e) { return ""; } };
  const today = dayKey(now);
  const todays = all.filter((m) => dayKey(m.dt) === today);
  const playedFixtures = proj.meta.playedFixtures;
  const groupOf = (code) => Object.keys(WC.GROUPS).find((g) => WC.GROUPS[g].indexOf(code) >= 0);

  const MatchRow = ({ m, big }) => {
    const t = matchTeams(m, true), k = lt(m);
    const key = m.type === "group" ? (m.g + "-" + m.idx) : null;
    const r = key && results ? results[key] : null;
    const st = key && status ? status[key] : null;
    const isLive = st === "LIVE" || st === "HT";
    const hasScore = r && r[0] !== "" && r[1] !== "" && r[0] != null && r[1] != null;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderTop: "1px solid rgba(255,255,255,.08)" }}>
        {isLive ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#e2473b", color: "#fff", fontWeight: 700, fontSize: 10, borderRadius: 6, padding: "2px 6px", flex: "none" }}><span className="wc-live-dot" style={{ width: 6, height: 6, background: "#fff", boxShadow: "none" }} />{st === "HT" ? "HT" : "LIVE"}</span>
          : st === "FT" ? <span style={{ color: "#9fb0e0", fontWeight: 700, fontSize: 11, width: 64, flex: "none" }}>FT</span>
          : <span style={{ color: "#9fb0e0", fontWeight: 700, fontSize: 12, width: 64, flex: "none" }}>{k.icon} {k.time}</span>}
        {t.ca ? <Flag code={t.ca} w={24} style={{ border: "1.5px solid #fff", borderRadius: 3, flex: "none" }} /> : null}
        <span style={{ fontSize: big ? 16 : 14, color: "#fff", flex: 1, textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.a}</span>
        {hasScore ? <span style={{ fontWeight: 700, color: "#fff", fontSize: big ? 18 : 15, fontVariantNumeric: "tabular-nums", flex: "none", minWidth: 46, textAlign: "center" }}>{r[0]}<span style={{ color: "#6f86c9", margin: "0 4px" }}>-</span>{r[1]}</span>
          : <span style={{ color: "#6f86c9", fontWeight: 700, fontSize: 12 }}>v</span>}
        <span style={{ fontSize: big ? 16 : 14, color: "#fff", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.b}</span>
        {t.cb ? <Flag code={t.cb} w={24} style={{ border: "1.5px solid #fff", borderRadius: 3, flex: "none" }} /> : null}
        <span style={{ fontSize: 12, color: "#9fb0e0", flex: "none" }}>📍 {m.city}</span>
      </div>
    );
  };

  // favourite teams: a card that follows their fortunes, including a "just now" drama callout
  const favRows = (fav || []).map((code) => {
    if (!WC.T[code]) return null;
    const g = groupOf(code); if (!g) return null;
    const m = all.find((x) => x.type === "group" && (x.home === code || x.away === code) && x.dt.getTime() > nowMs);
    const pt = proj.groups[g] && proj.groups[g].perTeam[code];
    return { code, g, m, pt, verdict: favVerdict(pt), drama: dramaByTeam[code] };
  }).filter(Boolean);

  const champ = proj.resolved && proj.resolved.CHAMP;

  return (
    <div style={{ height: "100%", overflow: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 1 · HERO — big live scores, else next-kickoff countdown */}
      <HeroBand liveMatches={liveMatches} next={next} results={results} status={status} nowMs={nowMs} tz={tz} champ={champ} scoreMode={scoreMode} />

      {/* 2 · DRAMA — what just changed */}
      {dramaOn && <DramaTicker events={dramaEvents} nowMs={nowMs} />}

      {/* 3 · live group tables that reorder as goals go in */}
      {playingGroups.length > 0 && (
        <div style={{ background: "linear-gradient(135deg, rgba(226,71,59,.14), rgba(255,255,255,.06))", border: "2px solid rgba(226,71,59,.35)", borderRadius: 18, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span className="wc-live-dot" />
            <span style={{ fontSize: 18, fontWeight: 700, color: "#ffb3ad" }}>Live tables — watch them move</span>
          </div>
          <div style={{ fontSize: 13, color: "#9fb0e0", marginBottom: 12 }}>Standings shift the moment a goal goes in. Tap 📊 Standings for the full view.</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {playingGroups.map((g) => <LiveGroupTable key={g} g={g} results={results} status={status} />)}
          </div>
        </div>
      )}

      {/* 4 · the cross-group 1st/2nd/3rd/4th picture with the best-3rd cutoff.
          Held until matchday 1 is complete (>=24 games) so no un-played team is ever shown
          sorted into a place — or flagged "going home" — before it has kicked a ball. */}
      {playedFixtures >= 24 && <PlacesAtAGlance results={results} status={status} setTab={setTab} />}

      {/* 5 · projected Round-of-32 matchups */}
      {(playedFixtures >= 24 || Object.keys(snapshot.perTeam).some((k) => snapshot.perTeam[k].clinchedTop2)) &&
        <ProjectedR32Mini results={results} changedMatches={changedMatches} setTab={setTab} />}

      {/* 6 · favourite teams */}
      {favRows.length > 0 && (
        <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 18, padding: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#f4b740", marginBottom: 8 }}>⭐ Your team{favRows.length > 1 ? "s" : ""}</div>
          {favRows.map(({ code, g, m, pt, verdict, drama }) => {
            const k = m ? lt(m) : null;
            const srow = proj.groups[g] && proj.groups[g].standings.find((x) => x.k === code);
            const isFreshDrama = drama && nowMs - drama.ts < 90000; // "Just now" only while genuinely recent
            const verdictCovers = pt && (pt.clinchedWin || pt.clinchedTop2 || pt.eliminated); // badge already says it
            const nextLine = m ? "Next: v " + WC.T[m.home === code ? m.away : m.home].n + " · " + k.icon + " " + k.weekday + " " + k.time : null;
            return (
              <div key={code} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid rgba(255,255,255,.06)" }}>
                <Flag code={WC.T[code].c} w={36} style={{ border: "2px solid #fff", borderRadius: 4, flex: "none" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{WC.T[code].n}</span>
                    {verdict && <span style={{ fontSize: 12.5, fontWeight: 700, color: verdict.fg }}>{verdict.emoji} {verdict.label}</span>}
                  </div>
                  <div style={{ fontSize: 13, color: "#9fb0e0" }}>
                    {isFreshDrama ? <span style={{ color: "#ffd2cd", fontWeight: 600 }}>Just now: {drama.sentence}</span>
                      : (verdictCovers && nextLine) ? nextLine
                      : pt && pt.scenarioText ? pt.scenarioText
                      : nextLine ? nextLine
                      : "Group " + g}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: "#dfe6ff", textAlign: "right", flex: "none" }}>Group {g}<br />{srow ? srow.pts + " pts" : ""}</div>
                <button onClick={() => window.wcICS && window.wcICS(code)} title="Add this team's games to your calendar" style={{ border: "none", cursor: "pointer", background: "rgba(244,183,64,.2)", color: "#f4b740", borderRadius: 10, padding: "8px 11px", fontWeight: 700, fontSize: 14, flex: "none" }}>📅</button>
              </div>
            );
          })}
        </div>
      )}

      {/* 7 · today's games (schedule spine) */}
      <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 18, padding: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#f4b740", marginBottom: 4 }}>{(liveMatches.length || playingGroups.length) ? "🔴 Live & today" : "📅 Today's games"}</div>
        {todays.length ? todays.map((m, i) => <MatchRow key={i} m={m} big />)
          : <div style={{ fontSize: 14, color: "#9fb0e0", padding: "8px 0" }}>No games today. {next ? "First up: " + matchTeams(next, true).a + " v " + matchTeams(next, true).b + " on " + next.date + "." : ""} Tap 📅 Schedule for the full calendar.</div>}
      </div>

      {/* 8 · family pick'em */}
      <PlayerBar players={players} brackets={brackets} results={results} switchPlayer={switchPlayer} addPlayer={addPlayer} removePlayer={removePlayer} />
    </div>
  );
}
window.HomeTab = HomeTab;
