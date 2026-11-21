# عبود الصقّار · Abood the Falconer

A game in the Abood & Mozah family about Emirati falconry (القنص). Abood drives his 4x4 across an open desert with
his falcon on his fist, casts it at hare, sandgrouse and houbara, and brings the catch home to Baba's camp. Between
hunts he does four things: **feed** his falcons, **enhance** them, **breed** them and **sell** them. One "did you
know?" card about the culture, the law or conservation is shown after each hunt. Arabic first, English beside it.

Built with the family skill (`abood-skill/abood-games`): same sticker cards, same font, same red verb, same pretend
dirhams, drawn in code, offline, kid-safe. The open desert, the drag-pad steering and the truck come from
*Abood in Liwa*.

**Status: version 2, a rebuild.** The first version (a side-on hunt with a calendar, a quiz and six hubs) was replaced
on 21 November 2026 by this simpler one-loop game. See "What is not here yet" for what the long game still needs.

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

- `npm test`: 28 node tests of the rules (inheritance ratios, inbreeding coefficients, odds shown vs eggs laid, the
  hunt's determinism, Baba's first lesson always ending in a catch, feeding, enhancing, breeding, selling, missions,
  save repair and the move from a version 1 save, friend codes).
- `npm run check`: the rules stay pure (`check-imports`), every string exists in both languages with no symbol glyphs
  (`check-i18n`), every fact has a source (`check-facts`), the offline file list is complete (`check-sw`).
- `npm run balance`: plays whole careers on the real rules with a bot and reports seconds per hunt, catches, levels,
  dirhams, chicks and sales.
- The family linter: `bash <skill>/scripts/check-theme.sh .` (0 failures).
- `./deploy.sh` runs the tests and checks first and refuses to publish if any fail.

In the browser console, `window.__game.debug` drives the game without playing: `start()`, `step(dt, n)`,
`input({ jx, jy, act })`, `bot(true, skill)`, `home()`, `hunts(n)`, `give({ coins, meat })`, `sheet(kind)`, `menu()`,
`lang('en')`, `girl(true)`, `info()`, `world()`, `audit()` (lists anything that scrolls, leaves the screen, is too
small to press or carries a symbol on a button), `still()` (animations off) and `awake()` (keep running in a hidden tab).

## How it plays

- **Hunt.** Drag anywhere to drive. The radar and the edge arrow point at quarry. Close enough, the one button casts
  the falcon; now the drag steers the falcon and the button is a swoop. A catch is a puff of dust and a few feathers.
  Drive to the falcon to pick it up, then hunt again or go home. The falcon's energy bar is the clock: about a minute
  and a half an outing. Baba's first lesson cannot be failed.
- **Feed.** Every hunt makes falcons hungrier; a hungry falcon flies worse. Hunting brings meat home; the market sells it.
- **Enhance.** Five skills (speed, stamina, swoop, agility, eyes), each trained with dirhams up to the stars that the
  falcon's genes allow. A better falcon needs better parents.
- **Breed.** Pick a mother and a father; the screen shows the odds for colour and rare genes ("1 of 4") before the
  eggs are laid, from the same rules that lay them. Eggs hatch after 2 hunts, a chick flies after 3 and breeds after 6.
- **Sell.** Price follows stars, colour, rare genes and training. Buyers post requests that pay extra.
- **Level.** Hunting gives experience; the falconer's level opens wider desert and harder quarry (houbara at level 3,
  with a quota). Missions come three at a time; Mozah joins after ten.
- Time is counted in hunts. Nothing waits on a clock and nothing nags. Dirhams are in-game only.
- Genetics under the hood: ten traits of four gene pairs each, a colour series where the darker one shows, nine rare
  genes (Barq is the first; the starting falcons carry it). It is a game model of inheritance, not real falcon genetics.

## How it is built

```
index.html, css/theme.css     the family shell; this game's styles are appended at the end of the theme
js/game.js                    boot, loop, the home menu, outings, the drag pad and action button, the debug API
js/ui.js, js/ui/*             DOM glue; one file per screen (my falcons, breeding, market, missions and help)
js/scenes/hunt.js             draws the open desert: ground tiles, scenery, truck, falcon, quarry, radar
js/art.js, js/art/*           people, the truck, the parametric falcon (every bird drawn from its genome), the desert
js/sim/*                      the rules: pure, seeded, no DOM, tested in node (world, hunt-sim, career, genome, breed ...)
js/data/*                     tables: loci and species, quarry, names, fact ids
js/i18n.js, js/i18n/*         strings (Arabic first, Mozah's twins) and the fact cards
content/facts-ledger.json     every fact with its source and status
tools/, test/                 dev only, never deployed
```

Departures from the family skill, all deliberate: a full-window open world as in Abood in Liwa instead of the fixed
play field; no scrolling in any menu (screens page and fit instead); the five tiles are My falcons, Breeding, Market,
Missions and How to play; many small modules and real tests.

## Facts

39 fact cards, every one marked verified: its source page was read and says what the card says. A second read of ten
of them on 20 November 2026 corrected three figures (the release programme's total, the race time, and the school's
location) and softened two cards whose sources were unclear. Five more facts are held back in the ledger until a
better source is found. `node tools/check-facts.mjs --release` passes only while every shipped fact is verified.
Arabic falconry terms should be reviewed by a falconer or a heritage body before more are added.

## What is not here yet

- The long game. A bot career of 60 hunts takes about two hours and ends near level 13 with tens of thousands of
  dirhams, so money and levels come far too fast for the 300-hour goal. Pacing, more zones, more quarry and more
  to spend on are the next work.
- Peregrine, gyr, wakri and hybrids in play (the genetics and the drawing already support them).
- Friend codes on screen (the code format exists and is tested), races, the Android wrapper.
- Restore uses the browser's own prompt for pasting; it needs a proper card.

The app icons are exported from the game's own drawing: open `tools/icons.html` on the dev server and save each
file into `assets/icons/`.

## Licence and credits

Game code MIT (see LICENSE). See CREDITS.md for the font (OFL 1.1), ZzFX (MIT) and PeerJS (MIT). All art is original, drawn in code.
