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

function StandingsTab({ results, live, status, setResult }) {
  const WC = window.WC;
  results = results || {};
  status = status || {};
  const [g, setG] = React.useState("A");
  const groups = Object.keys(WC.GROUPS);
  const fixtures = WC.FIXTURES[g];
  const table = window.computeStandings(g, results);
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
      </div>

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
          {table.map((row, idx) => {
            const adv = idx < 2, third = idx === 2;
            return (
              <div key={row.k} style={{ display: "grid", gridTemplateColumns: "26px minmax(74px,1fr) repeat(6, 30px) 40px", gap: "0 4px", alignItems: "center", padding: "9px 0", borderTop: "1px solid rgba(255,255,255,.08)",
                background: adv ? "rgba(52,199,123,.16)" : third ? "rgba(244,183,64,.14)" : "transparent", borderRadius: 8 }}>
                <span style={{ textAlign: "center", fontWeight: 700, color: adv ? "#34c77b" : third ? "#f4b740" : "#9fb0e0" }}>{idx + 1}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <Flag code={WC.T[row.k].c} w={30} style={{ border: "2px solid #fff", borderRadius: 3, flex: "none" }} />
                  <span style={{ fontSize: 16, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{WC.T[row.k].n}</span>
                </span>
                {[row.p, row.w, row.d, row.l, row.gf, row.ga].map((n, j) => <span key={j} style={{ textAlign: "center", fontSize: 15, color: "#dfe6ff" }}>{n}</span>)}
                <span style={{ textAlign: "center", fontSize: 18, fontWeight: 700, color: "#fff" }}>{row.pts}</span>
              </div>
            );
          })}
          <div style={{ marginTop: 14, fontSize: 13, color: "#9fb0e0", lineHeight: 1.4 }}>
            <span style={{ color: "#34c77b", fontWeight: 700 }}>● Top 2 advance</span> &nbsp;·&nbsp;
            <span style={{ color: "#f4b740", fontWeight: 700 }}>● 3rd may advance</span> (8 best 3rd-place teams).<br />
            Ranked by points → goal difference → goals. FIFA also uses head-to-head &amp; fair-play.
          </div>
        </div>
      </div>
    </div>
  );
}
window.StandingsTab = StandingsTab;
