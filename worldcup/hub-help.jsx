/* ❓ Help tab — kid-friendly how-to cards (renders window.WCHELP). */
function HelpCard({ card, open, onToggle, innerRef }) {
  return (
    <div ref={innerRef} style={{ background: "rgba(255,255,255,.06)", borderRadius: 14, marginBottom: 10, overflow: "hidden" }}>
      <button onClick={onToggle} style={{ width: "100%", textAlign: "left", border: "none", cursor: "pointer", background: "transparent", color: "#fff", padding: "12px 14px", display: "flex", gap: 10, alignItems: "center" }}>
        <span style={{ fontSize: 22 }}>{card.icon}</span>
        <span style={{ flex: 1 }}>
          <span style={{ fontSize: 16, fontWeight: 700, display: "block" }}>{card.title}</span>
          <span style={{ fontSize: 13.5, color: "#9fb0e0" }}>{card.summary}</span>
        </span>
        <span style={{ color: "#9fb0e0", fontSize: 13 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && card.steps && card.steps.length > 0 && (
        <ol style={{ margin: 0, padding: "0 18px 14px 36px", color: "#dfe6ff", fontSize: 14.5, lineHeight: 1.5 }}>
          {card.steps.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
        </ol>
      )}
    </div>
  );
}

function HelpTab({ target, clearTarget }) {
  const CARDS = window.WCHELP || [];
  const [q, setQ] = React.useState("");
  const [openId, setOpenId] = React.useState(target || null);
  const refs = React.useRef({});
  React.useEffect(() => {
    if (target) {
      setOpenId(target);
      const el = refs.current[target];
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "center" });
      if (clearTarget) clearTarget();
    }
  }, [target]);

  const ql = q.trim().toLowerCase();
  const match = (c) => !ql || (c.title + " " + c.summary + " " + (c.steps || []).join(" ")).toLowerCase().includes(ql);
  const cards = CARDS.filter(match);
  let lastGroup = null;

  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 2, background: "rgba(21,50,127,.92)", padding: "10px 0", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>❓ How to use the Hub</div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search help…"
          style={{ fontFamily: "inherit", fontSize: 14, borderRadius: 10, border: "none", padding: "7px 12px", background: "rgba(255,255,255,.12)", color: "#fff", flex: "1 1 160px", marginLeft: "auto" }} />
      </div>
      {cards.length ? cards.map((c) => {
        const head = c.group !== lastGroup ? c.group : null; lastGroup = c.group;
        return (
          <React.Fragment key={c.id}>
            {head && <div style={{ fontSize: 18, fontWeight: 800, color: "#9fc0ff", margin: "10px 2px 8px" }}>{head}</div>}
            <HelpCard card={c} open={openId === c.id} onToggle={() => setOpenId(openId === c.id ? null : c.id)} innerRef={(el) => { refs.current[c.id] = el; }} />
          </React.Fragment>
        );
      }) : <div style={{ color: "#9fb0e0", padding: 24, textAlign: "center" }}>No help matches — try another word.</div>}
    </div>
  );
}

function HelpLink({ goHelp, id, label }) {
  return (
    <button onClick={() => goHelp(id)} title="How does this work?"
      style={{ border: "none", cursor: "pointer", background: "rgba(255,255,255,.12)", color: "#dfe6ff", borderRadius: 20, padding: "4px 10px", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>❓ {label || "Help"}</button>
  );
}
