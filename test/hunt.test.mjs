import { test } from 'node:test';
import assert from 'node:assert/strict';
import { create, step, fingerprint, summary } from '../js/sim/hunt-sim.js';
import { makeBot, makeMasher } from '../js/sim/hunt-bot.js';
import { founder } from '../js/sim/genome.js';
import { effective } from '../js/sim/phenotype.js';
import { mulberry } from '../js/sim/rng.js';

const flat = v => ({ speed: v, burst: v, stoop: v, stamina: v, agility: v, accuracy: v, eyes: v, temper: v, hardy: v, size: v, flags: { window: 1 } });
function fly(o, pilot, cap = 60 * 60 * 6) { const w = create(o); let n = 0; while (!w.done && n++ < cap) step(w, pilot(w)); return w; }
const rate = (quarry, stats, skill, n = 120, tier) => { let c = 0, f = 0, t = 0; for (let i = 1; i <= n; i++) { const w = fly({ seed: i * 31, quarry, stats, tier }, makeBot(skill, i)); c += w.caught; f += w.flights; t += w.t; assert.ok(w.done, 'outing finishes'); } return { rate: c / f, secs: t / n }; };

test('hunt: same seed and same hands give the same outing', () => {
  const run = () => { const w = create({ seed: 99, quarry: 'hare', stats: flat(50) }), p = makeBot(0.7, 5), marks = []; for (let i = 0; i < 4000 && !w.done; i++) { step(w, p(w)); if (i % 500 === 0) marks.push(fingerprint(w)); } return marks.join('/') + JSON.stringify(summary(w)); };
  assert.equal(run(), run());
});

test('hunt: the easiest tier cannot fail, even for a child pressing at random', () => {
  for (let i = 1; i <= 500; i++) {
    const w = fly({ seed: i, quarry: 'lure', stats: flat(20 + (i % 5) * 10) }, makeMasher(i));
    assert.ok(w.done, `seed ${i} finishes`); assert.equal(w.caught, w.flights, `seed ${i}: every lure flight ends in a catch`);
    assert.ok(w.t < 60 * 5, `seed ${i} ends inside five minutes (took ${w.t.toFixed(0)} s)`);
  }
  for (let i = 1; i <= 60; i++) { const w = fly({ seed: i, quarry: 'lure', stats: flat(30) }, () => ({})); assert.equal(w.caught, w.flights, 'doing nothing at all still ends in a catch'); }
});

test('hunt: a better falcon and a better hand both catch more', () => {
  const weak = rate('hare', flat(30), 0.5), strong = rate('hare', flat(75), 0.5);
  assert.ok(strong.rate > weak.rate + 0.05, `strong ${strong.rate.toFixed(2)} vs weak ${weak.rate.toFixed(2)}`);
  const clumsy = rate('sandgrouse', flat(64), 0.15), deft = rate('sandgrouse', flat(64), 0.95);
  assert.ok(deft.rate > clumsy.rate + 0.1, `deft ${deft.rate.toFixed(2)} vs clumsy ${clumsy.rate.toFixed(2)}`);
});

test('hunt: the quarry ladder is a ladder', () => {
  const g = founder(mulberry(4), { species: 'saker', sex: 'f', source: 'starter' }), tr = v => ({ speed: v, burst: v, stoop: v, stamina: v, agility: v, accuracy: v });
  const young = effective(g, 0, { tr: tr(0.3) }), trained = effective(g, 0, { tr: tr(0.9) });
  const lure = rate('lure', young, 0.5, 60), hare = rate('hare', young, 0.5), grouse = rate('sandgrouse', young, 0.5), later = rate('sandgrouse', trained, 0.5);
  assert.equal(lure.rate, 1);
  assert.ok(hare.rate > 0.4 && hare.rate < 0.98, `a new falconer catches a good share of hares, not all: ${hare.rate.toFixed(2)}`);
  assert.ok(hare.rate > grouse.rate + 0.2, `hare ${hare.rate.toFixed(2)} is easier than sandgrouse ${grouse.rate.toFixed(2)}`);
  assert.ok(later.rate > grouse.rate + 0.2, `training opens the sandgrouse: ${grouse.rate.toFixed(2)} → ${later.rate.toFixed(2)}`);
  for (const r of [lure, hare, grouse]) assert.ok(r.secs > 40 && r.secs < 300, `an outing takes ${r.secs.toFixed(0)} s`);
});
