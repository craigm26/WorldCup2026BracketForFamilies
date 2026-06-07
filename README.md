# 🏆 World Cup 2026 — Family Bracket & Hub

A two-part family kit for the **2026 FIFA World Cup** (June 11 – July 19, 2026 · hosted by 🇨🇦 Canada · 🇲🇽 Mexico · 🇺🇸 USA):

1. **🖨️ Print it** — a giant wall bracket, a print-at-home version, and cut-out flags you fill in by hand. **Color *or* black & white** for any printer.
2. **📺 Host it** — a self-contained interactive **Hub** you serve from any computer (a Raspberry Pi, an old laptop, anything) so the whole family can poke at it on the TV: fillable bracket, live-or-manual standings, a schedule **in your own time zone**, where-to-watch, and rotating kid-friendly country facts.

The printed poster has a **QR code** that opens the Hub. Set it up once, and the bracket on your wall and the screen in your living room stay in sync with your family's picks.

> ▶ **Try it live (no setup):** **https://craigm26.github.io/WorldCup2026BracketForFamilies/**

![World Cup 2026 family bracket poster](screenshots/poster-color.png)

> Everything is plain static HTML/JS — **no build step, no database, no account, no tracking.** Print what you want, host what you want, all from one folder.

---

## 🖨️ Option 1 — Print the bracket, info & flags

Open any of these in a browser and hit **Print / Save PDF**. Every one has a **⬛ Black & white** button in the corner — tap it for a clean, ink-light version that prints perfectly on a non-color (mono) printer.

| File | What it is | How to print |
|---|---|---|
| **World Cup 2026 Bracket.html** | The giant **36 × 24 in** wall poster — full knockout bracket (with every match's number, date, venue & feeders), all 12 groups, stadium map, fun facts, tiebreak rules, and the Hub QR code. A **Tweaks** panel lets you recolor it, retitle it, and set the QR link. | Open → (optional **⬛ Black & white**) → **Print / Save PDF** → take the PDF to any print/blueprint shop (engineering plotters do this size cheaply). |
| **Bracket - Print at Home.html** | The same bracket as **11 letter-size landscape pages** that tape together into a big wall display. | Open → (optional **⬛ Black & white**) → **Print** all 11 pages (landscape) on a normal printer → trim & tape. |
| **Flag Cutouts.html** | Sheets of all 48 team flags with dashed cut-lines — fill the bracket as teams advance. | Open → **Print** (color recommended) → make a few copies → cut along the dashed lines. |

| Color | Black & white (ink-saver) |
|---|---|
| ![poster colour](screenshots/poster-color.png) | ![poster black and white](screenshots/poster-bw.png) |

**Color or black & white?** Color looks great, but the dark poster uses a lot of ink/toner. The **⬛ Black & white** mode turns the sheet **white with grayscale art and dark text** — easy to read and far cheaper on any printer. The bracket, group tables, tiebreak rules, map, and facts all stay legible.

> **Time-zone helper for print:** the poster and print-at-home pages tell faraway family how to convert kick-off times from U.S. Eastern (e.g. London +5h, Tokyo +13h).

---

## 📺 Option 2 — Host the interactive Hub

The **Hub** is what the QR code opens — a touch/remote-friendly app for the TV or any phone. It has nine tabs:

| Tab | What it does |
|---|---|
| 🏠 **Home** | A live **countdown to the next kick-off** (in your time zone), today's games with a LIVE-now flag, your favorite team's next match, and the **Family Pick'em** leaderboard + player switcher. |
| 🗂️ **Bracket** | Tap any slot to drop in a team; crown a champion. Empty slots show their **feeders** ("Winner Group A", "Runner-up B", "3rd-place", "Winner of Match 74") and each match shows its **number, date & host city** — just like the wall chart. |
| 📊 **Standings** | Type scores (or let them fill automatically) — points, goal difference & 2026 tiebreakers update live. |
| 📅 **Schedule** | Every match with a **kick-off time in YOUR time zone**, a 🌞/🌙 **day-or-night** icon (so you know what's on past bedtime), and a kid-friendly time-zone lesson. |
| 📺 **Watch** | Where & how to watch in the US, Canada, Mexico & the rest of the world — including the **free** options — plus kick-off windows converted to your zone. |
| 🌍 **Map & Facts** | An accurate host-city map (tap a pin for the stadium) and a country explorer with **rotating, kid-friendly facts** — tap **☆ Follow** to track your team. |
| 🎮 **Play** | A flag / country / food **quiz game** for the kids — score, streak and best, with a fun fact after every answer. |
| 🎟️ **Stickers** | Track each family member's **Panini WC2026** album with full page-by-page fidelity — tap to mark Have / Need / doubles, then the **Trade Matcher** shows exactly who can swap what. Scan stickers or whole pages with the phone camera (manual entry always works). |
| ⚙️ **Settings** | Choose how scores update — **Manual** (type your own, no spoilers), **Semi-auto** (update when *you* press the button), or **Auto** — plus an auto-fill-the-bracket helper and the time-zone picker. |

> **Family Pick'em:** add a player for each family member (Mom, Dad, each kid), and everyone keeps their own bracket. The Home leaderboard scores how many of the 32 qualifiers each person predicted — a friendly, spoiler-safe family competition that updates as real results come in.

> **Plus:** ⏰ an idle **screensaver / attract mode** (countdown, flags, facts & upcoming games — touch to wake); 📅 **add-to-calendar** (`.ics`) for the whole schedule or just your team's games; and 📤 **share your bracket by QR** — scan to open someone's exact picks on a phone. A kiosk can boot straight into auto-scores with `?scoremode=full`.

| Home — countdown & Pick'em | Bracket — with feeders | Map & Facts |
|---|---|---|
| ![hub home](screenshots/hub-home.png) | ![hub bracket](screenshots/hub-bracket.png) | ![hub facts](screenshots/hub-facts.png) |
| **Schedule — your time zone** | **Watch — incl. free** | **Play — quiz game** |
| ![hub schedule](screenshots/hub-schedule.png) | ![hub watch](screenshots/hub-watch.png) | ![hub play](screenshots/hub-play.png) |
| **Standings** | **Settings** | |
| ![hub standings](screenshots/hub-standings.png) | ![hub settings](screenshots/hub-settings.png) | |

> **Try the demo:** open the Hub with `?demo=1` (e.g. `index.html?demo=1`) to see a fully-filled example bracket and standings. Add `&tab=facts` to jump straight to a tab.

### Quick deploy (any web server)

The Hub is **plain static files**. To serve it at `http://<your-host>/worldcup/`:

```bash
# copy the worldcup/ folder into your web root, e.g. for nginx/Apache/Caddy:
scp -r worldcup you@your-host:/var/www/html/
```

Then visit `http://<your-host>/worldcup/`. That's it — `index.html` inside the folder *is* the Hub.

**No web server yet?** The simplest option (one binary, auto-starts on boot):

```bash
sudo apt install caddy
echo "your-host.local {
    root * /var/www/html
    file_server
}" | sudo tee /etc/caddy/Caddyfile
sudo systemctl restart caddy
```

…or for a quick test with nothing to install: `cd /var/www/html && python3 -m http.server 80`.

### 🌐 Make it work offline (recommended for a living-room TV)

By default the Hub loads React, the map, fonts, and flags from the internet. To make it run **with zero internet** — robust on a flaky connection, and cheap to set up anywhere — run this **once while the host still has internet**:

```bash
cd /var/www/html/worldcup
bash make-offline.sh
```

It downloads every library, the map geometry, all 48 flags, **and the Fredoka font** into local folders and rewrites the HTML to use them (originals saved as `*.html.bak`). After that the Hub runs fully offline. *(Only genuinely live data — optional live scores — ever touches the network.)*

### 🔗 Add the Hub to your home page

Open **`worldcup/home-page-card.html`**, copy the snippet, and paste it into your family home page next to your other cards. It's a self-contained button that links to `/worldcup/`. (On the Merry household Pi-NAS, the home page also shows a QR card so anyone can scan straight to it.)

### 📱 Point the poster's QR code at your Hub

The poster's QR defaults to `http://pi-nas.local/worldcup`. If your address is different, open **World Cup 2026 Bracket.html**, turn on **Tweaks**, edit **"QR / NAS link"**, and re-print.

### 📺 Kiosk mode (TV boots straight into the Hub)

```bash
chromium --kiosk --noerrdialogs --disable-infobars "http://<your-host>/worldcup/"
```

Navigate with **← →** arrow keys or number keys **1–6**, or any remote/air-mouse.

---

## ⚙️ Optional extras

### Live scores
The Hub auto-fills standings & the schedule from a `live-scores.json` file next to `index.html`. A ready-to-use updater is included — **`update_scores.py`** (needs a free [football-data.org](https://www.football-data.org/client/register) token, kept in an environment variable, never committed). See the script header. With **Settings → Semi-auto**, scores stay hidden until you press *Update now* — perfect if you record games and hate spoilers.

### Customizing
- **Teams / groups / fixtures / facts:** `worldcup/data.js`
- **Knockout bracket (venues, dates, feeders):** `worldcup/data.js` (`KO_M` / `KO_LAYOUT`)
- **Where-to-watch channels & kick-off windows:** `worldcup/hub-data.js`
- **Time zones offered in the picker:** `worldcup/hub-data.js` (`WCTZ.ZONES`)
- **Poster look** (theme, accent, tagline, QR link, show/hide panels): the **Tweaks** panel on the poster.

The groups & fixtures follow the official 2026 draw/schedule; the knockout skeleton (match #, venue, date, ET kick-off, and which group-finisher feeds each slot) is the official, published bracket — the *teams* fill in as the tournament is played. Edit `data.js` to adjust anything.

---

## 📁 What's in the kit

```
worldcup/
  index.html                  ← the interactive Hub (open this / deploy this)
  World Cup 2026 Bracket.html  ← 36×24" poster (color + B&W)
  Bracket - Print at Home.html ← 11-page tape-together bracket (color + B&W)
  Flag Cutouts.html            ← printable flags
  home-page-card.html          ← copy-paste card for your home page
  data.js  hub-data.js  *.jsx  ← teams, fixtures, knockout, facts, time zones, components
  make-offline.sh              ← vendor everything for offline use
  update_scores.py             ← optional live-scores updater
  live-scores.example.json     ← live-scores format
```

---

*Published by **Craig Merry** · Designed with **Anthropic Claude** Design.*
*A family project — print it, host it, and enjoy the tournament! ⚽*
