# Misfits Loadout
### Field Terminal — Intergalactic Cargo Inc.

A mobile-first companion app for **The Misfits**, a Fate Core tabletop RPG campaign. Built for use at the table on your phone.

> *"Legitimate cargo haulers. Definitely."*

---

## What it does

A character sheet app for three crew members of the freight vessel *Harry the Hauler*, built around a custom Fate Core ruleset. Designed to replace paper sheets at the table with something that looks like it belongs in the world.

**Login screen**
- Animated star field with occasional ship flyby
- Frosted glass character select cards
- Skull logo with glow and static flicker effect
- Boot loading screen with live sync on startup

**Character screens**
- Fate Points with custom SVG icon — tap to spend or gain
- Physical and mental stress tracks with custom icons
- Howard's Omega Element corruption clock
- Consequences, aspects, skills, moves and stunts
- Session log
- GM Reference panel
- Full four-action outcome matrix

**Per-character theming**
- Cap Sparks — hot exhaust orange `#c45838`
- Howard "Clank" — warm amber `#c4a038`
- Thowra Frostwhisper — plasma blue `#38a8c4`

**Details**
- Maxed stress triggers icon shake animation
- Circuit board animation on the logout screen
- 10 randomised logout flavour texts
- Session state persists via localStorage (FP, stress, moves, log)
- New session / reset confirmation dialogs
- End session report showing FP, stress, corruption and consequence changes

---

## Data sync

Character sheet data lives in Google Sheets and is always fetched live on load — no cache.

- **PC data** (`PC_app` tab) — fetched via Google Apps Script for real-time accuracy
- **Best/Teamwork data** (`Best_app` tab) — fetched via published CSV in the background
- **Sync Data** button forces a fresh fetch and clears session state

The Apps Script URL is in `sheets.js`. If the sheet structure changes, update the field keys there.

---

## House rules

This app implements a custom Fate Core skill set:

| Rule | Change |
|---|---|
| Notice | Replaced by **Survival** |
| Will | Willpower only — intelligence checks use highest Academics skill |
| Gunnery | Removed — use Engineering (knowledge) or Shoot (operation) |
| Assets | Group skill |
| Teamwork | Must be narratively justified |

---

## Characters

**Montgomery "Cap" Sparks** — Belatelgeusian ex-Space Marine turned smuggler. Hits first, asks questions when legally required.

**Howard "Clank"** — Terrai bioengineer. Brilliant, reckless, increasingly compromised by Omega Element exposure.

**Thowra Frostwhisper** — Alien-DNA hybrid with psychic abilities. Origin unclear. Motivations: spite.

---

## File structure

```
index.html    — app shell and all HTML
style.css     — all styles
app.js        — all logic and rendering
data.js       — character data, game rules, SVG icons (portraits, FP, stress, corruption)
sheets.js     — Google Sheets sync (Apps Script + CSV fetching, data application)
```

---

## Tech

Plain HTML, CSS and vanilla JavaScript. No framework, no build step, no dependencies. Works as a local file or hosted on GitHub Pages.

Session state is saved to `localStorage` per character — stress, fate points, consequences, moves and session log persist between page loads. Sheet data (skills, aspects, stunts, refresh, stress counts) always comes from Google Sheets.

---

## Live

[sramatlov.github.io/misfits-loadout](https://sramatlov.github.io/misfits-loadout)

---

## Campaign

*A Space Oddity* is a Fate Core sci-fi campaign. The crew operates under the front of Intergalactic Cargo Inc. Tone: irreverent humour with genuine emotional weight. Think Firefly, but with more paperwork violations.

Built and maintained for private use at the table. Not affiliated with Evil Hat Productions.
