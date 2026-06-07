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
