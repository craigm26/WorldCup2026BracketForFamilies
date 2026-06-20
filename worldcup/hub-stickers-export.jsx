/* 📤 Sticker-book export dialog — pick a book, choose any combination of
   have/need/duplicates (or one-tap presets), and copy or download as text/.csv/.html.
   Generation lives in sticker-export.js (window.WCSTKEXPORT). */
function StickerExportModal({ entries, defaultBookId, onClose }) {
  const X = window.WCSTKEXPORT;
  const list = (entries && entries.length) ? entries : [{ key: "x", bookId: "x", name: "My album", emoji: "📗", map: {} }];
  const [bookId, setBookId] = React.useState(defaultBookId || list[0].bookId);
  const [cats, setCats] = React.useState({ have: false, need: true, duplicates: false }); // default: a "need" list
  const [format, setFormat] = React.useState("text");
  const [copied, setCopied] = React.useState(false);

  const entry = list.find((e) => e.bookId === bookId) || list[0];
  const order = [["have", "Have"], ["need", "Need"], ["duplicates", "Duplicates"]];
  const selectedLabels = order.filter(([k]) => cats[k]).map(([, l]) => l);
  const everything = cats.have && cats.need;
  const cleared = !cats.have && !cats.need && !cats.duplicates;
  const today = (() => { try { return new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); } catch (e) { return ""; } })();
  const info = { bookName: entry.name, categories: everything ? ["Everything"] : selectedLabels, date: today };

  const rows = React.useMemo(() => (X ? X.rows(entry.map, cats) : []), [entry, cats]);
  const content = React.useMemo(() => (X ? X.generate(format, rows, info) : ""), [rows, format, info.bookName, JSON.stringify(info.categories)]);

  const preset = (label, emoji, next) => (
    <button onClick={() => setCats(next)} key={label}
      style={{ border: "none", cursor: "pointer", borderRadius: 12, padding: "9px 12px", fontSize: 13.5, fontWeight: 700, background: "rgba(255,255,255,.1)", color: "#dfe6ff", whiteSpace: "nowrap" }}>
      {emoji} {label}
    </button>
  );
  const toggle = ([k, label]) => (
    <button onClick={() => setCats((c) => Object.assign({}, c, { [k]: !c[k] }))} key={k}
      style={{ border: "none", cursor: "pointer", borderRadius: 20, padding: "7px 15px", fontSize: 14, fontWeight: 700,
        background: cats[k] ? "#34c77b" : "rgba(255,255,255,.1)", color: cats[k] ? "#06351f" : "#dfe6ff" }}>
      {cats[k] ? "✓ " : ""}{label}
    </button>
  );
  const fmtBtn = (id, label) => (
    <button onClick={() => setFormat(id)} key={id}
      style={{ border: "none", cursor: "pointer", borderRadius: 10, padding: "8px 16px", fontSize: 14, fontWeight: 700,
        background: format === id ? "#f4b740" : "rgba(255,255,255,.1)", color: format === id ? "#16235a" : "#dfe6ff" }}>{label}</button>
  );

  const copy = async () => {
    const fallback = () => { try { const ta = document.createElement("textarea"); ta.value = content; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.focus(); ta.select(); document.execCommand("copy"); ta.remove(); return true; } catch (e) { return false; } };
    let ok = false;
    try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(content); ok = true; } else ok = fallback(); }
    catch (e) { ok = fallback(); }
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1800); }
  };
  const blob = () => new Blob([content], { type: X.mime(format) + ";charset=utf-8" });
  const download = () => {
    try { const a = document.createElement("a"); a.href = URL.createObjectURL(blob()); a.download = X.filename(info, format);
      document.body.appendChild(a); a.click(); setTimeout(() => { a.remove(); URL.revokeObjectURL(a.href); }, 100); } catch (e) {}
  };
  const openTab = () => { try { const u = URL.createObjectURL(blob()); window.open(u, "_blank"); setTimeout(() => URL.revokeObjectURL(u), 30000); } catch (e) {} };

  const lbl = { fontSize: 13, fontWeight: 700, color: "#9fb0e0", margin: "14px 0 7px" };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(8,16,40,.84)", zIndex: 160, display: "grid", placeItems: "center", padding: 18 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#16235a", borderRadius: 20, padding: 22, width: "100%", maxWidth: 620, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.5)", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div style={{ fontSize: 22, fontWeight: 800, flex: 1 }}>📤 Export stickers</div>
          <button onClick={onClose} style={{ border: "none", background: "rgba(255,255,255,.15)", color: "#fff", fontWeight: 700, borderRadius: 10, padding: "7px 13px", cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ fontSize: 13.5, color: "#9fb0e0", marginBottom: 6 }}>A text list, spreadsheet (.csv) or printable web page (.html) of any books.</div>

        <div style={lbl}>Book</div>
        <select value={bookId} onChange={(e) => setBookId(e.target.value)}
          style={{ width: "100%", fontFamily: "inherit", fontSize: 15, borderRadius: 10, border: "none", padding: "10px 12px", background: "rgba(255,255,255,.12)", color: "#fff" }}>
          {list.map((e) => <option key={e.bookId} value={e.bookId} style={{ color: "#16235a" }}>{e.emoji} {e.name}</option>)}
        </select>

        <div style={lbl}>Quick picks</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {preset("Need list", "🛒", { have: false, need: true, duplicates: false })}
          {preset("Duplicates", "🔄", { have: false, need: false, duplicates: true })}
          {preset("My collection", "✅", { have: true, need: false, duplicates: false })}
          {preset("Everything", "📋", { have: true, need: true, duplicates: false })}
        </div>

        <div style={lbl}>…or any combination</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{order.map(toggle)}</div>

        <div style={lbl}>Format</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {fmtBtn("text", "📝 Text")}{fmtBtn("csv", "📊 CSV")}{fmtBtn("html", "🌐 HTML")}
        </div>

        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "16px 0 6px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#9fb0e0" }}>Preview</div>
          <div style={{ fontSize: 13, color: cleared ? "#ffb3ad" : "#34c77b", fontWeight: 700 }}>{cleared ? "pick a category" : rows.length + " sticker" + (rows.length === 1 ? "" : "s")}</div>
        </div>
        <textarea readOnly value={content} spellCheck={false}
          style={{ width: "100%", height: 150, fontFamily: "ui-monospace, Menlo, Consolas, monospace", fontSize: 12, borderRadius: 10, border: "none", padding: 12, background: "#0f1c44", color: "#dfe6ff", resize: "vertical", whiteSpace: "pre", overflow: "auto" }} />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          <button onClick={copy} disabled={cleared} style={{ border: "none", cursor: cleared ? "default" : "pointer", background: copied ? "#34c77b" : "rgba(255,255,255,.14)", color: copied ? "#06351f" : "#fff", fontWeight: 700, borderRadius: 12, padding: "11px 18px", fontSize: 15, opacity: cleared ? .5 : 1 }}>{copied ? "✓ Copied!" : "📋 Copy"}</button>
          <button onClick={download} disabled={cleared} style={{ border: "none", cursor: cleared ? "default" : "pointer", background: "#f4b740", color: "#16235a", fontWeight: 800, borderRadius: 12, padding: "11px 18px", fontSize: 15, opacity: cleared ? .5 : 1 }}>⬇ Download .{X ? X.ext(format) : format}</button>
          {format === "html" && <button onClick={openTab} disabled={cleared} style={{ border: "none", cursor: cleared ? "default" : "pointer", background: "rgba(255,255,255,.14)", color: "#fff", fontWeight: 700, borderRadius: 12, padding: "11px 18px", fontSize: 15, opacity: cleared ? .5 : 1 }}>🌐 Open / Print</button>}
        </div>
      </div>
    </div>
  );
}
window.StickerExportModal = StickerExportModal;
