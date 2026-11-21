// The parametric falcon. Every bird is drawn from its `appearance` (js/sim/phenotype.js), so two falcons with different
// beads never look the same: species silhouette, size, plumage colour, breast pattern, age and condition all show.
// Drawn in code like everything else in the family: ink outline, flat fills, one soft highlight. Faces right.
//   drawFalcon(c, x, y, a, { pose: 'block' | 'cuff' | 'fly' | 'stoop', s, ph, hood, hoodCol, glide, strike, flip })
// 'block' and 'cuff' put the feet at (x, y); 'fly' and 'stoop' put the body centre there.
import { INK } from '../art.js';

const TAU = Math.PI * 2;
const YELLOW = '#e9b330', JUVENILE = '#9fb2c0', BEAK = '#3a3531', LEATHER = '#8a5a34';
const prng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const ink = (c, w = 1.5) => { c.strokeStyle = INK; c.lineWidth = w; };
const fs = c => { c.fill(); c.stroke(); };

// breast marks inside the current clip: spots, bars or juvenile streaks, placed by the bird's own seed
function marks(c, a, x0, y0, x1, y1, salt = 0) {
  const n = Math.round(a.density * 26); if (!n) return;
  const r = prng(a.seed + salt); c.fillStyle = a.mark; c.strokeStyle = a.mark; c.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), kind = a.pattern[i % 2];
    if (kind === 'spotted') { c.beginPath(); c.ellipse(x, y, 1, 1.9, 0.2, 0, TAU); c.fill(); }
    else if (kind === 'barred') { c.lineWidth = 1.1; c.beginPath(); c.moveTo(x - 1.8, y); c.lineTo(x + 1.8, y + 0.4); c.stroke(); }
    else if (a.juvenile || i % 3 === 0) { c.globalAlpha = 0.6; c.beginPath(); c.ellipse(x, y, 0.55, 2.4, 0.1, 0, TAU); c.fill(); c.globalAlpha = 1; }
  }
}
// head at (hx, hy): cap, moustache stripe, eye, cere and hooked beak; or the leather hood
function head(c, a, hx, hy, r, o) {
  const b = a.build, soft = a.juvenile ? JUVENILE : YELLOW, k = r / 7;
  c.fillStyle = a.breast; ink(c); c.beginPath(); c.arc(hx, hy, r, 0, TAU); c.fill();
  c.save(); c.clip();
  c.globalAlpha = 0.3 + 0.7 * b.cap; c.fillStyle = a.back; c.fillRect(hx - r - 1, hy - r - 1, 2 * r + 2, r * (0.7 + 0.45 * b.cap));
  c.globalAlpha = Math.min(1, b.malar); c.fillStyle = a.mark; c.beginPath(); c.moveTo(hx + 1.6 * k, hy - 1 * k); c.lineTo(hx + 4.8 * k, hy - 1 * k); c.lineTo(hx + 3.8 * k, hy + 6.5 * k); c.lineTo(hx + 2 * k, hy + 6.5 * k); c.closePath(); c.fill();
  c.globalAlpha = 1; c.restore();
  c.beginPath(); c.arc(hx, hy, r, 0, TAU); c.stroke();
  if (o.hood) {
    c.fillStyle = LEATHER; c.beginPath(); c.arc(hx, hy, r + 0.7, 0, TAU); fs(c);
    c.fillStyle = o.hoodCol || '#c8202b'; c.beginPath(); c.arc(hx, hy - 1, r + 0.7, Math.PI * 1.05, Math.PI * 1.95); c.closePath(); fs(c);
    c.strokeStyle = '#e0a72a'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(hx - 2 * k, hy - r); c.lineTo(hx - 2.4 * k, hy - r - 5 * k); c.moveTo(hx, hy - r - 0.5); c.lineTo(hx + 1 * k, hy - r - 6 * k); c.moveTo(hx + 2 * k, hy - r); c.lineTo(hx + 4 * k, hy - r - 4 * k); c.stroke();
  } else {
    c.strokeStyle = soft; c.lineWidth = 1; c.beginPath(); c.arc(hx + 3.2 * k, hy - 2 * k, 2.3 * k, 0, TAU); c.stroke();
    c.fillStyle = '#1a1210'; c.beginPath(); c.arc(hx + 3.2 * k, hy - 2 * k, 1.7 * k, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(hx + 3.8 * k, hy - 2.6 * k, 0.55 * k, 0, TAU); c.fill();
  }
  ink(c, 1.2); c.fillStyle = soft; c.beginPath(); c.moveTo(hx + 6 * k, hy - 2 * k); c.lineTo(hx + 9 * k, hy - 1.5 * k); c.lineTo(hx + 9 * k, hy + 1 * k); c.lineTo(hx + 6 * k, hy + 2 * k); c.closePath(); fs(c);
  c.fillStyle = BEAK; c.beginPath(); c.moveTo(hx + 9 * k, hy - 1.5 * k); c.quadraticCurveTo(hx + 13 * k, hy, hx + 10.5 * k, hy + 4.5 * k); c.lineTo(hx + 9 * k, hy + 1 * k); c.closePath(); fs(c);
}

function perched(c, a, o) {
  const b = a.build, soft = a.juvenile ? JUVENILE : YELLOW, k = b.chest, tl = b.tail;
  ink(c); c.fillStyle = a.back; c.beginPath(); c.moveTo(-7, -8); c.lineTo(-11.5, 14 * tl); c.lineTo(-5, 15.5 * tl); c.lineTo(-2, -4); c.closePath(); fs(c);          // tail
  if (a.pattern.includes('barred')) { c.strokeStyle = a.mark; c.lineWidth = 1.2; for (let i = 1; i <= 3; i++) { const y = i * 4.2 * tl; c.beginPath(); c.moveTo(-9.6 - i * 0.4, y); c.lineTo(-4.4, y + 1); c.stroke(); } }
  if (a.wear >= 2 || a.moult) { c.strokeStyle = INK; c.lineWidth = 1; c.beginPath(); c.moveTo(-9.5, 15 * tl); c.lineTo(-8.6, 11.5 * tl); c.lineTo(-7.6, 15.2 * tl); if (a.wear >= 3) { c.moveTo(-7, 15.4 * tl); c.lineTo(-6.3, 12.5 * tl); } c.stroke(); }
  ink(c); c.fillStyle = a.mark; c.beginPath(); c.moveTo(-9, -14); c.lineTo(-12.5, 8 * b.wing); c.lineTo(-5, -6); c.closePath(); fs(c);                               // wing tips over the tail
  c.strokeStyle = soft; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(-3, -2); c.lineTo(-4, 0.5); c.moveTo(3, -2); c.lineTo(4, 0.5); c.stroke();     // feet
  const body = () => { c.beginPath(); c.moveTo(-8, -6); c.quadraticCurveTo(-12, -26, -3, -36); c.quadraticCurveTo(7 * k, -38, 9 * k, -26); c.quadraticCurveTo(10 * k, -12, 4, -3); c.quadraticCurveTo(-2, 0, -8, -6); c.closePath(); };
  body(); c.fillStyle = a.breast; c.fill(); c.save(); c.clip();
  c.fillStyle = a.back; c.beginPath(); c.ellipse(-9, -18, 8, 20, 0.12, 0, TAU); c.fill();                                                                         // folded wing
  c.strokeStyle = a.mark; c.globalAlpha = 0.55; c.lineWidth = 1; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(-14 + i * 1.5, -22 + i * 7, 9, -0.5, 0.7); c.stroke(); } c.globalAlpha = 1;
  if (a.moult) { c.fillStyle = a.breast; c.beginPath(); c.ellipse(-6, -14, 1.6, 3, 0.3, 0, TAU); c.fill(); }
  marks(c, a, -0.5, -31, 8.5 * k, -5);
  c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.ellipse(5 * k, -24, 2.2, 8, -0.1, 0, TAU); c.fill();
  c.restore(); body(); ink(c); c.stroke();
  if (a.thin) { c.strokeStyle = 'rgba(43,26,18,.4)'; c.lineWidth = 1; c.beginPath(); c.moveTo(6 * k, -22); c.quadraticCurveTo(7.5 * k, -14, 4.5, -7); c.stroke(); }
  head(c, a, 1, -39 - (b.head - 1) * 3, 7 * b.head, o);
  if (o.jesses) { c.strokeStyle = '#6b4a2b'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-3.5, 0); c.quadraticCurveTo(-5, 6, -9, 9); c.moveTo(3.5, 0); c.quadraticCurveTo(1, 7, -7, 10); c.stroke(); }
}

// one wing pointing up from its root; f in [-1, 1] flattens it through the beat (negative = down-stroke, underside shows)
function wing(c, a, L, f, far) {
  const ff = (f < 0 ? -1 : 1) * Math.max(0.14, Math.abs(f));
  c.save(); c.scale(1, ff);
  const shape = () => { c.beginPath(); c.moveTo(-7, 0); c.quadraticCurveTo(-10, -L * 0.5, -4 - L * 0.28, -L); c.quadraticCurveTo(0, -L * 0.55, 6, -L * 0.16); c.lineTo(7, 0); c.closePath(); };
  shape(); c.fillStyle = far ? a.mark : f < 0 ? a.breast : a.back; c.fill();
  c.save(); c.clip(); c.strokeStyle = a.mark; c.globalAlpha = far ? 0 : 0.6; c.lineWidth = 1.1;
  for (let i = 1; i <= 5; i++) { const y = -L * (0.2 + i * 0.14); c.beginPath(); c.moveTo(-12 - L * 0.25, y + 3); c.lineTo(8, y - 2); c.stroke(); }
  c.globalAlpha = 1; c.restore();
  shape(); c.lineWidth = Math.min(4, 1.5 / Math.abs(ff)); c.strokeStyle = INK; c.stroke();
  c.restore();
}
function flying(c, a, o) {
  const b = a.build, soft = a.juvenile ? JUVENILE : YELLOW, k = b.chest, L = 34 * b.wing, ph = o.ph || 0;
  const f = o.glide ? 0.3 : Math.cos(ph), f2 = o.glide ? 0.24 : Math.cos(ph - 0.5);
  c.save(); c.translate(5, -4); c.rotate(-0.12); wing(c, a, L * 0.94, f2, true); c.restore();                                                                       // far wing
  ink(c); c.fillStyle = a.back; c.beginPath(); c.moveTo(-13, -2.6); c.lineTo(-30 * b.tail, -5.2); c.quadraticCurveTo(-35 * b.tail, 0, -30 * b.tail, 5); c.lineTo(-13, 2.8); c.closePath(); fs(c); // tail, a narrow fan
  if (a.pattern.includes('barred')) { c.strokeStyle = a.mark; c.lineWidth = 1.2; for (let i = 1; i <= 3; i++) { const x = -13 - i * 4.6 * b.tail; c.beginPath(); c.moveTo(x, -3.8 - i * 0.3); c.lineTo(x - 0.6, 3.6 + i * 0.3); c.stroke(); } }
  c.fillStyle = soft; ink(c, 1.2); c.beginPath(); c.ellipse(-7, 5.2 * k, 3.2, 1.6, 0.2, 0, TAU); fs(c);                                                              // tucked feet
  const body = () => { c.beginPath(); c.moveTo(-16, -1); c.quadraticCurveTo(-6, -9 * k, 8, -6.5); c.quadraticCurveTo(14, -4, 14, 1); c.quadraticCurveTo(6, 7 * k, -6, 5); c.quadraticCurveTo(-12, 4, -16, -1); c.closePath(); };
  body(); c.fillStyle = a.breast; c.fill(); c.save(); c.clip();
  c.fillStyle = a.back; c.beginPath(); c.ellipse(-2, -7, 20, 6.5, 0.06, 0, TAU); c.fill();
  marks(c, a, -9, 0, 11, 5.5 * k, 7);
  c.restore(); body(); ink(c); c.stroke();
  head(c, a, 15.5, -2.5, 5.6 * b.head, o);
  c.save(); c.translate(2, -4); c.rotate(0.1); wing(c, a, L, f, false); c.restore();                                                                                 // near wing
}
function stooping(c, a, o) {
  const b = a.build, soft = a.juvenile ? JUVENILE : YELLOW, k = b.chest;
  c.save(); c.rotate(o.angle ?? 0.95);
  ink(c); c.fillStyle = a.back; c.beginPath(); c.moveTo(-14, -2.5); c.lineTo(-30 * b.tail, -2.5); c.lineTo(-30 * b.tail, 2.5); c.lineTo(-14, 2.5); c.closePath(); fs(c);
  const body = () => { c.beginPath(); c.moveTo(-17, 0); c.quadraticCurveTo(-6, -8 * k, 9, -5.5); c.quadraticCurveTo(14, -3, 14, 1); c.quadraticCurveTo(6, 6.5 * k, -6, 4.5); c.quadraticCurveTo(-13, 3, -17, 0); c.closePath(); };
  body(); c.fillStyle = a.breast; c.fill(); c.save(); c.clip(); marks(c, a, -9, 0, 11, 5 * k, 7); c.restore(); body(); ink(c); c.stroke();
  c.fillStyle = a.back; c.beginPath(); c.moveTo(7, -6); c.quadraticCurveTo(-8, -10 * k, -26 * b.wing, -3.5); c.quadraticCurveTo(-10, -1, 4, -1.5); c.closePath(); fs(c);   // folded wing, a teardrop
  if (o.strike) { c.strokeStyle = soft; c.lineWidth = 2.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(2, 4 * k); c.lineTo(9, 10); c.moveTo(-2, 4.5 * k); c.lineTo(5, 11.5); c.stroke(); }
  head(c, a, 15, -2, 5.6 * b.head, o);
  c.restore();
}

export function drawFalcon(c, x, y, a, o = {}) {
  const s = (o.s || 1) * a.scale;
  c.save(); c.translate(x, y); c.scale(o.flip ? -s : s, s); c.lineJoin = 'round'; c.lineCap = 'round';
  if (o.pose === 'fly') flying(c, a, o); else if (o.pose === 'stoop') stooping(c, a, o); else perched(c, a, o);
  c.restore();
}
// the block perch (wakir): a padded top on a stake pushed into the sand. Top centre at (x, y).
export function drawBlock(c, x, y, s = 1, col = '#1d6a8f') {
  c.save(); c.translate(x, y); c.scale(s, s); ink(c);
  c.fillStyle = '#7a5433'; c.beginPath(); c.roundRect(-2.5, 8, 5, 36, 2); fs(c);
  c.fillStyle = col; c.beginPath(); c.roundRect(-13, 0, 26, 9, 4.5); fs(c);
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-9, 2.5); c.lineTo(6, 2.5); c.stroke();
  c.restore();
}
// a downy chick: all eyes and fluff. Feet at (x, y).
export function drawChick(c, x, y, s = 1, t = 0) {
  c.save(); c.translate(x, y); c.scale(s, s); ink(c, 1.4); c.lineJoin = 'round';
  c.fillStyle = '#f6f1e4'; c.beginPath(); c.ellipse(0, -9, 9.5, 9, 0, 0, TAU); fs(c);
  c.beginPath(); c.arc(1, -20 + Math.sin(t * 3) * 0.5, 6.5, 0, TAU); fs(c);
  c.strokeStyle = 'rgba(160,150,130,.6)'; c.lineWidth = 1; for (const [dx, dy, r] of [[-7, -12, 0.5], [-5, -5, 0.2], [6, -6, -0.3], [-3, -26, 0.6]]) { c.beginPath(); c.moveTo(dx, dy); c.lineTo(dx - 2 * Math.cos(r), dy - 2); c.stroke(); }
  c.fillStyle = '#1a1210'; c.beginPath(); c.arc(3.4, -21, 1.5, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(3.9, -21.6, 0.5, 0, TAU); c.fill();
  ink(c, 1.1); c.fillStyle = JUVENILE; c.beginPath(); c.moveTo(6.5, -20.5); c.lineTo(10, -19); c.lineTo(7, -17); c.closePath(); fs(c);
  c.strokeStyle = JUVENILE; c.lineWidth = 1.8; c.beginPath(); c.moveTo(-3, -1); c.lineTo(-4, 1); c.moveTo(3, -1); c.lineTo(4, 1); c.stroke();
  c.restore();
}
// a falcon egg: buff with red-brown speckles, each egg its own. Centre at (x, y).
export function drawEgg(c, x, y, s = 1, seed = 1, dull = false) {
  c.save(); c.translate(x, y); c.scale(s, s); ink(c, 1.5);
  const shape = () => { c.beginPath(); c.moveTo(0, -11); c.bezierCurveTo(7, -11, 9, 0, 8, 4); c.bezierCurveTo(7, 10, -7, 10, -8, 4); c.bezierCurveTo(-9, 0, -7, -11, 0, -11); c.closePath(); };
  shape(); c.fillStyle = dull ? '#e4ddd0' : '#e9c9a0'; c.fill(); c.save(); c.clip();
  const r = prng(seed); c.fillStyle = dull ? 'rgba(150,140,125,.5)' : 'rgba(150,72,40,.75)';
  for (let i = 0; i < 26; i++) { c.beginPath(); c.ellipse(-8 + r() * 16, -11 + r() * 21, 0.5 + r() * 1.3, 0.4 + r() * 0.9, r() * 3, 0, TAU); c.fill(); }
  c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-3, -5, 2, 4, -0.4, 0, TAU); c.fill();
  c.restore(); shape(); c.stroke(); c.restore();
}

// The falcon seen from above, for the open desert: nose along +x at angle 0. flap is the wing-beat phase; dash folds
// the wings for a swoop. Drawn from the same appearance as the side views, so each bird is still itself in the air.
export function drawFalconTop(c, x, y, a, o = {}) {
  const s = (o.s || 1) * (0.86 + (a.scale - 1) * 0.6), b = a.build, dash = !!o.dash, beat = dash ? 0 : Math.cos(o.flap || 0);
  const span = dash ? 13 : 33 * b.wing * (0.72 + 0.28 * Math.abs(beat)), sweep = dash ? 20 : 7 - beat * 4, tail = 17 * b.tail;
  c.save(); c.translate(x, y); c.rotate(o.ang || 0); c.scale(s, s); c.lineJoin = 'round'; c.lineCap = 'round'; ink(c, 1.4);
  c.fillStyle = a.back; c.beginPath(); c.moveTo(-9, -4); c.lineTo(-9 - tail, -7); c.quadraticCurveTo(-13 - tail, 0, -9 - tail, 7); c.lineTo(-9, 4); c.closePath(); fs(c);       // tail
  if (a.pattern.includes('barred')) { c.strokeStyle = a.mark; c.lineWidth = 1.2; for (let i = 1; i <= 2; i++) { const tx = -9 - tail * i / 3; c.beginPath(); c.moveTo(tx, -5); c.lineTo(tx, 5); c.stroke(); } ink(c, 1.4); }
  for (const sd of [-1, 1]) { // wings: pointed, swept back
    c.fillStyle = a.back; c.beginPath(); c.moveTo(7, sd * 3); c.quadraticCurveTo(6, sd * span * 0.55, -sweep, sd * span); c.quadraticCurveTo(-sweep - 3, sd * span * 0.5, -8, sd * 3.5); c.closePath(); fs(c);
    c.fillStyle = a.mark; c.beginPath(); c.moveTo(-sweep * 0.55 + 1, sd * span * 0.72); c.lineTo(-sweep, sd * span); c.quadraticCurveTo(-sweep - 2.4, sd * span * 0.72, -sweep * 0.72 - 4, sd * span * 0.56); c.closePath(); c.fill();   // dark wing tip
  }
  ink(c, 1.4); c.fillStyle = a.back; c.beginPath(); c.ellipse(0, 0, 12 * b.chest, 5.6 * b.chest, 0, 0, TAU); fs(c);                                                              // body
  c.fillStyle = a.breast; c.globalAlpha = 0.55; c.beginPath(); c.ellipse(-2, 0, 6, 2.6, 0, 0, TAU); c.fill(); c.globalAlpha = 1;
  const hr = 4.9 * b.head; c.fillStyle = b.cap > 0.5 ? a.mark : a.back; c.beginPath(); c.arc(12, 0, hr, 0, TAU); fs(c);                                                         // head
  c.fillStyle = a.breast; c.beginPath(); c.arc(13.4, 0, hr * 0.55, -1.2, 1.2); c.fill();
  c.fillStyle = a.juvenile ? JUVENILE : YELLOW; c.beginPath(); c.moveTo(12 + hr * 0.8, -1.5); c.lineTo(12 + hr + 3.6, 0); c.lineTo(12 + hr * 0.8, 1.5); c.closePath(); fs(c);    // beak
  c.restore();
}
