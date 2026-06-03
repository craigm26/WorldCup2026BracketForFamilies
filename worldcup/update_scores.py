#!/usr/bin/env python3
"""
update_scores.py — pull live World Cup 2026 results and write live-scores.json
next to the Hub's index.html, so the Hub auto-fills standings & schedule.

HOW IT WORKS
  Hub  <--reads--  live-scores.json  <--writes--  this script  <--fetches--  a football API

This example uses football-data.org (free tier, needs a free API token).
You can swap in any provider — the Hub only cares about the OUTPUT schema:

  { "updated": "<ISO time>",
    "matches": [ { "home":"MEX", "away":"RSA", "hg":2, "ag":1, "status":"FT" }, ... ] }

home/away are the kit's 3-letter codes (see TEAM map below / data.js T{}).

SETUP (on the Pi)
  1) Get a free token at https://www.football-data.org/client/register
  2) export FOOTBALL_DATA_TOKEN=your_token_here
  3) python3 update_scores.py            # writes ./live-scores.json
  4) Schedule it every couple minutes with cron (see README).

If the World Cup competition isn't on your plan/provider, edit fetch_matches()
to point at whatever feed you use, and keep map_team()/the output schema.
"""

import json, os, sys, datetime, urllib.request

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "live-scores.json")
TOKEN = os.environ.get("FOOTBALL_DATA_TOKEN", "")
COMPETITION = "WC"  # football-data.org code for the FIFA World Cup

# API team name (lowercased) -> kit 3-letter code. Add aliases as needed.
TEAM = {
    "mexico":"MEX","south africa":"RSA","south korea":"KOR","korea republic":"KOR","czechia":"CZE","czech republic":"CZE",
    "canada":"CAN","switzerland":"SUI","qatar":"QAT","bosnia and herzegovina":"BIH","bosnia & herzegovina":"BIH",
    "brazil":"BRA","morocco":"MAR","haiti":"HAI","scotland":"SCO",
    "united states":"USA","usa":"USA","paraguay":"PAR","australia":"AUS","turkey":"TUR","türkiye":"TUR","turkiye":"TUR",
    "germany":"GER","curacao":"CUW","curaçao":"CUW","ivory coast":"CIV","cote d'ivoire":"CIV","côte d'ivoire":"CIV","ecuador":"ECU",
    "netherlands":"NED","japan":"JPN","sweden":"SWE","tunisia":"TUN",
    "belgium":"BEL","egypt":"EGY","iran":"IRN","ir iran":"IRN","new zealand":"NZL",
    "spain":"ESP","cape verde":"CPV","cabo verde":"CPV","saudi arabia":"KSA","uruguay":"URU",
    "france":"FRA","senegal":"SEN","iraq":"IRQ","norway":"NOR",
    "argentina":"ARG","algeria":"ALG","austria":"AUT","jordan":"JOR",
    "portugal":"POR","dr congo":"COD","congo dr":"COD","democratic republic of congo":"COD","uzbekistan":"UZB","colombia":"COL",
    "england":"ENG","croatia":"CRO","ghana":"GHA","panama":"PAN",
}

def map_team(name):
    if not name:
        return None
    return TEAM.get(name.strip().lower())

def status_of(api_status):
    s = (api_status or "").upper()
    if s in ("FINISHED",):           return "FT"
    if s in ("IN_PLAY",):            return "LIVE"
    if s in ("PAUSED",):             return "HT"
    return ""  # TIMED / SCHEDULED / POSTPONED -> no score yet

def fetch_matches():
    if not TOKEN:
        sys.exit("Set FOOTBALL_DATA_TOKEN first (see header).")
    url = "https://api.football-data.org/v4/competitions/%s/matches" % COMPETITION
    req = urllib.request.Request(url, headers={"X-Auth-Token": TOKEN})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r).get("matches", [])

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

def main():
    matches = build(fetch_matches())
    data = {"updated": datetime.datetime.now(datetime.timezone.utc).isoformat(), "matches": matches}
    tmp = OUT + ".tmp"
    with open(tmp, "w") as f:
        json.dump(data, f, indent=2)
    os.replace(tmp, OUT)  # atomic
    print("Wrote %d matches to %s" % (len(matches), OUT))

if __name__ == "__main__":
    main()
