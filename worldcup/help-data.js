/* In-app Help content for the World Cup 2026 Hub. Kid-friendly how-to cards.
   Dual export: window.WCHELP (cards) + window.WCHELP_LINKS (deep-link ids) + module.exports. */
(function (root, factory) {
  const d = factory();
  if (typeof window !== 'undefined') { window.WCHELP = d.cards; window.WCHELP_LINKS = d.links; }
  if (typeof module !== 'undefined' && module.exports) module.exports = d;
})(this, function () {
  const cards = [
    { group: 'Getting started', id: 'start-what', icon: '🏆',
      title: 'What is this?',
      summary: 'Your family’s World Cup hub — pick winners, track stickers, and play games together.' },
    { group: 'Getting started', id: 'start-tabs', icon: '🧭',
      title: 'Moving around',
      summary: 'The buttons across the top are tabs — tap one to switch.',
      steps: ['Tap a tab at the top (like 🗂️ Bracket or 🎟️ Stickers)',
              'On a keyboard you can also press ← and →, or the number keys',
              'Everything you do saves on this device automatically'] },

    { group: 'Bracket & predictions', id: 'pickem', icon: '👪',
      title: 'Add each family member',
      summary: 'Everyone gets their own bracket and a spot on the leaderboard.',
      steps: ['Go to 🏠 Home', 'Tap "+ Add player" and type a name (Mom, Dad, each kid)',
              'Tap a name to switch to that person',
              'The leaderboard shows who predicted the most teams right'] },
    { group: 'Bracket & predictions', id: 'bracket', icon: '🗂️',
      title: 'Fill in the bracket',
      summary: 'Pick who you think wins each game, all the way to the champion.',
      steps: ['Go to 🗂️ Bracket', 'Tap an empty slot and choose a team',
              'Keep picking winners up the rounds',
              'Empty slots show hints like "Winner Group A" — those are called feeders'] },
    { group: 'Bracket & predictions', id: 'scores', icon: '📊',
      title: 'How scores update',
      summary: 'Choose whether scores fill in by hand or on their own — no surprise spoilers.' },

    { group: 'Stickers', id: 'stk-mark', icon: '🎟️',
      title: 'Mark your stickers',
      summary: 'Tap a sticker to say you Have it, need it, or have spares to trade.',
      steps: ['Go to 🎟️ Stickers → 📖 My Book',
              'Tap a sticker once for Have, again for a spare (×2), and so on',
              'Tap the ×number to take one away',
              'Use the All / Need / Doubles buttons or the search box to find stickers',
              'Tap ⓘ on a sticker to see the player\'s position, club and a fun fact'] },
    { group: 'Stickers', id: 'stk-scan', icon: '📷',
      title: 'Scan stickers with the camera',
      summary: 'Point your phone at a sticker to add it fast — typing the code always works too.',
      steps: ['Open 🎟️ Stickers → 📖 My Book', 'Tap 📷 Scan a swap',
              'Hold the sticker in view, or type its code (like MEX5)', 'Tap Add +1',
              'To do a whole page, tap "📷 Scan this page" on a team and check the guesses'] },
    { group: 'Stickers', id: 'stk-trade', icon: '🔄',
      title: 'Find trades (Trade Matcher)',
      summary: 'See exactly which of your spares match what someone else needs.',
      steps: ['Go to 🎟️ Stickers → 🔄 Trade Matcher', 'Pick another player',
              '"You give" = your spares they need; "you get" = their spares you need',
              'The 🤝 number is how many perfect swaps you can make'] },

    { group: 'Trading with family far away', id: 'family-relative', icon: '👨‍👩‍👧',
      title: 'Trade with family far away',
      summary: 'Join your family\'s sticker swap from anywhere — just open the link they send you.',
      steps: ['Open the setup link a family member sent (it has "?sync=…&code=…")',
              'Go to 🎟️ Stickers → 👨‍👩‍👧 Family and tap "Publish my collection"',
              'Tap a relative to see their spares',
              'Use "Propose a trade", then they tap Accept'] },
    { group: 'Trading with family far away', id: 'family-host', icon: '🛠️',
      title: 'Setting up Family Sync (grown-ups)',
      summary: 'The one-time setup that powers far-away trading is in the project\'s README (look for "Family Sync").' },

    { group: 'Watching', id: 'schedule', icon: '📅',
      title: 'Game schedule in your time',
      summary: 'Every match shows in your time zone, with a 🌞/🌙 for day or night.' },
    { group: 'Watching', id: 'watch', icon: '📺',
      title: 'Where to watch',
      summary: 'Find how to watch in your country — including the free options.' },

    { group: 'Explore & games', id: 'facts', icon: '🌍',
      title: 'Map & fun facts',
      summary: 'Explore the host cities and tap ☆ Follow to cheer for your team.' },
    { group: 'Explore & games', id: 'play', icon: '🎮',
      title: 'Play the quiz',
      summary: 'Guess flags, countries and foods — beat your best streak!' },

    { group: 'Extras & settings', id: 'extras', icon: '✨',
      title: 'Handy extras',
      summary: 'A screensaver, calendar reminders, and a way to share your bracket.',
      steps: ['Leave it idle and a fun screensaver appears — touch to wake it',
              'Use add-to-calendar to save game times to your phone',
              'Tap share to make a QR of your bracket for someone to scan'] },
    { group: 'Extras & settings', id: 'settings', icon: '⚙️',
      title: 'Settings',
      summary: 'Change how scores update, pick your time zone, and see Family Sync status.' },
  ];

  // ids used as contextual "?" deep-link targets in the UI (must all exist in cards)
  const links = ['bracket', 'stk-mark', 'family-relative'];

  return { cards: cards, links: links };
});
