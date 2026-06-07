/* Family Sync server for the World Cup 2026 sticker tracker.
 * Paste into a Google Sheet → Extensions → Apps Script. Then:
 *   Deploy → New deployment → Web app → Execute as: Me → Who has access: Anyone → Deploy.
 * Copy the /exec URL; share <hub>/worldcup/?sync=<exec-url>&code=<your-family-code>.
 *
 * Optional: set SECRET below to reject any other code. Empty SECRET = any code works and
 * simply namespaces its own data (the code is the shared "room key").
 */
var SECRET = ''; // e.g. 'merry-fam-2026' to lock to one code; '' = accept any code.
var MEMBERS = 'Members';
var TRADES = 'Trades';

function doPost(e) {
  var out = {};
  try {
    var body = JSON.parse(e.postData.contents);
    if (SECRET && body.familyCode !== SECRET) { out = { ok: false, error: 'bad family code' }; }
    else { out = handle(body); }
  } catch (err) { out = { ok: false, error: String(err) }; }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function sheet(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(headers); }
  return sh;
}
function rows(sh) {
  var v = sh.getDataRange().getValues(); if (v.length < 2) return [];
  var h = v[0], out = [];
  for (var i = 1; i < v.length; i++) { var o = {}; for (var j = 0; j < h.length; j++) o[h[j]] = v[i][j]; o._row = i + 1; out.push(o); }
  return out;
}

function handle(b) {
  var fc = b.familyCode || '';
  if (b.action === 'publishCollection') {
    var sh = sheet(MEMBERS, ['familyCode','memberId','name','emoji','updatedAt','collectionJSON']);
    var rs = rows(sh), now = new Date().toISOString();
    var found = rs.filter(function (r) { return r.familyCode === fc && r.memberId === b.memberId; })[0];
    var rec = [fc, b.memberId, b.name || '', b.emoji || '🙂', now, JSON.stringify(b.collection || {})];
    if (found) sh.getRange(found._row, 1, 1, rec.length).setValues([rec]);
    else sh.appendRow(rec);
    return { ok: true };
  }
  if (b.action === 'getFamily') {
    var ms = rows(sheet(MEMBERS, ['familyCode','memberId','name','emoji','updatedAt','collectionJSON']))
      .filter(function (r) { return r.familyCode === fc; })
      .map(function (r) { return { memberId: r.memberId, name: r.name, emoji: r.emoji, updatedAt: r.updatedAt, collectionJSON: r.collectionJSON }; });
    var ts = rows(sheet(TRADES, ['tradeId','familyCode','fromId','fromName','toId','toName','giveCodes','wantCodes','status','createdAt','updatedAt']))
      .filter(function (r) { return r.familyCode === fc; });
    return { ok: true, members: ms, trades: ts };
  }
  if (b.action === 'proposeTrade') {
    var t = sheet(TRADES, ['tradeId','familyCode','fromId','fromName','toId','toName','giveCodes','wantCodes','status','createdAt','updatedAt']);
    var id = Utilities.getUuid(), now2 = new Date().toISOString();
    t.appendRow([id, fc, b.memberId, b.fromName || '', b.toId || '', b.toName || '',
      (b.giveCodes || []).join(','), (b.wantCodes || []).join(','), 'pending', now2, now2]);
    return { ok: true, tradeId: id };
  }
  if (b.action === 'respondTrade') {
    var sh3 = sheet(TRADES, ['tradeId','familyCode','fromId','fromName','toId','toName','giveCodes','wantCodes','status','createdAt','updatedAt']);
    var rs3 = rows(sh3);
    var row = rs3.filter(function (r) { return r.tradeId === b.tradeId && r.familyCode === fc && r.toId === b.memberId; })[0];
    if (!row || row.status !== 'pending') return { ok: false, error: 'not allowed' };
    sh3.getRange(row._row, 9).setValue(b.response === 'accept' ? 'accepted' : 'declined');
    sh3.getRange(row._row, 11).setValue(new Date().toISOString());
    return { ok: true };
  }
  return { ok: false, error: 'unknown action' };
}
