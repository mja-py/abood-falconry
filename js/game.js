// Entry point and game loop for Abood the Falconer. The family shell (loader → language picker → menu → play with HUD →
// pause → results with the dirham exchange) is kept; the menu is the camp, and play is one hunt in the open desert,
// seen from above and steered with a drag pad, as in Abood in Liwa. The rules live in js/sim/* (pure, seeded, tested in
// node); this file boots, routes, takes input and draws. Lines marked `// online` belong to the parked race module.
import { T, TL, applyI18n, isGirl, setGirl, nf, setLang } from './i18n.js';
import * as S from './save.js';
import * as A from './audio.js';
import * as U from './ui.js';
import * as R from './race.js'; // online
import { person, ABOOD, MOZAH, INK } from './art.js';
import * as C from './sim/career.js';
import * as M from './sim/missions.js';
import { hash32 } from './sim/rng.js';
import { summary, HOME_R } from './sim/hunt-sim.js';
import { makeBot } from './sim/hunt-bot.js';
import { QUARRY } from './data/quarry.js';
import { makeHunt } from './scenes/hunt.js';
import { drawFalcon, drawBlock, drawChick, drawFalconTop } from './art/falcon.js';
import { sky, dunes, SKIES, hare, houbara } from './art/desert.js';
import { lookOf, birdName, birdLine, birdPortrait } from './ui/falconcard.js';
import { mewsDot } from './ui/mews.js';
import { breedDot } from './ui/breed.js';
import './ui/market.js';
import { missionsDot } from './ui/missions.js';

const BUILD = '__BUILD__';
const cv = U.$('cv'), ctx = cv.getContext('2d');
// The open desert fills the whole screen, as in Abood in Liwa: every screen shape sees about the same area of sand
// (the zoom is set from the screen's area), so there are no bands; --band-x / --band-y stay at 0 for the family HUD rules.
let W = 1, Hh = 1, dpr = 1;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches, TAU = Math.PI * 2;
function resize() {
  dpr = Math.min(devicePixelRatio || 1, 2); const w = Math.max(1, Math.round(innerWidth * dpr)), h = Math.max(1, Math.round(innerHeight * dpr));
  if (w !== cv.width || h !== cv.height) { cv.width = w; cv.height = h; } cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px'; W = w; Hh = h;
  document.documentElement.style.setProperty('--band-x', '0px'); document.documentElement.style.setProperty('--band-y', '0px');
}
addEventListener('resize', resize); resize();

// ---- state ----
let st = 'boot', t = 0, last = 0, scene = null, camp = null, saveT = 0, bot = null, pending = null, radarN = 0;
const intent = { jx: 0, jy: 0, act: false, end: false }, keys = {}, joy = { on: false, src: '', id: 0, ox: 0, oy: 0, x: 0, y: 0 }, JOY_R = 56;
const errors = []; addEventListener('error', e => { errors.push(String(e.message)); });
const HOODS = { red: '#c8202b' }, hoodCol = () => HOODS[S.data().hood] || HOODS.red;
const sceneOpts = (s, b, extra) => Object.assign({ stats: C.statsOf(s, b), level: C.level(s), look: lookOf(s, b), hoodCol: hoodCol(), girl: isGirl(), reduced: REDUCED }, extra);

// ---- boot: loader with the family steps (fonts → art → sound → ready) ----
async function boot() {
  U.loader(0.05, T('ld_fonts'));
  try { await document.fonts.load('800 20px "Baloo Bhaijaan 2"'); await document.fonts.load('700 20px "Baloo Bhaijaan 2"'); } catch (e) {}
  U.loader(0.3, T('ld_art')); drawLoaderArt();
  U.loader(0.45, T('ld_sound'));
  await A.initAudio(f => U.loader(0.45 + f * 0.5));
  A.setBpm(110);
  U.loader(1, T('ld_ready')); U.$('ldTip').textContent = TL('tips');
  setTimeout(() => { U.hideLoader(); if (st === 'boot') { st = 'menu'; if (U.needsLangPick()) U.show('langPick'); else U.showMenu(); } }, 350);
}
function drawLoaderArt() { const c = U.$('ldCv'); drawAvatar(c, 'smile', true); }

// ---- the camp: the family menu card ----
function drawAvatar(canvas, mood = 'smile', bare) { // the falconer with the falcon on the cuff
  const c = canvas.getContext('2d'), w = canvas.width, h = canvas.height, s = S.data(), b = C.active(s);
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h); c.lineJoin = 'round'; c.lineCap = 'round';
  if (!bare) { const g = c.createRadialGradient(w / 2, h * 0.4, 10, w / 2, h * 0.5, w * 0.7); g.addColorStop(0, '#fff6df'); g.addColorStop(1, '#f0d9a8'); c.fillStyle = g; c.fillRect(0, 0, w, h); }
  c.fillStyle = 'rgba(0,0,0,.12)'; c.beginPath(); c.ellipse(w * 0.44, h * 0.93, w * 0.2, h * 0.035, 0, 0, TAU); c.fill();
  const ps = h / 100, x = w * 0.4, y = h * 0.93, o = Object.assign(isGirl() ? MOZAH(S.look().robe, S.look().head) : ABOOD(S.look().robe, S.look().head), { s: ps, still: 1, t, mouth: mood, arm: 'fist' });
  person(c, x, y, 0, false, o); if (b) drawFalcon(c, x + 17 * ps, y - 41.5 * ps, lookOf(s, b), { pose: 'cuff', s: ps * 0.62, hood: mood !== 'o', hoodCol: hoodCol(), jesses: true });
}
function tileArt(kind, canvas) {
  const c = canvas.getContext('2d'), s = S.data(); c.setTransform(canvas.width / 96, 0, 0, canvas.height / 96, 0, 0); c.clearRect(0, 0, 96, 96); c.lineJoin = 'round'; c.lineCap = 'round';
  c.fillStyle = '#33254d'; c.strokeStyle = INK; c.lineWidth = 5; c.beginPath(); c.roundRect(4, 4, 88, 88, 22); c.fill(); c.stroke(); c.save(); c.beginPath(); c.roundRect(7, 7, 82, 82, 19); c.clip();
  const k = SKIES.dusk; sky(c, 96, 96, 'dusk', 0.8); dunes(c, 0, 96, 74, 8, 30, k[5], k[6], 96, kind.length * 40);
  const b = C.active(s), a = b && lookOf(s, b);
  if (kind === 'mews') { drawBlock(c, 46, 62, 1.0); if (a) drawFalcon(c, 46, 62, a, { pose: 'block', s: 1.25 / a.scale, hood: true, hoodCol: hoodCol() }); }
  else if (kind === 'breed') { drawChick(c, 34, 82, 1.7, 0.4); drawChick(c, 64, 84, 1.3, 1.2); }
  else if (kind === 'market') { c.fillStyle = '#c8202b'; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(14, 44); c.lineTo(24, 24); c.lineTo(72, 24); c.lineTo(82, 44); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#fffaf0'; c.fillRect(20, 44, 56, 34); c.strokeRect(20, 44, 56, 34); c.fillStyle = '#e0a72a'; c.beginPath(); c.arc(48, 61, 11, 0, TAU); c.fill(); c.stroke(); }
  else if (kind === 'help') { c.strokeStyle = INK; c.lineWidth = 3; c.fillStyle = '#8a4b25'; c.beginPath(); c.roundRect(20, 22, 56, 56, 6); c.fill(); c.stroke(); c.fillStyle = '#fffaf0'; c.beginPath(); c.roundRect(27, 27, 42, 46, 3); c.fill(); c.stroke(); if (a) drawFalconTop(c, 48, 50, a, { ang: -0.6, flap: 0.4, s: 0.9 }); }
  else { c.fillStyle = '#b98a55'; c.strokeStyle = INK; c.lineWidth = 3.5; c.beginPath(); c.roundRect(24, 18, 48, 64, 7); c.fill(); c.stroke(); c.fillStyle = '#fff8ea'; c.lineWidth = 2.5; c.beginPath(); c.roundRect(29, 25, 38, 52, 4); c.fill(); c.stroke();
    for (let i = 0; i < 3; i++) { const y = 37 + i * 13; c.fillStyle = i < 2 ? '#4f8a3a' : '#d6cfc2'; c.lineWidth = 2; c.beginPath(); c.arc(37, y, 4.6, 0, TAU); c.fill(); c.stroke(); c.lineWidth = 3; c.beginPath(); c.moveTo(46, y); c.lineTo(61, y); c.stroke(); } }
  c.restore();
}
function renderMenu() {
  const s = S.data(), birds = C.mine(s); let b = C.active(s);
  if (!C.canFly(s, b)) { b = birds.find(x => C.canFly(s, x)); s.active = b.id; }
  const lvl = C.level(s), need = C.xpFor(lvl + 1), have = C.xpFor(lvl);
  U.$('calPill').textContent = T('lv', lvl); U.$('calPill').className = 'lvpill'; U.$('calPill').title = `${nf(s.xp - have)} / ${nf(need - have)}`;
  const strip = U.$('levelStrip');
  strip.innerHTML = birds.map(x => { const fly = C.canFly(s, x), hungry = x.fed < C.HUNGRY;
    return `<button type="button" class="fcard ${x.id === s.active ? 'on' : ''} ${fly ? '' : 'rest'} ${hungry ? 'hungry' : ''}" data-bird="${x.id}"><canvas width="208" height="166" aria-hidden="true"></canvas><b>${birdName(x)}</b><span class="hunger" role="img" aria-label="${T('mw_fed')}"><i style="width:${Math.round(x.fed * 100)}%"></i></span></button>`; }).join('');
  strip.querySelectorAll('.fcard').forEach(x => { const o = C.bird(s, +x.dataset.bird); birdPortrait(x.querySelector('canvas'), s, o, { s: 1.8, time: 'day' });
    x.onclick = () => { if (strip.moved) return; A.play('click'); if (C.canFly(s, o)) { s.active = o.id; S.save(); camp = null; renderMenu(); } else U.note(T('mw_chick', C.FLY_AGE - C.age(s, o))); }; });
  U.pageRow(strip, 'falcons', birds.findIndex(x => x.id === s.active), renderMenu);
  const next = M.ladderSet(s).find(m => !M.done(s, m));
  U.$('launchRow').innerHTML = `<span class="hintline">${next ? T('m_goal', T('mk_' + next.k, next.goal), M.progress(s, next), next.goal) : T('m_goal_done')}</span><span class="leg meat"><canvas width="60" height="52" aria-hidden="true"></canvas><span dir="ltr">${nf(s.meat)}</span></span>`;
  const mc = U.$('launchRow').querySelector('canvas').getContext('2d'); mc.setTransform(2, 0, 0, 2, 0, 0); mc.strokeStyle = INK; mc.lineWidth = 1.6; mc.fillStyle = '#e9d3a3'; mc.beginPath(); mc.roundRect(5, 7, 20, 13, 4); mc.fill(); mc.stroke(); mc.fillStyle = '#c8202b'; mc.fillRect(6, 11, 18, 3);
  U.$('playLbl').textContent = T('b_hunt');
  const a = lookOf(s, b), pc = U.$('playCv').getContext('2d'); pc.setTransform(1, 0, 0, 1, 0, 0); pc.clearRect(0, 0, 108, 68); pc.lineJoin = 'round'; pc.lineCap = 'round'; drawFalconTop(pc, 54, 34, a, { ang: 0, flap: 0.5, s: 1.25 });
  document.querySelectorAll('.tile[data-sheet]').forEach(x => tileArt(x.dataset.sheet, x.querySelector('canvas')));
  U.$('dotMissions').hidden = !missionsDot(s); U.$('dotBreed').hidden = !breedDot(s); U.$('dotMews').hidden = !mewsDot(s);
  const hungry = birds.some(x => x.fed < C.HUNGRY), canEnh = C.STATS.some(k => b.lv[k] < C.starsOf(b)[k] && s.coins >= C.ENHANCE_COST[b.lv[k]]);
  U.$('menuSay').textContent = !s.lesson ? T('say_lesson') : hungry && s.meat > 0 ? T('say_feed') : hungry ? T('say_meat') : breedDot(s) ? T('say_breed') : canEnh ? T('say_enhance', birdName(b)) : birds.length >= s.mewsCap ? T('say_sell') : S.backupDue() ? T('say_backup') : TL('menu_say');
  drawAvatar(U.$('avMenu')); U.refreshCoins();
  if (!camp) camp = makeHunt(sceneOpts(s, b, { seed: 1, lesson: false }));
}
U.setMenuRenderer(renderMenu);
window.addEventListener('langchange', () => { if (st === 'menu' && U.shown('menu')) renderMenu(); else if (U.shown('sheet')) U.reopen(); });

// ---- a hunt ----
let actKey = '', tipKey = '';
function actIcon(kind) {
  const c = U.$('actCv').getContext('2d'), s = S.data(), a = lookOf(s, C.active(s)); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 96, 96); c.lineJoin = 'round'; c.lineCap = 'round';
  if (kind === 'cast') drawFalconTop(c, 48, 48, a, { ang: -Math.PI / 2, flap: 0.4, s: 1.35 });
  else if (kind === 'swoop' || kind === 'wait') drawFalconTop(c, 48, 50, a, { ang: -Math.PI / 2, dash: true, s: 1.6 });
  else if (kind === 'home') { c.fillStyle = '#2f2622'; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(14, 64); c.lineTo(48, 26); c.lineTo(82, 64); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#c8202b'; c.fillRect(22, 58, 52, 6); }
  else drawFalcon(c, 46, 84, a, { pose: 'block', s: 1.5 / a.scale, hood: kind === 'look', hoodCol: hoodCol() });
}
function startHunt() {
  const s = S.data(), b = C.active(s); if (!C.canFly(s, b)) return;
  s.ctr.out = (s.ctr.out || 0) + 1; A.unlockAudio();
  scene = makeHunt(sceneOpts(s, b, { seed: hash32(s.seed + ':out:' + s.ctr.out), lesson: !s.lesson }));
  scene.seenEv = 0; scene.guide = !s.lesson || s.stats.hunts < 2;
  intent.jx = intent.jy = 0; intent.act = intent.end = false; joy.on = false; actKey = tipKey = ''; radarN = 0;
  st = 'play'; U.hideMenus(); U.showHud(true); U.$('actBtn').hidden = false; U.$('hScore').textContent = '0'; U.$('pauseBtn').hidden = false;
  const wc = U.$('windCv').getContext('2d'); wc.setTransform(1, 0, 0, 1, 0, 0); wc.clearRect(0, 0, 52, 52); wc.lineJoin = 'round'; drawFalconTop(wc, 26, 26, lookOf(s, b), { ang: -0.5, flap: 0.5, s: 0.62 });
  U.banner(T('b_hunt'), birdName(b), 1300); A.play('zone');
}
function hud() {
  const w = scene.w, f = w.fal, home = Math.hypot(w.truck.x, w.truck.y) < HOME_R && w.t > 4;
  U.$('hScore').textContent = nf(w.score); U.$('hBag').textContent = nf(w.caught) + ' / ' + nf(w.bagMax);
  U.$('windFill').style.transform = `scaleX(${Math.max(0, w.energy).toFixed(3)})`; U.$('windBar').classList.toggle('danger', w.energy < 0.2 && f.mode === 'fly');
  const key = f.mode === 'fly' ? (f.cd <= 0 ? 'swoop' : 'wait') : f.mode === 'fist' ? (w.near >= 0 ? 'cast' : home ? 'home' : 'look') : 'fetch';
  if (key !== actKey) { actKey = key; const btn = U.$('actBtn'); btn.classList.toggle('full', key === 'cast' || key === 'swoop' || key === 'home'); U.$('actLbl').textContent = T('a_' + key); actIcon(key); btn.setAttribute('aria-label', T('a_' + key)); }
  let tip = '';
  if (scene.guide) tip = f.mode === 'fly' ? 'tip_fly' : f.mode === 'bind' ? 'tip_fetch' : f.mode === 'down' ? 'tip_tired' : w.near >= 0 ? 'tip_cast' : w.caught ? 'tip_more' : 'tip_drive';
  if (tip !== tipKey) { tipKey = tip; const e = U.$('tip'); e.hidden = !tip; if (tip) e.textContent = T(tip); }
  if (radarN-- <= 0) { radarN = 5; scene.radar(U.$('radar')); }
}
function sfx() { // sounds and short notes for what just happened in the world
  const w = scene.w;
  for (; scene.seenEv < w.events.length; scene.seenEv++) { const e = w.events[scene.seenEv];
    if (e.type === 'cast') A.play('whoosh'); else if (e.type === 'swoop') A.play('whoosh', 1.5, 0.7);
    else if (e.type === 'catch') { A.play('fanfare'); A.buzz(30); U.note(T('bn_catch', T('qy_' + e.kind)), 1300); }
    else if (e.type === 'broke') { A.play('hit'); U.note(T('bn_broke'), 1100); } else if (e.type === 'hid') U.note(T('bn_cover'), 1100);
    else if (e.type === 'pickup') { if (e.kind) { A.play('coin', 1.2); U.pop(U.$('scoreBox')); U.note('+' + nf(e.pts), 900); } else A.play('pickup'); }
    else if (e.type === 'spent') { A.play('lose'); U.note(T('bn_spent'), 1600); } else if (e.type === 'back') A.play('pickup');
    else if (e.type === 'rim') U.note(T('bn_rim'), 1500); else if (e.type === 'full') U.note(T('bn_full'), 1500); else if (e.type === 'nothing') U.note(T('bn_nothing'), 1100); }
}
function endHunt() {
  const s = S.data(), w = scene.w, sum = summary(w), b = C.active(s), girlWas = M.girlOpen(s);
  st = 'over'; U.showHud(false); U.$('banner').hidden = true; U.$('note').hidden = true;
  const res = C.finishHunt(s, sum), ladder = M.settleLadder(s), badges = M.settleBadges(s); S.save();
  pending = { events: res.events, ladder, mozah: !girlWas && M.girlOpen(s) };
  const win = sum.caught > 0; A.play(win ? 'fanfare' : 'lose');
  const bag = Object.keys(sum.bag).map(k => `${T('qy_' + k)} <span dir="ltr">× ${nf(sum.bag[k])}</span>`);
  U.showResult({ win, title: T(win ? 'r_win' : 'r_lose'), quote: TL(win ? 'q_win' : 'q_lose'), caught: sum.caught, meat: sum.meat, points: sum.score, coins: res.coins, mult: C.mult(s), lines: bag.length ? [birdName(b) + ':'].concat(bag) : [],
    badges: badges.map(x => ({ name: `${T('bd_' + x.id)} · ${T('tier_' + x.tier)} · +${nf(x.reward)}` })), fact: res.fact ? T('fact_' + res.fact) : '', av: cvs => drawAvatar(cvs, win ? 'smile' : 'o') });
  scene.over = true; camp = null;
}
// what the hunt brought: a card for each thing worth telling
function newsFor(p) {
  const s = S.data(), out = [], pic = draw => (c, w, h) => { c.fillStyle = '#f4e3c1'; c.fillRect(0, 0, w, h); c.lineJoin = 'round'; c.lineCap = 'round'; draw(c, w, h); };
  for (const e of p.events || []) {
    if (e.type === 'level') { const opens = Object.values(QUARRY).filter(q => q.level === e.level); out.push({ kick: T('nw_level_k'), title: T('lv', e.level), text: T(opens.length ? 'nw_level_new' : 'nw_level', opens.length ? T('qy_' + opens[0].id) : ''), art: pic((c, w, h) => { if (opens.length) houbara(c, w / 2 - 10, h - 40, 0.8, false, 4); else hare(c, w / 2, h - 40, 1.1, false, 4); }), sfx: 'fanfare' }); }
    else if (e.type === 'hatch') out.push({ kick: T('nw_hatch_k'), title: T('nw_hatch_t', e.n), text: T('nw_hatch'), art: pic((c, w, h) => { for (let i = 0; i < e.n; i++) drawChick(c, w / 2 + (i - (e.n - 1) / 2) * 76, h - 30, 3, i); }), sfx: 'fanfare' });
    else if (e.type === 'fledged') { const b = C.bird(s, e.id); if (b) out.push({ kick: T('nw_fledge_k'), title: birdName(b), text: T('nw_fledge', birdName(b)), art: (c, w, h) => { const o = document.createElement('canvas'); o.width = 400; o.height = 320; birdPortrait(o, s, b, { time: 'dawn' }); c.drawImage(o, (w - 275) / 2, 0, 275, 220); }, sfx: 'fanfare' }); }
    else if (e.type === 'full') out.push({ kick: T('nw_full_k'), title: T('t_mews'), text: T('nw_full'), sfx: 'hit' });
  }
  if (p.ladder) out.push({ kick: T('nw_ladder_k'), title: T('nw_ladder_t', p.ladder.lv), text: T('nw_ladder', p.ladder.reward, C.mult(s).toFixed(1)), sfx: 'fanfare' });
  if (p.mozah) out.push({ kick: T('nw_mozah_k'), title: T('ch_mozah'), text: T('nw_mozah'), art: pic((c, w, h) => person(c, w / 2, h - 12, 0, false, Object.assign(MOZAH(), { s: 2.8, still: 1, arm: 'wave' }))), sfx: 'fanfare' });
  return out;
}
function afterHunt(p) { scene = null; st = 'menu'; const cards = newsFor(p || {}); if (cards.length) U.news(cards, () => U.showMenu()); else U.showMenu(); }
function pause(on) {
  if (on && st === 'play') { st = 'pause'; joy.on = false; U.show('pause'); U.$('actBtn').hidden = true; A.play('click'); }
  else if (!on && st === 'pause') { st = 'play'; U.hideMenus(); U.$('actBtn').hidden = false; last = 0; }
}
function update(dt) {
  if (bot) { const it = bot(scene.w); intent.jx = it.jx; intent.jy = it.jy; intent.act = intent.act || it.act; intent.end = it.end; }
  else if (joy.on) { const dx = joy.x - joy.ox, dy = joy.y - joy.oy, m = Math.hypot(dx, dy); if (m > JOY_R * 1.6) { const k = JOY_R * 1.6 / m; joy.ox = joy.x - dx * k; joy.oy = joy.y - dy * k; } const n = Math.min(1, m / JOY_R); intent.jx = m > 6 ? dx / m * n : 0; intent.jy = m > 6 ? dy / m * n : 0; }
  else { const kx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0), ky = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0), m = Math.hypot(kx, ky) || 1; intent.jx = kx / m; intent.jy = ky / m; }
  scene.update(dt, intent); sfx(); hud();
  if (scene.w.done && !scene.over) endHunt();
}
function draw() {
  const sc = scene && (st === 'play' || st === 'pause' || st === 'over') ? scene : camp;
  if (!sc) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#e3ad68'; ctx.fillRect(0, 0, W, Hh); return; }
  if (sc === camp) { sc.t = t; sc.camx = Math.cos(t * 0.1) * 60 - 40; sc.camy = Math.sin(t * 0.13) * 30 + 20; sc.camZ = 1.1; }
  sc.draw(ctx, W, Hh, dpr);
  if (joy.on && st === 'play') { // the pad under the finger
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); const dx = joy.x - joy.ox, dy = joy.y - joy.oy, m = Math.hypot(dx, dy) || 1, k = Math.min(1, JOY_R / m);
    ctx.strokeStyle = 'rgba(255,250,240,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(joy.ox, joy.oy, JOY_R, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(200,32,43,.85)'; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(joy.ox + dx * k, joy.oy + dy * k, 20, 0, TAU); ctx.fill(); ctx.stroke(); ctx.setTransform(1, 0, 0, 1, 0, 0); }
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, last ? (now - last) / 1000 : 0); last = now; t += dt;
  if (st === 'play') update(dt);
  if (st !== 'boot' && !document.hidden) { S.data().playSec += dt; saveT += dt; if (saveT > 30) { saveT = 0; S.save(); } }
  A.music(st === 'play');
  if (st !== 'boot') draw();
}
// input: put a finger on the sand and drag the way you want to go (the pad appears under the finger); the big button
// (or Space) is the one action: cast the falcon, swoop, or go home
const TOUCH = 'ontouchstart' in window, own = e => { if (e.cancelable) e.preventDefault(); };
const joyStart = (src, id, x, y) => { if (st !== 'play') return; joy.on = true; joy.src = src; joy.id = id; joy.ox = joy.x = x; joy.oy = joy.y = y; };
const joyMove = (src, id, x, y) => { if (!joy.on) joyStart(src, id, x, y); else if (joy.src === src && joy.id === id) { joy.x = x; joy.y = y; } };
const joyEnd = (src, id) => { if (joy.on && joy.src === src && joy.id === id) { joy.on = false; intent.jx = intent.jy = 0; } };
if (TOUCH) {
  cv.addEventListener('touchstart', e => { own(e); A.unlockAudio(); const p = e.changedTouches[e.changedTouches.length - 1]; joyStart('t', p.identifier, p.clientX, p.clientY); }, { passive: false });
  cv.addEventListener('touchmove', e => { own(e); for (const p of e.changedTouches) joyMove('t', p.identifier, p.clientX, p.clientY); }, { passive: false });
  cv.addEventListener('touchend', e => { own(e); for (const p of e.changedTouches) joyEnd('t', p.identifier); }, { passive: false });
  cv.addEventListener('touchcancel', e => { for (const p of e.changedTouches) joyEnd('t', p.identifier); });
}
const viaTouch = e => TOUCH && e.pointerType === 'touch';
cv.addEventListener('pointerdown', e => { if (st !== 'play') return; A.unlockAudio(); if (viaTouch(e)) return; joyStart('p', e.pointerId, e.clientX, e.clientY); try { cv.setPointerCapture(e.pointerId); } catch (err) {} });
cv.addEventListener('pointermove', e => { if (joy.on && joy.src === 'p' && e.pointerId === joy.id) { joy.x = e.clientX; joy.y = e.clientY; } });
for (const ev of ['pointerup', 'pointercancel']) addEventListener(ev, e => joyEnd('p', e.pointerId));
addEventListener('blur', () => { joy.on = false; for (const k in keys) keys[k] = 0; });
const act = U.$('actBtn');
act.addEventListener('pointerdown', e => { e.preventDefault(); A.unlockAudio(); if (st === 'play') intent.act = true; });
addEventListener('keydown', e => { if (st !== 'play') return; if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) intent.act = true; } else if (e.key.startsWith('Arrow') || 'wasd'.includes(e.key.toLowerCase())) { e.preventDefault(); keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = 1; } });
addEventListener('keyup', e => { keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = 0; });
let awake = false;   // tests in a hidden pane keep the game running
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (!awake) pause(true); S.save(); } });
addEventListener('pagehide', () => S.save());

// ---- wire up and go ----
U.$('quitBtn').hidden = true;   // one way out of a hunt: home, with what was caught
const goHome = () => { if (!scene) return; pause(false); const w = scene.w; if (w.fal.mode === 'fist') intent.end = true; else { w.done = true; } };
U.initUI({
  onPlay: () => startHunt(), onResume: () => pause(false), onRestart: goHome, onPause: () => pause(st !== 'pause'),
  onQuit: goHome, onAfterResult: () => { const p = pending; pending = null; afterHunt(p); }, onLangPicked: () => U.showMenu(),
});
// online:start  the race module stays wired to the shell; it gets a real race at the friends milestone
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
  start: () => { startHunt(); return st; },
  step: (dt = 1 / 60, n = 1) => { for (let i = 0; i < n && st === 'play'; i++) update(dt); t += dt * n; if (st !== 'boot') draw(); return st; },
  input: it => Object.assign(intent, it), bot: (on, skill = 0.7) => { bot = on ? makeBot(skill, 7) : null; }, home: goHome,
  next: () => { if (U.shown('news')) U.$('newsOk').click(); else if (U.shown('over')) U.$('againBtn').click(); return st; },
  awake: (on = true) => { awake = !!on; if (on) pause(false); },
  still: () => { if (!document.getElementById('dbgStill')) { const e = document.createElement('style'); e.id = 'dbgStill'; e.textContent = '*,*::before,*::after{animation:none!important;transition:none!important}'; document.head.appendChild(e); } U.fitPanels(); },
  state: () => st, build: BUILD, errors: () => errors.slice(), audit, draw,
  info: () => { const s = S.data(), b = C.active(s), w = scene && scene.w; return { hunts: s.hunts, level: C.level(s), xp: s.xp, coins: s.coins, meat: s.meat, lesson: s.lesson, birds: C.mine(s).length, nests: s.nests.length, active: b && { name: birdName(b), line: birdLine(s, b), lv: b.lv, fed: b.fed, stars: C.starsOf(b) },
    hunt: w && { mode: w.fal.mode, energy: +w.energy.toFixed(2), caught: w.caught, near: w.near, score: w.score, t: +w.t.toFixed(1) }, overlay: ['menu', 'sheet', 'pause', 'over', 'langPick', 'news'].find(U.shown) || null, sheet: U.sheetKind(), facts: Object.keys(s.facts).length, missions: s.missionsDone }; },
  world: () => scene && scene.w, sheet: (kind, params) => U.openSheet(kind, params), menu: () => { U.closeAllSheets(); U.showMenu(); },
  hunts: (n = 1, sum = { score: 120, meat: 4, flights: 4, caught: 3, bag: { hare: 2, sandgrouse: 1 } }) => { const s = S.data(), ev = []; for (let i = 0; i < n; i++) ev.push(...C.finishHunt(s, sum).events); M.settleLadder(s); S.save(); camp = null; if (U.shown('menu')) renderMenu(); return ev; },
  give: o => { const s = S.data(); if (o.coins) s.coins += o.coins; if (o.meat) s.meat += o.meat; if (o.xp) s.xp += o.xp; if (o.missions) s.missionsDone += o.missions; S.save(); camp = null; if (U.shown('menu')) renderMenu(); },
  lang: l => setLang(l), girl: b2 => { S.data().char = b2 ? 'mozah' : 'abood'; setGirl(!!b2); applyI18n(); camp = null; if (U.shown('menu')) renderMenu(); },
  save: { export: () => S.backup(), import: txt => S.restore(txt), reset: () => { S.resetSave(); camp = null; U.showMenu(); }, bytes: () => S.bytes(), data: () => S.data() },
  dropNet: R.debug.dropNet, race: R.debug.state, // online
} };
