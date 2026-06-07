/* Optional per-player enrichment for the sticker tracker: position, club, kid-friendly fact.
   Keyed by sticker code. BEST-EFFORT and incremental — a missing code (or blank field) just
   means "no detail yet"; the tracker works fine without it. Facts follow an omit-don't-invent
   rule (blank when not verifiable). Filled team-by-team from public squad sources.
   Dual export: window.WCSTKENRICH (browser) + module.exports (Node tests). */
(function (root, factory) {
  const data = factory();
  if (typeof window !== 'undefined') window.WCSTKENRICH = data;
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
})(this, function () {
  return {
    // ----- Mexico (pilot) -----
    MEX2:  { pos: 'GK', club: 'Club América',     fact: 'Led Club América to a Liga MX title with a club-record run of clean sheets.' },
    MEX3:  { pos: 'DF', club: 'Genoa',            fact: 'Became Genoa’s captain in Serie A — a rare honour for a Mexican abroad.' },
    MEX4:  { pos: 'DF', club: 'PAOK',             fact: 'Has played in the Champions League and won the CONCACAF Gold Cup with Mexico.' },
    MEX5:  { pos: 'DF', club: 'Lokomotiv Moscow', fact: 'At 6 ft 5 in, one of the tallest defenders Mexico has ever fielded.' },
    MEX6:  { pos: 'DF', club: 'Toluca',           fact: 'Won three Liga MX titles with Toluca in just two seasons.' },
    MEX7:  { pos: 'DF', club: 'Club América',     fact: '' },
    MEX8:  { pos: 'MF', club: 'Tigres UANL',      fact: 'Moved to Europe as a teenager, one of the youngest Liga MX exports ever.' },
    MEX9:  { pos: 'MF', club: 'Cruz Azul',        fact: 'Won an Olympic bronze medal with Mexico at the Tokyo 2020 Games.' },
    MEX10: { pos: 'MF', club: 'Fenerbahçe',       fact: 'Mexico’s captain; won the 2025 Gold Cup’s best-player award.' },
    MEX11: { pos: 'MF', club: 'AEK Athens',       fact: 'Nicknamed “El Mago” (The Magician) and a Greek league champion.' },
    MEX12: { pos: 'MF', club: 'Toluca',           fact: '' },
    MEX14: { pos: 'MF', club: 'Club América',     fact: 'Nicknamed “Chiquito”; a Liga MX title winner at more than one club.' },
    MEX15: { pos: 'MF', club: 'San Diego FC',     fact: 'His nickname “Chucky” began when he’d hide to scare teammates.' },
    MEX16: { pos: 'FW', club: 'AC Milan',         fact: 'Born in Argentina, he chose Mexico and scored the 2023 Gold Cup final winner.' },
    MEX17: { pos: 'FW', club: 'Fulham',           fact: 'Came back from a 2020 skull fracture to become Mexico’s top Premier League scorer.' },
    MEX18: { pos: 'FW', club: 'Toluca',           fact: '' },
    MEX19: { pos: 'MF', club: 'Guadalajara',      fact: 'Nicknamed “El Piojo”; a three-time Gold Cup winner with Mexico.' },
    MEX20: { pos: 'FW', club: 'Anderlecht',       fact: 'The first Mexican player to sign for Belgian club Anderlecht.' },
  };
});
