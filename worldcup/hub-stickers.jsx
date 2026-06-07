/* 🎟️ Stickers tab — Panini WC2026 collection tracker (manual-first). */
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

  const applyScan = (guesses) => {
    // keys are string sticker codes — pass them through unchanged
    Object.keys(guesses).forEach((n) => { if (guesses[n] && (map[n] || 0) < 1) setSticker(activeId, n, 1); });
  };

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
      <div style={{ marginBottom: 10 }}><ScanPage page={fullPage} map={map} onApply={applyScan} /></div>
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
  const [camMsg, setCamMsg] = React.useState("");
  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);

  const stop = () => { if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; } };
  React.useEffect(() => stop, []);

  const startCam = async () => {
    setCamMsg("");
    if (!("BarcodeDetector" in window)) { setCamMsg("This device can't auto-read numbers — type it below."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      const det = new window.BarcodeDetector({ formats: ["code_128", "ean_13", "qr_code"] });
      const tick = async () => {
        if (!streamRef.current || !videoRef.current) return;
        try {
          const codes = await det.detect(videoRef.current);
          // sticker codes are alphanumeric (MEX5, FW3, 00) — grab the first token
          const hit = codes.map((c) => (c.rawValue || "").toUpperCase().match(/[A-Z0-9]+/)).find(Boolean);
          if (hit) { setNum(hit[0]); setCamMsg("Read " + hit[0] + " — confirm below."); stop(); return; }
        } catch (e) {}
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch (e) { setCamMsg("Camera unavailable — type the code below."); }
  };

  // sticker codes are STRING codes (e.g. MEX5). Add the code as-is.
  const add = () => { const n = num.trim(); if (n) { onAdd(n); setNum(""); setOpen(false); stop(); } };

  if (!open) return (
    <button onClick={() => { setOpen(true); startCam(); }} style={{ border: "none", cursor: "pointer", borderRadius: 20,
      padding: "6px 14px", fontSize: 14, fontWeight: 700, background: "rgba(255,255,255,.12)", color: "#dfe6ff" }}>📷 Scan a swap</button>
  );

  return (
    <div style={{ background: "rgba(0,0,0,.35)", borderRadius: 12, padding: 10, display: "flex", flexDirection: "column", gap: 8, flex: "1 1 220px" }}>
      <video ref={videoRef} muted playsInline style={{ width: "100%", maxHeight: 160, borderRadius: 8, background: "#000", objectFit: "cover" }} />
      {camMsg && <div style={{ fontSize: 12.5, color: "#9fc0ff" }}>{camMsg}</div>}
      <div style={{ display: "flex", gap: 6 }}>
        <input value={num} onChange={(e) => setNum(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="Code e.g. MEX5"
          style={{ fontFamily: "inherit", fontSize: 14, borderRadius: 8, border: "none", padding: "7px 10px", width: 120, background: "rgba(255,255,255,.14)", color: "#fff" }} />
        <button onClick={add} style={{ border: "none", cursor: "pointer", background: "#34c77b", color: "#06351f", fontWeight: 700, borderRadius: 8, padding: "7px 14px" }}>Add +1</button>
        <button onClick={() => { setOpen(false); stop(); }} style={{ border: "none", cursor: "pointer", background: "rgba(255,255,255,.12)", color: "#dfe6ff", borderRadius: 8, padding: "7px 12px" }}>Close</button>
      </div>
    </div>
  );
}

function ScanPage({ page, map, onApply }) {
  const L = window.WCSTKLOGIC;
  const [open, setOpen] = React.useState(false);
  const [guesses, setGuesses] = React.useState(null); // { n: bool }
  const [msg, setMsg] = React.useState("");
  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const stop = () => { if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; } };
  React.useEffect(() => stop, []);

  const [auto, setAuto] = React.useState(false);

  const start = async () => {
    setMsg(""); setGuesses(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = s; if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play(); }
    } catch (e) { setMsg("Camera unavailable on this device."); }
  };

  const capture = () => {
    const v = videoRef.current; if (!v || !v.videoWidth) { setMsg("Point the camera at the page first."); return; }
    const cv = document.createElement("canvas"); cv.width = v.videoWidth; cv.height = v.videoHeight;
    const ctx = cv.getContext("2d"); ctx.drawImage(v, 0, 0);
    const cellW = cv.width / page.cols, cellH = cv.height / page.rows;
    const out = {};
    page.slots.forEach((slot, i) => {
      const r = Math.floor(i / page.cols), c = i % page.cols;
      const data = ctx.getImageData(c * cellW, r * cellH, cellW, cellH).data;
      const gray = [];
      for (let p = 0; p < data.length; p += 4 * 37) gray.push(0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]);
      out[slot.n] = L.guessFilled(gray, 40);
    });
    stop();
    if (auto) { onApply(out); setOpen(false); setGuesses(null); setMsg(""); return; }
    setGuesses(out); setMsg("Tap any cell to fix it, then Apply.");
  };

  const toggle = (n) => setGuesses((g) => Object.assign({}, g, { [n]: !g[n] }));
  const apply = () => { onApply(guesses); setOpen(false); setGuesses(null); stop(); };

  if (!open) return (
    <button onClick={() => { setOpen(true); start(); }} style={{ border: "none", cursor: "pointer", borderRadius: 10,
      padding: "6px 12px", fontSize: 13, fontWeight: 700, background: "rgba(255,255,255,.12)", color: "#dfe6ff" }}>📷 Scan this page</button>
  );

  return (
    <div style={{ background: "rgba(0,0,0,.4)", borderRadius: 12, padding: 10, marginBottom: 10 }}>
      {!guesses && <video ref={videoRef} muted playsInline style={{ width: "100%", maxHeight: 240, borderRadius: 8, background: "#000", objectFit: "cover" }} />}
      {guesses && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${page.cols}, 1fr)`, gap: 6, marginBottom: 8 }}>
          {page.slots.map((s) => (
            <div key={s.n} onClick={() => toggle(s.n)} style={{ cursor: "pointer", textAlign: "center", borderRadius: 8, padding: "8px 4px", fontSize: 12, fontWeight: 700,
              background: guesses[s.n] ? "rgba(52,199,123,.3)" : "rgba(255,255,255,.06)", border: guesses[s.n] ? "2px solid #34c77b" : "2px dashed rgba(255,255,255,.2)", color: "#fff" }}>
              #{s.n}<br />{guesses[s.n] ? "have" : "—"}
            </div>
          ))}
        </div>
      )}
      {msg && <div style={{ fontSize: 12.5, color: "#9fc0ff", marginBottom: 8 }}>{msg}</div>}
      <div style={{ display: "flex", gap: 6 }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#dfe6ff", fontSize: 12.5, marginRight: "auto" }}>
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Auto (no confirm)
        </label>
        {!guesses && <button onClick={capture} style={{ border: "none", cursor: "pointer", background: "#f4b740", color: "#16235a", fontWeight: 700, borderRadius: 8, padding: "7px 14px" }}>Capture</button>}
        {guesses && <button onClick={apply} style={{ border: "none", cursor: "pointer", background: "#34c77b", color: "#06351f", fontWeight: 700, borderRadius: 8, padding: "7px 14px" }}>Apply</button>}
        <button onClick={() => { setOpen(false); setGuesses(null); stop(); }} style={{ border: "none", cursor: "pointer", background: "rgba(255,255,255,.12)", color: "#dfe6ff", borderRadius: 8, padding: "7px 12px" }}>Close</button>
      </div>
    </div>
  );
}

function StickerDetail({ slot, count, onClose }) {
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
        <button onClick={onClose} style={{ marginTop: 16, width: "100%", border: "none", cursor: "pointer", background: "#f4b740", color: "#16235a", fontWeight: 800, borderRadius: 12, padding: "10px 0", fontSize: 15 }}>Close</button>
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
  const [info, setInfo] = React.useState(null); // slot shown in the detail modal

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
            <StickerPage page={p} map={map} onTap={onTap} onMinus={onMinus} onInfo={setInfo} setSticker={setSticker} activeId={activeId} />
          </React.Fragment>
        );
      }) : <div style={{ color: "#9fb0e0", padding: 24, textAlign: "center" }}>No stickers match.</div>}
      <StickerDetail slot={info} count={info ? (map[info.n] || 0) : 0} onClose={() => setInfo(null)} />
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

function TradeMatcherView({ collections, players, activeId, addPlayer }) {
  const L = window.WCSTKLOGIC, WCSTK = window.WCSTK;
  const idx = React.useMemo(() => L.buildIndex(WCSTK), [WCSTK]);
  const others = players.list.filter((p) => p.id !== activeId);
  const [otherId, setOtherId] = React.useState(others.length ? others[0].id : null);

  if (!others.length) return (
    <AddPlayerCard addPlayer={addPlayer}
      title="🔄 Trading needs at least two people"
      blurb="Add each family member as a player — then the Trade Matcher shows exactly which of your doubles you can swap for the stickers they still need. (Players are shared with the 🏠 Home Pick'em.)" />
  );

  // reconcile the selection if the player list changed (e.g. a future header switcher)
  const validOtherId = others.some((p) => p.id === otherId) ? otherId : others[0].id;
  const mine = collections[activeId] || {};
  const theirs = collections[validOtherId] || {};
  const r = L.tradeMatch(mine, theirs, idx);
  const me = players.list.find((p) => p.id === activeId);
  const them = players.list.find((p) => p.id === validOtherId);

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ color: "#dfe6ff", fontWeight: 600 }}>Trade {me ? me.emoji + " " + me.name : "you"} with</span>
        <select value={validOtherId} onChange={(e) => setOtherId(e.target.value)} style={{ fontFamily: "inherit", fontSize: 15,
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

function OverviewView({ collections, players, addPlayer }) {
  const L = window.WCSTKLOGIC, WCSTK = window.WCSTK;
  const idx = React.useMemo(() => L.buildIndex(WCSTK), [WCSTK]);
  const maps = players.list.map((p) => collections[p.id] || {});
  const rarest = L.rarestNeeded(maps, idx);
  return (
    <div>
      {players.list.length < 2 && (
        <div style={{ marginBottom: 16 }}>
          <AddPlayerCard addPlayer={addPlayer}
            title="👪 Add the whole family to compare"
            blurb="Each person gets their own collection. Add a player for each family member to see everyone’s progress side by side — and who needs what for trading." />
        </div>
      )}
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
      await SY.postAction(sync, "proposeTrade", { toId: target.id, toName: target.name, fromName: me.name,
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
              {others.map((o) => <option key={o.id} value={o.id}>{o.emoji} {o.name}</option>)}
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

function FamilyConnected({ map, players, activeId, sync, setSync }) {
  const SY = window.WCSTKSYNC, L = window.WCSTKLOGIC, WCSTK = window.WCSTK;
  const idx = React.useMemo(() => L.buildIndex(WCSTK), [WCSTK]);
  const me = players.list.find((p) => p.id === activeId) || { name: "Me", emoji: "🙂" };
  const [data, setData] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");

  const load = React.useCallback(async () => {
    setErr(""); setBusy(true);
    try { setData(await SY.postAction(sync, "getFamily", {})); }
    catch (e) { setErr(String(e.message || e)); }
    setBusy(false);
  }, [sync]);
  React.useEffect(() => { load(); }, [load]);

  const publish = async () => {
    setErr(""); setBusy(true);
    try {
      await SY.postAction(sync, "publishCollection",
        { name: me.name, emoji: me.emoji, collection: SY.serializeCollection(map) });
      await load();
    } catch (e) { setErr(String(e.message || e)); setBusy(false); }
  };

  const totalsOf = (m) => L.playerTotals(m, idx);
  const fam = data ? SY.summarizeFamily(data.members, sync.memberId, totalsOf) : [];

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <button onClick={publish} disabled={busy} style={{ border: "none", cursor: "pointer", background: "#34c77b", color: "#06351f", fontWeight: 800, borderRadius: 10, padding: "9px 16px", fontSize: 15, opacity: busy ? .6 : 1 }}>⬆️ Publish my collection</button>
        <button onClick={load} disabled={busy} style={{ border: "none", cursor: "pointer", background: "rgba(255,255,255,.12)", color: "#dfe6ff", fontWeight: 700, borderRadius: 10, padding: "9px 14px", fontSize: 14 }}>↻ Refresh</button>
        <button onClick={() => { if (window.confirm("Disconnect this device from family sync?")) setSync(null); }} style={{ marginLeft: "auto", border: "none", cursor: "pointer", background: "transparent", color: "#7e8cc0", fontSize: 13, textDecoration: "underline" }}>Disconnect</button>
      </div>
      {err && <div style={{ background: "rgba(226,71,59,.18)", border: "2px solid rgba(226,71,59,.5)", borderRadius: 12, padding: "10px 12px", color: "#ffd7d2", fontSize: 14, marginBottom: 12 }}>⚠️ {err}</div>}
      {busy && !data && <div style={{ color: "#9fb0e0", padding: 12 }}>Loading family…</div>}
      <div style={{ display: "grid", gap: 10 }}>
        {fam.map((f) => {
          const pct = f.total ? Math.round((f.have / f.total) * 100) : 0;
          return (
            <div key={f.id} style={{ background: "rgba(255,255,255,.06)", borderRadius: 12, padding: "10px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, color: "#fff", marginBottom: 6 }}>
                <span>{f.emoji} {f.name} {f.isMe ? "(you)" : ""}</span>
                <span style={{ color: "#f4b740", fontWeight: 700 }}>{f.have}/{f.total} · {f.doubles} dbl</span>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,.1)", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ width: pct + "%", height: "100%", background: "#34c77b" }} />
              </div>
            </div>
          );
        })}
        {data && !fam.length && <div style={{ color: "#9fb0e0", padding: 12 }}>No one has published yet — tap "Publish my collection".</div>}
      </div>
      <FamilyTrades data={data} fam={fam} sync={sync} idx={idx} map={map} me={me} reload={load} setErr={setErr} setBusy={setBusy} busy={busy} />
    </div>
  );
}

function FamilyView({ map, players, activeId, sync, setSync }) {
  const SY = window.WCSTKSYNC;
  const [link, setLink] = React.useState("");

  if (!sync) {
    const connect = () => {
      let cfg = null;
      const fromLink = SY.parseSetupLink(link.indexOf("?") >= 0 ? link.slice(link.indexOf("?")) : "?" + link);
      if (fromLink) cfg = { url: fromLink.url, code: fromLink.code, memberId: SY.genMemberId() };
      if (cfg) setSync(cfg);
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
      </div>
    );
  }
  return <FamilyConnected map={map} players={players} activeId={activeId} sync={sync} setSync={setSync} />;
}

function StickersTab({ collections, setSticker, players, addPlayer, sync, setSync }) {
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
        {seg("book", "📖 My Book")}{seg("trade", "🔄 Trade Matcher")}{seg("overview", "📊 Overview")}{seg("family", "👨‍👩‍👧 Family")}
      </div>
      {view === "book" && <MyBookView map={map} setSticker={setSticker} activeId={activeId} />}
      {view === "trade" && <TradeMatcherView collections={collections} players={players} activeId={activeId} addPlayer={addPlayer} />}
      {view === "overview" && <OverviewView collections={collections} players={players} addPlayer={addPlayer} />}
      {view === "family" && <FamilyView map={map} players={players} activeId={activeId} sync={sync} setSync={setSync} />}
    </div>
  );
}
