// The falconer's year as rules: the calendar, caring for a bird, what an outing teaches it, Baba's first clutch,
// the shop and the difficulty director. Every function takes the save, changes it, and returns events as plain data
// (ids and numbers, never text), so the browser and the balance tool run the very same career.
// Time moves only when the player plays: one finished outing is one week.
import { unpack } from './genome.js';
import { effective, potential } from './phenotype.js';
import { stream, clamp } from './rng.js';
import { layClutch, FERTILITY } from './breed.js';
import { coi } from './pedigree.js';
import { addBird } from './state.js';
import { pack } from './genome.js';
import { TRAINABLE, ADULT_WEEKS } from '../data/loci.js';
import { QUARRY } from '../data/quarry.js';
import { FACTS } from '../data/facts.js';

// ---- the calendar: 48 play-weeks, starting when the hunting season opens (20 October) ----
export const WEEKS = 48;
export const SEASONS = [['hunt', 0, 16], ['fest', 16, 24], ['breed', 24, 36], ['moult', 36, 48]];
export const weekOfYear = week => ((week % WEEKS) + WEEKS) % WEEKS;
export const yearOf = week => Math.floor(week / WEEKS);
export const seasonOf = week => { const w = weekOfYear(week); return w < 16 ? 'hunt' : w < 24 ? 'fest' : w < 36 ? 'breed' : 'moult'; };
export const seasonLeft = week => { const w = weekOfYear(week); return SEASONS.find(s => w < s[2])[2] - w; };

// ---- birds ----
const cache = new Map();
export function genomeOf(b) { let g = cache.get(b.g); if (!g) { g = unpack(b.g); if (cache.size > 400) cache.clear(); cache.set(b.g, g); } return g; }
export const bird = (s, id) => s.birds.find(b => b.id === id);
export const active = s => bird(s, s.active);
export const mine = s => s.birds.filter(b => b.own === 'me');
export const age = (s, b) => s.week - b.born;
export const stageOf = (s, b) => (age(s, b) < 48 ? 'farkh' : 'jirnas');        // first-year bird, or one that has moulted
export const isAdult = (s, b) => age(s, b) >= ADULT_WEEKS;
// condition: at flying weight, healthy and with whole feathers a bird gives everything it has
export const cond = b => clamp(1 - Math.min(0.09, Math.abs(b.w - 1) * 1.1) - (1 - b.hp) * 0.04 - (1 - b.fe) * 0.04, 0.85, 1);
export const statsOf = (s, b) => effective(genomeOf(b), b.F, { tr: b.tr, cond: cond(b) });
export const potentialOf = b => potential(genomeOf(b), b.F);
export const pedMap = s => new Map(s.ped.map(r => [r[0], { s: r[1], d: r[2], F: r[3] }]));
// may this bird fly today? null when it may, otherwise the reason
export function grounded(s, b) { return !b ? 'none' : b.moult ? 'moult' : b.hp < 0.45 ? 'sick' : b.w < 0.86 ? 'thin' : null; }

export const LESSON_DONE = 1;
export const RATION = [{ food: 0.7, aim: 0.94 }, { food: 1, aim: 1 }, { food: 1.3, aim: 1.07 }];   // light, normal, full
export const LICENCE_FEE = 127;                                                 // the real seasonal fee in Abu Dhabi, in dirhams

// one week passes
export function weekTick(s) {
  const ev = [], before = seasonOf(s.week); s.week++; s.stats.weeks++;
  const now = seasonOf(s.week);
  for (const b of mine(s)) {
    const r = RATION[b.ration] || RATION[1];
    if (s.food >= r.food) { s.food = Math.round((s.food - r.food) * 10) / 10; b.w += (r.aim - b.w) * 0.5; }
    else { b.w -= 0.04; ev.push({ type: 'hungry', id: b.id }); }
    b.w = clamp(b.w, 0.78, 1.15);
    b.hp = clamp(b.hp + (b.w < 0.9 ? -0.08 : s.gear.perch ? 0.05 : 0.03), 0, 1);
    if (b.moult) b.fe = clamp(b.fe + 0.1, 0, 1);
  }
  if (now !== before) {
    ev.push({ type: 'season', season: now, year: yearOf(s.week) });
    if (now === 'moult') for (const b of mine(s)) if (age(s, b) >= 40) { b.moult = 1; for (const t of TRAINABLE) b.tr[t] = Math.max(0.2, b.tr[t] * 0.85); }
    if (now === 'hunt') for (const b of mine(s)) { b.moult = 0; b.fe = 1; }
  }
  const c = s.clutch;
  if (c && c.stage === 'eggs' && s.week >= c.hatch) { c.eggs = c.eggs.filter(e => e.fertile); c.stage = 'chicks'; ev.push({ type: 'hatch', n: c.eggs.length }); if (!c.eggs.length) s.clutch = null; }
  else if (c && c.stage === 'chicks' && s.week >= c.fledge) { c.stage = 'fledged'; ev.push({ type: 'fledge', n: c.eggs.length, baba: !!c.baba }); if (!c.baba) keepChicks(s, c.eggs.map((e, i) => i)); }
  return ev;
}

// ---- outings ----
const GAIN = { train: 0.06, hunt: 0.045 };
export const mult = s => Math.min(2.5, 1 + (s.ladder.lv - 1) * 0.1);
// the director keeps each quarry near the player's own level: a little faster and tighter after a run of catches
export function tune(s, quarry) {
  const d = s.dir[quarry]; if (!d || d.n < 4 || QUARRY[quarry].tier === 0) return { speed: 1, window: 1, cover: 1 };
  return { speed: clamp(1 + (d.r - 0.7) * 0.3, 0.92, 1.1), window: clamp(1 - (d.r - 0.7) * 0.6, 0.8, 1.25), cover: 1 };
}
// what the player may do at a place today: { ok } or { ok: false, why }
export function mayGo(s, place) {
  const b = active(s);
  if (place === 'majlis') return { ok: true };
  const why = grounded(s, b); if (why) return { ok: false, why };
  if (place === 'ground') return { ok: true };
  if (!s.places[place]) return { ok: false, why: 'locked' };
  if (seasonOf(s.week) !== 'hunt') return { ok: false, why: 'closed' };
  if (s.licence !== yearOf(s.week)) return { ok: false, why: 'licence' };
  return { ok: true };
}
// after a flight outing (sum is hunt-sim's summary). kind: 'train' | 'hunt'
export function finishOuting(s, kind, quarry, sum) {
  const b = active(s), ev = [], st = potentialOf(b), q = sum.flights ? sum.caught / sum.flights : 0;
  const base = GAIN[kind] * (0.6 + st.temper / 125) * (0.6 + 0.4 * q), gains = {};
  const weight = { speed: 1, stamina: 1, burst: 0.7 + 0.6 * (sum.perfect / Math.max(1, sum.flights)), stoop: 0.7 + 0.6 * q, accuracy: 0.7 + 0.6 * (sum.clean / Math.max(1, sum.flights)), agility: 0.8 + 0.1 * Math.min(4, sum.misses) };
  for (const t of TRAINABLE) { const before = b.tr[t]; b.tr[t] = clamp(before + base * weight[t], 0, 1); gains[t] = b.tr[t] - before; }
  b.man = clamp(b.man + 0.08, 0, 1); b.xp += sum.flights; b.rec.f += sum.flights; b.rec.c += sum.caught; b.w = clamp(b.w - 0.012, 0.78, 1.15);
  if (kind === 'hunt' && sum.misses && !statsOf(s, b).flags.feathers) { // a hard miss can break a feather; the hospital mends it
    const r = stream(s.seed, 'feather', s.ctr.feather = (s.ctr.feather || 0) + 1);
    if (r() < 0.07 * sum.misses) { b.fe = clamp(b.fe - 0.2, 0, 1); ev.push({ type: 'feather', id: b.id }); }
  }
  const coins = Math.round(sum.score * mult(s)); s.coins += coins;
  const S = s.stats; S.outings++; S.flights += sum.flights; S.catches += sum.caught; S.perfect += sum.perfect; S.clean += sum.clean; S[quarry] = (S[quarry] || 0) + sum.caught; S[kind === 'hunt' ? 'hunts' : 'trains']++;
  s.bag[quarry] = (s.bag[quarry] || 0) + sum.caught; s.runs++; if (sum.score > s.best) s.best = sum.score;
  const d = s.dir[quarry] || (s.dir[quarry] = { r: 0.7, n: 0 }); d.r = d.n ? d.r * 0.7 + q * 0.3 : q; d.n++;
  if (kind === 'train' && s.lesson < LESSON_DONE) { s.lesson = LESSON_DONE; s.places.remah = 1; ev.push({ type: 'lessonDone' }); }
  const fact = nextFact(s, kind === 'hunt' ? ['law', 'quarry', 'care'] : ['craft', 'care', 'history']);
  ev.push(...weekTick(s));
  return { coins, gains, fact, events: ev, trust: b.man };
}
// the next fact the player has not seen yet, preferring the given categories; null when the Book is full
export function nextFact(s, prefer = []) {
  const open = FACTS.filter(f => !s.facts[f.id]); if (!open.length) return null;
  const f = open.find(x => prefer.includes(x.cat)) || open[0]; s.facts[f.id] = 1; return f.id;
}

// ---- care ----
export function setRation(s, id, r) { const b = bird(s, id); if (b && b.own === 'me') b.ration = clamp(r | 0, 0, 2); }
// feeding from the fist builds trust; once a week per bird
export function feedOnFist(s, id) {
  const b = bird(s, id); if (!b || b.own !== 'me' || b.fedWeek === s.week || s.food < 0.3) return false;
  s.food = Math.round((s.food - 0.3) * 10) / 10; b.fedWeek = s.week; b.man = clamp(b.man + 0.05, 0, 1); b.w = clamp(b.w + 0.01, 0.78, 1.15); s.stats.fed++; return true;
}

// ---- the shop: in-game dirhams only ----
export const SHOP = [
  { id: 'food', price: 20, group: 'food' }, { id: 'food10', price: 180, group: 'food' },
  { id: 'licence', price: LICENCE_FEE, group: 'papers' },
  { id: 'scale', price: 200, group: 'gear', once: 'scale' }, { id: 'perch', price: 400, group: 'gear', once: 'perch' },
  { id: 'hood_gold', price: 150, group: 'hood' }, { id: 'hood_teal', price: 150, group: 'hood' }, { id: 'hood_green', price: 150, group: 'hood' },
  { id: 'imping', price: 80, group: 'hospital' }, { id: 'checkup', price: 100, group: 'hospital' }, { id: 'dna', price: 300, group: 'hospital' },
];
export const HOODS = { red: '#c8202b', hood_gold: '#e0a72a', hood_teal: '#1f7a74', hood_green: '#119a4b' };
export function owned(s, it) { return it.once ? !!s.gear[it.once] : it.group === 'hood' ? s.owned.includes(it.id) : it.id === 'licence' ? s.licence === yearOf(s.week) : false; }
export function buy(s, id) {
  const it = SHOP.find(x => x.id === id), b = active(s); if (!it) return { ok: false, why: 'none' };
  if (owned(s, it)) { if (it.group === 'hood') { s.gear.hood = id; return { ok: true, worn: true }; } return { ok: false, why: 'owned' }; }
  if (id === 'imping' && b.fe >= 1) return { ok: false, why: 'fine' };
  if (id === 'checkup' && b.hp >= 1) return { ok: false, why: 'fine' };
  if (id === 'dna' && s.seen['dna' + b.id]) return { ok: false, why: 'owned' };
  if (s.coins < it.price) return { ok: false, why: 'coins' };
  s.coins -= it.price;
  if (id === 'food') s.food += 1; else if (id === 'food10') s.food += 10; else if (id === 'licence') s.licence = yearOf(s.week);
  else if (it.once) s.gear[it.once] = 1; else if (it.group === 'hood') { s.owned.push(id); s.gear.hood = id; }
  else if (id === 'imping') b.fe = 1; else if (id === 'checkup') b.hp = 1; else if (id === 'dna') s.seen['dna' + b.id] = 1;
  return { ok: true };
}

// ---- breeding ----
// who may be paired this spring: hens and tiercels old enough, mine or Baba's
export function pairable(s) {
  const ok = b => isAdult(s, b) && !b.guest;
  return { dams: s.birds.filter(b => b.sex === 'f' && ok(b)), sires: s.birds.filter(b => b.sex === 'm' && ok(b)) };
}
export function mayPair(s) { return s.clutch ? 'busy' : seasonOf(s.week) !== 'breed' ? 'season' : null; }
export function startClutch(s, sireId, damId) {
  const why = mayPair(s), sire = bird(s, sireId), dam = bird(s, damId);
  if (why || !sire || !dam || sire.sex !== 'm' || dam.sex !== 'f' || !isAdult(s, sire) || !isAdult(s, dam)) return { ok: false, why: why || 'pair' };
  const F = coi(pedMap(s), sire.id, dam.id), first = !s.stats.chicks && !s.seen.clutch1, baba = dam.own === 'baba';
  const rng = stream(s.seed, 'breed', s.ctr.breed = (s.ctr.breed || 0) + 1);
  const eggs = layClutch(genomeOf(sire), genomeOf(dam), rng, { fert: FERTILITY.natural, F, min: first ? 2 : 0 }).map(e => (e.fertile ? { fertile: true, g: pack(e.g), mut: e.mut || null } : { fertile: false }));
  s.clutch = { sire: sire.id, dam: dam.id, F, laid: s.week, hatch: s.week + 5, fledge: s.week + 12, stage: 'eggs', baba, eggs, candled: 0 };
  s.seen.clutch1 = 1; return { ok: true, n: eggs.length };
}
// the fledged chicks at the given indexes join the mews (as many as there is room for); the clutch is then over
export function keepChicks(s, idx) {
  const c = s.clutch; if (!c || c.stage !== 'fledged') return [];
  const kept = [];
  for (const i of idx) { const e = c.eggs[i]; if (!e || mine(s).length >= s.mews.cap) continue; kept.push(addBird(s, unpack(e.g), { born: c.hatch, s: c.sire, d: c.dam, F: c.F, man: 0.5, tr: 0.2 })); s.stats.chicks++; }
  s.clutch = null; return kept;
}
