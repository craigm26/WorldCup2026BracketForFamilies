/* 🎟️ Stickers tab — Panini WC2026 collection tracker (manual-first). */
function fmtWhen(v) {
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch (e) { return ""; }
}

// Flatten players × their books into trade/overview entries. The default book
// (id == playerId, label "My album") shows as just the person's name.
function bookEntries(players, books, collections) {
  const B = window.WCSTKBOOKS;
  const out = [];
  (players.list || []).forEach((p) => {
    const reg = (books && books[p.id]) || (B ? B.defaultRegistry(p.id) : { list: [{ id: p.id, label: "My album" }] });
    (reg.list || []).forEach((bk) => {
      const isDefault = bk.id === p.id && bk.label === ((B && B.DEFAULT_LABEL) || "My album");
      out.push({ key: bk.id, playerId: p.id, bookId: bk.id, emoji: p.emoji,
        name: isDefault ? p.name : (p.name + " · " + bk.label),
        map: (collections && collections[bk.id]) || {} });
    });
  });
  return out;
}

function FamilyMemberModal({ member, idx, onClose }) {
  if (!member) return null;
  const doubles = Object.keys(member.collection || {}).filter((c) => (member.collection[c] || 0) >= 2);
  const stillNeeds = member.total - member.have;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(8,18,48,.72)", display: "grid", placeItems: "center", zIndex: 50, padding: 16 }}>
      <div onClick={(ev) => ev.stopPropagation()} style={{ background: "#16235a", border: "2px solid rgba(255,255,255,.15)", borderRadius: 18, padding: 20, maxWidth: 360, width: "100%", color: "#fff", boxShadow: "0 20px 60px rgba(0,0,0,.5)" }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{member.emoji} {member.name}</div>
        <div style={{ fontSize: 14, color: "#f4b740", fontWeight: 700, marginBottom: 14 }}>
          {member.have}/{member.total} · {member.doubles} dbl
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#9fb0e0", marginBottom: 8 }}>Doubles (can trade away)</div>
        {doubles.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {doubles.map((c) => (
              <span key={c} style={{ background: "rgba(244,183,64,.18)", color: "#dfe6ff", borderRadius: 8, padding: "4px 9px", fontSize: 13, fontWeight: 600 }}>
                #{c}{idx[c] && idx[c].slot && idx[c].slot.foil ? " ✨" : ""}
              </span>
            ))}
          </div>
        ) : (
          <div style={{ color: "#7e8cc0", fontSize: 13, marginBottom: 14 }}>No spares yet.</div>
        )}
        <div style={{ fontSize: 14, color: "#dfe6ff", marginBottom: 16 }}>
          Still needs <span style={{ fontWeight: 700, color: "#f4b740" }}>{stillNeeds}</span>
        </div>
        <button onClick={onClose} style={{ width: "100%", border: "none", cursor: "pointer", background: "#f4b740", color: "#16235a", fontWeight: 800, borderRadius: 12, padding: "10px 0", fontSize: 15 }}>Close</button>
      </div>
    </div>
  );
}

function StickerSlot({ slot, count, onTap, onMinus, onInfo }) {
  const have = count >= 1, dbl = count >= 2;
  const bg = dbl ? "rgba(244,183,64,.22)" : have ? "rgba(52,199,123,.22)" : "rgba(255,255,255,.05)";
  const border = dbl ? "2px solid #f4b740" : have ? "2px solid #34c77b" : "2px dashed rgba(255,255,255,.22)";
  return (
    <div onClick={() => onTap(slot.n)} title={slot.name}
      style={{ position: "relative", cursor: "pointer", background: bg, border: border, borderRadius: 10,
        padding: "8px 6px", minHeight: 64, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: have ? "#fff" : "#9fb0e0" }}>#{slot.n}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <span style={{ fontSize: 11 }}>{slot.foil ? "✨" : ""}{slot.confirmed === false ? " ?" : ""}</span>
          <button onClick={(e) => { e.stopPropagation(); onInfo(slot); }} title="Details"
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9fb0e0", fontSize: 12, padding: 0, lineHeight: 1 }}>ⓘ</button>
        </span>
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

function StickerPage({ page, map, onTap, onMinus, onInfo, setSticker, activeId }) {
  const WC = window.WC, L = window.WCSTKLOGIC, WCSTK = window.WCSTK;
  const fullPage = (WCSTK.pages.find((p) => p.page === page.page)) || page;
  // progress reflects the WHOLE page, not the filtered subset shown below
  const prog = L.sectionProgress(map, fullPage);
  const pct = prog.total ? Math.round((prog.have / prog.total) * 100) : 0;
  const flagIso = page.flag || (page.team && WC.T[page.team] ? WC.T[page.team].c : null);

  return (
    <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 16, padding: 14, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        {flagIso && <Flag code={flagIso} w={28} style={{ border: "1.5px solid #fff", borderRadius: 3 }} />}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>{page.title}</div>
          <div style={{ fontSize: 12, color: "#9fb0e0" }}>{fullPage.slots.length ? "#" + fullPage.slots[0].n + " – #" + fullPage.slots[fullPage.slots.length - 1].n : ""}</div>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: pct === 100 ? "#34c77b" : "#f4b740" }}>{prog.have}/{prog.total}</div>
      </div>
      <div style={{ height: 6, background: "rgba(255,255,255,.1)", borderRadius: 6, marginBottom: 12, overflow: "hidden" }}>
        <div style={{ width: pct + "%", height: "100%", background: pct === 100 ? "#34c77b" : "#f4b740" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${page.cols}, 1fr)`, gap: 8 }}>
        {page.slots.map((s) => (
          <StickerSlot key={s.n} slot={s} count={map[s.n] || 0} onTap={onTap} onMinus={onMinus} onInfo={onInfo} />
        ))}
      </div>
    </div>
  );
}

function ScanSwap({ onAdd }) {
  const [open, setOpen] = React.useState(false);
  const [num, setNum] = React.useState("");
  // sticker codes are STRING codes (e.g. MEX5). Add the code as-is.
  const add = () => { const n = num.trim(); if (n) { onAdd(n); setNum(""); setOpen(false); } };

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{ border: "none", cursor: "pointer", borderRadius: 20,
      padding: "6px 14px", fontSize: 14, fontWeight: 700, background: "rgba(255,255,255,.12)", color: "#dfe6ff" }}>➕ Add by code</button>
  );

  return (
    <div style={{ background: "rgba(0,0,0,.35)", borderRadius: 12, padding: 10, display: "flex", gap: 6, alignItems: "center", flex: "1 1 220px" }}>
      <input value={num} autoFocus onChange={(e) => setNum(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
        onKeyDown={(e) => { if (e.key === "Enter") add(); }} placeholder="Code e.g. MEX5"
        style={{ fontFamily: "inherit", fontSize: 14, borderRadius: 8, border: "none", padding: "7px 10px", flex: "1 1 90px", minWidth: 90, background: "rgba(255,255,255,.14)", color: "#fff" }} />
      <button onClick={add} style={{ border: "none", cursor: "pointer", background: "#34c77b", color: "#06351f", fontWeight: 700, borderRadius: 8, padding: "7px 14px" }}>Add +1</button>
      <button onClick={() => { setOpen(false); setNum(""); }} style={{ border: "none", cursor: "pointer", background: "rgba(255,255,255,.12)", color: "#dfe6ff", borderRadius: 8, padding: "7px 12px" }}>Close</button>
    </div>
  );
}

function StickerDetail({ slot, count, onClose, onSet }) {
  if (!slot) return null;
  const e = (window.WCSTKENRICH || {})[slot.n] || {};
  const POS = { GK: "Goalkeeper", DF: "Defender", MF: "Midfielder", FW: "Forward" };
  const have = count >= 1, dbl = count >= 2;
  const status = dbl ? `Have +${count - 1} spare` : have ? "Have" : "Need";
  const typeLabel = slot.type === "badge" ? "Team emblem"
    : slot.type === "legend" ? "World Cup history"
    : (slot.type === "special" ? (slot.name === "Team Photo" ? "Team photo" : "Special") : null);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(8,18,48,.72)", display: "grid", placeItems: "center", zIndex: 50, padding: 16 }}>
      <div onClick={(ev) => ev.stopPropagation()} style={{ background: "#16235a", border: "2px solid rgba(255,255,255,.15)", borderRadius: 18, padding: 20, maxWidth: 360, width: "100%", color: "#fff", boxShadow: "0 20px 60px rgba(0,0,0,.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#9fb0e0" }}>#{slot.n}</span>
          {slot.foil && <span style={{ fontSize: 13 }}>✨ foil</span>}
          <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color: dbl ? "#f4b740" : have ? "#34c77b" : "#9fb0e0" }}>{status}</span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: (e.pos || e.club) ? 4 : 10 }}>{slot.name}</div>
        {(e.pos || e.club) && (
          <div style={{ fontSize: 14, color: "#dfe6ff", marginBottom: 10 }}>
            {e.pos ? (POS[e.pos] || e.pos) : ""}{e.pos && e.club ? " · " : ""}{e.club || ""}
          </div>
        )}
        {typeLabel && !e.pos && !e.club && <div style={{ fontSize: 14, color: "#9fb0e0", marginBottom: 10 }}>{typeLabel}</div>}
        {e.fact
          ? <div style={{ fontSize: 15, lineHeight: 1.45, background: "rgba(255,255,255,.07)", borderRadius: 12, padding: "10px 12px" }}>💡 {e.fact}</div>
          : (slot.type === "player" ? <div style={{ fontSize: 13.5, color: "#7e8cc0" }}>More details coming soon.</div> : null)}
        {onSet && (
          <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => onSet(slot.n, Math.max(0, count - 1))} disabled={count <= 0}
              style={{ border: "none", cursor: count <= 0 ? "default" : "pointer", background: "rgba(255,255,255,.14)", color: "#fff", fontWeight: 800, fontSize: 20, borderRadius: 10, width: 44, height: 40, opacity: count <= 0 ? .4 : 1 }}>−</button>
            <div style={{ flex: 1, textAlign: "center", fontWeight: 700, fontSize: 15, color: dbl ? "#f4b740" : have ? "#34c77b" : "#9fb0e0" }}>
              {count === 0 ? "Need it" : count === 1 ? "Have it" : "Have ×" + count}
            </div>
            <button onClick={() => onSet(slot.n, count + 1)}
              style={{ border: "none", cursor: "pointer", background: "rgba(255,255,255,.14)", color: "#fff", fontWeight: 800, fontSize: 20, borderRadius: 10, width: 44, height: 40 }}>+</button>
            <button onClick={() => onSet(slot.n, 0)} disabled={count <= 0}
              style={{ border: "none", cursor: count <= 0 ? "default" : "pointer", background: "rgba(226,71,59,.2)", color: "#ffd7d2", fontWeight: 700, fontSize: 14, borderRadius: 10, padding: "0 14px", height: 40, opacity: count <= 0 ? .4 : 1 }}>Clear</button>
          </div>
        )}
        <button onClick={onClose} style={{ marginTop: 12, width: "100%", border: "none", cursor: "pointer", background: "#f4b740", color: "#16235a", fontWeight: 800, borderRadius: 12, padding: "10px 0", fontSize: 15 }}>Close</button>
      </div>
    </div>
  );
}

function BookBar({ reg, playerId, addBook, renameBook, removeBook, switchBook }) {
  const [adding, setAdding] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [label, setLabel] = React.useState("");
  const active = reg.active;
  const activeBook = reg.list.find((b) => b.id === active) || reg.list[0];
  const canDelete = reg.list.length > 1;

  const doAdd = () => { const n = label.trim(); if (n) { addBook(playerId, n); setLabel(""); setAdding(false); } };
  const doRename = () => { const n = label.trim(); if (n) { renameBook(playerId, active, n); } setEditing(false); setLabel(""); };

  const pill = (b) => (
    <button key={b.id} onClick={() => switchBook(playerId, b.id)}
      style={{ border: "none", cursor: "pointer", borderRadius: 20, padding: "6px 14px", fontSize: 14, fontWeight: 700,
        background: b.id === active ? "#34c77b" : "rgba(255,255,255,.1)", color: b.id === active ? "#06351f" : "#dfe6ff" }}>
      📗 {b.label}
    </button>
  );

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
      {reg.list.map(pill)}
      {!adding ? (
        <button onClick={() => { setAdding(true); setEditing(false); setLabel(""); }} style={{ border: "none", cursor: "pointer", borderRadius: 20,
          padding: "6px 12px", fontSize: 14, fontWeight: 700, background: "rgba(255,255,255,.12)", color: "#dfe6ff" }}>＋ Book</button>
      ) : (
        <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input value={label} autoFocus onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") doAdd(); }}
            placeholder="Book name e.g. Swaps" style={{ fontFamily: "inherit", fontSize: 14, borderRadius: 8, border: "none", padding: "6px 10px", background: "rgba(255,255,255,.14)", color: "#fff", width: 150 }} />
          <button onClick={doAdd} style={{ border: "none", cursor: "pointer", background: "#34c77b", color: "#06351f", fontWeight: 700, borderRadius: 8, padding: "6px 12px" }}>Add</button>
          <button onClick={() => setAdding(false)} style={{ border: "none", cursor: "pointer", background: "rgba(255,255,255,.12)", color: "#dfe6ff", borderRadius: 8, padding: "6px 10px" }}>✕</button>
        </span>
      )}
      <button onClick={() => { setEditing((v) => !v); setAdding(false); setLabel(activeBook.label); }} aria-label="Rename or delete this book"
        style={{ border: "none", cursor: "pointer", background: "transparent", color: "#9fb0e0", fontSize: 14, padding: "6px 4px" }}>✏️</button>
      {editing && (
        <span style={{ display: "flex", gap: 6, alignItems: "center", flexBasis: "100%" }}>
          <input value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") doRename(); }}
            style={{ fontFamily: "inherit", fontSize: 14, borderRadius: 8, border: "none", padding: "6px 10px", background: "rgba(255,255,255,.14)", color: "#fff", width: 150 }} />
          <button onClick={doRename} style={{ border: "none", cursor: "pointer", background: "#34c77b", color: "#06351f", fontWeight: 700, borderRadius: 8, padding: "6px 12px" }}>Rename</button>
          <button onClick={() => { if (canDelete) { removeBook(playerId, active); setEditing(false); } }} disabled={!canDelete}
            style={{ border: "none", cursor: canDelete ? "pointer" : "default", background: "rgba(226,71,59,.2)", color: "#ffd7d2", fontWeight: 700, borderRadius: 8, padding: "6px 12px", opacity: canDelete ? 1 : .4 }}>Delete book</button>
        </span>
      )}
    </div>
  );
}

function MyBookView({ map, setSticker, activeBook, reg, playerId, addBook, renameBook, removeBook, switchBook }) {
  const WCSTK = window.WCSTK, L = window.WCSTKLOGIC;
  const idx = React.useMemo(() => L.buildIndex(WCSTK), [WCSTK]);
  const totals = L.playerTotals(map, idx);
  const [filter, setFilter] = React.useState("all");
  const [q, setQ] = React.useState("");
  const [info, setInfo] = React.useState(null);

  const onTap = (n) => setSticker(activeBook, n, L.cycleCount(map[n]));
  const onMinus = (n) => setSticker(activeBook, n, Math.max(0, (map[n] || 0) - 1));

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
      <BookBar reg={reg} playerId={playerId} addBook={addBook} renameBook={renameBook} removeBook={removeBook} switchBook={switchBook} />
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
        <ScanSwap onAdd={onTap} />
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
            <StickerPage page={p} map={map} onTap={onTap} onMinus={onMinus} onInfo={setInfo} setSticker={setSticker} activeId={activeBook} />
          </React.Fragment>
        );
      }) : <div style={{ color: "#9fb0e0", padding: 24, textAlign: "center" }}>No stickers match.</div>}
      <StickerDetail slot={info} count={info ? (map[info.n] || 0) : 0} onClose={() => setInfo(null)} onSet={(n, c) => setSticker(activeBook, n, c)} />
    </div>
  );
}

function AddPlayerCard({ addPlayer, title, blurb }) {
  const [name, setName] = React.useState("");
  const add = () => { const n = name.trim(); if (n) { addPlayer(n, "🙂"); setName(""); } };
  return (
    <div style={{ background: "rgba(52,199,123,.12)", border: "2px solid rgba(52,199,123,.45)", borderRadius: 14, padding: 16, maxWidth: 540 }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: "#bdf0d3", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 14, color: "#dfe6ff", marginBottom: 12, lineHeight: 1.45 }}>{blurb}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          placeholder="Name (e.g. Mia)" style={{ fontFamily: "inherit", fontSize: 15, borderRadius: 10, border: "none",
            padding: "9px 12px", background: "rgba(255,255,255,.14)", color: "#fff", flex: "1 1 160px" }} />
        <button onClick={add} style={{ border: "none", cursor: "pointer", background: "#34c77b", color: "#06351f",
          fontWeight: 800, borderRadius: 10, padding: "9px 18px", fontSize: 15 }}>➕ Add a player</button>
      </div>
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

function TradeMatcherView({ collections, players, books, activeId, addPlayer }) {
  const L = window.WCSTKLOGIC, WCSTK = window.WCSTK, B = window.WCSTKBOOKS;
  const idx = React.useMemo(() => L.buildIndex(WCSTK), [WCSTK]);
  const entries = bookEntries(players, books, collections);
  const reg = (books && books[activeId]) || (B ? B.defaultRegistry(activeId) : { active: activeId });
  const activeBook = reg.active;
  const mineEntry = entries.find((e) => e.bookId === activeBook) || entries.find((e) => e.playerId === activeId);
  const others = entries.filter((e) => e.bookId !== (mineEntry ? mineEntry.bookId : activeBook));
  const [otherKey, setOtherKey] = React.useState(others.length ? others[0].key : null);

  if (!others.length) return (
    <AddPlayerCard addPlayer={addPlayer}
      title="🔄 Trading needs at least two books"
      blurb="Add another family member as a player — or add a second book (like a 'Swaps' book) in 📖 My Book — then the Trade Matcher shows exactly which of your doubles you can swap for the stickers they still need. (Players are shared with the 🏠 Home Pick'em.)" />
  );

  const validKey = others.some((e) => e.key === otherKey) ? otherKey : others[0].key;
  const them = others.find((e) => e.key === validKey);
  const mine = mineEntry ? mineEntry.map : {};
  const r = L.tradeMatch(mine, them.map, idx);

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ color: "#dfe6ff", fontWeight: 600 }}>Trade {mineEntry ? mineEntry.emoji + " " + mineEntry.name : "you"} with</span>
        <select value={validKey} onChange={(e) => setOtherKey(e.target.value)} style={{ fontFamily: "inherit", fontSize: 15,
          fontWeight: 700, color: "#16235a", background: "#f4b740", border: "none", borderRadius: 8, padding: "6px 10px" }}>
          {others.map((e) => <option key={e.key} value={e.key}>{e.emoji} {e.name}</option>)}
        </select>
        <span style={{ marginLeft: "auto", fontSize: 16, fontWeight: 800, color: "#34c77b" }}>🤝 {r.swaps} perfect swap{r.swaps === 1 ? "" : "s"}</span>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <TradeColumn title={"You give → " + them.name} nums={r.iGive} idx={idx} accent="#f4b740" />
        <TradeColumn title={them.name + " gives → you"} nums={r.iWant} idx={idx} accent="#9fc0ff" />
      </div>
    </div>
  );
}

function OverviewView({ collections, players, books, addPlayer }) {
  const L = window.WCSTKLOGIC, WCSTK = window.WCSTK;
  const idx = React.useMemo(() => L.buildIndex(WCSTK), [WCSTK]);
  const entries = bookEntries(players, books, collections);
  const rarest = L.rarestNeeded(entries.map((e) => e.map), idx);
  return (
    <div>
      {entries.length < 2 && (
        <div style={{ marginBottom: 16 }}>
          <AddPlayerCard addPlayer={addPlayer}
            title="👪 Add the whole family to compare"
            blurb="Each person gets their own collection — and can keep more than one book. Add a player for each family member (or a second book) to see everyone’s progress side by side, and who needs what for trading." />
        </div>
      )}
      <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
        {entries.map((e) => {
          const t = L.playerTotals(e.map, idx);
          const pct = t.total ? Math.round((t.have / t.total) * 100) : 0;
          return (
            <div key={e.key} style={{ background: "rgba(255,255,255,.06)", borderRadius: 12, padding: "10px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, color: "#fff", marginBottom: 6 }}>
                <span>{e.emoji} {e.name}</span>
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

function FamilyTrades({ data, fam, sync, idx, map, me, reload, setErr, setBusy, busy }) {
  const SY = window.WCSTKSYNC, L = window.WCSTKLOGIC;
  const [withId, setWithId] = React.useState("");
  if (!data) return null;
  const others = fam.filter((f) => !f.isMe);
  const trades = data.trades || [];
  const incoming = trades.filter((t) => t.toId === sync.memberId && t.status === "pending");
  const mineOut = trades.filter((t) => t.fromId === sync.memberId);

  const target = others.find((o) => o.id === withId) || others[0];
  const match = target ? L.tradeMatch(SY.serializeCollection(map), target.collection, idx) : { iGive: [], iWant: [], swaps: 0 };

  const propose = async () => {
    if (!target) return;
    setErr(""); setBusy(true);
    try {
      await SY.postAction(sync, "proposeTrade", { toId: target.memberId, toName: target.name, fromName: me.name,
        giveCodes: match.iGive, wantCodes: match.iWant });
      await reload();
    } catch (e) { setErr(String(e.message || e)); setBusy(false); }
  };
  const respond = async (tradeId, response) => {
    setErr(""); setBusy(true);
    try { await SY.postAction(sync, "respondTrade", { tradeId: tradeId, response: response }); await reload(); }
    catch (e) { setErr(String(e.message || e)); setBusy(false); }
  };

  const chip = (c) => <span key={c} style={{ background: "rgba(255,255,255,.1)", color: "#dfe6ff", borderRadius: 8, padding: "3px 8px", fontSize: 13, marginRight: 4 }}>#{c}</span>;

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: "#f4b740", marginBottom: 8 }}>🤝 Trades</div>

      {incoming.length > 0 && <div style={{ fontSize: 13, color: "#9fb0e0", marginBottom: 6 }}>Waiting for you:</div>}
      {incoming.map((t) => (
        <div key={t.tradeId} style={{ background: "rgba(255,255,255,.06)", borderRadius: 12, padding: "10px 12px", marginBottom: 8 }}>
          <div style={{ fontSize: 14, color: "#fff", marginBottom: 6 }}><b>{t.fromName}</b> offers {String(t.giveCodes || "").split(",").filter(Boolean).map(chip)} for your {String(t.wantCodes || "").split(",").filter(Boolean).map(chip)}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => respond(t.tradeId, "accept")} disabled={busy} style={{ border: "none", cursor: "pointer", background: "#34c77b", color: "#06351f", fontWeight: 700, borderRadius: 8, padding: "6px 14px" }}>Accept</button>
            <button onClick={() => respond(t.tradeId, "decline")} disabled={busy} style={{ border: "none", cursor: "pointer", background: "rgba(255,255,255,.12)", color: "#dfe6ff", fontWeight: 700, borderRadius: 8, padding: "6px 14px" }}>Decline</button>
          </div>
        </div>
      ))}

      {others.length > 0 ? (
        <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 12, padding: "10px 12px", marginTop: 6 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
            <span style={{ color: "#dfe6ff", fontSize: 14 }}>Propose a trade with</span>
            <select value={target ? target.id : ""} onChange={(e) => setWithId(e.target.value)} style={{ fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: "#16235a", background: "#f4b740", border: "none", borderRadius: 8, padding: "5px 8px" }}>
              {others.map((o) => {
                const olabel = o.name + (o.bookLabel && o.bookLabel !== "My album" ? " · " + o.bookLabel : "");
                return <option key={o.id} value={o.id}>{o.emoji} {olabel}</option>;
              })}
            </select>
            <button onClick={propose} disabled={busy || (!match.iGive.length && !match.iWant.length)} style={{ marginLeft: "auto", border: "none", cursor: "pointer", background: "#34c77b", color: "#06351f", fontWeight: 700, borderRadius: 8, padding: "6px 14px", opacity: (!match.iGive.length && !match.iWant.length) ? .5 : 1 }}>Send proposal</button>
          </div>
          <div style={{ fontSize: 13, color: "#dfe6ff" }}>You give: {match.iGive.length ? match.iGive.map(chip) : <span style={{ color: "#7e8cc0" }}>—</span>}</div>
          <div style={{ fontSize: 13, color: "#dfe6ff", marginTop: 4 }}>You get: {match.iWant.length ? match.iWant.map(chip) : <span style={{ color: "#7e8cc0" }}>—</span>}</div>
        </div>
      ) : <div style={{ color: "#9fb0e0", fontSize: 14 }}>When others publish, you can propose trades here.</div>}

      {mineOut.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 13, color: "#9fb0e0" }}>
          Your proposals: {mineOut.map((t) => <span key={t.tradeId} style={{ marginRight: 8 }}>→ {t.toName}: <b style={{ color: t.status === "accepted" ? "#34c77b" : t.status === "declined" ? "#e2473b" : "#f4b740" }}>{t.status}</b></span>)}
        </div>
      )}
    </div>
  );
}

function InviteRow({ label, hint, link }) {
  const [copied, setCopied] = React.useState(false);
  const qrRef = React.useRef(null);
  React.useEffect(() => {
    if (!qrRef.current || !link || typeof window.QRCode === "undefined") return;
    qrRef.current.innerHTML = "";
    try { new window.QRCode(qrRef.current, { text: link, width: 132, height: 132 }); } catch (e) {}
  }, [link]);
  const copy = async () => {
    const fallback = () => {
      try {
        const ta = document.createElement("textarea");
        ta.value = link; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.focus(); ta.select();
        document.execCommand("copy"); ta.remove();
        return true;
      } catch (e) { return false; }
    };
    let ok = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(link); ok = true; }
      else { ok = fallback(); }
    } catch (e) { ok = fallback(); } // clipboard API present but rejected (e.g. insecure context)
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1800); }
  };
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", background: "rgba(0,0,0,.18)", borderRadius: 10, padding: 10, marginTop: 10 }}>
      <div ref={qrRef} style={{ background: "#fff", padding: 5, borderRadius: 6, lineHeight: 0 }} />
      <div style={{ flex: "1 1 220px", minWidth: 190 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#bdf0d3" }}>{label}</div>
        {hint && <div style={{ fontSize: 11.5, color: "#9fb0e0", margin: "2px 0 6px" }}>{hint}</div>}
        <div style={{ fontSize: 11.5, color: "#9fb0e0", wordBreak: "break-all", marginBottom: 6, userSelect: "all" }}>{link}</div>
        <button onClick={copy} style={{ border: "none", cursor: "pointer", background: copied ? "#2a9d63" : "#34c77b", color: "#06351f", fontWeight: 800, borderRadius: 10, padding: "8px 14px", fontSize: 13.5 }}>{copied ? "✓ Copied!" : "📋 Copy"}</button>
      </div>
    </div>
  );
}

function InviteCard({ sync }) {
  const D = window.WCSYNC_DEFAULT || {};
  const SY = window.WCSTKSYNC;
  const fallbackHub = location.origin + location.pathname.replace(/[^/]*$/, "");
  const tsLink = D.tailscaleHub || null; // secret-free; opening it auto-joins via sync-config.js
  const publicHub = D.publicHub || (D.tailscaleHub ? null : fallbackHub);
  const publicLink = (SY && SY.buildInviteLink && publicHub) ? SY.buildInviteLink(publicHub, sync.url, sync.code) : null;
  if (!tsLink && !publicLink) return null;
  return (
    <div style={{ background: "rgba(52,199,123,.12)", border: "2px solid rgba(52,199,123,.45)", borderRadius: 14, padding: 14, marginBottom: 14 }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: "#bdf0d3" }}>📨 Invite your family</div>
      <div style={{ fontSize: 12.5, color: "#dfe6ff", marginTop: 4 }}>They join the same sticker system — scan a code or send a link.</div>
      {tsLink && <InviteRow label="🏠 On our network (Tailscale)" hint="Family on your Tailscale network: open this — it auto-joins, no key shared." link={tsLink} />}
      {publicLink && <InviteRow label="🌍 Anywhere (private link)" hint="Works on any device. This link includes your family key — send it privately." link={publicLink} />}
    </div>
  );
}

function FamilyConnected({ players, books, collections, activeId, sync, setSync }) {
  const SY = window.WCSTKSYNC, L = window.WCSTKLOGIC, WCSTK = window.WCSTK, B = window.WCSTKBOOKS;
  const idx = React.useMemo(() => L.buildIndex(WCSTK), [WCSTK]);
  const me = players.list.find((p) => p.id === activeId) || { name: "Me", emoji: "🙂" };
  const reg = (books && books[activeId]) || (B ? B.defaultRegistry(activeId) : { list: [{ id: activeId, label: "My album" }], active: activeId });
  const activeBook = reg.active;
  const map = (collections && collections[activeBook]) || {};
  const [data, setData] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [lastSync, setLastSync] = React.useState("");
  const [viewing, setViewing] = React.useState(null);

  const load = React.useCallback(async () => {
    setErr(""); setBusy(true);
    try {
      setData(await SY.postAction(sync, "getFamily", {}));
      setLastSync(new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }));
    }
    catch (e) { setErr(String(e.message || e)); }
    setBusy(false);
  }, [sync]);
  React.useEffect(() => { load(); }, [load]);

  const publish = async () => {
    setErr(""); setBusy(true);
    try {
      for (const bk of reg.list) {
        // The default book (id == playerId) publishes under the device memberId so it
        // updates — not duplicates — a row published before multi-book support existed.
        const remoteBookId = bk.id === activeId ? sync.memberId : bk.id;
        await SY.postAction(sync, "publishCollection",
          { name: me.name, emoji: me.emoji, bookId: remoteBookId, bookLabel: bk.label,
            collection: SY.serializeCollection(collections[bk.id] || {}) });
      }
      await load();
    } catch (e) { setErr(String(e.message || e)); setBusy(false); }
  };

  const totalsOf = (m) => L.playerTotals(m, idx);
  const fam = data ? SY.summarizeFamily(data.members, sync.memberId, totalsOf) : [];
  const famLabel = (f) => f.name + (f.bookLabel && f.bookLabel !== "My album" ? " · " + f.bookLabel : "");

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <button onClick={publish} disabled={busy} style={{ border: "none", cursor: "pointer", background: "#34c77b", color: "#06351f", fontWeight: 800, borderRadius: 10, padding: "9px 16px", fontSize: 15, opacity: busy ? .6 : 1 }}>⬆️ Publish my book{reg.list.length > 1 ? "s" : ""}</button>
        <button onClick={load} disabled={busy} style={{ border: "none", cursor: "pointer", background: "rgba(255,255,255,.12)", color: "#dfe6ff", fontWeight: 700, borderRadius: 10, padding: "9px 14px", fontSize: 14 }}>↻ Refresh</button>
        {lastSync && <span style={{ color: "#7e8cc0", fontSize: 12 }}>synced {lastSync}</span>}
        <button onClick={() => { if (!busy && window.confirm("Disconnect this device from family sync?")) setSync(null); }} disabled={busy} style={{ marginLeft: "auto", border: "none", cursor: "pointer", background: "transparent", color: "#7e8cc0", fontSize: 13, textDecoration: "underline" }}>Disconnect</button>
      </div>
      <InviteCard sync={sync} />
      {err && <div style={{ background: "rgba(226,71,59,.18)", border: "2px solid rgba(226,71,59,.5)", borderRadius: 12, padding: "10px 12px", color: "#ffd7d2", fontSize: 14, marginBottom: 12 }}>⚠️ {err}</div>}
      {busy && !data && <div style={{ color: "#9fb0e0", padding: 12 }}>Loading family…</div>}
      <div style={{ display: "grid", gap: 10 }}>
        {fam.map((f) => {
          const pct = f.total ? Math.round((f.have / f.total) * 100) : 0;
          const when = fmtWhen(f.updatedAt);
          return (
            <div key={f.id} onClick={() => setViewing(f)} style={{ background: "rgba(255,255,255,.06)", borderRadius: 12, padding: "10px 14px", cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, color: "#fff", marginBottom: 4 }}>
                <span>{f.emoji} {famLabel(f)} {f.isMe ? "(you)" : ""}</span>
                <span style={{ color: "#f4b740", fontWeight: 700 }}>{f.have}/{f.total} · {f.doubles} dbl</span>
              </div>
              {when && <div style={{ color: "#7e8cc0", fontSize: 12, marginBottom: 4 }}>updated {when}</div>}
              <div style={{ height: 6, background: "rgba(255,255,255,.1)", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ width: pct + "%", height: "100%", background: "#34c77b" }} />
              </div>
            </div>
          );
        })}
        {data && !fam.length && <div style={{ color: "#9fb0e0", padding: 12 }}>No one has published yet — tap "Publish my book".</div>}
      </div>
      <FamilyMemberModal member={viewing} idx={idx} onClose={() => setViewing(null)} />
      <FamilyTrades data={data} fam={fam} sync={sync} idx={idx} map={map} me={me} reload={load} setErr={setErr} setBusy={setBusy} busy={busy} />
    </div>
  );
}

function FamilyView({ map, players, books, collections, activeId, sync, setSync, goHelp }) {
  const SY = window.WCSTKSYNC;
  const [link, setLink] = React.useState("");
  const [linkErr, setLinkErr] = React.useState("");

  if (!sync) {
    const connect = () => {
      const fromLink = SY.parseSetupLink(link.indexOf("?") >= 0 ? link.slice(link.indexOf("?")) : "?" + link);
      if (fromLink) { setLinkErr(""); setSync({ url: fromLink.url, code: fromLink.code, memberId: SY.genMemberId() }); }
      else { setLinkErr("Couldn't read that link — paste the whole “?sync=…&code=…” part someone shared."); }
    };
    return (
      <div style={{ background: "rgba(52,199,123,.12)", border: "2px solid rgba(52,199,123,.45)", borderRadius: 14, padding: 16, maxWidth: 560 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#bdf0d3", marginBottom: 6 }}>👨‍👩‍👧 Trade with family far away</div>
        <div style={{ fontSize: 14, color: "#dfe6ff", marginBottom: 12, lineHeight: 1.45 }}>
          Paste the family setup link someone shared with you (it looks like <code>…/worldcup/?sync=…&code=…</code>). Then you can publish your collection and propose trades across households.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste setup link"
            style={{ fontFamily: "inherit", fontSize: 15, borderRadius: 10, border: "none", padding: "9px 12px", background: "rgba(255,255,255,.14)", color: "#fff", flex: "1 1 220px" }} />
          <button onClick={connect} style={{ border: "none", cursor: "pointer", background: "#34c77b", color: "#06351f", fontWeight: 800, borderRadius: 10, padding: "9px 18px", fontSize: 15 }}>Connect</button>
        </div>
        {linkErr && <div style={{ marginTop: 10, background: "rgba(226,71,59,.18)", border: "2px solid rgba(226,71,59,.5)", borderRadius: 12, padding: "8px 12px", color: "#ffd7d2", fontSize: 13.5 }}>⚠️ {linkErr}</div>}
        {goHelp && <div style={{ marginTop: 10 }}><HelpLink goHelp={goHelp} id="family-relative" label="How family trading works" /></div>}
      </div>
    );
  }
  return <FamilyConnected players={players} books={books} collections={collections} activeId={activeId} sync={sync} setSync={setSync} />;
}

function StickersTab({ collections, setSticker, players, books, addBook, renameBook, removeBook, switchBook, addPlayer, sync, setSync, goHelp }) {
  const [view, setView] = React.useState("book"); // book | trade | overview | family
  const B = window.WCSTKBOOKS;
  const activeId = players.active;
  const reg = (books && books[activeId]) || (B ? B.defaultRegistry(activeId) : { list: [{ id: activeId, label: "My album" }], active: activeId });
  const activeBook = reg.active;
  const map = (collections && collections[activeBook]) || {};

  const seg = (id, label) => (
    <button onClick={() => setView(id)} style={{ border: "none", cursor: "pointer", borderRadius: 12,
      padding: "9px 16px", fontSize: 15, fontWeight: 700,
      background: view === id ? "#f4b740" : "rgba(255,255,255,.1)", color: view === id ? "#16235a" : "#dfe6ff" }}>{label}</button>
  );

  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        {seg("book", "📖 My Book")}{seg("trade", "🔄 Trade Matcher")}{seg("overview", "📊 Overview")}{seg("family", "👨‍👩‍👧 Family")}
        {goHelp && <span style={{ marginLeft: "auto" }}><HelpLink goHelp={goHelp} id="stk-mark" label="How stickers work" /></span>}
      </div>
      {view === "book" && <MyBookView map={map} setSticker={setSticker} activeBook={activeBook} reg={reg} playerId={activeId} addBook={addBook} renameBook={renameBook} removeBook={removeBook} switchBook={switchBook} />}
      {view === "trade" && <TradeMatcherView collections={collections} players={players} books={books} activeId={activeId} addPlayer={addPlayer} />}
      {view === "overview" && <OverviewView collections={collections} players={players} books={books} addPlayer={addPlayer} />}
      {view === "family" && <FamilyView map={map} players={players} books={books} collections={collections} activeId={activeId} sync={sync} setSync={setSync} goHelp={goHelp} />}
    </div>
  );
}
