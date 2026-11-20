// The balance simulator: plays whole careers on the game's own rules and reports how long things take.
//   node tools/balance.mjs [--careers 200] [--years 2] [--skill 0.5] [--assert]
// Hours are costed as flown seconds (hunt-sim under a bot) plus MENU seconds of menus and reading per week.
// Today it covers the first-years slice (training, hunting, Baba's clutch, the first own clutch). The long game's targets
// (a lucky player needs at least 300 h for 100%) are asserted here as those systems land; see TARGETS.
import { fresh } from '../js/sim/state.js';
import * as C from '../js/sim/career.js';
import * as M from '../js/sim/missions.js';
import { create, step } from '../js/sim/hunt-sim.js';
import { makeBot } from '../js/sim/hunt-bot.js';
import { QUIZ } from '../js/data/facts.js';
import { mulberry } from '../js/sim/rng.js';

const arg = (name, d) => { const i = process.argv.indexOf('--' + name); return i < 0 ? d : process.argv[i + 1] === undefined || process.argv[i + 1].startsWith('--') ? true : +process.argv[i + 1]; };
const CAREERS = arg('careers', 200), YEARS = arg('years', 2), SKILL = arg('skill', 0.5), ASSERT = !!arg('assert', false);
const MENU = 40, QUIZ_SECS = 45;                    // seconds of menus per week; a majlis round
export const TARGETS = { firstChickHoursMax: 3.0, yearHours: [1.2, 3.2], hareRate: [0.55, 0.99], neverStarve: true };

function outing(s, place, quarry, skill, n) {
  const b = C.active(s), kind = place === 'ground' ? 'train' : 'hunt', q = kind === 'train' ? 'lure' : quarry;
  const w = create({ seed: (n * 2654435761) >>> 0, quarry: q, stats: C.statsOf(s, b), dir: C.tune(s, q) }), bot = makeBot(skill, n);
  let k = 0; while (!w.done && k++ < 60000) step(w, bot(w));
  const res = C.finishOuting(s, kind, q, { caught: w.caught, flights: w.flights, misses: w.misses, perfect: w.perfect, clean: w.clean, score: w.score });
  M.settleLadder(s); M.settleBadges(s);
  return { secs: w.t, res, caught: w.caught, flights: w.flights };
}
function career(seed, skill, years) {
  const s = fresh(seed), r = mulberry(seed * 13 + 5), log = { secs: 0, firstChick: -1, starve: 0, hare: [0, 0], grouse: [0, 0], coinsYear: [], yearSecs: [], trained: 0 };
  let n = 0, yearStart = 0, coinsStart = s.coins;
  while (C.yearOf(s.week) < years) {
    const week0 = s.week, season = C.seasonOf(s.week), b = C.active(s);
    // the shopping a sensible player does: keep two weeks of food, buy the licence, mend the bird
    const need = C.mine(s).length * 2.6; while (s.food < need && s.coins >= 20) C.buy(s, s.coins >= 400 ? 'food10' : 'food');
    if (season === 'hunt' && s.licence !== C.yearOf(s.week) && s.lesson >= C.LESSON_DONE) C.buy(s, 'licence');
    if (b.fe < 0.7) C.buy(s, 'imping'); if (b.hp < 0.7) C.buy(s, 'checkup');
    C.feedOnFist(s, b.id);
    if (season === 'breed' && !C.mayPair(s)) { const p = C.pairable(s), dam = p.dams.find(x => x.own === 'me') || p.dams[0], sire = p.sires[Math.floor(r() * p.sires.length)]; if (dam && sire) C.startClutch(s, sire.id, dam.id); }
    if (s.clutch && s.clutch.stage === 'fledged' && s.clutch.baba) { C.keepChicks(s, [0]); }
    if (log.firstChick < 0 && s.stats.chicks > 0) log.firstChick = log.secs;
    let secs;
    const hunt = C.mayGo(s, 'remah').ok, train = C.mayGo(s, 'ground').ok;
    if (hunt && (b.tr.speed > 0.3 || r() < 0.5)) { const q = b.tr.speed > 0.6 && r() < 0.4 ? 'sandgrouse' : 'hare', o = outing(s, 'remah', q, skill, ++n); secs = o.secs; const t = q === 'hare' ? log.hare : log.grouse; t[0] += o.caught; t[1] += o.flights; }
    else if (train && r() < 0.8) secs = outing(s, 'ground', 'lure', skill, ++n).secs;
    else { // Baba's majlis: three questions, then the week passes
      let right = 0; for (let i = 0; i < 3; i++) if (r() < 0.45 + skill * 0.5) right++;
      s.stats.quizRight += right; s.coins += Math.round(right * 15 * C.mult(s)); s.stats.outings++; C.weekTick(s); M.settleLadder(s); M.settleBadges(s); secs = QUIZ_SECS;
    }
    for (const x of C.mine(s)) if (x.w < 0.86) log.starve++;
    log.secs += secs + MENU; if (s.week === week0) { C.weekTick(s); }
    if (C.weekOfYear(s.week) === 0 && s.week > 0 && log.yearSecs.length < C.yearOf(s.week)) { log.yearSecs.push(log.secs - yearStart); yearStart = log.secs; log.coinsYear.push(s.coins - coinsStart); coinsStart = s.coins; }
  }
  log.trained = C.active(s).tr.speed; log.coins = s.coins; log.birds = C.mine(s).length; log.lv = s.ladder.lv; log.bytes = JSON.stringify(s).length; log.missions = s.missionsDone;
  return log;
}
const pct = (list, p) => { const a = list.slice().sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : NaN; };
const h = s => (s / 3600).toFixed(2);
const logs = []; for (let i = 1; i <= CAREERS; i++) logs.push(career(i, SKILL, YEARS));
const chick = logs.map(l => l.firstChick).filter(v => v >= 0), y1 = logs.map(l => l.yearSecs[0]), hare = logs.reduce((a, l) => [a[0] + l.hare[0], a[1] + l.hare[1]], [0, 0]), gr = logs.reduce((a, l) => [a[0] + l.grouse[0], a[1] + l.grouse[1]], [0, 0]);
const out = {
  careers: CAREERS, years: YEARS, skill: SKILL,
  'hours to first chick (p10 / p50 / p90)': [pct(chick, 0.1), pct(chick, 0.5), pct(chick, 0.9)].map(h).join(' / '), 'careers with a chick': chick.length,
  'hours in year 1 (p10 / p50 / p90)': [pct(y1, 0.1), pct(y1, 0.5), pct(y1, 0.9)].map(h).join(' / '),
  'dirhams earned in year 1 (p10 / p50 / p90)': [0.1, 0.5, 0.9].map(p => pct(logs.map(l => l.coinsYear[0]), p)).join(' / '),
  'hare catch rate': (hare[0] / Math.max(1, hare[1])).toFixed(2), 'sandgrouse catch rate': (gr[0] / Math.max(1, gr[1])).toFixed(2),
  'training reached (median)': pct(logs.map(l => l.trained), 0.5).toFixed(2), 'ladder level (median)': pct(logs.map(l => l.lv), 0.5), 'missions done (median)': pct(logs.map(l => l.missions), 0.5),
  'weeks a bird went hungry (total)': logs.reduce((a, l) => a + l.starve, 0), 'save size in characters (max)': Math.max(...logs.map(l => l.bytes)),
};
console.table(out);
if (ASSERT) {
  const fail = [];
  if (!(pct(chick, 0.9) / 3600 <= TARGETS.firstChickHoursMax)) fail.push('first chick takes too long');
  if (!(pct(y1, 0.5) / 3600 >= TARGETS.yearHours[0] && pct(y1, 0.5) / 3600 <= TARGETS.yearHours[1])) fail.push('year 1 length is outside ' + TARGETS.yearHours.join('–') + ' h');
  const hr = hare[0] / Math.max(1, hare[1]); if (!(hr >= TARGETS.hareRate[0] && hr <= TARGETS.hareRate[1])) fail.push('hare catch rate ' + hr.toFixed(2) + ' is outside target');
  if (out['weeks a bird went hungry (total)'] > CAREERS * 2) fail.push('birds go hungry too often');
  if (fail.length) { console.error('BALANCE FAIL: ' + fail.join('; ')); process.exit(1); }
  console.log('balance targets met');
}
