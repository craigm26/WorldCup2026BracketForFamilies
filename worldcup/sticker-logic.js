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

  return { buildIndex: buildIndex, cycleCount: cycleCount };
});
