// The desert, drawn in code: sky, dunes, camp, plants, and the quarry. Scenery pieces draw at the origin (base at 0,0);
// the tent, fire, palm and ghaf come from Abood in Liwa so the two games share one desert.
import { INK } from '../art.js';

const TAU = Math.PI * 2, RED = '#c8202b';
const ink = (c, w = 1.6) => { c.strokeStyle = INK; c.lineWidth = w; };
const fs = c => { c.fill(); c.stroke(); };
export const SKIES = { // [top, middle, horizon, sun colour, sun height 0–1, sand, sand shade]
  dawn:  ['#3a4a8c', '#e89a7a', '#ffd9a0', '#fff1c4', 0.80, '#e9c58c', '#c99a5e'],
  day:   ['#3f8fd6', '#a9d6f2', '#f4ead2', '#fffbe8', 0.22, '#efd3a0', '#d2a86c'],
  dusk:  ['#4a3a7a', '#e2735b', '#f7c070', '#ffe2a0', 0.74, '#e2b47c', '#b8834e'],
  night: ['#141030', '#2a2358', '#4a3a6a', '#f4f1e0', 0.25, '#7a6a8a', '#4f4468'],
};
export function sky(c, W, H, kind = 'day', horizon = 0.72) {
  const k = SKIES[kind] || SKIES.day, g = c.createLinearGradient(0, 0, 0, H * horizon);
  g.addColorStop(0, k[0]); g.addColorStop(0.62, k[1]); g.addColorStop(1, k[2]); c.fillStyle = g; c.fillRect(0, 0, W, H);
  const sx = W * 0.78, sy = H * horizon * k[4], r = kind === 'night' ? 13 : 20;
  c.fillStyle = k[3]; c.globalAlpha = 0.25; c.beginPath(); c.arc(sx, sy, r * 2.1, 0, TAU); c.fill(); c.globalAlpha = 1; c.beginPath(); c.arc(sx, sy, r, 0, TAU); c.fill();
  if (kind === 'night') { c.fillStyle = k[0]; c.beginPath(); c.arc(sx + 6, sy - 4, r * 0.9, 0, TAU); c.fill(); c.fillStyle = '#fff'; for (let i = 0; i < 40; i++) { const x = (i * 97.3) % W, y = (i * 53.7) % (H * horizon * 0.8); c.globalAlpha = 0.3 + (i % 5) * 0.14; c.fillRect(x, y, 1.6, 1.6); } c.globalAlpha = 1; }
}
// a band of dunes: a wavy ridge from x0 to x1 whose shape is fixed in world space (so it scrolls without swimming)
export function dunes(c, x0, x1, base, amp, wave, col, shade, H, off = 0) {
  const y = x => base - amp * (0.5 + 0.5 * Math.sin((x + off) / wave)) - amp * 0.35 * Math.sin((x + off) / (wave * 0.37) + 1.3);
  c.beginPath(); c.moveTo(x0, H); for (let x = x0; x <= x1 + 8; x += 8) c.lineTo(x, y(x)); c.lineTo(x1, H); c.closePath();
  const g = c.createLinearGradient(0, base - amp * 1.4, 0, H); g.addColorStop(0, col); g.addColorStop(1, shade); c.fillStyle = g; c.fill();
}
export function ghaf(c) { // the ghaf, the UAE's national tree
  ink(c); c.fillStyle = '#7a5433'; c.beginPath(); c.moveTo(-5, 0); c.quadraticCurveTo(-2, -20, -12, -38); c.lineTo(-4, -40); c.quadraticCurveTo(2, -30, 3, -22); c.quadraticCurveTo(8, -32, 16, -38); c.lineTo(20, -33); c.quadraticCurveTo(8, -20, 7, 0); c.closePath(); fs(c);
  c.fillStyle = '#5f9a55'; c.beginPath(); c.moveTo(-44, -40); c.quadraticCurveTo(-48, -62, -22, -64); c.quadraticCurveTo(-8, -78, 12, -66); c.quadraticCurveTo(40, -68, 44, -46); c.quadraticCurveTo(46, -34, 26, -36); c.quadraticCurveTo(4, -28, -16, -36); c.quadraticCurveTo(-40, -30, -44, -40); c.closePath(); fs(c);
  c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.ellipse(-8, -58, 20, 6, -0.1, 0, TAU); c.fill(); c.fillStyle = 'rgba(0,40,0,.16)'; c.beginPath(); c.ellipse(8, -40, 26, 5, 0, 0, TAU); c.fill();
}
export function shrub(c, s = 1) { // a clump of desert grass: where a hare goes to ground
  c.save(); c.scale(s, s); ink(c, 1.4); c.fillStyle = '#8a9a55';
  c.beginPath(); c.moveTo(-18, 0); c.quadraticCurveTo(-22, -14, -12, -20); c.quadraticCurveTo(-8, -30, 0, -24); c.quadraticCurveTo(8, -32, 13, -20); c.quadraticCurveTo(23, -14, 18, 0); c.closePath(); fs(c);
  c.strokeStyle = 'rgba(40,60,20,.5)'; c.lineWidth = 1.2; c.beginPath(); for (const [x, y] of [[-10, -14], [-2, -19], [6, -15], [0, -8]]) { c.moveTo(x, y); c.lineTo(x + 1, y + 7); } c.stroke(); c.restore();
}
export function tent(c) { // bayt al-sha'ar: the black goat-hair tent with a red sadu band
  ink(c); c.fillStyle = '#f3e3c2'; c.beginPath(); c.moveTo(-70, 0); c.lineTo(-62, -34); c.lineTo(62, -34); c.lineTo(70, 0); c.closePath(); fs(c);
  c.fillStyle = RED; c.beginPath(); c.roundRect(-50, -12, 38, 10, 4); fs(c); c.fillStyle = '#1d6a8f'; c.beginPath(); c.roundRect(10, -12, 38, 10, 4); fs(c);
  c.strokeStyle = '#fffaf0'; c.lineWidth = 1.2; c.beginPath(); for (let i = -46; i < -14; i += 6) { c.moveTo(i, -11); c.lineTo(i, -3); } for (let i = 14; i < 46; i += 6) { c.moveTo(i, -11); c.lineTo(i, -3); } c.stroke();
  ink(c); c.fillStyle = '#2f2622'; c.beginPath(); c.moveTo(-86, -30); c.lineTo(-58, -52); c.lineTo(-30, -44); c.lineTo(0, -60); c.lineTo(30, -44); c.lineTo(58, -52); c.lineTo(86, -30); c.lineTo(74, -24); c.lineTo(-74, -24); c.closePath(); fs(c);
  c.fillStyle = RED; c.fillRect(-74, -30, 148, 5); c.fillStyle = '#fffaf0'; for (let i = -70; i < 70; i += 12) { c.beginPath(); c.moveTo(i, -25); c.lineTo(i + 6, -30); c.lineTo(i + 12, -25); c.fill(); }
  ink(c, 1.3); c.strokeRect(-74, -30, 148, 5);
  c.strokeStyle = '#6b4a2b'; c.lineWidth = 3; c.beginPath(); c.moveTo(-62, 0); c.lineTo(-62, -30); c.moveTo(0, 0); c.lineTo(0, -30); c.moveTo(62, 0); c.lineTo(62, -30); c.stroke();
  ink(c, 1.2); c.beginPath(); c.moveTo(-86, -30); c.lineTo(-100, 0); c.moveTo(86, -30); c.lineTo(100, 0); c.stroke();
}
export function fire(c, t = 0) { // the camp fire with the dallah beside it
  ink(c); c.fillStyle = '#6b4a2b'; c.save(); c.rotate(0.25); c.beginPath(); c.roundRect(-14, -5, 28, 6, 3); fs(c); c.restore(); c.save(); c.rotate(-0.25); c.beginPath(); c.roundRect(-14, -5, 28, 6, 3); fs(c); c.restore();
  const f = 1 + Math.sin(t * 9) * 0.08; c.save(); c.scale(1, f);
  c.fillStyle = '#f28c28'; c.beginPath(); c.moveTo(-8, -4); c.quadraticCurveTo(-12, -16, -2, -26); c.quadraticCurveTo(0, -18, 5, -22); c.quadraticCurveTo(12, -12, 8, -4); c.closePath(); fs(c);
  c.fillStyle = '#ffe07a'; c.beginPath(); c.moveTo(-3, -5); c.quadraticCurveTo(-5, -12, 0, -17); c.quadraticCurveTo(5, -11, 3, -5); c.closePath(); c.fill(); c.restore();
  c.fillStyle = '#e0a72a'; c.beginPath(); c.moveTo(20, 0); c.lineTo(18, -9); c.quadraticCurveTo(24, -19, 30, -9); c.lineTo(28, 0); c.closePath(); fs(c);
  c.beginPath(); c.moveTo(30, -10); c.lineTo(37, -14); c.stroke(); c.beginPath(); c.arc(16, -7, 4, Math.PI * 0.6, Math.PI * 1.5); c.stroke();
}
// ---- quarry ----
// the desert hare: ph = stride phase; `still` sits up with its ears high (a hare frozen in cover)
export function hare(c, x, y, ph = 0, still = false, s = 1) {
  c.save(); c.translate(x, y); c.scale(s, s); ink(c, 1.4); c.lineJoin = 'round'; const hop = still ? 0 : Math.abs(Math.sin(ph)) * 5, st = still ? 0 : Math.sin(ph);
  c.translate(0, -hop); c.fillStyle = '#c9a46c';
  c.strokeStyle = INK; c.lineWidth = 3.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(-9, -6); c.lineTo(-13 - st * 7, 1 + hop * 0.6); c.moveTo(8, -6); c.lineTo(11 + st * 6, 1 + hop * 0.6); c.stroke();
  ink(c, 1.4); c.beginPath(); c.ellipse(0, -9, 14, 7.5, still ? -0.25 : -0.05, 0, TAU); fs(c);
  c.fillStyle = '#fffaf0'; c.beginPath(); c.arc(-14, -10, 3, 0, TAU); fs(c);                                   // tail
  c.fillStyle = '#c9a46c'; c.beginPath(); c.arc(13, -15, 6, 0, TAU); fs(c);
  const ea = still ? -0.15 : -0.9; for (const d of [0, 0.3]) { c.save(); c.translate(11, -19); c.rotate(ea + d); c.beginPath(); c.ellipse(0, -8, 2.4, 9, 0, 0, TAU); fs(c); c.fillStyle = '#e9b4a0'; c.beginPath(); c.ellipse(0, -8, 1, 6, 0, 0, TAU); c.fill(); c.fillStyle = '#c9a46c'; c.restore(); }
  c.fillStyle = '#1a1210'; c.beginPath(); c.arc(15.5, -16, 1.4, 0, TAU); c.fill(); c.restore();
}
// the sandgrouse: a plump, fast, sandy bird with pointed wings
export function sandgrouse(c, x, y, ph = 0, s = 1) {
  c.save(); c.translate(x, y); c.scale(s, s); ink(c, 1.3); c.lineJoin = 'round'; const f = Math.cos(ph);
  c.fillStyle = '#b08a52'; c.beginPath(); c.moveTo(-10, 0); c.lineTo(-22, -2); c.lineTo(-22, 2); c.closePath(); fs(c);
  c.fillStyle = '#d9b877'; c.beginPath(); c.ellipse(0, 0, 12, 7, 0, 0, TAU); fs(c);
  c.fillStyle = '#3a2a1c'; c.beginPath(); c.ellipse(-1, 3.5, 7, 2.4, 0, 0, Math.PI); c.fill();                // the dark belly band
  c.fillStyle = '#e2c98e'; c.beginPath(); c.arc(11, -3, 4.6, 0, TAU); fs(c); c.fillStyle = '#1a1210'; c.beginPath(); c.arc(12.5, -3.6, 1.1, 0, TAU); c.fill();
  c.fillStyle = '#8a6a3a'; c.beginPath(); c.moveTo(15, -3); c.lineTo(18.5, -2); c.lineTo(15, -1); c.closePath(); c.fill();
  c.save(); c.translate(0, -3); c.scale(1, (f < 0 ? -1 : 1) * Math.max(0.16, Math.abs(f))); c.fillStyle = '#b08a52'; c.beginPath(); c.moveTo(-5, 0); c.quadraticCurveTo(-8, -12, -12, -20); c.quadraticCurveTo(0, -11, 5, 0); c.closePath(); fs(c); c.restore();
  c.restore();
}
// the training drone with the lure (tilwah) swinging under it on a line
export function droneLure(c, x, y, t = 0, s = 1) {
  c.save(); c.translate(x, y); c.scale(s, s); ink(c, 1.3); const sw = Math.sin(t * 2.4) * 5;
  c.strokeStyle = INK; c.lineWidth = 1; c.beginPath(); c.moveTo(0, -26); c.quadraticCurveTo(sw * 0.5, -12, sw, 0); c.stroke();
  ink(c, 1.3); c.fillStyle = '#3a3f4a'; c.beginPath(); c.roundRect(-9, -32, 18, 7, 3); fs(c);
  c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-9, -29); c.lineTo(-17, -31); c.moveTo(9, -29); c.lineTo(17, -31); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.55)'; for (const dx of [-17, 17]) { c.beginPath(); c.ellipse(dx, -32.5, 8 * Math.abs(Math.cos(t * 30)) + 2, 1.6, 0, 0, TAU); c.fill(); }
  c.fillStyle = RED; c.beginPath(); c.arc(0, -28.5, 1.6, 0, TAU); c.fill();
  c.save(); c.translate(sw, 2); ink(c, 1.2);                                                                    // the lure: a pair of wings on a pad
  c.fillStyle = '#b89a6a'; for (const d of [-1, 1]) { c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(d * 10, -7, d * 15, 2); c.quadraticCurveTo(d * 8, 3, 0, 4); c.closePath(); fs(c); }
  c.fillStyle = '#7a5433'; c.beginPath(); c.ellipse(0, 2, 3.4, 3, 0, 0, TAU); fs(c); c.restore();
  c.restore();
}
export const QUARRY_ART = {
  lure: (c, x, y, t, s) => droneLure(c, x, y + 14, t, s),
  hare: (c, x, y, t, s, still) => hare(c, x, y, t * 16, still, s),
  sandgrouse: (c, x, y, t, s) => sandgrouse(c, x, y, t * 22, s),
};
// a small scene for a place card or a menu tile (logical 112×70, fills the canvas)
export function placeArt(cv, kind) {
  const c = cv.getContext('2d'), W = 112, H = 70; c.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0); c.clearRect(0, 0, W, H); c.lineJoin = 'round'; c.lineCap = 'round';
  const time = { majlis: 'night', ground: 'dawn', remah: 'day', marzoom: 'dusk', liwa: 'dusk' }[kind] || 'day', k = SKIES[time];
  sky(c, W, H, time, 0.78); dunes(c, 0, W, 50, 9, 26, k[5], k[6], H, kind.length * 31); dunes(c, 0, W, 60, 5, 17, k[5], k[6], H, 7);
  c.save();
  if (kind === 'majlis') { c.translate(46, 64); c.scale(0.5, 0.5); tent(c); c.translate(106, 2); fire(c, 0.3); }
  else if (kind === 'ground') { c.translate(78, 44); droneLure(c, 0, 0, 0.4, 0.9); c.translate(-52, 20); c.scale(0.5, 0.5); ghaf(c); }
  else if (kind === 'remah') { c.translate(30, 62); shrub(c, 0.7); hare(c, 44, 0, 1.1, false, 0.9); }
  else if (kind === 'marzoom') { c.translate(24, 63); c.scale(0.55, 0.55); ghaf(c); c.scale(1.8, 1.8); sandgrouse(c, 44, -34, 0.6, 0.8); }
  else { c.translate(60, 60); shrub(c, 0.6); }
  c.restore();
}
