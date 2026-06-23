/* Hub · Projections — exact group-stage qualification scenarios.
   "Two games played, one to go: here's each team's chance to advance and where
    they'd land in the bracket." Pure + deterministic — every remaining-game
    outcome is enumerated (3^n branches; n=2 ⇒ 9 for the classic last-round case),
    NO Monte Carlo. A single % comes from weighting those branches by a transparent
    FIFA-rank match-odds factor. Clinch / elimination is computed from points only,
    so it is always certain (margin-independent). The one cross-group estimate (the
    best-3rd race) is a snapshot, clearly labelled in the UI.

   Reuses window.WC / window.computeStandings / window.wcResolveBracket at CALL time
   (so Node tests can require data.js + hub-data.js first). Dual export like
   family-store.js: window.* in the browser, module.exports under Node. */
(function (root, factory) {
  var api = factory();
  if (typeof window !== 'undefined') Object.assign(window, api);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(this, function () {
  var OUTCOMES = ['H', 'D', 'A']; // home win / draw / away win

  // ---- match-outcome model: FIFA-rank diff → win/draw/loss probabilities.
  //      ONLY used to weight the fully-enumerated branches into a single %. The
  //      enumeration itself (and all clinch math) is exact and model-free.
  function wcOutcomeProbs(rankH, rankA) {
    var ratingH = 2000 - (rankH || 100) * 4;
    var ratingA = 2000 - (rankA || 100) * 4;
    var expH = 1 / (1 + Math.pow(10, (ratingA - ratingH) / 400)); // 0..1 expected score
    var pD = 0.30 * (1 - Math.abs(2 * expH - 1));                  // draws likelier between equals
    var pH = expH - pD / 2;
    var pA = 1 - pH - pD;
    if (pH < 0) { pA += pH; pH = 0; }
    if (pA < 0) { pH += pA; pA = 0; }
    var s = pH + pD + pA || 1;
    return { pH: pH / s, pD: pD / s, pA: pA / s };
  }

  function isPlayed(r) {
    return r && r[0] !== '' && r[1] !== '' && r[0] != null && r[1] != null &&
           !Number.isNaN(+r[0]) && !Number.isNaN(+r[1]);
  }
  function remainingFixtures(letter, results) {
    var WC = window.WC, fx = WC.FIXTURES[letter] || [], out = [];
    fx.forEach(function (f, i) {
      if (!isPlayed(results[letter + '-' + i])) out.push({ key: letter + '-' + i, idx: i, home: f[0], away: f[1] });
    });
    return out;
  }

  // representative scoreline for an outcome (win-by-1 / 1-1 draw): used only to
  // ORDER point-tied teams via computeStandings; clinch/eliminate never use it.
  function lineFor(o) { return o === 'H' ? [1, 0] : o === 'A' ? [0, 1] : [1, 1]; }
  function branchResults(results, remaining, combo) {
    var out = Object.assign({}, results);
    remaining.forEach(function (rf, i) { out[rf.key] = lineFor(combo[i]); });
    return out;
  }
  // final POINTS only (margin-independent) — the trustworthy clinch/eliminate basis.
  function branchPoints(letter, results, remaining, combo) {
    var WC = window.WC, teams = WC.GROUPS[letter], fx = WC.FIXTURES[letter];
    var pts = {}; teams.forEach(function (k) { pts[k] = 0; });
    fx.forEach(function (f, i) {
      var r = results[letter + '-' + i]; if (!isPlayed(r)) return;
      var h = +r[0], a = +r[1];
      if (h > a) pts[f[0]] += 3; else if (h < a) pts[f[1]] += 3; else { pts[f[0]]++; pts[f[1]]++; }
    });
    remaining.forEach(function (rf, i) {
      var o = combo[i];
      if (o === 'H') pts[rf.home] += 3; else if (o === 'A') pts[rf.away] += 3; else { pts[rf.home]++; pts[rf.away]++; }
    });
    return pts;
  }

  function allCombos(n) {
    var out = [[]];
    for (var i = 0; i < n; i++) {
      var nxt = [];
      out.forEach(function (c) { OUTCOMES.forEach(function (o) { nxt.push(c.concat([o])); }); });
      out = nxt;
    }
    return out;
  }
  function comboWeight(remaining, combo) {
    var WC = window.WC, w = 1;
    remaining.forEach(function (rf, i) {
      var p = wcOutcomeProbs(WC.T[rf.home].r, WC.T[rf.away].r);
      w *= combo[i] === 'H' ? p.pH : combo[i] === 'A' ? p.pA : p.pD;
    });
    return w;
  }

  // the indices in `remaining` that involve team k (its own games still to play)
  function ownRemaining(letter, k, remaining) {
    var mine = [];
    remaining.forEach(function (rf, i) { if (rf.home === k || rf.away === k) mine.push({ i: i, isHome: rf.home === k }); });
    return mine;
  }
  // Does team k reach the top 2 if its own game (index ownIdx) ends in teamResult
  // ('win'|'draw'|'loss')? Returns {all, any} across every branch consistent with that
  // own result — points-only, so margin-independent and certain.
  function throughIf(letter, k, results, remaining, ownIdx, isHome, teamResult) {
    var want = teamResult === 'draw' ? 'D' : ((teamResult === 'win') === isHome ? 'H' : 'A');
    var teams = window.WC.GROUPS[letter];
    var all = true, any = false, seen = false;
    allCombos(remaining.length).forEach(function (combo) {
      if (combo[ownIdx] !== want) return;
      seen = true;
      var pts = branchPoints(letter, results, remaining, combo);
      var atLeast = 0;
      teams.forEach(function (o) { if (o !== k && pts[o] >= pts[k]) atLeast++; });
      if (atLeast <= 1) any = true; else all = false;
    });
    return seen ? { all: all, any: any } : null;
  }

  function scenarioText(letter, k, results, remaining, pt) {
    var WC = window.WC;
    if (pt.clinchedWin) return 'Already winning the group! 👑';
    if (pt.clinchedTop2) return 'Already through to the knockouts! 🎉';
    if (pt.eliminated) return pt.pThird > 0 ? 'Out of the top 2 — only a best-3rd place could rescue them.' : "Can't reach the top 2 of this group.";
    var mine = ownRemaining(letter, k, remaining);
    if (mine.length === 1) {
      var ow = mine[0];
      var win = throughIf(letter, k, results, remaining, ow.i, ow.isHome, 'win');
      var draw = throughIf(letter, k, results, remaining, ow.i, ow.isHome, 'draw');
      if (win && draw && win.all && draw.all) return "Win or draw and they're through. 🙌";
      if (win && win.all && draw && draw.any && !draw.all) return "Win and they're in — a draw might not be enough.";
      if (win && win.all && draw && !draw.any) return 'Must win to go through.';
      if (win && win.any && !win.all) return 'A win gives a real chance — other results need to help too.';
      if (win && !win.any) return 'Very tough — would likely need a best-3rd place.';
      return 'Still fighting — the last game decides it.';
    }
    return 'Top-2 chance right now: ' + Math.round(pt.pTop2 * 100) + '%.';
  }

  function buildSummary(letter, cur, perTeam, remaining) {
    var WC = window.WC, lines = [];
    var through = cur.filter(function (r) { return perTeam[r.k].clinchedTop2; });
    var winner = cur.find(function (r) { return perTeam[r.k].clinchedWin; });
    if (winner) lines.push('🏆 ' + WC.T[winner.k].n + ' have won Group ' + letter + '.');
    if (through.length >= 2) lines.push('Both knockout spots are settled.');
    else if (remaining.length) lines.push(remaining.length + (remaining.length === 1 ? ' game' : ' games') + ' left in Group ' + letter + '.');
    else lines.push('Group ' + letter + ' is final.');
    cur.filter(function (r) { return perTeam[r.k].eliminated; }).forEach(function (r) {
      lines.push('❌ ' + WC.T[r.k].n + " can't finish in the top 2.");
    });
    return lines;
  }

  // ---- the exact per-group engine ----
  function wcGroupScenarios(letter, results) {
    results = results || {};
    var WC = window.WC, teams = WC.GROUPS[letter];
    var remaining = remainingFixtures(letter, results);
    var combos = allCombos(remaining.length);
    var perTeam = {};
    teams.forEach(function (k) {
      perTeam[k] = { k: k, finishCounts: { 1: 0, 2: 0, 3: 0, 4: 0 }, finishProb: { 1: 0, 2: 0, 3: 0, 4: 0 },
        // pts*: rigorous, margin-proof guarantees (hold for any future scoreline).
        ptsWin: true, ptsTop2: true, ptsElim: true,
        // pos*: actual finishing-position certainty — exact only when the group is over.
        posFirstAll: true, posTop2All: true, posOutAll: true };
    });
    var totalW = 0;
    combos.forEach(function (combo) {
      var w = comboWeight(remaining, combo); totalW += w;
      window.computeStandings(letter, branchResults(results, remaining, combo)).forEach(function (row, idx) {
        var pos = idx + 1, pt = perTeam[row.k];
        pt.finishCounts[pos] += 1; pt.finishProb[pos] += w;
        if (pos !== 1) pt.posFirstAll = false;
        if (pos > 2) pt.posTop2All = false;
        if (pos < 3) pt.posOutAll = false;
      });
      var pts = branchPoints(letter, results, remaining, combo);
      teams.forEach(function (k) {
        var atLeast = 0, strictlyAbove = 0;
        teams.forEach(function (o) { if (o === k) return; if (pts[o] >= pts[k]) atLeast++; if (pts[o] > pts[k]) strictlyAbove++; });
        if (atLeast > 1) perTeam[k].ptsTop2 = false;
        if (atLeast > 0) perTeam[k].ptsWin = false;
        if (strictlyAbove < 2) perTeam[k].ptsElim = false;
      });
    });
    var done = remaining.length === 0;
    teams.forEach(function (k) {
      var pt = perTeam[k];
      // margin-proof guarantee, OR — once the group is decided — the real final position.
      pt.clinchedWin = pt.ptsWin || (done && pt.posFirstAll);
      pt.clinchedTop2 = pt.ptsTop2 || (done && pt.posTop2All);
      pt.eliminated = pt.ptsElim || (done && pt.posOutAll);
      [1, 2, 3, 4].forEach(function (p) { pt.finishProb[p] = totalW > 0 ? pt.finishProb[p] / totalW : 0; });
      pt.pTop2 = pt.finishProb[1] + pt.finishProb[2];
      pt.pThird = pt.finishProb[3];
      var best = 1; [2, 3, 4].forEach(function (p) { if (pt.finishProb[p] > pt.finishProb[best]) best = p; });
      pt.likelyFinish = best; pt.likelyFinishProb = pt.finishProb[best];
    });
    var cur = window.computeStandings(letter, results);
    teams.forEach(function (k) { perTeam[k].scenarioText = scenarioText(letter, k, results, remaining, perTeam[k]); });
    return { letter: letter, remaining: remaining, remainingCount: remaining.length,
             branches: combos.length, standings: cur, perTeam: perTeam,
             summary: buildSummary(letter, cur, perTeam, remaining) };
  }

  // ---- cross-group best-3rd-place race (snapshot, labelled approximate in UI) ----
  function wcThirdPlaceWatch(results) {
    results = results || {};
    var WC = window.WC;
    var thirds = Object.keys(WC.GROUPS).map(function (g) {
      var t = window.computeStandings(g, results)[2];
      return { g: g, k: t.k, pts: t.pts, gd: t.gd, gf: t.gf };
    });
    thirds.sort(function (a, b) { return b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || WC.T[a.k].r - WC.T[b.k].r; });
    thirds.forEach(function (t, i) { t.rank = i + 1; });
    var cutoffPts = thirds.length >= 8 ? thirds[7].pts : 0;
    function statusForGroup(g) {
      var t = thirds.find(function (x) { return x.g === g; });
      if (!t) return null;
      var inTop8 = t.rank <= 8;
      return { rank: t.rank, inTop8: inTop8, pts: t.pts, cutoffPts: cutoffPts,
               label: inTop8 ? (t.rank <= 6 ? 'In the best-3rd places (for now)' : 'On the bubble for a best-3rd place') : 'Outside the best 3rd places (for now)' };
    }
    return { ranked: thirds, cutoffPts: cutoffPts, statusForGroup: statusForGroup };
  }

  // ---- where a group finisher lands in the R32 (deterministic for 1st/2nd) ----
  function feederMatch(code) {
    var KO_M = window.WC.KO_M, nos = Object.keys(KO_M);
    for (var i = 0; i < nos.length; i++) {
      var m = KO_M[nos[i]];
      if (m.top === code) return { m: m, side: 'top', oppCode: m.bottom };
      if (m.bottom === code) return { m: m, side: 'bottom', oppCode: m.top };
    }
    return null;
  }
  function wcProjectedSlot(letter, pos, results, resolved) {
    var WC = window.WC;
    var fm = feederMatch(pos + letter); // "1A" / "2A"
    if (!fm) return null;
    var m = fm.m, currentOpp = null;
    if (resolved && resolved.matchTeams && resolved.matchTeams[m.no]) {
      currentOpp = fm.side === 'top' ? resolved.matchTeams[m.no].bot : resolved.matchTeams[m.no].top;
    }
    return { matchNo: m.no, round: m.round, date: m.date, city: m.city, et: m.et,
             oppFeeder: fm.oppCode, oppLabel: WC.feeder(fm.oppCode, false), currentOpp: currentOpp };
  }

  // ---- orchestrator the UI calls once (cheap; memoize on a hash of results) ----
  function wcProjections(results) {
    results = results || {};
    var WC = window.WC;
    var resolved = window.wcResolveBracket ? window.wcResolveBracket(results, null, {}) : { matchTeams: {} };
    var groups = {}, totalRemaining = 0;
    Object.keys(WC.GROUPS).forEach(function (g) { groups[g] = wcGroupScenarios(g, results); totalRemaining += groups[g].remainingCount; });
    return { groups: groups, thirds: wcThirdPlaceWatch(results), resolved: resolved,
             meta: { remainingFixtures: totalRemaining, playedFixtures: 6 * Object.keys(WC.GROUPS).length - totalRemaining } };
  }

  // ---- standings sliced by finishing position (1st/2nd/3rd/4th across all groups) ----
  // Each position's 12 teams ranked against each other by the same cross-group key the
  // bracket uses (pts → gd → gf → FIFA rank). The 3rd-place table is the interesting one:
  // the best `thirdAdvance` (8) advance, the rest are out — `thirdCutoffPts` is the line.
  function wcPositionTables(results) {
    results = results || {};
    var WC = window.WC;
    var byPos = [[], [], [], []];
    Object.keys(WC.GROUPS).forEach(function (g) {
      window.computeStandings(g, results).forEach(function (row, i) {
        if (i < 4) byPos[i].push(Object.assign({ g: g }, row));
      });
    });
    byPos.forEach(function (arr) {
      arr.sort(function (a, b) { return b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || WC.T[a.k].r - WC.T[b.k].r; });
      arr.forEach(function (r, i) { r.rank = i + 1; });
    });
    return { first: byPos[0], second: byPos[1], third: byPos[2], fourth: byPos[3],
             thirdAdvance: 8, thirdCutoffPts: byPos[2].length >= 8 ? byPos[2][7].pts : 0 };
  }

  return { wcOutcomeProbs: wcOutcomeProbs, wcGroupScenarios: wcGroupScenarios,
           wcThirdPlaceWatch: wcThirdPlaceWatch, wcProjectedSlot: wcProjectedSlot,
           wcProjections: wcProjections, wcPositionTables: wcPositionTables };
});
