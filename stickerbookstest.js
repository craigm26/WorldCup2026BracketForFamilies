const test = require('node:test');
const assert = require('node:assert');
const B = require('./worldcup/sticker-books.js');

test('defaultRegistry: one book whose id == playerId, labelled "My album", active', () => {
  const r = B.defaultRegistry('family');
  assert.deepEqual(r, { list: [{ id: 'family', label: 'My album' }], active: 'family' });
});

test('migrateRegistry: absent/empty -> default registry (no data move; default id == playerId)', () => {
  assert.deepEqual(B.migrateRegistry(null, 'p1'), B.defaultRegistry('p1'));
  assert.deepEqual(B.migrateRegistry({ list: [] }, 'p1'), B.defaultRegistry('p1'));
});

test('migrateRegistry: a valid registry is preserved (labels normalized, active repaired)', () => {
  const existing = { list: [{ id: 'p1', label: 'Main' }, { id: 'b2', label: 'Swaps' }], active: 'gone' };
  const r = B.migrateRegistry(existing, 'p1');
  assert.deepEqual(r.list.map((b) => b.id), ['p1', 'b2']);
  assert.equal(r.active, 'p1'); // active 'gone' not in list -> first book
});

test('addBook: appends with given id, normalizes label, becomes active', () => {
  const r = B.addBook(B.defaultRegistry('p1'), 'Swaps', 'b2');
  assert.deepEqual(r.list, [{ id: 'p1', label: 'My album' }, { id: 'b2', label: 'Swaps' }]);
  assert.equal(r.active, 'b2');
});

test('addBook: blank label falls back to "Book N"; long label is capped', () => {
  const r = B.addBook(B.defaultRegistry('p1'), '   ', 'b2');
  assert.equal(r.list[1].label, 'Book 2');
  const r2 = B.addBook(B.defaultRegistry('p1'), 'x'.repeat(40), 'b3');
  assert.ok(r2.list[1].label.length <= 20);
});

test('renameBook: changes only the target label', () => {
  const start = B.addBook(B.defaultRegistry('p1'), 'Swaps', 'b2');
  const r = B.renameBook(start, 'b2', 'Spares');
  assert.equal(B.labelOf(r, 'b2'), 'Spares');
  assert.equal(B.labelOf(r, 'p1'), 'My album');
});

test('removeBook: refuses to remove the last book', () => {
  const res = B.removeBook(B.defaultRegistry('p1'), 'p1');
  assert.equal(res.removed, false);
  assert.deepEqual(res.reg, B.defaultRegistry('p1'));
});

test('removeBook: removing the active book re-points active to a remaining book', () => {
  const reg = B.addBook(B.defaultRegistry('p1'), 'Swaps', 'b2'); // active b2
  const res = B.removeBook(reg, 'b2');
  assert.equal(res.removed, true);
  assert.deepEqual(res.reg.list.map((b) => b.id), ['p1']);
  assert.equal(res.reg.active, 'p1');
});

test('removeBook: removing a non-active book keeps active', () => {
  const reg = { list: [{ id: 'p1', label: 'My album' }, { id: 'b2', label: 'Swaps' }], active: 'p1' };
  const res = B.removeBook(reg, 'b2');
  assert.equal(res.removed, true);
  assert.equal(res.reg.active, 'p1');
});

test('addBook does not mutate the input registry', () => {
  const original = B.defaultRegistry('p1');
  B.addBook(original, 'Swaps', 'b2');
  assert.deepEqual(original, B.defaultRegistry('p1'));
});

test('renameBook does not mutate the input registry', () => {
  const original = B.addBook(B.defaultRegistry('p1'), 'Swaps', 'b2');
  const snapshot = JSON.parse(JSON.stringify(original));
  B.renameBook(original, 'b2', 'Spares');
  assert.deepEqual(original, snapshot);
});

test('removeBook does not mutate the input registry', () => {
  const original = B.addBook(B.defaultRegistry('p1'), 'Swaps', 'b2');
  const snapshot = JSON.parse(JSON.stringify(original));
  B.removeBook(original, 'b2');
  assert.deepEqual(original, snapshot);
});

test('migrateRegistry does not mutate the input registry', () => {
  const existing = { list: [{ id: 'p1', label: 'Main' }, { id: 'b2', label: 'Swaps' }], active: 'gone' };
  const snapshot = JSON.parse(JSON.stringify(existing));
  B.migrateRegistry(existing, 'p1');
  assert.deepEqual(existing, snapshot);
});

test('activeBookId returns the active field (undefined for null reg)', () => {
  assert.equal(B.activeBookId(B.defaultRegistry('p1')), 'p1');
  assert.equal(B.activeBookId(null), undefined);
});

test('labelOf returns empty string for an unknown bookId', () => {
  assert.equal(B.labelOf(B.defaultRegistry('p1'), 'missing'), '');
});
