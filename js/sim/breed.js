// Breeding: the clutch a pair lays, and the odds the player is shown BEFORE pairing. The odds are worked out from the
// same rules the eggs use, so the pairing screen is honest probability the child can read, never a mystery box.
import { TRAITS, LOCI_PER_TRAIT, WEIGHTS, COLOURS, PATTERNS, RARE, INBREED } from '../data/loci.js';
import { cross, mutate } from './genome.js';
import { weighted } from './rng.js';

export const CLUTCH_WEIGHTS = [5, 20, 40, 25, 10];   // 1 to 5 eggs, mean 3.15
export const FERTILITY = { natural: 0.66, assisted: 0.80 };
// inbreeding only ever costs fertility (and hardiness, in phenotype.js): it is never a hard stop
export const fertilityOf = (base, F) => base * Math.max(INBREED.fertilityFloor, 1 - INBREED.fertility * F);

// eggs: [{ fertile, g, mut }]. o: { fert, F (the chicks' inbreeding coefficient), min (fertile eggs promised, for Baba's first lesson) }
export function layClutch(sire, dam, rng, o = {}) {
  const n = Math.max(1 + weighted(rng, CLUTCH_WEIGHTS), o.min || 0), p = fertilityOf(o.fert ?? FERTILITY.natural, o.F || 0), eggs = [];
  for (let i = 0; i < n; i++) {
    const fertile = rng() < p || i < (o.min || 0);
    const g = cross(sire, dam, rng), mut = mutate(g, rng);
    eggs.push(fertile ? { fertile: true, g, mut } : { fertile: false });
  }
  return eggs;
}

const mix = (a, b) => [[a[0], b[0]], [a[0], b[1]], [a[1], b[0]], [a[1], b[1]]];   // the four squares of a Punnett grid
// odds(sire, dam) → { colour: {name: p}, pattern: {'a+b': p}, rare: {id: {carrier, shows, showsF, showsM}}, traits: {name: {min, max, mean, lo, hi}} }
export function odds(sire, dam) {
  const colour = {}, pattern = {}, rare = {}, traits = {};
  for (const [x, y] of mix([sire.h[0].c, sire.h[1].c], [dam.h[0].c, dam.h[1].c])) { const k = COLOURS[Math.min(x, y)]; colour[k] = (colour[k] || 0) + 0.25; }
  for (const [x, y] of mix([sire.h[0].p, sire.h[1].p], [dam.h[0].p, dam.h[1].p])) { const k = [x, y].sort().map(i => PATTERNS[i]).join('+'); pattern[k] = (pattern[k] || 0) + 0.25; }
  RARE.forEach((gene, i) => {
    const ps = (sire.h[0].r[i] + sire.h[1].r[i]) / 2;                    // chance the father passes the bead
    if (gene.mode === 'zrec') {
      const pd = dam.h[0].r[i];                                          // the mother's one Z goes to every son
      rare[gene.id] = { carrier: 0.5 * ps * (1 - pd) + 0.5 * (1 - ps) * pd, showsF: ps, showsM: ps * pd, shows: 0.5 * ps + 0.5 * ps * pd, grid: null };
    } else {
      const pd = (dam.h[0].r[i] + dam.h[1].r[i]) / 2, two = ps * pd, one = ps * (1 - pd) + (1 - ps) * pd;
      rare[gene.id] = { carrier: one, shows: gene.mode === 'inc' ? two + one : two, two, showsF: two, showsM: two,
        grid: mix(sire.h.map(s => s.r[i]), dam.h.map(s => s.r[i])).map(([x, y]) => x + y) };
    }
  });
  TRAITS.forEach((name, t) => { // exact distribution of the chick's genetic points: convolve the four loci
    let dist = [1];
    for (let l = 0; l < LOCI_PER_TRAIT; l++) {
      const k = t * LOCI_PER_TRAIT + l, ps = (sire.h[0].q[k] + sire.h[1].q[k]) / 2, pd = (dam.h[0].q[k] + dam.h[1].q[k]) / 2, w = WEIGHTS[l];
      const step = [(1 - ps) * (1 - pd), ps * (1 - pd) + (1 - ps) * pd, ps * pd], next = new Array(dist.length + 2 * w).fill(0);
      dist.forEach((p, v) => { if (p) for (let c = 0; c < 3; c++) next[v + c * w] += p * step[c]; });
      dist = next;
    }
    let mean = 0, min = -1, max = 0, acc = 0, lo = 0, hi = 0, gotLo = false, gotHi = false;
    dist.forEach((p, v) => { if (p <= 1e-12) return; mean += p * v; if (min < 0) min = v; max = v; });
    dist.forEach((p, v) => { acc += p; if (!gotLo && acc >= 0.1) { lo = v; gotLo = true; } if (!gotHi && acc >= 0.9) { hi = v; gotHi = true; } });
    traits[name] = { min, max, mean, lo, hi, dist };
  });
  return { colour, pattern, rare, traits };
}
// "3 of 4 chicks": the nearest quarter, for the child-level card
export const quarters = p => Math.round(p * 4);
