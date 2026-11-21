import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fresh, tidy, upgrade, exportSave, importSave, SCHEMA } from '../js/sim/state.js';
import * as C from '../js/sim/career.js';
import * as M from '../js/sim/missions.js';
import { copies, unpack, founder, pack } from '../js/sim/genome.js';
import { mulberry } from '../js/sim/rng.js';
import { FACTS } from '../js/data/facts.js';

const sum = (caught, o = {}) => ({ caught, flights: 4, score: caught * 40, meat: caught * 2, bag: caught ? { hare: caught } : {}, ...o });
const hunts = (s, n, caught = 2) => { let ev = []; for (let i = 0; i < n; i++) ev = ev.concat(C.finishHunt(s, sum(caught)).events); return ev; };

test('a new game: a grown saker hen that carries Barq, and Baba\'s two tiercels to breed from', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const s = fresh(seed), mine = C.mine(s), b = mine[0];
    assert.equal(mine.length, 1); assert.equal(s.birds.length, 3); assert.equal(b.sex, 'f'); assert.equal(copies(C.genomeOf(b), 'barq'), 1);
    assert.ok(C.canFly(s, b)); assert.ok(C.isAdult(s, b)); assert.equal(s.active, b.id); assert.equal(C.level(s), 1);
    const p = C.pairable(s); assert.equal(p.dams.length, 1); assert.equal(p.sires.length, 2); assert.ok(p.sires.every(x => x.own === 'baba'));
    for (const k of C.STATS) { assert.ok(C.starsOf(b)[k] >= 1 && C.starsOf(b)[k] <= 5); assert.ok(C.statsOf(s, b)[k] > 0); }
  }
  assert.deepEqual(fresh(7), fresh(7)); assert.notDeepEqual(fresh(7).birds[2].g, fresh(8).birds[2].g);
});

test('hunt: a catch pays dirhams, meat and experience, and everyone gets hungrier', () => {
  const s = fresh(3), b = C.active(s), r = C.finishHunt(s, sum(3));
  assert.equal(r.coins, 120); assert.equal(s.coins, 420); assert.equal(s.meat, 4 + 6); assert.equal(s.xp, 120); assert.equal(s.hunts, 1); assert.equal(s.lesson, 1);
  assert.ok(Math.abs(b.fed - 0.65) < 1e-9); assert.equal(s.stats.hare, 3); assert.equal(s.stats.catches, 3); assert.ok(r.fact && s.facts[r.fact]);
  const seen = new Set([r.fact]); for (let i = 0; i < FACTS.length + 3; i++) { const f = C.finishHunt(s, sum(1)).fact; if (f) { assert.ok(!seen.has(f)); seen.add(f); } } assert.equal(seen.size, FACTS.length, 'one new fact per hunt until all are known');
  assert.equal(C.levelOf(0), 1); assert.equal(C.levelOf(299), 1); assert.equal(C.levelOf(300), 2); assert.equal(C.levelOf(900), 3); assert.equal(C.xpFor(3), 900);
  const up = fresh(4); up.xp = 280; assert.ok(C.finishHunt(up, sum(2)).events.some(e => e.type === 'level' && e.level === 2));
});

test('feed: meat fills a falcon, a hungry falcon is weaker, and it never comes to harm', () => {
  const s = fresh(5), b = C.active(s), full = C.statsOf(s, b).speed;
  assert.equal(C.feed(s, b.id), false, 'a full falcon does not eat'); hunts(s, 3, 0); assert.ok(b.fed < C.HUNGRY); assert.ok(C.statsOf(s, b).speed < full);
  for (let i = 0; i < 6; i++) hunts(s, 1, 0); assert.equal(b.fed, 0); assert.ok(C.canFly(s, b), 'a hungry falcon still flies');
  const m = s.meat; assert.equal(C.feed(s, b.id), true); assert.equal(s.meat, m - 1); assert.equal(b.fed, 0.5); C.feed(s, b.id); assert.equal(b.fed, 1); assert.equal(s.stats.fed, 2);
  s.meat = 0; b.fed = 0.2; assert.equal(C.feed(s, b.id), false); s.meat = 5; assert.ok(C.feedAll(s) >= 1); assert.ok(b.fed > 0.5);
});

test('enhance: training costs dirhams, makes the falcon better, and stops at what its genes allow', () => {
  const s = fresh(6), b = C.active(s), cap = C.starsOf(b).speed, before = C.statsOf(s, b).speed; s.coins = 100000;
  for (let i = 0; i < cap; i++) { const c = s.coins, r = C.enhance(s, b.id, 'speed'); assert.ok(r.ok); assert.equal(c - s.coins, C.ENHANCE_COST[i]); }
  assert.equal(b.lv.speed, cap); assert.ok(C.statsOf(s, b).speed > before); assert.equal(C.enhance(s, b.id, 'speed').why, 'genes'); assert.equal(s.stats.enhanced, cap);
  s.coins = 10; assert.equal(C.enhance(s, b.id, 'eyes').why, 'coins'); assert.equal(C.enhance(s, b.id, 'luck').ok, false);
});

test('breed: a pair lays, eggs hatch after two hunts, chicks fly after three and breed after six', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const s = fresh(seed); s.mewsCap = 6; const p = C.pairable(s), r = C.pair(s, p.sires[seed % 2].id, p.dams[0].id);
    assert.ok(r.ok && r.n >= 1 && r.n <= 4); assert.equal(s.nests.length, 1); assert.equal(C.pair(s, p.sires[0].id, p.dams[0].id).why, 'busy'); assert.equal(C.pairable(s).dams.length, 0, 'the hen is on the nest');
    assert.equal(hunts(s, 1).filter(e => e.type === 'hatch').length, 0); const ev = hunts(s, 1); assert.ok(ev.some(e => e.type === 'hatch' && e.n === r.n));
    assert.equal(s.nests.length, 0); assert.equal(C.mine(s).length, 1 + r.n); assert.equal(s.stats.chicks, r.n);
    const chick = C.mine(s)[1]; assert.equal(C.stageOf(s, chick), 'chick'); assert.equal(C.canFly(s, chick), false); assert.equal(C.enhance(s, chick.id, 'speed').ok, false); assert.equal(chick.d, p.dams[0].id); assert.ok(unpack(chick.g));
    s.meat = 99; const ev2 = hunts(s, 3); assert.ok(ev2.some(e => e.type === 'fledged' && e.id === chick.id)); assert.ok(C.canFly(s, chick)); assert.equal(C.isAdult(s, chick), false); hunts(s, 3); assert.ok(C.isAdult(s, chick));
  }
});

test('breed: close kin are allowed and cost only vigour; a full house makes the eggs wait', () => {
  const s = fresh(9); s.meat = 999; const hen = C.active(s), sire = C.pairable(s).sires[0];
  C.pair(s, sire.id, hen.id); hunts(s, 8); C.feedAll(s);
  const son = C.mine(s).find(b => b.sex === 'm'), dau = C.mine(s).find(b => b.sex === 'f' && b.id !== hen.id);
  if (son) { hen.fed = 1; const r = C.pair(s, son.id, hen.id); assert.ok(r.ok, 'mother and son may be paired'); assert.equal(s.nests[0].F, 0.25); }
  const t = fresh(10); t.mewsCap = 4; t.meat = 999; for (let i = 0; i < 3; i++) t.birds.push({ ...C.active(t), id: t.nextId++, born: -20 }); assert.equal(C.mine(t).length, 4);
  C.pair(t, C.pairable(t).sires[0].id, C.active(t).id); const ev = hunts(t, 2); assert.ok(ev.some(e => e.type === 'full')); assert.equal(t.nests.length, 1, 'the eggs wait');
  t.birds.pop(); const ev2 = hunts(t, 1); assert.ok(ev2.some(e => e.type === 'hatch'));
  const h = fresh(11); C.active(h).fed = 0.1; assert.equal(C.mayPair(h, C.pairable(h).sires[0], C.active(h)), 'hungry');
});

test('sell: better stars, rarer colours and rare genes are worth more; the last flying falcon is never sold', () => {
  const r = mulberry(4), plain = founder(r, { species: 'saker', sex: 'f', plus: 0.2, colour: ['ahmar', 'ahmar'] }), good = founder(r, { species: 'saker', sex: 'f', plus: 0.8, colour: ['ahmar', 'ahmar'] });
  assert.ok(C.worth(good) > C.worth(plain) * 2); const white = JSON.parse(JSON.stringify(plain)); white.h[0].c = white.h[1].c = 6; assert.ok(C.worth(white) > C.worth(plain) * 2.5);
  const fast = JSON.parse(JSON.stringify(plain)); fast.h[0].r[0] = fast.h[1].r[0] = 1; assert.ok(C.worth(fast) > C.worth(plain) * 1.4);
  const s = fresh(12), b = C.active(s); assert.equal(C.maySell(s, b), 'last'); assert.equal(C.sell(s, b.id).ok, false);
  C.refreshMarket(s, true); s.coins = 99999; const got = C.buyFalcon(s, 0); assert.ok(got.ok); assert.equal(C.mine(s).length, 2); assert.equal(s.market.offers.length, 2);
  const p = C.price(s, got.bird); s.market.orders = [{ want: 'sex', v: got.bird.sex, bonus: 1.5 }]; const c = s.coins, sold = C.sell(s, got.bird.id);
  assert.ok(sold.ok && sold.order); assert.equal(s.coins - c, Math.round(p * 1.5)); assert.equal(s.market.orders.length, 0); assert.equal(C.mine(s).length, 1); assert.equal(s.stats.sold, 1);
  C.pair(s, C.pairable(s).sires[0].id, b.id); s.birds.push({ ...b, id: s.nextId++ }); assert.equal(C.maySell(s, b), 'nest', 'a hen on the nest is not sold');
});

test('market: three falcons and three requests, renewed every third hunt; room and nests can be bought', () => {
  const s = fresh(13); C.refreshMarket(s, true); assert.equal(s.market.offers.length, 3); assert.equal(s.market.orders.length, 3); for (const o of s.market.offers) { assert.ok(unpack(o.g)); assert.ok(o.price >= 100); }
  const first = JSON.stringify(s.market); hunts(s, 2); assert.equal(JSON.stringify(s.market), first); hunts(s, 1); assert.notEqual(JSON.stringify(s.market.offers), JSON.parse(first).offers && JSON.stringify(JSON.parse(first).offers));
  s.coins = 30; assert.equal(C.buyMeat(s, 1).ok, true); assert.equal(s.coins, 10); assert.equal(C.buyMeat(s, 1).why, 'coins');
  s.coins = 99999; assert.equal(C.buyMews(s).ok, true); assert.equal(s.mewsCap, 6); assert.equal(C.buyNest(s).ok, true); assert.equal(s.nestCap, 2);
  s.mewsCap = 4; for (let i = 0; i < 3; i++) s.birds.push({ ...C.active(s), id: s.nextId++ }); assert.equal(C.buyFalcon(s, 0).why, 'full');
});

test('missions: three goals at a time, a finished set pays and raises the multiplier, Mozah joins at ten', () => {
  const s = fresh(6); s.meat = 999; s.coins = 99999; const set = M.ladderSet(s); assert.equal(set.length, 3); assert.equal(M.settleLadder(s), null); assert.equal(C.mult(s), 1);
  for (let i = 0; i < 6; i++) { hunts(s, 1, 2); C.feed(s, s.active); C.enhance(s, s.active, C.STATS[i % 5]); }
  const up = M.settleLadder(s); assert.ok(up && up.lv === 2); assert.equal(C.mult(s), 1.1); assert.equal(s.missionsDone, 3); assert.notDeepEqual(M.ladderSet(s).map(m => m.k), set.map(m => m.k));
  const b1 = M.settleBadges(s); assert.ok(b1.length > 0); assert.equal(M.settleBadges(s).length, 0, 'a tier pays once');
  assert.equal(M.girlOpen(s), false); s.missionsDone = 10; assert.equal(M.girlOpen(s), true);
  for (let lv = 1; lv <= 30; lv++) { s.ladder = { lv, set: null }; for (const m of M.ladderSet(s)) assert.ok(m.goal >= 1 && m.goal <= 60 && m.k in s.stats); }
});

test('saves: an old save moves over, repair never throws, backup round-trips, a newer save is refused', () => {
  const v1 = { v: 1, seed: '77', coins: 812, food: 6, lesson: 1, char: 'abood', robe: { abood: 'white', mozah: 'jal_pink' }, head: { abood: 'shemagh', mozah: 'bukhnag' }, facts: { hood_calm: 1 }, missionsDone: 4, nextId: 9, active: 4, ped: [[4, 0, 0, 0]],
    birds: [{ id: 4, g: fresh(2).birds[2].g, sex: 'f', born: -22, s: 0, d: 0, F: 0, n: 5, tr: { speed: 0.8, burst: 0.5, stoop: 0.4, stamina: 0.6, agility: 0.2, accuracy: 0.3 }, own: 'me', rec: { f: 12, c: 7 } }], week: 37, clutch: null, stats: { outings: 30 } };
  const up = upgrade(JSON.parse(JSON.stringify(v1))); assert.ok(up.ok); assert.equal(up.save.v, SCHEMA); assert.equal(up.save.coins, 812); assert.equal(up.save.meat, 6); assert.equal(up.save.birds.length, 1); assert.equal(up.save.birds[0].lv.speed, 3); assert.ok(C.canFly(up.save, C.active(up.save))); assert.equal(up.save.facts.hood_calm, 1);
  const s = fresh(11); s.meat = 999; C.pair(s, C.pairable(s).sires[0].id, s.active); hunts(s, 9); C.refreshMarket(s, true);
  const again = tidy(JSON.parse(JSON.stringify(s))); assert.deepEqual(tidy(JSON.parse(JSON.stringify(again))), again, 'tidy is stable');
  const code = exportSave(s), back = importSave(code); assert.ok(back.ok); assert.equal(back.save.hunts, s.hunts); assert.equal(back.save.coins, s.coins); assert.deepEqual(back.save.birds.map(b => b.g), s.birds.map(b => b.g));
  assert.equal(importSave(code.slice(0, -1) + (code.endsWith('0') ? '1' : '0')).why, 'damaged'); assert.equal(importSave('hello').why, 'format'); assert.equal(upgrade({ v: SCHEMA + 1 }).why, 'newer'); assert.equal(upgrade(null).ok, false);
  const r = mulberry(3), junk = [null, 5, 'x', [], {}, { birds: 'no' }, { v: 2, birds: [{}, { id: 1, g: 'bad' }], coins: -5, hunts: 'x', ladder: [], stats: null, nests: [{ eggs: ['zz'], dam: 3 }], market: 7 }];
  for (let i = 0; i < 400; i++) { const o = JSON.parse(JSON.stringify(s)), keys = Object.keys(o), k = keys[Math.floor(r() * keys.length)]; o[k] = [null, undefined, -1, 1e99, 'x', [], {}, NaN][Math.floor(r() * 8)]; if (r() < 0.3 && o.birds && o.birds[0]) o.birds[Math.floor(r() * o.birds.length)].g = 'zzz'; junk.push(o); }
  for (const j of junk) { const t = tidy(j); assert.ok(C.mine(t).length >= 1, 'a falconer always has a falcon'); assert.ok(C.active(t)); assert.ok(Number.isFinite(t.coins) && t.coins >= 0);
    assert.doesNotThrow(() => { C.statsOf(t, C.active(t)); C.finishHunt(t, sum(1)); M.ladderSet(t); M.settleBadges(t); C.refreshMarket(t, true); C.pairable(t); C.price(t, C.active(t)); }); }
});
