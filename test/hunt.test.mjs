import { test } from 'node:test';
import assert from 'node:assert/strict';
import { create, step, fingerprint, summary } from '../js/sim/hunt-sim.js';
import { makeBot, makeMasher } from '../js/sim/hunt-bot.js';
import { QUARRY } from '../js/data/quarry.js';
import { H, zoneRadius, plantAt, nearestShrub } from '../js/sim/world.js';

const flat = v => ({ speed: v, stamina: v, stoop: v, agility: v, eyes: v, flags: {} });
function play(o, pilot, cap = 60 * 60 * 7) { const w = create(o); let n = 0; while (!w.done && n++ < cap) step(w, pilot(w)); return w; }
const many = (stat, skill, level = 1, n = 40) => { let c = 0, t = 0, sc = 0, open = 0; for (let i = 1; i <= n; i++) { const w = play({ seed: i * 31 + 7, stats: flat(stat), level }, makeBot(skill, i)); if (!w.done) open++; c += w.caught; t += w.t; sc += w.score; } return { caught: c / n, secs: t / n, score: sc / n, open }; };

test('the desert is the same everywhere: height, plants and zones are pure functions', () => {
  assert.equal(H(1234, -567), H(1234, -567)); assert.ok(Math.abs(H(0, 0) - 5) < 1.5, 'level ground at the camp');
  assert.deepEqual(plantAt(5, -3), plantAt(5, -3)); assert.equal(plantAt(0, 0), null, 'the camp is clear');
  let shrubs = 0; for (let j = -20; j < 20; j++) for (let i = -20; i < 20; i++) { const p = plantAt(i, j); if (p && p.kind === 'shrub') shrubs++; } assert.ok(shrubs > 200 && shrubs < 700, `${shrubs} grass clumps`);
  const near = nearestShrub(900, 900, 600); assert.ok(near && Math.hypot(near.x - 900, near.y - 900) <= 600);
  assert.ok(zoneRadius(1) < zoneRadius(3) && zoneRadius(3) < zoneRadius(6));
});

test('hunt: same seed and same hands give the same outing', () => {
  const run = () => { const w = create({ seed: 99, stats: flat(50), level: 3 }), p = makeBot(0.7, 5), marks = []; for (let i = 0; i < 9000 && !w.done; i++) { step(w, p(w)); if (i % 1000 === 0) marks.push(fingerprint(w)); } return marks.join('/') + JSON.stringify(summary(w)); };
  assert.equal(run(), run());
});

test('hunt: Baba\'s first lesson always ends in a catch, even for the clumsiest hands, and costs no energy until then', () => {
  for (let i = 1; i <= 200; i++) {
    const w = create({ seed: i, stats: flat(20 + (i % 4) * 8), level: 1, lesson: true }), p = makeBot(0, i); let n = 0;
    while (w.caught < 1 && n++ < 60 * 150) { step(w, p(w)); if (w.caught < 1) assert.equal(w.energy, 1, 'the lesson costs no energy before the first catch'); }
    assert.ok(w.caught >= 1, `seed ${i}: the lesson hare is caught (after ${(n / 60).toFixed(0)} s)`);
  }
  const idle = create({ seed: 3, stats: flat(30), level: 1, lesson: true }); for (let i = 0; i < 60 * 120; i++) step(idle, {}); assert.equal(idle.done, false, 'doing nothing never ends or fails the lesson'); assert.equal(idle.energy, 1);
  const mash = create({ seed: 4, stats: flat(30), level: 1, lesson: true }), m = makeMasher(4); for (let i = 0; i < 60 * 60; i++) step(mash, m(mash)); assert.ok(Number.isFinite(mash.truck.x) && Math.hypot(mash.truck.x, mash.truck.y) <= mash.lim + 1, 'random driving stays inside the hunting ground');
});

test('hunt: a better falcon and a better hand both bring home more', () => {
  const weak = many(35, 0.5), strong = many(75, 0.5); assert.ok(strong.caught > weak.caught + 1, `strong ${strong.caught.toFixed(1)} vs weak ${weak.caught.toFixed(1)}`);
  const clumsy = many(50, 0.15), deft = many(50, 0.9); assert.ok(deft.caught > clumsy.caught, `deft ${deft.caught.toFixed(1)} vs clumsy ${clumsy.caught.toFixed(1)}`);
  assert.ok(weak.caught >= 0.6, `a starter falcon still brings something home: ${weak.caught.toFixed(1)}`);
});

test('hunt: an outing is short, the bag has a limit, and the houbara has its quota', () => {
  for (const [stat, level] of [[35, 1], [60, 1], [80, 3], [95, 6]]) {
    for (let i = 1; i <= 25; i++) {
      const w = play({ seed: i * 53 + level, stats: flat(stat), level }, makeBot(0.7, i));
      assert.ok(w.done, `stat ${stat} level ${level} seed ${i}: the outing ends (ran ${w.t.toFixed(0)} s)`); assert.ok(w.t < 60 * 6.5, `the outing takes ${w.t.toFixed(0)} s`);
      assert.ok(w.caught <= w.bagMax); assert.ok((w.bag.houbara || 0) <= QUARRY.houbara.quota); assert.ok(w.energy >= 0 && w.energy <= 1);
      assert.equal(w.score, Object.keys(w.bag).reduce((a, k) => a + w.bag[k] * QUARRY[k].value, 0)); assert.equal(w.meat, Object.keys(w.bag).reduce((a, k) => a + w.bag[k] * QUARRY[k].meat, 0));
      if (level < 3) assert.equal(w.bag.houbara || 0, 0, 'no houbara before level 3');
    }
  }
});
