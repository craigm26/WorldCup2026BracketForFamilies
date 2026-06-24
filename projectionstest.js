const test = require('node:test');
const assert = require('node:assert');

// Bootstrap the browser globals the engine reads at call time.
global.window = global.window || {};
// hub-data.js runs a one-time localStorage migration at load — shim it for Node.
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
require('./worldcup/data.js');     // window.WC
require('./worldcup/hub-data.js'); // window.computeStandings / wcResolveBracket / wcQualifiers
const P = require('./worldcup/hub-projections.js');
const WC = global.window.WC;

// Group A fixtures: 0 MEX-RSA, 1 KOR-CZE, 2 CZE-RSA, 3 MEX-KOR, 4 CZE-MEX, 5 RSA-KOR.
// One game left (A-5 RSA v KOR); MEX already won the group, CZE already out.
const oneLeft = {
  'A-0': [3, 0], 'A-1': [2, 0], 'A-2': [0, 1], 'A-3': [1, 0], 'A-4': [0, 2],
};
const groupDone = Object.assign({}, oneLeft, { 'A-5': [2, 2] }); // RSA & KOR draw → both 4

function probShape(proj) {
  // numeric-only digest for determinism comparison (drops functions/closures)
  const out = {};
  Object.keys(proj.groups).forEach((g) => {
    out[g] = {};
    const pt = proj.groups[g].perTeam;
    Object.keys(pt).forEach((k) => { out[g][k] = pt[k].finishProb; });
  });
  return out;
}

test('deterministic: identical results → identical probabilities', () => {
  const a = probShape(P.wcProjections(oneLeft));
  const b = probShape(P.wcProjections(oneLeft));
  assert.deepStrictEqual(a, b);
});

test('branch count is 3^(remaining games)', () => {
  assert.equal(P.wcGroupScenarios('A', {}).branches, 729);        // 6 remaining
  assert.equal(P.wcGroupScenarios('A', oneLeft).branches, 3);     // 1 remaining
  assert.equal(P.wcGroupScenarios('A', groupDone).branches, 1);   // 0 remaining
  assert.equal(P.wcGroupScenarios('A', oneLeft).remainingCount, 1);
});

test('finish probabilities are coherent (each team sums to ~1, all in [0,1])', () => {
  const g = P.wcGroupScenarios('A', oneLeft);
  Object.keys(g.perTeam).forEach((k) => {
    const fp = g.perTeam[k].finishProb;
    const sum = fp[1] + fp[2] + fp[3] + fp[4];
    assert.ok(Math.abs(sum - 1) < 1e-9, k + ' sum=' + sum);
    [1, 2, 3, 4].forEach((p) => assert.ok(fp[p] >= 0 && fp[p] <= 1, k + ' p' + p));
  });
});

test('clinch & elimination are exact (points-based)', () => {
  const g = P.wcGroupScenarios('A', oneLeft).perTeam;
  assert.equal(g.MEX.clinchedWin, true, 'MEX won the group');
  assert.equal(g.MEX.clinchedTop2, true, 'MEX through');
  assert.equal(g.CZE.eliminated, true, 'CZE cannot reach top 2');
  assert.equal(g.KOR.clinchedTop2, false, 'KOR still needs the last game');
  assert.equal(g.KOR.eliminated, false, 'KOR still alive');
});

test('nothing clinched before any game is played', () => {
  const g = P.wcGroupScenarios('A', {}).perTeam;
  Object.keys(g).forEach((k) => {
    assert.equal(g[k].clinchedTop2, false, k);
    assert.equal(g[k].eliminated, false, k);
  });
});

test('a finished group collapses to a single deterministic order', () => {
  const g = P.wcGroupScenarios('A', groupDone);
  assert.equal(g.remainingCount, 0);
  // MEX 9 + one of RSA/KOR via the 2-2 draw (both 4) — exactly two teams clinched top 2.
  const through = Object.keys(g.perTeam).filter((k) => g.perTeam[k].clinchedTop2);
  assert.equal(through.length, 2, JSON.stringify(through));
  Object.keys(g.perTeam).forEach((k) => {
    const fp = g.perTeam[k].finishProb;
    [1, 2, 3, 4].forEach((p) => assert.ok(fp[p] === 0 || fp[p] === 1, k + ' should be 0/1'));
  });
});

test('outcome model: stronger rank favoured, equal ranks ≈ symmetric', () => {
  const strong = P.wcOutcomeProbs(1, 200);
  assert.ok(strong.pH > strong.pA * 3, JSON.stringify(strong));
  const even = P.wcOutcomeProbs(50, 50);
  assert.ok(Math.abs(even.pH - even.pA) < 1e-9, JSON.stringify(even));
});

test('projected R32 slot maps a group finisher to the right knockout match', () => {
  const resolved = window.wcResolveBracket(oneLeft, null, {});
  const win = P.wcProjectedSlot('A', 1, oneLeft, resolved); // feeder 1A
  assert.equal(win.matchNo, 79);
  assert.equal(win.city, 'Mexico City');
  assert.equal(win.date, 'Jun 30');
  assert.equal(win.oppFeeder, '3CEFHI');
  const run = P.wcProjectedSlot('A', 2, oneLeft, resolved); // feeder 2A
  assert.equal(run.matchNo, 73);
  assert.equal(run.oppFeeder, '2B');
});

test('position tables: 12 teams per place, ranked, with a 3rd-place cutoff', () => {
  const pt = P.wcPositionTables(oneLeft);
  [pt.first, pt.second, pt.third, pt.fourth].forEach((arr) => assert.equal(arr.length, 12));
  // each table is sorted by pts → gd → gf → rank
  for (let i = 1; i < pt.third.length; i++) {
    const a = pt.third[i - 1], b = pt.third[i];
    assert.ok(a.pts > b.pts || (a.pts === b.pts && a.gd >= b.gd), 'third not sorted at ' + i);
  }
  assert.equal(pt.thirdAdvance, 8);
  assert.equal(pt.thirdCutoffPts, pt.third[7].pts);
  assert.equal(pt.first[0].rank, 1);
  // every team appears exactly once across the four tables (48 total)
  const all = [...pt.first, ...pt.second, ...pt.third, ...pt.fourth].map((r) => r.k);
  assert.equal(new Set(all).size, 48);
});

test('best-3rd watch ranks all 12 thirds with an 8th-place cutoff', () => {
  const w = P.wcThirdPlaceWatch(oneLeft);
  assert.equal(w.ranked.length, 12);
  assert.equal(typeof w.cutoffPts, 'number');
  const s = w.statusForGroup('A');
  assert.ok(s && typeof s.rank === 'number' && typeof s.inTop8 === 'boolean');
});

// ---- DRAMA: snapshot + diff (the "what just changed" mechanic) ----

test('drama: snapshot is a JSON-serializable fingerprint with the expected keys', () => {
  const s = P.wcQualSnapshot(oneLeft);
  assert.equal(typeof s.hash, 'string');
  assert.equal(s.perTeam.MEX.g, 'A');
  assert.equal(typeof s.perTeam.MEX.clinchedTop2, 'boolean');
  assert.equal(typeof s.thirdCutoffPts, 'number');
  assert.equal(Object.keys(s.r32).length, 16);                       // R32 matches 73..88
  assert.deepStrictEqual(JSON.parse(JSON.stringify(s)), s);          // pure data — no functions/closures
});

test('drama: first-load and no-op guards return zero events', () => {
  const s = P.wcQualSnapshot(oneLeft);
  assert.deepEqual(P.wcDramaDiff(null, s), []);                      // no baseline ⇒ silent
  assert.deepEqual(P.wcDramaDiff(undefined, s), []);
  assert.deepEqual(P.wcDramaDiff(s, s), []);                         // identical played-scores hash
});

test('drama: a real clinch fires a big, ready-to-render event', () => {
  const prev = { 'A-0': [3, 0], 'A-1': [2, 0], 'A-2': [0, 1] };      // MEX 3 pts, nothing locked
  const ev = P.wcDramaDiff(P.wcQualSnapshot(prev), P.wcQualSnapshot(oneLeft)); // MEX win Group A
  const mex = ev.find((e) => e.teamCode === 'MEX');
  assert.ok(mex, 'MEX should get a drama event');
  assert.ok(mex.type === 'clinch_win' || mex.type === 'clinch_top2', mex.type);
  assert.equal(mex.severity, 'big');
  assert.ok(/Mexico/.test(mex.sentence) && mex.emoji && mex.id, 'has copy + emoji + id');
});

test('drama: a group-leader change fires ⬆️ with both team names', () => {
  const prev = { 'A-0': [0, 1] };                                    // RSA beat MEX → RSA lead A
  const cur = { 'A-0': [0, 1], 'A-1': [3, 0] };                      // KOR (+3) leapfrogs RSA (+1)
  const ev = P.wcDramaDiff(P.wcQualSnapshot(prev), P.wcQualSnapshot(cur));
  const lc = ev.find((e) => e.type === 'leader_change' && e.groupLetter === 'A');
  assert.ok(lc, 'expected a leader change in Group A');
  assert.equal(lc.teamCode, 'KOR');
  assert.equal(lc.otherCode, 'RSA');
  assert.ok(/South Korea/.test(lc.sentence) && /South Africa/.test(lc.sentence));
});

test('drama: events are deduped per team and sorted big→medium→small', () => {
  const prev = { 'A-0': [3, 0], 'A-1': [2, 0], 'A-2': [0, 1] };
  const ev = P.wcDramaDiff(P.wcQualSnapshot(prev), P.wcQualSnapshot(oneLeft));
  const seen = {};
  ev.filter((e) => e.teamCode && e.type !== 'r32_opp_change').forEach((e) => {
    assert.ok(!seen[e.teamCode], 'duplicate team event ' + e.teamCode);
    seen[e.teamCode] = 1;
  });
  const rank = { big: 0, medium: 1, small: 2 };
  for (let i = 1; i < ev.length; i++) assert.ok(rank[ev[i - 1].severity] <= rank[ev[i].severity], 'unsorted at ' + i);
});

test('drama: hand-built snapshots exercise third8 / r32 / cutoff transitions', () => {
  const peq = { JOR: { g: 'H', clinchedWin: false, clinchedTop2: false, eliminated: false, pThird: 0.2 },
                ECU: { g: 'E', clinchedWin: false, clinchedTop2: false, eliminated: false, pThird: 0.2 } };
  const prev = { hash: 'h1', perTeam: peq, third8: { JOR: true }, thirdCutoffPts: 1,
                 leader: { H: 'ARG' }, r32: { 79: { top: 'MEX', bot: 'JOR' } } };
  const cur = { hash: 'h2', perTeam: peq, third8: { ECU: true }, thirdCutoffPts: 2,
                leader: { H: 'AUT' }, r32: { 79: { top: 'MEX', bot: 'ECU' } } };
  const ev = P.wcDramaDiff(prev, cur);
  const types = ev.map((e) => e.type);
  assert.ok(types.includes('third8_out'), 'JOR dropped out of the best-3rd 8');
  assert.ok(types.includes('third8_in'), 'ECU climbed into the best-3rd 8');
  assert.ok(types.includes('leader_change'), 'Group H leader AUT over ARG');
  assert.ok(types.includes('r32_opp_change'), 'M79 pairing changed');
  assert.ok(types.includes('cutoff_move'), 'cutoff 1→2');
  assert.ok(/Mexico/.test(ev.find((e) => e.type === 'r32_opp_change').sentence));
  assert.ok(/Ecuador/.test(ev.find((e) => e.type === 'r32_opp_change').sentence));
  assert.ok(/2 points/.test(ev.find((e) => e.type === 'cutoff_move').sentence));
  assert.equal(ev[0].severity, 'big');                              // third8_out leads
});

test('drama: r32_opp_change only fires between two real teams, never a feeder fill-in', () => {
  const prev = { hash: 'a', perTeam: {}, third8: {}, thirdCutoffPts: 0, leader: {},
                 r32: { 79: { top: 'MEX', bot: null } } };           // bottom still a feeder
  const cur = { hash: 'b', perTeam: {}, third8: {}, thirdCutoffPts: 0, leader: {},
                r32: { 79: { top: 'MEX', bot: 'ECU' } } };           // feeder resolved (not a swap)
  assert.equal(P.wcDramaDiff(prev, cur).filter((e) => e.type === 'r32_opp_change').length, 0);
});

test('drama: a clinch off a LIVE score is held until the game is FINAL', () => {
  // Group A: A-0..A-3 final; A-4 (CZE v MEX) is the game that locks MEX's group win.
  const base = { 'A-0': [3, 0], 'A-1': [2, 0], 'A-2': [0, 1], 'A-3': [1, 0] };
  const withA4 = Object.assign({}, base, { 'A-4': [0, 3] }); // MEX winning big
  const prev = P.wcQualSnapshot(base, {});
  const liveSnap = P.wcQualSnapshot(withA4, { 'A-4': 'LIVE' }); // same score, still in play
  const ftSnap = P.wcQualSnapshot(withA4, { 'A-4': 'FT' });     // same score, now final
  // while LIVE: no absolute clinch claim for MEX
  assert.equal(P.wcDramaDiff(prev, liveSnap).filter((e) => e.teamCode === 'MEX' && /clinch/.test(e.type)).length, 0,
    'must not clinch off an in-progress score');
  // LIVE→FT (identical score) still changes the hash, and NOW the clinch is allowed to fire
  assert.notEqual(liveSnap.hash, ftSnap.hash, 'finalization must change the hash');
  assert.ok(P.wcDramaDiff(liveSnap, ftSnap).filter((e) => e.teamCode === 'MEX' && /clinch/.test(e.type)).length >= 1,
    'clinch fires once the game is final');
});

test('drama: cutoff_move and r32_opp_change carry clean, match-scoped ids', () => {
  const prev = { hash: 'a', perTeam: {}, third8: {}, thirdCutoffPts: 1, leader: {},
                 r32: { 79: { top: 'MEX', bot: 'JOR' } } };
  const cur = { hash: 'b', perTeam: {}, third8: {}, thirdCutoffPts: 2, leader: {},
                r32: { 79: { top: 'MEX', bot: 'ECU' } } };
  const ev = P.wcDramaDiff(prev, cur);
  const cut = ev.find((e) => e.type === 'cutoff_move');
  const opp = ev.find((e) => e.type === 'r32_opp_change');
  assert.ok(!/mundefined/.test(cut.id), 'cutoff id is clean: ' + cut.id);
  assert.equal(opp.id, 'r32_opp_change:m79:b', 'r32 id keys on the match number');
});

test('drama: events carry the "because" — the goal that triggered them', () => {
  const prev = { 'A-0': [0, 2], 'A-1': [0, 0] }; // A-1 (KOR v CZE) kicked off, 0-0
  const cur = { 'A-0': [0, 2], 'A-1': [0, 3] };  // Czechia score → they leapfrog to lead Group A
  const st = { 'A-1': 'LIVE' };
  const ev = P.wcDramaDiff(P.wcQualSnapshot(prev, st), P.wcQualSnapshot(cur, st));
  assert.ok(ev.length, 'a leader flip should produce events');
  assert.ok(ev.every((e) => e.causeKey === 'A-1'), 'all stamped with the one changed fixture');
  assert.ok(/Czechia scored/.test(ev[0].causeText), 'cause names the scorer: ' + ev[0].causeText);
});

test('drama: summary collapses churn into one line per type, under one cause', () => {
  const mk = (type, teamCode, sev, extra) => Object.assign({ type: type, teamCode: teamCode, severity: sev,
    emoji: 'x', sentence: type + ' ' + teamCode, causeKey: 'B-3', causeText: 'Bosnia & Herz. scored — Bosnia & Herz. 2–1 Qatar', causeCode: 'BIH', ts: 1000 }, extra || {});
  const events = [
    mk('clinch_top2', 'MEX', 'big'),
    mk('third8_out', 'CRO', 'big'), mk('third8_out', 'PAR', 'big'), mk('third8_out', 'CPV', 'big'),
    mk('third8_in', 'FRA', 'medium'), mk('third8_in', 'NED', 'medium'),
    mk('r32_opp_change', 'MEX', 'small', { matchNo: 79 }), mk('r32_opp_change', 'USA', 'small', { matchNo: 80 }),
  ];
  const batches = P.wcSummarizeDrama(events);
  assert.equal(batches.length, 1, 'one cause batch');
  assert.ok(/Bosnia & Herz\. scored/.test(batches[0].causeText));
  // clinch (1) + third8_out summary (1) + third8_in summary (1) + r32 summary (1)
  assert.equal(batches[0].rows.length, 4, JSON.stringify(batches[0].rows.map((r) => r.sentence)));
  const out = batches[0].rows.find((r) => /dropped off/.test(r.sentence));
  assert.ok(out && out.teams.length === 3 && /^3 teams/.test(out.sentence), 'three teams folded into one line');
  assert.ok(/^2 projected Round-of-32 ties/.test(batches[0].rows.find((r) => /Round-of-32/.test(r.sentence)).sentence));
});

test('drama: a cold/stale baseline catch-up (many matches at once) stays silent', () => {
  const empty = P.wcQualSnapshot({}, {});
  const full = P.wcQualSnapshot({ 'A-0': [1, 0], 'A-1': [2, 0], 'A-2': [0, 1], 'A-3': [1, 0], 'A-4': [0, 2], 'A-5': [2, 2],
    'B-0': [1, 0], 'B-1': [2, 0], 'B-2': [0, 1], 'B-3': [1, 0] }, {}); // 10 fixtures appear at once
  assert.deepEqual(P.wcDramaDiff(empty, full), [], 'no flood when the baseline is catching up');
});

test('drama: snapshot.third8 == the best-8 thirds and all sit in real R32 slots', () => {
  const s = P.wcQualSnapshot(oneLeft);
  const best8 = P.wcThirdPlaceWatch(oneLeft).ranked.slice(0, 8).map((t) => t.k).sort();
  assert.deepStrictEqual(Object.keys(s.third8).sort(), best8);
  const resolved = window.wcResolveBracket(oneLeft, null, {});
  const slotTeams = new Set();
  Object.values(resolved.matchTeams).forEach((t) => { if (t.top) slotTeams.add(t.top); if (t.bot) slotTeams.add(t.bot); });
  Object.keys(s.third8).forEach((k) => assert.ok(slotTeams.has(k), k + ' (best-3rd) should fill an R32 slot'));
});
