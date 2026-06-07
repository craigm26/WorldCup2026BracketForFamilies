/* Panini FIFA World Cup 2026 sticker album — structural data (no copyrighted art).
   Pages reproduce the real layout (page number, header, cols x rows, slot order).
   BEST-EFFORT: confirmed:false marks unverified entries — correct numbers/names here.
   Dual export: window.WCSTK (browser) + module.exports (Node tests). */
(function (root, factory) {
  const data = factory();
  if (typeof window !== 'undefined') window.WCSTK = data;
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
})(this, function () {
  // helper: build a team page of N players after the badge, numbered from `start`
  function teamPage(page, code, name, start, playerCount) {
    const slots = [{ n: start, name: 'Team badge', type: 'badge', foil: true, confirmed: false }];
    for (let i = 1; i <= playerCount; i++) {
      slots.push({ n: start + i, name: 'Player ' + i, type: 'player', confirmed: false });
    }
    const cols = 4, rows = Math.ceil(slots.length / cols);
    return { page: page, section: code, title: name, team: code, cols: cols, rows: rows,
             confirmed: false, slots: slots };
  }

  const pages = [
    { page: 4, section: 'intro', title: 'Welcome & Logos', team: null, cols: 4, rows: 2,
      confirmed: false, slots: [
        { n: 1, name: 'Tournament logo', type: 'special', foil: true, confirmed: false },
        { n: 2, name: 'Official emblem', type: 'special', foil: true, confirmed: false },
        { n: 3, name: 'Mascot', type: 'special', confirmed: false },
        { n: 4, name: 'Trophy', type: 'special', foil: true, confirmed: false },
      ] },
    // Starter team pages (numbers are placeholders until verified against a real album).
    teamPage(18, 'ARG', 'Argentina', 50, 19),
    teamPage(20, 'BRA', 'Brazil', 70, 19),
    teamPage(22, 'USA', 'United States', 90, 19),
    // Specials closing page
    { page: 80, section: 'legends', title: 'Legends', team: null, cols: 4, rows: 1,
      confirmed: false, slots: [
        { n: 660, name: 'Legend 1', type: 'legend', foil: true, confirmed: false },
        { n: 661, name: 'Legend 2', type: 'legend', foil: true, confirmed: false },
      ] },
  ];

  let total = 0;
  pages.forEach((p) => { total += p.slots.length; });

  return { meta: { title: 'Panini FIFA World Cup 2026', total: total, confirmed: false, updated: '2026-06-06' },
           pages: pages };
});
