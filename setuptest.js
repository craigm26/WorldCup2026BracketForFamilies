const test = require('node:test');
const assert = require('node:assert');
const S = require('./setup-link.js');

test('buildShareLink builds a worldcup sync URL', () => {
  const u = S.buildShareLink('https://craigm26.github.io', '/WorldCup2026BracketForFamilies/',
    'https://script.google.com/macros/s/AAA/exec', 'fam');
  assert.equal(u,
    'https://craigm26.github.io/WorldCup2026BracketForFamilies/worldcup/?sync=' +
    encodeURIComponent('https://script.google.com/macros/s/AAA/exec') + '&code=fam');
});

test('buildShareLink returns null without exec or code', () => {
  assert.equal(S.buildShareLink('https://x', '/', '', 'fam'), null);
  assert.equal(S.buildShareLink('https://x', '/', 'https://e/exec', '   '), null);
});

test('buildShareLink normalizes basePath and encodes code', () => {
  const u = S.buildShareLink('https://x', 'Repo', 'https://e/exec', 'merry fam');
  assert.ok(u.startsWith('https://x/Repo/worldcup/?sync='));
  assert.ok(u.endsWith('&code=merry%20fam'));
});
