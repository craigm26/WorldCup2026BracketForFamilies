/* Hub · Standings → Projections view. "Two games played, one to go" — each team's
   chance to advance, the plain-English last-game story, and where they'd land in the
   bracket. Exact (no Monte Carlo); engine lives in hub-projections.js. */
function ProjectionsPanel({ group, results }) {
  const WC = window.WC;
  results = results || {};

  // recompute only when the PLAYED scores change (exact ⇒ deterministic ⇒ no flicker)
  const key = React.useMemo(() => Object.keys(results)
    .filter((k) => { const r = results[k]; return r && r[0] !== "" && r[1] !== "" && r[0] != null && r[1] != null; })
    .sort().map((k) => k + ":" + results[k][0] + "-" + results[k][1]).join("|"), [results]);
  const proj = React.useMemo(() => window.wcProjections(results), [key]); // eslint-disable-line
  const gp = proj.groups[group];
  if (!gp) return null;
  const resolved = proj.resolved;

  const ord = (n) => ["", "1st", "2nd", "3rd", "4th"][n] || n + "th";
  const pct = (x) => Math.round(x * 100);
  // honest headline %: don't show 100% unless mathematically through, nor 0% while still alive
  const topPct = (pt) => {
    let v = Math.round(pt.pTop2 * 100);
    if (v >= 100 && !pt.clinchedTop2) v = 99;
    if (v <= 0 && !pt.eliminated && pt.pTop2 > 0) v = 1;
    return v;
  };
  const teamName = (k) => (k && WC.T[k] ? WC.T[k].n : null);

  const pillFor = (pt) => {
    if (pt.clinchedWin) return { t: "👑 Group winners", bg: "rgba(244,183,64,.22)", fg: "#ffd98a" };
    if (pt.clinchedTop2) return { t: "✅ Through", bg: "rgba(52,199,123,.2)", fg: "#9af0c2" };
    if (pt.eliminated) return pt.pThird > 0.005
      ? { t: "🟡 3rd-place hopes", bg: "rgba(244,183,64,.16)", fg: "#f4cd77" }
      : { t: "❌ Out", bg: "rgba(226,71,59,.18)", fg: "#ffb3ad" };
    return { t: "⚔️ Still fighting", bg: "rgba(255,255,255,.1)", fg: "#dfe6ff" };
  };

  const card = { background: "rgba(255,255,255,.05)", borderRadius: 14, padding: "12px 14px", marginBottom: 12 };

  // one exact "where this group lands" card (1st/2nd slots are fixed by the schedule)
  const Opp = ({ slot }) => {
    if (!slot) return <span style={{ color: "#9fb0e0" }}>—</span>;
    const opp = slot.currentOpp;
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {opp ? <Flag code={WC.T[opp].c} w={22} style={{ border: "1.5px solid #fff", borderRadius: 2, flex: "none" }} /> : null}
        <span style={{ color: "#fff", fontWeight: 600 }}>{opp ? teamName(opp) : slot.oppLabel}</span>
        {opp ? <span style={{ color: "#8fa0d0", fontSize: 12 }}>({slot.oppLabel})</span> : null}
      </span>
    );
  };
  const SlotLine = ({ pos }) => {
    const s = window.wcProjectedSlot(group, pos, results, resolved);
    if (!s) return null;
    return (
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "5px 0", flexWrap: "wrap" }}>
        <span style={{ minWidth: 116, color: pos === 1 ? "#34c77b" : "#f4b740", fontWeight: 700 }}>
          {pos === 1 ? "🥇 Win group →" : "🥈 Runner-up →"}
        </span>
        <span style={{ color: "#9fb0e0", fontSize: 13 }}><span style={{ color: "#f4b740", fontWeight: 700 }}>M{s.matchNo}</span> · {s.date} · 📍 {s.city} · vs</span>
        <Opp slot={s} />
      </div>
    );
  };

  const third = gp.standings[2];
  const watch = third ? proj.thirds.statusForGroup(group) : null;
  const playedN = 6 - gp.remainingCount;

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: "auto", background: "rgba(255,255,255,.06)", borderRadius: 18, padding: 18 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#f4b740", marginBottom: 2 }}>🔮 Group {group} — what happens next?</div>
      <div style={{ fontSize: 13, color: "#9fb0e0", marginBottom: 14 }}>
        {gp.remainingCount === 0
          ? "This group is finished — final places below."
          : `${playedN} of 6 games played · ${gp.remainingCount} to go. Chances assume each team's strength from its world ranking.`}
      </div>

      {/* team rows */}
      {gp.standings.map((row, idx) => {
        const pt = gp.perTeam[row.k];
        const pill = pillFor(pt);
        return (
          <div key={row.k} style={{ ...card, borderLeft: idx < 2 ? "3px solid #34c77b" : idx === 2 ? "3px solid #f4b740" : "3px solid transparent" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <Flag code={WC.T[row.k].c} w={30} style={{ border: "2px solid #fff", borderRadius: 3, flex: "none" }} />
              <span style={{ fontSize: 16, fontWeight: 700, color: "#fff", flex: "1 1 120px", minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{WC.T[row.k].n}</span>
              <span style={{ fontSize: 13, color: "#9fb0e0", whiteSpace: "nowrap" }}>{row.pts} pts · {row.w}-{row.d}-{row.l}</span>
              <span style={{ background: pill.bg, color: pill.fg, fontWeight: 700, fontSize: 12.5, padding: "4px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>{pill.t}</span>
            </div>
            {/* qualification bar: green = chance to finish top 2, gold = chance via 3rd place */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
              <div style={{ flex: 1, height: 12, borderRadius: 6, background: "rgba(255,255,255,.12)", overflow: "hidden", display: "flex" }}>
                <div style={{ width: pct(pt.pTop2) + "%", background: "#34c77b" }} />
                <div style={{ width: pct(pt.pThird) + "%", background: "#f4b740" }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#34c77b", minWidth: 38, textAlign: "right" }}>{topPct(pt)}%</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "#dfe6ff" }}>{pt.scenarioText}</span>
              <span style={{ fontSize: 12.5, color: "#9fb0e0", whiteSpace: "nowrap" }}>
                Likely: <b style={{ color: "#fff" }}>{ord(pt.likelyFinish)}</b> · {pct(pt.likelyFinishProb)}%
                {pt.pThird > 0.005 ? <span> · +{pct(pt.pThird)}% as 3rd</span> : null}
              </span>
            </div>
          </div>
        );
      })}

      {/* group-level plain-English summary */}
      {gp.summary.length ? (
        <div style={{ ...card, background: "rgba(0,0,0,.16)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f4b740", marginBottom: 6 }}>📋 The story</div>
          {gp.summary.map((s, i) => <div key={i} style={{ fontSize: 14, color: "#dfe6ff", padding: "2px 0" }}>{s}</div>)}
        </div>
      ) : null}

      {/* projected bracket landing (exact for 1st/2nd; opponent is "as it stands") */}
      <div style={{ ...card, background: "rgba(0,0,0,.16)" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#f4b740", marginBottom: 6 }}>🗂️ Where Group {group} lands in the Round of 32</div>
        <SlotLine pos={1} />
        <SlotLine pos={2} />
        {third && watch ? (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,.1)", fontSize: 13, color: "#9fb0e0" }}>
            <b style={{ color: "#f4cd77" }}>🟡 Best-3rd watch:</b>{" "}
            <Flag code={WC.T[third.k].c} w={18} style={{ border: "1.5px solid #fff", borderRadius: 2, display: "inline-block", verticalAlign: "middle", margin: "0 4px" }} />
            <b style={{ color: "#fff" }}>{teamName(third.k)}</b> — {watch.label} (currently #{watch.rank} of 12 third-placed teams; the top 8 advance).
          </div>
        ) : null}
      </div>

      <div style={{ fontSize: 12, color: "#7e8cc0", lineHeight: 1.5, marginTop: 4 }}>
        🔮 Exact scenarios from every remaining result; the % weights them by each team's world ranking.
        Places use points → goal difference → goals → FIFA rank (head-to-head isn't modelled — same as the table).
        The best-3rd race &amp; bracket opponents depend on other groups, so treat them as a best guess.
      </div>
    </div>
  );
}
window.ProjectionsPanel = ProjectionsPanel;

/* Compact all-12-groups projection grid — the Bracket tab's 🔮 companion to Pool play.
   At-a-glance "who's heading to the Round of 32" that fills the R32 slots above. */
function BracketProjections({ results }) {
  const WC = window.WC;
  results = results || {};
  const key = React.useMemo(() => Object.keys(results)
    .filter((k) => { const r = results[k]; return r && r[0] !== "" && r[1] !== "" && r[0] != null && r[1] != null; })
    .sort().map((k) => k + ":" + results[k][0] + "-" + results[k][1]).join("|"), [results]);
  const proj = React.useMemo(() => window.wcProjections(results), [key]); // eslint-disable-line
  const top2 = (pt) => { let v = Math.round(pt.pTop2 * 100); if (v >= 100 && !pt.clinchedTop2) v = 99; if (v <= 0 && !pt.eliminated && pt.pTop2 > 0) v = 1; return v; };
  const icon = (pt) => pt.clinchedWin ? "👑" : pt.clinchedTop2 ? "✅" : pt.eliminated ? (pt.pThird > 0.005 ? "🟡" : "❌") : "⚔️";
  return (
    <div style={{ background: "rgba(0,0,0,.14)", borderRadius: 14, padding: 12 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#f4b740", marginBottom: 8 }}>🔮 Projections — who's heading to the Round of 32?</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
        {Object.keys(WC.GROUPS).map((g) => {
          const gp = proj.groups[g];
          return (
            <div key={g} style={{ background: "rgba(255,255,255,.05)", borderRadius: 10, padding: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 13, fontWeight: 700, color: "#9fb0e0", marginBottom: 6 }}>
                <span>Group {g}</span>
                <span style={{ fontWeight: 600, color: "#7e8cc0", fontSize: 12 }}>{gp.remainingCount ? gp.remainingCount + " to go" : "final"}</span>
              </div>
              {gp.standings.map((row) => {
                const pt = gp.perTeam[row.k];
                return (
                  <div key={row.k} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", fontSize: 13 }}>
                    <span style={{ width: 16, flex: "none", textAlign: "center" }}>{icon(pt)}</span>
                    <Flag code={WC.T[row.k].c} w={20} style={{ border: "1px solid #fff", borderRadius: 2, flex: "none" }} />
                    <span style={{ flex: 1, minWidth: 0, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{WC.T[row.k].n}</span>
                    <span style={{ width: 46, height: 7, borderRadius: 4, background: "rgba(255,255,255,.12)", overflow: "hidden", flex: "none", display: "flex" }}>
                      <span style={{ width: top2(pt) + "%", background: "#34c77b" }} />
                      <span style={{ width: Math.round(pt.pThird * 100) + "%", background: "#f4b740" }} />
                    </span>
                    <span style={{ width: 32, textAlign: "right", color: "#34c77b", fontWeight: 700, flex: "none" }}>{top2(pt)}%</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11.5, color: "#7e8cc0", marginTop: 8 }}>
        🟢 chance to finish top 2 · 🟡 best-3rd hopes · 👑 won group · ✅ through · ❌ out — exact from every remaining result.
        Full detail on the 📊 Standings tab → 🔮 Projections.
      </div>
    </div>
  );
}
window.BracketProjections = BracketProjections;
