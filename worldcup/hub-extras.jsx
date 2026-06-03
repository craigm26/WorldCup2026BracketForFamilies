/* Hub · extras — idle "attract mode" screensaver + share-bracket-by-QR modal. */
function Screensaver({ tz, onWake }) {
  const WC = window.WC, WCTZ = window.WCTZ;
  const [now, setNow] = React.useState(() => new Date());
  const [slide, setSlide] = React.useState(0);
  React.useEffect(() => { const a = setInterval(() => setNow(new Date()), 1000); const b = setInterval(() => setSlide((s) => s + 1), 8000); return () => { clearInterval(a); clearInterval(b); }; }, []);
  const all = React.useMemo(() => WCTZ.matches(), []);
  const codes = React.useMemo(() => Object.keys(WC.T), []);
  const next = all.find((m) => m.dt.getTime() > now.getTime());

  const kinds = [];
  if (next) kinds.push("count");
  kinds.push("fact", "upcoming", "record");
  const cur = kinds[slide % kinds.length];
  const pad = (n) => (n < 10 ? "0" : "") + n;

  let body;
  if (cur === "count" && next) {
    const k = WCTZ.local(next.date, next.et.h, next.et.m, tz);
    const s = Math.max(0, Math.floor((next.dt.getTime() - now.getTime()) / 1000));
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    const tt = next.type === "group" ? WC.T[next.home].n + " v " + WC.T[next.away].n : "M" + next.no + " " + next.round;
    body = (
      <React.Fragment>
        <div style={{ fontSize: 22, color: "#f4b740", fontWeight: 700, letterSpacing: 2 }}>⚽ NEXT KICK-OFF</div>
        <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: 2, margin: "10px 0", fontVariantNumeric: "tabular-nums" }}>{d > 0 ? d + "d " + h + "h " + m + "m" : pad(h) + ":" + pad(m) + ":" + pad(ss)}</div>
        <div style={{ fontSize: 34, fontWeight: 700 }}>{tt}</div>
        <div style={{ fontSize: 20, color: "#cdd9ff", marginTop: 8 }}>{k.icon} {k.weekday} {k.time} · 📍 {next.city}</div>
      </React.Fragment>
    );
  } else if (cur === "fact") {
    const t = WC.T[codes[(slide * 7) % codes.length]];
    const facts = (t.facts && t.facts.length) ? t.facts : [t.fact];
    body = (
      <React.Fragment>
        <Flag code={t.c} w={210} style={{ border: "5px solid #fff", borderRadius: 12, boxShadow: "0 12px 40px rgba(0,0,0,.5)" }} />
        <div style={{ fontSize: 40, fontWeight: 700, marginTop: 18 }}>{t.n}</div>
        <div style={{ fontSize: 24, color: "#eaf0ff", maxWidth: 780, marginTop: 10, lineHeight: 1.4 }}>⭐ {facts[slide % facts.length]}</div>
      </React.Fragment>
    );
  } else if (cur === "upcoming") {
    const up = all.filter((m) => m.dt.getTime() > now.getTime()).slice(0, 5);
    body = (
      <React.Fragment>
        <div style={{ fontSize: 30, fontWeight: 700, color: "#f4b740", marginBottom: 18 }}>📅 Coming up</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 24 }}>
          {up.map((m, i) => { const k = WCTZ.local(m.date, m.et.h, m.et.m, tz); const tt = m.type === "group" ? WC.T[m.home].n + " v " + WC.T[m.away].n : "M" + m.no + " " + m.round; return <div key={i}><span style={{ color: "#9fb0e0" }}>{k.weekday} {k.time}</span> · {tt} <span style={{ color: "#9fb0e0", fontSize: 18 }}>📍 {m.city}</span></div>; })}
        </div>
      </React.Fragment>
    );
  } else {
    const rec = WC.RECORDS[slide % WC.RECORDS.length];
    body = (
      <React.Fragment>
        <div style={{ fontSize: 120, fontWeight: 700, color: "#f4b740" }}>{rec.big}</div>
        <div style={{ fontSize: 30, color: "#eaf0ff", maxWidth: 700 }}>{rec.small}</div>
      </React.Fragment>
    );
  }
  return (
    <div onClick={onWake} style={{ position: "fixed", inset: 0, zIndex: 200, background: "radial-gradient(circle at 30% 0%, #244fb5, #0c1638 80%)", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 40, cursor: "pointer" }}>
      <div key={slide} style={{ animation: "factfade .8s ease", display: "flex", flexDirection: "column", alignItems: "center" }}>{body}</div>
      <div style={{ position: "absolute", bottom: 26, fontSize: 15, color: "#8c9bd0" }}>
        <span style={{ fontWeight: 700, color: "#dfe6ff" }}>WORLD CUP <span style={{ color: "#f4b740" }}>2026</span></span> · touch anything to wake
      </div>
    </div>
  );
}

function ShareModal({ url, onClose }) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => { try { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch (e) {} };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(8,16,40,.85)", zIndex: 150, display: "grid", placeItems: "center", padding: 30 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#16235a", borderRadius: 22, padding: 26, maxWidth: 420, width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,.5)" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 6 }}>📤 Share your bracket</div>
        <div style={{ fontSize: 14, color: "#9fb0e0", marginBottom: 16 }}>Scan to open your exact picks on a phone, or copy the link.</div>
        <div style={{ background: "#fff", borderRadius: 14, padding: 14, display: "inline-block" }}><QR text={url} size={230} fg="#16235a" /></div>
        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <input readOnly value={url} onFocus={(e) => e.target.select()} style={{ flex: 1, fontFamily: "inherit", fontSize: 12, border: "none", borderRadius: 10, padding: "10px 12px", minWidth: 0 }} />
          <button onClick={copy} style={{ border: "none", cursor: "pointer", background: "#f4b740", color: "#16235a", fontWeight: 700, borderRadius: 10, padding: "10px 16px", whiteSpace: "nowrap" }}>{copied ? "✓ Copied" : "Copy"}</button>
        </div>
        <button onClick={onClose} style={{ marginTop: 14, border: "none", cursor: "pointer", background: "rgba(255,255,255,.12)", color: "#dfe6ff", fontWeight: 700, borderRadius: 10, padding: "10px 20px" }}>Close</button>
      </div>
    </div>
  );
}
window.Screensaver = Screensaver;
window.ShareModal = ShareModal;
