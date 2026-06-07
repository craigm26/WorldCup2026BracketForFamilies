/* Panini-style FIFA World Cup 2026 sticker album — structural data (no copyrighted art).
   Real checklist supplied by the album owner: 20 "Specials" (00 + FW1..FW19) and
   48 teams x 20 stickers each (codes like MEX1, ARG20), grouped A..L.
   Sticker ids ("n") are STRING CODES, matching what's printed on each sticker.
   Dual export: window.WCSTK (browser) + module.exports (Node tests). */
(function (root, factory) {
  const data = factory();
  if (typeof window !== 'undefined') window.WCSTK = data;
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
})(this, function () {
  // [group, code, country, flagIso?] — 4 teams per group, A..L. Codes are the album's own.
  // flagIso is optional; only set when the sticker code doesn't match WC.T's key (e.g. JAP→jp, BIH→ba).
  const TEAMS = [
    ['A', 'MEX', 'Mexico'],        ['A', 'RSA', 'South Africa'], ['A', 'KOR', 'South Korea'],   ['A', 'CZE', 'Czech Republic'],
    ['B', 'CAN', 'Canada'],        ['B', 'BIH', 'Bosnia and Herzegovina', 'ba'], ['B', 'QAT', 'Qatar'], ['B', 'SUI', 'Switzerland'],
    ['C', 'BRA', 'Brazil'],        ['C', 'MAR', 'Morocco'],      ['C', 'HAI', 'Haiti'],          ['C', 'SCO', 'Scotland'],
    ['D', 'USA', 'United States'], ['D', 'PAR', 'Paraguay'],     ['D', 'AUS', 'Australia'],       ['D', 'TUR', 'Turkey'],
    ['E', 'GER', 'Germany'],       ['E', 'CUW', 'Curacao'],      ['E', 'CIV', 'Ivory Coast'],     ['E', 'ECU', 'Ecuador'],
    ['F', 'NED', 'Netherlands'],   ['F', 'JAP', 'Japan', 'jp'],  ['F', 'SWE', 'Sweden'],          ['F', 'TUN', 'Tunisia'],
    ['G', 'BEL', 'Belgium'],       ['G', 'EGY', 'Egypt'],        ['G', 'IRN', 'Iran'],            ['G', 'NZL', 'New Zealand'],
    ['H', 'ESP', 'Spain'],         ['H', 'CPV', 'Cape Verde'],   ['H', 'KSA', 'Saudi Arabia'],    ['H', 'URU', 'Uruguay'],
    ['I', 'FRA', 'France'],        ['I', 'SEN', 'Senegal'],      ['I', 'IRQ', 'Iraq'],            ['I', 'NOR', 'Norway'],
    ['J', 'ARG', 'Argentina'],     ['J', 'ALG', 'Algeria'],      ['J', 'AUT', 'Austria'],         ['J', 'JOR', 'Jordan'],
    ['K', 'POR', 'Portugal'],      ['K', 'COD', 'DR Congo'],     ['K', 'UZB', 'Uzbekistan'],      ['K', 'COL', 'Colombia'],
    ['L', 'ENG', 'England'],       ['L', 'CRO', 'Croatia'],      ['L', 'GHA', 'Ghana'],           ['L', 'PAN', 'Panama'],
  ];
  const PER_TEAM = 20; // stickers per team (4 cols x 5 rows)

  const pages = [];

  // Specials page: 00 (FIFA) then FW1..FW19 — 20 slots.
  const specials = [{ n: '00', name: 'FIFA', type: 'special', foil: true, confirmed: true }];
  for (let i = 1; i <= 19; i++) {
    specials.push({ n: 'FW' + i, name: 'FIFA World ' + i, type: 'special', foil: true, confirmed: true });
  }
  pages.push({ page: 1, section: 'specials', group: null, title: 'Specials',
    team: null, cols: 4, rows: 5, confirmed: true, slots: specials });

  // One page per team, 20 stickers, codes <CODE>1..<CODE>20.
  TEAMS.forEach((t, ti) => {
    const group = t[0], code = t[1], country = t[2];
    const flag = t[3] || null;
    const slots = [];
    for (let i = 1; i <= PER_TEAM; i++) {
      slots.push({ n: code + i, name: country, type: 'player', confirmed: true });
    }
    pages.push({ page: ti + 2, section: group, group: group, title: country,
      team: code, flag: flag, cols: 4, rows: 5, confirmed: true, slots: slots });
  });

  let total = 0;
  pages.forEach((p) => { total += p.slots.length; });

  return { meta: { title: 'Panini FIFA World Cup 2026', total: total, confirmed: true,
                   teams: TEAMS.length, perTeam: PER_TEAM, updated: '2026-06-06' },
           pages: pages };
});
