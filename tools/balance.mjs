// The balance simulator: plays whole careers on the game's own rules and reports how the loop feels in numbers.
//   node tools/balance.mjs [--careers 100] [--hunts 60] [--skill 0.5] [--assert]
// Each hunt is flown by a bot in the real hunt simulation; between hunts a sensible player feeds, enhances, breeds,
// keeps the best chicks and sells the rest. Hours are flown seconds plus MENU seconds between hunts.
import { fresh } from '../js/sim/state.js';
import * as C from '../js/sim/career.js';
import * as M from '../js/sim/missions.js';
import { create, step, summary } from '../js/sim/hunt-sim.js';
import { makeBot } from '../js/sim/hunt-bot.js';

const arg = (name, d) => { const i = process.argv.indexOf('--' + name); return i < 0 ? d : process.argv[i + 1] === undefined || process.argv[i + 1].startsWith('--') ? true : +process.argv[i + 1]; };
const CAREERS = arg('careers', 100), HUNTS = arg('hunts', 60), SKILL = arg('skill', 0.5), ASSERT = !!arg('assert', false), MENU = 35;
export const TARGETS = { firstHuntCatch: 1, huntSecs: [45, 240], firstChickHunts: 4, level3ByHunt: 40, neverStuck: true };

function between(s) { // what a sensible child does at camp
  C.feedAll(s); while (s.meat < 2 && s.coins >= 60) C.buyMeat(s, 1); C.feedAll(s);
  const birds = () => C.mine(s).filter(b => C.canFly(s, b)).sort((a, b) => C.starSum(b) - C.starSum(a));
  const best = birds()[0]; if (best && best.id !== s.active) s.active = best.id;
  // enhance the hunting falcon, cheapest step first
  for (let guard = 0; guard < 20; guard++) { const b = C.active(s), st = C.starsOf(b), k = C.STATS.filter(x => b.lv[x] < st[x]).sort((x, y) => b.lv[x] - b.lv[y])[0]; if (!k || s.coins < C.ENHANCE_COST[b.lv[k]] + 60) break; if (!C.enhance(s, b.id, k).ok) break; }
  // breed whenever a nest is free: the best hen with the best tiercel
  const p = C.pairable(s); if (s.nests.length < s.nestCap && p.dams.length && p.sires.length) { const dam = p.dams.sort((a, b) => C.starSum(b) - C.starSum(a))[0], sire = p.sires.sort((a, b) => C.starSum(b) - C.starSum(a))[0]; C.pair(s, sire.id, dam.id); }
  // keep the three best, sell the rest once they can fly
  const all = birds(); for (const b of all.slice(3)) if (b.id !== s.active) C.sell(s, b.id);
  if (C.mine(s).length >= s.mewsCap && C.mewsCost(s) != null && s.coins > C.mewsCost(s) * 2) C.buyMews(s);
}
function career(seed) {
  const s = fresh(seed), log = { secs: 0, firstCatch: 0, firstChick: -1, level3: -1, caught: [], huntSecs: [], stuck: 0, coins: 0 };
  for (let h = 0; h < HUNTS; h++) {
    between(s);
    const b = C.active(s), w = create({ seed: (seed * 7919 + h * 104729) >>> 0, stats: C.statsOf(s, b), level: C.level(s), lesson: !s.lesson }), bot = makeBot(SKILL, seed + h);
    let n = 0; while (!w.done && n++ < 60 * 60 * 8) step(w, bot(w)); if (!w.done) { log.stuck++; w.done = true; }
    const sum = summary(w); if (h === 0) log.firstCatch = sum.caught;
    C.finishHunt(s, sum); M.settleLadder(s); M.settleBadges(s);
    log.caught.push(sum.caught); log.huntSecs.push(w.t); log.secs += w.t + MENU;
    if (log.firstChick < 0 && s.stats.chicks > 0) log.firstChick = h + 1; if (log.level3 < 0 && C.level(s) >= 3) log.level3 = h + 1;
  }
  const best = C.mine(s).sort((a, b) => C.starSum(b) - C.starSum(a))[0];
  return Object.assign(log, { coins: s.coins, level: C.level(s), birds: C.mine(s).length, sold: s.stats.sold, chicks: s.stats.chicks, bestStars: C.starSum(best), rare: C.mine(s).filter(b => C.rareOf(b).some(r => r.shows === 1)).length, lv: s.ladder.lv, bytes: JSON.stringify(s).length, houbara: s.stats.houbara });
}
const pct = (list, p) => { const a = list.slice().sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : NaN; }, mean = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
const logs = []; for (let i = 1; i <= CAREERS; i++) logs.push(career(i));
const three = f => [0.1, 0.5, 0.9].map(p => f(pct(logs.map(l => l.__v), p))).join(' / ');
const col = (get, fmt = v => v) => { for (const l of logs) l.__v = get(l); return three(fmt); };
const out = {
  careers: CAREERS, 'hunts each': HUNTS, skill: SKILL,
  'catches on the very first hunt (min)': Math.min(...logs.map(l => l.firstCatch)),
  'catches per hunt: hunts 1-10 / 11-30 / 31+': [mean(logs.flatMap(l => l.caught.slice(0, 10))), mean(logs.flatMap(l => l.caught.slice(10, 30))), mean(logs.flatMap(l => l.caught.slice(30)))].map(v => v.toFixed(1)).join(' / '),
  'seconds per hunt (p10 / p50 / p90)': [0.1, 0.5, 0.9].map(p => pct(logs.flatMap(l => l.huntSecs), p).toFixed(0)).join(' / '),
  'hours for all hunts (p10 / p50 / p90)': col(l => l.secs, v => (v / 3600).toFixed(2)),
  'first chick after hunt (p10 / p50 / p90)': col(l => l.firstChick), 'level 3 (houbara) after hunt (p10 / p50 / p90)': col(l => l.level3),
  'level at the end (p10 / p50 / p90)': col(l => l.level), 'dirhams at the end (p10 / p50 / p90)': col(l => l.coins),
  'falcons sold (p50)': pct(logs.map(l => l.sold), 0.5), 'chicks hatched (p50)': pct(logs.map(l => l.chicks), 0.5), 'best falcon, stars of 25 (p10 / p50 / p90)': col(l => l.bestStars),
  'careers with a rare gene showing': logs.filter(l => l.rare > 0).length, 'houbara caught (p50)': pct(logs.map(l => l.houbara), 0.5),
  'hunts that never ended': logs.reduce((a, l) => a + l.stuck, 0), 'save size in characters (max)': Math.max(...logs.map(l => l.bytes)),
};
console.table(out);
if (ASSERT) {
  const fail = [], hs = pct(logs.flatMap(l => l.huntSecs), 0.5);
  if (out['catches on the very first hunt (min)'] < TARGETS.firstHuntCatch) fail.push('a first hunt ended with no catch');
  if (!(hs >= TARGETS.huntSecs[0] && hs <= TARGETS.huntSecs[1])) fail.push(`a typical hunt takes ${hs.toFixed(0)} s`);
  if (pct(logs.map(l => l.firstChick), 0.9) > TARGETS.firstChickHunts || logs.some(l => l.firstChick < 0)) fail.push('the first chick comes too late');
  if (HUNTS >= 40 && pct(logs.map(l => (l.level3 < 0 ? 999 : l.level3)), 0.5) > TARGETS.level3ByHunt) fail.push('level 3 comes too late');
  if (out['hunts that never ended'] > 0) fail.push('some hunts never ended');
  if (fail.length) { console.error('BALANCE FAIL: ' + fail.join('; ')); process.exit(1); }
  console.log('balance targets met');
}
