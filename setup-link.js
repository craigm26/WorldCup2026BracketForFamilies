/* Pure helper that builds a family Hub setup link. Dual export: window.WCSETUP + module.exports. */
(function (root, factory) {
  const api = factory();
  if (typeof window !== 'undefined') window.WCSETUP = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(this, function () {
  function buildShareLink(origin, basePath, exec, code) {
    exec = (exec || '').trim(); code = (code || '').trim();
    if (!exec || !code) return null;
    let bp = basePath || '/';
    if (bp.charAt(0) !== '/') bp = '/' + bp;
    if (bp.charAt(bp.length - 1) !== '/') bp = bp + '/';
    return origin + bp + 'worldcup/?sync=' + encodeURIComponent(exec) + '&code=' + encodeURIComponent(code);
  }
  // Build an invite link from a full hub base (…/worldcup/) + the sync exec URL + family code.
  function buildInviteLink(hubBase, exec, code) {
    exec = (exec || '').trim(); code = (code || '').trim();
    if (!exec || !code) return null;
    let hb = String(hubBase || '');
    if (hb.charAt(hb.length - 1) !== '/') hb = hb + '/';
    return hb + '?sync=' + encodeURIComponent(exec) + '&code=' + encodeURIComponent(code);
  }
  return { buildShareLink: buildShareLink, buildInviteLink: buildInviteLink };
});
