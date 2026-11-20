// "Race a friend" (تحدّى ربعك): the lobby, the grown-up gate, the nickname and room-code pop cards, the 3-2-1
// countdown, the friend's state and the race box on the results card. Ported from Run, Abood! and made generic:
// this module owns the DOM of #friend, #fPop, #friendBtn, #oppChip and #raceBox; the game supplies three hooks and
// calls tick() every frame and out() when its round ends. See references/online.md for the rules it implements.
//
//   R.init({
//     onGo(seed, level)  start a deterministic round from this seed (hide menus, no grace, no boosters, no pause),
//     snapshot()         the small object to send 20× a second while playing, e.g. { x: 312, score: 40 },
//     level()            the host's chosen level (sent with the seed),
//     better(a, b)       optional: true when result a beats result b (default: a.score > b.score),
//   });
//   R.tick(dt, playing)  → false while the countdown holds (do not update the game), true otherwise
//   R.out({ score })     report my final result; R.active() / R.inRound() / R.opp() / R.oppAt() for drawing
import { T, lang } from './i18n.js';
import * as S from './save.js';
import * as N from './net.js';
import { $, note, show, showMenu } from './ui.js';
import { play, unlockAudio, buzz } from './audio.js';
import { avatarScene } from './art.js';

const num = v => (Number.isFinite(+v) ? +v : 0);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const GHOST_DELAY = 110, LOST_GIVEUP = 60000, SEND_EVERY = 0.05;
let race = null, H = {}, popKind = null, raf = 0;
const mp = () => { const d = S.data(); if (!d.mp) d.mp = { pid: '', name: '', ok: 0 }; if (!d.mp.pid) { d.mp.pid = Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join(''); S.save(); } return d.mp; };
// Race names are typed by the player: letters only, in the game's language (Arabic letters in Arabic, English
// letters in English), 2 to 12, single spaces; no numbers or symbols. Only the friend you race sees it.
const NAME_AR = /^[ء-غف-ي]+( [ء-غف-ي]+)*$/, NAME_EN = /^[A-Za-z]+( [A-Za-z]+)*$/;
const nameOk = n => typeof n === 'string' && n.length <= 12 && n.replace(/ /g, '').length >= 2 && (NAME_AR.test(n) || NAME_EN.test(n));
const nameFilter = v => (lang() === 'ar' ? v.replace(/[^ء-غف-ي ]/g, '') : v.replace(/[^A-Za-z ]/g, '')).replace(/^ +/, '').replace(/ {2,}/g, ' ').slice(0, 12);
const myName = () => (nameOk(mp().name) ? mp().name : T('ch_' + S.char()));
const newOpp = () => ({ here: false, pid: '', name: '', ch: 'abood', round: 0, res: null, out: false, run: false, gone: false, lost: false, lostAt: 0, buf: [], off: null, snap: null });

export const active = () => !!race;
export const inRound = () => !!race && !!race.seed && !race.me;
export const hold = () => (race ? race.hold : 0);
export const goT = () => (race ? race.goT : 0);
export const opp = () => race && race.opp;
export const oppGirl = () => !!race && race.opp.ch === 'mozah';
export const oppName = () => (race ? race.opp.name || T('ch_' + race.opp.ch) : '');
export const isHost = () => !!race && race.role === 'host';
export const myRaceName = myName;

export function init(hooks) {
  H = hooks || {};
  if (!$('friend')) return; // the online blocks were removed from index.html: nothing to wire
  $('friendBtn').onclick = () => { unlockAudio(); open(); };
  $('fLeave').onclick = () => { unlockAudio(); leave(); };
  $('fJoin').onclick = () => { unlockAudio(); openPop('code'); };
  $('fGo').onclick = () => { unlockAudio(); const a = $('fGo').dataset.act; if (a === 'mp_start') hostGo(); else if (a === 'mp_gateOk') gateOk(); else if (a === 'mp_host') goHost(); };
  $('fNameBtn').onclick = () => { unlockAudio(); openPop('name'); };
  $('fPopOk').onclick = () => { unlockAudio(); popOk(); };
  $('fPopCancel').onclick = () => { unlockAudio(); closePop(); };
  $('fGateA').addEventListener('keydown', e => { if (e.key === 'Enter') gateOk(); });
  $('fPopName').addEventListener('input', e => { if (e.isComposing) return; const v = e.target.value, f = nameFilter(v); if (f !== v) e.target.value = f; });
  $('fPopName').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); popOk(); } else if (e.key === 'Escape') closePop(); });
  codeBoxes().forEach((b, i, all) => {
    b.addEventListener('input', () => { const d = b.value.replace(/\D/g, ''); if (d.length > 1) { fillCode(d, i); return; } b.value = d; if (d && i < 5) all[i + 1].focus(); if (all.every(x => x.value)) popOk(); });
    b.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !b.value && i > 0) { e.preventDefault(); all[i - 1].value = ''; all[i - 1].focus(); }
      else if (e.key === 'Enter') { e.preventDefault(); popOk(); } else if (e.key === 'Escape') closePop();
    });
    b.addEventListener('paste', e => { const d = ((e.clipboardData && e.clipboardData.getData('text')) || '').replace(/\D/g, ''); if (d) { e.preventDefault(); fillCode(d, i); } });
  });
  // the results card: "Race again" is the host's; "Menu" becomes "Leave" while racing
  const again = $('againBtn'), menuBtn = $('overMenuBtn'), prevAgain = again.onclick, prevMenu = menuBtn.onclick;
  again.onclick = () => { if (race) { unlockAudio(); hostGo(); } else prevAgain && prevAgain(); };
  menuBtn.onclick = () => { if (race) leave(true); prevMenu && prevMenu(); };
  window.addEventListener('langchange', () => { renderFriend(); fillRace(); });
  setInterval(giveUpCheck, 1000);
}

// ---- lobby ----
export function open() {
  if (race) leave(true);
  race = { role: null, fs: 'choose', err: '', code: '', seed: 0, level: 0, hold: 0, goT: 0, sendT: 0, me: null, final: false, opp: newOpp() };
  show('friend');
  if (!mp().ok) { race.fs = 'gate'; newGateQ(); renderFriend(); setTimeout(() => $('fGateA').focus(), 50); return; } // a grown-up agrees once, before the first race
  renderFriend();
}
function newGateQ() { const a = 12 + Math.floor(Math.random() * 8), b = 3 + Math.floor(Math.random() * 7); race.gate = a * b; $('fGateQ').textContent = T('mp_gateQ', a, b); $('fGateQ').dataset.ab = a + 'x' + b; $('fGateA').value = ''; }
function gateOk() {
  if (!race || race.fs !== 'gate') return;
  if (parseInt($('fGateA').value.replace(/\D/g, ''), 10) !== race.gate) { note(T('mp_gateWrong')); newGateQ(); $('fGateA').focus(); return; }
  mp().ok = 1; S.save(); race.fs = 'choose'; renderFriend();
}
export function resetGate() { const d = S.data(); if (d.mp) { d.mp.ok = 0; S.save(); } }
export const gateDone = () => !!(S.data().mp && S.data().mp.ok);
function fillNameTag() { $('fNameTxt').textContent = myName(); }
// Pop-up cards over the lobby: one for the race name, one for the room code (six boxes).
const codeBoxes = () => [...$('fPopCode').querySelectorAll('input')];
function openPop(kind) {
  if (!canStart()) return;
  const name = kind === 'name', ar = lang() === 'ar'; popKind = kind; $('fPop').hidden = false;
  $('fPopName').hidden = !name; $('fPopCode').hidden = name; $('fPopHint').classList.remove('bad');
  $('fPopTitle').textContent = T(name ? 'mp_namePop' : 'mp_codePop');
  $('fPopHint').textContent = T(name ? (ar ? 'mp_nameHintAr' : 'mp_nameHintEn') : 'mp_codeHint');
  $('fPopOk').textContent = T(name ? 'mp_save' : 'mp_join');
  if (name) { const inp = $('fPopName'); inp.value = nameFilter(mp().name || ''); inp.dir = ar ? 'rtl' : 'ltr'; inp.lang = ar ? 'ar' : 'en'; inp.placeholder = T('ch_' + S.char()); setTimeout(() => inp.focus(), 60); }
  else { for (const b of codeBoxes()) b.value = ''; setTimeout(() => codeBoxes()[0].focus(), 60); }
}
function closePop() { $('fPop').hidden = true; popKind = null; }
function popBad(msg) { const h = $('fPopHint'); h.textContent = msg; h.classList.add('bad'); buzz(30); }
function popOk() {
  if (popKind === 'name') {
    const n = nameFilter($('fPopName').value).trim();
    if (n && !nameOk(n)) { popBad(T(lang() === 'ar' ? 'mp_nameBadAr' : 'mp_nameBadEn')); return; }
    mp().name = n; S.save(); closePop(); fillNameTag(); return; // an empty name means the character's own name
  }
  if (popKind === 'code') {
    const c = codeBoxes().map(b => b.value).join('');
    if (c.length !== 6) { popBad(T('mp_err_badcode')); return; }
    closePop(); goJoin(c);
  }
}
function fillCode(d, from) { const all = codeBoxes(); for (let k = 0; k < d.length && from + k < 6; k++) all[from + k].value = d[k]; all[Math.min(5, from + d.length)].focus(); if (all.every(x => x.value)) popOk(); }
// While connecting, the lobby shows a progress bar with each step, and the buttons are gone, so a slow (or waking)
// server never tempts a second tap; goHost/goJoin also ignore taps that arrive mid-connect.
function setConnecting() { race.fs = 'connecting'; race.stage = 'lib'; race.loadAt = race.stageAt = performance.now(); race.slow = false; cancelAnimationFrame(raf); raf = requestAnimationFrame(friendLoad); }
const canStart = () => race && (race.fs === 'choose' || race.fs === 'err');
const STAGE = { host: { lib: [0.05, 0.25, 'mp_st_lib'], server: [0.25, 0.85, 'mp_st_make'], retry: [0.5, 0.85, 'mp_st_retry'] },
  guest: { lib: [0.05, 0.25, 'mp_st_lib'], server: [0.25, 0.6, 'mp_st_server'], peer: [0.6, 0.95, 'mp_st_peer'] } };
const stageOf = () => (STAGE[race.role] || STAGE.host)[race.stage] || STAGE.host.lib;
function friendLoad() { // the bar creeps forward within the current step
  if (!race || race.fs !== 'connecting' || $('friend').hidden) return;
  const [a, b] = stageOf(), now = performance.now(), p = a + (b - a) * (1 - Math.exp(-(now - race.stageAt) / 6000));
  $('fLoadFill').style.transform = 'scaleX(' + p.toFixed(3) + ')';
  const slow = now - race.loadAt > 6000;
  if (slow !== race.slow) { race.slow = slow; $('fLoadHint').textContent = T(slow ? 'mp_slow' : 'mp_noTap'); }
  raf = requestAnimationFrame(friendLoad);
}
function goHost() { if (!canStart()) return; race.role = 'host'; setConnecting(); renderFriend(); N.host(mp().pid); }
function goJoin(code) {
  if (!canStart()) return; const c = N.cleanCode(code);
  if (c.length !== 6) { race.fs = 'err'; race.err = 'badcode'; renderFriend(); return; }
  race.role = 'guest'; setConnecting(); renderFriend(); N.join(c, mp().pid);
}
export function leave(quiet) {
  N.leave(); const was = race; race = null; cancelAnimationFrame(raf);
  if ($('raceBox')) { $('raceBox').hidden = true; $('over').classList.remove('racing'); }
  if ($('oppChip')) $('oppChip').hidden = true;
  const again = $('againBtn'); again.hidden = false; again.disabled = false; again.textContent = T('b_again'); $('overMenuBtn').textContent = T('b_menu');
  if (was && !$('friend').hidden && !quiet) showMenu();
  H.onLeave && H.onLeave();
}
function hello() {
  N.send({ t: 'hi', v: N.PROTO, pid: mp().pid, name: nameOk(mp().name) ? mp().name : '', ch: S.char(), seed: race.seed, me: race.me, live: inRound(), snap: race.last || null });
}
N.on('stage', s => { if (!race || race.fs !== 'connecting') return; race.stage = s; race.stageAt = performance.now(); renderFriend(); });
N.on('hosting', ({ code }) => { if (!race) return; race.code = code; if (race.fs === 'connecting') race.fs = 'waiting'; renderFriend(); });
N.on('open', () => { if (!race) return; race.fs = 'joined'; hello(); renderFriend(); });
N.on('error', why => { if (!race) return; race.fs = 'err'; race.err = why; renderFriend(); });
N.on('lost', () => {
  if (!race) return; const o = race.opp; if (o.gone || !o.here || o.lost) return;
  o.lost = true; o.lostAt = Date.now(); o.buf = [];
  note(T('mp_lost', oppName(), oppGirl()), 2500);
  renderFriend(); fillRace();
});
function giveUpCheck() { // a friend who stays away for a minute is out, with their last record
  if (!race || !race.opp.lost || Date.now() - race.opp.lostAt < LOST_GIVEUP) return;
  const o = race.opp; o.lost = false; o.gone = true; o.run = false; if (race.seed && o.round === race.seed) o.out = true;
  note(T('mp_left', oppName(), oppGirl()), 3000);
  if (race.role === 'guest') { N.leave(); if (!$('friend').hidden) { race.fs = 'err'; race.err = 'noroom'; } }
  else if (!$('friend').hidden) { race.opp = newOpp(); race.fs = 'waiting'; }
  renderFriend(); fillRace();
}
N.on('data', d => {
  if (!race) return; let o = race.opp;
  if (d.t === 'p') {
    if (o.round !== race.seed) return; // a position from a race we are not in
    const now = performance.now(), ts = num(d.ts), off = now - ts, b = o.buf;
    o.off = o.off == null || off < o.off ? off : o.off + (off - o.off) * 0.01; // the smallest delay seen, drifting slowly
    const last = b[b.length - 1], at = last ? Math.max(last.t + 1, ts + o.off) : ts + o.off;
    b.push({ t: at, s: d.s || {} }); if (b.length > 40) b.shift();
    o.snap = d.s || {}; o.run = true;
    if ($('oppChip') && !$('hud').hidden) { $('oppChip').hidden = false; $('oppChipName').textContent = oppName(); $('oppChipVal').textContent = num(o.snap.score) | 0; }
    fillRace();
  } else if (d.t === 'hi') {
    if (d.v !== N.PROTO) { note(T('mp_version'), 4000); leave(); return; }
    const pid = String(d.pid || '').slice(0, 40), back = !!o.pid && pid === o.pid;
    if (!back) { race.opp = o = newOpp(); o.pid = pid; o.round = num(d.seed) >>> 0; }
    o.name = nameOk(d.name) ? d.name : ''; o.ch = d.ch === 'mozah' ? 'mozah' : 'abood';
    o.here = true; o.gone = false;
    if (back) {
      const wasLost = o.lost; o.lost = false; o.buf = []; o.off = null;
      if (race.seed && o.round === race.seed) {
        if ((num(d.seed) >>> 0) === race.seed) { if (d.me) { o.out = true; o.run = false; o.res = d.me; } else { o.run = !!d.live; if (d.snap) o.snap = d.snap; } } // the same race: catch up
        else if (!o.out) { o.out = true; o.run = false; } // their page restarted mid-race: their last record counts
      }
      if (wasLost) note(T('mp_back', oppName(), oppGirl()));
    }
    renderFriend(); fillRace();
  } else if (d.t === 'go' && race.role === 'guest') {
    race.seed = num(d.seed) >>> 0; race.level = num(d.level) | 0; beginRace();
  } else if (d.t === 'out') {
    if (o.round !== race.seed) return;
    o.out = true; o.run = false; o.res = d.res || { score: 0 };
    note(T('mp_oppOut', oppName(), num(o.res.score) | 0), 2500);
    fillRace();
  } else if (d.t === 'bye') oppGone();
  else if (d.t === 'full') { note(T('mp_full'), 3500); leave(); }
});
function oppGone() { // the friend left on purpose
  if (!race || race.opp.gone) return; const o = race.opp;
  o.gone = true; o.lost = false; o.run = false;
  if (o.here) note(T('mp_left', oppName(), oppGirl()), 3000);
  if (race.role === 'guest') N.leave(); // the host closed the room: stop reconnecting
  if (!$('friend').hidden) {
    if (race.role === 'host' && race.code) { race.opp = newOpp(); race.fs = 'waiting'; } // another friend can still join the same code
    else { race.fs = 'err'; race.err = 'noroom'; }
  }
  renderFriend(); fillRace();
}
function hostGo() {
  if (!race || race.role !== 'host' || !N.isOpen() || !race.opp.here || race.opp.lost) return;
  const o = race.opp; if (race.seed && !race.me) return; if (race.me && o.round === race.seed && !o.out) return; // the next race starts once both have finished
  race.seed = crypto.getRandomValues(new Uint32Array(1))[0] || 1; race.level = (H.level && H.level()) | 0;
  N.send({ t: 'go', seed: race.seed, level: race.level }); beginRace();
}
function beginRace() {
  if (!race) return;
  Object.assign(race.opp, { round: race.seed, res: null, out: false, run: false, buf: [], off: null, snap: null });
  race.me = null; race.final = false; race.last = null; race.hold = 3; race.goT = 0; race.sendT = 0;
  if ($('oppChip')) $('oppChip').hidden = true;
  H.onGo && H.onGo(race.seed, race.level); play('tek', 1.2, 0.9); // classic: the same round for both, from the same seed
}
// every frame from the game: the 3-2-1 hold, then positions 20× a second. Returns false while everyone stands still.
export function tick(dt, playing) {
  if (!race) return true;
  if (race.hold > 0) {
    const k = Math.ceil(race.hold); race.hold -= dt;
    if (race.hold <= 0) { race.hold = 0; race.goT = 0.8; play('zone'); buzz(30); }
    else if (Math.ceil(race.hold) !== k) play('tek', 1.2, 0.9);
    return false;
  }
  race.goT = Math.max(0, race.goT - dt);
  if (!playing || race.me) return true;
  race.sendT -= dt; if (race.sendT > 0) return true; race.sendT = SEND_EVERY;
  const s = H.snapshot ? H.snapshot() : {}; race.last = s;
  N.send({ t: 'p', ts: Math.round(performance.now()), s });
  return true;
}
export function out(res) { if (!race) return; race.me = res || { score: 0 }; race.final = false; N.send({ t: 'out', res: race.me }); if ($('oppChip')) $('oppChip').hidden = true; }
// where the friend is now: GHOST_DELAY ms in the past, between the two snapshots around that moment (numbers blend)
export function oppAt() {
  if (!race) return null; const o = race.opp; if (!o.here || o.gone || o.out || o.round !== race.seed || !o.run) return null;
  const b = o.buf; if (!b.length) return null;
  const rt = performance.now() - GHOST_DELAY;
  let i = b.length - 1; while (i > 0 && b[i].t > rt) i--;
  const p = b[i], q = b[i + 1];
  if (!q) return p.s;
  const f = clamp((rt - p.t) / Math.max(1, q.t - p.t), 0, 1), s = Object.assign({}, q.s);
  for (const k in s) if (typeof s[k] === 'number' && typeof p.s[k] === 'number') s[k] = p.s[k] + (s[k] - p.s[k]) * f;
  return s;
}
// the race box on the results card
const better = (a, b) => (H.better ? H.better(a, b) : num(a.score) > num(b.score));
export function fillRace() {
  const box = $('raceBox'); if (!box) return;
  if (!race) { box.hidden = true; $('over').classList.remove('racing'); return; }
  const o = race.opp, on = !!race.me && !!race.seed && o.round === race.seed, done = o.out || o.gone || !o.here;
  const host = race.role === 'host', live = N.isOpen() && o.here && !o.gone && !o.lost;
  $('over').classList.toggle('racing', on);
  const again = $('againBtn'); again.hidden = !(host && live); again.disabled = on && !done; again.textContent = T('mp_rematch');
  $('raceHint').textContent = live && !host ? T('mp_hint') : ''; $('overMenuBtn').textContent = T('mp_leave');
  if (!on) { box.hidden = true; return; }
  const me = race.me, name = oppName(), g = oppGirl(), byRecord = o.out && o.res, or = o.res || { score: 0 };
  const iWin = done && (byRecord ? better(me, or) : true), theyWin = done && !!byRecord && better(or, me);
  box.hidden = false;
  $('raceMe').textContent = num(me.score) | 0; $('raceOpp').textContent = num(or.score) | 0; $('raceMeName').textContent = myName(); $('raceOppName').textContent = name;
  $('raceHead').textContent = !done ? (o.lost ? T('mp_lostWait', name, g) : T('mp_wait', name, g)) : !byRecord ? T('mp_winLeft') : iWin ? T('mp_win') : theyWin ? T('mp_lose', name, g) : T('mp_tie');
  box.querySelector('.race-me').classList.toggle('win', iWin); box.querySelector('.race-opp').classList.toggle('win', theyWin);
  if (done && !race.final) { race.final = true; if (iWin) { play('fanfare', 1.1, 0.8); buzz(30); } }
}
function renderFriend() {
  if (!race || !$('friend') || $('friend').hidden) return;
  const host = race.role === 'host', o = race.opp, fs = race.fs; let msg = '', go = null;
  const gate = fs === 'gate', choose = fs === 'choose' || fs === 'err', showCode = host && !!race.code && (fs === 'waiting' || o.lost || !o.here);
  $('fLoad').hidden = fs !== 'connecting'; $('fGate').hidden = !gate; $('fChoose').hidden = !choose; if (choose) fillNameTag(); $('fJoin').hidden = !choose; $('fVs').hidden = true; $('fCodeBig').hidden = !showCode;
  if (showCode) $('fCodeBig').textContent = N.showCode(race.code);
  if (gate) { msg = T('mp_gateLead'); go = 'mp_gateOk'; const ab = ($('fGateQ').dataset.ab || '').split('x'); if (ab.length === 2) $('fGateQ').textContent = T('mp_gateQ', ab[0], ab[1]); }
  else if (choose) { msg = fs === 'err' ? T('mp_err_' + race.err) : T('mp_choose'); go = 'mp_host'; }
  else if (fs === 'connecting') { msg = T(stageOf()[2]); $('fLoadHint').textContent = T(race.slow ? 'mp_slow' : 'mp_noTap'); }
  else if (o.lost) msg = host ? T('mp_lostTag', oppName()) : T('mp_reconnecting');
  else if (fs === 'waiting' || !o.here) msg = host ? T('mp_send') : T('mp_hello');
  else {
    $('fVs').hidden = false; $('fMeName').textContent = myName(); $('fOppName').textContent = oppName();
    avatarScene($('avMe'), S.char(), 0, 'smile'); avatarScene($('avOpp'), o.ch, 1, 'smile');
    msg = host ? T('mp_joined', oppName(), oppGirl()) : T('mp_waitHost'); if (host) go = 'mp_start';
  }
  $('fStatus').textContent = msg; $('fGo').hidden = !go; if (go) { $('fGo').textContent = T(go); $('fGo').dataset.act = go; }
}
export const debug = { dropNet: () => N.testDrop(), state: () => race && { role: race.role, fs: race.fs, seed: race.seed, hold: race.hold, me: race.me, opp: Object.assign({}, race.opp, { buf: race.opp.buf.length }) } };
