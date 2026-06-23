/* Hub · Standings tab — enter scores, table computes live (TV-friendly). */
function Stepper({ value, onChange }) {
  const v = value === "" || value == null ? "" : +value;
  const inc = () => onChange(v === "" ? 0 : Math.min(19, v + 1));
  const dec = () => onChange(v === "" ? "" : v <= 0 ? "" : v - 1);
  const btn = { width: 38, height: 38, borderRadius: 10, border: "none", cursor: "pointer", fontSize: 22, fontWeight: 700, lineHeight: 1, color: "#16235a", background: "#e7eefc" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <button style={btn} onClick={dec}>−</button>
      <span style={{ minWidth: 30, textAlign: "center", fontSize: 26, fontWeight: 700, color: "#fff" }}>{v === "" ? "–" : v}</span>
      <button style={{ ...btn, background: "#f4b740" }} onClick={inc}>+</button>
    </span>
  );
}

/* Knockout score view — see who's playing each knockout game and (in spoiler-free /
   manual mode) type the scores. Winners feed the bracket's auto-advance. In live mode
   the scores come from the feed and are shown read-only. */
function feedScoreOf(liveFeed, top, bot) {
  if (!liveFeed || !top || !bot || !Array.isArray(liveFeed.matches)) return null;
  for (const m of liveFeed.matches) {
    if (m.hg == null || m.ag == null) continue;
    if (m.home === top && m.away === bot) return { tg: m.hg, bg: m.ag, status: m.status };
    if (m.home === bot && m.away === top) return { tg: m.ag, bg: m.hg, status: m.status };
  }
  return null;
}
function KnockoutPanel({ results, koResults, setKoResult, liveFeed }) {
  const WC = window.WC, KO_M = WC.KO_M;
  koResults = koResults || {};
  const res = window.wcResolveBracket ? window.wcResolveBracket(results, liveFeed, koResults) : { matchTeams: {}, winners: {} };
  const teams = res.matchTeams || {}, winners = res.winners || {};
  const ROUNDS = [
    { r: "R32", label: "Round of 32" }, { r: "R16", label: "Round of 16" },
    { r: "QF", label: "Quarter-finals" }, { r: "SF", label: "Semi-finals" },
    { r: "3RD", label: "3rd-place play-off" }, { r: "FINAL", label: "Final" },
  ];
  const TeamRow = ({ no, side, code, feeder, win, score, editable }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
      {code ? <Flag code={WC.T[code].c} w={30} style={{ border: "2px solid #fff", borderRadius: 3, flex: "none", opacity: win === false ? 0.45 : 1 }} />
        : <span style={{ width: 30, flex: "none" }} />}
      <span style={{ flex: 1, fontSize: 15, fontWeight: code ? 700 : 500, color: code ? (win === false ? "#9fb0e0" : "#fff") : "#8fa0d0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {code ? WC.T[code].n : WC.feeder(feeder, false)}{win ? " ✓" : ""}
      </span>
      {editable ? <Stepper value={score} onChange={(v) => setKoResult(no, side, v)} />
        : <span style={{ minWidth: 30, textAlign: "center", fontSize: 24, fontWeight: 700, color: "#fff" }}>{score === "" || score == null ? "–" : score}</span>}
    </div>
  );
  return (
    <div style={{ flex: 1, minHeight: 0, overflow: "auto", background: "rgba(255,255,255,.06)", borderRadius: 18, padding: 18 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#f4b740", marginBottom: 4 }}>🏆 Knockout games — {liveFeed ? "live scores 🔴" : "type the scores"}</div>
      <div style={{ fontSize: 13, color: "#9fb0e0", marginBottom: 14 }}>Winners advance to the next round on your 🗂️ Bracket (with “Auto-advance the bracket” on). Penalty shoot-outs: pick the winner by hand on the Bracket.</div>
      {ROUNDS.map((rd) => {
        const ms = Object.keys(KO_M).map(Number).filter((no) => KO_M[no].round === rd.r).sort((a, b) => a - b);
        return (
          <div key={rd.r} style={{ marginBottom: 16 }}>
            <div style={{ display: "inline-block", background: "#f4b740", color: "#16235a", fontWeight: 700, fontSize: 13, padding: "3px 12px", borderRadius: 20, marginBottom: 8 }}>{rd.label}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
              {ms.map((no) => {
                const m = KO_M[no], t = teams[no] || {}, w = winners[no];
                const fs = feedScoreOf(liveFeed, t.top, t.bot);
                const known = !!(t.top && t.bot), editable = known && !fs;
                const er = koResults[no] || ["", ""];
                const topScore = fs ? fs.tg : er[0], botScore = fs ? fs.bg : er[1];
                return (
                  <div key={no} style={{ background: "rgba(255,255,255,.05)", borderRadius: 12, padding: "10px 12px" }}>
                    <div style={{ fontSize: 11.5, color: "#9fb0e0", marginBottom: 4 }}><span style={{ color: "#f4b740", fontWeight: 700 }}>M{m.no}</span> · {m.date}{m.city ? " · 📍 " + m.city : ""}{fs && fs.status ? " · " + fs.status : ""}</div>
                    <TeamRow no={no} side={0} code={t.top} feeder={m.top} win={w ? w === t.top : undefined} score={topScore} editable={editable} />
                    <TeamRow no={no} side={1} code={t.bot} feeder={m.bottom} win={w ? w === t.bot : undefined} score={botScore} editable={editable} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* FLIP: when the standings reorder (a live goal!), slide each row from its old spot
   to its new one and flash it — so you can watch teams climb and fall in real time. */
function useFlip() {
  const ref = React.useRef(null);
  const prev = React.useRef({});
  React.useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const nodes = el.querySelectorAll("[data-flip]");
    const present = {};
    nodes.forEach((node) => {
      const key = node.getAttribute("data-flip"); present[key] = 1;
      const top = node.offsetTop, old = prev.current[key];
      prev.current[key] = top;
      if (old != null && old !== top) {
        if (typeof node.animate === "function") {
          try { node.animate([{ transform: "translateY(" + (old - top) + "px)" }, { transform: "translateY(0)" }], { duration: 650, easing: "cubic-bezier(.2,.8,.2,1)" }); } catch (e) {}
        }
        node.classList.remove("wc-moved"); void node.offsetWidth; node.classList.add("wc-moved");
      }
    });
    Object.keys(prev.current).forEach((k) => { if (!present[k]) delete prev.current[k]; });
  });
  return ref;
}
function FlipRows({ children, style }) {
  const ref = useFlip();
  return <div ref={ref} style={style}>{children}</div>;
}
// teams currently in a live / half-time match — drives the 🔴 pulse.
function liveTeamSet(status) {
  const WC = window.WC, set = {};
  Object.keys(status || {}).forEach((k) => {
    const st = status[k]; if (st !== "LIVE" && st !== "HT") return;
    const m = /^([A-L])-(\d+)$/.exec(k); if (!m) return;
    const fx = (WC.FIXTURES[m[1]] || [])[+m[2]]; if (!fx) return;
    set[fx[0]] = 1; set[fx[1]] = 1;
  });
  return set;
}
window.FlipRows = FlipRows;        // reused by the Home tab's live tables
window.liveTeamSet = liveTeamSet;

/* Standings sliced by finishing place — all 12 group winners, all 12 runners-up,
   all 12 third-place teams (best 8 advance), all 12 fourth-place teams. */
function PlacesPanel({ results, status }) {
  const liveSet = liveTeamSet(status);
  const WC = window.WC;
  const GC = { A:"#e2473b",B:"#2f6fe0",C:"#1f9d57",D:"#f08a24",E:"#8a5cd1",F:"#13a8a8",G:"#e64f9b",H:"#d9a316",I:"#3f51c4",J:"#d8463c",K:"#1d77c9",L:"#2f9e4f" };
  const PT = window.wcPositionTables(results || {});
  const [only, setOnly] = React.useState("all");
  const GRID = "26px 24px minmax(64px,1fr) repeat(4, 22px) 34px 36px";
  const SECTIONS = [
    { key: "first",  rows: PT.first,  title: "🥇 Group winners — 1st place", note: "All 12 advance. Ranked against each other (a stronger finish earns a kinder Round-of-32 draw).", kind: "adv" },
    { key: "second", rows: PT.second, title: "🥈 Runners-up — 2nd place",     note: "All 12 advance.", kind: "adv" },
    { key: "third",  rows: PT.third,  title: "🥉 Third place — best 8 of 12 advance", note: "The Round-of-32 race. As it stands, the top 8 go through and the bottom 4 are out.", kind: "third" },
    { key: "fourth", rows: PT.fourth, title: "4th place — eliminated",        note: "Bottom of each group — out of the tournament.", kind: "out" },
  ];
  const advColor = (sec, i) => sec.kind === "out" ? false : sec.kind === "third" ? (i < PT.thirdAdvance) : true;
  const chip = (id, label) => (
    <button key={id} onClick={() => setOnly(id)} style={{ border: "none", cursor: "pointer", borderRadius: 20, padding: "6px 13px", fontSize: 14, fontWeight: 700,
      background: only === id ? "#f4b740" : "rgba(255,255,255,.1)", color: only === id ? "#16235a" : "#dfe6ff" }}>{label}</button>
  );
  const headRow = (
    <div style={{ display: "grid", gridTemplateColumns: GRID, gap: "0 4px", alignItems: "center", fontSize: 12, color: "#9fb0e0", fontWeight: 700, padding: "0 6px 5px" }}>
      <span></span><span></span><span></span>
      {["P","W","D","L"].map((h) => <span key={h} style={{ textAlign: "center" }}>{h}</span>)}
      <span style={{ textAlign: "center" }}>GD</span>
      <span style={{ textAlign: "center", color: "#f4b740" }}>Pts</span>
    </div>
  );
  const row = (sec, r, i) => {
    const adv = advColor(sec, i);
    const bg = adv === false ? "rgba(226,71,59,.13)" : adv ? "rgba(52,199,123,.14)" : "transparent";
    return (
      <div key={r.g + r.k} data-flip={r.g + r.k} style={{ display: "grid", gridTemplateColumns: GRID, gap: "0 4px", alignItems: "center", padding: "8px 6px", borderTop: "1px solid rgba(255,255,255,.07)", background: bg, borderRadius: 8 }}>
        <span style={{ textAlign: "center", fontWeight: 700, color: adv === false ? "#ff9c93" : adv ? "#34c77b" : "#9fb0e0" }}>{r.rank}</span>
        <span style={{ width: 22, height: 22, borderRadius: 6, background: GC[r.g], color: "#fff", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{r.g}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
          <Flag code={WC.T[r.k].c} w={26} style={{ border: "2px solid #fff", borderRadius: 3, flex: "none" }} />
          <span style={{ fontSize: 15, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{WC.T[r.k].n}</span>
          {liveSet[r.k] && <span className="wc-live-dot" title="Playing now" />}
        </span>
        {[r.p, r.w, r.d, r.l].map((n, j) => <span key={j} style={{ textAlign: "center", fontSize: 14, color: "#dfe6ff" }}>{n}</span>)}
        <span style={{ textAlign: "center", fontSize: 14, color: "#dfe6ff" }}>{(r.gd > 0 ? "+" : "") + r.gd}</span>
        <span style={{ textAlign: "center", fontSize: 17, fontWeight: 700, color: "#fff" }}>{r.pts}</span>
      </div>
    );
  };
  return (
    <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 14, color: "#9fb0e0" }}>Standings by finishing place — based on current standings.</div>
        <span style={{ display: "flex", gap: 8, marginLeft: "auto", flexWrap: "wrap" }}>
          {chip("all", "All")}{chip("first", "🥇 1st")}{chip("second", "🥈 2nd")}{chip("third", "🥉 3rd")}{chip("fourth", "4th")}
        </span>
      </div>
      {SECTIONS.filter((s) => only === "all" || only === s.key).map((sec) => (
        <div key={sec.key} style={{ background: "rgba(255,255,255,.06)", borderRadius: 18, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: "#f4b740", marginBottom: 2 }}>{sec.title}</div>
          <div style={{ fontSize: 13, color: "#9fb0e0", marginBottom: 10 }}>{sec.note}</div>
          {headRow}
          <FlipRows>
            {sec.rows.map((r, i) => (
              <React.Fragment key={r.g + r.k}>
                {row(sec, r, i)}
                {sec.kind === "third" && i === PT.thirdAdvance - 1 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px", margin: "2px 0" }}>
                    <div style={{ flex: 1, borderTop: "2px dashed rgba(244,183,64,.6)" }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#f4b740", whiteSpace: "nowrap" }}>✂ best-8 cutoff · need ≥ {PT.thirdCutoffPts} pts to advance</span>
                    <div style={{ flex: 1, borderTop: "2px dashed rgba(244,183,64,.6)" }} />
                  </div>
                )}
              </React.Fragment>
            ))}
          </FlipRows>
        </div>
      ))}
    </div>
  );
}

function StandingsTab({ results, live, status, setResult, koResults, setKoResult, liveFeed, initialView }) {
  const WC = window.WC;
  results = results || {};
  status = status || {};
  const [g, setG] = React.useState("A");
  const [view, setView] = React.useState(initialView === "proj" ? "proj" : "table");
  const groups = Object.keys(WC.GROUPS);
  const isKO = g === "KO";
  const isPlace = g === "PLACE";
  const fixtures = WC.FIXTURES[g] || [];
  const table = (isKO || isPlace) ? [] : window.computeStandings(g, results);
  const liveSet = liveTeamSet(status);
  const GC = { A:"#e2473b",B:"#2f6fe0",C:"#1f9d57",D:"#f08a24",E:"#8a5cd1",F:"#13a8a8",G:"#e64f9b",H:"#d9a316",I:"#3f51c4",J:"#d8463c",K:"#1d77c9",L:"#2f9e4f" };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 16 }}>
      {/* group selector */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {groups.map((x) => (
          <button key={x} onClick={() => setG(x)}
            style={{ width: 52, height: 52, borderRadius: 14, border: "none", cursor: "pointer", fontSize: 22, fontWeight: 700,
              background: x === g ? GC[x] : "rgba(255,255,255,.1)", color: "#fff", boxShadow: x === g ? "0 4px 0 rgba(0,0,0,.25)" : "none" }}>{x}</button>
        ))}
        <button onClick={() => setG("KO")}
          style={{ height: 52, padding: "0 16px", borderRadius: 14, border: "none", cursor: "pointer", fontSize: 16, fontWeight: 700,
            background: g === "KO" ? "#f4b740" : "rgba(255,255,255,.1)", color: g === "KO" ? "#16235a" : "#fff", boxShadow: g === "KO" ? "0 4px 0 rgba(0,0,0,.25)" : "none" }}>🏆 Knockout</button>
        <button onClick={() => setG("PLACE")}
          style={{ height: 52, padding: "0 16px", borderRadius: 14, border: "none", cursor: "pointer", fontSize: 16, fontWeight: 700,
            background: isPlace ? "#f4b740" : "rgba(255,255,255,.1)", color: isPlace ? "#16235a" : "#fff", boxShadow: isPlace ? "0 4px 0 rgba(0,0,0,.25)" : "none" }}>🥇 By place</button>
        {!isKO && !isPlace && (
          <span style={{ marginLeft: "auto", display: "inline-flex", background: "rgba(255,255,255,.08)", borderRadius: 14, padding: 4, alignSelf: "center" }}>
            {[["table", "📊 Table"], ["proj", "🔮 Projections"]].map(([id, label]) => (
              <button key={id} onClick={() => setView(id)}
                style={{ height: 44, padding: "0 14px", borderRadius: 11, border: "none", cursor: "pointer", fontSize: 15, fontWeight: 700,
                  background: view === id ? "#f4b740" : "transparent", color: view === id ? "#16235a" : "#dfe6ff" }}>{label}</button>
            ))}
          </span>
        )}
      </div>

      {g === "KO" ? (
        <KnockoutPanel results={results} koResults={koResults} setKoResult={setKoResult} liveFeed={liveFeed} />
      ) : isPlace ? (
        <PlacesPanel results={results} status={status} />
      ) : view === "proj" ? (
        <window.ProjectionsPanel group={g} results={results} />
      ) : (
      <div style={{ display: "flex", gap: 20, flex: 1, minHeight: 0 }}>
        {/* fixtures with score entry */}
        <div style={{ flex: "1 1 0", background: "rgba(255,255,255,.06)", borderRadius: 18, padding: 18, overflow: "auto" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#f4b740", marginBottom: 12 }}>Group {g} — {live ? "scores update automatically 🔴" : "enter the scores"}</div>
          {fixtures.map((f, i) => {
            const key = g + "-" + i;
            const r = results[key] || ["", ""];
            const st = status[key];
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < 5 ? "1px solid rgba(255,255,255,.1)" : "none" }}>
                <span style={{ fontSize: 13, color: "#9fb0e0", width: 92, flex: "none" }}>{f[2]} · {f[3]}{st ? " · " + st : ""}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, justifyContent: "flex-end" }}>
                  <span style={{ fontSize: 18, fontWeight: 600, color: "#fff", textAlign: "right" }}>{WC.T[f[0]].n}</span>
                  <Flag code={WC.T[f[0]].c} w={36} style={{ border: "2px solid #fff", borderRadius: 4, flex: "none" }} />
                </span>
                {live ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 96, justifyContent: "center" }}>
                    <span style={{ fontSize: 26, fontWeight: 700, color: "#fff" }}>{r[0] === "" ? "–" : r[0]}</span>
                    <span style={{ color: "#6f86c9", fontWeight: 700 }}>:</span>
                    <span style={{ fontSize: 26, fontWeight: 700, color: "#fff" }}>{r[1] === "" ? "–" : r[1]}</span>
                  </span>
                ) : (
                  <React.Fragment>
                    <Stepper value={r[0]} onChange={(v) => setResult(key, 0, v)} />
                    <span style={{ color: "#6f86c9", fontWeight: 700 }}>:</span>
                    <Stepper value={r[1]} onChange={(v) => setResult(key, 1, v)} />
                  </React.Fragment>
                )}
                <span style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                  <Flag code={WC.T[f[1]].c} w={36} style={{ border: "2px solid #fff", borderRadius: 4, flex: "none" }} />
                  <span style={{ fontSize: 18, fontWeight: 600, color: "#fff" }}>{WC.T[f[1]].n}</span>
                </span>
              </div>
            );
          })}
        </div>

        {/* live table */}
        <div style={{ flex: "1 1 0", background: "rgba(255,255,255,.06)", borderRadius: 18, padding: 18, overflow: "auto" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#f4b740", marginBottom: 12 }}>Live table</div>
          <div style={{ display: "grid", gridTemplateColumns: "26px minmax(74px,1fr) repeat(6, 30px) 40px", gap: "0 4px", alignItems: "center", fontSize: 13, color: "#9fb0e0", fontWeight: 700, paddingBottom: 6 }}>
            <span></span><span></span>
            {["P","W","D","L","GF","GA"].map((h) => <span key={h} style={{ textAlign: "center" }}>{h}</span>)}
            <span style={{ textAlign: "center", color: "#f4b740" }}>Pts</span>
          </div>
          <FlipRows>
          {table.map((row, idx) => {
            const adv = idx < 2, third = idx === 2;
            return (
              <div key={row.k} data-flip={row.k} style={{ display: "grid", gridTemplateColumns: "26px minmax(74px,1fr) repeat(6, 30px) 40px", gap: "0 4px", alignItems: "center", padding: "9px 0", borderTop: "1px solid rgba(255,255,255,.08)",
                background: adv ? "rgba(52,199,123,.16)" : third ? "rgba(244,183,64,.14)" : "transparent", borderRadius: 8 }}>
                <span style={{ textAlign: "center", fontWeight: 700, color: adv ? "#34c77b" : third ? "#f4b740" : "#9fb0e0" }}>{idx + 1}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <Flag code={WC.T[row.k].c} w={30} style={{ border: "2px solid #fff", borderRadius: 3, flex: "none" }} />
                  <span style={{ fontSize: 16, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{WC.T[row.k].n}</span>
                  {liveSet[row.k] && <span className="wc-live-dot" title="Playing now" />}
                </span>
                {[row.p, row.w, row.d, row.l, row.gf, row.ga].map((n, j) => <span key={j} style={{ textAlign: "center", fontSize: 15, color: "#dfe6ff" }}>{n}</span>)}
                <span style={{ textAlign: "center", fontSize: 18, fontWeight: 700, color: "#fff" }}>{row.pts}</span>
              </div>
            );
          })}
          </FlipRows>
          <div style={{ marginTop: 14, fontSize: 13, color: "#9fb0e0", lineHeight: 1.4 }}>
            <span style={{ color: "#34c77b", fontWeight: 700 }}>● Top 2 advance</span> &nbsp;·&nbsp;
            <span style={{ color: "#f4b740", fontWeight: 700 }}>● 3rd may advance</span> (8 best 3rd-place teams).<br />
            Ranked by points → goal difference → goals. FIFA also uses head-to-head &amp; fair-play.
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
window.StandingsTab = StandingsTab;
