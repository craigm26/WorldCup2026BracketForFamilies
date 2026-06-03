/* Hub · Play tab — a kid flag/country/food quiz built from the team data. */
function QChip({ label, val }) {
  return (
    <div style={{ background: "rgba(255,255,255,.08)", borderRadius: 12, padding: "8px 16px", display: "flex", gap: 8, alignItems: "baseline" }}>
      <span style={{ fontSize: 13, color: "#9fb0e0", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 700, color: "#f4b740" }}>{val}</span>
    </div>
  );
}

function PlayTab() {
  const WC = window.WC;
  const codes = Object.keys(WC.T);
  const [best, setBest] = React.useState(() => { try { return +localStorage.getItem("wc26quizbest") || 0; } catch (e) { return 0; } });
  const [score, setScore] = React.useState(0);
  const [streak, setStreak] = React.useState(0);
  const [q, setQ] = React.useState(null);
  const [picked, setPicked] = React.useState(null);

  const sample = (n, exclude) => { const pool = codes.filter((c) => c !== exclude); const out = []; while (out.length < n && pool.length) { out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]); } return out; };
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  const newQ = React.useCallback(() => {
    const answer = codes[Math.floor(Math.random() * codes.length)];
    const opts = shuffle(sample(3, answer).concat([answer]));
    const types = ["flag2name", "name2flag", "food2name"];
    setQ({ type: types[Math.floor(Math.random() * types.length)], answer: answer, opts: opts });
    setPicked(null);
  }, []);
  React.useEffect(() => { newQ(); }, [newQ]);
  if (!q) return null;

  const T = WC.T, ans = T[q.answer];
  const optIsFlag = q.type === "flag2name";
  const showFlag = q.type === "name2flag";
  const prompt = q.type === "flag2name" ? <span>Which flag is <b style={{ color: "#f4b740" }}>{ans.n}</b>?</span>
    : q.type === "name2flag" ? <span>Which country is this flag?</span>
      : <span>Who is famous for <b style={{ color: "#f4b740" }}>{ans.food}</b>? 🍽️</span>;
  const onPick = (c) => {
    if (picked) return;
    setPicked(c);
    if (c === q.answer) { const ns = score + 1; setScore(ns); setStreak((s) => s + 1); if (ns > best) { setBest(ns); try { localStorage.setItem("wc26quizbest", "" + ns); } catch (e) {} } }
    else setStreak(0);
  };

  return (
    <div style={{ height: "100%", overflow: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 18, maxWidth: 760, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
        <QChip label="Score" val={score} /><QChip label="🔥 Streak" val={streak} /><QChip label="🏅 Best" val={best} />
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, textAlign: "center" }}>{prompt}</div>
      {showFlag && <Flag code={ans.c} w={160} style={{ border: "4px solid #fff", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,.4)" }} />}
      <div style={{ display: "grid", gridTemplateColumns: optIsFlag ? "repeat(2,1fr)" : "1fr", gap: 14, width: "100%" }}>
        {q.opts.map((c) => {
          const correct = c === q.answer, isPicked = picked === c;
          const bg = !picked ? "rgba(255,255,255,.08)" : correct ? "rgba(52,199,123,.3)" : isPicked ? "rgba(226,71,59,.3)" : "rgba(255,255,255,.05)";
          const bd = !picked ? "2px solid rgba(255,255,255,.15)" : correct ? "2px solid #34c77b" : isPicked ? "2px solid #e2473b" : "2px solid transparent";
          return (
            <button key={c} onClick={() => onPick(c)} disabled={!!picked} style={{ cursor: picked ? "default" : "pointer", background: bg, border: bd, borderRadius: 16, padding: optIsFlag ? 12 : "16px 18px", color: "#fff", display: "flex", alignItems: "center", gap: 12, justifyContent: optIsFlag ? "center" : "flex-start" }}>
              {optIsFlag
                ? <Flag code={T[c].c} w={150} style={{ border: "3px solid #fff", borderRadius: 6 }} />
                : <React.Fragment><Flag code={T[c].c} w={44} style={{ border: "2px solid #fff", borderRadius: 4, flex: "none" }} /><span style={{ fontSize: 20, fontWeight: 700 }}>{T[c].n}</span></React.Fragment>}
              {picked && correct && <span style={{ marginLeft: "auto", fontSize: 22 }}>✅</span>}
            </button>
          );
        })}
      </div>
      {picked && (
        <div style={{ alignSelf: "stretch", background: "rgba(244,183,64,.12)", border: "2px solid rgba(244,183,64,.4)", borderRadius: 16, padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: picked === q.answer ? "#7ee0a6" : "#ffb3ad", marginBottom: 6 }}>{picked === q.answer ? "🎉 Correct!" : "Oops — it's " + ans.n + "!"}</div>
          <div style={{ fontSize: 15, color: "#fff", lineHeight: 1.4 }}>⭐ {(ans.facts && ans.facts[0]) || ans.fact}</div>
          <button onClick={newQ} style={{ marginTop: 12, border: "none", cursor: "pointer", background: "#f4b740", color: "#16235a", fontWeight: 700, borderRadius: 12, padding: "10px 22px", fontSize: 16 }}>Next ›</button>
        </div>
      )}
    </div>
  );
}
window.PlayTab = PlayTab;
