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

test('buildInviteLink builds hub?sync=&code= with encoding, normalizes trailing slash', () => {
  assert.equal(S.buildInviteLink('https://x.io/wc/worldcup/', 'https://e/exec', 'fam1'),
    'https://x.io/wc/worldcup/?sync=' + encodeURIComponent('https://e/exec') + '&code=fam1');
  const u = S.buildInviteLink('https://x.io/worldcup', 'https://e/exec', 'a b'); // no trailing slash
  assert.ok(u.startsWith('https://x.io/worldcup/?sync='));
  assert.ok(u.endsWith('&code=a%20b'));
});

test('buildInviteLink returns null without exec or code', () => {
  assert.equal(S.buildInviteLink('https://x/', '', 'c'), null);
  assert.equal(S.buildInviteLink('https://x/', 'https://e/exec', '  '), null);
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
      const bookId = body.bookId || body.memberId;
      let row = members.find((m) => m.familyCode === fc && m.memberId === body.memberId && (m.bookId || m.memberId) === bookId);
      if (!row) { row = { familyCode: fc, memberId: body.memberId, bookId: bookId }; members.push(row); }
      Object.assign(row, { name: body.name, emoji: body.emoji, bookId: bookId, bookLabel: body.bookLabel || 'My album', updatedAt: 1,
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

test('summarizeFamily: one entry per (member, book), keyed by memberId+bookId, carries bookLabel', () => {
  const rows = [
    { memberId: 'm1', bookId: 'm1', bookLabel: 'My album', name: 'Jake', emoji: '🙂', collectionJSON: JSON.stringify({ MEX5: 2 }) },
    { memberId: 'm1', bookId: 'b9', bookLabel: 'Swaps', name: 'Jake', emoji: '🙂', collectionJSON: JSON.stringify({ ARG1: 3 }) },
    { memberId: 'm2', bookId: 'm2', bookLabel: 'My album', name: 'Mia', emoji: '👧', collectionJSON: JSON.stringify({ MEX5: 1 }) },
  ];
  const totalsOf = (m) => ({ have: Object.keys(m).length, total: 980, doubles: Object.values(m).filter((c) => c >= 2).length });
  const fam = S.summarizeFamily(rows, 'm1', totalsOf);
  assert.equal(fam.length, 3);
  assert.equal(fam[0].id, 'm1::m1');
  assert.equal(fam[1].id, 'm1::b9');
  assert.equal(fam[1].bookLabel, 'Swaps');
  assert.equal(fam[0].isMe, true);   // member-level identity
  assert.equal(fam[2].isMe, false);
});

test('summarizeFamily: a legacy row without bookId resolves to one "My album" book (bookId = memberId)', () => {
  const rows = [{ memberId: 'm1', name: 'Jake', emoji: '🙂', collectionJSON: JSON.stringify({ MEX5: 2 }) }];
  const totalsOf = (m) => ({ have: Object.keys(m).length, total: 980, doubles: 0 });
  const fam = S.summarizeFamily(rows, 'mX', totalsOf);
  assert.equal(fam.length, 1);
  assert.equal(fam[0].bookId, 'm1');
  assert.equal(fam[0].id, 'm1::m1');
  assert.equal(fam[0].bookLabel, 'My album');
});

test('per-book sync: publishing two books yields two member rows', async () => {
  const fake = makeFakeServer();
  const jake = { url: 'u', code: 'fam', memberId: 'm_jake' };
  await S.postAction(jake, 'publishCollection', { name: 'Jake', emoji: '🙂', bookId: 'm_jake', bookLabel: 'My album', collection: { MEX5: 1 } }, fake);
  await S.postAction(jake, 'publishCollection', { name: 'Jake', emoji: '🙂', bookId: 'b9', bookLabel: 'Swaps', collection: { ARG1: 2 } }, fake);
  const fam = await S.postAction(jake, 'getFamily', {}, fake);
  assert.equal(fam.members.length, 2);
  const labels = S.summarizeFamily(fam.members, 'm_jake', (m) => ({ have: Object.keys(m).length, total: 980, doubles: 0 }))
    .map((e) => e.bookLabel).sort();
  assert.deepEqual(labels, ['My album', 'Swaps']);
});

test('migration: re-publishing the default book under memberId UPDATES, never duplicates', async () => {
  const fake = makeFakeServer();
  const jake = { url: 'u', code: 'fam', memberId: 'm_jake' };
  // default book published under bookId == memberId (matches a pre-feature legacy row)
  await S.postAction(jake, 'publishCollection', { name: 'Jake', emoji: '🙂', bookId: 'm_jake', bookLabel: 'My album', collection: { MEX5: 1 } }, fake);
  await S.postAction(jake, 'publishCollection', { name: 'Jake', emoji: '🙂', bookId: 'm_jake', bookLabel: 'My album', collection: { MEX5: 2 } }, fake);
  const fam = await S.postAction(jake, 'getFamily', {}, fake);
  assert.equal(fam.members.filter((m) => m.memberId === 'm_jake').length, 1);
});
