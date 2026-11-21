// One outing in the open desert, as pure rules: no canvas, no DOM, fixed 1/60 s steps, one seed. The scene draws this
// world; node tests and the balance tool play it with a bot.
//   Abood drives the 4x4 with the falcon on his fist. Near quarry, one button casts the falcon; the same stick then
//   flies it. Touch the quarry to catch it (the button swoops for a burst of speed). Then drive to the falcon to take
//   it back on the fist. The falcon's wind (energy) is the outing's clock, as fuel is in Abood in Liwa.
//   intent each step: { jx, jy: the stick, each -1…1 · act: pressed this step · end: go home now }
import { mulberry } from './rng.js';
import { QUARRY } from '../data/quarry.js';
import { H, TAU, clamp, wrap, nearestShrub, zoneRadius } from './world.js';

export const DT = 1 / 60, CAST_R = 540, PICK_R = 78, HOME_R = 230, TRUCK_V = 265;
const ev = (w, type, data) => { w.events.push(Object.assign({ type, t: w.t }, data)); };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// o: { seed, stats: { speed, stamina, stoop, agility, eyes, flags }, level, lesson }
export function create(o) {
  const rng = mulberry(o.seed >>> 0), level = o.level || 1, s = o.stats;
  const w = { t: 0, seed: o.seed >>> 0, rng, stats: s, level, lim: zoneRadius(level), lesson: o.lesson ? 1 : 0,
    truck: { x: 70, y: 120, ang: -0.28, v: 0 }, fal: { mode: 'fist', x: 70, y: 120, ang: 0, v: 0, z: 0, dash: 0, cd: 0, stun: 0, on: -1 },
    energy: 1, quarry: [], bag: {}, caught: 0, flights: 0, score: 0, meat: 0, swoops: 0, drove: 0, flew: 0, events: [], done: false, near: -1, goal: null,
    bagMax: o.bagMax || 5 + Math.min(5, level),                 // the outing's share: when the bag is full, we go home
    air: 22 + s.stamina * 0.42,                                   // seconds of flight in a full bar
    flySpeed: (168 + s.speed * 1.5) * ((s.flags && s.flags.speed) || 1), turn: 2.3 + s.agility * 0.032, grab: (24 + s.stoop * 0.13) * ((s.flags && s.flags.grab) || 1) };
  if (w.lesson) w.quarry.push(animal(w, 'hare', 70 + Math.cos(-0.28) * 1050, 120 + Math.sin(-0.28) * 1050, { tame: 1 }));   // Baba's first lesson: one slow hare, dead ahead
  for (const d of Object.values(QUARRY)) {
    if (level < d.level) continue;
    for (let g = 0; g < d.groups; g++) {
      const a = rng() * TAU, r = d.ring[0] + rng() * (Math.min(d.ring[1], w.lim - 150) - d.ring[0]), hx = Math.cos(a) * r, hy = Math.sin(a) * r;
      for (let k = 0; k < d.flock; k++) w.quarry.push(animal(w, d.id, hx + (rng() - 0.5) * 90, hy + (rng() - 0.5) * 70, { flock: d.flock > 1 ? w.quarry.length - k : -1 }));
    }
  }
  return w;
}
function animal(w, kind, x, y, o = {}) {
  return Object.assign({ id: w.quarry.length, kind, x, y, hx: x, hy: y, tx: x, ty: y, ang: w.rng() * TAU, v: 0, state: 'idle', wait: w.rng() * 3, run: 0, jinkT: 0, zig: 0, ph: 0, dir: 1, broke: 0, flock: -1, tame: 0 }, o);
}
export const alive = q => q.state !== 'caught' && q.state !== 'gone';
// may the falcon be cast at this quarry? (a quota quarry is left alone once the outing's share is taken)
export const allowed = (w, q) => alive(q) && q.state !== 'hide' && !(QUARRY[q.kind].quota && (w.bag[q.kind] || 0) >= QUARRY[q.kind].quota);

function driveTruck(w, it, dt) {
  const t = w.truck, m = Math.min(1, Math.hypot(it.jx || 0, it.jy || 0));
  let want = 0;
  if (m > 0.08) {
    const d = wrap(Math.atan2(it.jy, it.jx) - t.ang);
    t.ang = wrap(t.ang + clamp(d * 4, -2.9, 2.9) * dt * clamp(0.35 + t.v / 120, 0.35, 1));
    const e = 6, slope = (H(t.x + Math.cos(t.ang) * e, t.y + Math.sin(t.ang) * e) - H(t.x - Math.cos(t.ang) * e, t.y - Math.sin(t.ang) * e)) / (2 * e);
    want = TRUCK_V * clamp(m, 0.25, 1) * (Math.abs(d) > 2 ? 0.5 : 1) * (1 - clamp(slope * 0.6, -0.18, 0.4));
  }
  t.v += (want - t.v) * Math.min(1, dt * (want > t.v ? 2.4 : 3.4));
  t.x += Math.cos(t.ang) * t.v * dt; t.y += Math.sin(t.ang) * t.v * dt; w.drove += t.v * dt;
  const d = Math.hypot(t.x, t.y); if (d > w.lim) { t.x *= w.lim / d; t.y *= w.lim / d; t.v *= 0.9; if (!w.rimT || w.t - w.rimT > 4) { w.rimT = w.t; ev(w, 'rim'); } }
}
function flyFalcon(w, it, dt) {
  const f = w.fal, s = w.stats, fl = s.flags || {}, m = Math.hypot(it.jx || 0, it.jy || 0);
  const first = w.lesson && !w.caught && w.quarry[0] && alive(w.quarry[0]) ? w.quarry[0] : null;   // Baba's lesson: the falcon is drawn to the lesson hare, so the first flight always ends in a catch
  if (f.stun > 0) f.stun -= dt;
  else if (m > 0.08) f.ang = wrap(f.ang + clamp(wrap(Math.atan2(it.jy, it.jx) - f.ang) * 5, -w.turn, w.turn) * dt);
  if (first) f.ang = wrap(f.ang + clamp(wrap(Math.atan2(first.y - f.y, first.x - f.x) - f.ang) * 3, -1.6, 1.6) * dt);
  if (f.cd > 0) f.cd -= dt; if (f.dash > 0) f.dash -= dt;
  if (it.act && f.cd <= 0 && f.stun <= 0) { f.dash = 0.7; f.cd = fl.quick ? 0.9 : 1.7; if (!(w.lesson && !w.caught)) w.energy -= 0.025; w.swoops++; ev(w, 'swoop'); }
  const tired = 0.78 + 0.22 * Math.min(1, w.energy * 3), want = w.flySpeed * tired * (f.dash > 0 ? 1.75 + (fl.dive || 0) : 1) * (f.stun > 0 ? 0.4 : 1);
  f.v += (want - f.v) * Math.min(1, dt * 4.5); f.x += Math.cos(f.ang) * f.v * dt; f.y += Math.sin(f.ang) * f.v * dt; w.flew += f.v * dt;
  f.z += ((f.dash > 0 ? 26 : 70) - f.z) * Math.min(1, dt * 3);
  const d = Math.hypot(f.x, f.y), edge = w.lim - 30; if (d > edge) { f.x *= edge / d; f.y *= edge / d; }   // the falcon keeps to the ground the truck can reach
  if (!(w.lesson && !w.caught)) w.energy -= dt / w.air * (f.dash > 0 ? 2 : 1) * (fl.wind || 1);
  // a catch is a touch
  for (const q of w.quarry) {
    if (!allowed(w, q) || q.state === 'idle' && false) continue;
    const reach = w.grab * (q === first ? 1.8 : 1); if ((q.x - f.x) * (q.x - f.x) + (q.y - f.y) * (q.y - f.y) > reach * reach) continue;
    const d2 = QUARRY[q.kind];
    if (d2.breaks && !q.broke && !fl.grip && w.rng() < clamp(0.5 - s.stoop * 0.006, 0.05, 0.4)) { q.broke = 1; f.stun = 0.7; q.jinkT = 0; ev(w, 'broke', { id: q.id }); continue; }
    q.state = 'caught'; q.v = 0; f.mode = 'bind'; f.x = q.x; f.y = q.y; f.v = 0; f.z = 0; f.on = q.id; w.caught++; ev(w, 'catch', { id: q.id, kind: q.kind, swoop: f.dash > 0 }); return;
  }
  if (dist(f, w.truck) < 62 && w.flyT > 1.2) { f.mode = 'fist'; f.v = 0; f.z = 0; ev(w, 'back'); return; }   // flown back to the glove
  if (w.energy <= 0) { w.energy = 0; f.mode = 'down'; f.v = 0; f.z = 0; ev(w, 'spent'); }
}
function moveQuarry(w, dt) {
  const f = w.fal, t = w.truck, flying = f.mode === 'fly', r = w.rng;
  for (const q of w.quarry) {
    if (!alive(q)) continue;
    const d = QUARRY[q.kind], df = flying ? dist(q, f) : 1e9, dt2 = dist(q, t);
    if (q.state === 'hide') { q.wait -= dt; if (q.wait <= 0) { if (flying && df < 700) { q.state = 'gone'; ev(w, 'hid', { id: q.id }); } else { q.state = 'idle'; q.hx = q.x; q.hy = q.y; q.tx = q.x; q.ty = q.y; } } continue; }
    if (q.state === 'idle') {
      const alarm = df < d.alert[1] || dt2 < d.alert[0] * (q.tame ? 0.4 : 1) || (q.flock >= 0 && w.quarry[q.flock] && w.quarry[q.flock].state === 'flee');
      if (alarm) { q.state = 'flee'; q.run = 0; q.jinkT = 0.5; const from = df < dt2 * 1.3 ? f : t; q.ang = Math.atan2(q.y - from.y, q.x - from.x) + (r() - 0.5) * 0.5; ev(w, 'flush', { id: q.id, kind: q.kind }); }
      else { // potter about near home
        if (q.wait > 0) { q.wait -= dt; q.v = 0; }
        else { const tx = q.tx - q.x, ty = q.ty - q.y, m = Math.hypot(tx, ty);
          if (m < 6) { q.wait = 1 + r() * 4; const an = r() * TAU, rr = 30 + r() * 90; q.tx = q.hx + Math.cos(an) * rr; q.ty = q.hy + Math.sin(an) * rr * 0.7; }
          else { q.ang = Math.atan2(ty, tx); q.v = 22; q.x += tx / m * 22 * dt; q.y += ty / m * 22 * dt; q.ph += dt * 5; if (Math.abs(tx) > 2) q.dir = tx > 0 ? 1 : -1; } }
        continue;
      }
    }
    // fleeing
    q.run += dt; q.jinkT -= dt;
    let v = d.speed * (q.tame ? 0.5 : 1) * (1 - 0.28 * Math.min(1, q.run / d.wind)) * Math.min(1, 0.45 + q.run / 1.2);
    if (d.runs && q.run < d.runs) v *= 0.62;                                                   // a houbara runs before it flies
    const threat = flying ? f : t, away = Math.atan2(q.y - threat.y, q.x - threat.x), near = flying ? df : dt2;
    if (d.cover && !q.tame) { const c = nearestShrub(q.x, q.y, 420); if (c) { const dc = Math.hypot(c.x - q.x, c.y - q.y); if (dc < 16) { q.state = 'hide'; q.wait = 1.1; q.v = 0; q.x = c.x; q.y = c.y; ev(w, 'cover', { id: q.id }); continue; } if (dc < near * 0.9) q.aim = Math.atan2(c.y - q.y, c.x - q.x); else q.aim = away; } else q.aim = away; }
    else q.aim = away;
    if (q.jinkT <= 0) { // a sideways jump when the falcon is close; otherwise the zigzag of a running hare
      if (flying && df < 150 && !q.tame) { q.zig = (r() < 0.5 ? -1 : 1) * d.jink * (1 - Math.min(0.7, w.stats.agility / 140)); q.jinkT = 0.9 + r() * 0.5; ev(w, 'jink', { id: q.id }); }
      else { q.zig = d.air ? (r() - 0.5) * 0.3 : (r() - 0.5) * 0.9 * (q.tame ? 0 : 1); q.jinkT = 0.5 + r() * 0.5; }
    }
    q.ang = wrap(q.ang + clamp(wrap(q.aim + q.zig - q.ang) * 6, -5, 5) * dt); q.v = v;
    q.x += Math.cos(q.ang) * v * dt; q.y += Math.sin(q.ang) * v * dt; q.ph += dt * 14; if (Math.abs(Math.cos(q.ang)) > 0.15) q.dir = Math.cos(q.ang) > 0 ? 1 : -1;
    const dd = Math.hypot(q.x, q.y); if (dd > w.lim + 500) { q.state = 'gone'; continue; }
    if (near > 1100 && q.run > 3) { q.state = 'idle'; q.hx = q.x; q.hy = q.y; q.tx = q.x; q.ty = q.y; q.wait = 2; q.v = 0; }   // it has got clear: it settles again
  }
}
// the nearest quarry the falcon may be cast at from the truck, or -1
function castable(w) { let best = -1, bd = CAST_R * CAST_R; for (const q of w.quarry) { if (!allowed(w, q)) continue; const d = (q.x - w.truck.x) * (q.x - w.truck.x) + (q.y - w.truck.y) * (q.y - w.truck.y); if (d < bd) { bd = d; best = q.id; } } return best; }

export function step(w, it = {}) {
  if (w.done) return w;
  const dt = DT, f = w.fal, t = w.truck; w.t += dt;
  moveQuarry(w, dt);
  if (f.mode === 'fly') { w.flyT += dt; t.v *= 0.9; flyFalcon(w, it, dt); }
  else {
    driveTruck(w, it, dt);
    if (f.mode === 'fist') {
      f.x = t.x; f.y = t.y; w.near = castable(w);
      const home = Math.hypot(t.x, t.y) < HOME_R && w.t > 4;
      if (it.end || (it.act && w.near < 0 && home)) return finish(w);
      if (it.act && w.near >= 0) { const q = w.quarry[w.near]; f.mode = 'fly'; f.ang = Math.atan2(q.y - t.y, q.x - t.x); f.v = 90; f.z = 20; f.dash = 0; f.cd = 0.5; f.stun = 0; w.flyT = 0; w.flights++; ev(w, 'cast', { id: q.id, kind: q.kind }); }
      else if (it.act) ev(w, 'nothing');
    } else if (dist(f, t) < PICK_R) { // the falcon is on the ground (on its catch, or tired): take it back on the fist
      if (f.mode === 'bind') { const q = w.quarry[f.on], d = QUARRY[q.kind]; w.bag[q.kind] = (w.bag[q.kind] || 0) + 1; w.score += d.value; w.meat += d.meat; w.energy = Math.min(1, w.energy + 0.05); ev(w, 'pickup', { kind: q.kind, pts: d.value, lesson: w.lesson && w.caught === 1 }); }
      else ev(w, 'pickup', { kind: null });
      f.mode = 'fist'; f.on = -1;
      if (w.energy < 0.06) return finish(w);
      if (w.caught >= w.bagMax) { ev(w, 'full'); return finish(w); }
    }
  }
  // what the arrow should point at
  w.goal = f.mode === 'bind' || f.mode === 'down' ? { x: f.x, y: f.y, kind: 'falcon' } : f.mode === 'fist' && w.lesson && !w.caught && w.quarry[0] && alive(w.quarry[0]) ? { x: w.quarry[0].x, y: w.quarry[0].y, kind: 'quarry' } : null;
  return w;
}
function finish(w) { w.done = true; ev(w, 'done', summary(w)); return w; }
export const summary = w => ({ caught: w.caught, bag: Object.assign({}, w.bag), score: w.score, meat: w.meat, flights: w.flights, swoops: w.swoops, time: w.t, energy: w.energy });
// a compact fingerprint of the world, for determinism tests
export const fingerprint = w => [w.t.toFixed(3), w.fal.mode, w.truck.x.toFixed(2), w.truck.y.toFixed(2), w.fal.x.toFixed(2), w.fal.y.toFixed(2), w.caught, w.score, w.energy.toFixed(4)].join('|');
