// The falconer's life as rules, kept to one loop a child can hold in mind:
//   HUNT in the open desert → FEED the falcons with what was caught → ENHANCE a falcon with the dirhams earned →
//   BREED two falcons for better chicks → SELL the ones not kept → hunt again.
// Time is counted in hunts: eggs hatch after two, a chick flies after three and can breed after six.
// Every function takes the save, changes it, and returns plain data, so the browser and the balance tool share it.
import { unpack, pack, founder, shows, copies, typeOf } from './genome.js';
import { potential, stars, colourOf } from './phenotype.js';
import { stream, clamp, int } from './rng.js';
import { layClutch } from './breed.js';
import { coi } from './pedigree.js';
import { addBird, STATS } from './state.js';
import { RARE } from '../data/loci.js';
import { FACTS } from '../data/facts.js';

export { STATS };
// ---- falcons ----
const cache = new Map();
export function genomeOf(b) { let g = cache.get(b.g); if (!g) { g = unpack(b.g); if (cache.size > 600) cache.clear(); cache.set(b.g, g); } return g; }
export const bird = (s, id) => s.birds.find(b => b.id === id);
export const active = s => bird(s, s.active);
export const mine = s => s.birds.filter(b => b.own === 'me');
export const age = (s, b) => s.hunts - b.born;
export const FLY_AGE = 3, BREED_AGE = 6;
export const stageOf = (s, b) => (age(s, b) < FLY_AGE ? 'chick' : age(s, b) < 12 ? 'farkh' : 'jirnas');
export const canFly = (s, b) => !!b && age(s, b) >= FLY_AGE;
export const isAdult = (s, b) => age(s, b) >= BREED_AGE;
export const pedMap = s => new Map(s.ped.map(r => [r[0], { s: r[1], d: r[2], F: r[3] }]));
export const nesting = (s, id) => s.nests.some(n => n.dam === id);
// what the genes allow, as five numbers 1–100, and as the stars a child reads (which are also the limit of training)
export function potentialOf(b) { const p = potential(genomeOf(b), b.F); return { speed: p.speed, stamina: p.stamina, stoop: Math.round((p.stoop + p.burst + p.accuracy) / 3), agility: clamp(Math.round(p.agility - 0.3 * Math.max(0, p.size - 50)), 1, 100), eyes: p.eyes }; }
export function starsOf(b) { const p = potentialOf(b), out = {}; for (const k of STATS) out[k] = stars(p[k]); return out; }
export const starSum = b => { const st = starsOf(b); return STATS.reduce((a, k) => a + st[k], 0); };
export const HUNGRY = 0.3;
// what the falcon can do in today's hunt: genes × training, less when it is hungry; rare genes that show add their gift
export function statsOf(s, b) {
  const p = potentialOf(b), g = genomeOf(b), out = {}, hungry = b.fed < HUNGRY ? 0.8 : 1;
  for (const k of STATS) out[k] = p[k] * (0.62 + 0.076 * b.lv[k]) * hungry;
  out.flags = { speed: 1 + 0.12 * shows(g, 'barq'), quick: shows(g, 'sahm') === 1, grab: 1 + 0.25 * shows(g, 'ain'), dive: 0.3 * shows(g, 'shihab'), grip: shows(g, 'mikhlab') === 1, wind: shows(g, 'nafas') === 1 ? 0.75 : 1 };
  return out;
}
export const rareOf = b => { const g = genomeOf(b); return RARE.map((r, i) => ({ id: r.id, copies: copies(g, i), shows: shows(g, i) })).filter(r => r.copies > 0); };

// ---- the falconer's level: what a season of catches opens ----
export const levelOf = xp => Math.floor((Math.sqrt(1 + 8 * xp / 300) - 1) / 2) + 1;       // 300, 900, 1800, 3000 …
export const xpFor = level => 150 * level * (level - 1);
export const level = s => levelOf(s.xp);
export const mult = s => Math.min(2.5, 1 + (s.ladder.lv - 1) * 0.1);

// ---- hunt ----
// after an outing (sum is hunt-sim's summary): pay, bank the meat, make everyone a little hungrier, move the nests on
export function finishHunt(s, sum) {
  const b = active(s), ev = [], before = level(s), coins = Math.round(sum.score * mult(s));
  s.coins += coins; s.meat += sum.meat; s.xp += sum.score; s.hunts++; s.lesson = 1; if (sum.score > s.best) s.best = sum.score;
  const S = s.stats; S.hunts++; S.flights += sum.flights; S.catches += sum.caught; for (const k in sum.bag) { S[k] = (S[k] || 0) + sum.bag[k]; s.bag[k] = (s.bag[k] || 0) + sum.bag[k]; }
  b.rec.f += sum.flights; b.rec.c += sum.caught;
  for (const x of mine(s)) x.fed = clamp(x.fed - (x.id === b.id ? 0.35 : 0.2), 0, 1);
  if (level(s) > before) ev.push({ type: 'level', level: level(s) });
  ev.push(...hatch(s));
  for (const x of mine(s)) if (age(s, x) === FLY_AGE) ev.push({ type: 'fledged', id: x.id });
  refreshMarket(s);
  return { coins, meat: sum.meat, fact: nextFact(s), events: ev };
}
export function nextFact(s) { const f = FACTS.find(x => !s.facts[x.id]); if (!f) return null; s.facts[f.id] = 1; return f.id; }

// ---- feed ----
export function feed(s, id) { const b = bird(s, id); if (!b || b.own !== 'me' || b.fed >= 1 || s.meat < 1) return false; s.meat--; b.fed = clamp(b.fed + 0.5, 0, 1); s.stats.fed++; return true; }
export function feedAll(s) { let n = 0; for (const b of mine(s).sort((a, c) => a.fed - c.fed)) while (b.fed <= 0.5 && feed(s, b.id)) n++; return n; }

// ---- enhance: training a falcon costs dirhams, and no falcon can be trained past what its genes allow ----
export const ENHANCE_COST = [100, 250, 500, 900, 1500];
export function enhance(s, id, stat) {
  const b = bird(s, id); if (!b || b.own !== 'me' || !STATS.includes(stat)) return { ok: false, why: 'none' };
  const lv = b.lv[stat], cap = starsOf(b)[stat];
  if (lv >= cap) return { ok: false, why: 'genes' };
  if (!canFly(s, b)) return { ok: false, why: 'chick' };
  if (s.coins < ENHANCE_COST[lv]) return { ok: false, why: 'coins' };
  s.coins -= ENHANCE_COST[lv]; b.lv[stat]++; s.stats.enhanced++; return { ok: true, level: b.lv[stat] };
}

// ---- sell ----
const COLOUR_PRICE = { adham: 0.9, ahmar: 1, ramadi: 1, akhdar: 1.1, ashgar: 1.5, fiddi: 1.6, abyad: 3 };
// what a genome is worth: better stars, a rarer colour and rare genes all raise it
export function worth(g, F = 0, lv = null) {
  const p = potential(g, F), st = [p.speed, p.stamina, (p.stoop + p.burst + p.accuracy) / 3, p.agility, p.eyes].reduce((a, v) => a + stars(v), 0);
  let rare = 0; RARE.forEach((r, i) => { rare += shows(g, i) === 1 ? 0.6 : copies(g, i) ? 0.2 : 0; });
  const trained = lv ? STATS.reduce((a, k) => a + lv[k], 0) : 0;
  return Math.round(60 * Math.pow(1.2, st - 5) * COLOUR_PRICE[colourOf(g)] * (1 + rare) * (1 + 0.05 * trained) / 10) * 10;
}
export const price = (s, b) => Math.round(worth(genomeOf(b), b.F, b.lv) * (age(s, b) < FLY_AGE ? 0.5 : 1) / 10) * 10;
// does this falcon fill a buyer's request? → the index of the order, or -1
export function matches(s, b, o) {
  const g = genomeOf(b), st = starsOf(b);
  return o.want === 'colour' ? colourOf(g) === o.v : o.want === 'stat' ? st[o.stat] >= o.min : o.want === 'sex' ? b.sex === o.v : o.want === 'rare' ? shows(g, o.v) === 1 : false;
}
export const orderFor = (s, b) => s.market.orders.findIndex(o => matches(s, b, o));
export function maySell(s, b) { return !b || b.own !== 'me' ? 'none' : nesting(s, b.id) ? 'nest' : mine(s).filter(x => x.id !== b.id && canFly(s, x)).length < 1 ? 'last' : null; }
export function sell(s, id) {
  const b = bird(s, id), why = maySell(s, b); if (why) return { ok: false, why };
  const oi = orderFor(s, b), bonus = oi >= 0 ? s.market.orders[oi].bonus : 1, got = Math.round(price(s, b) * bonus);
  s.coins += got; s.birds = s.birds.filter(x => x.id !== id); s.stats.sold++;
  if (oi >= 0) { s.market.orders.splice(oi, 1); s.stats.orders++; }
  if (s.active === id) s.active = mine(s).find(x => canFly(s, x)).id;
  return { ok: true, coins: got, order: oi >= 0 };
}

// ---- the market: three falcons for sale and three buyers' requests, changed every third hunt ----
const ORDER_KINDS = [{ want: 'colour', v: 'ashgar' }, { want: 'colour', v: 'akhdar' }, { want: 'colour', v: 'ahmar' }, { want: 'sex', v: 'f' }, { want: 'sex', v: 'm' }, { want: 'stat', stat: 'speed', min: 3 }, { want: 'stat', stat: 'stamina', min: 3 },
  { want: 'stat', stat: 'stoop', min: 3 }, { want: 'stat', stat: 'eyes', min: 3 }, { want: 'stat', stat: 'speed', min: 4 }, { want: 'rare', v: 'barq' }, { want: 'colour', v: 'abyad' }];
export function refreshMarket(s, force) {
  if (!force && s.hunts - s.market.stamp < 3 && s.market.offers.length + s.market.orders.length > 0) return false;
  const r = stream(s.seed, 'market', s.ctr.market = (s.ctr.market || 0) + 1), lvl = level(s), src = lvl >= 6 ? 'auction' : lvl >= 3 ? 'good' : 'common';
  s.market.offers = [0, 1, 2].map(i => { const g = founder(r, { species: 'saker', source: i === 2 ? src : 'common', rareFreq: lvl >= 4 ? { barq: 0.15, sahm: 0.12, ain: 0.1 } : { barq: 0.08 } }); return { g: pack(g), price: Math.round(worth(g) * 1.6 / 10) * 10 }; });
  const pool = ORDER_KINDS.slice(0, lvl >= 3 ? ORDER_KINDS.length : 9), orders = [];
  while (orders.length < 3) { const o = pool.splice(int(r, pool.length), 1)[0]; orders.push(Object.assign({ bonus: o.want === 'rare' || o.v === 'abyad' ? 2 : o.min === 4 ? 1.8 : 1.5 }, o)); }
  s.market.orders = orders; s.market.stamp = s.hunts; return true;
}
export function buyFalcon(s, i) {
  const o = s.market.offers[i]; if (!o) return { ok: false, why: 'none' };
  if (mine(s).length >= s.mewsCap) return { ok: false, why: 'full' };
  if (s.coins < o.price) return { ok: false, why: 'coins' };
  s.coins -= o.price; s.market.offers.splice(i, 1); s.stats.bought++; return { ok: true, bird: addBird(s, unpack(o.g), { born: s.hunts - 8 }) };
}
export const MEAT_PRICE = 20, MEWS_PRICE = [800, 2000, 5000, 12000], NEST_PRICE = [3000, 9000];
export function buyMeat(s, n = 1) { const cost = n >= 5 ? Math.round(MEAT_PRICE * n * 0.9) : MEAT_PRICE * n; if (s.coins < cost) return { ok: false, why: 'coins' }; s.coins -= cost; s.meat += n; return { ok: true }; }
export const mewsCost = s => MEWS_PRICE[(s.mewsCap - 4) / 2] ?? null;
export const nestCost = s => NEST_PRICE[s.nestCap - 1] ?? null;
export function buyMews(s) { const c = mewsCost(s); if (c == null) return { ok: false, why: 'max' }; if (s.coins < c) return { ok: false, why: 'coins' }; s.coins -= c; s.mewsCap += 2; return { ok: true }; }
export function buyNest(s) { const c = nestCost(s); if (c == null) return { ok: false, why: 'max' }; if (s.coins < c) return { ok: false, why: 'coins' }; s.coins -= c; s.nestCap++; return { ok: true }; }

// ---- breed ----
// who may be paired: my grown hens that are not on a nest, and any grown tiercel, mine or Baba's
export function pairable(s) { return { dams: mine(s).filter(b => b.sex === 'f' && isAdult(s, b) && !nesting(s, b.id)), sires: s.birds.filter(b => b.sex === 'm' && isAdult(s, b)) }; }
export function mayPair(s, sire, dam) { return s.nests.length >= s.nestCap ? 'busy' : !sire || !dam || sire.sex !== 'm' || dam.sex !== 'f' || !isAdult(s, sire) || !isAdult(s, dam) || dam.own !== 'me' ? 'pair' : nesting(s, dam.id) ? 'nest' : dam.fed < HUNGRY ? 'hungry' : null; }
export function pair(s, sireId, damId) {
  const sire = bird(s, sireId), dam = bird(s, damId), why = mayPair(s, sire, dam); if (why) return { ok: false, why };
  const F = coi(pedMap(s), sire.id, dam.id), rng = stream(s.seed, 'breed', s.ctr.breed = (s.ctr.breed || 0) + 1);
  const eggs = layClutch(genomeOf(sire), genomeOf(dam), rng, { fert: 0.75, F, min: 1 }).filter(e => e.fertile).slice(0, 4).map(e => pack(e.g));
  s.nests.push({ sire: sire.id, dam: dam.id, F, laid: s.hunts, hatch: s.hunts + 2, eggs }); return { ok: true, n: eggs.length };
}
// eggs that are due hatch, and the chicks join the mews as far as there is room (the rest wait in the nest)
export function hatch(s) {
  const ev = [];
  for (const n of s.nests) { if (s.hunts < n.hatch) continue; let k = 0;
    while (n.eggs.length && mine(s).length < s.mewsCap) { addBird(s, unpack(n.eggs.shift()), { born: s.hunts, s: n.sire, d: n.dam, F: n.F }); s.stats.chicks++; k++; }
    if (k) ev.push({ type: 'hatch', n: k }); else if (n.eggs.length && !n.told) { n.told = 1; ev.push({ type: 'full' }); } }
  s.nests = s.nests.filter(n => n.eggs.length); return ev;
}
export { typeOf };
