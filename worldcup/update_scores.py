#!/usr/bin/env python3
"""
update_scores.py — pull World Cup 2026 results and write live-scores.json next to the
Hub's index.html, so the Hub can auto-fill standings & schedule.

  Hub  <--reads--  live-scores.json  <--writes--  this script  <--fetches--  a football API

PROVIDERS (auto-picked, in order):
  • ESPN         — the DEFAULT. FREE, NO KEY, NO SIGN-UP. Returns the whole 104-match
                   World Cup (schedule + live/final scores) in one request, and its team
                   abbreviations already match our kit codes. Unofficial but stable.
  • TheSportsDB  — automatic FALLBACK if ESPN is unreachable (free key "3"; sparse/laggy).
  • football-data.org — used INSTEAD if you provide a token (env FOOTBALL_DATA_TOKEN or a
                   token file). Richer/live data on paid plans (free tier often excludes the WC).

Output schema (all the Hub cares about):
  { "updated": "<ISO time>",
    "matches": [ { "home":"MEX", "away":"RSA", "hg":2, "ag":1, "status":"FT" },
                 { "home":"BIH", "away":"QAT", "hg":3, "ag":1, "status":"LIVE", "min":"67'" }, ... ] }
home/away are the kit's 3-letter codes (see TEAM map / data.js T{}). "min" (optional) is the
last known match clock for an in-play game ("67'", "45'+2'") — shown live on the hub.

USAGE
  python3 update_scores.py --self-test     # check team-mapping, no network
  python3 update_scores.py                 # fetch + write ./live-scores.json
  WC_SEASON=2022 python3 update_scores.py  # try a past season to prove it works
Then schedule it with cron (see README) and, in the Hub, open Settings → "Auto"
(or add ?scoremode=full to the URL).

NOTES
  • If no matches are available yet, nothing is written (the Hub stays in manual mode).
  • A free TheSportsDB patron key, or a football-data token, can be dropped in
    /etc/worldcup-token (or ~/.worldcup/football-data-token) to upgrade later.
  • Results map onto the kit's fixtures by team code, so data.js FIXTURES must match the
    real draw. If scores don't show up, reconcile data.js.
"""

import json, os, re, sys, datetime, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "live-scores.json")
SEASON = os.environ.get("WC_SEASON", "2026")

# ---- football-data.org (optional, needs a token) ----
def read_fd_token():
    t = os.environ.get("FOOTBALL_DATA_TOKEN", "").strip()
    if t:
        return t
    for p in [os.environ.get("FOOTBALL_DATA_TOKEN_FILE"), os.path.join(HERE, ".football-data-token"),
              os.path.expanduser("~/.worldcup/football-data-token"), "/etc/worldcup-token"]:
        if p and os.path.isfile(p):
            try:
                v = open(p, encoding="utf-8").read().strip()
                # treat a short value here as a football-data token; long public sportsdb keys excluded
                if v and not v.lower().startswith("tsdb:"):
                    return v
            except OSError:
                pass
    return ""

FD_TOKEN = read_fd_token()
# ---- ESPN (DEFAULT, free, NO key): the whole 104-match World Cup in one request,
# complete + current, and its team abbreviations already equal our kit codes. ----
ESPN_URL = ("https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/"
            "scoreboard?dates=%s0601-%s0720&limit=400")
# Per-match box score + key events (possession, shots, goals-with-scorer). Soft-fetched ONLY for
# in-play matches (a handful at once) so the live hero can show momentum/shots/scorers. Free, no key.
ESPN_SUMMARY_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=%s"
# ---- TheSportsDB (fallback only): "3" is the public test key; its free feed is
# sparse/laggy, so it's used just as a backstop if ESPN is unreachable. ----
TSDB_KEY = os.environ.get("THESPORTSDB_KEY", "3").strip() or "3"
TSDB_LEAGUE = "4429"  # FIFA World Cup

# API team name (lowercased) -> kit 3-letter code. Add aliases as needed.
TEAM = {
    "mexico": "MEX", "south africa": "RSA", "south korea": "KOR", "korea republic": "KOR", "czechia": "CZE", "czech republic": "CZE",
    "canada": "CAN", "switzerland": "SUI", "qatar": "QAT", "bosnia and herzegovina": "BIH", "bosnia & herzegovina": "BIH", "bosnia-herzegovina": "BIH",
    "brazil": "BRA", "morocco": "MAR", "haiti": "HAI", "scotland": "SCO",
    "united states": "USA", "usa": "USA", "paraguay": "PAR", "australia": "AUS", "turkey": "TUR", "türkiye": "TUR", "turkiye": "TUR",
    "germany": "GER", "curacao": "CUW", "curaçao": "CUW", "ivory coast": "CIV", "cote d'ivoire": "CIV", "côte d'ivoire": "CIV", "ecuador": "ECU",
    "netherlands": "NED", "japan": "JPN", "sweden": "SWE", "tunisia": "TUN",
    "belgium": "BEL", "egypt": "EGY", "iran": "IRN", "ir iran": "IRN", "new zealand": "NZL",
    "spain": "ESP", "cape verde": "CPV", "cabo verde": "CPV", "saudi arabia": "KSA", "uruguay": "URU",
    "france": "FRA", "senegal": "SEN", "iraq": "IRQ", "norway": "NOR",
    "argentina": "ARG", "algeria": "ALG", "austria": "AUT", "jordan": "JOR",
    "portugal": "POR", "dr congo": "COD", "congo dr": "COD", "democratic republic of congo": "COD", "uzbekistan": "UZB", "colombia": "COL",
    "england": "ENG", "croatia": "CRO", "ghana": "GHA", "panama": "PAN",
}

VALID_CODES = set(TEAM.values())   # our 48 kit 3-letter codes

def map_team(name):
    if not name:
        return None
    s = name.strip()
    if s.upper() in VALID_CODES:    # ESPN already hands us kit codes — pass through
        return s.upper()
    return TEAM.get(s.lower())      # TheSportsDB / football-data hand us full names

def _get(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        if e.code == 403:
            sys.exit("HTTP 403 from the scores API — this competition/plan isn't accessible. "
                     "(football-data's free tier often excludes the World Cup.) Try the default "
                     "TheSportsDB provider, or edit this script to point at a feed you can use.")
        if e.code == 429:
            sys.exit("HTTP 429 (rate limited). Run the cron less often — every 5 minutes is plenty.")
        sys.exit("HTTP %s: %s" % (e.code, e.reason))
    except urllib.error.URLError as e:
        sys.exit("Network error reaching the scores API: %s" % e.reason)

def _get_soft(url, headers=None):
    """Best-effort GET for supplementary feeds: return {} on any error rather than
    aborting the run. The primary feed still uses _get (which fails loudly)."""
    try:
        req = urllib.request.Request(url, headers=headers or {})
        with urllib.request.urlopen(req, timeout=25) as r:
            return json.load(r)
    except Exception:
        return {}

# ---- providers return a normalized list: {home,away,hg,ag,status} (names, not codes) ----
def fetch_footballdata():
    data = _get("https://api.football-data.org/v4/competitions/WC/matches", {"X-Auth-Token": FD_TOKEN})
    out = []
    for m in data.get("matches", []):
        s = (m.get("status") or "").upper()
        status = "FT" if s == "FINISHED" else "LIVE" if s == "IN_PLAY" else "HT" if s == "PAUSED" else ""
        sc = ((m.get("score") or {}).get("fullTime") or {})
        out.append({"home": (m.get("homeTeam") or {}).get("name"), "away": (m.get("awayTeam") or {}).get("name"),
                    "hg": sc.get("home"), "ag": sc.get("away"), "status": status})
    return out

_GOAL_SCORER_RE = re.compile(r"\.\s*([^.()]+?)\s*\(")  # "...Côte d'Ivoire 1. Nicolas Pépé (Côte..." -> name

def _espn_summary_stats(event_id, home_abbr, away_abbr):
    """In-game stats for ONE live match from ESPN's free summary endpoint. Returns only the keys
    that parse: poss/sh/sot as [home,away] (oriented to the passed abbrevs) and goals[] with
    {min,team,scorer}. Soft-fetched: any error -> {} and the hero degrades to scoreline only."""
    data = _get_soft(ESPN_SUMMARY_URL % event_id)
    if not data:
        return {}
    out = {}
    want = {"possessionPct": "poss", "totalShots": "sh", "shotsOnTarget": "sot", "shotsOnGoal": "sot"}
    by_abbr, idmap = {}, {}
    for t in ((data.get("boxscore") or {}).get("teams") or []):
        team = t.get("team") or {}
        abbr = (team.get("abbreviation") or "").upper()
        idmap[str(team.get("id"))] = abbr
        st = {}
        for s in (t.get("statistics") or []):
            key = want.get(s.get("name"))
            if key and key not in st:
                try:
                    st[key] = int(round(float(s.get("displayValue"))))
                except (TypeError, ValueError):
                    pass
        by_abbr[abbr] = st
    h, a = by_abbr.get((home_abbr or "").upper(), {}), by_abbr.get((away_abbr or "").upper(), {})
    for key in ("poss", "sh", "sot"):
        if key in h and key in a:
            out[key] = [h[key], a[key]]
    goals = []
    for ev in (data.get("keyEvents") or []):
        if not ev.get("scoringPlay"):
            continue
        code = idmap.get(str((ev.get("team") or {}).get("id")))
        mn = ((ev.get("clock") or {}).get("displayValue") or "").strip()
        m = _GOAL_SCORER_RE.search(ev.get("text") or "")
        scorer = m.group(1).strip() if m else None
        # Defensive: a real name is short and digit-free. If the text format drifts and the regex
        # grabs a phrase, drop it to None (shows a plain "Goal") rather than a garbage name.
        if scorer and (len(scorer) > 40 or any(ch.isdigit() for ch in scorer)):
            scorer = None
        goals.append({"min": mn, "team": code, "scorer": scorer})
    if goals:
        out["goals"] = goals
    return out

def fetch_espn():
    # ESPN's free hidden API returns the full FIFA World Cup schedule + live/final
    # scores. competitors carry homeAway + team.abbreviation (== our kit codes) + score;
    # status.type.state is pre|in|post. Soft-fetched so a blip falls back to TheSportsDB.
    data = _get_soft(ESPN_URL % (SEASON, SEASON))
    out = []
    for e in (data.get("events") or []):
        comp = (e.get("competitions") or [{}])[0]
        cs = comp.get("competitors") or []
        home = next((c for c in cs if c.get("homeAway") == "home"), None)
        away = next((c for c in cs if c.get("homeAway") == "away"), None)
        if not home or not away:
            continue
        st = ((e.get("status") or {}).get("type")) or {}
        state = st.get("state"); name = (st.get("name") or "").upper()
        sd = (st.get("shortDetail") or "").strip()   # the live clock ESPN shows: "67'", "HT", "FT"
        if state == "post" or st.get("completed"):
            status = "FT"
        elif state == "in":
            # ONLY the genuine halftime is HT — name is STATUS_FIRST_HALF / STATUS_HALFTIME /
            # STATUS_SECOND_HALF, so a substring "HALF" match would wrongly flag the 2nd half.
            status = "HT" if (name == "STATUS_HALFTIME" or sd.upper() in ("HT", "HALFTIME", "HALF TIME")) else "LIVE"
        else:
            status = ""   # pre / scheduled — no score yet
        def _sc(c):
            v = c.get("score")
            try:
                return int(v) if v not in (None, "") else None
            except (TypeError, ValueError):
                return None
        row = {"home": (home.get("team") or {}).get("abbreviation"),
               "away": (away.get("team") or {}).get("abbreviation"),
               "hg": _sc(home) if status else None,
               "ag": _sc(away) if status else None,
               "status": status}
        # the last known match minute for an in-play game (e.g. "67'") — shown live in the Hub
        if status in ("LIVE", "HT"):
            mn = sd or (((comp.get("status") or {}).get("displayClock") or "").strip())
            if mn:
                row["min"] = mn
            # enrich ONLY in-play matches with box-score + goals (one soft summary call each).
            eid = e.get("id")
            if eid:
                stats = _espn_summary_stats(eid, row["home"], row["away"])
                for k in ("poss", "sh", "sot", "goals"):
                    if k in stats:
                        row[k] = stats[k]
        out.append(row)
    return out

def _parse_tsdb_events(data):
    out = []
    for e in (data.get("events") or []):
        st = (e.get("strStatus") or e.get("strProgress") or "").upper()
        if st in ("MATCH FINISHED", "FT", "AET", "PEN", "FINISHED"):
            status = "FT"
        elif st in ("1H", "2H", "ET", "LIVE", "INPLAY", "IN PLAY"):
            status = "LIVE"
        elif st in ("HT", "HALF TIME", "HALFTIME"):
            status = "HT"
        else:
            status = ""
        hg = e.get("intHomeScore"); ag = e.get("intAwayScore")
        out.append({"home": e.get("strHomeTeam"), "away": e.get("strAwayTeam"),
                    "hg": int(hg) if (hg not in (None, "")) else None,
                    "ag": int(ag) if (ag not in (None, "")) else None, "status": status})
    return out

def fetch_thesportsdb():
    # TheSportsDB's per-season snapshot can lag badly (it has gone stale at the first
    # handful of fixtures while newer results were already live), so we MERGE three
    # feeds: the season list (primary, fails loudly) plus the league's recent-finished
    # and upcoming/in-play feeds (best-effort) to catch results the season list misses.
    base = "https://www.thesportsdb.com/api/v1/json/%s/" % TSDB_KEY
    rows = _parse_tsdb_events(_get(base + "eventsseason.php?id=%s&s=%s" % (TSDB_LEAGUE, SEASON)))
    for extra in ("eventspastleague.php?id=%s" % TSDB_LEAGUE,
                  "eventsnextleague.php?id=%s" % TSDB_LEAGUE):
        rows += _parse_tsdb_events(_get_soft(base + extra))
    return rows

STAT_KEYS = ("poss", "sh", "sot", "goals")   # optional in-game enrichments carried per-fixture

def _merge_pair(a, b):
    # b is the NEWER row (callers pass (stored, fresh)). Keep the more-advanced record as the base
    # (FT > LIVE > scheduled), with the newer winning ties so a fresh live score refreshes — but
    # UNION the in-game stat fields so a live match's possession/shots/goals survive when it goes FT
    # (the scoreboard FT row carries no stats). Goals: keep the longer (more complete) list.
    base, other = (b, a) if _rank(b) >= _rank(a) else (a, b)
    out = dict(base)
    for k in STAT_KEYS:
        if k not in out and k in other:
            out[k] = other[k]
    ga, gb = a.get("goals") or [], b.get("goals") or []
    if ga or gb:
        out["goals"] = ga if len(ga) >= len(gb) else gb
    return out

def _rank(item):
    # Prefer the richest record when the same fixture shows up in more than one feed
    # (or in a later run): a final score outranks an in-play score, then any score,
    # then an in-play status, then a bare/scheduled entry. Used for both per-run dedup
    # and the run-to-run accumulation merge, so a finished result is never downgraded.
    has_score = ("hg" in item and "ag" in item)
    st = item.get("status")
    if has_score and st == "FT":
        return 4
    if has_score and st in ("LIVE", "HT"):
        return 3
    if has_score:
        return 2
    if st in ("LIVE", "HT"):
        return 1
    return 0

def build(rows):
    # Dedup by the unordered team pair — World Cup sides meet at most once, and a
    # fixture can arrive from several feeds (sometimes home/away reversed). The Hub's
    # liveToResults re-orients goals against its own schedule, so either orientation is
    # fine; we just keep the most-complete record per pairing.
    best = {}
    for r in rows:
        home, away = map_team(r["home"]), map_team(r["away"])
        if not home or not away:
            continue
        item = {"home": home, "away": away, "status": r["status"]}
        if r.get("min"):
            item["min"] = r["min"]
        if r["hg"] is not None and r["ag"] is not None:
            item["hg"], item["ag"] = r["hg"], r["ag"]
        for k in STAT_KEYS:   # carry optional in-game stats (poss/sh/sot/goals) through unchanged
            if r.get(k) is not None:
                item[k] = r[k]
        key = frozenset((home, away))
        if key not in best or _rank(item) > _rank(best[key]):
            best[key] = item
    return list(best.values())

SAMPLE = [{"home": "Mexico", "away": "South Africa", "hg": 2, "ag": 1, "status": "FT"},
          {"home": "Korea Republic", "away": "Czechia", "hg": 1, "ag": 1, "status": "LIVE", "min": "67'",
           "poss": [58, 42], "sh": [9, 7], "sot": [4, 3],
           "goals": [{"min": "34'", "team": "KOR", "scorer": "Son Heung-min"}, {"min": "51'", "team": "CZE", "scorer": None}]},
          {"home": "Narnia", "away": "Atlantis", "hg": None, "ag": None, "status": ""}]

def _pair_key(m):
    # Group-stage sides meet once, so the unordered code pair identifies the fixture.
    return frozenset((m.get("home"), m.get("away")))

def load_existing():
    """Already-published matches (kit codes). We accumulate onto these so a finished
    result is never lost when the upstream feed drops it (TheSportsDB's free past/next
    feeds rotate matches out within minutes, and the season feed lags for hours)."""
    try:
        with open(OUT, encoding="utf-8") as f:
            return (json.load(f).get("matches") or [])
    except Exception:
        return []

def merge_existing(existing, fresh):
    # Union by fixture, keeping the richest record (a fresh row replaces a stored one
    # only when it is at least as advanced — so FT scores stick, in-play scores update,
    # and a momentarily-empty feed can't erase a known result). Insertion order is
    # preserved (dict keeps first-seen position) so standings stay stable.
    best = {}
    for m in list(existing) + list(fresh):
        k = _pair_key(m)
        if None in k:
            continue
        best[k] = _merge_pair(best[k], m) if k in best else m
    return list(best.values())

def write(matches):
    data = {"updated": datetime.datetime.now(datetime.timezone.utc).isoformat(), "matches": matches}
    tmp = OUT + ".tmp"
    with open(tmp, "w") as f:
        json.dump(data, f, indent=2)
    os.replace(tmp, OUT)
    print("Wrote %d matches to %s" % (len(matches), OUT))

def main():
    if "--self-test" in sys.argv:
        print(json.dumps({"updated": "SELF-TEST", "matches": build(SAMPLE)}, indent=2)); return
    if FD_TOKEN:
        provider, rows = "football-data.org", fetch_footballdata()
    else:
        provider, rows = "ESPN (free)", fetch_espn()
        if not rows:   # ESPN unreachable/empty — fall back to TheSportsDB's feeds
            provider, rows = "TheSportsDB (free, fallback)", fetch_thesportsdb()
    matches = build(rows)
    played = [m for m in matches if ("hg" in m) or m.get("status") in ("LIVE", "HT")]
    # Accumulate onto what's already published so a transient gap in the upstream feed
    # never wipes a known result (the freeze/flicker we kept seeing). New finished/live
    # scores still upgrade their fixture in place.
    merged = merge_existing(load_existing(), played)
    if not merged:
        print("No played/live World Cup matches yet from %s (season %s) — nothing written; the Hub "
              "stays in manual mode until games kick off." % (provider, SEASON)); return
    print("This run saw %d played/live match(es); merged total now %d." % (len(played), len(merged)))
    write(merged)

if __name__ == "__main__":
    main()
