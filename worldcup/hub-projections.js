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

  // ---- DRAMA: snapshot the qualification picture; diff two snapshots into warm events ----
  // The "what just changed when a goal goes in" mechanic. wcQualSnapshot(results) is a pure,
  // JSON-serializable fingerprint of every fact we narrate (built from ONE wcProjections call —
  // groups + per-team clinch/elim + the resolved bracket — plus one wcPositionTables call for the
  // cross-group best-3rd membership). wcDramaDiff(prev,cur) turns two snapshots into ready-to-render
  // events; wcDramaSentence() owns the warm, kid-readable phrasing (one place to review/snapshot-test).
  function playedScoresHash(results) {
    return Object.keys(results).filter(function (k) { return isPlayed(results[k]); }).sort()
      .map(function (k) { return k + ':' + results[k][0] + '-' + results[k][1]; }).join('|');
  }
  function groupPlayedCount(letter, results) {
    var fx = window.WC.FIXTURES[letter] || [], n = 0;
    fx.forEach(function (f, i) { if (isPlayed(results[letter + '-' + i])) n++; });
    return n;
  }
  function wcQualSnapshot(results, status) {
    results = results || {}; status = status || {};
    var WC = window.WC;
    // Absolute claims (clinch / eliminate) must come from SETTLED scores only — never narrate
    // "WON THE GROUP / THROUGH / OUT" off an in-progress LIVE/HT score that can still reverse.
    // Everything else (leader / best-3rd / projected R32 / cutoff) is an honest "as it stands"
    // picture and is allowed to move on a live goal.
    var live = {}, hasLive = false;
    Object.keys(status).forEach(function (k) { if (status[k] === 'LIVE' || status[k] === 'HT') { live[k] = 1; hasLive = true; } });
    var finalResults = results;
    if (hasLive) { finalResults = {}; Object.keys(results).forEach(function (k) { if (!live[k]) finalResults[k] = results[k]; }); }
    var projLive = wcProjections(results);
    var projFinal = hasLive ? wcProjections(finalResults) : projLive;
    var pt = wcPositionTables(results);
    var perTeam = {}, leader = {}, third8 = {}, r32 = {};
    Object.keys(WC.GROUPS).forEach(function (g) {
      // leader only once a group has actually played, so the FIFA-rank seeded order before
      // kick-off never fires a spurious "took the lead from nobody" event.
      leader[g] = groupPlayedCount(g, results) > 0 ? projLive.groups[g].standings[0].k : null;
      projLive.groups[g].standings.forEach(function (row) {
        var pf = projFinal.groups[g].perTeam[row.k]; // clinch/elim from SETTLED scores only
        perTeam[row.k] = { g: g, clinchedWin: !!pf.clinchedWin, clinchedTop2: !!pf.clinchedTop2,
                           eliminated: !!pf.eliminated, pThird: pf.pThird || 0 };
      });
    });
    pt.third.forEach(function (r, i) { if (i < pt.thirdAdvance) third8[r.k] = true; });
    var mt = projLive.resolved.matchTeams || {};
    Object.keys(WC.KO_M).forEach(function (no) {
      if (WC.KO_M[no].round !== 'R32') return;
      var t = mt[no] || {};
      r32[no] = { top: t.top || null, bot: t.bot || null };
    });
    // hash blends the live scores (so leader / best-3rd / R32 drama fires on every goal) with a
    // finalization marker (so a clinch/eliminate transition fires the moment a game goes FINAL,
    // even when the final score equals the last live score).
    var hash = playedScoresHash(results) + '#' + playedScoresHash(finalResults);
    return { hash: hash, perTeam: perTeam, third8: third8,
             thirdCutoffPts: pt.thirdCutoffPts, leader: leader, r32: r32 };
  }

  function wcDramaSentence(ev, WC) {
    var nm = function (k) { return (k && WC.T[k] && WC.T[k].n) || k || ''; };
    var T = nm(ev.teamCode), O = nm(ev.otherCode), G = ev.groupLetter;
    switch (ev.type) {
      case 'clinch_win': return T + ' have WON Group ' + G + ' — top of the table!';
      case 'clinch_top2': return T + ' are THROUGH to the knockouts!';
      case 'eliminated_out': return T + " can't reach the top 2 of Group " + G + ' anymore.';
      case 'eliminated_third_hope': return T + ' miss the top 2 — only a best-3rd spot can save them.';
      case 'third8_out': return T + ' slipped OUT of the last best-3rd spot — on the bubble now.';
      case 'third8_in': return T + ' sneaked INTO the best-3rd places — 8th and going through!';
      case 'leader_change': return T + ' have jumped above ' + O + ' to lead Group ' + G + '!';
      case 'r32_opp_change': return 'New Round-of-32 tie: ' + T + ' would now meet ' + O + '.';
      case 'cutoff_move': return 'The bar for a best-3rd spot is now ' + ev.n + ' point' + (ev.n === 1 ? '' : 's') + '.';
      default: return '';
    }
  }

  var DRAMA_SEV = { clinch_win: 'big', clinch_top2: 'big', eliminated_out: 'big', third8_out: 'big',
    eliminated_third_hope: 'medium', third8_in: 'medium', leader_change: 'medium',
    r32_opp_change: 'small', cutoff_move: 'small' };
  var DRAMA_EMOJI = { clinch_win: '👑', clinch_top2: '🎉', eliminated_out: '❌', eliminated_third_hope: '😬',
    third8_out: '🔴', third8_in: '🟢', leader_change: '⬆️', r32_opp_change: '🔀', cutoff_move: '📊' };
  var DRAMA_RANK = { big: 0, medium: 1, small: 2 };
  // per-team precedence when a single goal triggers several transitions for one team
  var TEAM_PRIORITY = { clinch_win: 0, clinch_top2: 1, eliminated_out: 2, eliminated_third_hope: 3,
    third8_out: 4, third8_in: 5, leader_change: 6 };

  function wcDramaDiff(prev, cur) {
    // Two guards: first-load (no baseline) and no-played-score-change (live-poll no-op / 1s tick).
    if (!prev || !cur || prev.hash === cur.hash) return [];
    var WC = window.WC, raw = [];
    function push(type, teamCode, otherCode, groupLetter, extra) {
      var ev = { type: type, teamCode: teamCode || null, otherCode: otherCode || null,
                 groupLetter: groupLetter || null, emoji: DRAMA_EMOJI[type], severity: DRAMA_SEV[type] };
      if (extra) Object.assign(ev, extra);
      ev.sentence = wcDramaSentence(ev, WC);
      // identity = matchNo when the event is match-scoped (r32), else team/group; always
      // suffixed with the snapshot hash so the same transition isn't doubled across a remount.
      var idKey = (extra && extra.matchNo != null) ? ('m' + extra.matchNo) : (teamCode || groupLetter || '');
      ev.id = type + ':' + idKey + ':' + cur.hash;
      raw.push(ev);
    }
    // per-team: clinch / elimination
    Object.keys(cur.perTeam).forEach(function (k) {
      var a = prev.perTeam[k], b = cur.perTeam[k];
      if (!a) return;
      if (!a.clinchedWin && b.clinchedWin) push('clinch_win', k, null, b.g);
      else if (!a.clinchedTop2 && b.clinchedTop2) push('clinch_top2', k, null, b.g);
      if (!a.eliminated && b.eliminated) push(b.pThird <= 0.005 ? 'eliminated_out' : 'eliminated_third_hope', k, null, b.g);
    });
    // cross-group best-3rd membership — the marquee "the bar moved under you" drama
    Object.keys(cur.third8).forEach(function (k) { if (!prev.third8[k]) push('third8_in', k, null, cur.perTeam[k] && cur.perTeam[k].g); });
    Object.keys(prev.third8).forEach(function (k) { if (!cur.third8[k]) push('third8_out', k, null, cur.perTeam[k] && cur.perTeam[k].g); });
    // group leader changes (both sides concrete; never-played groups carry null leaders)
    Object.keys(cur.leader).forEach(function (g) {
      var a = prev.leader[g], b = cur.leader[g];
      if (a && b && a !== b) push('leader_change', b, a, g);
    });
    // projected R32 pairing swaps (both sides real teams, not feeders) — one per match
    Object.keys(cur.r32).forEach(function (no) {
      var a = prev.r32[no], b = cur.r32[no]; if (!a || !b) return;
      var real = function (c) { return c && WC.T[c]; };
      if (!(real(a.top) && real(a.bot) && real(b.top) && real(b.bot))) return;
      if ([a.top, a.bot].sort().join(',') !== [b.top, b.bot].sort().join(',')) push('r32_opp_change', b.top, b.bot, null, { matchNo: +no });
    });
    // cutoff line move (single summary event)
    if (prev.thirdCutoffPts != null && cur.thirdCutoffPts != null && prev.thirdCutoffPts !== cur.thirdCutoffPts)
      push('cutoff_move', null, null, null, { n: cur.thirdCutoffPts });
    // dedupe per team: keep only the most important transition per team (r32/cutoff are exempt)
    var best = {};
    raw.forEach(function (ev) {
      if (ev.teamCode == null || TEAM_PRIORITY[ev.type] == null) return;
      if (!best[ev.teamCode] || TEAM_PRIORITY[ev.type] < TEAM_PRIORITY[best[ev.teamCode].type]) best[ev.teamCode] = ev;
    });
    var out = raw.filter(function (ev) {
      return ev.teamCode == null || TEAM_PRIORITY[ev.type] == null || best[ev.teamCode] === ev;
    });
    out.sort(function (x, y) { return DRAMA_RANK[x.severity] - DRAMA_RANK[y.severity]; });
    return out;
  }

  return { wcOutcomeProbs: wcOutcomeProbs, wcGroupScenarios: wcGroupScenarios,
           wcThirdPlaceWatch: wcThirdPlaceWatch, wcProjectedSlot: wcProjectedSlot,
           wcProjections: wcProjections, wcPositionTables: wcPositionTables,
           wcQualSnapshot: wcQualSnapshot, wcDramaDiff: wcDramaDiff, wcDramaSentence: wcDramaSentence };
});
