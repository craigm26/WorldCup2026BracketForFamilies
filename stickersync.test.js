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

// Minimal in-memory stand-in for the Apps Script web app. Mirrors family-sync.gs actions.
function makeFakeServer() {
  const members = []; // {familyCode,memberId,name,emoji,updatedAt,collectionJSON}
  const trades = [];  // {tradeId,familyCode,fromId,fromName,toId,toName,giveCodes,wantCodes,status,createdAt,updatedAt}
  let tid = 0;
  // returns a fetch-like impl
  return async function fakeFetch(url, opts) {
    const body = JSON.parse(opts.body);
    const fc = body.familyCode;
    let res;
    if (body.action === 'publishCollection') {
      let row = members.find((m) => m.familyCode === fc && m.memberId === body.memberId);
      if (!row) { row = { familyCode: fc, memberId: body.memberId }; members.push(row); }
      Object.assign(row, { name: body.name, emoji: body.emoji, updatedAt: 1,
        collectionJSON: JSON.stringify(body.collection || {}) });
      res = { ok: true };
    } else if (body.action === 'getFamily') {
      res = { ok: true, members: members.filter((m) => m.familyCode === fc),
              trades: trades.filter((t) => t.familyCode === fc) };
    } else if (body.action === 'proposeTrade') {
      const t = { tradeId: 't' + (++tid), familyCode: fc, fromId: body.memberId, fromName: body.fromName,
        toId: body.toId, toName: body.toName, giveCodes: (body.giveCodes || []).join(','),
        wantCodes: (body.wantCodes || []).join(','), status: 'pending', createdAt: 1, updatedAt: 1 };
      trades.push(t); res = { ok: true, tradeId: t.tradeId };
    } else if (body.action === 'respondTrade') {
      const t = trades.find((x) => x.tradeId === body.tradeId && x.familyCode === fc && x.toId === body.memberId);
      if (!t || t.status !== 'pending') res = { ok: false, error: 'not allowed' };
      else { t.status = body.response === 'accept' ? 'accepted' : 'declined'; res = { ok: true }; }
    } else { res = { ok: false, error: 'unknown action' }; }
    return { ok: true, json: async () => res, text: async () => JSON.stringify(res) };
  };
}

test('postAction sends text/plain and parses JSON', async () => {
  let seen = null;
  const fake = async (url, opts) => { seen = opts; return { ok: true, json: async () => ({ ok: true, hi: 1 }) }; };
  const cfg = { url: 'https://x.test/exec', code: 'fam1', memberId: 'm_a' };
  const r = await S.postAction(cfg, 'getFamily', {}, fake);
  assert.equal(r.hi, 1);
  assert.equal(seen.method, 'POST');
  assert.match(seen.headers['Content-Type'], /text\/plain/);
  assert.deepEqual(JSON.parse(seen.body), { action: 'getFamily', familyCode: 'fam1', memberId: 'm_a' });
});

test('postAction throws on ok:false', async () => {
  const fake = async () => ({ ok: true, json: async () => ({ ok: false, error: 'bad code' }) });
  await assert.rejects(() => S.postAction({ url: 'u', code: 'c', memberId: 'm' }, 'getFamily', {}, fake),
    /bad code/);
});

test('postAction throws a friendly error on a non-JSON (login/HTML) response', async () => {
  const fake = async () => ({ ok: true, json: async () => { throw new SyntaxError("Unexpected token '<'"); } });
  await assert.rejects(
    () => S.postAction({ url: 'u', code: 'c', memberId: 'm' }, 'getFamily', {}, fake),
    /Anyone/);
});

test('client round-trip: publish -> getFamily -> propose -> accept', async () => {
  const fake = makeFakeServer();
  const dad = { url: 'u', code: 'fam', memberId: 'm_dad' };
  const mia = { url: 'u', code: 'fam', memberId: 'm_mia' };
  await S.postAction(dad, 'publishCollection', { name: 'Dad', emoji: '👨', collection: { MEX2: 2 } }, fake);
  await S.postAction(mia, 'publishCollection', { name: 'Mia', emoji: '👧', collection: { ARG17: 2 } }, fake);
  let fam = await S.postAction(mia, 'getFamily', {}, fake);
  assert.equal(fam.members.length, 2);
  const prop = await S.postAction(dad, 'proposeTrade',
    { toId: 'm_mia', toName: 'Mia', fromName: 'Dad', giveCodes: ['MEX2'], wantCodes: ['ARG17'] }, fake);
  assert.ok(prop.tradeId);
  await S.postAction(mia, 'respondTrade', { tradeId: prop.tradeId, response: 'accept' }, fake);
  fam = await S.postAction(mia, 'getFamily', {}, fake);
  assert.equal(fam.trades[0].status, 'accepted');

  // re-publish Mia (exercises the upsert UPDATE branch — must not duplicate her row)
  await S.postAction(mia, 'publishCollection', { name: 'Mia', emoji: '👧', collection: { ARG17: 3 } }, fake);
  const fam2 = await S.postAction(mia, 'getFamily', {}, fake);
  assert.equal(fam2.members.filter((m) => m.memberId === 'm_mia').length, 1);
});
