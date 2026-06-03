/* Bottom-band info panels for the poster. */
const PANEL = { background: "#fff", borderRadius: 18, padding: "12px 16px", boxShadow: "0 5px 0 rgba(0,0,0,.12)", boxSizing: "border-box" };

function TiebreakPanel() {
  const url = (window.TWEAKS || {}).nasUrl || "http://pi-nas.local/worldcup";
  return (
    <div style={{ ...PANEL, flex: "1 1 0", display: "flex", flexDirection: "column" }}>
      <div style={{ fontWeight: 700, fontSize: 20, color: INK, marginBottom: 2 }}>⚖️ How a group is won</div>
      <div style={{ fontSize: 13, color: "#5a6275", marginBottom: 8 }}>Tied on points? Go down this list until someone wins. <b style={{ color: "#e2473b" }}>New rules for 2026!</b></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 14px" }}>
        {WC.TIEBREAK.map((t) => {
          const isNew = t.n === 2 || t.n === 8;
          return (
            <div key={t.n} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: isNew ? "#e2473b" : NAVY, color: "#fff", fontWeight: 700, fontSize: 12, display: "grid", placeItems: "center", flex: "none", marginTop: 1 }}>{t.n}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: INK }}>{t.t} {isNew && <span style={{ fontSize: 10, color: "#fff", background: "#e2473b", borderRadius: 10, padding: "0 6px", verticalAlign: "middle" }}>NEW</span>}</div>
                <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.15 }}>{t.d}</div>
              </div>
            </div>
          );
        })}
      </div>
      {/* QR -> interactive version on the family Pi-NAS / TV */}
      <div style={{ marginTop: "auto", paddingTop: 10, borderTop: "2px dashed #e3e8f2", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ border: "3px solid #16235a", borderRadius: 10, padding: 4, background: "#fff", flex: "none" }}>
          <QR text={url} size={78} fg="#16235a" bg="#ffffff" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: INK }}>📺 Watch it come alive on the TV</div>
          <div style={{ fontSize: 12.5, color: "#5a6275", lineHeight: 1.25, marginTop: 2 }}>Scan to open the live bracket, schedule, standings & where-to-watch on the family screen.</div>
          <div style={{ fontSize: 12, color: "#2f6fe0", fontWeight: 700, marginTop: 3 }}>{url.replace(/^https?:\/\//, "")}</div>
        </div>
      </div>
    </div>
  );
}

function HowToPlayPanel() {
  const steps = [
    "After each game, fill the W / D / L and goal boxes.",
    "Add up points — Win = 3, Draw = 1, Loss = 0.",
    "Top 2 teams in every group advance… plus the 8 best 3rd-place teams!",
    "Use the circles ◯ to rank the 3rd-place teams.",
    "Cut out flags and stick the winners into the bracket. 🏆",
  ];
  return (
    <div style={{ ...PANEL, flex: "1 1 0", background: GOLD }}>
      <div style={{ fontWeight: 700, fontSize: 20, color: NAVY, marginBottom: 6 }}>🖍️ How to play</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
            <span style={{ width: 24, height: 24, borderRadius: "50%", background: NAVY, color: GOLD, fontWeight: 700, fontSize: 13, display: "grid", placeItems: "center", flex: "none" }}>{i + 1}</span>
            <span style={{ fontSize: 14.5, color: NAVY, fontWeight: 500, lineHeight: 1.2 }}>{s}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8, fontSize: 12.5, color: NAVY, background: "#fff7e3", borderRadius: 10, padding: "6px 9px", fontWeight: 600 }}>
        Group stage: Jun 11–27 · then knockouts to the Final on Jul 19!
        <div style={{ marginTop: 4, fontWeight: 500 }}>🕓 <b>Time-zone helper</b> — games run on U.S. Eastern time. Add to get yours: London +5h · Madrid/Paris +6h · Lagos +5h · Jo'burg +6h · Dubai +8h · India +9½h · Tokyo +13h · Sydney +14h.</div>
      </div>
    </div>
  );
}

function FactsPanel() {
  return (
    <div style={{ ...PANEL, flex: "1 1 0", background: NAVY2 }}>
      <div style={{ fontWeight: 700, fontSize: 20, color: GOLD, marginBottom: 6 }}>⭐ Fun facts</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 8 }}>
        {WC.RECORDS.map((r, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,.08)", borderRadius: 10, padding: "5px 8px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 19, color: GOLD, flex: "none" }}>{r.big}</span>
            <span style={{ fontSize: 11.5, color: "#dfe6ff", lineHeight: 1.1 }}>{r.small}</span>
          </div>
        ))}
      </div>
      <div style={{ fontWeight: 700, fontSize: 13, color: "#fff", marginBottom: 4 }}>🏆 Past champions</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {WC.PAST_WINNERS.map((p, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,.1)", borderRadius: 20, padding: "2px 8px 2px 3px" }}>
            <Flag code={p.c} w={22} style={{ borderRadius: 3, border: "1.5px solid #fff" }} />
            <span style={{ fontSize: 11.5, color: "#dfe6ff", fontWeight: 600 }}>{p.y}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function MapPanel() {
  return (
    <div style={{ ...PANEL, flex: "1.85 1 0", display: "flex", flexDirection: "column" }}>
      <div style={{ fontWeight: 700, fontSize: 20, color: INK }}>📍 Where the games are played</div>
      <div style={{ fontSize: 13, color: "#5a6275", marginBottom: 6 }}>16 cities · the number matches the games in each group ↑</div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 12 }}>
        <div style={{ flex: "1 1 0", minWidth: 0 }}><StadiumMap /></div>
        <div style={{ flex: "1.15 1 0", display: "grid", gridTemplateRows: "repeat(8,1fr)", gridAutoFlow: "column", gap: "2px 14px", alignContent: "center" }}>
          {WC.CITIES.map((c) => (
            <div key={c.pin} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 18, height: 18, borderRadius: "50%", background: NATC[c.nat], color: "#fff", fontWeight: 700, fontSize: 10, display: "grid", placeItems: "center", flex: "none" }}>{c.pin}</span>
              <span style={{ fontSize: 12, color: INK, fontWeight: 600, whiteSpace: "nowrap" }}>{c.city}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { TiebreakPanel, HowToPlayPanel, FactsPanel, MapPanel });
