# Credits

## Game art

All characters, falcons, scenery, items and the app icons are drawn in code in `js/art.js` and `js/art/`. There are no
third-party images. The tent, the camp fire and the ghaf tree are adapted from *Abood in Liwa* by the same author.
Abood, Mozah, Baba, Nabeeh and Usta first appeared in *Run, Abood!* and *Abood Space* by the same author.

## Font

**Baloo Bhaijaan 2**, by the Baloo 2 Project Authors (Ek Type), licensed under the SIL Open Font License 1.1.
The files come from the `@fontsource/baloo-bhaijaan-2` package, version 5.3.0. The licence is in `assets/fonts/OFL.txt`.

## Sound

**ZzFX – Zuper Zmall Zound Zynth**, by Frank Force, MIT License. Source: https://github.com/KilledByAPixel/ZzFX
The file is from the `zzfx` package, version 1.4.0. The licence is in `js/vendor/zzfx.LICENSE.txt`.
The sound effects are generated at load time from ZzFX parameters. The music (a Hijaz-scale melody with a maqsum
darbuka beat) is synthesised in `js/audio.js`.

<!-- online:start -->
## Online races

**PeerJS**, by Michelle Bu, Eric Zhang and contributors, MIT License. Source: https://github.com/peers/peerjs
The file is `dist/peerjs.min.js` from the `peerjs` package, version 1.5.4. The licence is in `js/vendor/peerjs.LICENSE.txt`.
It is loaded only when a player opens "Race a friend", and connects through the free public PeerJS server
(0.peerjs.com) and its TURN relay, with Google's public STUN server (stun.l.google.com). Solo play never goes online.
<!-- online:end -->
