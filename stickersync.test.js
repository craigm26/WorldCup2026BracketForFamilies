const test = require('node:test');
const assert = require('node:assert');
const S = require('./worldcup/sticker-sync.js');

test('genMemberId returns a unique m_ id', () => {
  const a = S.genMemberId(), b = S.genMemberId();
  assert.match(a, /^m_[a-z0-9]+$/);
  assert.notEqual(a, b);
});

test('parseSetupLink extracts url + code, or null', () => {
  const r = S.parseSetupLink('?sync=https%3A%2F%2Fx.test%2Fexec&code=fam1');
  assert.deepEqual(r, { url: 'https://x.test/exec', code: 'fam1' });
  assert.equal(S.parseSetupLink('?tab=stickers'), null);
  assert.equal(S.parseSetupLink(''), null);
});

test('serializeCollection keeps owned counts, drops 0/negatives', () => {
  assert.deepEqual(S.serializeCollection({ MEX2: 2, ARG17: 1, FW1: 0, X: -1 }),
    { MEX2: 2, ARG17: 1 });
  assert.deepEqual(S.serializeCollection(null), {});
});
