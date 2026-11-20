// Entry point and game loop for Abood the Falconer. The family shell (loader → language picker → menu → play with HUD →
// pause → results with the dirham exchange) is kept; the menu is the camp, and an outing is one week of the falconer's
// year. The rules live in js/sim/* (pure, seeded, tested in node); this file boots, routes, takes input and draws.
// Lines marked `// online` belong to the optional race module, parked until the friends milestone.
import { T, TL, applyI18n, isGirl, setGirl, nf, lang, setLang } from './i18n.js';
import * as S from './save.js';
import * as A from './audio.js';
import * as U from './ui.js';
import * as R from './race.js'; // online
import { person, ABOOD, MOZAH, BABA, INK } from './art.js';
import * as C from './sim/career.js';
import * as M from './sim/missions.js';
import { hash32 } from './sim/rng.js';
import { summary } from './sim/hunt-sim.js';
import { makeBot } from './sim/hunt-bot.js';
import { makeHunt, CEIL, GY } from './scenes/hunt.js';
import { drawFalcon, drawBlock, drawChick } from './art/falcon.js';
import { sky, dunes, tent, fire, ghaf, placeArt, SKIES, QUARRY_ART } from './art/desert.js';
import { lookOf, birdName, birdLine, portrait } from './ui/falconcard.js';
import './ui/mews.js';
import { breedDot } from './ui/breed.js';
import './ui/market.js';
import { startMajlis, setMajlisDone } from './ui/book.js';
import { missionsDot } from './ui/missions.js';
import { TRAINABLE } from './data/loci.js';

const BUILD = '__BUILD__';
const cv = U.$('cv'), ctx = cv.getContext('2d');
// ---- the play field (the family rule; the width follows Abood Space v3.6) ----
// One field shape on every screen: 400 logical units tall and 960 wide, at most 1000. Taller screens get bands above
// and below, wider ones bands at the sides, so the chase is the same everywhere.
const H = 400, WORLD_W = 960, WORLD_MAX = 1000;
let W = WORLD_W, scale = 1, offX = 0, offY = 0, dpr = 1;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TAU = Math.PI * 2;
function resize() {
  dpr = Math.min(devicePixelRatio || 1, 2); const w = innerWidth, h = innerHeight;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px';
  scale = h / H; W = w / scale; offX = 0; offY = 0;
  if (W < WORLD_W) { scale = w / WORLD_W; W = WORLD_W; offY = (h / scale - H) / 2; }
  else if (W > WORLD_MAX) { W = WORLD_MAX; offX = (w / scale - WORLD_MAX) / 2; }
  document.documentElement.style.setProperty('--band-x', (offX * scale).toFixed(1) + 'px');
  document.documentElement.style.setProperty('--band-y', (offY * scale).toFixed(1) + 'px');
}
addEventListener('resize', resize); resize();

// ---- state ----
let st = 'boot', t = 0, last = 0, scene = null, saveT = 0, bot = null, pending = null;
const intent = { ty: 0.25, act: false, hold: false };
const errors = []; addEventListener('error', e => { errors.push(String(e.message)); });
const PLACES = [{ id: 'majlis' }, { id: 'ground' }, { id: 'remah', quarry: ['hare', 'sandgrouse'] }, { id: 'marzoom', soon: 1 }, { id: 'liwa', soon: 1 }];
const who = () => (isGirl() ? MOZAH(S.look().robe, S.look().head) : ABOOD(S.look().robe, S.look().head));
const hoodCol = () => C.HOODS[S.data().gear.hood] || C.HOODS.red;

// ---- boot: loader with the family steps (fonts → art → sound → ready) ----
async function boot() {
  U.loader(0.05, T('ld_fonts'));
  try { await document.fonts.load('800 20px "Baloo Bhaijaan 2"'); await document.fonts.load('700 20px "Baloo Bhaijaan 2"'); } catch (e) {}
  U.loader(0.3, T('ld_art')); drawLoaderArt();
  U.loader(0.45, T('ld_sound'));
  await A.initAudio(f => U.loader(0.45 + f * 0.5));
  A.setBpm(104);
  U.loader(1, T('ld_ready')); U.$('ldTip').textContent = TL('tips');
  setTimeout(() => { U.hideLoader(); st = 'menu'; if (U.needsLangPick()) U.show('langPick'); else U.showMenu(); }, 350);
}
function drawLoaderArt() {
  const c = U.$('ldCv').getContext('2d'); c.clearRect(0, 0, 480, 300);
  c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(232, 262, 90, 10, 0, 0, TAU); c.fill();
  person(c, 226, 260, 0, false, Object.assign(who(), { s: 3.2, still: 1, arm: 'fist', mouth: 'smile' }));
  const s = S.data(), b = C.active(s); c.lineJoin = 'round'; c.lineCap = 'round';
  drawFalcon(c, 226 + 17 * 3.2, 260 - 41.5 * 3.2, lookOf(s, b), { pose: 'cuff', s: 1.95, hood: true, hoodCol: hoodCol(), jesses: true });
}

// ---- the camp: the family menu card ----
function drawAvatar(canvas, mood = 'smile') { // the falconer with the falcon on the cuff
  const c = canvas.getContext('2d'), w = canvas.width, h = canvas.height, s = S.data(), b = C.active(s);
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h); c.lineJoin = 'round'; c.lineCap = 'round';
  const g = c.createRadialGradient(w / 2, h * 0.4, 10, w / 2, h * 0.5, w * 0.7); g.addColorStop(0, '#fff6df'); g.addColorStop(1, '#f0d9a8'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(0,0,0,.12)'; c.beginPath(); c.ellipse(w * 0.44, h * 0.93, w * 0.2, h * 0.035, 0, 0, TAU); c.fill();
  const ps = h / 100 * 1.0, x = w * 0.4, y = h * 0.93;
  person(c, x, y, 0, false, Object.assign(who(), { s: ps, still: 1, t, mouth: mood, arm: 'fist' }));
  if (b) drawFalcon(c, x + 17 * ps, y - 41.5 * ps, lookOf(s, b), { pose: 'cuff', s: ps * 0.62, hood: mood !== 'o', hoodCol: hoodCol(), jesses: true });
}
function tileArt(kind, canvas) {
  const c = canvas.getContext('2d'), s = S.data(); c.setTransform(canvas.width / 96, 0, 0, canvas.height / 96, 0, 0); c.clearRect(0, 0, 96, 96); c.lineJoin = 'round'; c.lineCap = 'round';
  c.fillStyle = '#33254d'; c.strokeStyle = INK; c.lineWidth = 5; c.beginPath(); c.roundRect(4, 4, 88, 88, 22); c.fill(); c.stroke(); c.save(); c.beginPath(); c.roundRect(7, 7, 82, 82, 19); c.clip();
  const k = SKIES.dusk; sky(c, 96, 96, 'dusk', 0.8); dunes(c, 0, 96, 74, 8, 30, k[5], k[6], 96, kind.length * 40);
  const b = C.active(s), a = b && lookOf(s, b);
  if (kind === 'mews') { drawBlock(c, 46, 62, 1.0); if (a) drawFalcon(c, 46, 62, a, { pose: 'block', s: 1.25 / a.scale, hood: true, hoodCol: hoodCol() }); }
  else if (kind === 'breed') { drawChick(c, 34, 82, 1.7, 0.4); drawChick(c, 64, 84, 1.3, 1.2); }
  else if (kind === 'market') { c.fillStyle = '#c8202b'; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(14, 44); c.lineTo(24, 24); c.lineTo(72, 24); c.lineTo(82, 44); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#fffaf0'; c.fillRect(20, 44, 56, 34); c.strokeRect(20, 44, 56, 34); c.fillStyle = '#e0a72a'; c.beginPath(); c.arc(48, 61, 11, 0, TAU); c.fill(); c.stroke(); }
  else if (kind === 'compete') { c.strokeStyle = INK; c.lineWidth = 3; c.fillStyle = '#e0a72a'; c.beginPath(); c.moveTo(30, 26); c.lineTo(66, 26); c.lineTo(62, 52); c.quadraticCurveTo(48, 64, 34, 52); c.closePath(); c.fill(); c.stroke(); c.fillRect(43, 58, 10, 12); c.strokeRect(43, 58, 10, 12); c.beginPath(); c.roundRect(34, 70, 28, 8, 3); c.fill(); c.stroke(); }
  else if (kind === 'book') { c.strokeStyle = INK; c.lineWidth = 3; c.fillStyle = '#8a4b25'; c.beginPath(); c.roundRect(20, 22, 56, 56, 6); c.fill(); c.stroke(); c.fillStyle = '#fffaf0'; c.beginPath(); c.roundRect(27, 27, 42, 46, 3); c.fill(); c.stroke(); if (a) drawFalcon(c, 46, 68, a, { pose: 'block', s: 0.8 / a.scale }); }
  else { c.fillStyle = '#b98a55'; c.strokeStyle = INK; c.lineWidth = 3.5; c.beginPath(); c.roundRect(24, 18, 48, 64, 7); c.fill(); c.stroke(); c.fillStyle = '#fff8ea'; c.lineWidth = 2.5; c.beginPath(); c.roundRect(29, 25, 38, 52, 4); c.fill(); c.stroke();
    for (let i = 0; i < 3; i++) { const y = 37 + i * 13; c.fillStyle = i < 2 ? '#4f8a3a' : '#d6cfc2'; c.lineWidth = 2; c.beginPath(); c.arc(37, y, 4.6, 0, TAU); c.fill(); c.stroke(); c.lineWidth = 3; c.beginPath(); c.moveTo(46, y); c.lineTo(61, y); c.stroke(); } }
  c.restore();
}
const placeState = (s, p) => { if (p.soon) return { shut: 1, txt: T('pl_soon') }; if (p.id === 'majlis') return { txt: T('pl_majlis_s') }; const may = C.mayGo(s, p.id);
  if (p.id === 'ground') return { txt: T(may.ok ? 'pl_ground_s' : 'gr_' + may.why) };
  return may.ok ? { txt: T('pl_open') } : may.why === 'locked' ? { shut: 1, txt: T('pl_lesson') } : { txt: T(may.why === 'closed' ? 'pl_closed' : may.why === 'licence' ? 'pl_licence' : 'gr_' + may.why), off: 1 }; };
function renderMenu() {
  const s = S.data(), b = C.active(s), season = C.seasonOf(s.week);
  S.dailyList();
  U.$('calPill').textContent = T('cal', C.yearOf(s.week) + 1, C.weekOfYear(s.week) + 1, T('se_' + season));
  document.querySelector('#menu .kicker').textContent = T('kick_' + season);
  if (!PLACES.some(p => p.id === s.place && !placeState(s, p).shut)) s.place = 'ground';
  const strip = U.$('levelStrip');
  strip.innerHTML = PLACES.map(p => { const ps = placeState(s, p);
    return `<button type="button" class="pcard ${p.id === s.place ? 'on' : ''} ${ps.shut ? 'shut' : ''}" data-place="${p.id}" ${ps.shut ? 'disabled' : ''}><canvas width="224" height="140"></canvas><b>${T('pl_' + p.id)}</b><small>${ps.txt}</small>${ps.shut ? '<span class="lock"><svg class="si" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></span>' : ''}</button>`; }).join('');
  strip.querySelectorAll('.pcard').forEach(x => { placeArt(x.querySelector('canvas'), x.dataset.place); x.onclick = () => { if (strip.moved) return; s.place = x.dataset.place; S.save(); A.play('click'); renderMenu(); }; });
  U.pageRow(strip, 'places', PLACES.findIndex(p => p.id === s.place), renderMenu);
  const place = PLACES.find(p => p.id === s.place), row = U.$('launchRow'), may = C.mayGo(s, s.place);
  if (place.quarry && !place.quarry.includes(s.quarryPick)) s.quarryPick = place.quarry[0];
  row.innerHTML = (place.quarry ? place.quarry.map(q => `<button type="button" class="leg" data-quarry="${q}" aria-pressed="${q === s.quarryPick}"><canvas width="60" height="52" aria-hidden="true"></canvas>${T('qy_' + q)}</button>`).join('') : `<span class="hintline">${T('pl_' + s.place + '_h')}</span>`)
    + `<button type="button" class="leg bird" id="birdChip"><canvas width="60" height="52" aria-hidden="true"></canvas>${birdName(b)}</button>`;
  row.querySelectorAll('[data-quarry]').forEach(x => { const c = x.querySelector('canvas').getContext('2d'); c.setTransform(2, 0, 0, 2, 0, 0); c.lineJoin = 'round'; c.lineCap = 'round'; QUARRY_ART[x.dataset.quarry](c, 14, x.dataset.quarry === 'hare' ? 24 : 14, 0.3, 0.75, false); x.onclick = () => { s.quarryPick = x.dataset.quarry; S.save(); A.play('click'); renderMenu(); }; });
  const bc = U.$('birdChip'), g = bc.querySelector('canvas').getContext('2d'), a = lookOf(s, b); g.setTransform(2, 0, 0, 2, 0, 0); g.lineJoin = 'round'; g.lineCap = 'round'; drawFalcon(g, 15, 25, a, { pose: 'block', s: 0.5 / a.scale, hood: true, hoodCol: hoodCol() }); bc.onclick = () => U.openSheet('mews');
  U.$('playLbl').textContent = T(s.place === 'majlis' ? 'b_majlis' : s.place === 'ground' ? 'b_train' : 'b_hunt');
  const pc = U.$('playCv').getContext('2d'); pc.setTransform(1, 0, 0, 1, 0, 0); pc.clearRect(0, 0, 108, 68); pc.lineJoin = 'round'; pc.lineCap = 'round'; drawFalcon(pc, 58, 34, a, { pose: 'fly', s: 1.35 / a.scale, ph: 0.7 });
  U.$('playBtn').classList.toggle('alt', !may.ok && s.place !== 'majlis');
  document.querySelectorAll('.tile[data-sheet]').forEach(x => tileArt(x.dataset.sheet, x.querySelector('canvas')));
  U.$('dotMissions').hidden = !missionsDot(s); U.$('dotBreed').hidden = !breedDot(s);
  const why = C.grounded(s, b);
  const other = why && C.mine(s).find(x => x.id !== b.id && !C.grounded(s, x));
  U.$('menuSay').textContent = s.lesson < C.LESSON_DONE ? T('say_lesson') : other ? T('say_switch', birdName(other)) : why ? T('say_' + why, birdName(b)) : S.backupDue() ? T('say_backup') : s.food < C.mine(s).length * 1.5 ? T('say_food') : season === 'hunt' && s.licence !== C.yearOf(s.week) ? T('say_licence') : breedDot(s) ? T('say_breed') : TL('menu_say');
  drawAvatar(U.$('avMenu')); U.refreshCoins();
}
U.setMenuRenderer(renderMenu);
window.addEventListener('langchange', () => { if (st === 'menu' && U.shown('menu')) renderMenu(); else if (U.shown('sheet')) U.reopen(); });
function drawCamp(c) { // the quiet camp behind the menu
  const s = S.data(), season = C.seasonOf(s.week), time = season === 'moult' ? 'day' : season === 'breed' ? 'dawn' : 'night', k = SKIES[time];
  sky(c, W, H, time, 0.78); dunes(c, 0, W, 268, 34, 150, k[5], k[6], H, 300); dunes(c, 0, W, 306, 20, 96, k[5], k[6], H, 40);
  c.fillStyle = k[5]; c.fillRect(0, 330, W, 70);
  c.save(); c.translate(W * 0.22, 336); c.scale(1.5, 1.5); tent(c); c.restore();
  c.save(); c.translate(W * 0.5, 350); c.scale(1.4, 1.4); fire(c, REDUCED ? 0 : t); c.restore();
  c.save(); c.translate(W * 0.86, 334); c.scale(1.5, 1.5); ghaf(c); c.restore();
  const b = C.active(s); if (b) { const a = lookOf(s, b); drawBlock(c, W * 0.68, 322, 1.2); drawFalcon(c, W * 0.68, 322, a, { pose: 'block', s: 1.2, hood: true, hoodCol: hoodCol(), jesses: true }); }
}

// ---- an outing: one week ----
const ICON = {}; let actKey = '', tipKey = '';
function actIcon(kind) {
  const c = U.$('actCv').getContext('2d'), s = S.data(), a = lookOf(s, C.active(s)); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 96, 96); c.lineJoin = 'round'; c.lineCap = 'round';
  if (kind === 'unhood' || kind === 'wait') drawFalcon(c, 46, 84, a, { pose: 'block', s: 1.5 / a.scale, hood: kind === 'wait', hoodCol: hoodCol() });
  else if (kind === 'cast' || kind === 'pump') drawFalcon(c, 46, 52, a, { pose: 'fly', s: 1.25 / a.scale, ph: kind === 'cast' ? 0.5 : 2.6 });
  else if (kind === 'lure') QUARRY_ART.lure(c, 48, 50, 0.3, 1.5);
  else drawFalcon(c, 44, 40, a, { pose: 'stoop', s: 1.3 / a.scale, strike: true, angle: 0.8 });
}
function startOuting(again) {
  const s = S.data(), place = s.place;
  if (place === 'majlis') return startMajlis();
  const may = C.mayGo(s, place);
  if (!may.ok) { A.play('hit'); U.note(T(may.why === 'closed' ? 'no_closed' : may.why === 'licence' ? 'no_licence' : 'gr_' + may.why), 2600); if (may.why === 'licence') U.openSheet('market'); return; }
  const b = C.active(s), kind = place === 'ground' ? 'train' : 'hunt', quarry = kind === 'train' ? 'lure' : s.quarryPick;
  if (!again) s.ctr.out = (s.ctr.out || 0) + 1;
  A.unlockAudio();
  scene = makeHunt({ kind, quarry, stats: C.statsOf(s, b), dir: C.tune(s, quarry), seed: hash32(s.seed + ':out:' + s.ctr.out), look: lookOf(s, b), hoodCol: hoodCol(), girl: isGirl(), robe: S.look().robe, head: S.look().head, reduced: REDUCED });
  scene.kind = kind; scene.quarry = quarry; scene.seenEv = 0; scene.guide = s.lesson < C.LESSON_DONE || s.stats.hunts + s.stats.trains < 3;
  intent.ty = 0.25; intent.act = false; intent.hold = false; actKey = tipKey = '';
  st = 'play'; U.hideMenus(); U.showHud(true); U.$('actBtn').hidden = false; U.$('hScore').textContent = '0'; U.$('hCoins').textContent = nf(S.coins()); U.$('pauseBtn').hidden = false;
  U.banner(T(kind === 'train' ? 'bn_train' : 'bn_hunt', T('qy_' + quarry)), birdName(b), 1500); A.play('zone');
}
function hud() {
  const w = scene.w;
  U.$('hScore').textContent = nf(w.score); U.$('flightChip').textContent = T('h_flight', Math.min(w.flight, w.flights), w.flights);
  const key = w.phase === 'scout' ? (w.q.spotted ? 'unhood' : 'wait') : w.phase === 'cast' ? 'cast' : w.phase === 'chase' ? (w.can ? 'strike' : 'pump') : w.phase === 'strike' ? 'now' : w.phase === 'recall' && w.fal.state !== 'bind' ? 'lure' : 'rest';
  if (key !== actKey) { actKey = key; const btn = U.$('actBtn'); btn.classList.toggle('full', ['unhood', 'cast', 'strike', 'now', 'lure'].includes(key)); U.$('actLbl').textContent = T('a_' + key); actIcon(key); btn.setAttribute('aria-label', T('a_' + key)); }
  let tip = '';
  if (scene.guide) tip = w.phase === 'scout' ? (w.q.spotted ? 'tip_spot' : 'tip_scout') : w.phase === 'cast' ? 'tip_cast' : w.phase === 'chase' ? (w.can === 'stoop' ? 'tip_can' : w.fal.y - w.q.y < 60 ? 'tip_climb' : 'tip_close') : w.phase === 'strike' ? 'tip_strike' : w.phase === 'bind' ? 'tip_bind' : w.phase === 'recall' && w.fal.state !== 'bind' ? 'tip_recall' : '';
  if (tip !== tipKey) { tipKey = tip; const e = U.$('tip'); e.hidden = !tip; if (tip) e.textContent = T(tip); }
}
function sfx() { // sounds for what just happened in the world
  const w = scene.w;
  for (; scene.seenEv < w.events.length; scene.seenEv++) { const e = w.events[scene.seenEv];
    if (e.type === 'spot') A.play('close'); else if (e.type === 'unhood') A.play('click'); else if (e.type === 'cast') A.play('whoosh'); else if (e.type === 'perfect') { A.play('pickup', 1.3); U.note(T('bn_perfect'), 1000); }
    else if (e.type === 'strike') A.play('whoosh', 1.4); else if (e.type === 'catch') { A.play('fanfare'); A.buzz(30); U.pop(U.$('scoreBox')); U.note(T(e.clean ? 'bn_clean' : 'bn_catch') + '  +' + nf(e.pts), 1300); }
    else if (e.type === 'miss') { A.play('hit'); U.note(T(e.broke ? 'bn_broke' : e.early ? 'bn_early' : 'bn_late'), 1000); } else if (e.type === 'cover') U.note(T('bn_cover'), 1000);
    else if (e.type === 'flightEnd' && e.result !== 'caught') { A.play('lose'); U.note(T(e.result === 'spent' ? 'bn_spent' : 'bn_away') + ' · ' + T('bn_well'), 1700); } else if (e.type === 'lure') A.play('whoosh', 0.8); }
}
function endOuting() {
  const s = S.data(), w = scene.w, sum = summary(w), b = C.active(s), girlWas = M.girlOpen(s);
  st = 'over'; U.showHud(false); U.$('banner').hidden = true; U.$('note').hidden = true;
  const res = C.finishOuting(s, scene.kind, scene.quarry, sum), ladder = M.settleLadder(s), badges = M.settleBadges(s); S.save();
  const top = TRAINABLE.map(k => [k, res.gains[k]]).sort((x, y) => y[1] - x[1]).filter(x => x[1] > 0.004).slice(0, 2).map(([k, v]) => `${T('tr_' + k)} <span dir="ltr">+${Math.max(1, Math.round(v * 100))}%</span>`);
  pending = { events: res.events, ladder, mozah: !girlWas && M.girlOpen(s) };
  const win = sum.caught > 0; if (win) A.play('fanfare'); else A.play('lose');
  U.showResult({ win, title: T(win ? 'r_win' : 'r_lose'), quote: TL(win ? 'q_win' : 'q_lose'), caught: sum.caught, flights: sum.flights, perfect: sum.perfect, points: sum.score, coins: res.coins, mult: C.mult(s),
    lines: top.length ? [T('r_learned', birdName(b))].concat(top) : [], badges: badges.map(x => ({ name: `${T('bd_' + x.id)} · ${T('tier_' + x.tier)} · +${nf(x.reward)}` })), fact: res.fact ? T('fact_' + res.fact) : '', av: cvs => drawAvatar(cvs, win ? 'smile' : 'o') });
  scene.over = true;
}
// what the week brought: a card for each thing worth telling
function sceneArt(kind) { return (c, w, h) => { const o = document.createElement('canvas'); o.width = 448; o.height = 280; placeArt(o, kind); c.drawImage(o, 0, (h - w * 0.625) / 2, w, w * 0.625); }; }
function newsFor(p) {
  const s = S.data(), out = [];
  for (const e of p.events || []) {
    if (e.type === 'season') out.push({ kick: T('nw_season_k', e.year + 1), title: T('se_' + e.season), text: T('nw_se_' + e.season), art: sceneArt({ hunt: 'remah', fest: 'ground', breed: 'majlis', moult: 'liwa' }[e.season]) });
    else if (e.type === 'lessonDone') out.push({ kick: T('nw_lesson_k'), title: T('pl_remah'), text: T('nw_lesson'), art: sceneArt('remah'), sfx: 'fanfare' });
    else if (e.type === 'hatch') out.push({ kick: T('nw_hatch_k'), title: T('nw_hatch_t', e.n), text: T(e.n ? 'nw_hatch' : 'nw_hatch0'), art: (c, w, h) => { c.fillStyle = '#f4e3c1'; c.fillRect(0, 0, w, h); for (let i = 0; i < e.n; i++) drawChick(c, w / 2 + (i - (e.n - 1) / 2) * 70, h - 30, 3, i); }, sfx: 'fanfare' });
    else if (e.type === 'fledge') out.push({ kick: T('nw_fledge_k'), title: T('nw_fledge_t'), text: T(e.baba ? 'nw_fledge_baba' : 'nw_fledge'), art: sceneArt('ground'), sfx: 'fanfare' });
    else if (e.type === 'feather') out.push({ kick: T('nw_care_k'), title: T('nw_feather_t'), text: T('nw_feather'), sfx: 'hit' });
    else if (e.type === 'hungry') out.push({ kick: T('nw_care_k'), title: T('nw_hungry_t'), text: T('nw_hungry'), sfx: 'hit' });
  }
  if (p.ladder) out.push({ kick: T('nw_ladder_k'), title: T('nw_ladder_t', p.ladder.lv), text: T('nw_ladder', p.ladder.reward, C.mult(s).toFixed(1)), sfx: 'fanfare' });
  if (p.mozah) out.push({ kick: T('nw_mozah_k'), title: T('ch_mozah'), text: T('nw_mozah'), art: (c, w, h) => { c.fillStyle = '#f4e3c1'; c.fillRect(0, 0, w, h); person(c, w / 2, h - 12, 0, false, Object.assign(MOZAH(), { s: 2.8, still: 1, arm: 'wave' })); }, sfx: 'fanfare' });
  return out;
}
function afterWeek(p) { scene = null; st = 'menu'; const cards = newsFor(p || {}); if (cards.length) U.news(cards, () => U.showMenu()); else U.showMenu(); }
setMajlisDone(events => { const s = S.data(), girlWas = false; const ladder = M.settleLadder(s); M.settleBadges(s); S.save(); afterWeek({ events, ladder, mozah: !girlWas && false }); });
function pause(on) {
  if (on && st === 'play') { st = 'pause'; U.show('pause'); U.$('actBtn').hidden = true; A.play('click'); }
  else if (!on && st === 'pause') { st = 'play'; U.hideMenus(); U.$('actBtn').hidden = false; last = 0; }
}
function update(dt) {
  if (bot) { const it = bot(scene.w); if (it.ty != null) intent.ty = it.ty; intent.act = intent.act || it.act; intent.hold = it.hold; }
  scene.update(dt, intent); sfx(); hud();
  if (scene.w.done && !scene.over) endOuting();
}
function drawScene(c) { if (scene && (st === 'play' || st === 'pause' || st === 'over')) scene.draw(c, W, H); else drawCamp(c); }
function draw() {
  const k = dpr * scale, band = offX > 0.5 || offY > 0.5;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (band) { ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--night') || '#1b1430'; ctx.fillRect(0, 0, cv.width, cv.height); }
  ctx.setTransform(k, 0, 0, k, offX * k, offY * k); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (band) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip(); drawScene(ctx); ctx.restore(); } else drawScene(ctx);
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, last ? (now - last) / 1000 : 0); last = now; t += dt;
  if (st === 'play') update(dt);
  if (st !== 'boot' && !document.hidden) { S.data().playSec += dt; saveT += dt; if (saveT > 30) { saveT = 0; S.save(); } }
  A.music(st === 'play');
  if (st !== 'boot') draw();
}
// input: drag anywhere on the field to set the falcon's height; the big button (or Space) is the one action
const toTy = e => { const r = cv.getBoundingClientRect(), y = (e.clientY - r.top) / scale - offY; return Math.max(0, Math.min(1, (GY - y) / CEIL)); };
cv.addEventListener('pointerdown', e => { A.unlockAudio(); if (st === 'play') intent.ty = toTy(e); });
cv.addEventListener('pointermove', e => { if (st === 'play' && (e.buttons || e.pointerType === 'touch')) intent.ty = toTy(e); });
const act = U.$('actBtn');
act.addEventListener('pointerdown', e => { e.preventDefault(); A.unlockAudio(); if (st === 'play') { intent.act = true; intent.hold = true; } });
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) act.addEventListener(ev, () => { intent.hold = false; });
addEventListener('keydown', e => { if (st !== 'play') return;
  if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) intent.act = true; intent.hold = true; }
  else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { e.preventDefault(); intent.ty = Math.min(1, intent.ty + 0.07); }
  else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { e.preventDefault(); intent.ty = Math.max(0, intent.ty - 0.07); } });
addEventListener('keyup', e => { if (e.code === 'Space' || e.key === 'Enter') intent.hold = false; });
let awake = false;   // tests in a hidden pane keep the game running
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (!awake) pause(true); S.save(); } });
addEventListener('pagehide', () => S.save());

// ---- wire up and go ----
U.initUI({
  onPlay: () => startOuting(), onResume: () => pause(false), onRestart: () => startOuting(true), onPause: () => pause(st !== 'pause'),
  onQuit: () => { scene = null; st = 'menu'; U.showHud(false); U.showMenu(); },
  onAfterResult: () => { const p = pending; pending = null; afterWeek(p); },
  onLangPicked: () => U.showMenu(),
});
// online:start  the race module stays wired to the shell; the lure sprint will give it a real race at the friends milestone
R.init({ onGo: () => {}, snapshot: () => ({ x: 0, score: 0 }), level: () => 0, onLeave: () => {} });
// online:end
const local = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
if ('serviceWorker' in navigator && location.protocol !== 'file:' && (!local || /[?&]sw=1/.test(location.search))) {
  navigator.serviceWorker.register('sw.js').then(reg => { reg.addEventListener('updatefound', () => { const nw = reg.installing; nw && nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) U.$('toast').hidden = false; }); }); }).catch(() => {});
}
requestAnimationFrame(frame);
boot();

// ---- console hooks for testing (a hidden preview pane gets no animation frames: drive the game with step) ----
function audit() { // layout rules the owner holds: nothing scrolls, nothing is cut off, no symbol characters on buttons
  const out = [], vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest('[hidden]'); };
  for (const ov of document.querySelectorAll('.overlay')) { if (ov.hidden) continue; const p = ov.querySelector(':scope > .panel'); if (!p) continue; const r = p.getBoundingClientRect();
    if (r.top < -1 || r.left < -1 || r.bottom > innerHeight + 1 || r.right > innerWidth + 1) out.push(`${ov.id}: panel leaves the screen (${Math.round(r.left)},${Math.round(r.top)} → ${Math.round(r.right)},${Math.round(r.bottom)} of ${innerWidth}×${innerHeight})`);
    for (const e of ov.querySelectorAll('*')) { if (!vis(e)) continue; const cs = getComputedStyle(e);
      if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && e.scrollHeight > e.clientHeight + 2) out.push(`${ov.id}: ${e.className || e.tagName} scrolls`);
      if (e.tagName === 'BUTTON') { const tx = e.textContent.trim(); if (/[←-⯿✀-➿\u{1f000}-\u{1faff}]/u.test(tx)) out.push(`${ov.id}: symbol character on a button: "${tx}"`);
        const br = e.getBoundingClientRect(); if (br.height < (e.classList.contains('pg-btn') ? 24 : 28) && !e.disabled && !e.closest('.lang')) out.push(`${ov.id}: small button "${tx.slice(0, 20)}" ${Math.round(br.width)}×${Math.round(br.height)}`);
        if (e.scrollWidth > e.clientWidth + 3 && cs.overflow !== 'hidden' && !e.querySelector('.dot')) out.push(`${ov.id}: text spills out of button "${tx.slice(0, 24)}"`);
        if (!tx && !e.getAttribute('aria-label')) out.push(`${ov.id}: button without a name (${e.className})`); } } }
  return out;
}
window.__game = { back: () => { if (U.shown('sheet')) U.closeSheet(); }, debug: {
  start: (place, o = {}) => { const s = S.data(); if (place) s.place = place; if (o.quarry) s.quarryPick = o.quarry; startOuting(); return st; },
  step: (dt = 1 / 60, n = 1) => { for (let i = 0; i < n && st === 'play'; i++) update(dt); t += dt * n; if (st !== 'boot') draw(); return st; },
  input: it => Object.assign(intent, it), bot: (on, skill = 0.7) => { bot = on ? makeBot(skill, 7) : null; }, end: () => { if (scene && !scene.over) { scene.w.done = true; endOuting(); } },
  next: () => { if (U.shown('news')) U.$('newsOk').click(); else if (U.shown('over')) U.$('againBtn').click(); return st; },
  awake: (on = true) => { awake = !!on; if (on) pause(false); },
  still: () => { if (!document.getElementById('dbgStill')) { const e = document.createElement('style'); e.id = 'dbgStill'; e.textContent = '*,*::before,*::after{animation:none!important;transition:none!important}'; document.head.appendChild(e); } U.fitPanels(); },
  state: () => st, build: BUILD, field: () => ({ W, H, scale, offX, offY }), errors: () => errors.slice(), audit,
  info: () => { const s = S.data(), b = C.active(s); return { week: s.week, season: C.seasonOf(s.week), coins: s.coins, food: s.food, place: s.place, lesson: s.lesson, birds: C.mine(s).length, active: b && { name: birdName(b), line: birdLine(s, b), tr: b.tr, man: b.man, w: b.w }, clutch: s.clutch && { stage: s.clutch.stage, eggs: s.clutch.eggs.length }, phase: scene && scene.w.phase, overlay: ['menu', 'sheet', 'pause', 'over', 'langPick', 'news'].find(U.shown) || null, sheet: U.sheetKind(), facts: Object.keys(s.facts).length, missions: s.missionsDone }; },
  world: () => scene && scene.w, sheet: (kind, params) => U.openSheet(kind, params), menu: () => { U.closeAllSheets(); U.showMenu(); },
  weeks: (n = 1) => { const s = S.data(), ev = []; for (let i = 0; i < n; i++) ev.push(...C.weekTick(s)); S.save(); if (U.shown('menu')) renderMenu(); return ev; },
  give: o => { const s = S.data(); if (o.coins) s.coins += o.coins; if (o.food) s.food += o.food; if (o.missions) s.missionsDone += o.missions; S.save(); if (U.shown('menu')) renderMenu(); },
  lang: l => setLang(l), girl: b2 => { S.data().char = b2 ? 'mozah' : 'abood'; setGirl(!!b2); applyI18n(); if (U.shown('menu')) renderMenu(); },
  save: { export: () => S.backup(), import: txt => S.restore(txt), reset: () => { S.resetSave(); U.showMenu(); }, bytes: () => S.bytes(), data: () => S.data() },
  dropNet: R.debug.dropNet, race: R.debug.state, // online
} };
