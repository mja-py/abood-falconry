// One outing with the falcon, as pure rules: no canvas, no DOM, fixed 1/60 s steps, one seed. The scene draws this world;
// node tests and the balance tool fly it with bots. x runs along the desert, y is height above the sand.
//   phases: scout (walk until the quarry is spotted) → cast (the release meter) → chase → strike (the timing ring)
//           → bind (a catch) → recall (back to the fist) → next flight … → done
//   intent each step: { ty: 0–1 wanted height (or null), act: pressed this step, hold: held (pump the wings) }
import { mulberry, clamp } from './rng.js';
import { QUARRY } from '../data/quarry.js';

export const DT = 1 / 60, CEIL = 250, FIST = 62;
const ev = (w, type, data) => { w.events.push(Object.assign({ type, t: w.t }, data)); };

// o: { seed, quarry, tier, stats (from phenotype.effective), dir: { speed, window, cover } from the difficulty director, flights }
export function create(o) {
  const q = QUARRY[o.quarry];
  const w = { t: 0, pt: 0, seed: o.seed >>> 0, rng: mulberry(o.seed >>> 0), kind: q.id, tier: o.tier ?? q.tier, stats: o.stats,
    dir: Object.assign({ speed: 1, window: 1, cover: 1 }, o.dir), flights: o.flights || 3, flight: 0, phase: 'scout',
    man: { x: 0, walk: true }, fal: null, q: null, cover: [], cast: null, st: null, can: null,
    caught: 0, misses: 0, missRun: 0, perfect: 0, clean: 0, score: 0, widen: 1, log: [], events: [], done: false };
  newFlight(w); return w;
}
function newFlight(w) {
  const d = QUARRY[w.kind], r = w.rng;
  w.flight++; w.phase = 'scout'; w.pt = 0; w.st = null; w.cast = null; w.can = null; w.man.walk = true; w.chaseT = 0;
  w.fal = { x: w.man.x + 17, y: FIST, vx: 0, energy: w.fal ? Math.max(0.55, w.fal.energy + 0.3) : 1, state: 'fist', burstT: 0, power: 0.5 };
  w.q = { x: w.man.x + 780 + r() * 420, y: d.air ? d.alt[0] + r() * (d.alt[1] - d.alt[0]) : 0, vy: 0, state: 'idle', wait: 0, timer: 1.2 + r(), tired: 0, boost: 0, spotted: false, aim: 0 };
  w.cover = [];
  if (d.cover) { let x = w.q.x + 420 * w.dir.cover; for (let i = 0; i < 5; i++) { x += (520 + r() * 280) * w.dir.cover; w.cover.push(x); } }
}
const spotRange = w => 260 + w.stats.eyes * 2.2;

// the hood comes off: the quarry sees the falcon and bolts while the falconer times the release
function unhood(w) {
  w.phase = 'cast'; w.pt = 0; w.man.walk = false; w.cast = { m: 0, dirn: 1 }; w.chaseT = 0;
  if (w.tier > 0) { w.q.state = 'flee'; w.q.wait = QUARRY[w.kind].react; }
  ev(w, 'unhood');
}
function launch(w, power, late) {
  const d = QUARRY[w.kind], f = w.fal;
  f.state = 'fly'; f.power = power; f.burstT = 2.6 + (w.stats.flags && w.stats.flags.sahm ? 2 : 0); f.vx = 40;
  const perfect = power >= 0.82; if (perfect) { w.perfect++; ev(w, 'perfect'); }
  if (w.q.state === 'idle') { w.q.state = 'flee'; w.q.wait = late ? 0 : d.react; }
  w.man.walk = false; w.phase = 'chase'; w.pt = 0; w.castPerfect = perfect; ev(w, 'cast', { power, late: !!late });
}

function quarryMove(w, dt) {
  const d = QUARRY[w.kind], q = w.q, f = w.fal, r = w.rng;
  if (q.wait > 0) { q.wait -= dt; return; }
  q.run = (q.run || 0) + dt;                                                     // it takes a moment to get up to speed
  // quarry tires as the chase goes on: a falcon with the wind to stay with it wins in the end (the saker's way)
  let v = d.speed * w.dir.speed * (1 - 0.25 * Math.min(1, q.tired)) * (1 - 0.3 * Math.min(1, w.chaseT / (d.wind || 20))) * Math.min(1, 0.4 + q.run / 1.8);
  if (q.boost > 0) { q.boost -= dt; v *= 1.22; }
  q.timer -= dt;
  if (w.kind === 'lure') { // the drone keeps the lure just ahead; it never runs away, and it slows down late so the bird wins
    const gap = q.x - f.x; v = gap > 190 ? Math.min(v, f.vx * 0.55) : gap < 70 ? v * 1.25 : v;
    if (w.chaseT > 32) v *= 0.5;
    q.y += ((112 + 22 * Math.sin(w.t * 1.3)) - q.y) * Math.min(1, dt * 2);
  } else if (!d.air) { // hare: brakes and bursts, and makes for cover
    if (q.state === 'hide') { if (q.timer <= 0) { q.state = 'flee'; q.timer = 1.4 + r(); ev(w, 'bolt'); } return; }
    if (q.state === 'brake') { v *= 0.45; if (q.timer <= 0) { q.state = 'flee'; q.boost = 0.6; q.timer = 1.6 + r() * 1.2; } }
    else if (q.timer <= 0) { if (q.x - f.x < 140 && f.state === 'fly') { q.state = 'brake'; q.timer = 0.35; ev(w, 'brake'); } else q.timer = 0.6 + r(); }
    const c = w.cover[0];
    if (c !== undefined && q.x >= c) { w.cover.shift(); if (w.tier <= 1 && q.x - f.x < 230) { q.state = 'hide'; q.timer = 1.2; ev(w, 'cover'); return; } return endFlight(w, 'escaped', 'cover'); }
  } else { // sandgrouse: fast and level, changing height against wherever the falcon is
    if (q.timer <= 0) { q.timer = 1.4 + r(); const above = f.y > q.y + 20 && Math.abs(q.x - f.x) < 220; q.aim = above ? 25 + r() * 20 : 100 + r() * 40; }
    if (!q.aim) q.aim = q.y;
    q.y += clamp(q.aim - q.y, -95 * dt, 95 * dt);
  }
  q.x += v * dt; q.v = v;
}
function falconFly(w, it, dt) {
  const f = w.fal, s = w.stats, fl = s.flags || {};
  const want = it.ty == null ? f.y : clamp(it.ty, 0, 1) * CEIL, up = 55 + s.agility * 1.1, down = up * 1.7;
  const dy = clamp(want - f.y, -down * dt, up * dt); f.y = clamp(f.y + dy, 4, CEIL);
  let vmax = (150 + s.speed * 1.6) * (fl.noFade ? 1 : 0.72 + 0.28 * f.energy);
  if (f.burstT > 0) { vmax += s.burst * 1.3 * (0.6 + 0.5 * f.power) * Math.min(1, f.burstT / 1.3); f.burstT -= dt; }
  if (dy > 0) vmax -= (dy / dt) * 0.45; else vmax += (-dy / dt) * 0.55;         // height costs speed going up and pays it back coming down
  if (it.hold) vmax *= 1.15;
  if (f.x > w.q.x + 10) vmax = Math.min(vmax, (w.q.v || 100) * 0.6);            // flew past: ease off and let it come back under
  f.vx += (vmax - f.vx) * Math.min(1, dt * 3.2); f.x += f.vx * dt;
  f.energy -= dt / (9 + s.stamina * 0.24) * (it.hold ? 1.9 : 1) * (dy > 0 ? 1.35 : 1);
  if (w.tier === 0) f.energy = Math.max(0.25, f.energy);
}
// the ring is widest for a stoop from well above; a low, hurried stoop or a grab from behind is harder to time
function strikeWindow(w, kind, dy = 110) {
  const d = QUARRY[w.kind], s = w.stats, skill = kind === 'stoop' ? s.stoop : s.agility, height = kind === 'stoop' ? clamp(dy / 110, 0.5, 1.15) : 0.75;
  const evade = d.jink * (1 - Math.min(1, skill / 110)) * (w.q.state === 'brake' ? 1.3 : 1);
  return (0.10 + 0.0028 * s.accuracy) * ((s.flags && s.flags.window) || 1) * w.dir.window * w.widen * height * (1 - Math.min(0.8, evade)) * (w.tier === 0 ? 2.5 : 1);
}
function resolve(w, hit, err) {
  const d = QUARRY[w.kind], f = w.fal, q = w.q, st = w.st;
  if (hit && d.breaks && w.tier >= 2 && !(w.stats.flags && w.stats.flags.grip)) { // big quarry may kick free of a small bird
    if (w.rng() > clamp(0.55 + (w.stats.size - d.size) * 0.012, 0.3, 1)) { q.tired += 0.5; q.wait = 0.4; ev(w, 'broke'); hit = false; err = 0; st.broke = true; }
  }
  if (hit) {
    const clean = Math.abs(err) <= st.win / 6; w.caught++; w.missRun = 0; if (clean) w.clean++;
    const pts = Math.round(d.value * (1 + (st.high ? 0.25 : 0) + (w.castPerfect ? 0.25 : 0) + (clean ? 0.25 : 0)));
    w.score += pts; f.state = 'bind'; f.x = q.x; f.y = d.air ? 0 : 6; q.state = 'caught'; q.y = 0;
    w.phase = 'bind'; w.pt = 0; ev(w, 'catch', { clean, kind: st.kind, pts });
  } else {
    w.misses++; w.missRun++; f.energy -= 0.2; f.vx *= 0.45; f.state = 'fly'; f.y = Math.max(f.y, q.y + 12); q.boost = 1.4;
    w.widen = Math.min(w.tier === 0 ? 4 : 2.2, w.widen * (w.tier === 0 ? 1.5 : 1.2));       // each miss makes the next ring kinder
    w.phase = 'chase'; ev(w, 'miss', { early: err < 0, broke: !!st.broke });
  }
  w.st = null;
}
function endFlight(w, result, why) {
  w.log.push({ result, why, time: w.chaseT, flight: w.flight }); w.phase = 'recall'; w.pt = 0; w.st = null; w.can = null;
  w.fal.state = result === 'caught' ? 'bind' : 'return'; ev(w, 'flightEnd', { result, why });
}

export function step(w, it = {}) {
  if (w.done) return w;
  const dt = DT, d = QUARRY[w.kind], f = w.fal, q = w.q; w.t += dt; w.pt += dt;
  if (w.phase === 'scout') {
    const gap = q.x - w.man.x;
    if (w.man.walk) { w.man.x += 62 * dt; f.x = w.man.x + 17; }
    if (!q.spotted && gap < spotRange(w)) { q.spotted = true; w.pt = 0; ev(w, 'spot'); }
    if (w.tier === 0 && gap < 170) w.man.walk = false;
    if (q.spotted && it.act) unhood(w);
    else if (it.act && !q.spotted) ev(w, 'early');
    else if (w.tier > 0 && gap < d.flush) { ev(w, 'flush'); launch(w, 0.45, true); }
    else if (w.tier === 0 && q.spotted && w.pt > 12) unhood(w);
  } else if (w.phase === 'cast') {
    const c = w.cast; c.m += c.dirn * dt * (w.tier === 0 ? 1.0 : 1.5);
    if (c.m >= 1) { c.m = 1; c.dirn = -1; } else if (c.m <= 0) { c.m = 0; c.dirn = 1; }
    quarryMove(w, dt); if (w.phase !== 'cast') return w;
    if (it.act && w.pt > 0.15) launch(w, c.m); else if (w.pt > 2.4) launch(w, 0.5);
  } else if (w.phase === 'chase') {
    w.chaseT += dt; quarryMove(w, dt); if (w.phase !== 'chase') return w;
    falconFly(w, it, dt);
    const gap = q.x - f.x, dy = f.y - q.y;
    // a stoop turns height into reach: the higher the falcon, the farther ahead it can strike
    w.can = q.state === 'hide' || q.wait > 0.2 ? null : gap >= 15 && gap <= Math.min(170, 20 + dy * 0.8) && dy >= 45 ? 'stoop' : gap >= -6 && gap < 42 && Math.abs(dy) < 22 ? 'grab' : null;
    if (it.act && w.can) {
      w.st = { kind: w.can, t: 0, T: w.can === 'stoop' ? 0.5 + dy / 420 : 0.32, x0: f.x, y0: f.y, win: strikeWindow(w, w.can, dy), high: dy >= 100 };
      f.state = w.can === 'stoop' ? 'stoop' : 'fly'; w.phase = 'strike'; ev(w, 'strike', { kind: w.can });
    } else if (f.energy <= 0) endFlight(w, 'spent');
    else if (gap > 900) endFlight(w, 'escaped', 'far');
    else if (w.chaseT > 55) { if (w.tier === 0) { w.st = { kind: 'grab', t: 0, T: 0.3, x0: f.x, y0: f.y, win: 9 }; w.phase = 'strike'; } else endFlight(w, 'escaped', 'time'); }
  } else if (w.phase === 'strike') {
    const st = w.st; w.chaseT += dt; quarryMove(w, dt); if (w.phase !== 'strike') return w;
    st.t += dt; const p = Math.min(1, st.t / st.T);
    f.x = st.x0 + (q.x - 4 - st.x0) * (1 - (1 - p) * (1 - p)); f.y = st.y0 + (q.y + 6 - st.y0) * p * p; f.vx = (q.v || 150) + 40;
    const half = st.win / 2, mercy = w.tier === 0 || (w.tier === 1 && w.missRun >= 2);
    if (it.act && st.t > 0.06) resolve(w, Math.abs(st.t - st.T) <= half, st.t - st.T);
    else if (st.t >= st.T + half) resolve(w, mercy, half);                          // nobody pressed: the kind tiers still catch
  } else if (w.phase === 'bind') {
    if (w.pt > 1.4) endFlight(w, 'caught');
  } else if (w.phase === 'recall') {
    const caught = w.log[w.log.length - 1].result === 'caught';
    if (caught) { w.man.x += Math.min(220 * dt, Math.max(0, f.x - 24 - w.man.x)); if (f.x - w.man.x <= 26 || w.pt > 6) nextOrDone(w); }
    else {
      if (!w.lure && (it.act || w.pt > 2.2)) { w.lure = true; ev(w, 'lure'); }
      if (w.lure) { const tx = w.man.x + 17; f.x += clamp(tx - f.x, -340 * dt, 340 * dt); f.y += clamp(FIST - f.y, -160 * dt, 160 * dt); if (Math.abs(tx - f.x) < 4 && Math.abs(FIST - f.y) < 6) nextOrDone(w); }
      if (w.pt > 9) nextOrDone(w);
    }
  }
  return w;
}
function nextOrDone(w) {
  w.lure = false;
  if (w.flight < w.flights) { w.man.x = Math.max(w.man.x, w.fal.x - 24); newFlight(w); ev(w, 'nextFlight', { n: w.flight }); }
  else { w.done = true; w.phase = 'done'; ev(w, 'done', summary(w)); }
}
export const summary = w => ({ caught: w.caught, flights: w.flights, misses: w.misses, perfect: w.perfect, clean: w.clean, score: w.score, time: w.t, log: w.log });
// a compact fingerprint of the world, for determinism tests
export const fingerprint = w => [w.t.toFixed(3), w.phase, w.flight, w.fal.x.toFixed(2), w.fal.y.toFixed(2), w.q.x.toFixed(2), w.q.y.toFixed(2), w.caught, w.misses, w.score].join('|');
export const view = w => ({ spot: spotRange(w) });
