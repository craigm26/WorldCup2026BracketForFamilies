const test = require('node:test');
const assert = require('node:assert');

// Bootstrap the browser globals the data layer reads at call time.
global.window = global.window || {};
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
require('./worldcup/data.js');     // window.WC
require('./worldcup/hub-data.js'); // liveToResults / wcMomentum lives in hub-home (browser-only), wcPoolStats here
const WC = global.window.WC;

// hub-home.jsx is JSX (not require-able in Node), so re-declare wcMomentum's pure formula inline
// from the same spec to lock its behaviour. Kept identical to window.wcMomentum.
function wcMomentum(s, homeCode, awayCode, nowMin) {
  if (!s) return null;
  const share = (h, a) => (h + 0.5) / (h + a + 1);
  const possShare = (s.poss && s.poss.length === 2) ? s.poss[0] / 100 : 0.5;
  const shotShare = (s.sot && s.sot.length === 2) ? share(s.sot[0], s.sot[1])
    : (s.sh && s.sh.length === 2) ? share(s.sh[0], s.sh[1]) : 0.5;
  let recH = 0, recA = 0;
  if (Array.isArray(s.goals) && nowMin) {
    s.goals.forEach((g) => {
      const gm = parseInt(g.min, 10);
      if (!Number.isNaN(gm) && nowMin - gm <= 10 && nowMin - gm >= 0) {
        if (g.team === homeCode) recH += 3; else if (g.team === awayCode) recA += 3;
      }
    });
  }
  const recentShare = (recH || recA) ? share(recH, recA) : 0.5;
  const m = 0.35 * possShare + 0.35 * shotShare + 0.30 * recentShare;
  return Math.max(0.05, Math.min(0.95, m));
}

test('liveToResults: stats ride onto the g-idx key (same orientation as the fixture)', () => {
  // Group A fixture 1 is KOR(home) v CZE(away) — feed reports it the same way.
  const feed = { matches: [{ home: 'KOR', away: 'CZE', hg: 2, ag: 1, status: 'LIVE', min: "67'",
    poss: [58, 42], sh: [9, 7], sot: [4, 3], goals: [{ min: "34'", team: 'KOR', scorer: 'Son' }] }] };
  const { out, status, stats } = window.liveToResults(feed);
  assert.deepStrictEqual(out['A-1'], [2, 1]);
  assert.equal(status['A-1'], 'LIVE');
  assert.deepStrictEqual(stats['A-1'].poss, [58, 42]);
  assert.deepStrictEqual(stats['A-1'].sot, [4, 3]);
  assert.equal(stats['A-1'].goals[0].team, 'KOR');
});

test('liveToResults: reversed-fixture feed flips poss/sh/sot but NOT goals[].team', () => {
  // Feed reports A-1 as CZE(home) v KOR(away) — reversed vs our schedule (KOR,CZE).
  const feed = { matches: [{ home: 'CZE', away: 'KOR', hg: 1, ag: 2, status: 'LIVE',
    poss: [42, 58], sh: [7, 9], sot: [3, 4], goals: [{ min: "34'", team: 'KOR', scorer: 'Son' }] }] };
  const { out, stats } = window.liveToResults(feed);
  // score flips so KOR(2) is first (our home), CZE(1) second
  assert.deepStrictEqual(out['A-1'], [2, 1]);
  // poss/sh/sot flip to [home=KOR, away=CZE] = [58,42] etc
  assert.deepStrictEqual(stats['A-1'].poss, [58, 42]);
  assert.deepStrictEqual(stats['A-1'].sh, [9, 7]);
  assert.deepStrictEqual(stats['A-1'].sot, [4, 3]);
  // goals[].team is an absolute kit code — must stay KOR, never flipped
  assert.equal(stats['A-1'].goals[0].team, 'KOR');
});

test('wcMomentum: neutral 0.5 with no data, clamped, leans to the busier side', () => {
  assert.equal(wcMomentum({}, 'KOR', 'CZE', 0), 0.5);
  const lop = wcMomentum({ poss: [80, 20], sot: [9, 1] }, 'KOR', 'CZE', 0);
  assert.ok(lop > 0.5 && lop <= 0.95, 'home dominance -> >0.5, clamped: ' + lop);
  const lopA = wcMomentum({ poss: [10, 90], sot: [0, 8] }, 'KOR', 'CZE', 0);
  assert.ok(lopA >= 0.05 && lopA < 0.5, 'away dominance -> <0.5, clamped: ' + lopA);
  // a just-scored home goal nudges momentum home vs the same stats with an old goal
  const recent = wcMomentum({ poss: [50, 50], sot: [3, 3], goals: [{ min: "63'", team: 'KOR' }] }, 'KOR', 'CZE', 65);
  const stale = wcMomentum({ poss: [50, 50], sot: [3, 3], goals: [{ min: "10'", team: 'KOR' }] }, 'KOR', 'CZE', 65);
  assert.ok(recent > stale, 'recent goal lifts momentum: ' + recent + ' vs ' + stale);
});

test('wcPoolStats: results-derived facts, golden boot only with real names', () => {
  // Minimal results: A-0 MEX 3-0 RSA (shutout MEX), A-1 KOR 2-2 CZE (no shutout, 4 goals)
  const results = { 'A-0': [3, 0], 'A-1': [2, 2] };
  const ps = window.wcPoolStats(results, []);
  assert.equal(ps.mostGoals.total, 4, 'KOR-CZE 2-2 is the most goals');
  assert.ok(ps.cleanestSheet && ps.cleanestSheet.team === 'MEX', 'MEX kept a clean sheet');
  assert.equal(ps.goldenBoot, null, 'no scorer names -> no golden boot');
  // with a 2-goal scorer it surfaces; a 1-goal leader does not (needs a real lead)
  const gl = [{ team: 'MEX', scorer: 'A' }, { team: 'MEX', scorer: 'A' }, { team: 'KOR', scorer: 'B' }];
  const ps2 = window.wcPoolStats(results, gl);
  assert.ok(ps2.goldenBoot && ps2.goldenBoot.scorer === 'A' && ps2.goldenBoot.n === 2);
});
