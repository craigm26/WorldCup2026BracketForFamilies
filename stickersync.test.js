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

test('buildPayload merges action + familyCode + memberId', () => {
  const cfg = { url: 'u', code: 'fam1', memberId: 'm_a' };
  assert.deepEqual(S.buildPayload('getFamily', cfg, {}),
    { action: 'getFamily', familyCode: 'fam1', memberId: 'm_a' });
  assert.deepEqual(S.buildPayload('proposeTrade', cfg, { toId: 'm_b', giveCodes: ['MEX2'] }),
    { action: 'proposeTrade', familyCode: 'fam1', memberId: 'm_a', toId: 'm_b', giveCodes: ['MEX2'] });
});

test('tradeTransition only acts on pending trades', () => {
  assert.equal(S.tradeTransition({ status: 'pending' }, 'accept'), 'accepted');
  assert.equal(S.tradeTransition({ status: 'pending' }, 'decline'), 'declined');
  assert.equal(S.tradeTransition({ status: 'accepted' }, 'decline'), null);
  assert.equal(S.tradeTransition({ status: 'pending' }, 'bogus'), null);
});

test('summarizeFamily totals each member + flags me', () => {
  const rows = [
    { memberId: 'm_a', name: 'Dad', emoji: '👨', updatedAt: 1, collectionJSON: '{"MEX2":2}' },
    { memberId: 'm_b', name: 'Mia', emoji: '👧', updatedAt: 2, collectionJSON: 'oops-bad-json' },
  ];
  const totalsOf = (map) => ({ have: Object.keys(map).length, total: 980, doubles: 0 });
  const out = S.summarizeFamily(rows, 'm_b', totalsOf);
  assert.equal(out[0].name, 'Dad'); assert.equal(out[0].isMe, false); assert.equal(out[0].have, 1);
  assert.equal(out[1].isMe, true); assert.deepEqual(out[1].collection, {}); // bad JSON => {}
});
