const test = require('node:test');
const assert = require('node:assert');

global.window = global.window || {};
require('./worldcup/sticker-data.js');   // window.WCSTK
const X = require('./worldcup/sticker-export.js');
const WCSTK = global.window.WCSTK;
const TOTAL = WCSTK.meta.total;

test('statusOf maps counts to buckets', () => {
  assert.equal(X.statusOf(0), 'need');
  assert.equal(X.statusOf(1), 'have');
  assert.equal(X.statusOf(3), 'duplicate');
});

test('empty collection: need-list = every sticker, have/duplicates = none', () => {
  assert.equal(X.rows({}, { need: true }).length, TOTAL);
  assert.ok(X.rows({}, { need: true }).every((r) => r.status === 'need'));
  assert.equal(X.rows({}, { have: true }).length, 0);
  assert.equal(X.rows({}, { duplicates: true }).length, 0);
});

test('"Everything" (have+need) returns the full album in order', () => {
  const all = X.rows({ MEX5: 2 }, { have: true, need: true });
  assert.equal(all.length, TOTAL);
  assert.equal(all[0].code, WCSTK.pages[0].slots[0].n); // album order preserved
});

test('buckets are OR-ed and rows carry status/spares/team/group', () => {
  const map = { MEX2: 1, MEX5: 3, FWC4: 0 };
  const have = X.rows(map, { have: true });
  assert.deepEqual(have.map((r) => r.code).sort(), ['MEX2', 'MEX5']);
  const dup = X.rows(map, { duplicates: true });
  assert.equal(dup.length, 1);
  assert.equal(dup[0].code, 'MEX5');
  assert.equal(dup[0].count, 3);
  assert.equal(dup[0].spares, 2);
  assert.equal(dup[0].status, 'duplicate');
  assert.equal(dup[0].group, 'Group A');
  assert.equal(dup[0].team, 'Mexico');
});

test('summarize tallies have/need/duplicates/spares', () => {
  const s = X.summarize(X.rows({ MEX2: 1, MEX5: 3 }, { have: true, need: true }));
  assert.equal(s.count, TOTAL);
  assert.equal(s.have, 2);
  assert.equal(s.duplicates, 1);
  assert.equal(s.spares, 2);
  assert.equal(s.need, TOTAL - 2);
});

test('CSV: header + RFC-ish quoting of commas/quotes', () => {
  const csv = X.toCSV([
    { code: 'X1', name: 'Smith, John "JJ"', team: 'Mexico', group: 'Group A', type: 'player', foil: false, status: 'have', count: 1, spares: 0 },
  ]);
  const lines = csv.split('\r\n');
  assert.equal(lines[0], 'Code,Name,Team,Group,Type,Foil,Status,Count,Spares');
  assert.ok(lines[1].includes('"Smith, John ""JJ"""'), lines[1]);
});

test('text export has title, category line and a known code', () => {
  const txt = X.toText(X.rows({}, { need: true }), { bookName: 'Mia', categories: ['Need'], date: 'Jun 19, 2026' });
  assert.ok(txt.startsWith('World Cup 2026 Stickers — Mia'));
  assert.ok(txt.includes('Need · ' + TOTAL + ' stickers · made Jun 19, 2026'));
  assert.ok(/#MEX2\s+Luis Malagón\s+need/.test(txt));
});

test('HTML export is a standalone doc with a status badge', () => {
  const html = X.toHTML(X.rows({ MEX5: 2 }, { duplicates: true }), { bookName: 'Mia', categories: ['Duplicates'] });
  assert.ok(html.startsWith('<!doctype html>'));
  assert.ok(html.includes('<table>') && html.includes('duplicate'));
  assert.ok(html.includes('Mexico'));
});

test('filename is sanitized from book + categories', () => {
  assert.equal(X.filename({ bookName: "Mia's Swaps!", categories: ['Need'] }, 'csv'), 'wc2026-stickers-mia-s-swaps-need.csv');
  assert.equal(X.ext('html'), 'html');
  assert.equal(X.mime('csv'), 'text/csv');
});
