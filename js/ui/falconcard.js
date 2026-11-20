// Small pieces every hub uses to show a falcon: its portrait on a canvas, its name and one-line description, star rows.
import { T, lang, nf } from '../i18n.js';
import * as C from '../sim/career.js';
import { appearance, stars, colourOf } from '../sim/phenotype.js';
import { typeOf } from '../sim/genome.js';
import { nameOf } from '../data/names.js';
import { drawFalcon, drawBlock, drawChick, drawEgg } from '../art/falcon.js';
import { sky, dunes, SKIES } from '../art/desert.js';

export const birdName = b => nameOf(b.n, lang());
export const lookOf = (s, b) => appearance(C.genomeOf(b), C.age(s, b), { feathers: b.fe, moult: b.moult, weight: b.w });
export const birdLine = (s, b) => `${T('sp_' + typeOf(C.genomeOf(b)))} · ${T(b.sex === 'f' ? 'sex_f' : 'sex_m')} · ${T('st_' + C.stageOf(s, b))}`;
export const colourName = g => T('col_' + colourOf(g));
// the falcon on its block against a small desert, filling the canvas (any size; drawn at 200 × 160 logical)
export function portrait(cv, s, b, o = {}) {
  const c = cv.getContext('2d'), W = 200, H = 160; c.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0); c.clearRect(0, 0, W, H); c.lineJoin = 'round'; c.lineCap = 'round';
  const time = o.time || 'dusk', k = SKIES[time]; sky(c, W, H, time, 0.8); dunes(c, 0, W, 118, 14, 60, k[5], k[6], H, b.id * 37); dunes(c, 0, W, 134, 8, 34, k[5], k[6], H, b.id * 11);
  const a = o.look || lookOf(s, b), sc = o.s || 2.0;
  drawBlock(c, W / 2 - 4, 108, sc * 0.72, o.block || '#1d6a8f'); drawFalcon(c, W / 2 - 4, 108, a, { pose: 'block', s: sc / a.scale * (0.86 + (a.scale - 1) * 0.5), hood: !!o.hood, hoodCol: o.hoodCol, jesses: true });
}
// a small roster picture: just the bird
export function thumb(cv, s, b, o = {}) {
  const c = cv.getContext('2d'), W = 56, H = 46; c.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0); c.clearRect(0, 0, W, H); c.lineJoin = 'round'; c.lineCap = 'round';
  const a = o.look || lookOf(s, b); drawFalcon(c, W / 2, H - 3, a, { pose: 'block', s: 0.86 / a.scale * (0.9 + (a.scale - 1) * 0.5), hood: !!o.hood, hoodCol: o.hoodCol });
}
export function eggPic(cv, seed, dull) { const c = cv.getContext('2d'); c.setTransform(cv.width / 64, 0, 0, cv.height / 64, 0, 0); c.clearRect(0, 0, 64, 64); drawEgg(c, 32, 34, 2.3, seed, dull); }
export function chickPic(cv, t = 0, s = 1.7) { const c = cv.getContext('2d'); c.setTransform(cv.width / 64, 0, 0, cv.height / 64, 0, 0); c.clearRect(0, 0, 64, 64); drawChick(c, 31, 58, s, t); }
const STAR = cls => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.7 5.7 6.3.8-4.6 4.3 1.2 6.2L12 17l-5.6 3 1.2-6.2L3 9.5l6.3-.8z"/></svg>`;
// five stars: gold for what the bird can do today, pale for what it could still become
export const starRow = (now, pot = now) => { const a = stars(now), p = Math.max(a, stars(pot)); let h = ''; for (let i = 1; i <= 5; i++) h += STAR(i <= a ? 'on' : i <= p ? 'pot' : ''); return `<span class="stars" role="img" aria-label="${a} / 5">${h}</span>`; };
export const meter = (label, v, text, warn) => `<div class="meter ${warn ? 'warn' : ''}"><span>${label}</span><div class="prog"><i style="width:${Math.round(Math.max(0, Math.min(1, v)) * 100)}%"></i></div><em dir="ltr">${text ?? nf(Math.round(v * 100)) + '%'}</em></div>`;
export const coinBtn = (label, price) => `${label} <i class="coin" aria-hidden="true"></i> <span dir="ltr">${nf(price)}</span>`;
