// The sand under everything, baked into tiles from the height function the hunt rules also read (js/sim/world.js).
// The shading is Abood in Liwa's: light from the north-west, half smooth and half banded so it looks drawn.
import { H, vn, clamp, WX, WY, WORLD_R, sstep } from '../sim/world.js';

export const TS = 256, TP = 128;
const TILE_MAX = 150, LX = -0.5, LY = -0.62, LZ = 0.6, PAL = [168, 98, 58, 229, 172, 104, 252, 228, 170];   // sand in shadow, in between, in the light
const tiles = new Map(), HG = new Float32Array((TP + 2) * (TP + 2));
export const budget = { left: 0 };
function shadeAt(dx, dy, h, wx, wy, curv) {
  const sh = (-dx * LX - dy * LY + LZ) / Math.sqrt(dx * dx + dy * dy + 1);
  let k = (sh - LZ) * 1.25 + 0.5 + (Math.min(h, 240) - 30) * 0.0013 + Math.sin((wx * WX + wy * WY) * 0.42 + vn(wx * 0.01, wy * 0.01) * 5) * 0.02 + clamp(-curv * 0.13, -0.07, 0.24);
  k = clamp(k, 0, 1); return k * 0.55 + Math.round(k * 6) / 6 * 0.45;
}
function bakeTile(ix, iy) {
  const cv = document.createElement('canvas'); cv.width = cv.height = TP; const g = cv.getContext('2d'), img = g.createImageData(TP, TP), px = img.data, N = TP + 2, st = TS / TP;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) HG[j * N + i] = H(ix * TS + (i - 0.5) * st, iy * TS + (j - 0.5) * st);
  for (let j = 0; j < TP; j++) for (let i = 0; i < TP; i++) {
    const p = (j + 1) * N + i + 1, o = (j * TP + i) * 4, wx = ix * TS + (i + 0.5) * st, wy = iy * TS + (j + 0.5) * st;
    const k = shadeAt((HG[p + 1] - HG[p - 1]) / (2 * st), (HG[p + N] - HG[p - N]) / (2 * st), HG[p], wx, wy, HG[p + 1] + HG[p - 1] + HG[p + N] + HG[p - N] - 4 * HG[p]);
    if (k < 0.5) { const f = k * 2; px[o] = PAL[0] + (PAL[3] - PAL[0]) * f; px[o + 1] = PAL[1] + (PAL[4] - PAL[1]) * f; px[o + 2] = PAL[2] + (PAL[5] - PAL[2]) * f; }
    else { const f = (k - 0.5) * 2; px[o] = PAL[3] + (PAL[6] - PAL[3]) * f; px[o + 1] = PAL[4] + (PAL[7] - PAL[4]) * f; px[o + 2] = PAL[5] + (PAL[8] - PAL[5]) * f; }
    const d = Math.hypot(wx, wy); if (d > WORLD_R) { const f = sstep(WORLD_R, WORLD_R + 140, d) * 0.6; px[o] += (120 - px[o]) * f; px[o + 1] += (84 - px[o + 1]) * f; px[o + 2] += (66 - px[o + 2]) * f; }
    px[o + 3] = 255;
  }
  g.putImageData(img, 0, 0); return cv;
}
// a baked tile, or null when this frame's baking budget is spent (the flat sand colour shows for a frame)
export function tile(ix, iy) {
  const key = ix + ',' + iy; let c = tiles.get(key);
  if (c) { tiles.delete(key); tiles.set(key, c); return c; }
  if (budget.left <= 0) return null; budget.left--;
  c = bakeTile(ix, iy); tiles.set(key, c); if (tiles.size > TILE_MAX) tiles.delete(tiles.keys().next().value);
  return c;
}
export const SAND = '#e3ad68';
// draw the ground for the world rectangle x0…x1, y0…y1 (the context is already in world units)
export function drawGround(c, x0, y0, x1, y1) {
  for (let iy = Math.floor(y0 / TS); iy <= Math.floor(y1 / TS); iy++) for (let ix = Math.floor(x0 / TS); ix <= Math.floor(x1 / TS); ix++) { const t = tile(ix, iy); if (t) c.drawImage(t, ix * TS, iy * TS, TS + 0.5, TS + 0.5); }
}
