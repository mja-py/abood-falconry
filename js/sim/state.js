// The whole save as one plain object, how a new game starts, and how a save is repaired, exported and imported.
// Pure: no localStorage here (js/save.js owns that), so node can build and replay careers.
import { founder, cross, pack, unpack, copies } from './genome.js';
import { stream, clamp, int } from './rng.js';
import { crc16 } from './bits.js';
import { TRAINABLE } from '../data/loci.js';
import { NAME_COUNT } from '../data/names.js';

export const SCHEMA = 1, START_COINS = 500, START_FOOD = 8;

// add a falcon to the save and to the pedigree book. o: { born, s, d, F, own: 'me' | 'baba', tr, man, n }
export function addBird(s, g, o = {}) {
  const b = { id: s.nextId++, g: pack(g), sex: g.sex, born: o.born ?? s.week, s: o.s || 0, d: o.d || 0, F: o.F || 0, n: o.n ?? int(stream(s.seed, 'name', s.nextId), NAME_COUNT),
    tr: Object.fromEntries(TRAINABLE.map(t => [t, o.tr ?? 0.2])), man: o.man ?? 0.3, w: 1, hp: 1, fe: 1, ration: 1, moult: 0, xp: 0, rec: { f: 0, c: 0 }, own: o.own || 'me', guest: o.guest ? 1 : 0 };
  s.birds.push(b); s.ped.push([b.id, b.s, b.d, b.F]); return b;
}
export function fresh(seed = 1) {
  const s = { v: SCHEMA, seed: String(seed), ctr: {}, coins: START_COINS, char: 'abood', robe: { abood: 'white', mozah: 'jal_pink' }, head: { abood: 'shemagh', mozah: 'bukhnag' }, owned: [],
    week: 0, playSec: 0, nextId: 1, birds: [], ped: [], active: 0, food: START_FOOD, gear: { hood: 'red', perch: 0, scale: 0 }, mews: { cap: 6, chambers: 1 },
    place: 'ground', quarryPick: 'hare', places: { majlis: 1, ground: 1, remah: 0 }, lesson: 0, clutch: null, licence: -1,
    facts: {}, quiz: { asked: 0, right: 0, last: [] }, bag: {}, dir: {},
    ladder: { lv: 1, set: null }, daily: { day: '', list: [] }, missionsDone: 0, badges: {}, login: { day: '', streak: 0 },
    stats: { outings: 0, flights: 0, catches: 0, hunts: 0, trains: 0, perfect: 0, clean: 0, quizRight: 0, chicks: 0, fed: 0, weeks: 0, hare: 0, sandgrouse: 0, lure: 0 },
    best: 0, runs: 0, levels: { 0: true }, seen: {}, mp: { pid: '', name: '', ok: 0 }, lastBackup: 0 };
  // Baba's birds: a proven hen that carries the first rare gene, and two tiercels to choose between in the first spring.
  // Abood's own first falcon is that hen's daughter, a first-year bird and a guaranteed carrier.
  const r = stream(s.seed, 'start');
  const hen = founder(r, { species: 'saker', sex: 'f', source: 'good', rare: { barq: 1 }, colour: ['ahmar', 'ashgar'] });
  const t1 = founder(r, { species: 'saker', sex: 'm', source: 'good', colour: ['adham', 'ahmar'] });
  const t2 = founder(r, { species: 'saker', sex: 'm', source: 'good', colour: ['akhdar', 'ashgar'] });
  const old = { own: 'baba', born: -200, tr: 0.85, man: 1 };
  const bh = addBird(s, hen, { ...old, n: 0 }), b1 = addBird(s, t1, { ...old, n: 1 }); addBird(s, t2, { ...old, n: 2 });
  let kid; do { kid = cross(t1, hen, r); } while (kid.sex !== 'f' || copies(kid, 'barq') !== 1);
  s.active = addBird(s, kid, { born: -22, s: b1.id, d: bh.id, man: 0.3, tr: 0.2 }).id;
  return s;
}
export const MIGRATIONS = {};   // n → function(save at version n) returning version n + 1

const num = (v, d, lo, hi) => (typeof v === 'number' && isFinite(v) ? clamp(v, lo, hi) : d);
// make any object safe to play: fill what is missing, clamp what is out of range, drop what cannot be read. Never throws.
export function tidy(raw) {
  const base = fresh(raw && raw.seed != null ? raw.seed : 1);
  if (!raw || typeof raw !== 'object') return base;
  const s = Object.assign({}, base, raw); s.v = SCHEMA; s.seed = String(s.seed);
  for (const k of ['ctr', 'robe', 'head', 'gear', 'mews', 'places', 'facts', 'quiz', 'bag', 'dir', 'ladder', 'daily', 'badges', 'login', 'stats', 'seen', 'mp', 'levels'])
    s[k] = raw[k] && typeof raw[k] === 'object' && !Array.isArray(raw[k]) ? Object.assign({}, base[k], raw[k]) : base[k];
  s.coins = Math.round(num(s.coins, START_COINS, 0, 1e9)); s.food = num(s.food, 0, 0, 9999); s.week = Math.round(num(s.week, 0, 0, 1e6)); s.playSec = num(s.playSec, 0, 0, 1e9);
  s.missionsDone = Math.round(num(s.missionsDone, 0, 0, 1e6)); s.lesson = Math.round(num(s.lesson, 0, 0, 99)); s.licence = Math.round(num(s.licence, -1, -1, 1e5));
  if (s.char !== 'abood' && s.char !== 'mozah') s.char = 'abood';
  if (!Array.isArray(s.owned)) s.owned = [];
  if (!Array.isArray(raw.birds)) { s.birds = base.birds; s.ped = base.ped; s.nextId = base.nextId; s.active = base.active; }
  else {
    s.birds = raw.birds.filter(b => b && typeof b === 'object' && unpack(b.g) && Number.isInteger(b.id) && b.id > 0).map(b => {
      const g = unpack(b.g), tr = {}; for (const t of TRAINABLE) tr[t] = num(b.tr && b.tr[t], 0.2, 0, 1);
      return { id: b.id, g: b.g, sex: g.sex, born: Math.round(num(b.born, 0, -1e5, 1e6)), s: b.s | 0, d: b.d | 0, F: num(b.F, 0, 0, 1), n: Math.round(num(b.n, 0, 0, NAME_COUNT - 1)), tr,
        man: num(b.man, 0.3, 0, 1), w: num(b.w, 1, 0.7, 1.3), hp: num(b.hp, 1, 0, 1), fe: num(b.fe, 1, 0, 1), ration: Math.round(num(b.ration, 1, 0, 2)), moult: b.moult ? 1 : 0, xp: Math.round(num(b.xp, 0, 0, 1e7)),
        rec: { f: Math.round(num(b.rec && b.rec.f, 0, 0, 1e7)), c: Math.round(num(b.rec && b.rec.c, 0, 0, 1e7)) }, own: b.own === 'baba' ? 'baba' : 'me', guest: b.guest ? 1 : 0, fedWeek: Math.round(num(b.fedWeek, -1, -1, 1e6)) };
    });
    s.ped = Array.isArray(raw.ped) ? raw.ped.filter(r => Array.isArray(r) && Number.isInteger(r[0])).map(r => [r[0], r[1] | 0, r[2] | 0, num(r[3], 0, 0, 1)]) : [];
    const known = new Set(s.ped.map(r => r[0])); for (const b of s.birds) if (!known.has(b.id)) s.ped.push([b.id, b.s, b.d, b.F]);
    s.nextId = Math.max(Math.round(num(s.nextId, 1, 1, 1e9)), 1 + Math.max(0, ...s.ped.map(r => r[0])));
    if (!s.birds.some(b => b.id === s.active && b.own === 'me')) { const mine = s.birds.find(b => b.own === 'me'); s.active = mine ? mine.id : 0; }
    if (!s.birds.some(b => b.own === 'me')) { const f = fresh(s.seed); s.birds = f.birds; s.ped = f.ped; s.nextId = f.nextId; s.active = f.active; }   // a falconer always has a falcon
  }
  if (s.clutch && !(typeof s.clutch === 'object' && Array.isArray(s.clutch.eggs))) s.clutch = null;
  if (s.clutch) s.clutch.eggs = s.clutch.eggs.filter(e => e && (!e.fertile || unpack(e.g)));
  if (!Array.isArray(s.daily.list)) s.daily.list = [];
  if (!Array.isArray(s.quiz.last)) s.quiz.last = [];
  return s;
}
// load whatever was stored: run the migrations in order, then tidy. A save from a newer game is refused, never overwritten.
export function upgrade(raw) {
  if (!raw || typeof raw !== 'object') return { ok: false, why: 'empty' };
  let s = raw; const v = Number.isInteger(s.v) ? s.v : 1;
  if (v > SCHEMA) return { ok: false, why: 'newer' };
  for (let n = v; n < SCHEMA; n++) { if (!MIGRATIONS[n]) return { ok: false, why: 'gap' }; s = MIGRATIONS[n](JSON.parse(JSON.stringify(s))); }
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
