/* Family Sync client for the sticker tracker. Pure helpers + a single POST transport
   to a Google Apps Script web app (text/plain body => CORS simple request, no preflight).
   Dual export: window.WCSTKSYNC (browser) + module.exports (Node tests). */
(function (root, factory) {
  const api = factory();
  if (typeof window !== 'undefined') window.WCSTKSYNC = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(this, function () {
  function genMemberId() { return 'm_' + Math.random().toString(36).slice(2, 12); }

  function parseSetupLink(search) {
    try {
      const q = new URLSearchParams(search || '');
      const url = q.get('sync'), code = q.get('code');
      if (url && code) return { url: url, code: code };
    } catch (e) {}
    return null;
  }

  function serializeCollection(map) {
    const out = {};
    Object.keys(map || {}).forEach((k) => { if ((map[k] || 0) >= 1) out[k] = map[k]; });
    return out;
  }

  function buildPayload(action, cfg, extra) {
    return Object.assign({ action: action, familyCode: cfg.code, memberId: cfg.memberId }, extra || {});
  }

  // Invite link from a full hub base (…/worldcup/) + the sync exec URL + family code.
  function buildInviteLink(hubBase, exec, code) {
    exec = (exec || '').trim(); code = (code || '').trim();
    if (!exec || !code) return null;
    var hb = String(hubBase || '');
    if (hb.charAt(hb.length - 1) !== '/') hb = hb + '/';
    return hb + '?sync=' + encodeURIComponent(exec) + '&code=' + encodeURIComponent(code);
  }

  function tradeTransition(trade, response) {
    if (!trade || trade.status !== 'pending') return null;
    if (response === 'accept') return 'accepted';
    if (response === 'decline') return 'declined';
    return null;
  }

  function summarizeFamily(rows, myId, totalsOf) {
    return (rows || []).filter((r) => !(r.deleted === '1' || r.deleted === 1 || r.deleted === true)).map((r) => {
      let collection = {};
      try { collection = JSON.parse(r.collectionJSON || '{}') || {}; } catch (e) { collection = {}; }
      const t = totalsOf(collection);
      const bookId = r.bookId || r.memberId;
      const bookLabel = r.bookLabel || 'My album';
      return { id: r.memberId + '::' + bookId, memberId: r.memberId, bookId: bookId, bookLabel: bookLabel,
               name: r.name, emoji: r.emoji, updatedAt: r.updatedAt,
               have: t.have, total: t.total, doubles: t.doubles, isMe: r.memberId === myId, collection: collection };
    });
  }

  async function postAction(cfg, action, extra, fetchImpl) {
    const f = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
    if (!f) throw new Error('no fetch available');
    if (!cfg || !cfg.url) throw new Error('Family Sync is not set up');
    const res = await f(cfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(buildPayload(action, cfg, extra)),
    });
    if (!res.ok) throw new Error('network error (' + res.status + ')');
    let data;
    try {
      data = await res.json();
    } catch (e) {
      throw new Error('sync failed — check the Apps Script is deployed for "Anyone" (got a non-JSON response)');
    }
    if (!data || data.ok === false) throw new Error((data && data.error) || 'request failed');
    return data;
  }

  return { genMemberId: genMemberId, parseSetupLink: parseSetupLink, serializeCollection: serializeCollection,
           buildPayload: buildPayload, buildInviteLink: buildInviteLink, tradeTransition: tradeTransition,
           summarizeFamily: summarizeFamily, postAction: postAction };
});
