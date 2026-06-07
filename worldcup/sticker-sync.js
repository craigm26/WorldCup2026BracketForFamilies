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

  return { genMemberId: genMemberId, parseSetupLink: parseSetupLink, serializeCollection: serializeCollection };
});
