const test = require('node:test');
const assert = require('node:assert');

// Bootstrap the browser globals the engine reads at call time (same shim as projectionstest.js).
global.window = global.window || {};
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
require('./worldcup/data.js');     // window.WC
require('./worldcup/hub-data.js'); // window.wcResolveBracket

// Fully decisive group A + B results (no ties, no thirds ambiguity) so 2A/2B resolve
// cleanly to RSA/SUI — match #73 (2A v 2B, Los Angeles) is the target KO slot.
// Fixture order per data.js FIXTURES.A/.B.
const results = {
  'A-0': [2, 0], // MEX beat RSA
  'A-1': [1, 0], // KOR beat CZE
  'A-2': [0, 2], // RSA beat CZE
  'A-3': [2, 0], // MEX beat KOR
  'A-4': [0, 3], // MEX beat CZE
  'A-5': [2, 0], // RSA beat KOR  → group A: MEX 1st, RSA 2nd
  'B-0': [2, 0], // CAN beat BIH
  'B-1': [0, 1], // SUI beat QAT
  'B-2': [2, 0], // SUI beat BIH
  'B-3': [2, 0], // CAN beat QAT
  'B-4': [0, 2], // CAN beat SUI
  'B-5': [1, 1], // BIH v QAT draw    → group B: CAN 1st, SUI 2nd
};

test('R32 penalty shoot-out (m.pen) resolves the winner from a level scoreline', () => {
  const live = { matches: [{ home: 'RSA', away: 'SUI', status: 'FT', hg: 1, ag: 1, pen: 'away', hp: 3, ap: 4 }] };
  const resolved = window.wcResolveBracket(results, live, {});
  assert.equal(resolved.matchTeams[73].top, 'RSA');
  assert.equal(resolved.matchTeams[73].bot, 'SUI');
  assert.equal(resolved.winners[73], 'SUI', 'away team won the shoot-out per m.pen="away"');
});

test('R32 penalty shoot-out resolves correctly with home/away reversed in the feed', () => {
  // The Hub's feed lookup is orientation-agnostic (m.home/m.away vs top/bot can be
  // either way round) — m.pen must be reoriented right along with it.
  const live = { matches: [{ home: 'SUI', away: 'RSA', status: 'FT', hg: 2, ag: 2, pen: 'home', hp: 5, ap: 4 }] };
  const resolved = window.wcResolveBracket(results, live, {});
  assert.equal(resolved.winners[73], 'SUI', 'm.home===SUI won, regardless of which side is "top" in KO_M');
});

test('a level scoreline with NO pen field (e.g. a TheSportsDB fallback row) stays unresolved — never guessed', () => {
  const live = { matches: [{ home: 'RSA', away: 'SUI', status: 'FT', hg: 1, ag: 1 }] };
  const resolved = window.wcResolveBracket(results, live, {});
  assert.equal(resolved.winners[73], undefined, 'no shoot-out data → the Hub must leave the slot open, not pick a side');
});

test('a genuine draw stays unresolved when m.pen is absent even for group-stage-shaped scores', () => {
  const live = { matches: [{ home: 'RSA', away: 'SUI', status: 'FT', hg: 0, ag: 0, pen: undefined }] };
  const resolved = window.wcResolveBracket(results, live, {});
  assert.equal(resolved.winners[73], undefined);
});
