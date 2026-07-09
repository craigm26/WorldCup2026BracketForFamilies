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

// ---- R32 wildcard-slot resolution must never mistake a team's own GROUP-STAGE
// opponent for its cross-group wildcard opponent, even when that opponent is
// genuinely one of the 8 qualifying thirds overall (confirmed live 2026-07-08: a
// naive "who did this team play" lookup picked up France's own group-I meeting with
// Senegal instead of their real Round-of-32 opponent, because Senegal legitimately
// qualifies as a third from ELSEWHERE's perspective — it's just assigned to a
// DIFFERENT wildcard slot (3AEHIJ, group I allowed there) than France's own (3CDFGH,
// group I excluded there, since a team can never draw its own group's third). ----

// Group I fully decisive, every other group untouched: FRA 1st (feeds match 77's "1I"),
// SEN 3rd with real points — the sole team with any points, so it's trivially the #1
// qualifying third overall despite being ineligible for FRA's own match.
const groupIResults = {
  'I-0': [2, 0], // FRA beat SEN (real group-stage meeting — must NOT be read as match 77)
  'I-1': [0, 2], // NOR beat IRQ
  'I-2': [3, 0], // FRA beat IRQ
  'I-3': [2, 0], // NOR beat SEN
  'I-4': [0, 2], // FRA beat NOR   → FRA 9pts 1st, NOR 6pts 2nd, SEN 3pts 3rd, IRQ 0pts 4th
  'I-5': [1, 0], // SEN beat IRQ
};
test('R32 wildcard resolution excludes a qualifying third that is this match\'s own groupmate', () => {
  const live = { matches: [
    { home: 'FRA', away: 'SEN', status: 'FT', hg: 2, ag: 0 },
    { home: 'IRQ', away: 'NOR', status: 'FT', hg: 0, ag: 2 },
    { home: 'FRA', away: 'IRQ', status: 'FT', hg: 3, ag: 0 },
    { home: 'NOR', away: 'SEN', status: 'FT', hg: 2, ag: 0 },
    { home: 'NOR', away: 'FRA', status: 'FT', hg: 0, ag: 2 },
    { home: 'SEN', away: 'IRQ', status: 'FT', hg: 1, ag: 0 },
  ] };
  const resolved = window.wcResolveBracket(groupIResults, live, {});
  // match 77 = 1I(FRA) / 3CDFGH — group I is NOT in {C,D,F,G,H}, so SEN (group I) can
  // never legitimately fill this slot even though it's the only real qualifying third
  // in this minimal scenario and DID really play FRA (in the group stage).
  assert.equal(resolved.matchTeams[77].top, 'FRA');
  assert.notEqual(resolved.matchTeams[77].bot, 'SEN', 'a group-stage opponent must never be read as the R32 wildcard occupant');
});
