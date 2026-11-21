// The hunt on screen: the open desert seen from above, as in Abood in Liwa. The ground is a flat map shaded from the
// height function; standing things are side-view pictures with their feet on the map; the truck is a small 3D model and
// the falcon in flight is seen from above. All the rules are in js/sim/hunt-sim.js: this file follows that world with a
// camera and draws it. A catch is a puff of dust and a few feathers, and the falcon standing proud.
import { create, step, DT, alive, allowed } from '../sim/hunt-sim.js';
import { QUARRY } from '../data/quarry.js';
import { TAU, CELL, plantAt, CAMP, clamp } from '../sim/world.js';
import { drawGround, budget, SAND } from '../art/terrain.js';
import { drawTruck, TRUCK_COLOURS } from '../art/truck.js';
import { drawFalcon, drawFalconTop, drawBlock } from '../art/falcon.js';
import { person, BABA, INK } from '../art.js';
import { ghaf, shrub, tent, fire, palm, hare, sandgrouse, houbara } from '../art/desert.js';

const BR = 2, SPR = new Map();
// scenery that never changes is drawn once at twice its size and stamped after that: [draw, x0, y0, w, h]
const KIND = { shrub: [c => shrub(c, 1.25), -26, -44, 52, 48], ghaf: [c => { c.scale(1.35, 1.35); ghaf(c); }, -72, -112, 144, 118], tent: [c => { c.scale(1.5, 1.5); tent(c); }, -156, -96, 312, 102],
  fire: [c => { c.scale(1.4, 1.4); fire(c, 0.3); }, -26, -44, 84, 50], palm: [c => { c.scale(1.5, 1.5); palm(c); }, -60, -156, 140, 162],
  baba: [c => person(c, 0, 0, 0, false, Object.assign(BABA(), { still: 1, arm: 'wave', mouth: 'smile', t: 0.4 })), -52, -104, 104, 110], block: [c => drawBlock(c, 0, -44, 1.25), -20, -48, 40, 106] };
function spr(kind) {
  let e = SPR.get(kind); if (e) return e;
  const [fn, x, y, w, h] = KIND[kind], cv = document.createElement('canvas'); cv.width = w * BR; cv.height = h * BR; const g = cv.getContext('2d');
  g.scale(BR, BR); g.translate(-x, -y); g.lineJoin = 'round'; g.lineCap = 'round'; fn(g); e = { c: cv, x, y, w, h }; SPR.set(kind, e); return e;
}
const stamp = (c, kind, x, y) => { const e = spr(kind); c.drawImage(e.c, x + e.x, y + e.y, e.w, e.h); };
const shadow = (c, x, y, rx, ry, a = 0.2) => { c.fillStyle = `rgba(60,30,15,${a})`; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); };

// o: { seed, stats, level, lesson, look (the falcon's appearance), hoodCol, girl, colour, reduced }
export function makeHunt(o) {
  const w = create({ seed: o.seed, stats: o.stats, level: o.level, lesson: o.lesson, bagMax: o.bagMax });
  const sc = { w, o, t: 0, acc: 0, camx: w.truck.x, camy: w.truck.y, camZ: 1, flap: 0, spin: 0, steer: 0, parts: [], seen: 0, dustT: 0 };
  sc.update = (dt, intent) => {
    sc.t += dt; sc.acc += dt; let n = 0; const a0 = w.truck.ang;
    while (sc.acc >= DT && n++ < 4) { step(w, intent); intent.act = false; sc.acc -= DT; }
    if (sc.acc > DT * 4) sc.acc = 0;
    const f = w.fal, t = w.truck, fly = f.mode === 'fly';
    sc.flap += dt * (f.dash > 0 ? 0 : 15); sc.spin += t.v * dt / 12.5; sc.steer += (clamp((t.ang - a0) / Math.max(dt, 1e-3) * 0.5, -1, 1) - sc.steer) * Math.min(1, dt * 8);
    const fx = fly ? f : t, lead = fly ? 0.35 : 0.3, k = Math.min(1, dt * 4);
    sc.camx += (fx.x + Math.cos(fx.ang) * fx.v * lead - sc.camx) * k; sc.camy += (fx.y + Math.sin(fx.ang) * fx.v * lead - sc.camy) * k;
    sc.camZ += ((fly ? 0.74 : 1 - 0.14 * Math.min(1, t.v / 260)) - sc.camZ) * Math.min(1, dt * 2.2);
    sc.dustT -= dt; if (t.v > 60 && sc.dustT <= 0 && !o.reduced) { sc.dustT = 0.06; sc.parts.push({ x: t.x - Math.cos(t.ang) * 34 + (Math.random() - 0.5) * 20, y: t.y - Math.sin(t.ang) * 34 + (Math.random() - 0.5) * 12, vx: 0, vy: -8, life: 0.7, r: 5 + Math.random() * 5, col: 'rgba(252,228,170,' }); }
    for (const p of sc.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.feather) { p.vy += 40 * dt; p.rot += p.vr * dt; } }
    sc.parts = sc.parts.filter(p => p.life > 0);
    while (sc.seen < w.events.length) { const e = w.events[sc.seen++]; if (e.type === 'catch' || e.type === 'broke') burst(sc, w.quarry[e.id].x, w.quarry[e.id].y, e.type === 'catch' ? 6 : 3); else if (e.type === 'cover') burst(sc, w.quarry[e.id].x, w.quarry[e.id].y, 0); }
  };
  sc.draw = (c, W, Hh, dpr) => draw(sc, c, W, Hh, dpr);
  sc.radar = cnv => radar(sc, cnv);
  return sc;
}
function burst(sc, x, y, feathers) {
  const n = sc.o.reduced ? 4 : 12; for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = 30 + Math.random() * 70; sc.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6 - 20, life: 0.5 + Math.random() * 0.4, r: 5 + Math.random() * 6, col: 'rgba(252,228,170,' }); }
  for (let i = 0; i < feathers; i++) sc.parts.push({ x, y: y - 10, vx: (Math.random() - 0.5) * 110, vy: -50 - Math.random() * 50, life: 1.2 + Math.random() * 0.5, feather: 1, rot: Math.random() * 3, vr: (Math.random() - 0.5) * 7 });
}
const flying = q => q.state === 'flee' && QUARRY[q.kind].air && !(QUARRY[q.kind].runs && q.run < QUARRY[q.kind].runs);
function drawQuarry(c, q) {
  c.save(); c.translate(q.x, q.y); c.scale(q.dir < 0 ? -1 : 1, 1);
  if (q.kind === 'hare') hare(c, 0, 0, q.ph, q.state === 'idle' && q.v < 1, 1.25);
  else if (q.kind === 'sandgrouse') sandgrouse(c, 0, -9, Math.PI / 2, 1.15);
  else houbara(c, 0, 0, q.ph, false, 1.25);
  c.restore();
}

function draw(sc, c, W, Hh, dpr) {
  const w = sc.w, o = sc.o, f = w.fal, t = w.truck, zm = Math.sqrt(W * Hh / (800 * 470)) * sc.camZ, camx = sc.camx, camy = sc.camy;
  budget.left = 2;
  c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = SAND; c.fillRect(0, 0, W, Hh);
  c.setTransform(zm, 0, 0, zm, W / 2 - camx * zm, Hh / 2 - camy * zm); c.lineJoin = 'round'; c.lineCap = 'round';
  const hw = W / 2 / zm + 8, hh = Hh / 2 / zm + 8, x0 = camx - hw, x1 = camx + hw, y0 = camy - hh, y1 = camy + hh, inView = (x, y, m) => x > x0 - m && x < x1 + m && y > y0 - m && y < y1 + m;
  drawGround(c, x0, y0, x1, y1);
  // the edge of today's hunting ground, and the mat at the camp
  c.strokeStyle = 'rgba(200,32,43,.55)'; c.lineWidth = 5; c.setLineDash([26, 22]); c.beginPath(); c.arc(0, 0, w.lim + 30, 0, TAU); c.stroke(); c.setLineDash([]);
  c.fillStyle = '#c8202b'; c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.roundRect(-110, 8, 150, 62, 6); c.fill(); c.stroke(); c.strokeStyle = '#fffaf0'; c.lineWidth = 2; c.beginPath(); for (let i = 0; i < 9; i++) { c.moveTo(-104 + i * 17, 14); c.lineTo(-96 + i * 17, 22); c.lineTo(-88 + i * 17, 14); c.moveTo(-104 + i * 17, 64); c.lineTo(-96 + i * 17, 56); c.lineTo(-88 + i * 17, 64); } c.stroke();
  if (w.goal) { const g = w.goal, r = g.kind === 'falcon' ? 70 : 330; // where to go next: a turning ring and a column of light
    c.strokeStyle = 'rgba(200,32,43,.9)'; c.lineWidth = 6; c.setLineDash([16, 12]); c.lineDashOffset = -sc.t * 40; c.beginPath(); c.arc(g.x, g.y, r, 0, TAU); c.stroke(); c.setLineDash([]);
    if (g.kind === 'falcon') { const lg = c.createLinearGradient(0, g.y - 380, 0, g.y); lg.addColorStop(0, 'rgba(255,250,240,0)'); lg.addColorStop(1, 'rgba(255,250,240,.5)'); c.fillStyle = lg; c.fillRect(g.x - 14, g.y - 380, 28, 380); } }
  // everything that stands on the sand, drawn from the back of the view to the front
  const list = [];
  for (let j = Math.floor((y0 - 60) / CELL); j <= Math.floor((y1 + 120) / CELL); j++) for (let i = Math.floor((x0 - 80) / CELL); i <= Math.floor((x1 + 80) / CELL); i++) { const p = plantAt(i, j); if (p && inView(p.x, p.y, 120)) list.push({ y: p.y, k: 0, p }); }
  for (const cp of CAMP) if (inView(cp[1], cp[2], 320) && !(cp[0] === 'block' && f.mode !== 'none')) list.push({ y: cp[2], k: 1, cp });
  for (const q of w.quarry) if (alive(q) && q.state !== 'hide' && !flying(q) && inView(q.x, q.y, 80)) list.push({ y: q.y, k: 2, q });
  list.push({ y: t.y + 6, k: 3 }); if (f.mode === 'bind' || f.mode === 'down') list.push({ y: f.y + 2, k: 4 });
  list.sort((a, b) => a.y - b.y);
  for (const it of list) {
    if (it.k === 0) { shadow(c, it.p.x + 3, it.p.y + 1, it.p.kind === 'ghaf' ? 48 : 20, it.p.kind === 'ghaf' ? 9 : 5); stamp(c, it.p.kind, it.p.x, it.p.y); }
    else if (it.k === 1) { const [kind, x, y] = it.cp; if (kind !== 'tent') shadow(c, x + 3, y + 1, 16, 5); stamp(c, kind, x, y); if (kind === 'fire' && !o.reduced) { c.fillStyle = `rgba(255,224,122,${0.35 + 0.2 * Math.sin(sc.t * 9)})`; c.beginPath(); c.arc(x, y - 18, 16, 0, TAU); c.fill(); } }
    else if (it.k === 2) { const q = it.q; shadow(c, q.x, q.y + 1, 15, 4); drawQuarry(c, q);
      if (w.near === q.id && f.mode === 'fist') { const p = 30 + Math.sin(sc.t * 12) * 3; c.strokeStyle = '#c8202b'; c.lineWidth = 4; for (const [ax, ay] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { c.beginPath(); c.moveTo(q.x + ax * p, q.y - 14 + ay * (p - 11)); c.lineTo(q.x + ax * p, q.y - 14 + ay * p); c.lineTo(q.x + ax * (p - 11), q.y - 14 + ay * p); c.stroke(); } } }
    else if (it.k === 3) { shadow(c, t.x + 7, t.y + 9, 50, 24, 0.22);
      drawTruck(c, t.x, t.y, 1, { ang: t.ang, steer: sc.steer, spin: sc.spin, speed: t.v, t: sc.t, mouth: f.mode === 'bind' ? 'o' : '', col: TRUCK_COLOURS[o.colour] || TRUCK_COLOURS.white, girl: o.girl,
        carry: f.mode === 'fist' ? (g, px, py) => drawFalcon(g, px, py, o.look, { pose: 'cuff', s: 0.6, hood: w.near < 0, hoodCol: o.hoodCol }) : null }); }
    else { shadow(c, f.x, f.y + 1, 14, 4); drawFalcon(c, f.x, f.y, o.look, { pose: 'block', s: 0.9 }); }
  }
  // what is in the air: quarry on the wing, and the falcon
  for (const q of w.quarry) if (alive(q) && flying(q) && inView(q.x, q.y, 90)) { shadow(c, q.x + 10, q.y + 26, 12, 4, 0.16); c.save(); c.translate(q.x, q.y - 8); c.scale(q.dir < 0 ? -1 : 1, 1); if (q.kind === 'sandgrouse') sandgrouse(c, 0, 0, q.ph * 1.6, 1.15); else houbara(c, 0, 0, q.ph, true, 1.25); c.restore(); }
  if (f.mode === 'fly') { shadow(c, f.x + 6 + f.z * 0.3, f.y + 8 + f.z * 0.45, 17 - f.z * 0.06, 6 - f.z * 0.02, 0.2); drawFalconTop(c, f.x, f.y - f.z * 0.25, o.look, { ang: f.ang, flap: sc.flap, dash: f.dash > 0, s: 1.6 });
    if (f.dash > 0 && !o.reduced) { c.strokeStyle = 'rgba(255,250,240,.6)'; c.lineWidth = 3; for (const d of [-8, 0, 8]) { c.beginPath(); c.moveTo(f.x - Math.cos(f.ang) * 30 - Math.sin(f.ang) * d, f.y - f.z * 0.25 - Math.sin(f.ang) * 30 + Math.cos(f.ang) * d); c.lineTo(f.x - Math.cos(f.ang) * 62 - Math.sin(f.ang) * d, f.y - f.z * 0.25 - Math.sin(f.ang) * 62 + Math.cos(f.ang) * d); c.stroke(); } } }
  for (const p of sc.parts) { if (p.feather) { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.globalAlpha = Math.min(1, p.life * 2); c.fillStyle = '#f4ead6'; c.strokeStyle = INK; c.lineWidth = 1; c.beginPath(); c.ellipse(0, 0, 6, 2, 0, 0, TAU); c.fill(); c.stroke(); c.restore(); } else { c.fillStyle = p.col + Math.min(0.5, p.life) + ')'; c.beginPath(); c.arc(p.x, p.y, p.r * (1.5 - p.life), 0, TAU); c.fill(); } }
  c.globalAlpha = 1;
  // an arrow at the edge of the view: to the falcon on the ground, to the lesson's hare, or to the nearest quarry the falcon's eyes can find
  let ptr = w.goal, colr = '#c8202b'; const from = f.mode === 'fly' ? f : t;
  if (!ptr && (f.mode === 'fist' || f.mode === 'fly')) { const reach = 900 + w.stats.eyes * 14; let bd = reach * reach; for (const q of w.quarry) { if (!allowed(w, q)) continue; const d = (q.x - from.x) ** 2 + (q.y - from.y) ** 2; if (d < bd) { bd = d; ptr = q; } } colr = '#1d6a8f'; }
  if (ptr) { const dx = ptr.x - from.x, dy = ptr.y - from.y, d = Math.hypot(dx, dy);
    if (!inView(ptr.x, ptr.y, -60)) { const a = Math.atan2(dy, dx), ax = W / 2 + Math.cos(a) * W * 0.36, ay = Hh / 2 + Math.sin(a) * Hh * 0.32;
      c.setTransform(dpr, 0, 0, dpr, ax, ay); c.rotate(a); c.fillStyle = colr; c.strokeStyle = '#fffaf0'; c.lineWidth = 3; c.beginPath(); c.moveTo(24, 0); c.lineTo(-12, -16); c.lineTo(-4, 0); c.lineTo(-12, 16); c.closePath(); c.fill(); c.stroke();
      c.setTransform(dpr, 0, 0, dpr, ax - Math.cos(a) * 34, ay - Math.sin(a) * 34); c.font = '800 15px "Baloo Bhaijaan 2", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 4; c.strokeStyle = INK; const txt = Math.round(d / 8).toLocaleString('en-US'); c.strokeText(txt, 0, 0); c.fillStyle = '#fffaf0'; c.fillText(txt, 0, 0); } }
  c.setTransform(1, 0, 0, 1, 0, 0);
}
// the round map in the corner: north up, centred on whoever is being steered; far things are pinned to the rim
function radar(sc, cnv) {
  const w = sc.w, f = w.fal, t = w.truck, c = cnv.getContext('2d'), S = cnv.width, me = f.mode === 'fly' ? f : t, RAD = 2400, k = S / 2 / RAD, lim = S / 2 - 9;
  const rim = (x, y) => { const dx = (x - me.x) * k, dy = (y - me.y) * k, d = Math.hypot(dx, dy); return d > lim ? [S / 2 + dx / d * lim, S / 2 + dy / d * lim, 1] : [S / 2 + dx, S / 2 + dy, 0]; };
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, S, S); c.save(); c.beginPath(); c.arc(S / 2, S / 2, S / 2 - 3, 0, TAU); c.clip();
  c.fillStyle = '#e9c58c'; c.fillRect(0, 0, S, S);
  c.strokeStyle = 'rgba(200,32,43,.7)'; c.lineWidth = 3; c.setLineDash([8, 6]); c.beginPath(); c.arc(S / 2 - me.x * k, S / 2 - me.y * k, w.lim * k, 0, TAU); c.stroke(); c.setLineDash([]);
  const reach = 900 + w.stats.eyes * 14;
  for (const q of w.quarry) { if (!allowed(w, q) || Math.hypot(q.x - me.x, q.y - me.y) > reach) continue; const p = rim(q.x, q.y); c.fillStyle = q.kind === 'houbara' ? '#e0a72a' : q.kind === 'sandgrouse' ? '#1d6a8f' : '#8a4b25'; c.strokeStyle = INK; c.lineWidth = 1.5; c.beginPath(); c.arc(p[0], p[1], q.kind === 'houbara' ? 6 : 4.5, 0, TAU); c.fill(); c.stroke(); }
  let p = rim(0, 0); c.fillStyle = '#2f2622'; c.strokeStyle = '#fffaf0'; c.lineWidth = 2; c.beginPath(); c.moveTo(p[0] - 9, p[1] + 6); c.lineTo(p[0], p[1] - 8); c.lineTo(p[0] + 9, p[1] + 6); c.closePath(); c.fill(); c.stroke();   // the tent
  if (f.mode !== 'fist') { p = rim(f.mode === 'fly' ? t.x : f.x, f.mode === 'fly' ? t.y : f.y); c.fillStyle = f.mode === 'fly' ? '#fffaf0' : '#c8202b'; c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.arc(p[0], p[1], 6, 0, TAU); c.fill(); c.stroke(); }
  c.translate(S / 2, S / 2); c.rotate(me.ang); c.fillStyle = '#c8202b'; c.strokeStyle = '#fffaf0'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(11, 0); c.lineTo(-8, -8); c.lineTo(-4, 0); c.lineTo(-8, 8); c.closePath(); c.fill(); c.stroke();
  c.restore(); c.strokeStyle = INK; c.lineWidth = 5; c.beginPath(); c.arc(S / 2, S / 2, S / 2 - 3, 0, TAU); c.stroke();
}
