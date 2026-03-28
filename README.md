# Misfits Loadout
### Field Terminal — Intergalactic Cargo Inc.

A mobile-first companion app for **The Misfits**, a Fate Core tabletop RPG campaign. Built for use at the table on your phone — no internet required once loaded.

> *"Legitimate cargo haulers. Definitely."*

---

## What it does

A character sheet app for three crew members of the freight vessel *Harry the Hauler*, built around a custom Fate Core ruleset. Designed to replace paper sheets at the table with something that looks like it belongs in the world.

**Login screen**
- Animated star field with occasional ship flyby
- Frosted glass character select cards
- Skull logo with glow and static flicker effect

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
- 10 randomised logout flavor texts
- Session state persists via localStorage
- New session / reset confirmation dialogs

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
index.html          — app shell
style.css           — all styles
app.js              — all logic and rendering
data.js             — character data, icons, SVGs

logo.svg            — login screen skull logo
cap_portrait.svg    — Cap character portrait
howard_portrait.svg — Howard character portrait
thowra_portrait.svg — Thowra character portrait
fate_point.svg      — fate point icon
bones.svg           — physical stress icon
brain.svg           — mental stress icon
omega.svg           — corruption clock icon
```

---

## Tech

Plain HTML, CSS and vanilla JavaScript. No framework, no build step, no dependencies. Works as a local file or hosted on GitHub Pages.

State is saved to `localStorage` per character — stress, fate points, consequences, moves and session log all persist between sessions.

---

## Live

[sramatlov.github.io/misfits-loadout](https://sramatlov.github.io/misfits-loadout)

---

## Campaign

*A Space Oddity* is a Fate Core sci-fi campaign. The crew operates under the front of Intergalactic Cargo Inc. Tone: irreverent humor with genuine emotional weight. Think Firefly, but with more paperwork violations.

Built and maintained for private use at the table. Not affiliated with Evil Hat Productions.
