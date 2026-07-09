const test = require('node:test');
const assert = require('node:assert');

// Bootstrap the browser globals the engine reads at call time (same shim as projectionstest.js).
global.window = global.window || {};
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
require('./worldcup/data.js');     // window.WC
require('./worldcup/hub-data.js'); // window.wcKoRounds
const K = window.wcKoRounds;

test('koPlayedCount: counts FT knockout matches, independent of slot resolution', () => {
  const live = { matches: [
    ...Array.from({ length: 72 }, () => ({ status: 'FT', hg: 1, ag: 0 })), // group stage
    ...Array.from({ length: 16 }, () => ({ status: 'FT', hg: 1, ag: 0 })), // R32
    { status: 'LIVE', hg: 1, ag: 1 }, // an R16 game in play doesn't count yet
  ] };
  assert.equal(K.koPlayedCount(live, 72), 16);
});

test('koPlayedCount: never negative even if groupPlayedFixtures overcounts', () => {
  assert.equal(K.koPlayedCount({ matches: [{ status: 'FT' }] }, 72), 0);
});

test('koPlayedCount: no feed → 0', () => {
  assert.equal(K.koPlayedCount(null, 72), 0);
  assert.equal(K.koPlayedCount({}, 72), 0);
});

// Round boundaries: R32=16, R16=8 (cum 24), QF=4 (cum 28), SF=2 (cum 30), 3RD=1 (cum 31), FINAL=1 (cum 32).
test('currentKoRound / justLockedKoRound track every round boundary', () => {
  const cases = [
    [0, 'R32', null], [15, 'R32', null],
    [16, 'R16', 'R32'], [23, 'R16', 'R32'],
    [24, 'QF', 'R16'], [27, 'QF', 'R16'],
    [28, 'SF', 'QF'], [29, 'SF', 'QF'],
    [30, '3RD', 'SF'],
    [31, 'FINAL', '3RD'],
    [32, 'FINAL', 'FINAL'],
  ];
  cases.forEach(([played, current, justLocked]) => {
    assert.equal(K.currentKoRound(played), current, 'current @ ' + played);
    assert.equal(K.justLockedKoRound(played), justLocked, 'justLocked @ ' + played);
  });
});

// This is the exact scenario the fix targets: R32 has a wildcard slot mis-pairing
// (a pre-existing, separate issue in thirdAssign), so a strict per-slot "every R32
// match has a winner" check would never see R32 as done even though the real world
// has moved on to the quarter-finals — the count-based functions must not care.
test('round tracking is robust to an unresolved wildcard R32 slot', () => {
  // 16 R32 + 8 R16 played (24 total) — but wcResolveBracket would leave a couple of
  // R32 winners unset if the thirdAssign greedy pairing missed a wildcard match.
  // koPlayedCount only counts FT games, so this must still read "QF, R16 just locked".
  assert.equal(K.currentKoRound(24), 'QF');
  assert.equal(K.justLockedKoRound(24), 'R16');
});

// ---- teamKoStatus: walks a team's most-advanced KO slot from a resolved bracket ----

function fakeResolved(matchTeams, winners) {
  return { matchTeams: matchTeams, winners: winners };
}

test('teamKoStatus: a team not in any KO slot → null (did not qualify)', () => {
  assert.equal(K.teamKoStatus('XXX', fakeResolved({}, {})), null);
});

test('teamKoStatus: currently in an undecided match (pending), opponent known', () => {
  // match 73 is R32 top=2A bottom=2B in the real KO_M
  const resolved = fakeResolved({ 73: { top: 'RSA', bot: 'CAN' } }, {});
  const s = K.teamKoStatus('RSA', resolved);
  assert.equal(s.round, 'R32');
  assert.equal(s.status, 'pending');
  assert.equal(s.opp, 'CAN');
  assert.equal(s.mySide, 'top');
});

test('teamKoStatus: opponent not yet resolved → opp null, oppFeeder carries the raw code', () => {
  const resolved = fakeResolved({ 73: { top: 'RSA', bot: null } }, {});
  const s = K.teamKoStatus('RSA', resolved);
  assert.equal(s.opp, null);
  assert.equal(s.oppFeeder, '2B'); // KO_M[73].bottom
});

test('teamKoStatus: lost their match → status "lost"', () => {
  const resolved = fakeResolved({ 73: { top: 'RSA', bot: 'CAN' } }, { 73: 'CAN' });
  const s = K.teamKoStatus('RSA', resolved);
  assert.equal(s.status, 'lost');
});

test('teamKoStatus: won R32, winner flows forward into their R16 slot automatically', () => {
  // real bracket: match 73 (R32) feeds match 90's top ("W73"); a winner in 73 with a
  // stub matchTeams row already present for 90 mirrors what wcResolveBracket produces.
  const resolved = fakeResolved(
    { 73: { top: 'RSA', bot: 'CAN' }, 90: { top: 'CAN', bot: null } },
    { 73: 'CAN' }
  );
  const s = K.teamKoStatus('CAN', resolved);
  assert.equal(s.round, 'R16', 'CAN advanced past R32 — R16 is now their latest slot');
  assert.equal(s.status, 'pending');
});
