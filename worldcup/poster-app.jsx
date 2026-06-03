/* The full poster layout (Title + Poster), shared by the big-format file and
   the tiled home-print file. Renders into a 3600×2400 design space. */
const GOLD2 = "#f4b740";

function Title() {
  const t = window.TWEAKS || {};
  const bw = !!window.BW;
  const accent = bw ? "#111" : (t.accent || GOLD2);
  const main = bw ? "#101010" : "#fff";
  const sub = bw ? "#333" : "#cfe0ff";
  const cred = bw ? "#555" : "#9fb3e6";
  const shadow = bw ? "none" : "0 6px 0 #0d1f57, 0 8px 18px rgba(0,0,0,.35)";
  const label = t.titleText !== undefined ? t.titleText : "Family Bracket";
  return (
    <div style={{ textAlign: "center", padding: "30px 0 6px" }}>
      <div style={{ fontWeight: 700, fontSize: 104, lineHeight: .9, color: main, letterSpacing: -1, textShadow: shadow }}>
        WORLD CUP <span style={{ color: accent }}>2026</span>
      </div>
      <div style={{ fontWeight: 600, fontSize: 30, color: sub, marginTop: 6 }}>
        🇨🇦 Canada &nbsp;·&nbsp; 🇲🇽 Mexico &nbsp;·&nbsp; 🇺🇸 USA{label ? ` — ${label}` : ""} &nbsp;·&nbsp; June 11 – July 19
      </div>
      <div style={{ fontWeight: 500, fontSize: 17, color: cred, marginTop: 8, letterSpacing: .3 }}>
        Published by Craig Merry · Designed with Anthropic Claude Design
      </div>
    </div>
  );
}

function Poster() {
  const t = window.TWEAKS || {};
  const left = ["A","B","C","D","E","F"];
  const right = ["G","H","I","J","K","L"];
  const showMap = t.showMap !== false, showFacts = t.showFacts !== false, confetti = t.confetti !== false;
  return (
    <div style={{ width: "100%", height: "100%", padding: "10px 34px 30px", display: "flex", flexDirection: "column" }}>
      {confetti && [["#f4b740",14,"4%","18%"],["#e2473b",18,"96%","12%"],["#34c77b",14,"2%","82%"],["#ff8a3d",12,"98%","78%"],["#fff",10,"50%","3%"],["#7fd0ff",12,"30%","96%"],["#f4b740",10,"70%","97%"]].map((d,i)=>(
        <span key={i} className="confetti" style={{ width:d[1],height:d[1],background:d[0],left:d[2],top:d[3],opacity:.7 }}></span>
      ))}
      <Title />
      <div style={{ flex: 1, display: "flex", gap: 18, minHeight: 0, marginTop: 6 }}>
        <div style={{ width: 856, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 12 }}>
          {left.map((g) => <GroupCard key={g} letter={g} />)}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, gap: 16 }}>
          <div style={{ flex: "1 1 0", minHeight: 0 }}><Bracket /></div>
          <div style={{ flex: "0 0 600px", display: "flex", gap: 14 }}>
            {showMap && <MapPanel />}
            <TiebreakPanel />
            <div style={{ flex: "1.1 1 0", display: "flex", flexDirection: "column", gap: 14 }}>
              <HowToPlayPanel />
              {showFacts && <FactsPanel />}
            </div>
          </div>
        </div>
        <div style={{ width: 856, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 12 }}>
          {right.map((g) => <GroupCard key={g} letter={g} />)}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Title, Poster });
