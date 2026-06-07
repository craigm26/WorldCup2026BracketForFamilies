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
  const flagIso = page.flag || (page.team && WC.T[page.team] ? WC.T[page.team].c : null);
  return (
    <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 16, padding: 14, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        {flagIso && <Flag code={flagIso} w={28} style={{ border: "1.5px solid #fff", borderRadius: 3 }} />}
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

function TradeColumn({ title, nums, idx, accent }) {
  return (
    <div style={{ flex: "1 1 240px", background: "rgba(255,255,255,.06)", borderRadius: 14, padding: 12 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: accent, marginBottom: 8 }}>{title} <span style={{ color: "#9fb0e0" }}>({nums.length})</span></div>
      {nums.length ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {nums.map((n) => {
            const slot = idx[n] && idx[n].slot;
            return (
              <span key={n} title={slot ? slot.name : ""} style={{ background: "rgba(255,255,255,.1)", color: "#dfe6ff",
                borderRadius: 8, padding: "4px 9px", fontSize: 13, fontWeight: 600 }}>
                #{n}{slot && slot.foil ? " ✨" : ""}
              </span>
            );
          })}
        </div>
      ) : <div style={{ color: "#7e8cc0", fontSize: 13 }}>Nothing to swap.</div>}
    </div>
  );
}

function TradeMatcherView({ collections, players, activeId }) {
  const L = window.WCSTKLOGIC, WCSTK = window.WCSTK;
  const idx = React.useMemo(() => L.buildIndex(WCSTK), [WCSTK]);
  const others = players.list.filter((p) => p.id !== activeId);
  const [otherId, setOtherId] = React.useState(others.length ? others[0].id : null);

  if (!others.length) return <div style={{ color: "#9fb0e0", padding: 24 }}>Add another family member to trade with (🏠 Home → + Add player).</div>;

  const mine = collections[activeId] || {};
  const theirs = collections[otherId] || {};
  const r = L.tradeMatch(mine, theirs, idx);
  const me = players.list.find((p) => p.id === activeId);
  const them = players.list.find((p) => p.id === otherId);

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ color: "#dfe6ff", fontWeight: 600 }}>Trade {me ? me.emoji + " " + me.name : "you"} with</span>
        <select value={otherId} onChange={(e) => setOtherId(e.target.value)} style={{ fontFamily: "inherit", fontSize: 15,
          fontWeight: 700, color: "#16235a", background: "#f4b740", border: "none", borderRadius: 8, padding: "6px 10px" }}>
          {others.map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
        </select>
        <span style={{ marginLeft: "auto", fontSize: 16, fontWeight: 800, color: "#34c77b" }}>🤝 {r.swaps} perfect swap{r.swaps === 1 ? "" : "s"}</span>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <TradeColumn title={"You give → " + (them ? them.name : "")} nums={r.iGive} idx={idx} accent="#f4b740" />
        <TradeColumn title={(them ? them.name : "") + " gives → you"} nums={r.iWant} idx={idx} accent="#9fc0ff" />
      </div>
    </div>
  );
}

function OverviewView({ collections, players }) {
  const L = window.WCSTKLOGIC, WCSTK = window.WCSTK;
  const idx = React.useMemo(() => L.buildIndex(WCSTK), [WCSTK]);
  const maps = players.list.map((p) => collections[p.id] || {});
  const rarest = L.rarestNeeded(maps, idx);
  return (
    <div>
      <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
        {players.list.map((p) => {
          const t = L.playerTotals(collections[p.id] || {}, idx);
          const pct = t.total ? Math.round((t.have / t.total) * 100) : 0;
          return (
            <div key={p.id} style={{ background: "rgba(255,255,255,.06)", borderRadius: 12, padding: "10px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, color: "#fff", marginBottom: 6 }}>
                <span>{p.emoji} {p.name}</span>
                <span style={{ color: "#f4b740", fontWeight: 700 }}>{t.have}/{t.total} · {t.doubles} dbl</span>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,.1)", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ width: pct + "%", height: "100%", background: "#34c77b" }} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ background: "rgba(244,183,64,.14)", border: "2px solid rgba(244,183,64,.4)", borderRadius: 14, padding: "12px 14px" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#f4b740", marginBottom: 6 }}>🔎 Rarest — nobody has these ({rarest.length})</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {rarest.slice(0, 40).map((n) => (
            <span key={n} style={{ background: "rgba(255,255,255,.1)", color: "#dfe6ff", borderRadius: 8, padding: "3px 8px", fontSize: 13 }}>#{n}</span>
          ))}
          {rarest.length > 40 && <span style={{ color: "#9fb0e0", fontSize: 13 }}>+{rarest.length - 40} more</span>}
        </div>
      </div>
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
      {view === "trade" && <TradeMatcherView collections={collections} players={players} activeId={activeId} />}
      {view === "overview" && <OverviewView collections={collections} players={players} />}
    </div>
  );
}
