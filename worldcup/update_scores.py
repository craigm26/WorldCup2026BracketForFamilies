#!/usr/bin/env python3
"""
update_scores.py — pull live World Cup 2026 results and write live-scores.json
next to the Hub's index.html, so the Hub can auto-fill standings & schedule.

HOW IT WORKS
  Hub  <--reads--  live-scores.json  <--writes--  this script  <--fetches--  a football API

This example uses football-data.org (free tier, needs a free API token).
You can swap in any provider — the Hub only cares about the OUTPUT schema:

  { "updated": "<ISO time>",
    "matches": [ { "home":"MEX", "away":"RSA", "hg":2, "ag":1, "status":"FT" }, ... ] }

home/away are the kit's 3-letter codes (see TEAM map below / data.js T{}).

SETUP (on the Pi)
  1) Get a free token at https://www.football-data.org/client/register
  2) Give the script the token ONE of these ways (it checks them in order):
       - env:   export FOOTBALL_DATA_TOKEN=your_token_here
       - file:  put it in   ~/.worldcup/football-data-token   (or /etc/worldcup-token,
                or .football-data-token next to this script, or $FOOTBALL_DATA_TOKEN_FILE)
     A token file keeps the secret out of your crontab.
  3) Test the mapping with no network:   python3 update_scores.py --self-test
  4) Run it for real:                    python3 update_scores.py     # writes ./live-scores.json
  5) Schedule it every few minutes with cron (see README), then in the Hub open
     Settings → "Auto" (or add ?scoremode=full to the URL) so it reads the scores.

No token? The script is a harmless no-op (so a cron can sit idle until you add one),
and the Hub stays in manual mode. If the World Cup isn't on your provider/plan, edit
fetch_matches() to point at your feed and keep map_team()/the output schema.

NOTE: live results map onto the kit's fixtures by team code, so the groups/fixtures in
data.js must match the real draw. If scores don't show up, reconcile data.js FIXTURES.
"""

import json, os, sys, datetime, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "live-scores.json")
COMPETITION = "WC"  # football-data.org code for the FIFA World Cup


def read_token():
    """Token from env, or the first token file that exists (keeps secrets out of cron)."""
    t = os.environ.get("FOOTBALL_DATA_TOKEN", "").strip()
    if t:
        return t
    candidates = [
        os.environ.get("FOOTBALL_DATA_TOKEN_FILE"),
        os.path.join(HERE, ".football-data-token"),
        os.path.expanduser("~/.worldcup/football-data-token"),
        "/etc/worldcup-token",
    ]
    for p in candidates:
        if p and os.path.isfile(p):
            try:
                v = open(p, encoding="utf-8").read().strip()
                if v:
                    return v
            except OSError:
                pass
    return ""


TOKEN = read_token()

# API team name (lowercased) -> kit 3-letter code. Add aliases as needed.
TEAM = {
    "mexico": "MEX", "south africa": "RSA", "south korea": "KOR", "korea republic": "KOR", "czechia": "CZE", "czech republic": "CZE",
    "canada": "CAN", "switzerland": "SUI", "qatar": "QAT", "bosnia and herzegovina": "BIH", "bosnia & herzegovina": "BIH",
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
    if not name:
        return None
    return TEAM.get(name.strip().lower())


def status_of(api_status):
    s = (api_status or "").upper()
    if s in ("FINISHED",):
        return "FT"
    if s in ("IN_PLAY",):
        return "LIVE"
    if s in ("PAUSED",):
        return "HT"
    return ""  # TIMED / SCHEDULED / POSTPONED -> no score yet


def fetch_matches():
    url = "https://api.football-data.org/v4/competitions/%s/matches" % COMPETITION
    req = urllib.request.Request(url, headers={"X-Auth-Token": TOKEN})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.load(r).get("matches", [])
    except urllib.error.HTTPError as e:
        if e.code == 403:
            sys.exit("football-data.org HTTP 403: the World Cup competition isn't on your plan. "
                     "The free tier often excludes it — upgrade your plan, or edit fetch_matches() "
                     "to point at a feed you do have access to (keep the output schema).")
        if e.code == 429:
            sys.exit("football-data.org HTTP 429 (rate limited). Run the cron less often — every 5 minutes is plenty.")
        sys.exit("football-data.org HTTP %s: %s" % (e.code, e.reason))
    except urllib.error.URLError as e:
        sys.exit("Network error reaching football-data.org: %s" % e.reason)


def build(api_matches):
    out = []
    for m in api_matches:
        home = map_team((m.get("homeTeam") or {}).get("name"))
        away = map_team((m.get("awayTeam") or {}).get("name"))
        if not home or not away:
            continue
        score = ((m.get("score") or {}).get("fullTime") or {})
        hg, ag = score.get("home"), score.get("away")
        item = {"home": home, "away": away, "status": status_of(m.get("status"))}
        if hg is not None and ag is not None:
            item["hg"], item["ag"] = hg, ag
        out.append(item)
    return out


def write(matches):
    data = {"updated": datetime.datetime.now(datetime.timezone.utc).isoformat(), "matches": matches}
    tmp = OUT + ".tmp"
    with open(tmp, "w") as f:
        json.dump(data, f, indent=2)
    os.replace(tmp, OUT)  # atomic
    print("Wrote %d matches to %s" % (len(matches), OUT))


# A tiny offline sample so you can verify team-mapping with: python3 update_scores.py --self-test
SAMPLE = [
    {"homeTeam": {"name": "Mexico"}, "awayTeam": {"name": "South Africa"}, "status": "FINISHED", "score": {"fullTime": {"home": 2, "away": 1}}},
    {"homeTeam": {"name": "Korea Republic"}, "awayTeam": {"name": "Czechia"}, "status": "IN_PLAY", "score": {"fullTime": {"home": 1, "away": 1}}},
    {"homeTeam": {"name": "Narnia"}, "awayTeam": {"name": "Atlantis"}, "status": "TIMED", "score": {"fullTime": {"home": None, "away": None}}},
]


def main():
    if "--self-test" in sys.argv:
        print(json.dumps({"updated": "SELF-TEST", "matches": build(SAMPLE)}, indent=2))
        return
    if not TOKEN:
        print("No FOOTBALL_DATA_TOKEN found (env or token file) — nothing to do. "
              "Add a free token (see this file's header) to turn on live scores; "
              "until then the Hub stays in manual mode.")
        return  # exit 0 — a cron can sit idle harmlessly until a token is added
    write(build(fetch_matches()))


if __name__ == "__main__":
    main()
