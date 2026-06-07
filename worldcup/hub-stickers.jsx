/* 🎟️ Stickers tab — Panini WC2026 collection tracker (manual-first). */
function StickerSlot({ slot, count, onTap, onMinus }) {
  const have = count >= 1, dbl = count >= 2;
  const bg = dbl ? "rgba(244,183,64,.22)" : have ? "rgba(52,199,123,.22)" : "rgba(255,255,255,.05)";
  const border = dbl ? "2px solid #f4b740" : have ? "2px solid #34c77b" : "2px dashed rgba(255,255,255,.22)";
  return (
    <div onClick={() => onTap(slot.n)} title={slot.name}
      style={{ position: "relative", cursor: "pointer", background: bg, border: border, borderRadius: 10,
        padding: "8px 6px", minHeight: 64, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: have ? "#fff" : "#9fb0e0" }}>#{slot.n}</span>
        <span style={{ fontSize: 11 }}>{slot.foil ? "✨" : ""}{slot.confirmed === false ? " ?" : ""}</span>
      </div>
      <div style={{ fontSize: 11.5, color: have ? "#dfe6ff" : "#7e8cc0", lineHeight: 1.15,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{slot.name}</div>
      {dbl && (
        <span onClick={(e) => { e.stopPropagation(); onMinus(slot.n); }}
          style={{ position: "absolute", top: -8, right: -8, background: "#f4b740", color: "#16235a",
            borderRadius: 12, fontSize: 11, fontWeight: 800, padding: "1px 7px", border: "2px solid #16235a" }}>
          ×{count}
        </span>
      )}
    </div>
  );
}

function StickerPage({ page, map, onTap, onMinus }) {
  const WC = window.WC, L = window.WCSTKLOGIC;
  const prog = L.sectionProgress(map, page);
  const pct = prog.total ? Math.round((prog.have / prog.total) * 100) : 0;
  const team = page.team && WC.T[page.team];
  return (
    <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 16, padding: 14, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        {team && <Flag code={team.c} w={28} style={{ border: "1.5px solid #fff", borderRadius: 3 }} />}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>{page.title}</div>
          <div style={{ fontSize: 12, color: "#9fb0e0" }}>Page {page.page}</div>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: pct === 100 ? "#34c77b" : "#f4b740" }}>{prog.have}/{prog.total}</div>
      </div>
      <div style={{ height: 6, background: "rgba(255,255,255,.1)", borderRadius: 6, marginBottom: 12, overflow: "hidden" }}>
        <div style={{ width: pct + "%", height: "100%", background: pct === 100 ? "#34c77b" : "#f4b740" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${page.cols}, 1fr)`, gap: 8 }}>
        {page.slots.map((s) => (
          <StickerSlot key={s.n} slot={s} count={map[s.n] || 0} onTap={onTap} onMinus={onMinus} />
        ))}
      </div>
    </div>
  );
}

function MyBookView({ map, setSticker, activeId }) {
  const WCSTK = window.WCSTK, L = window.WCSTKLOGIC;
  const idx = React.useMemo(() => L.buildIndex(WCSTK), [WCSTK]);
  const totals = L.playerTotals(map, idx);
  const [filter, setFilter] = React.useState("all"); // all | need | doubles
  const [q, setQ] = React.useState("");

  const onTap = (n) => setSticker(activeId, n, L.cycleCount(map[n]));
  const onMinus = (n) => setSticker(activeId, n, Math.max(0, (map[n] || 0) - 1));

  const matchSlot = (s) => {
    const c = map[s.n] || 0;
    if (filter === "need" && c >= 1) return false;
    if (filter === "doubles" && c < 2) return false;
    if (q) { const t = (s.name + " " + s.n).toLowerCase(); if (!t.includes(q.toLowerCase())) return false; }
    return true;
  };
  const pages = WCSTK.pages
    .map((p) => Object.assign({}, p, { slots: p.slots.filter(matchSlot) }))
    .filter((p) => p.slots.length);

  const chip = (id, label) => (
    <button onClick={() => setFilter(id)} style={{ border: "none", cursor: "pointer", borderRadius: 20,
      padding: "6px 14px", fontSize: 14, fontWeight: 700,
      background: filter === id ? "#f4b740" : "rgba(255,255,255,.1)", color: filter === id ? "#16235a" : "#dfe6ff" }}>{label}</button>
  );

  return (
    <div>
      <div style={{ position: "sticky", top: 0, zIndex: 2, background: "rgba(21,50,127,.92)", padding: "10px 0",
        display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>
          You: <span style={{ color: "#f4b740" }}>{totals.have}/{totals.total}</span>
          <span style={{ color: "#9fb0e0", fontWeight: 600, fontSize: 14 }}> · {totals.doubles} doubles</span>
        </div>
        <div style={{ display: "flex", gap: 8, marginLeft: "auto", flexWrap: "wrap" }}>
          {chip("all", "All")}{chip("need", "Need")}{chip("doubles", "Doubles")}
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search # or name"
          style={{ fontFamily: "inherit", fontSize: 14, borderRadius: 10, border: "none", padding: "7px 12px",
            background: "rgba(255,255,255,.12)", color: "#fff", flex: "1 1 160px" }} />
      </div>
      {pages.length ? pages.map((p, i) => {
        const prev = i ? pages[i - 1] : null;
        const showGroup = p.group && (!prev || prev.group !== p.group);
        return (
          <React.Fragment key={p.page}>
            {showGroup && (
              <div style={{ fontSize: 18, fontWeight: 800, color: "#9fc0ff", margin: "6px 2px 10px",
                borderBottom: "2px solid rgba(159,192,255,.3)", paddingBottom: 4 }}>Group {p.group}</div>
            )}
            <StickerPage page={p} map={map} onTap={onTap} onMinus={onMinus} />
          </React.Fragment>
        );
      }) : <div style={{ color: "#9fb0e0", padding: 24, textAlign: "center" }}>No stickers match.</div>}
    </div>
  );
}

function StickersTab({ collections, setSticker, players }) {
  const [view, setView] = React.useState("book"); // book | trade | overview
  const activeId = players.active;
  const map = (collections && collections[activeId]) || {};

  const seg = (id, label) => (
    <button onClick={() => setView(id)} style={{ border: "none", cursor: "pointer", borderRadius: 12,
      padding: "9px 16px", fontSize: 15, fontWeight: 700,
      background: view === id ? "#f4b740" : "rgba(255,255,255,.1)", color: view === id ? "#16235a" : "#dfe6ff" }}>{label}</button>
  );

  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        {seg("book", "📖 My Book")}{seg("trade", "🔄 Trade Matcher")}{seg("overview", "📊 Overview")}
      </div>
      {view === "book" && <MyBookView map={map} setSticker={setSticker} activeId={activeId} />}
      {view === "trade" && <div style={{ color: "#9fb0e0", padding: 24 }}>Trade Matcher — coming in Task 9.</div>}
      {view === "overview" && <div style={{ color: "#9fb0e0", padding: 24 }}>Overview — coming in Task 10.</div>}
    </div>
  );
}
