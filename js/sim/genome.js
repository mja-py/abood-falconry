// The falcon genome: two strings of beads, one from the father and one from the mother.
//   genome = { sex: 'f' | 'm', anc: [saker, peregrine, gyr, wakri] in sixteenths, hy: hybrid index in sixteenths, h: [fromSire, fromDam] }
//   strand = { q: 40 plus/minus beads (10 traits × 4 loci), c: colour bead, p: pattern bead, r: 9 rare-gene beads }
// Birds are ZW: the hen is ZW and the tiercel ZZ, so the mother's bead decides the chick's sex. A hen carries one copy
// of a Z-linked gene (from her father); her second strand holds nothing at that locus.
import { TRAITS, LOCI_PER_TRAIT, RARE, COLOURS, PATTERNS, SPECIES, COLOUR_POOL, PATTERN_POOL, SIGNATURE, SIGNATURE_BONUS, PLUS, MUTATION } from '../data/loci.js';
import { weighted, int } from './rng.js';
import { BitWriter, BitReader } from './bits.js';

export const NQ = TRAITS.length * LOCI_PER_TRAIT, NR = RARE.length;
const isZ = i => RARE[i].mode === 'zrec';
export const rareIndex = id => RARE.findIndex(r => r.id === id);

// a bird with no known parents (a market bird, a rival's, Baba's). o: { species, sex, plus | source, traitPlus: {trait: freq},
// rareFreq: {id: freq}, rare: {id: copies}, colour: [beadA, beadB] }
export function founder(rng, o) {
  const si = SPECIES.indexOf(o.species), anc = [0, 0, 0, 0]; anc[si] = 16;
  const sex = o.sex || (rng() < 0.5 ? 'f' : 'm');
  const base = o.plus ?? PLUS[o.source || 'common'], pool = COLOUR_POOL[o.species];
  const names = Object.keys(pool), freq = names.map(n => pool[n]);
  const strand = () => {
    const q = [];
    for (let t = 0; t < TRAITS.length; t++) {
      let p = base + (SIGNATURE[o.species].includes(TRAITS[t]) ? SIGNATURE_BONUS : 0);
      if (o.traitPlus && o.traitPlus[TRAITS[t]] != null) p = o.traitPlus[TRAITS[t]];
      for (let l = 0; l < LOCI_PER_TRAIT; l++) q.push(rng() < p ? 1 : 0);
    }
    const c = COLOURS.indexOf(names[weighted(rng, freq)]), p = weighted(rng, PATTERN_POOL);
    const r = RARE.map(x => (rng() < ((o.rareFreq && o.rareFreq[x.id]) || 0) ? 1 : 0));
    return { q, c, p, r };
  };
  const g = { sex, anc, hy: 0, h: [strand(), strand()] };
  for (const id of Object.keys(o.rare || {})) { const i = rareIndex(id), n = o.rare[id]; g.h[0].r[i] = n >= 1 ? 1 : 0; g.h[1].r[i] = n >= 2 ? 1 : 0; }
  if (o.colour) { g.h[0].c = COLOURS.indexOf(o.colour[0]); g.h[1].c = COLOURS.indexOf(o.colour[1]); }
  if (sex === 'f') for (let i = 0; i < NR; i++) if (isZ(i)) g.h[1].r[i] = 0;
  return g;
}

// one strand for a chick of the given sex: each bead is a coin toss between the parent's two
function gamete(g, rng, childSex) {
  const a = g.h[0], b = g.h[1], q = new Array(NQ), r = new Array(NR);
  for (let i = 0; i < NQ; i++) q[i] = rng() < 0.5 ? a.q[i] : b.q[i];
  const c = rng() < 0.5 ? a.c : b.c, p = rng() < 0.5 ? a.p : b.p;
  for (let i = 0; i < NR; i++) {
    const toss = rng() < 0.5 ? a.r[i] : b.r[i];
    if (!isZ(i) || g.sex === 'm') r[i] = toss;
    else r[i] = childSex === 'm' ? a.r[i] : 0;   // a hen gives her one Z to her sons and her W to her daughters
  }
  return { q, c, p, r };
}
// spread sixteenths so they still sum to 16 (largest remainders first, lowest index on ties)
function mixAncestry(a, b) {
  const raw = a.map((v, i) => (v + b[i]) / 2), out = raw.map(Math.floor);
  let left = 16 - out.reduce((s, v) => s + v, 0);
  const order = raw.map((v, i) => [v - Math.floor(v), i]).sort((x, y) => y[0] - x[0] || x[1] - y[1]);
  for (let k = 0; left > 0; k++, left--) out[order[k % 4][1]]++;
  return out;
}
export function cross(sire, dam, rng) {
  const sex = rng() < 0.5 ? 'f' : 'm';
  const fromSire = gamete(sire, rng, sex), fromDam = gamete(dam, rng, sex);
  let same = 0; for (let i = 0; i < 4; i++) same += (sire.anc[i] / 16) * (dam.anc[i] / 16);
  return { sex, anc: mixAncestry(sire.anc, dam.anc), hy: Math.round((1 - same) * 16), h: [fromSire, fromDam] };
}
// a rare surprise: one bead of one trait flips. Returns { trait, up } or null.
export function mutate(g, rng, rate = MUTATION) {
  if (rng() >= rate) return null;
  const s = int(rng, 2), i = int(rng, NQ);
  g.h[s].q[i] ^= 1;
  return { trait: TRAITS[Math.floor(i / LOCI_PER_TRAIT)], up: g.h[s].q[i] === 1 };
}

// ---- reading a genome ----
export const copies = (g, id) => { const i = typeof id === 'number' ? id : rareIndex(id); return g.h[0].r[i] + g.h[1].r[i]; };
// how strongly a rare gene shows: 0 not at all, 1 fully (0.4 for one copy of an incomplete-dominance gene)
export function shows(g, id) {
  const i = typeof id === 'number' ? id : rareIndex(id), n = g.h[0].r[i] + g.h[1].r[i], mode = RARE[i].mode;
  if (mode === 'zrec') return g.sex === 'f' ? (g.h[0].r[i] ? 1 : 0) : (n === 2 ? 1 : 0);
  if (mode === 'inc') return n === 2 ? 1 : n === 1 ? 0.4 : 0;
  return n === 2 ? 1 : 0;
}
export const rareShown = g => RARE.filter((r, i) => shows(g, i) === 1).map(r => r.id);
export const isPure = g => g.anc.some(v => v === 16);
export const mainSpecies = g => SPECIES[g.anc.indexOf(Math.max(...g.anc))];
// the type a falconer would call it: a pure species, or the hybrid's trade name
export function typeOf(g) {
  if (isPure(g)) return mainSpecies(g);
  const [s, p, gy] = g.anc;
  if (gy > 0 && s >= p && s > 0) return 'gyr_saker';
  if (gy > 0 && p > 0) return 'gyr_peregrine';
  return 'hybrid';
}

// ---- packing: 129 bits → 26 characters ----
export function pack(g) {
  const w = new BitWriter();
  w.push(g.sex === 'm' ? 1 : 0, 1); w.push(g.anc[0], 5); w.push(g.anc[1], 5); w.push(g.anc[2], 5); w.push(g.hy, 5);
  for (const s of g.h) { for (let i = 0; i < NQ; i++) w.push(s.q[i], 1); w.push(s.c, 3); w.push(s.p, 2); for (let i = 0; i < NR; i++) w.push(s.r[i], 1); }
  return w.text();
}
export const PACKED_LENGTH = Math.ceil((1 + 15 + 5 + 2 * (NQ + 3 + 2 + NR)) / 5);
export function unpack(text) {
  if (typeof text !== 'string' || text.length !== PACKED_LENGTH) return null;
  const r = new BitReader(text);
  const sex = r.take(1) ? 'm' : 'f', a0 = r.take(5), a1 = r.take(5), a2 = r.take(5), hy = r.take(5);
  const h = [];
  for (let k = 0; k < 2; k++) { const q = []; for (let i = 0; i < NQ; i++) q.push(r.take(1)); const c = r.take(3), p = r.take(2), rr = []; for (let i = 0; i < NR; i++) rr.push(r.take(1)); h.push({ q, c, p, r: rr }); }
  const a3 = 16 - a0 - a1 - a2;
  if (!r.ok || a3 < 0 || hy > 16 || h.some(s => s.c >= COLOURS.length || s.p >= PATTERNS.length)) return null;
  if (sex === 'f') for (let i = 0; i < NR; i++) if (isZ(i)) h[1].r[i] = 0;
  return { sex, anc: [a0, a1, a2, a3], hy, h };
}
