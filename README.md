# عبود الصقّار · Abood the Falconer

A long game in the Abood & Mozah family about Emirati falconry (القنص). Abood learns from Baba: he trains a falcon,
hunts in season with a licence, cares for the bird through the year, and breeds falcons whose genes can be read as
pairs of beads. It teaches the culture, the law and the conservation story as it goes, in Arabic first and English.

Childhood era, set in a present-day Emirati winter. Built with the family skill (`abood-skill/abood-games`): same
sticker cards, same font, same red verb, same pretend dirhams, drawn in code, offline, kid-safe.

**Status: the first-years slice (milestones M0–M5 of the plan).** About two hours of play: Baba's first lesson with the
lure, hare and sandgrouse hunts at Remah, the mews, the market, Baba's majlis, missions and badges, and a first clutch
from pairing to a chosen chick. The long game (full breeding, selling, rivals, races, more falcons, quarry and regions,
friend codes on screen) is designed and not built yet; see "What is not here yet".

## Run it

```bash
python3 tools/serve.py 8018
```

Then open http://127.0.0.1:8018 . The published game is at https://mja-py.github.io/abood-falconry/ . The dev server only adds "do not cache", so a reload always runs the code on disk.
There is no build step. The service worker is off on localhost (add `?sw=1` to test it).

## Check it

```bash
npm test
```
```bash
npm run check
```
```bash
npm run balance -- --assert
```

- `npm test`: 27 node tests of the rules (inheritance ratios, inbreeding coefficients, odds shown vs eggs laid, the
  hunt's determinism and its cannot-fail tier, the calendar, care, breeding, shop, missions, save repair, friend codes).
- `npm run check`: the rules stay pure (`check-imports`), every string exists in both languages with no symbol glyphs
  (`check-i18n`), every fact has a source (`check-facts`), the offline file list is complete (`check-sw`).
- `npm run balance`: plays hundreds of whole careers on the real rules and reports hours, dirhams and catch rates.
- The family linter: `bash <skill>/scripts/check-theme.sh .` (0 failures).
- `./deploy.sh` runs the tests and checks first and refuses to publish if any fail.

In the browser console, `window.__game.debug` drives the game without playing: `start(place, { quarry })`,
`step(dt, n)`, `bot(true, skill)`, `next()`, `weeks(n)`, `sheet(kind, params)`, `lang('en')`, `girl(true)`, `info()`,
`audit()` (lists anything that scrolls, leaves the screen or carries a symbol on a button), `still()` (animations off)
and `awake()` (keep running in a hidden tab).

## How it plays

- **One outing is one week.** Time moves only when the player plays. A year is 48 weeks: hunting (16), races and market
  (8), breeding (12), the moult (12). Nothing waits on a clock and nothing nags.
- **The hunt:** walk until the quarry is spotted, take the hood off, time the cast, lift the falcon above the quarry
  (drag up), stoop, and press when the white ring is inside the gold one. A catch is a puff of dust and a few feathers.
  The lure at the training ground cannot be failed.
- **The falcon:** trust, weight (ration light / normal / full), health, feathers. Training raises what it can do, up
  to what its genes allow. It moults in summer and rests.
- **Beads:** ten traits of four bead pairs each, a colour series where the darker bead shows, nine rare genes (Barq is
  the first; Baba's hen and Abood's own falcon carry it). The pairing screen shows the odds before the eggs are laid,
  from the same rules that lay them. This is a game model of inheritance, and the Book says so.
- **Dirhams** are in-game only. Numbers are about a hundred times the other Abood games, and the shop says so.

## How it is built

```
index.html, css/theme.css     the family shell; this game's styles are appended at the end of the theme
js/game.js                    boot, loop, the camp menu, outings, input, the debug API
js/ui.js, js/ui/*             DOM glue; one file per hub (mews, breed, market, book and majlis, missions and falconer)
js/scenes/hunt.js             draws the hunt
js/art.js, js/art/*           people, the parametric falcon (every bird drawn from its genome), the desert
js/sim/*                      the rules: pure, seeded, no DOM, tested in node
js/data/*                     tables: loci and species, quarry, names, fact ids
js/i18n.js, js/i18n/*         strings (Arabic first, Mozah's twins) and the fact cards
content/facts-ledger.json     every fact with its source and status
tools/, test/                 dev only, never deployed
```

Departures from the family skill, all deliberate: an economy sized for a very long game instead of about two months;
a 960-wide play field and no scrolling anywhere (as Abood Space does now); six hub tiles (Mews, Breeding, Market,
Races, Falconer's Book, Missions) with wardrobe, shop, badges and how-to-play inside them; many small modules and
real tests.

## Facts

39 fact cards and 18 majlis questions, every one marked verified: its source page was read and says what the card
says. A second read of ten of them on 20 November 2026 corrected three figures (the release programme's total, the
race time, and the school's location) and softened two cards whose sources were unclear. Five more facts are held
back in the ledger until a better source is found. `node tools/check-facts.mjs --release` passes only while every
shipped fact is verified. Arabic falconry terms beyond the ones in the Book should be reviewed by a falconer or a
heritage body before more are added.

## What is not here yet

Selling falcons and the simulated market, rivals, the 400 m race and the beauty contest, peregrine / gyr / wakri and
hybrids in play (the genetics and drawing already support them), more quarry and regions, training mini-games beyond
the lure, friend codes on screen (the code format exists and is tested), live races, the Android
wrapper, and the long-game balance targets (a lucky player needing at least 300 hours for 100%).
Restore uses the browser's own prompt for pasting and for the grown-up sum; it needs a proper card.

The app icons are exported from the game's own drawing: open `tools/icons.html` on the dev server and save each
file into `assets/icons/`.

## Licence and credits

Game code MIT (see LICENSE). See CREDITS.md for the font (OFL 1.1), ZzFX (MIT) and PeerJS (MIT). All art is original, drawn in code.
