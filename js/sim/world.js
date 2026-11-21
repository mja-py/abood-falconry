// The open desert: one fixed piece of ground that the hunt rules and the drawing both read. Pure numbers, no canvas.
// The dune shapes and noise come from Abood in Liwa, so the two games share one kind of sand. North is -y, the camp is
// at (0, 0), 8 units are about a metre. The hunting ground is a disc round the camp that grows with the falconer.
export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const sstep = (a, b, v) => { v = clamp((v - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); };
export const wrap = a => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
export function hash2(ix, iy) { let n = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ 0x5bd1e995; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
export function vn(x, y) { // smooth value noise
  const ix = Math.floor(x), iy = Math.floor(y); let fx = x - ix, fy = y - iy; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
// one dune in cross-section, u running downwind: a long windward ramp, then the short steep slip face
export function dune(u, a) { const s = u - Math.floor(u); if (s < a) { const t = s / a; return t * t * (2 - t); } return Math.pow(1 - (s - a) / (1 - a), 1.45); }
export const WX = 0.866, WY = 0.5;               // the wind that shaped the dunes

// the hunting grounds, by falconer level: how far from camp Abood may drive, and what lives out there
export const ZONES = [{ r: 2700, level: 1 }, { r: 4300, level: 3 }, { r: 6000, level: 6 }];
export const zoneRadius = level => { let r = ZONES[0].r; for (const z of ZONES) if (level >= z.level) r = z.r; return r; };
export const WORLD_R = ZONES[ZONES.length - 1].r;

// ground height at any point: dunes everywhere, level sand round the camp
export function H(x, y) {
  const w = vn(x * 0.0011 + 7.3, y * 0.0011 - 2.1) - 0.5, u = (x * WX + y * WY) / 560 + w * 0.7;
  const a0 = 0.4 + 0.6 * sstep(0.28, 0.66, vn(x * 0.0006 - 4.2, y * 0.0006 + 9.7));
  const h = dune(u, 0.68) * 78 * a0 + vn(x * 0.0024 + 1.7, y * 0.0024 + 5.1) * 12;
  const f = Math.exp(-(x * x + y * y) / 160000);
  return h * (1 - f) + 5 * f;
}

// plants grow on a jittered grid, the same on every device: grass clumps (where a hare goes to ground) and a few ghaf trees
export const CELL = 300;
export function plantAt(i, j) { // → null, or { kind: 'shrub' | 'ghaf', x, y }
  const h = hash2(i * 7 + 3, j * 13 - 5); if (h > 0.34) return null;
  const x = (i + 0.2 + 0.6 * hash2(i, j + 91)) * CELL, y = (j + 0.2 + 0.6 * hash2(i - 37, j)) * CELL;
  if (x * x + y * y < 330 * 330) return null;   // the camp is kept clear
  return { kind: h < 0.035 ? 'ghaf' : 'shrub', x, y };
}
// the nearest clump of grass within `reach`, or null
export function nearestShrub(x, y, reach = 450) {
  const ci = Math.floor(x / CELL), cj = Math.floor(y / CELL), n = Math.ceil(reach / CELL); let best = null, bd = reach * reach;
  for (let j = cj - n; j <= cj + n; j++) for (let i = ci - n; i <= ci + n; i++) { const p = plantAt(i, j); if (!p || p.kind !== 'shrub') continue; const d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y); if (d < bd) { bd = d; best = p; } }
  return best;
}
// the fixed things at the camp, for drawing and for bumping into: [kind, x, y, radius]
export const CAMP = [['tent', -150, -70, 70], ['fire', -30, 40, 16], ['baba', -70, 30, 14], ['palm', -250, 10, 10], ['block', 60, 30, 8]];
