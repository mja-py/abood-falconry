import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fresh, tidy, upgrade, exportSave, importSave, SCHEMA } from '../js/sim/state.js';
import * as C from '../js/sim/career.js';
import * as M from '../js/sim/missions.js';
import { copies, unpack } from '../js/sim/genome.js';
import { mulberry } from '../js/sim/rng.js';
import { FACTS, QUIZ } from '../js/data/facts.js';

const sum = (caught, o = {}) => ({ caught, flights: 3, misses: 3 - caught, perfect: 1, clean: 1, score: caught * 40, ...o });

test('a new game: one young saker hen that carries Barq, Baba keeps three birds, the same seed starts the same', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const s = fresh(seed), mine = C.mine(s), b = mine[0];
    assert.equal(mine.length, 1); assert.equal(s.birds.length, 4); assert.equal(b.sex, 'f'); assert.equal(copies(C.genomeOf(b), 'barq'), 1);
    assert.equal(C.stageOf(s, b), 'farkh'); assert.equal(C.isAdult(s, b), false); assert.equal(s.active, b.id);
    assert.ok(s.birds.filter(x => x.own === 'baba').every(x => C.isAdult(s, x)));
  }
  assert.deepEqual(fresh(7), fresh(7)); assert.notDeepEqual(fresh(7).birds[3].g, fresh(8).birds[3].g);
});

test('the calendar: four seasons a year, hunting only in season and with a licence', () => {
  const s = fresh(3); assert.equal(C.seasonOf(0), 'hunt'); assert.equal(C.seasonOf(16), 'fest'); assert.equal(C.seasonOf(24), 'breed'); assert.equal(C.seasonOf(36), 'moult'); assert.equal(C.seasonOf(48), 'hunt');
  assert.equal(C.mayGo(s, 'majlis').ok, true); assert.equal(C.mayGo(s, 'ground').ok, true); assert.equal(C.mayGo(s, 'remah').why, 'locked');
  C.finishOuting(s, 'train', 'lure', sum(3)); assert.equal(s.lesson, C.LESSON_DONE); assert.equal(s.week, 1); assert.equal(C.mayGo(s, 'remah').why, 'licence');
  assert.equal(C.buy(s, 'licence').ok, true); assert.equal(s.coins, 500 + 120 - C.LICENCE_FEE); assert.equal(C.mayGo(s, 'remah').ok, true);
  s.food = 100; while (C.seasonOf(s.week) === 'hunt') C.weekTick(s); assert.equal(C.mayGo(s, 'remah').why, 'closed');
  while (C.seasonOf(s.week) !== 'moult') C.weekTick(s); assert.equal(C.active(s).moult, 1, 'hatched last spring, she moults this summer'); assert.equal(C.mayGo(s, 'ground').why, 'moult'); assert.equal(C.mayGo(s, 'majlis').ok, true);
  const tr = C.active(s).tr.speed; while (C.yearOf(s.week) < 1) C.weekTick(s); assert.equal(C.mayGo(s, 'remah').why, 'licence', 'a licence lasts one season'); assert.ok(C.active(s).tr.speed <= tr);
  while (C.seasonOf(s.week) !== 'hunt') C.weekTick(s); assert.equal(C.active(s).moult, 0); assert.equal(C.active(s).fe, 1);
});

test('care: food is eaten each week, a hungry falcon loses weight and is grounded, never punished at random', () => {
  const s = fresh(4), b = C.active(s); s.food = 2;
  C.weekTick(s); C.weekTick(s); assert.equal(s.food, 0); assert.ok(Math.abs(b.w - 1) < 0.01);
  const ev = C.weekTick(s); assert.ok(ev.some(e => e.type === 'hungry')); assert.ok(b.w < 1);
  for (let i = 0; i < 5; i++) C.weekTick(s); assert.equal(C.grounded(s, b), 'thin'); assert.ok(C.cond(b) < 1);
  s.food = 20; C.setRation(s, b.id, 2); for (let i = 0; i < 8; i++) C.weekTick(s); assert.ok(b.w > 1.03, 'a full ration makes a heavy bird'); assert.equal(C.grounded(s, b), null);
  C.setRation(s, b.id, 1); const man = b.man; assert.equal(C.feedOnFist(s, b.id), true); assert.ok(b.man > man); assert.equal(C.feedOnFist(s, b.id), false, 'once a week');
});

test('training: outings raise what the falcon can do, up to full training, and good flying teaches faster', () => {
  const a = fresh(5), b = fresh(5); a.food = b.food = 200;
  for (let i = 0; i < 6; i++) { C.finishOuting(a, 'train', 'lure', sum(3, { perfect: 3, clean: 3 })); C.finishOuting(b, 'train', 'lure', sum(0, { perfect: 0, clean: 0 })); }
  assert.ok(C.active(a).tr.speed > C.active(b).tr.speed); assert.ok(C.active(b).tr.speed > 0.2);
  const before = C.statsOf(fresh(5), C.active(fresh(5))).speed; assert.ok(C.statsOf(a, C.active(a)).speed > before);
  for (let i = 0; i < 40; i++) C.finishOuting(a, 'train', 'lure', sum(3)); for (const t of Object.values(C.active(a).tr)) assert.ok(t <= 1);
  assert.ok(C.active(a).man === 1);
});

test('breeding: Baba\'s clutch in the first spring gives two chicks at least, and Abood keeps one', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const s = fresh(seed); s.food = 500;
    assert.equal(C.mayPair(s), 'season'); while (C.seasonOf(s.week) !== 'breed') C.weekTick(s);
    const p = C.pairable(s); assert.equal(p.dams.length, 1); assert.equal(p.sires.length, 2); assert.equal(p.dams[0].own, 'baba');
    const r = C.startClutch(s, p.sires[seed % 2].id, p.dams[0].id); assert.ok(r.ok); assert.ok(s.clutch.eggs.filter(e => e.fertile).length >= 2); assert.equal(C.mayPair(s), 'busy');
    let ev = []; for (let i = 0; i < 5; i++) ev = ev.concat(C.weekTick(s)); assert.ok(ev.some(e => e.type === 'hatch')); assert.equal(s.clutch.stage, 'chicks');
    for (let i = 0; i < 7; i++) ev = ev.concat(C.weekTick(s)); assert.ok(ev.some(e => e.type === 'fledge' && e.baba)); assert.equal(s.clutch.stage, 'fledged');
    const kept = C.keepChicks(s, [0]); assert.equal(kept.length, 1); assert.equal(s.clutch, null); assert.equal(C.mine(s).length, 2); assert.equal(s.stats.chicks, 1);
    assert.equal(kept[0].s, p.sires[seed % 2].id); assert.equal(kept[0].d, p.dams[0].id); assert.ok(unpack(kept[0].g));
    assert.equal(s.ped.length, 5); assert.equal(C.stageOf(s, kept[0]), 'farkh');
  }
});

test('breeding: the starter hen breeds in her second spring, and close kin cost fertility, never permission', () => {
  const s = fresh(9); s.food = 2000; while (!(C.yearOf(s.week) === 1 && C.seasonOf(s.week) === 'breed')) C.weekTick(s);
  const p = C.pairable(s), hen = C.active(s); assert.ok(p.dams.some(b => b.id === hen.id), 'the starter is adult now');
  const father = C.bird(s, hen.s), r = C.startClutch(s, father.id, hen.id); assert.ok(r.ok, 'father and daughter may be paired'); assert.equal(s.clutch.F, 0.25); assert.equal(s.clutch.baba, false);
  for (let i = 0; i < 12; i++) C.weekTick(s); assert.equal(s.clutch, null, 'own chicks join the mews by themselves'); for (const b of C.mine(s).slice(1)) assert.equal(b.F, 0.25);
});

test('the shop: pretend dirhams, nothing bought twice, nothing sold that is not needed', () => {
  const s = fresh(2); assert.equal(C.buy(s, 'imping').why, 'fine'); assert.equal(C.buy(s, 'checkup').why, 'fine');
  assert.equal(C.buy(s, 'perch').ok, true); assert.equal(C.buy(s, 'perch').why, 'owned'); assert.equal(s.coins, 100);
  assert.equal(C.buy(s, 'scale').why, 'coins'); assert.equal(s.coins, 100); s.coins = 1000;
  assert.equal(C.buy(s, 'hood_gold').ok, true); assert.equal(s.gear.hood, 'hood_gold'); assert.equal(C.buy(s, 'hood_gold').worn, true);
  const f = s.food; C.buy(s, 'food10'); assert.equal(s.food, f + 10); C.active(s).fe = 0.4; assert.equal(C.buy(s, 'imping').ok, true); assert.equal(C.active(s).fe, 1);
  assert.equal(C.buy(s, 'dna').ok, true); assert.equal(C.buy(s, 'dna').why, 'owned');
});

test('missions: the ladder pays and raises the multiplier, dailies renew, badges pay once per tier, Mozah joins at ten', () => {
  const s = fresh(6); s.food = 500; const set = M.ladderSet(s).map(m => m.k); assert.equal(set.length, 3); assert.equal(M.settleLadder(s), null); assert.equal(C.mult(s), 1);
  for (let i = 0; i < 12; i++) { C.finishOuting(s, 'train', 'lure', sum(3)); C.feedOnFist(s, s.active); }
  const up = M.settleLadder(s); assert.ok(up && up.lv === 2); assert.equal(C.mult(s), 1.1); assert.equal(s.missionsDone, 3);
  const d1 = M.dailyList(s, '2027-01-01'); assert.equal(d1.length, 3); assert.equal(M.claimDaily(s, 0), 0, 'not done yet');
  for (let i = 0; i < 10; i++) { C.finishOuting(s, 'train', 'lure', sum(3, { perfect: 3, clean: 3 })); C.feedOnFist(s, s.active); s.stats.quizRight += 3; }
  const coins = s.coins; let paid = 0; for (let i = 0; i < 3; i++) paid += M.claimDaily(s, i); assert.equal(paid, 3 * M.DAILY_REWARD + M.DAILY_ALL); assert.equal(s.coins, coins + paid); assert.equal(M.claimDaily(s, 0), 0);
  assert.notDeepEqual(M.dailyList(s, '2027-01-02').map(m => m.from), d1.map(m => m.from));
  const b1 = M.settleBadges(s); assert.ok(b1.length > 0); assert.equal(M.settleBadges(s).length, 0, 'a tier pays once');
  assert.equal(M.girlOpen(s), s.missionsDone >= 10); s.missionsDone = 10; assert.equal(M.girlOpen(s), true);
  assert.equal(M.loginDay(s, 'd2', 'd1'), 0); assert.equal(M.claimLogin(s, 'd2', 'd1'), 1); assert.equal(M.loginDay(s, 'd2', 'd1'), -1); assert.equal(M.loginDay(s, 'd3', 'd2'), 1); assert.equal(M.loginDay(s, 'd9', 'd8'), 0);
});

test('facts: every outing teaches one new fact until the Book is full, and every quiz has its fact', () => {
  const s = fresh(1), seen = new Set(); s.food = 9999;
  for (let i = 0; i < FACTS.length + 5; i++) { const r = C.finishOuting(s, i % 2 ? 'hunt' : 'train', i % 2 ? 'hare' : 'lure', sum(2)); if (r.fact) { assert.ok(!seen.has(r.fact)); seen.add(r.fact); } }
  assert.equal(seen.size, FACTS.length); for (const q of QUIZ) { assert.ok(FACTS.some(f => f.id === q.id)); assert.ok(q.right >= 0 && q.right <= 2); }
});

test('saves: repair never throws, backup round-trips, a newer save is refused', () => {
  const s = fresh(11); s.food = 500; for (let i = 0; i < 30; i++) C.finishOuting(s, 'train', 'lure', sum(2));
  const again = tidy(JSON.parse(JSON.stringify(s))); assert.deepEqual(tidy(JSON.parse(JSON.stringify(again))), again, 'tidy is stable');
  const code = exportSave(s), back = importSave(code); assert.ok(back.ok); assert.equal(back.save.week, s.week); assert.equal(back.save.coins, s.coins); assert.deepEqual(back.save.birds.map(b => b.g), s.birds.map(b => b.g));
  assert.equal(importSave(code.slice(0, -1) + (code.endsWith('0') ? '1' : '0')).why, 'damaged'); assert.equal(importSave('hello').why, 'format'); assert.equal(importSave(code.slice(0, 40) + 'A' + code.slice(41)).ok, false);
  assert.equal(upgrade({ v: SCHEMA + 1 }).why, 'newer'); assert.equal(upgrade(null).ok, false);
  const r = mulberry(3), junk = [null, 5, 'x', [], {}, { birds: 'no' }, { birds: [{}, { id: 1, g: 'bad' }], coins: -5, week: 'x', ladder: [], stats: null }];
  for (let i = 0; i < 400; i++) { const o = JSON.parse(JSON.stringify(s)), keys = Object.keys(o), k = keys[Math.floor(r() * keys.length)]; o[k] = [null, undefined, -1, 1e99, 'x', [], {}, NaN][Math.floor(r() * 8)]; if (r() < 0.3 && o.birds && o.birds[0]) o.birds[Math.floor(r() * o.birds.length)].g = 'zzz'; junk.push(o); }
  for (const j of junk) { const t = tidy(j); assert.ok(C.mine(t).length >= 1, 'a falconer always has a falcon'); assert.ok(C.active(t)); assert.ok(Number.isFinite(t.coins) && t.coins >= 0); assert.doesNotThrow(() => { C.statsOf(t, C.active(t)); C.weekTick(t); M.ladderSet(t); M.dailyList(t, 'd'); M.settleBadges(t); }); }
});
