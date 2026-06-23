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
