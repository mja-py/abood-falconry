// Small pieces every hub uses to show a falcon: its picture, its name and one-line description, its stars and genes.
import { T, lang, nf } from '../i18n.js';
import * as C from '../sim/career.js';
import { appearance, colourOf } from '../sim/phenotype.js';
import { typeOf } from '../sim/genome.js';
import { nameOf } from '../data/names.js';
import { drawFalcon, drawBlock, drawChick, drawEgg } from '../art/falcon.js';
import { sky, dunes, SKIES } from '../art/desert.js';

export const birdName = b => nameOf(b.n, lang());
export const lookOfGenome = (g, young) => appearance(g, young ? 20 : 100, {});
export const lookOf = (s, b) => lookOfGenome(C.genomeOf(b), C.age(s, b) < 12);
export const birdLine = (s, b) => `${T('sp_' + typeOf(C.genomeOf(b)))} · ${T(b.sex === 'f' ? 'sex_f' : 'sex_m')} · ${T('st_' + C.stageOf(s, b))}`;
export const colourName = g => T('col_' + colourOf(g));
const SWATCH = { adham: '#3b2a22', ahmar: '#7a4326', ramadi: '#5c6470', akhdar: '#6b6a4c', ashgar: '#b88a4a', fiddi: '#a9b0b8', abyad: '#e9e6dc' };
export const swatch = name => `<i class="swatch" style="background:${SWATCH[name]}"></i>`;
// a falcon (or a chick) on its block against a small desert, filling the canvas (drawn at 200 × 160 logical)
export function portrait(cv, look, o = {}) {
  const c = cv.getContext('2d'), W = 200, H = 160; c.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0); c.clearRect(0, 0, W, H); c.lineJoin = 'round'; c.lineCap = 'round';
  const time = o.time || 'dusk', k = SKIES[time]; sky(c, W, H, time, 0.8); dunes(c, 0, W, 118, 14, 60, k[5], k[6], H, (look.seed % 97) * 5); dunes(c, 0, W, 134, 8, 34, k[5], k[6], H, look.seed % 31);
  if (o.chick) { drawChick(c, W / 2, 138, 4.2, 0.6); return; }
  const sc = o.s || 2.0; drawBlock(c, W / 2 - 4, 108, sc * 0.72, o.block || '#1d6a8f'); drawFalcon(c, W / 2 - 4, 108, look, { pose: 'block', s: sc / look.scale * (0.86 + (look.scale - 1) * 0.5), hood: !!o.hood, hoodCol: o.hoodCol, jesses: true });
}
export const birdPortrait = (cv, s, b, o = {}) => portrait(cv, lookOf(s, b), Object.assign({ chick: !C.canFly(s, b) }, o));
export function eggPic(cv, seed, dull) { const c = cv.getContext('2d'); c.setTransform(cv.width / 64, 0, 0, cv.height / 64, 0, 0); c.clearRect(0, 0, 64, 64); drawEgg(c, 32, 34, 2.3, seed, dull); }
const STAR = cls => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.7 5.7 6.3.8-4.6 4.3 1.2 6.2L12 17l-5.6 3 1.2-6.2L3 9.5l6.3-.8z"/></svg>`;
// five stars, n of them gold
export const starRow = n => { let h = ''; for (let i = 1; i <= 5; i++) h += STAR(i <= n ? 'on' : ''); return `<span class="stars" role="img" aria-label="${n} / 5">${h}</span>`; };
// a falcon's overall grade: its five gene stars averaged
export const grade = b => Math.round(C.starSum(b) / 5);
// rare genes as chips: a full chip when the gene shows, a dashed one when the falcon only carries it
export const geneChips = b => { const r = C.rareOf(b); return r.length ? `<div class="genes">${r.map(x => `<span class="gene ${x.shows === 1 ? '' : 'half'}"><i class="bead rare"></i>${T('rg_' + x.id)} · ${T(x.shows === 1 ? 'bd_shows' : 'bd_carries')}</span>`).join('')}</div>` : ''; };
export const meter = (label, v, text, warn) => `<div class="meter ${warn ? 'warn' : ''}"><span>${label}</span><div class="prog"><i style="width:${Math.round(Math.max(0, Math.min(1, v)) * 100)}%"></i></div><em dir="ltr">${text ?? nf(Math.round(v * 100)) + '%'}</em></div>`;
export const coinBtn = (label, price) => `${label} <i class="coin" aria-hidden="true"></i> <span dir="ltr">${nf(price)}</span>`;
