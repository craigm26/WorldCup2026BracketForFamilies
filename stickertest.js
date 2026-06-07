const test = require('node:test');
const assert = require('node:assert');
const L = require('./worldcup/sticker-logic.js');

const SAMPLE = {
  meta: { title: 'Test', total: 4 },
  pages: [
    { page: 1, section: 'intro', title: 'Intro', team: null, cols: 2, rows: 1,
      slots: [ { n: 1, name: 'Logo', type: 'special' }, { n: 2, name: 'Emblem', type: 'special' } ] },
    { page: 2, section: 'ARG', title: 'Argentina', team: 'ARG', cols: 2, rows: 1,
      slots: [ { n: 3, name: 'Badge', type: 'badge' }, { n: 4, name: 'Player', type: 'player' } ] },
  ],
};

test('buildIndex maps every sticker number to its slot + page', () => {
  const idx = L.buildIndex(SAMPLE);
  assert.equal(idx[3].page, 2);
  assert.equal(idx[3].slot.name, 'Badge');
  assert.equal(Object.keys(idx).length, 4);
});

test('cycleCount increments 0->1->2->3', () => {
  assert.equal(L.cycleCount(0), 1);
  assert.equal(L.cycleCount(1), 2);
  assert.equal(L.cycleCount(2), 3);
  assert.equal(L.cycleCount(undefined), 1);
});

test('sectionProgress counts owned slots on a page', () => {
  const page = SAMPLE.pages[1]; // ARG, slots 3 & 4
  assert.deepEqual(L.sectionProgress({ '3': 1 }, page), { have: 1, total: 2 });
  assert.deepEqual(L.sectionProgress({ '3': 2, '4': 1 }, page), { have: 2, total: 2 });
  assert.deepEqual(L.sectionProgress({}, page), { have: 0, total: 2 });
});

test('playerTotals sums have + doubles across the album', () => {
  const idx = L.buildIndex(SAMPLE);
  // have 1,3; double of 3 (count 2 => 1 double); need 2,4
  const totals = L.playerTotals({ '1': 1, '3': 2 }, idx);
  assert.deepEqual(totals, { have: 2, total: 4, doubles: 1 });
});

test('tradeMatch pairs my doubles with their needs and vice versa', () => {
  const idx = L.buildIndex(SAMPLE);
  const mine =  { '1': 2, '3': 1 };        // double of 1; have 3; need 2,4
  const theirs = { '1': 0, '4': 3 };       // need 1; double of 4; need 2,3
  const r = L.tradeMatch(mine, theirs, idx);
  assert.deepEqual(r.iGive.map(Number).sort(), [1]);   // my double 1, they need 1
  assert.deepEqual(r.iWant.map(Number).sort(), [4]);   // their double 4, I need 4
  assert.equal(r.swaps, 1);                            // min(1,1)
});

test('tradeMatch swaps headline is the min of the two lists', () => {
  const idx = L.buildIndex(SAMPLE);
  const mine =  { '1': 2, '2': 2 };   // doubles 1,2
  const theirs = { '3': 2 };          // double 3; needs 1,2
  const r = L.tradeMatch(mine, theirs, idx);
  assert.deepEqual(r.iGive.map(Number).sort(), [1, 2]);
  assert.deepEqual(r.iWant.map(Number).sort(), [3]);
  assert.equal(r.swaps, 1);           // min(2,1)
});

test('rarestNeeded lists numbers nobody owns', () => {
  const idx = L.buildIndex(SAMPLE);
  const maps = [ { '1': 1, '3': 2 }, { '3': 1, '4': 1 } ]; // owned union: 1,3,4 ; missing: 2
  assert.deepEqual(L.rarestNeeded(maps, idx).map(Number), [2]);
});

const DATA = require('./worldcup/sticker-data.js');

test('dataset: every sticker number is unique', () => {
  const nums = [];
  DATA.pages.forEach((p) => p.slots.forEach((s) => nums.push(s.n)));
  assert.equal(new Set(nums).size, nums.length, 'duplicate sticker number(s)');
});

test('dataset: each page slot count does not exceed its grid', () => {
  DATA.pages.forEach((p) => {
    assert.ok(p.slots.length <= p.cols * p.rows,
      `page ${p.page} has ${p.slots.length} slots > ${p.cols}x${p.rows}`);
  });
});

test('dataset: every slot has n, name, and a known type', () => {
  const TYPES = new Set(['badge', 'player', 'legend', 'stadium', 'special']);
  DATA.pages.forEach((p) => p.slots.forEach((s) => {
    assert.equal(typeof s.n, 'number');
    assert.ok(s.name && typeof s.name === 'string');
    assert.ok(TYPES.has(s.type), `bad type ${s.type} on #${s.n}`);
  }));
});

test('dataset: buildIndex round-trips with no collisions', () => {
  const idx = L.buildIndex(DATA);
  let count = 0;
  DATA.pages.forEach((p) => count += p.slots.length);
  assert.equal(Object.keys(idx).length, count);
});
