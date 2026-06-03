/* ============ World Cup 2026 poster building blocks (Sticker style) ============ */
const WC = window.WC;
const GOLD = "#f4b740", NAVY = "#16235a", NAVY2 = "#0f1f4d", INK = "#1d2433";
const GROUP_COLORS = {
  A:"#e2473b", B:"#2f6fe0", C:"#1f9d57", D:"#f08a24", E:"#8a5cd1", F:"#13a8a8",
  G:"#e64f9b", H:"#d9a316", I:"#3f51c4", J:"#d8463c", K:"#1d77c9", L:"#2f9e4f",
};
const cityObj = (name) => WC.CITIES.find((c) => c.city === name) || { pin: "?", nat: "US" };
const NATC = { CA: "#e2473b", US: "#2f6fe0", MX: "#1f9d57" };

/* sticker flag (white border + soft shadow, tiny tilt) */
function SFlag({ code, w = 54, rot = -2 }) {
  return (
    <span style={{ display: "inline-block", transform: `rotate(${rot}deg)`, flex: "none" }}>
      <Flag code={code} w={w} style={{ border: "3px solid #fff", borderRadius: 5, boxShadow: "0 2px 0 rgba(0,0,0,.18),0 3px 7px rgba(0,0,0,.18)" }} />
    </span>
  );
}

/* tiny pin chip used in fixtures, linked to the map number */
function PinChip({ city }) {
  const o = cityObj(city);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
      <span style={{ width: 18, height: 18, borderRadius: "50%", background: NATC[o.nat], color: "#fff", fontWeight: 700, fontSize: 11, display: "grid", placeItems: "center", flex: "none" }}>{o.pin}</span>
      <span style={{ fontSize: 13, color: "#5a6275", fontWeight: 500 }}>{city}</span>
    </span>
  );
}

/* ---------- GROUP CARD: standings (left) + fixtures (right) ---------- */
function GroupCard({ letter }) {
  const color = GROUP_COLORS[letter];
  const teams = WC.GROUPS[letter].map((k) => ({ k, ...WC.T[k] }));
  const fixtures = WC.FIXTURES[letter];
  const box = { width: 26, height: 26, borderRadius: 7, background: "#fff", border: "2px solid #d6ddec", flex: "none" };
  const showSchedule = (window.TWEAKS || {}).showSchedule !== false;
  return (
    <div style={{ background: "#fff", borderRadius: 18, padding: "10px 12px", boxShadow: "0 5px 0 rgba(0,0,0,.12)", display: "flex", gap: 12 }}>
      {/* left: standings */}
      <div style={{ flex: showSchedule ? "1 1 56%" : "1 1 100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ background: color, color: "#fff", fontWeight: 700, fontSize: 26, width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", boxShadow: "0 3px 0 rgba(0,0,0,.18)" }}>{letter}</span>
          <span style={{ fontWeight: 700, fontSize: 24, color: INK, whiteSpace: "nowrap" }}>Group {letter}</span>
          <span style={{ marginLeft: "auto", display: "flex", gap: 5, color: "#9aa2b4", fontWeight: 700, fontSize: 11 }}>
            {["W","D","L","GF","GA","Pts"].map((h) => <span key={h} style={{ width: 26, textAlign: "center" }}>{h}</span>)}
          </span>
        </div>
        {teams.map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, background: "#f1f4fb", borderRadius: 10, padding: "5px 8px", marginBottom: 5 }}>
            <span style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${color}`, flex: "none" }} title="rank 3rd-place teams here"></span>
            <SFlag code={t.c} w={46} rot={i % 2 ? 2 : -2} />
            <span style={{ fontWeight: 600, fontSize: 17, color: INK, flex: 1, lineHeight: 1.05 }}>{t.n}</span>
            <span style={{ fontWeight: 700, fontSize: 11, color: "#fff", background: color, borderRadius: 20, padding: "1px 7px", flex: "none" }}>#{t.r}</span>
            <span style={{ display: "flex", gap: 5 }}>
              {[0,0,0,0,0].map((_, j) => <span key={j} style={box}></span>)}
              <span style={{ ...box, background: GOLD, border: "2px solid #d9a316" }}></span>
            </span>
          </div>
        ))}
      </div>
      {/* right: fixtures */}
      {showSchedule && (
      <div style={{ flex: "1 1 44%", borderLeft: "2px dashed #e3e8f2", paddingLeft: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: color, marginBottom: 4, letterSpacing: .5 }}>MATCHES & STADIUMS</div>
        {fixtures.map((f, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, padding: "3px 0", borderBottom: i < 5 ? "1px solid #eef1f8" : "none" }}>
            {window.TILED_LIGHT ? (
              <span style={{ fontSize: 12, fontWeight: 700, color: INK, width: 86, flex: "none" }}>{f[0]} <span style={{ color: "#9aa2b4" }}>v</span> {f[1]}</span>
            ) : (
              <React.Fragment>
                <Flag code={WC.T[f[0]].c} w={24} style={{ border: "1.5px solid #fff", borderRadius: 3, boxShadow: "0 1px 2px rgba(0,0,0,.2)", flex: "none" }} />
                <span style={{ fontSize: 11, color: "#9aa2b4", fontWeight: 700 }}>v</span>
                <Flag code={WC.T[f[1]].c} w={24} style={{ border: "1.5px solid #fff", borderRadius: 3, boxShadow: "0 1px 2px rgba(0,0,0,.2)", flex: "none" }} />
              </React.Fragment>
            )}
            <span style={{ fontSize: 13, fontWeight: 700, color: INK, width: 46, flex: "none" }}>{f[2]}</span>
            <PinChip city={f[3]} />
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

/* ---------- KNOCKOUT BRACKET ---------- */
function Slot({ label }) {
  return (
    <div style={{ height: 26, border: "2px dashed #6f86c9", borderRadius: 6, background: "rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {label && <span style={{ fontSize: 10.5, color: window.BW ? "#555" : "#9fb3e6", fontWeight: 600, whiteSpace: "nowrap" }}>{label}</span>}
    </div>
  );
}
function Match({ side, round, idx }) {
  const WC = window.WC;
  const lay = ((WC.KO_LAYOUT || {})[side] || {})[round] || [];
  const m = (WC.KO_M || {})[lay[idx]];
  return (
    <div style={{ width: 132, display: "flex", flexDirection: "column", gap: 3, background: "rgba(255,255,255,.06)", padding: 5, borderRadius: 9, border: "1px solid rgba(255,255,255,.12)" }}>
      {m && <div style={{ fontSize: 8.5, color: window.BW ? "#555" : "#8fa0d0", textAlign: "center", lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden" }}>M{m.no} · {m.date} · {m.city}</div>}
      <Slot label={m ? WC.feeder(m.top, true) : null} />
      <Slot label={m ? WC.feeder(m.bottom, true) : null} />
    </div>
  );
}
function RoundColumn({ n, header, headerColor, alignRight, side, round }) {
  const acc = (window.TWEAKS || {}).accent || GOLD;
  const hc = headerColor || acc;
  return (
    <div style={{ display: "flex", flexDirection: "column", minWidth: 142 }}>
      <div style={{ height: 34, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <span style={{ background: hc, color: NAVY2, fontWeight: 700, fontSize: 13, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap", boxShadow: "0 2px 0 rgba(0,0,0,.2)" }}>{header}</span>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-around", alignItems: alignRight ? "flex-end" : "flex-start" }}>
        {Array.from({ length: n }).map((_, i) => <Match key={i} side={side} round={round} idx={i} />)}
      </div>
    </div>
  );
}
/* SVG elbow connector. leaves = matches entering on the wide side. dir 'lr' merges left→right. */
function Connector({ leaves, dir = "lr" }) {
  const acc = (window.TWEAKS || {}).accent || GOLD;
  const pairs = leaves / 2;
  const lines = [];
  for (let j = 0; j < pairs; j++) {
    const ya = ((2 * j + 0.5) / leaves) * 100;
    const yb = ((2 * j + 1.5) / leaves) * 100;
    const yc = (ya + yb) / 2;
    lines.push([0, ya, 50, ya], [0, yb, 50, yb], [50, ya, 50, yb], [50, yc, 100, yc]);
  }
  const flip = dir === "rl";
  return (
    <div style={{ display: "flex", flexDirection: "column", width: 30 }}>
      <div style={{ height: 34 }}></div>
      <div style={{ flex: 1 }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
          <g transform={flip ? "translate(100,0) scale(-1,1)" : ""}>
            {lines.map((l, i) => (
              <line key={i} x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} stroke={acc} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}

function ChampionFinal() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 230, gap: 14 }}>
      <div style={{ background: GOLD, borderRadius: 20, padding: "14px 18px 16px", textAlign: "center", boxShadow: "0 6px 0 rgba(0,0,0,.22)" }}>
        <Trophy size={64} stroke={NAVY} />
        <div style={{ fontWeight: 700, fontSize: 22, color: NAVY, letterSpacing: 1, marginTop: 2 }}>CHAMPION</div>
        <div style={{ width: 168, height: 40, background: "#fff", border: "3px dashed #d9a316", borderRadius: 10, marginTop: 6 }}></div>
      </div>
      <div style={{ background: NAVY2, borderRadius: 16, padding: "10px 14px", textAlign: "center", border: `2px solid ${GOLD}` }}>
        <div style={{ color: GOLD, fontWeight: 700, fontSize: 15 }}>★ FINAL ★</div>
        <div style={{ color: "#cdd9ff", fontSize: 12, marginBottom: 6 }}>Jul 19 · New York/NJ</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, width: 150 }}><Slot /><Slot /></div>
      </div>
      <div style={{ background: "rgba(255,255,255,.08)", borderRadius: 14, padding: "8px 12px", textAlign: "center", border: "2px dashed #6f86c9" }}>
        <div style={{ color: "#ffd98a", fontWeight: 700, fontSize: 12 }}>🥉 3rd place</div>
        <div style={{ color: "#aab6dd", fontSize: 11, marginBottom: 5 }}>Jul 18 · Miami</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, width: 130 }}><Slot /><Slot /></div>
      </div>
    </div>
  );
}

function Bracket() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "stretch", gap: 2, height: "100%" }}>
      <RoundColumn n={8} header="Round of 32" side="L" round="R32" />
      <Connector leaves={8} dir="lr" />
      <RoundColumn n={4} header="Round of 16" side="L" round="R16" />
      <Connector leaves={4} dir="lr" />
      <RoundColumn n={2} header="Quarters" side="L" round="QF" />
      <Connector leaves={2} dir="lr" />
      <RoundColumn n={1} header="Semi" side="L" round="SF" />
      <ChampionFinal />
      <RoundColumn n={1} header="Semi" alignRight side="R" round="SF" />
      <Connector leaves={2} dir="rl" />
      <RoundColumn n={2} header="Quarters" alignRight side="R" round="QF" />
      <Connector leaves={4} dir="rl" />
      <RoundColumn n={4} header="Round of 16" alignRight side="R" round="R16" />
      <Connector leaves={8} dir="rl" />
      <RoundColumn n={8} header="Round of 32" alignRight side="R" round="R32" />
    </div>
  );
}

Object.assign(window, { SFlag, PinChip, GroupCard, Bracket, ChampionFinal });
