/* Pure, side-effect-free sticker logic. Loadable in the browser (window.WCSTKLOGIC)
   and in Node (module.exports) so it can be unit-tested without a DOM. */
(function (root, factory) {
  const api = factory();
  if (typeof window !== 'undefined') window.WCSTKLOGIC = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(this, function () {
  // number -> { slot, page, section } for O(1) lookups
  function buildIndex(data) {
    const idx = {};
    (data.pages || []).forEach((pg) => {
      (pg.slots || []).forEach((slot) => {
        idx[slot.n] = { slot: slot, page: pg.page, section: pg.section };
      });
    });
    return idx;
  }

  // tap a slot: 0 -> 1 -> 2 -> 3 ... (decrement is handled by callers via Math.max(0, c-1))
  function cycleCount(count) {
    return (count || 0) + 1;
  }

  // owned (count>=1) slots on one page
  function sectionProgress(map, page) {
    map = map || {};
    let have = 0;
    (page.slots || []).forEach((s) => { if ((map[s.n] || 0) >= 1) have++; });
    return { have: have, total: (page.slots || []).length };
  }

  // album-wide totals for the header
  function playerTotals(map, index) {
    map = map || {};
    let have = 0, doubles = 0;
    Object.keys(index).forEach((n) => {
      const c = map[n] || 0;
      if (c >= 1) have++;
      if (c >= 2) doubles += c - 1;
    });
    return { have: have, total: Object.keys(index).length, doubles: doubles };
  }

  const has = (map, n) => (map[n] || 0) >= 1;
  const needs = (map, n) => (map[n] || 0) === 0;
  const isDouble = (map, n) => (map[n] || 0) >= 2;

  // what mine can give theirs, what mine wants from theirs, perfect-swap count
  function tradeMatch(mine, theirs, index) {
    mine = mine || {}; theirs = theirs || {};
    const iGive = [], iWant = [];
    Object.keys(index).forEach((n) => {
      if (isDouble(mine, n) && needs(theirs, n)) iGive.push(n);
      if (isDouble(theirs, n) && needs(mine, n)) iWant.push(n);
    });
    return { iGive: iGive, iWant: iWant, swaps: Math.min(iGive.length, iWant.length) };
  }

  // numbers no player in `maps` owns at all
  function rarestNeeded(maps, index) {
    return Object.keys(index).filter((n) => !maps.some((m) => has(m, n)));
  }

  // Group album pages into ordered sections for the collapsible My Book view.
  // key = page.group (A..L) or 'specials'; preserves dataset order (Specials first, then A..L).
  function groupSections(pages) {
    var out = [], byKey = {};
    (pages || []).forEach(function (p) {
      var key = p.group || 'specials';
      if (!byKey[key]) {
        byKey[key] = { key: key, label: p.group ? ('Group ' + p.group) : 'Specials', isSpecials: !p.group, pages: [] };
        out.push(byKey[key]);
      }
      byKey[key].pages.push(p);
    });
    return out;
  }

  return { buildIndex: buildIndex, cycleCount: cycleCount,
           sectionProgress: sectionProgress, playerTotals: playerTotals,
           tradeMatch: tradeMatch, rarestNeeded: rarestNeeded, groupSections: groupSections };
});
