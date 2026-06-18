#!/usr/bin/env python3
"""
update_scores.py — pull World Cup 2026 results and write live-scores.json next to the
Hub's index.html, so the Hub can auto-fill standings & schedule.

  Hub  <--reads--  live-scores.json  <--writes--  this script  <--fetches--  a football API

TWO PROVIDERS (auto-picked):
  • TheSportsDB  — the DEFAULT. FREE, NO SIGN-UP: it ships with the public test key "3".
                   Nothing to configure — it just works (once the 2026 fixtures are loaded).
  • football-data.org — used instead IF you provide a token (env FOOTBALL_DATA_TOKEN or a
                   token file). Richer/live data on paid plans.

Output schema (all the Hub cares about):
  { "updated": "<ISO time>",
    "matches": [ { "home":"MEX", "away":"RSA", "hg":2, "ag":1, "status":"FT" }, ... ] }
home/away are the kit's 3-letter codes (see TEAM map / data.js T{}).

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

import json, os, sys, datetime, urllib.request, urllib.error

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
# ---- TheSportsDB (default, free, no sign-up). "3" is the public test key. ----
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

def map_team(name):
    return TEAM.get((name or "").strip().lower())

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

def _rank(item):
    # Prefer the richest record when the same fixture shows up in more than one feed:
    # a final score beats an in-play status, which beats a bare/scheduled entry.
    if "hg" in item:
        return 3
    if item.get("status") in ("LIVE", "HT"):
        return 2
    return 1

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
        if r["hg"] is not None and r["ag"] is not None:
            item["hg"], item["ag"] = r["hg"], r["ag"]
        key = frozenset((home, away))
        if key not in best or _rank(item) > _rank(best[key]):
            best[key] = item
    return list(best.values())

SAMPLE = [{"home": "Mexico", "away": "South Africa", "hg": 2, "ag": 1, "status": "FT"},
          {"home": "Korea Republic", "away": "Czechia", "hg": 1, "ag": 1, "status": "LIVE"},
          {"home": "Narnia", "away": "Atlantis", "hg": None, "ag": None, "status": ""}]

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
        provider, rows = "TheSportsDB (free)", fetch_thesportsdb()
    matches = build(rows)
    played = [m for m in matches if ("hg" in m) or m.get("status") in ("LIVE", "HT")]
    if not played:
        print("No played/live World Cup matches yet from %s (season %s) — nothing written; the Hub "
              "stays in manual mode until games kick off." % (provider, SEASON)); return
    write(played)

if __name__ == "__main__":
    main()
