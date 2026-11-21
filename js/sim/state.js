// The whole save as one plain object, how a new game starts, and how a save is repaired, exported and imported.
// Pure: no localStorage here (js/save.js owns that), so node can build and replay careers.
// Version 2 is the open-desert game: time is counted in hunts, and a falcon has five trained levels and a hunger bar.
import { founder, pack, unpack } from './genome.js';
import { stream, clamp, int } from './rng.js';
import { crc16 } from './bits.js';
import { NAME_COUNT } from '../data/names.js';

export const SCHEMA = 2, START_COINS = 300, START_MEAT = 4;
export const STATS = ['speed', 'stamina', 'stoop', 'agility', 'eyes'];
const zeroLv = () => ({ speed: 0, stamina: 0, stoop: 0, agility: 0, eyes: 0 });

// add a falcon to the save and to the pedigree book. o: { born (in hunts), s, d, F, own: 'me' | 'baba', n }
export function addBird(s, g, o = {}) {
  const b = { id: s.nextId++, g: pack(g), sex: g.sex, born: o.born ?? s.hunts, s: o.s || 0, d: o.d || 0, F: o.F || 0, n: o.n ?? int(stream(s.seed, 'name', s.nextId), NAME_COUNT),
    lv: Object.assign(zeroLv(), o.lv), fed: o.fed ?? 1, rec: { f: 0, c: 0 }, own: o.own || 'me' };
  s.birds.push(b); s.ped.push([b.id, b.s, b.d, b.F]); return b;
}
export function fresh(seed = 1) {
  const s = { v: SCHEMA, seed: String(seed), ctr: {}, coins: START_COINS, char: 'abood', robe: { abood: 'white', mozah: 'jal_pink' }, head: { abood: 'shemagh', mozah: 'bukhnag' }, owned: [],
    hunts: 0, xp: 0, playSec: 0, nextId: 1, birds: [], ped: [], active: 0, meat: START_MEAT, mewsCap: 4, nestCap: 1, nests: [], market: { stamp: -99, offers: [], orders: [] },
    lesson: 0, facts: {}, bag: {}, ladder: { lv: 1, set: null }, missionsDone: 0, badges: {},
    stats: { hunts: 0, flights: 0, catches: 0, hare: 0, sandgrouse: 0, houbara: 0, fed: 0, enhanced: 0, sold: 0, chicks: 0, bought: 0, orders: 0 },
    best: 0, seen: {}, mp: { pid: '', name: '', ok: 0 }, lastBackup: 0, hood: 'red' };
  // Baba's two tiercels are there to breed from on the first day; one carries the first rare gene, the other a pale colour.
  // Abood's own falcon is a grown saker hen that carries the rare gene too, so a first clutch can already show it.
  const r = stream(s.seed, 'start'), old = { own: 'baba', born: -40, lv: { speed: 3, stamina: 3, stoop: 3, agility: 3, eyes: 3 } };
  addBird(s, founder(r, { species: 'saker', sex: 'm', source: 'good', rare: { barq: 1 }, colour: ['adham', 'ahmar'] }), { ...old, n: 1 });
  addBird(s, founder(r, { species: 'saker', sex: 'm', source: 'good', colour: ['akhdar', 'ashgar'] }), { ...old, n: 2 });
  s.active = addBird(s, founder(r, { species: 'saker', sex: 'f', source: 'starter', rare: { barq: 1 }, colour: ['ahmar', 'ashgar'] }), { born: -8 }).id;
  return s;
}
// n → function(save at version n) returning version n + 1
export const MIGRATIONS = {
  1: old => { // the first slice counted weeks and seasons: keep the falcons, the dirhams and the facts, start the new counters
    const s = fresh(old.seed != null ? old.seed : 1); s.coins = old.coins; s.char = old.char; s.robe = old.robe; s.head = old.head; s.facts = old.facts || {}; s.seen = old.seen || {}; s.mp = old.mp; s.playSec = old.playSec || 0;
    s.missionsDone = old.missionsDone || 0; s.meat = Math.round(old.food || START_MEAT); s.lesson = old.lesson ? 1 : 0;
    if (Array.isArray(old.birds) && old.birds.length) {
      s.birds = old.birds.map(b => ({ id: b.id, g: b.g, sex: b.sex, born: -8, s: b.s, d: b.d, F: b.F, n: b.n, lv: Object.assign(zeroLv(), b.tr ? { speed: Math.round(b.tr.speed * 4), stamina: Math.round(b.tr.stamina * 4), stoop: Math.round(b.tr.stoop * 4), agility: Math.round(b.tr.agility * 4) } : {}), fed: 1, rec: b.rec || { f: 0, c: 0 }, own: b.own }));
      s.ped = old.ped || s.ped; s.nextId = old.nextId; s.active = old.active;
    }
    s.v = 2; return s;
  },
};

const num = (v, d, lo, hi) => (typeof v === 'number' && isFinite(v) ? clamp(v, lo, hi) : d);
// make any object safe to play: fill what is missing, clamp what is out of range, drop what cannot be read. Never throws.
export function tidy(raw) {
  const base = fresh(raw && raw.seed != null ? raw.seed : 1);
  if (!raw || typeof raw !== 'object') return base;
  const s = Object.assign({}, base, raw); s.v = SCHEMA; s.seed = String(s.seed);
  for (const k of ['ctr', 'robe', 'head', 'facts', 'bag', 'ladder', 'badges', 'stats', 'seen', 'mp', 'market'])
    s[k] = raw[k] && typeof raw[k] === 'object' && !Array.isArray(raw[k]) ? Object.assign({}, base[k], raw[k]) : base[k];
  s.coins = Math.round(num(s.coins, START_COINS, 0, 1e9)); s.meat = Math.round(num(s.meat, 0, 0, 9999)); s.hunts = Math.round(num(s.hunts, 0, 0, 1e7)); s.xp = Math.round(num(s.xp, 0, 0, 1e9)); s.playSec = num(s.playSec, 0, 0, 1e9);
  s.missionsDone = Math.round(num(s.missionsDone, 0, 0, 1e6)); s.lesson = s.lesson ? 1 : 0; s.mewsCap = Math.round(num(s.mewsCap, 4, 4, 40)); s.nestCap = Math.round(num(s.nestCap, 1, 1, 8));
  if (s.char !== 'abood' && s.char !== 'mozah') s.char = 'abood';
  if (!Array.isArray(s.owned)) s.owned = [];
  if (!Array.isArray(raw.birds)) { s.birds = base.birds; s.ped = base.ped; s.nextId = base.nextId; s.active = base.active; }
  else {
    s.birds = raw.birds.filter(b => b && typeof b === 'object' && unpack(b.g) && Number.isInteger(b.id) && b.id > 0).map(b => {
      const g = unpack(b.g), lv = {}; for (const t of STATS) lv[t] = Math.round(num(b.lv && b.lv[t], 0, 0, 5));
      return { id: b.id, g: b.g, sex: g.sex, born: Math.round(num(b.born, 0, -1e6, 1e7)), s: b.s | 0, d: b.d | 0, F: num(b.F, 0, 0, 1), n: Math.round(num(b.n, 0, 0, NAME_COUNT - 1)), lv, fed: num(b.fed, 1, 0, 1),
        rec: { f: Math.round(num(b.rec && b.rec.f, 0, 0, 1e7)), c: Math.round(num(b.rec && b.rec.c, 0, 0, 1e7)) }, own: b.own === 'baba' ? 'baba' : 'me' };
    });
    s.ped = Array.isArray(raw.ped) ? raw.ped.filter(r => Array.isArray(r) && Number.isInteger(r[0])).map(r => [r[0], r[1] | 0, r[2] | 0, num(r[3], 0, 0, 1)]) : [];
    const known = new Set(s.ped.map(r => r[0])); for (const b of s.birds) if (!known.has(b.id)) s.ped.push([b.id, b.s, b.d, b.F]);
    s.nextId = Math.max(Math.round(num(s.nextId, 1, 1, 1e9)), 1 + Math.max(0, ...s.ped.map(r => r[0])));
    if (!s.birds.some(b => b.own === 'me')) { const f = fresh(s.seed); s.birds = f.birds; s.ped = f.ped; s.nextId = f.nextId; s.active = f.active; }   // a falconer always has a falcon
    if (!s.birds.some(b => b.id === s.active && b.own === 'me')) s.active = s.birds.find(b => b.own === 'me').id;
  }
  const ids = new Set(s.birds.map(b => b.id));
  s.nests = (Array.isArray(raw.nests) ? raw.nests : []).filter(n => n && Array.isArray(n.eggs) && ids.has(n.dam)).map(n => ({ sire: n.sire | 0, dam: n.dam | 0, F: num(n.F, 0, 0, 1), laid: Math.round(num(n.laid, s.hunts, -1e6, 1e7)), hatch: Math.round(num(n.hatch, s.hunts + 2, -1e6, 1e7)), eggs: n.eggs.filter(e => typeof e === 'string' && unpack(e)) })).filter(n => n.eggs.length).slice(0, s.nestCap);
  s.market.offers = (Array.isArray(s.market.offers) ? s.market.offers : []).filter(o => o && unpack(o.g) && Number.isFinite(o.price));
  s.market.orders = (Array.isArray(s.market.orders) ? s.market.orders : []).filter(o => o && typeof o.want === 'string');
  s.market.stamp = Math.round(num(s.market.stamp, -99, -1e6, 1e7));
  return s;
}
// load whatever was stored: run the migrations in order, then tidy. A save from a newer game is refused, never overwritten.
export function upgrade(raw) {
  if (!raw || typeof raw !== 'object') return { ok: false, why: 'empty' };
  let s = raw; const v = Number.isInteger(s.v) ? s.v : 1;
  if (v > SCHEMA) return { ok: false, why: 'newer' };
  for (let n = v; n < SCHEMA; n++) { if (!MIGRATIONS[n]) return { ok: false, why: 'gap' }; try { s = MIGRATIONS[n](JSON.parse(JSON.stringify(s))); } catch (e) { return { ok: false, why: 'damaged' }; } }
  return { ok: true, save: tidy(s) };
}

// ---- backup: the whole save as text the player can keep in a file or a note ----
const toB64 = str => { const bytes = new TextEncoder().encode(str); let bin = ''; for (const b of bytes) bin += String.fromCharCode(b); return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const fromB64 = b64 => { const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/')); const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); return new TextDecoder().decode(bytes); };
export function exportSave(s) { const body = toB64(JSON.stringify(s)); return `ABOODF${SCHEMA}.${body}.${crc16(body).toString(16).padStart(4, '0')}`; }
export function importSave(text) {
  const m = /^ABOODF(\d+)\.([A-Za-z0-9_-]+)\.([0-9a-f]{4})$/.exec(String(text || '').trim());
  if (!m) return { ok: false, why: 'format' };
  if (crc16(m[2]).toString(16).padStart(4, '0') !== m[3]) return { ok: false, why: 'damaged' };
  let raw; try { raw = JSON.parse(fromB64(m[2])); } catch (e) { return { ok: false, why: 'damaged' }; }
  return upgrade(raw);
}
