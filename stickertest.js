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
