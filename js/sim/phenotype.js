// From beads to bird: what a genome is worth in the air (stats) and what it looks like (appearance).
// Pure numbers and colour strings only; the canvas work is in js/art/falcon.js.
import { TRAITS, LOCI_PER_TRAIT, WEIGHTS, POINT_VALUE, COLOURS, PATTERNS, SPECIES, BASE, MALE_SIZE, HETEROSIS, INBREED, TRAINABLE, ADULT_WEEKS } from '../data/loci.js';
import { shows, pack } from './genome.js';
import { hash32, clamp } from './rng.js';

// genetic points of one trait, 0–20
export function points(g, trait) {
  const t = typeof trait === 'number' ? trait : TRAITS.indexOf(trait); let n = 0;
  for (let l = 0; l < LOCI_PER_TRAIT; l++) n += WEIGHTS[l] * (g.h[0].q[t * LOCI_PER_TRAIT + l] + g.h[1].q[t * LOCI_PER_TRAIT + l]);
  return n;
}
const blend = (g, table) => { let v = 0; for (let i = 0; i < 4; i++) v += (g.anc[i] / 16) * table[SPECIES[i]]; return v; };

// what the bird could become with perfect training and care: { speed: 0–100, … }. F is its inbreeding coefficient.
export function potential(g, F = 0) {
  const out = {}, H = g.hy / 16;
  for (let t = 0; t < TRAITS.length; t++) {
    const name = TRAITS[t]; let v = 0;
    for (let i = 0; i < 4; i++) v += (g.anc[i] / 16) * BASE[SPECIES[i]][name];
    v += points(g, t) * POINT_VALUE + (HETEROSIS[name] || 0) * H;
    if (name === 'size' && g.sex === 'm') v *= blend(g, MALE_SIZE);
    if (name === 'hardy') v -= INBREED.hardy * F;
    out[name] = clamp(Math.round(v), 1, 100);
  }
  return out;
}
// what the bird can do today. bird: { tr: {trait: 0–1}, cond: 0.85–1 }. Rare genes and the two built-in trade-offs
// (a big bird turns wider; a bird that bursts hard tires sooner) are applied here.
export function effective(g, F, bird = {}) {
  const pot = potential(g, F), tr = bird.tr || {}, cond = bird.cond ?? 1, out = {};
  for (const name of TRAITS) {
    const trained = TRAINABLE.includes(name) ? 0.55 + 0.45 * clamp(tr[name] ?? 0.2, 0, 1) : 1;
    out[name] = pot[name] * trained * (name === 'size' || name === 'temper' ? 1 : cond);
  }
  out.agility -= 0.3 * Math.max(0, pot.size - 50);
  out.stamina -= 0.2 * Math.max(0, pot.burst - 60);
  out.speed *= 1 + 0.10 * shows(g, 'barq');
  out.burst *= 1 + 0.15 * shows(g, 'sahm');
  out.stoop *= 1 + 0.12 * shows(g, 'shihab');
  for (const name of TRAITS) out[name] = clamp(out[name], 1, 130);
  out.flags = { window: 1 + 0.25 * shows(g, 'ain'), grip: shows(g, 'mikhlab') === 1, noFade: shows(g, 'nafas') === 1, sahm: shows(g, 'sahm') === 1,
    feathers: shows(g, 'reesha') === 1, heat: shows(g, 'suhail') === 1 };
  return out;
}
export const stars = v => clamp(Math.ceil(v / 20), 1, 5);
// the lure sprint is mostly the burst off the fist
export const sprintIndex = s => 0.6 * s.burst + 0.4 * s.speed;

// ---- colour and pattern ----
export const colourOf = g => COLOURS[Math.min(g.h[0].c, g.h[1].c)];                   // the darker bead shows
export const patternOf = g => [g.h[0].p, g.h[1].p].sort().map(i => PATTERNS[i]);      // both beads show
export const superWhite = g => colourOf(g) === 'abyad' && shows(g, 'thalj') === 1;

const PLUMAGE = { // [back, breast, mark]
  adham:  ['#3b2a22', '#7a5642', '#241812'],
  ahmar:  ['#7a4326', '#dba878', '#5a2d16'],
  ramadi: ['#5c6470', '#d9dce0', '#3c434d'],
  akhdar: ['#6b6a4c', '#dad3ab', '#48472f'],
  ashgar: ['#b88a4a', '#f2dfb2', '#8a6230'],
  fiddi:  ['#a9b0b8', '#f0f2f4', '#7d858e'],
  abyad:  ['#e9e6dc', '#fbfaf5', '#b9b3a4'],
};
// species silhouettes: wing and tail length, head and chest proportions, how strong the moustache stripe is
const BUILD = {
  saker:     { wing: 1.00, tail: 1.00, head: 1.00, chest: 1.00, malar: 0.35, cap: 0.3 },
  peregrine: { wing: 1.08, tail: 0.86, head: 0.96, chest: 1.06, malar: 1.00, cap: 1.0 },
  gyr:       { wing: 0.96, tail: 1.08, head: 1.06, chest: 1.12, malar: 0.15, cap: 0.2 },
  wakri:     { wing: 1.02, tail: 0.98, head: 0.94, chest: 0.92, malar: 0.60, cap: 0.6 },
};
// everything the renderer needs, quantised so two devices draw the same bird from the same genome
export function appearance(g, ageWeeks = ADULT_WEEKS, cond = {}) {
  const colour = colourOf(g), [back, breast, mark] = PLUMAGE[colour], pat = patternOf(g), build = {};
  for (const k of ['wing', 'tail', 'head', 'chest', 'malar', 'cap']) { let v = 0; for (let i = 0; i < 4; i++) v += (g.anc[i] / 16) * BUILD[SPECIES[i]][k]; build[k] = Math.round(v * 100) / 100; }
  const size = potential(g).size, clean = shows(g, 'thalj') === 1, juvenile = ageWeeks < 48;
  return {
    colour, back, breast, mark, pattern: pat, build,
    scale: Math.round((0.78 + size / 100 * 0.5) * 100) / 100,          // 0.78 – 1.28
    density: clean ? 0 : Math.round((0.35 + points(g, 'hardy') / 20 * 0.4 + (juvenile ? 0.25 : 0)) * 20) / 20,
    juvenile, clean, superWhite: clean && colour === 'abyad',
    seed: hash32(pack(g)),                                              // where the breast marks fall
    wear: Math.round(clamp(1 - (cond.feathers ?? 1), 0, 1) * 4),        // 0–4 feather wear
    moult: !!cond.moult, thin: (cond.weight ?? 1) < 0.94, heavy: (cond.weight ?? 1) > 1.06,
  };
}
export const appKey = a => [a.colour, a.pattern.join('+'), a.scale, a.density, a.juvenile ? 'j' : 'a', a.clean ? 'c' : '', a.seed.toString(36), a.wear, a.moult ? 'm' : '',
  a.build.wing, a.build.tail, a.build.head, a.build.chest, a.build.malar, a.build.cap].join('|');
