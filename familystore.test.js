const test = require('node:test');
const assert = require('node:assert');
const F = require('./worldcup/family-store.js');

const NOW = '2026-06-07T20:00:00.000Z';
const T1 = '2026-06-07T19:00:00.000Z'; // older
const T3 = '2026-06-07T21:00:00.000Z'; // newer than NOW

// local roster shape: { players:[{id,name,emoji}], books:{[pid]:[{id,label}]}, collections:{[bid]:map}, meta:{[bid]:{updatedAt,dirty}} }
function emptyLocal() { return { players: [], books: {}, collections: {}, meta: {} }; }
function row(o) { return Object.assign({ playerId: '', name: '', emoji: '🙂', bookId: '', bookLabel: 'My album', updatedAt: NOW, deleted: '', collectionJSON: '{}' }, o); }

test('newId is unique per memberId+seq (no cross-device collision)', () => {
  assert.equal(F.newId('m_a', 1), 'm_a:1');
  assert.notEqual(F.newId('m_a', 1), F.newId('m_b', 1));
});

test('markDirty/clearDirty are immutable and set the right flags', () => {
  const m0 = {};
  const m1 = F.markDirty(m0, 'b1', NOW);
  assert.deepEqual(m0, {}); // unchanged
  assert.deepEqual(m1.b1, { updatedAt: NOW, dirty: true });
  const m2 = F.clearDirty(m1, ['b1']);
  assert.equal(m2.b1.dirty, false);
  assert.equal(m1.b1.dirty, true); // m1 unchanged
});

test('reconcile: a remote-only book (and its player) is added locally', () => {
  const local = emptyLocal();
  const remote = [row({ playerId: 'p_jake', name: 'Jake', emoji: '🙂', bookId: 'p_jake', bookLabel: 'My album', updatedAt: T1, collectionJSON: '{"MEX5":2}' })];
  const r = F.reconcile(local, remote, NOW);
  assert.equal(r.changed, true);
  assert.deepEqual(r.roster.players, [{ id: 'p_jake', name: 'Jake', emoji: '🙂' }]);
  assert.deepEqual(r.roster.books.p_jake, [{ id: 'p_jake', label: 'My album' }]);
  assert.deepEqual(r.roster.collections.p_jake, { MEX5: 2 });
  assert.equal(r.roster.meta.p_jake.updatedAt, T1);
});

test('reconcile: adopts remote collection when remote is newer and local is not dirty', () => {
  const local = { players: [{ id: 'p1', name: 'A', emoji: '🙂' }], books: { p1: [{ id: 'p1', label: 'My album' }] },
    collections: { p1: { MEX5: 1 } }, meta: { p1: { updatedAt: T1, dirty: false } } };
  const remote = [row({ playerId: 'p1', bookId: 'p1', updatedAt: T3, collectionJSON: '{"MEX5":2,"ARG1":1}' })];
  const r = F.reconcile(local, remote, NOW);
  assert.deepEqual(r.roster.collections.p1, { MEX5: 2, ARG1: 1 });
  assert.equal(r.roster.meta.p1.updatedAt, T3);
});

test('reconcile: keeps local + queues toPush when local is dirty (even if remote differs)', () => {
  const local = { players: [{ id: 'p1', name: 'A', emoji: '🙂' }], books: { p1: [{ id: 'p1', label: 'My album' }] },
    collections: { p1: { MEX5: 3 } }, meta: { p1: { updatedAt: T3, dirty: true } } };
  const remote = [row({ playerId: 'p1', bookId: 'p1', updatedAt: T1, collectionJSON: '{"MEX5":1}' })];
  const r = F.reconcile(local, remote, NOW);
  assert.deepEqual(r.roster.collections.p1, { MEX5: 3 }); // local kept
  const push = r.toPush.find((x) => x.bookId === 'p1');
  assert.ok(push, 'dirty book is pushed');
  assert.equal(JSON.parse(push.collectionJSON).MEX5, 3);
});

test('reconcile: remote soft-delete removes a non-dirty local book', () => {
  const local = { players: [{ id: 'p1', name: 'A', emoji: '🙂' }], books: { p1: [{ id: 'p1', label: 'My album' }, { id: 'b2', label: 'Swaps' }] },
    collections: { p1: {}, b2: { BRA9: 2 } }, meta: { p1: { updatedAt: T1, dirty: false }, b2: { updatedAt: T1, dirty: false } } };
  const remote = [row({ playerId: 'p1', bookId: 'b2', deleted: '1', updatedAt: T3 })];
  const r = F.reconcile(local, remote, NOW);
  assert.deepEqual(r.roster.books.p1.map((b) => b.id), ['p1']);
  assert.equal(r.roster.collections.b2, undefined);
});

test('reconcile: a never-synced local book is queued in toPush (seeding)', () => {
  const local = { players: [{ id: 'p1', name: 'Jake', emoji: '🙂' }], books: { p1: [{ id: 'p1', label: 'My album' }] },
    collections: { p1: { MEX5: 2 } }, meta: { p1: { updatedAt: T1, dirty: false } } };
  const r = F.reconcile(local, [], NOW); // empty remote => seed
  const push = r.toPush.find((x) => x.bookId === 'p1');
  assert.ok(push, 'never-synced book is pushed to seed the sheet');
  assert.equal(push.playerId, 'p1');
  assert.equal(push.name, 'Jake');
});

test('reconcile guard: a pristine default device adopts a non-empty remote roster and does NOT push its empty default', () => {
  const local = { players: [{ id: 'family', name: 'Family', emoji: '👪' }], books: { family: [{ id: 'family', label: 'My album' }] },
    collections: { family: {} }, meta: {} };
  const remote = [row({ playerId: 'p_ethan', name: 'Ethan', emoji: '🧒', bookId: 'p_ethan', bookLabel: 'My album', updatedAt: T1, collectionJSON: '{"MEX5":2}' })];
  const r = F.reconcile(local, remote, NOW);
  // adopts Ethan
  assert.ok(r.roster.players.find((p) => p.id === 'p_ethan'), 'adopts remote player');
  // the empty default 'family' is NOT pushed (would pollute the shared roster)
  assert.ok(!r.toPush.find((x) => x.playerId === 'family'), 'empty default is not seeded');
});

test('reconcile is idempotent: re-running with the same remote makes no further changes', () => {
  const local = emptyLocal();
  const remote = [row({ playerId: 'p1', bookId: 'p1', updatedAt: T1, collectionJSON: '{"MEX5":2}' })];
  const r1 = F.reconcile(local, remote, NOW);
  const r2 = F.reconcile(r1.roster, remote, NOW);
  assert.equal(r2.changed, false, 'second reconcile is a no-op');
  assert.deepEqual(r2.roster.collections, r1.roster.collections);
});

test('toLocal converts store shape to reconcile shape', () => {
  const players = { list: [{ id: 'p1', name: 'Jake', emoji: '🙂' }], active: 'p1' };
  const books = { p1: { list: [{ id: 'p1', label: 'My album' }, { id: 'b2', label: 'Swaps' }], active: 'b2' } };
  const local = F.toLocal(players, books, { p1: { MEX5: 1 } }, { p1: { updatedAt: T1, dirty: false } });
  assert.deepEqual(local.players, [{ id: 'p1', name: 'Jake', emoji: '🙂' }]);
  assert.deepEqual(local.books.p1, [{ id: 'p1', label: 'My album' }, { id: 'b2', label: 'Swaps' }]);
  assert.deepEqual(local.collections, { p1: { MEX5: 1 } });
});

test('applyResult restores store shape and preserves active player/book when still present', () => {
  const roster = { players: [{ id: 'p1', name: 'Jake', emoji: '🙂' }, { id: 'p2', name: 'Mia', emoji: '👧' }],
    books: { p1: [{ id: 'p1', label: 'My album' }, { id: 'b2', label: 'Swaps' }], p2: [{ id: 'p2', label: 'My album' }] },
    collections: { p1: { MEX5: 1 } }, meta: {} };
  const out = F.applyResult(roster, { list: [], active: 'p1' }, { p1: { active: 'b2' } });
  assert.equal(out.players.active, 'p1');         // preserved (still present)
  assert.equal(out.books.p1.active, 'b2');        // preserved (still present)
  assert.equal(out.books.p2.active, 'p2');        // default to first when no prior
  assert.equal(out.players.list.length, 2);
});

test('applyResult falls back when the active player no longer exists', () => {
  const roster = { players: [{ id: 'p2', name: 'Mia', emoji: '👧' }], books: { p2: [{ id: 'p2', label: 'My album' }] }, collections: {}, meta: {} };
  const out = F.applyResult(roster, { list: [], active: 'p1' }, {});
  assert.equal(out.players.active, 'p2'); // p1 gone -> first remaining
});

test('rowsFromLocal(dirtyOnly) emits only dirty books with the right fields', () => {
  const local = { players: [{ id: 'p1', name: 'Jake', emoji: '🙂' }], books: { p1: [{ id: 'p1', label: 'My album' }, { id: 'b2', label: 'Swaps' }] },
    collections: { p1: { MEX5: 1 }, b2: { BRA9: 2 } }, meta: { p1: { updatedAt: T1, dirty: false }, b2: { updatedAt: T3, dirty: true } } };
  const rows = F.rowsFromLocal(local, true);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].bookId, 'b2');
  assert.equal(rows[0].bookLabel, 'Swaps');
  assert.equal(rows[0].playerId, 'p1');
  assert.equal(rows[0].updatedAt, T3);
  assert.equal(JSON.parse(rows[0].collectionJSON).BRA9, 2);
});
