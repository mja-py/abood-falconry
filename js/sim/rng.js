// Seeded randomness for every rule in the game. Nothing under js/sim or js/data may call Math.random or read the clock:
// a save stores one seed plus counters, so reloading never rerolls an egg and a node script can replay a whole career.
export function hash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; return h >>> 0;
}
export function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// a named stream: stream(save.seed, 'breed', save.ctr.breed++) gives the same numbers on every device
export const stream = (seed, tag, n = 0) => mulberry(hash32(seed + ':' + tag + ':' + n));
export const int = (rng, n) => Math.floor(rng() * n);
export const pick = (rng, list) => list[int(rng, list.length)];
export function weighted(rng, weights) { // index into weights, proportional to their size
  let sum = 0; for (const w of weights) sum += w;
  let r = rng() * sum;
  for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r < 0) return i; }
  return weights.length - 1;
}
export function gauss(rng) { // standard normal (Box–Muller)
  const u = Math.max(1e-12, rng()), v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
export const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
