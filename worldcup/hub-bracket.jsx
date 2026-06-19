/* Hub · Bracket tab — tap any slot to drop in a team. Saves to the TV. */
function TeamPicker({ onPick, onClose }) {
  const WC = window.WC;
  const [q, setQ] = React.useState("");
  const groups = Object.keys(WC.GROUPS);
  const GOF = {}; groups.forEach((g) => WC.GROUPS[g].forEach((k) => { GOF[k] = g; }));
  const query = q.trim().toLowerCase();
  const filtered = query ? Object.keys(WC.T).filter((k) => WC.T[k].n.toLowerCase().indexOf(query) >= 0).sort((a, b) => WC.T[a].n.localeCompare(WC.T[b].n)) : null;
  const TeamBtn = ({ k }) => (
    <button onClick={() => onPick(k)} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.08)", border: "none", borderRadius: 10, padding: "7px 9px", cursor: "pointer", color: "#fff" }}>
      <Flag code={WC.T[k].c} w={30} style={{ border: "2px solid #fff", borderRadius: 3, flex: "none" }} />
      <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1, textAlign: "left" }}>{WC.T[k].n}</span>
      <span style={{ fontSize: 11, color: "#9fb0e0", fontWeight: 700, flex: "none" }}>{GOF[k]}</span>
    </button>
  );
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(8,16,40,.82)", zIndex: 100, display: "grid", placeItems: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#16235a", borderRadius: 22, padding: 20, maxWidth: 900, width: "100%", maxHeight: "88vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", whiteSpace: "nowrap" }}>Pick a team</div>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔎 Type a country…" style={{ flex: 1, minWidth: 140, fontFamily: "inherit", fontSize: 15, border: "none", borderRadius: 10, padding: "9px 12px", outline: "none" }} />
          <button onClick={() => { onPick(null); }} style={{ border: "none", background: "#e2473b", color: "#fff", fontWeight: 700, borderRadius: 10, padding: "8px 14px", cursor: "pointer", whiteSpace: "nowrap" }}>Clear slot</button>
          <button onClick={onClose} style={{ border: "none", background: "rgba(255,255,255,.15)", color: "#fff", fontWeight: 700, borderRadius: 10, padding: "8px 14px", cursor: "pointer" }}>✕</button>
        </div>
        {filtered ? (
          filtered.length ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 8 }}>{filtered.map((k) => <TeamBtn key={k} k={k} />)}</div>
          ) : <div style={{ color: "#9fb0e0", padding: 12 }}>No team matches “{q}”.</div>
        ) : (
          groups.map((g) => (
            <div key={g} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 13, color: "#9fb0e0", fontWeight: 700, marginBottom: 5 }}>Group {g}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
                {WC.GROUPS[g].map((k) => <TeamBtn key={k} k={k} />)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* compact group-stage standings shown inline under the bracket (Pool-play toggle) */
function PoolsPanel({ results }) {
  const WC = window.WC;
  return (
    <div style={{ background: "rgba(0,0,0,.14)", borderRadius: 14, padding: 12 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#f4b740", marginBottom: 8 }}>📊 Pool play — group standings</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
        {Object.keys(WC.GROUPS).map((g) => {
          const st = window.computeStandings(g, results || {});
          return (
            <div key={g} style={{ background: "rgba(255,255,255,.05)", borderRadius: 10, padding: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#9fb0e0", marginBottom: 5 }}>Group {g}</div>
              {st.map((s, i) => (
                <div key={s.k} style={{ display: "flex", alignItems: "center", gap: 7, padding: "3px 0", fontSize: 13 }}>
                  <span style={{ width: 12, color: i < 2 ? "#34c77b" : i === 2 ? "#f4b740" : "#6f86c9", fontWeight: 700, flex: "none" }}>{i + 1}</span>
                  <Flag code={WC.T[s.k].c} w={20} style={{ border: "1px solid #fff", borderRadius: 2, flex: "none" }} />
                  <span style={{ flex: 1, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{WC.T[s.k].n}</span>
                  <span style={{ color: "#9fb0e0", fontSize: 12, flex: "none" }}>{s.p ? s.w + "-" + s.d + "-" + s.l : "—"}</span>
                  <span style={{ color: "#f4b740", fontWeight: 700, width: 22, textAlign: "right", flex: "none" }}>{s.pts}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11.5, color: "#7e8cc0", marginTop: 8 }}>🟢 top 2 advance · 🟡 best 8 third-place teams advance · enter scores on the 📊 Standings tab.</div>
    </div>
  );
}

function ISlot({ id, store, onOpen, placeholder }) {
  const WC = window.WC;
  const team = store.bracket[id];
  return (
    <button onClick={() => onOpen(id)} title={placeholder || "Pick a team"} style={{ width: 150, height: 34, display: "flex", alignItems: "center", gap: 7, padding: "0 8px",
      border: team ? "2px solid #f4b740" : "2px dashed #6f86c9", borderRadius: 8, cursor: "pointer",
      background: team ? "rgba(244,183,64,.16)" : "rgba(255,255,255,.06)", color: "#fff" }}>
      {team ? <React.Fragment>
        <Flag code={WC.T[team].c} w={24} style={{ border: "1.5px solid #fff", borderRadius: 3, flex: "none" }} />
        <span style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{WC.T[team].n}</span>
      </React.Fragment> : <span style={{ fontSize: 11.5, color: "#8fa0d0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{placeholder || "+ add team"}</span>}
    </button>
  );
}

function HubColumn({ side, round, n, header, store, onOpen, alignRight }) {
  const WC = window.WC;
  const lay = ((WC.KO_LAYOUT || {})[side] || {})[round] || [];
  return (
    <div style={{ display: "flex", flexDirection: "column", minWidth: 160 }}>
      <div style={{ height: 34, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <span style={{ background: "#f4b740", color: "#16235a", fontWeight: 700, fontSize: 13, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>{header}</span>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-around", alignItems: alignRight ? "flex-end" : "flex-start" }}>
        {Array.from({ length: n }).map((_, i) => {
          const m = (WC.KO_M || {})[lay[i]];
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4, background: "rgba(255,255,255,.05)", padding: 6, borderRadius: 9 }}>
              {m && <div style={{ fontSize: 9.5, color: "#9fb0e0", textAlign: "center", lineHeight: 1.15 }}><span style={{ color: "#f4b740", fontWeight: 700 }}>M{m.no}</span> · {m.date}{m.et ? " · " + m.et.replace(" ET", "ET") : ""}<br />📍 {m.city}</div>}
              <ISlot id={`${side}${round}-${i}-0`} store={store} onOpen={onOpen} placeholder={m ? WC.feeder(m.top, true) : null} />
              <ISlot id={`${side}${round}-${i}-1`} store={store} onOpen={onOpen} placeholder={m ? WC.feeder(m.bottom, true) : null} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BracketTab({ store, setPick, results, goHelp }) {
  const [picking, setPicking] = React.useState(null);
  const [sharing, setSharing] = React.useState(false);
  const [bottomView, setBottomView] = React.useState(""); // "" | "pools" | "proj"
  const [printOpen, setPrintOpen] = React.useState(false);
  const toggleBottom = (v) => setBottomView((cur) => (cur === v ? "" : v));
  const onOpen = (id) => setPicking(id);
  const Conn = window.Connector;
  const champ = store.bracket["CHAMP"];
  const WC = window.WC;
  const PRINTS = [
    { href: "World%20Cup%202026%20Bracket.html", label: "🏟️ Big poster (36×24\")" },
    { href: "Bracket%20-%20Print%20at%20Home.html", label: "🏠 Print-at-home (11 pages)" },
    { href: "Flag%20Cutouts.html", label: "✂ Flag cut-outs" },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#f4b740" }}>Tap a slot to fill the bracket</div>
        {goHelp && <HelpLink goHelp={goHelp} id="bracket" label="How the bracket works" />}
        <button onClick={() => toggleBottom("pools")} style={{ marginLeft: "auto", cursor: "pointer", border: bottomView === "pools" ? "2px solid #34c77b" : "2px solid transparent", background: bottomView === "pools" ? "rgba(52,199,123,.18)" : "rgba(255,255,255,.1)", color: bottomView === "pools" ? "#bdf0d3" : "#dfe6ff", borderRadius: 12, padding: "7px 13px", fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" }}>📊 Pool play</button>
        <button onClick={() => toggleBottom("proj")} style={{ cursor: "pointer", border: bottomView === "proj" ? "2px solid #f4b740" : "2px solid transparent", background: bottomView === "proj" ? "rgba(244,183,64,.18)" : "rgba(255,255,255,.1)", color: bottomView === "proj" ? "#ffe8a8" : "#dfe6ff", borderRadius: 12, padding: "7px 13px", fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" }}>🔮 Projections</button>
        <button onClick={() => setPrintOpen((v) => !v)} style={{ border: "none", cursor: "pointer", background: "rgba(255,255,255,.1)", color: "#dfe6ff", borderRadius: 12, padding: "8px 13px", fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" }}>🖨 Print</button>
        <button onClick={() => setSharing(true)} style={{ border: "none", cursor: "pointer", background: "rgba(255,255,255,.1)", color: "#dfe6ff", borderRadius: 12, padding: "8px 13px", fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" }}>📤 Share</button>
        <button onClick={() => setPicking("CHAMP")} style={{ display: "flex", alignItems: "center", gap: 8, background: "#f4b740", color: "#16235a", border: "none", borderRadius: 12, padding: "8px 16px", fontWeight: 700, fontSize: 15, cursor: "pointer", whiteSpace: "nowrap" }}>
          🏆 Champion: {champ ? WC.T[champ].n : "pick"}
        </button>
      </div>
      {printOpen && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {PRINTS.map((p) => (
            <a key={p.href} href={p.href} target="_blank" rel="noopener" style={{ textDecoration: "none", background: "rgba(244,183,64,.16)", color: "#ffe8a8", border: "1px solid rgba(244,183,64,.4)", borderRadius: 10, padding: "8px 13px", fontWeight: 700, fontSize: 13.5 }}>{p.label} ↗</a>
          ))}
          <span style={{ alignSelf: "center", fontSize: 12, color: "#7e8cc0" }}>opens a printable page (color or B&amp;W)</span>
        </div>
      )}
      <div style={{ flex: bottomView ? "1 1 58%" : 1, minHeight: 0, overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "stretch", gap: 2, minWidth: 1500, height: "100%", minHeight: 560 }}>
          <HubColumn side="L" round="R32" n={8} header="Round of 32" store={store} onOpen={onOpen} />
          <Conn leaves={8} dir="lr" />
          <HubColumn side="L" round="R16" n={4} header="Round of 16" store={store} onOpen={onOpen} />
          <Conn leaves={4} dir="lr" />
          <HubColumn side="L" round="QF" n={2} header="Quarters" store={store} onOpen={onOpen} />
          <Conn leaves={2} dir="lr" />
          <HubColumn side="L" round="SF" n={1} header="Semi" store={store} onOpen={onOpen} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 190, gap: 12 }}>
            <Trophy size={56} stroke="#16235a" />
            <div style={{ background: "#f4b740", borderRadius: 14, padding: "8px 12px", textAlign: "center", minWidth: 150 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#16235a" }}>CHAMPION</div>
              <button onClick={() => setPicking("CHAMP")} style={{ marginTop: 4, width: "100%", border: "none", borderRadius: 8, padding: "6px", background: "#16235a", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                {champ ? WC.T[champ].n : "+ pick"}
              </button>
            </div>
            <div style={{ fontSize: 12, color: "#9fb0e0", textAlign: "center", lineHeight: 1.35 }}>★ FINAL · M{(WC.KO_M[104]||{}).no} · {(WC.KO_M[104]||{}).date} ★<br /><span style={{ fontSize: 10.5 }}>📍 {(WC.KO_M[104]||{}).city}</span></div>
          </div>
          <HubColumn side="R" round="SF" n={1} header="Semi" store={store} onOpen={onOpen} alignRight />
          <Conn leaves={2} dir="rl" />
          <HubColumn side="R" round="QF" n={2} header="Quarters" store={store} onOpen={onOpen} alignRight />
          <Conn leaves={4} dir="rl" />
          <HubColumn side="R" round="R16" n={4} header="Round of 16" store={store} onOpen={onOpen} alignRight />
          <Conn leaves={8} dir="rl" />
          <HubColumn side="R" round="R32" n={8} header="Round of 32" store={store} onOpen={onOpen} alignRight />
        </div>
      </div>
      {bottomView && (
        <div style={{ flex: "1 1 42%", minHeight: 0, overflow: "auto", marginTop: 10 }}>
          {bottomView === "pools" ? <PoolsPanel results={results} /> : <window.BracketProjections results={results} />}
        </div>
      )}
      {picking && <TeamPicker onPick={(k) => { setPick(picking, k); setPicking(null); }} onClose={() => setPicking(null)} />}
      {sharing && window.ShareModal && <ShareModal url={location.origin + location.pathname + "?b=" + window.wcShare.encode(store.bracket) + "&tab=bracket"} onClose={() => setSharing(false)} />}
    </div>
  );
}
window.BracketTab = BracketTab;
