/* Family Sync client for the sticker tracker. Pure helpers + a single POST transport
   to a Google Apps Script web app (text/plain body => CORS simple request, no preflight).
   Dual export: window.WCSTKSYNC (browser) + module.exports (Node tests). */
(function (root, factory) {
  const api = factory();
  if (typeof window !== 'undefined') window.WCSTKSYNC = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(this, function () {
  let seq = 0;
  function rand() { return Math.floor((1 + Math.sin(++seq) * 0.5 + Math.random()) * 1e9).toString(36); }
  function genMemberId() { return 'm_' + (Math.random().toString(36).slice(2, 8) + rand().slice(0, 4)); }

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

  function tradeTransition(trade, response) {
    if (!trade || trade.status !== 'pending') return null;
    if (response === 'accept') return 'accepted';
    if (response === 'decline') return 'declined';
    return null;
  }

  function summarizeFamily(rows, myId, totalsOf) {
    return (rows || []).map((r) => {
      let collection = {};
      try { collection = JSON.parse(r.collectionJSON || '{}') || {}; } catch (e) { collection = {}; }
      const t = totalsOf(collection);
      return { id: r.memberId, name: r.name, emoji: r.emoji, updatedAt: r.updatedAt,
               have: t.have, total: t.total, doubles: t.doubles, isMe: r.memberId === myId, collection: collection };
    });
  }

  return { genMemberId: genMemberId, parseSetupLink: parseSetupLink, serializeCollection: serializeCollection,
           buildPayload: buildPayload, tradeTransition: tradeTransition, summarizeFamily: summarizeFamily };
});
