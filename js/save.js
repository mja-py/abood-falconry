// Where the save lives on this device, and the small family facade the shell (ui.js, race.js, audio.js) expects.
// The rules are in js/sim/*; this file only loads, stores, backs up and restores.
// Dirhams are an in-game currency only: there are no real payments, ever.
// Keys: 'abood-falconry' is this game's save ('.bak' = a save that could not be read, '.prev' = the save as it stood when
// this session began, '.before-import' = what a restore replaced). 'abood-lang' and 'abood-muted' are shared by the family.
import { fresh, upgrade, exportSave, importSave, SCHEMA } from './sim/state.js';
import * as M from './sim/missions.js';
import { mult as careerMult } from './sim/career.js';

export const GAME_ID = 'falconry';
const KEY = 'abood-' + GAME_ID;
export { SCHEMA };
const mem = {};
const store = { // falls back to memory when storage is closed (private mode); set() says whether the device kept it
  get(k) { try { const v = localStorage.getItem(k); return v == null ? (k in mem ? mem[k] : null) : v; } catch (e) { return k in mem ? mem[k] : null; } },
  set(k, v) { mem[k] = v; try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  del(k) { delete mem[k]; try { localStorage.removeItem(k); } catch (e) {} },
};
const newSeed = () => String((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0);
let S, frozen = false;                     // frozen: the stored save is from a newer game; play continues in memory only
export let writeFailed = false;
function load() {
  const raw = store.get(KEY);
  if (!raw) { S = fresh(newSeed()); return; }
  let obj = null; try { obj = JSON.parse(raw); } catch (e) {}
  const r = obj ? upgrade(obj) : { ok: false, why: 'damaged' };
  if (r.ok) { S = r.save; store.set(KEY + '.prev', raw); return; }
  if (r.why === 'newer') { frozen = true; S = fresh(newSeed()); return; }
  store.set(KEY + '.bak', raw); S = fresh(newSeed());
}
load();
export const data = () => S;
export const isFrozen = () => frozen;
export function save() {
  if (frozen) return false;
  let ok = store.set(KEY, JSON.stringify(S));
  if (!ok) { store.del(KEY + '.prev'); store.del(KEY + '.before-import'); ok = store.set(KEY, JSON.stringify(S)); }   // make room, then try once more
  writeFailed = !ok; return ok;
}
export function resetSave() { S = fresh(newSeed()); save(); }
export const bytes = () => { let n = 0; for (const k of [KEY, KEY + '.prev', KEY + '.bak', KEY + '.before-import']) { const v = store.get(k); if (v) n += v.length; } return n; };
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const today = () => ymd(new Date());
const yesterday = () => { const y = new Date(); y.setDate(y.getDate() - 1); return ymd(y); };

// backup and restore: the whole save as text
export function backup() { S.lastBackup = S.playSec; save(); return exportSave(S); }
export const peek = text => importSave(text);                                   // look at a backup without touching the save
export function restore(text) {
  const r = importSave(text); if (!r.ok) return r;
  const cur = store.get(KEY); if (cur) store.set(KEY + '.before-import', cur);
  S = r.save; frozen = false; save(); return { ok: true };
}
export const backupDue = () => S.playSec - (S.lastBackup || 0) > 10 * 3600;      // Baba suggests a backup every ten hours of play

// money
export const coins = () => S.coins;
export function addCoins(n) { S.coins = Math.max(0, Math.round(S.coins + n)); save(); return S.coins; }
export function spend(n) { if (S.coins < n) return false; S.coins -= n; save(); return true; }
export const mult = () => careerMult(S);

// characters and looks
export const char = () => S.char;
export const girlOpen = () => M.girlOpen(S);
export function setChar(ch) { if (ch !== 'abood' && ch !== 'mozah') return false; if (ch === 'mozah' && !girlOpen()) return false; S.char = ch; save(); return true; }
export const look = () => ({ robe: S.robe[S.char], head: S.head[S.char] });
export function setLook(kind, id) { S[kind][S.char] = id; save(); }
export const owns = id => S.owned.includes(id);
export function own(id) { if (!owns(id)) { S.owned.push(id); save(); } }

// shared mute flag
export const muted = () => { try { return localStorage.getItem('abood-muted') === '1'; } catch (e) { return false; } };
export const setMuted = b => { try { localStorage.setItem('abood-muted', b ? '1' : '0'); } catch (e) {} };

// one-off flags (story shown, a card seen …)
export const seen = k => !!S.seen[k];
export function markSeen(k) { S.seen[k] = 1; save(); }

// the calendar-day staples
export const dailyList = () => M.dailyList(S, today());
export const loginDay = () => M.loginDay(S, today(), yesterday());
export function claimLogin() { const n = M.claimLogin(S, today(), yesterday()); if (n) save(); return n; }
