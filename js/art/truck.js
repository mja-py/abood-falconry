// Abood's 4x4, the small 3D model from Abood in Liwa: built from boxes, cylinders and lines in its own space (x forward,
// y right, z up), turned by its heading and drawn back to front, so it turns smoothly and Abood is seen at the wheel
// from every side. Here he is a falconer: his right arm is raised with the cuff, and the falcon rides on it.
//   drawTruck(c, x, y, sc, { ang, steer, spin, speed, t, mouth, col, girl, carry: (c, x, y, k) => … })
import { INK } from '../art.js';

const TAU = Math.PI * 2, SHEMAGH = '#c8202b';
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const CS = 1.35, ZS = 0.85, VN = Math.hypot(ZS, 1), VY = ZS / VN, VZ = 1 / VN;   // model scale; how far "up" moves a point up the screen
const SUNX = -0.45, SUNY = -0.5, SUNZ = 0.74, EC = 0.819, ES = 0.574;
export const TRUCK_COLOURS = { white: { main: '#fbf9f2', dark: '#8f887a', trim: SHEMAGH }, teal: { main: '#1f7a74', dark: '#123f3c', trim: '#fffaf0' }, sand: { main: '#e9c58c', dark: '#8a6a3a', trim: '#1d6a8f' } };
const shadeCache = new Map();
function shade(hex, f) {
  const q = Math.round(clamp(f, 0, 1.12) * 16), key = hex + q; let s = shadeCache.get(key);
  if (!s) { const n = parseInt(hex.slice(1), 16), k = q / 16; s = `rgb(${Math.min(255, (n >> 16) * k | 0)},${Math.min(255, (n >> 8 & 255) * k | 0)},${Math.min(255, (n & 255) * k | 0)})`; shadeCache.set(key, s); }
  return s;
}
function mFace(out, pts, col, cx, cy, cz, o) { // a flat polygon whose outside is the side facing away from (cx,cy,cz)
  const ax = pts[3] - pts[0], ay = pts[4] - pts[1], az = pts[5] - pts[2], bx = pts[6] - pts[0], by = pts[7] - pts[1], bz = pts[8] - pts[2];
  let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx; const l = Math.hypot(nx, ny, nz) || 1, n = pts.length / 3; nx /= l; ny /= l; nz /= l;
  let mx = 0, my = 0, mz = 0; for (let i = 0; i < pts.length; i += 3) { mx += pts[i]; my += pts[i + 1]; mz += pts[i + 2]; } mx /= n; my /= n; mz /= n;
  if (nx * (mx - cx) + ny * (my - cy) + nz * (mz - cz) < 0) { nx = -nx; ny = -ny; nz = -nz; }
  const it = { k: 'f', m: pts, n: [nx, ny, nz], c: [mx, my, mz], col }; if (o) Object.assign(it, o); out.push(it); return it;
}
function mHull(out, b, t, col, o) { // a box, or a tapered box: bottom and top rectangles as [x0, x1, y0, y1, z]
  const P = (r, i, j) => [i ? r[1] : r[0], j ? r[3] : r[2], r[4]], v = [P(b, 0, 0), P(b, 1, 0), P(b, 1, 1), P(b, 0, 1), P(t, 0, 0), P(t, 1, 0), P(t, 1, 1), P(t, 0, 1)];
  const cx = (b[0] + b[1] + t[0] + t[1]) / 4, cy = (b[2] + b[3] + t[2] + t[3]) / 4, cz = (b[4] + t[4]) / 2;
  for (const q of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]) mFace(out, q.flatMap(i => v[i]), col, cx, cy, cz, o);
}
function mCyl(out, c, a, u, v, r, w, n, colSide, colCap) { // a wheel: centre, axle direction, and two directions across it
  const ring = s => { const p = []; for (let i = 0; i < n; i++) { const an = i / n * TAU, cs = Math.cos(an) * r, sn = Math.sin(an) * r; p.push(c[0] + a[0] * s + u[0] * cs + v[0] * sn, c[1] + a[1] * s + u[1] * cs + v[1] * sn, c[2] + a[2] * s + u[2] * cs + v[2] * sn); } return p; };
  const r0 = ring(-w / 2), r1 = ring(w / 2);
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; mFace(out, [r0[i * 3], r0[i * 3 + 1], r0[i * 3 + 2], r0[j * 3], r0[j * 3 + 1], r0[j * 3 + 2], r1[j * 3], r1[j * 3 + 1], r1[j * 3 + 2], r1[i * 3], r1[i * 3 + 1], r1[i * 3 + 2]], colSide, c[0], c[1], c[2], { ink: '#0e0c0b', iw: 0.9 }); }
  mFace(out, r0, colCap, c[0], c[1], c[2]); mFace(out, r1, colCap, c[0], c[1], c[2]);
}
function mLine(out, pts, col, w, o) {
  let mx = 0, my = 0, mz = 0; const n = pts.length / 3; for (let i = 0; i < pts.length; i += 3) { mx += pts[i]; my += pts[i + 1]; mz += pts[i + 2]; }
  const it = { k: 'l', m: pts, c: [mx / n, my / n, mz / n], col, w }; if (o) Object.assign(it, o); out.push(it);
}
const TYRE = '#2a2623', STEEL = '#2f2a27', TK = { wb: 25, wt: 20, rf: 12.5, rr0: 12.5, ww: 10.5, lift: 0 };
function buildCar() { // the parts that never move
  const M = [], tk = TK, lights = (x, y0) => { for (const y of [-9, -3, 3, 9]) mHull(M, [x - 1.5, x + 1.5, y - 2.4, y + 2.4, y0], [x - 1.5, x + 1.5, y - 2.4, y + 2.4, y0 + 4.5], '#ffd95a', { raw: 1 }); };
  const bk = -36;
  mHull(M, [bk + 2, 30, -13, 13, 8], [bk, 33, -15, 15, 20], 'main');                                 // the tub
  mHull(M, [8, 33, -15, 15, 20], [11, 30, -12, 12, 26], 'main');                                     // bonnet
  mFace(M, [12, -3, 26.2, 29.5, -3, 26.2, 29.5, 3, 26.2, 12, 3, 26.2], 'trim', 20, 0, 0, { b: 0.6, noInk: 1 }); // stripe
  mHull(M, [-36, -16, -15, 15, 20], [-35, -17, -14, 14, 25], 'main');                                // rear deck
  mHull(M, [-33, -27, 5, 12, 25], [-33, -27, 5, 12, 34], '#b3261e');                                 // jerrycan
  mCyl(M, [-39.5, 0, 21], [1, 0, 0], [0, 1, 0], [0, 0, 1], 9, 6, 10, TYRE, '#3a3531');               // spare wheel
  mFace(M, [-16, -12.5, 20.2, 8, -12.5, 20.2, 8, 12.5, 20.2, -16, 12.5, 20.2], '#3a322c', 0, 0, 0, { b: 0.4 }); // cockpit floor
  mHull(M, [-16, 8, -15, -13, 20], [-16, 8, -15, -13, 27], 'main'); mHull(M, [-16, 8, 13, 15, 20], [-16, 8, 13, 15, 27], 'main'); // doors
  mHull(M, [6, 9, -13, 13, 20], [6, 9, -13, 13, 28], 'dark');                                        // dashboard
  mHull(M, [-17, -12.5, -9.5, 9.5, 20], [-18, -13.5, -9.5, 9.5, 36], '#4a4440');                     // seat back
  const gz = 25.6, gy = tk.wt - tk.ww / 2 - 0.5;
  for (const sg of [-1, 1]) {
    mHull(M, [33, 34.6, sg * 9 - 3, sg * 9 + 3, 20.5], [33, 34.6, sg * 9 - 3, sg * 9 + 3, 25], '#fff3c4', { raw: 1 });   // headlights
    mHull(M, [bk - 0.6, bk + 0.5, sg * 10 - 2.5, sg * 10 + 2.5, 21], [bk - 0.6, bk + 0.5, sg * 10 - 2.5, sg * 10 + 2.5, 24], '#e8112d', { raw: 1 }); // tail lights
    for (const wx of [-tk.wb, tk.wb]) { const y0 = sg > 0 ? Math.min(15, gy) : -gy - tk.ww - 1, y1 = sg > 0 ? gy + tk.ww + 1 : -Math.min(15, gy); mHull(M, [wx - 14, wx + 14, y0, y1, gz], [wx - 11, wx + 11, y0, y1, gz + 1.8], 'main'); }
  }
  mFace(M, [33.3, -5, 12.5, 33.3, 5, 12.5, 33.3, 5, 19, 33.3, -5, 19], '#2a2623', 0, 0, 16, { b: 0.5 });  // grille
  mLine(M, [-18, -14, 25, -21, -14, 58, -21, 14, 58, -18, 14, 25], STEEL, 2.8, { ol: 1 });           // roll bar
  mLine(M, [-21, -14, 58, -34, -13, 25], STEEL, 2.4, { ol: 1 }); mLine(M, [-21, 14, 58, -34, 13, 25], STEEL, 2.4, { ol: 1 });
  lights(-21, 58.5);                                                                                 // roof lights
  mLine(M, [9, -13, 27, 6.5, -13, 39, 6.5, 13, 39, 9, 13, 27], STEEL, 1.8);                          // windscreen frame
  mFace(M, [9, -13, 27, 6.5, -13, 39, 6.5, 13, 39, 9, 13, 27], '#cfeef4', 0, 0, 33, { ds: 1, raw: 1, a: 0.3, noInk: 1 });
  mLine(M, [34, -13, 11, 38, -13, 21, 38, 13, 21, 34, 13, 11], '#8a817a', 2.4, { ol: 1 }); mLine(M, [38, -13, 16, 38, 13, 16], '#8a817a', 2, { ol: 1 }); // bull bar
  mLine(M, [9, 0, 25, 3.5, 0, 31.5], '#1b1715', 1.8);                                                // steering column
  mHull(M, [-12.5, -3.5, -7, 7, 21], [-12.5, -4.5, -8.8, 8.8, 39], 'robe');                          // the driver's kandura or jalabiya
  return M;
}
let MODEL = null; const carItems = [];
const comb = (a, ka, b, kb, c, kc) => { const x = a[0] * ka + b[0] * kb + c[0] * kc, y = a[1] * ka + b[1] * kb + c[1] * kc, z = a[2] * ka + b[2] * kb + c[2] * kc, l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
function drawHead(c, hx, hy, r, f, s, u, mouth, sc, scarf, band) { // the head: shemagh and agal for Abood, bukhnag with a gold band for Mozah
  const hp = (v, m) => [hx + v[0] * m, hy + (v[1] * ES - v[2] * EC) * m], see = v => v[1] * EC + v[2] * ES;
  c.fillStyle = scarf; c.beginPath(); c.arc(hx, hy, r, 0, TAU); c.fill();
  c.save(); c.clip();
  const fd = comb(f, 1, u, -0.2, s, 0);
  if (see(fd) > -0.4) {
    let p = hp(fd, r * 0.5); const g = c.createRadialGradient(p[0], p[1] - r * 0.2, r * 0.1, p[0], p[1], r * 0.8); g.addColorStop(0, '#e0a978'); g.addColorStop(0.6, '#c98b5a'); g.addColorStop(1, '#a8704a');
    c.fillStyle = g; c.beginPath(); c.arc(p[0], p[1], r * 0.74, 0, TAU); c.fill(); c.strokeStyle = 'rgba(43,26,18,.55)'; c.lineWidth = 1.1 * sc; c.stroke();
    const look = hp(f, r * 0.07);
    for (const sd of [-1, 1]) { const e = comb(f, 0.86, s, sd * 0.5, u, 0.2); if (see(e) < 0.12) continue; p = hp(e, r * 0.93);
      c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 0.9 * sc; c.beginPath(); c.ellipse(p[0], p[1], r * 0.23, r * 0.26, 0, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = INK; c.beginPath(); c.arc(p[0] + look[0] - hx, p[1] + look[1] - hy, r * 0.14, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(p[0] + look[0] - hx + r * 0.05, p[1] + look[1] - hy - r * 0.06, r * 0.05, 0, TAU); c.fill(); }
    for (const sd of [-1, 1]) { const ch = comb(f, 0.8, s, sd * 0.62, u, -0.22); if (see(ch) < 0.3) continue; p = hp(ch, r * 0.93); c.fillStyle = 'rgba(240,110,110,.4)'; c.beginPath(); c.arc(p[0], p[1], r * 0.13, 0, TAU); c.fill(); }
    const m = comb(f, 1, u, -0.3, s, 0);
    if (see(m) > 0.25) { p = hp(m, r * 0.93); c.strokeStyle = INK; c.lineWidth = 1.4 * sc; c.beginPath();
      if (mouth === 'o') { c.fillStyle = '#5a1414'; c.ellipse(p[0], p[1] - r * 0.05, r * 0.15, r * 0.19, 0, 0, TAU); c.fill(); c.stroke(); }
      else { c.arc(p[0], p[1] - r * 0.14, r * 0.2, 0.12 * Math.PI, 0.88 * Math.PI); c.stroke(); } }
  }
  c.restore();
  c.beginPath(); for (let i = 0; i < 16; i++) { const an = i / 16 * TAU, cs = Math.cos(an) * 0.82, sn = Math.sin(an) * 0.82, p = hp([u[0] * 0.5 + f[0] * cs + s[0] * sn, u[1] * 0.5 + f[1] * cs + s[1] * sn, u[2] * 0.5 + f[2] * cs + s[2] * sn], r); if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }
  c.closePath(); c.fillStyle = scarf; c.fill(); c.strokeStyle = band; c.lineWidth = 2.5 * sc; c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 1.3 * sc; c.beginPath(); c.arc(hx, hy - r * 0.42, r * 0.36, Math.PI * 1.15, Math.PI * 1.7); c.stroke();
  c.strokeStyle = INK; c.lineWidth = 1.5 * sc; c.beginPath(); c.arc(hx, hy, r, 0, TAU); c.stroke();
}
export function drawTruck(c, x, y, sc, o) {
  const GA = c.globalAlpha, girl = !!o.girl, scarf = girl ? '#1d1b22' : SHEMAGH, band = girl ? '#e8b64a' : '#121212', robe = girl ? '#f4a7c0' : '#fbfaf4';
  const col = Object.assign({ robe }, o.col || TRUCK_COLOURS.white), k = CS * sc, ca = Math.cos(o.ang), sa = Math.sin(o.ang);
  const F = [ca, sa, 0], R = [-sa, ca, 0], U = [0, 0, 1], oy = y;
  const st = (o.steer || 0) * 0.5, spd = o.speed || 0, tt = o.t || 0, spin = o.spin || 0, D = [], Wl = [], tk = TK;
  for (const [fx, fy] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) { // wheels: the front pair turns with the steering, all four spin
    const front = fx > 0, rad = front ? tk.rf : tk.rr0, s = front ? st : 0, a = [-Math.sin(s), Math.cos(s), 0], u = [Math.cos(s), Math.sin(s), 0], v = [0, 0, 1], cx = fx * tk.wb, cy = fy * tk.wt, cz = rad, hr = rad * 0.53;
    mCyl(Wl, [cx, cy, cz], a, u, v, rad, tk.ww, 12, TYRE, '#3a3531');
    const hub = [], hx = cx + a[0] * fy * (tk.ww / 2 + 0.35), hy = cy + a[1] * fy * (tk.ww / 2 + 0.35); for (let i = 0; i < 6; i++) { const an = spin + i / 6 * TAU, cs = Math.cos(an) * hr, sn = Math.sin(an) * hr; hub.push(hx + u[0] * cs, hy + u[1] * cs, cz + sn); }
    const hf = mFace(Wl, hub, '#d9cfbd', cx, cy, cz, { b: 0.8 });
    mLine(Wl, [hub[0], hub[1], hub[2], hub[9], hub[10], hub[11]], '#6b635c', 1.3, { b: 1.2, n: hf.n }); mLine(Wl, [hub[3], hub[4], hub[5], hub[12], hub[13], hub[14]], '#6b635c', 1.3, { b: 1.2, n: hf.n });
  }
  // the driver: left hand on the wheel; the right arm level with the cuff when the falcon rides on it
  const carry = !!o.carry, hl = [2.6 - st * 2.4, -4.4, 31.8 + st * 2], hr = carry ? [3, 15.5, 41] : [2.6 + st * 2.4, 4.4, 31.8 - st * 2];
  mLine(D, [-8, -9, 37, hl[0], hl[1], hl[2]], robe, 4.6, { ol: 1 }); mLine(D, [-8, 9, 37, hr[0], hr[1], hr[2]], robe, 4.6, { ol: 1 });
  D.push({ k: 'd', c: hl, r: 3, col: '#c98b5a' }, { k: 'd', c: hr, r: carry ? 3.8 : 3, col: carry ? '#1d6a8f' : '#c98b5a' });
  if (carry) D.push({ k: 'x', c: [3, 15.5, 44.5], draw: o.carry, b: 3 });
  const ring = []; for (let i = 0; i <= 10; i++) { const an = i / 10 * TAU + st * 2, cs = Math.cos(an) * 4.8, sn = Math.sin(an) * 4.8; ring.push(3.5 - sn * 0.45, cs, 31.5 + sn * 0.89); } mLine(D, ring, '#1b1715', 2);
  const fl = clamp(Math.abs(spd) * 0.07, 0, 20), wv = Math.sin(tt * 10) * (1.5 + fl * 0.12), tx = -20 - fl, tz = 51 - Math.max(0, 16 - fl) + wv * 0.5;
  mFace(D, [-16, -8, 52, -16, 8, 52, -13.6, 9.4, 39, -13.6, -9.4, 39], scarf, -7, 0, 45, { ds: 1 });                 // scarf over the shoulders
  mFace(D, [-17, -6.5, 55, -17, 6.5, 55, tx, wv + 3.5, tz, tx, wv - 3.5, tz], scarf, -7, 0, 20, { ds: 1 });        // and its tail, streaming back
  mLine(D, [tx, wv - 3.5, tz, tx, wv + 3.5, tz], girl ? '#e8b64a' : '#fff1e8', 1.6);
  D.push({ k: 'h', c: [-7, 0, 52], r: 12.5 });
  const ln = clamp(-spd * 0.05, -15, 5) + Math.sin(tt * 9) * 1.2, bx = -34, by = -13, mx = bx + ln, my = by, mz = 80;   // the whip mast with the flag
  mLine(D, [bx, by, 25, bx + ln * 0.3, by, 52, mx, my, mz], INK, 1.2);
  const fw = Math.sin(tt * 12) * 1.5, bandF = (z0, z1, hex) => mFace(D, [mx - 4, my, mz - z0, mx - 15, my + fw, mz - z0, mx - 15, my + fw, mz - z1, mx - 4, my, mz - z1], hex, 0, 0, 0, { ds: 1, raw: 1, iw: 0.7 });
  bandF(0, 3, '#00732f'); bandF(3, 6, '#ffffff'); bandF(6, 9, '#111111'); mFace(D, [mx, my, mz, mx - 4, my, mz, mx - 4, my, mz - 9, mx, my, mz - 9], '#e8112d', 0, 0, 0, { ds: 1, raw: 1, iw: 0.7 });
  carItems.length = 0;   // sort back to front, dropping faces that point away
  const add = it => {
    if (it.n) { const n = it.n, nx = F[0] * n[0] + R[0] * n[1] + U[0] * n[2], ny = F[1] * n[0] + R[1] * n[1] + U[1] * n[2], nz = F[2] * n[0] + R[2] * n[1] + U[2] * n[2], vis = ny * VY + nz * VZ;
      if (vis <= 0.02 && !it.ds) return; it.f = 0.72 + 0.4 * Math.max(0, (nx * SUNX + ny * SUNY + nz * SUNZ) * (vis < 0 ? -1 : 1)); }
    const m = it.c; it.d = (F[1] * m[0] + R[1] * m[1] + U[1] * m[2]) * VY + (F[2] * m[0] + R[2] * m[1] + U[2] * m[2]) * VZ + (it.b || 0); carItems.push(it);
  };
  for (const it of MODEL || (MODEL = buildCar())) add(it); for (const it of D) add(it); for (const it of Wl) add(it);
  carItems.sort((a, b) => a.d - b.d);
  const path = m => { c.beginPath(); for (let i = 0; i < m.length; i += 3) { const X = F[0] * m[i] + R[0] * m[i + 1], Y = F[1] * m[i] + R[1] * m[i + 1], Z = m[i + 2]; if (i) c.lineTo(x + X * k, oy + (Y - ZS * Z) * k); else c.moveTo(x + X * k, oy + (Y - ZS * Z) * k); } };
  const pt = m => [x + (F[0] * m[0] + R[0] * m[1]) * k, oy + (F[1] * m[0] + R[1] * m[1] - ZS * m[2]) * k];
  c.lineJoin = 'round'; c.lineCap = 'round';
  for (const it of carItems) {
    const hex = it.col && (it.col[0] === '#' ? it.col : col[it.col]);
    if (it.k === 'f') { path(it.m); c.closePath(); if (it.a) c.globalAlpha = it.a * GA; c.fillStyle = it.raw ? hex : shade(hex, it.f); c.fill(); if (it.a) c.globalAlpha = GA;
      if (!it.noInk) { c.strokeStyle = it.ink || INK; c.lineWidth = (it.iw || 1.25) * sc; c.stroke(); } }
    else if (it.k === 'l') { path(it.m); if (it.ol) { c.strokeStyle = INK; c.lineWidth = (it.w + 1.7) * k; c.stroke(); } c.strokeStyle = hex; c.lineWidth = it.w * k; c.stroke(); }
    else if (it.k === 'd') { const p = pt(it.c); c.fillStyle = hex; c.strokeStyle = INK; c.lineWidth = 1.2 * sc; c.beginPath(); c.arc(p[0], p[1], it.r * k, 0, TAU); c.fill(); c.stroke(); }
    else if (it.k === 'x') { const p = pt(it.c); it.draw(c, p[0], p[1], k); c.lineJoin = 'round'; c.lineCap = 'round'; }
    else { const p = pt(it.c), hy = st * 0.7, ch = Math.cos(hy), sh = Math.sin(hy);
      drawHead(c, p[0], p[1], it.r * k, [F[0] * ch + R[0] * sh, F[1] * ch + R[1] * sh, 0], [R[0] * ch - F[0] * sh, R[1] * ch - F[1] * sh, 0], U, o.mouth, sc, scarf, band); }
  }
}
