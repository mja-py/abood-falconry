// The hunt on screen. All the rules are in js/sim/hunt-sim.js; this file only follows that world with a camera and
// draws it: sky, dunes, the falconer with the bird on the cuff, the quarry, the cast meter and the strike ring.
// A catch is shown the family's way: a puff of dust, a few feathers, the falcon standing proud. Nothing else.
import { create, step, DT, CEIL, FIST, view } from '../sim/hunt-sim.js';
import { QUARRY } from '../data/quarry.js';
import { person, ABOOD, MOZAH, INK, label } from '../art.js';
import { drawFalcon } from '../art/falcon.js';
import { sky, dunes, ghaf, shrub, SKIES, QUARRY_ART } from '../art/desert.js';

const TAU = Math.PI * 2, GY = 334, PS = 1.5;                       // ground line on the 400-high field; falconer's scale
const hash = i => { let h = (i * 374761393) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return (h ^ (h >>> 16)) >>> 0; };

// o: { kind: 'train' | 'hunt', quarry, stats, dir, seed, look (appearance), hoodCol, girl, robe, head, reduced }
export function makeHunt(o) {
  const w = create({ seed: o.seed, quarry: o.quarry, stats: o.stats, dir: o.dir, flights: o.flights || 3 });
  const sc = { w, o, t: 0, acc: 0, cam: -200, flap: 0, parts: [], shake: 0, time: o.kind === 'train' ? 'dawn' : ['day', 'day', 'dusk'][o.seed % 3], seen: 0, ringFlash: 0, lastResult: null };
  sc.update = (dt, intent) => {
    sc.t += dt; sc.acc += dt; let n = 0;
    while (sc.acc >= DT && n++ < 4) { step(w, intent); intent.act = false; sc.acc -= DT; }
    if (sc.acc > DT * 4) sc.acc = 0;
    const f = w.fal; sc.flap += dt * (f.state === 'fly' || f.state === 'return' ? 13 + (intent.hold ? 6 : 0) : 0);
    for (const p of sc.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt; p.life -= dt; p.rot += (p.vr || 0) * dt; }
    sc.parts = sc.parts.filter(p => p.life > 0); sc.shake = Math.max(0, sc.shake - dt * 3); sc.ringFlash = Math.max(0, sc.ringFlash - dt * 2.5);
    while (sc.seen < w.events.length) onEvent(sc, w.events[sc.seen++]);
  };
  sc.draw = (c, W, H) => draw(sc, c, W, H);
  return sc;
}
function puff(sc, x, y, n, col, feathers) {
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = 30 + Math.random() * 70; sc.parts.push({ x, y, vx: Math.cos(a) * v, vy: -Math.abs(Math.sin(a)) * v * 0.7 - 10, g: 60, life: 0.5 + Math.random() * 0.5, r: 3 + Math.random() * 5, col, rot: 0 }); }
  for (let i = 0; i < (feathers || 0); i++) sc.parts.push({ x, y: y - 6, vx: (Math.random() - 0.5) * 90, vy: -40 - Math.random() * 50, g: 70, life: 1.3 + Math.random() * 0.6, feather: 1, rot: Math.random() * 3, vr: (Math.random() - 0.5) * 6, col: '#f4ead6' });
}
function onEvent(sc, e) {
  const w = sc.w, sand = SKIES[sc.time][5];
  if (e.type === 'catch') { puff(sc, w.q.x, 4, sc.o.reduced ? 5 : 14, sand, w.kind === 'lure' ? 0 : 5); sc.shake = sc.o.reduced ? 0 : 0.5; sc.ringFlash = 1; sc.lastResult = 'hit'; }
  else if (e.type === 'miss') { puff(sc, w.fal.x, Math.max(0, w.q.y), sc.o.reduced ? 3 : 8, sand, 0); sc.lastResult = 'miss'; }
  else if (e.type === 'cover' || e.type === 'bolt' || e.type === 'brake') puff(sc, w.q.x, 2, 5, sand, 0);
  else if (e.type === 'cast') puff(sc, w.man.x + 24, FIST, 3, '#fffaf0', 0);
}
const camTarget = (sc, W) => {
  const w = sc.w, f = w.fal, q = w.q;
  if (w.phase === 'scout' || w.phase === 'cast') return w.man.x - W * 0.2;
  if (w.phase === 'recall' || w.phase === 'done') return (w.man.x + f.x) / 2 - W * 0.45;
  const mid = (f.x + q.x) / 2 - W / 2;
  return Math.max(f.x - W * 0.78, Math.min(f.x - W * 0.14, mid + W * 0.05));
};

function draw(sc, c, W, H) {
  const w = sc.w, f = w.fal, q = w.q, o = sc.o, k = SKIES[sc.time], d = QUARRY[w.kind];
  const tgt = camTarget(sc, W); sc.cam += (tgt - sc.cam) * (Math.abs(tgt - sc.cam) > 900 ? 1 : 0.085);
  const cam = sc.cam, sx = x => x - cam, sy = y => GY - y;
  sky(c, W, H, sc.time, GY / H);
  dunes(c, 0, W, 262, 34, 150, k[5], k[6], H, cam * 0.12 + 300);
  dunes(c, 0, W, 300, 20, 96, k[5], k[6], H, cam * 0.32 + 40);
  c.fillStyle = k[5]; c.fillRect(0, GY - 4, W, H - GY + 4);
  const g = c.createLinearGradient(0, GY, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(60,30,10,.22)'); c.fillStyle = g; c.fillRect(0, GY, W, H - GY);
  c.strokeStyle = 'rgba(90,55,25,.35)'; c.lineWidth = 1.5; c.lineCap = 'round';
  for (let i = Math.floor(cam / 70) - 1; i < (cam + W) / 70 + 1; i++) { const h = hash(i), x = sx(i * 70 + (h % 50)), y = GY + 10 + (h >>> 8) % 46; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 10, y - 3, x + 20 + (h >>> 4) % 14, y); c.stroke(); }
  for (let i = Math.floor(cam / 620) - 1; i < (cam + W) / 620 + 1; i++) { const h = hash(i + 999), x = sx(i * 620 + (h % 360)); c.save(); c.translate(x, GY - 2); const s = 0.8 + (h >>> 9) % 5 * 0.09; c.scale(s, s); ghaf(c); c.restore(); }
  for (let i = Math.floor(cam / 210) - 1; i < (cam + W) / 210 + 1; i++) { const h = hash(i + 77); if (h % 3) continue; c.save(); c.translate(sx(i * 210 + (h % 150)), GY + 1); shrub(c, 0.45 + (h >>> 7) % 4 * 0.06); c.restore(); }
  for (const cx of w.cover) { c.save(); c.translate(sx(cx), GY + 2); shrub(c, 1.15); c.restore(); }

  // the quarry
  const qx = sx(q.x), qy = sy(q.y), caught = q.state === 'caught';
  if (!caught) {
    if (q.state === 'hide') { c.save(); c.translate(qx, GY + 2); shrub(c, 1.15 + Math.sin(sc.t * 30) * 0.03); c.restore(); }
    else QUARRY_ART[w.kind](c, qx, d.air ? qy : GY, sc.t, 1.25, q.state === 'idle' || q.wait > 0);
    if (w.phase === 'scout' && q.spotted) { const b = Math.sin(sc.t * 8) * 3; c.fillStyle = '#c8202b'; c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.roundRect(qx - 5, qy - 74 + b, 10, 22, 4); c.fill(); c.stroke(); c.beginPath(); c.arc(qx, qy - 42 + b, 5, 0, TAU); c.fill(); c.stroke(); }
  }
  // the falconer
  const mx = sx(w.man.x), walking = w.phase === 'scout' && w.man.walk, running = w.phase === 'recall' && f.state === 'bind';
  const P = Object.assign(o.girl ? MOZAH(o.robe, o.head) : ABOOD(o.robe, o.head), { s: PS, t: sc.t, still: !(walking || running), arm: w.phase === 'recall' && w.lure ? 'wave' : 'fist', mouth: w.phase === 'bind' ? 'o' : 'smile', lean: 0.02 });
  c.fillStyle = 'rgba(0,0,0,.16)'; c.beginPath(); c.ellipse(mx, GY + 2, 18, 4, 0, 0, TAU); c.fill();
  person(c, mx, GY, w.man.x / (running ? 6 : 9), false, P);
  // the falcon
  const fx = sx(f.x), fy = sy(f.y), A = o.look;
  if (f.state === 'fist') drawFalcon(c, mx + 17 * PS, GY - 41.5 * PS, A, { pose: 'cuff', s: 0.92, hood: w.phase === 'scout', hoodCol: o.hoodCol, jesses: true });
  else if (f.state === 'bind') { drawFalcon(c, fx, GY, A, { pose: 'block', s: 0.95 }); }
  else if (f.state === 'stoop') drawFalcon(c, fx, fy, A, { pose: 'stoop', s: 1.0, angle: 0.75, strike: w.st && w.st.t > w.st.T * 0.6 });
  else { const back = f.state === 'return'; c.fillStyle = 'rgba(0,0,0,.12)'; c.beginPath(); c.ellipse(fx, GY + 2, 14, 3, 0, 0, TAU); c.fill(); drawFalcon(c, fx, fy, A, { pose: 'fly', s: 1.0, ph: sc.flap, flip: back, glide: w.phase === 'chase' && f.vx > 0 && false }); }
  // dust and feathers
  for (const p of sc.parts) { c.globalAlpha = Math.min(1, p.life * 2); if (p.feather) { c.save(); c.translate(sx(p.x), sy(p.y)); c.rotate(p.rot); c.fillStyle = p.col; c.strokeStyle = INK; c.lineWidth = 1; c.beginPath(); c.ellipse(0, 0, 5, 1.8, 0, 0, TAU); c.fill(); c.stroke(); c.restore(); } else { c.fillStyle = p.col; c.beginPath(); c.arc(sx(p.x), sy(p.y), p.r * (1.6 - p.life), 0, TAU); c.fill(); } }
  c.globalAlpha = 1;

  // the cast meter: release when the marker is in the green
  if (w.phase === 'cast' && w.cast) {
    const bx = mx - 44, by = GY - 150, bw = 14, bh = 92, m = w.cast.m;
    c.fillStyle = '#fffaf0'; c.strokeStyle = INK; c.lineWidth = 2.5; c.beginPath(); c.roundRect(bx, by, bw, bh, 7); c.fill(); c.stroke();
    c.fillStyle = '#4f8a3a'; c.beginPath(); c.roundRect(bx + 2.5, by + 2.5, bw - 5, bh * 0.18, 4); c.fill();
    c.fillStyle = '#f6b73c'; c.fillRect(bx + 2.5, by + bh * 0.18 + 3, bw - 5, bh * 0.2);
    c.fillStyle = '#c8202b'; c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.roundRect(bx - 5, by + bh * (1 - m) - 4, bw + 10, 8, 4); c.fill(); c.stroke();
  }
  // the strike ring: press when the moving ring sits inside the gold band
  if (w.phase === 'strike' && w.st) {
    const st = w.st, R = t => 17 + 50 * Math.max(-0.2, 1 - t / st.T), half = st.win / 2, cy = d.air ? qy : GY - 12;
    const r1 = R(st.T - half), r2 = Math.max(6, R(st.T + half));
    c.strokeStyle = 'rgba(224,167,42,.9)'; c.lineWidth = Math.max(4, r1 - r2); c.beginPath(); c.arc(qx, cy, (r1 + r2) / 2, 0, TAU); c.stroke();
    c.strokeStyle = INK; c.lineWidth = 1.5; c.beginPath(); c.arc(qx, cy, r1, 0, TAU); c.stroke(); c.beginPath(); c.arc(qx, cy, r2, 0, TAU); c.stroke();
    c.strokeStyle = '#fffaf0'; c.lineWidth = 4.5; c.beginPath(); c.arc(qx, cy, Math.max(4, R(st.t)), 0, TAU); c.stroke(); c.strokeStyle = INK; c.lineWidth = 1.2; c.beginPath(); c.arc(qx, cy, Math.max(4, R(st.t)) + 2.6, 0, TAU); c.stroke();
  } else if (w.phase === 'chase' && w.can) { // the bird is in place: brackets on the quarry
    const cy = d.air ? qy : GY - 12, p = 20 + Math.sin(sc.t * 12) * 3; c.strokeStyle = '#c8202b'; c.lineWidth = 3.5; c.lineCap = 'round';
    for (const [ax, ay] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { c.beginPath(); c.moveTo(qx + ax * p, cy + ay * (p - 9)); c.lineTo(qx + ax * p, cy + ay * p); c.lineTo(qx + ax * (p - 9), cy + ay * p); c.stroke(); }
  }
  if (sc.ringFlash > 0) { c.strokeStyle = `rgba(255,224,102,${sc.ringFlash})`; c.lineWidth = 6; c.beginPath(); c.arc(qx, GY - 10, 30 + (1 - sc.ringFlash) * 50, 0, TAU); c.stroke(); }
  // the falcon's wind: a small bar that drains as it flies
  if (w.phase === 'chase' || w.phase === 'strike') {
    const bx = Math.max(8, Math.min(W - 58, fx - 25)), by = Math.max(8, fy - 44); c.fillStyle = 'rgba(43,26,18,.55)'; c.beginPath(); c.roundRect(bx, by, 50, 8, 4); c.fill();
    const e = Math.max(0, f.energy), gg = c.createLinearGradient(bx, 0, bx + 50, 0); gg.addColorStop(0, e < 0.3 ? '#e2735b' : '#f6b73c'); gg.addColorStop(1, e < 0.3 ? '#e2735b' : '#7fc96b'); c.fillStyle = gg; c.beginPath(); c.roundRect(bx + 1.5, by + 1.5, 47 * e, 5, 2.5); c.fill();
    if (qx > W - 26) { c.fillStyle = '#c8202b'; c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(W - 10, qy); c.lineTo(W - 26, qy - 10); c.lineTo(W - 26, qy + 10); c.closePath(); c.fill(); c.stroke(); label(c, Math.round((q.x - f.x) / 10) + '', W - 44, qy, 15, 800, '#fffaf0'); }
  }
}
export { CEIL, GY, view };
