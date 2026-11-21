// Canvas art for an Abood family game. Everything is drawn in code: no image files, so the look is identical on every
// screen size and the whole game stays a few hundred KB. All strokes are INK, 1.4–1.6 px at scale 1, round joins.
// The people here are the canonical Abood, Mozah and Baba from Run, Abood! (feet at (x,y), facing right, ~66 units tall
// at s = 1). For the astronaut versions, Nabeeh and Usta see js/art.js in the abood-space repo.
import { lang } from './i18n.js';

export const INK = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#2b1a12';
export const FONT = '"Baloo Bhaijaan 2", "Trebuchet MS", Tahoma, system-ui, sans-serif';
const TAU = Math.PI * 2;
export const SKIN = { abood: { skin: '#c98b5a', skinD: '#a8704a', skinL: '#e0a978' }, baba: { skin: '#b97a4c', skinD: '#956039', skinL: '#cf9465' } };
export const ROBES = { // kandura (Abood) and jalabiya (Mozah) colours: free in every game
  white: { col: '#fbfaf4', shade: '#dcd8cb' }, cream: { col: '#f1e6cf', shade: '#d4c3a0' }, grey: { col: '#d9dbe0', shade: '#b0b5c0' }, brown: { col: '#9a7353', shade: '#775638' },
  jal_pink: { col: '#f4a7c0', shade: '#d77f9e' }, jal_purple: { col: '#b18ad8', shade: '#8d66b8' }, jal_teal: { col: '#5cc4b8', shade: '#3a9d92' },
  gold: { col: '#f4e3a8', shade: '#d4b96e' },
};
export const HEADS = { shemagh: '#c8202b', ghutra: '#f4f3ee', shayla: '#fbfaf4', bukhnag: '#1d1b22' };
export const UAE = { red: '#d0202f', green: '#119a4b', white: '#ffffff', black: '#16141c' };

// Safari < 16 has no roundRect
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2); this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath(); return this; };
}

function limb(c, a, len, w, col, end, cuff) {
  c.save(); c.rotate(a); c.fillStyle = col; c.strokeStyle = INK; c.lineWidth = 1.4;
  c.beginPath(); c.roundRect(-w / 2, 0, w, len, w / 2); c.fill(); c.stroke();
  if (cuff) { c.strokeStyle = 'rgba(120,110,90,.55)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-w / 2 + 1, len - 3); c.lineTo(w / 2 - 1, len - 3); c.stroke(); c.strokeStyle = INK; }
  if (end) end(c, len); c.restore();
}
const sandalFoot = (c, len) => {
  c.fillStyle = '#5a341c'; c.beginPath(); c.ellipse(2.2, len + 0.6, 5.4, 2, 0, 0, TAU); c.fill(); c.stroke();
  c.strokeStyle = '#a0643a'; c.lineWidth = 1.6; c.beginPath(); c.arc(2.5, len, 3, Math.PI * 1.05, Math.PI * 1.95); c.stroke(); c.strokeStyle = INK;
};
const hand = skin => (c, l) => { c.fillStyle = skin; c.beginPath(); c.arc(0, l + 1, 2.8, 0, TAU); c.fill(); c.stroke(); };
export function sandalShape(c) { // Baba's slipper
  c.fillStyle = '#8a4b25'; c.strokeStyle = INK; c.lineWidth = 1.4; c.beginPath(); c.roundRect(-3.5, -1, 7, 15, 3.5); c.fill(); c.stroke();
  c.strokeStyle = '#d19a5b'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-3, 4); c.lineTo(3, 6); c.stroke();
}

// person(c, x, y, ph, air, o): ph = stride phase (radians), air = in a jump.
// o: { s, skin, skinD, skinL, robe, robeD, girl, head: 'shemagh'|'ghutra'|'shayla'|'bukhnag', scarf, fringe, shaylaCol,
//      mouth: 'smile'|'o'|'talk'|'shout'|'tongue', angry, beard, belly, messy, agalTilt, still, arm: 'slipper'|'phone'|'flail'|'grip'|'hold'|'wave', t }
export function person(c, x, y, ph, air, o) {
  const t = o.t || 0, A = t * 7;
  c.save(); c.translate(x, y); if (o.rot) c.rotate(o.rot); c.scale(o.s || 1, o.s || 1); c.lineJoin = 'round'; c.lineCap = 'round';
  const sw = Math.sin(ph), still = o.still, run = !air && !still;
  if (run) { c.translate(0, -Math.abs(Math.sin(ph)) * 1.8); c.rotate(o.lean ?? 0.07); }
  const skin = o.skin, skinD = o.skinD, skinL = o.skinL || skin, robe = o.robe || '#fbfaf4', robeD = o.robeD || '#dcd8cb';
  c.save(); c.translate(-1, -20); limb(c, still ? 0.05 : air ? 0.75 : -sw * 0.85, 19, 4.4, skinD, sandalFoot); c.restore();
  c.save(); c.translate(1, -20); limb(c, still ? -0.05 : air ? -0.55 : sw * 0.85, 19, 4.4, skin, sandalFoot); c.restore();
  let ba = still ? 0.1 : air ? -2.3 : sw * 0.9;
  if (o.arm === 'flail') ba = 2.4 + Math.sin(A * 3 + 1) * 1.1; if (o.arm === 'grip') ba = -1.1; if (o.arm === 'hold') ba = 0.35;
  c.save(); c.translate(-1, -40); limb(c, ba, 15, 6, robeD, hand(skinD), 1); c.restore();
  // kandura / jalabiya: soft side shading, hem shadow, folds, collar, tassel (furakha) or gold embroidery
  const fl = Math.sin(ph * 2) * 2 * (still ? 0 : 1), b = o.belly || 0, fw = o.girl ? 2.2 : 0;
  const rg = c.createLinearGradient(-14, 0, 13 + b, 0); rg.addColorStop(0, robeD); rg.addColorStop(0.5, robe); rg.addColorStop(1, robe);
  const robePath = () => { c.beginPath(); c.moveTo(-8, -44); c.quadraticCurveTo(0, -47, 8, -44);
    c.quadraticCurveTo(10 + b * 0.6, -36, 10 + b, -28); c.quadraticCurveTo(13 + b + fw, -18, 12 + fw, -10 + fw * 0.6);
    c.lineTo(-13 - fl - fw, -9 + fw * 0.6); c.quadraticCurveTo(-12, -24, -9, -34); c.closePath(); };
  robePath(); c.fillStyle = rg; c.fill();
  c.save(); c.clip(); c.fillStyle = 'rgba(120,108,85,.16)'; c.fillRect(-20, -15, 40, 7);
  if (b) { c.fillStyle = 'rgba(120,108,85,.12)'; c.beginPath(); c.ellipse(6 + b, -24, 6, 9, 0, 0, TAU); c.fill(); }
  c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(0, -46, 5, 40);
  c.strokeStyle = 'rgba(150,140,120,.45)'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(-6, -13); c.quadraticCurveTo(-7.5, -26, -5, -40); c.moveTo(1 + fl * 0.4, -10); c.quadraticCurveTo(2, -20, 0, -30); c.stroke();
  c.restore();
  robePath(); c.strokeStyle = INK; c.lineWidth = 1.6; c.stroke();
  c.strokeStyle = '#cfc9ba'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-4, -44.5); c.quadraticCurveTo(2, -42.5, 7, -44.5); c.stroke();
  if (o.girl) { c.strokeStyle = '#d9a640'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(-12.6 - fl, -11.5); c.lineTo(11.8, -12.5); c.moveTo(-3, -44); c.lineTo(3, -38); c.lineTo(7, -44); c.stroke();
    c.fillStyle = '#d9a640'; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(-9 + k * 6, -15, 1, 0, TAU); c.fill(); } }
  else { c.beginPath(); c.moveTo(5, -43); c.quadraticCurveTo(6.5, -38, 6, -32 + Math.sin(ph) * 0.8); c.stroke(); c.fillStyle = '#c4bdac'; c.beginPath(); c.ellipse(6, -31, 1.5, 2.6, 0, 0, TAU); c.fill(); }
  // head: kids get a bigger head and big eyes
  const hs = o.hs || 1; c.save(); c.translate(2, -46); c.scale(hs, hs); c.translate(-2, 46);
  const hg = c.createRadialGradient(5, -55.5, 1, 2, -52, 10); hg.addColorStop(0, skinL); hg.addColorStop(0.55, skin); hg.addColorStop(1, skinD);
  c.fillStyle = hg; c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath(); c.arc(2, -52, 9, 0, TAU); c.fill(); c.stroke();
  if (o.beard) { const bg = c.createLinearGradient(0, -56, 0, -43); bg.addColorStop(0, '#3a261b'); bg.addColorStop(1, '#1c110b');
    c.fillStyle = bg; c.beginPath(); c.arc(2, -52, 9.6, -0.15, Math.PI * 0.75); c.quadraticCurveTo(0, -46, 4, -46.8); c.quadraticCurveTo(8, -47.6, 11.2, -52); c.closePath(); c.fill(); }
  else { c.fillStyle = 'rgba(240,110,110,.35)'; c.beginPath(); c.arc(6.2, -48.6, 2.3, 0, TAU); c.fill(); }
  c.strokeStyle = skinD; c.lineWidth = 1.2; c.beginPath(); c.moveTo(10.6, -52.4); c.quadraticCurveTo(12.4, -50.6, 10.5, -49.6); c.stroke();
  c.fillStyle = INK; c.strokeStyle = INK;
  const blink = o.blink && Math.sin(t * 1.7) > 0.97;
  if (blink) { c.lineWidth = 1.3; c.beginPath(); c.moveTo(5.5, -52); c.lineTo(8.8, -52); c.stroke(); }
  else if (o.bigEyes) { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(7.3, -52.6, 2.6, 3.1, 0, 0, TAU); c.fill(); c.lineWidth = 0.9; c.stroke();
    c.fillStyle = INK; c.beginPath(); c.arc(8, -52.3, 1.65, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(8.6, -53.1, 0.6, 0, TAU); c.fill();
    if (o.girl) { c.lineWidth = 1; c.beginPath(); c.moveTo(9.4, -55.2); c.lineTo(10.8, -56.6); c.moveTo(7.6, -55.7); c.lineTo(8.2, -57.3); c.stroke(); } }
  else { c.beginPath(); c.arc(7, -52, 1.5, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(7.5, -52.6, 0.45, 0, TAU); c.fill(); }
  c.fillStyle = INK; c.lineWidth = o.angry ? 2.3 : 1.6; c.beginPath();
  if (o.angry) { c.moveTo(3.6, -57.2); c.lineTo(10.2, -54.6); } else if (o.mouth === 'o') { c.moveTo(4.5, -56); c.quadraticCurveTo(7, -59, 10, -57.2); } else { c.moveTo(4.8, -56.6); c.quadraticCurveTo(7.5, -58.4, 10.2, -56.2); }
  c.stroke(); c.lineWidth = 1.5;
  if (o.mouth === 'shout') { c.fillStyle = '#5a1414'; c.beginPath(); c.ellipse(8.6, -47.4, 2.1, 2.7 + Math.sin(A * 3) * 0.6, 0, 0, TAU); c.fill(); c.fillStyle = '#d9505e'; c.beginPath(); c.ellipse(8.6, -46.2, 1.2, 0.8, 0, 0, TAU); c.fill(); }
  else if (o.mouth === 'talk') { c.beginPath(); c.moveTo(7, -47.4); c.lineTo(10, -47.4 + Math.sin(A * 2) * 0.8); c.stroke(); }
  else if (o.mouth === 'o') { c.fillStyle = '#5a1414'; c.beginPath(); c.ellipse(8.5, -47.4, 1.8, 2.4, 0, 0, TAU); c.fill(); }
  else if (o.mouth === 'tongue') { c.beginPath(); c.arc(7.6, -49, 2.6, 0.2, Math.PI - 0.6); c.stroke(); c.fillStyle = '#e8607a'; c.beginPath(); c.ellipse(9.5, -46.5, 1.9, 2.3, 0.3, 0, TAU); c.fill(); c.stroke(); }
  else { c.beginPath(); c.arc(7.6, -49.2, 2.7, 0.15, Math.PI - 0.55); c.stroke(); }
  if (o.beard) { c.fillStyle = '#1d120d'; c.beginPath(); c.moveTo(4.6, -49.4); c.quadraticCurveTo(8.4, -51.6, 11.8, -49.2); c.quadraticCurveTo(8.4, -48.3, 4.6, -49.4); c.fill(); }
  // headwear
  const wv = Math.sin(ph * 1.3) * 3 * (o.flap || 1), w2 = Math.cos(ph * 1.1) * 3 * (o.flap || 1), tipY = -45 + wv * 1.6 + (o.droop || 0);
  if (o.head === 'shayla' || o.head === 'bukhnag') { // headscarf wrapped round the face, falling over the shoulders
    const shp = () => { c.beginPath(); c.moveTo(9.6, -57); c.quadraticCurveTo(9, -65.5, 0, -65.5); c.quadraticCurveTo(-11.5, -64.5, -12.5, -52);
      c.quadraticCurveTo(-15 - wv * 0.5, -42, -17 - wv * 0.8, -35); c.quadraticCurveTo(-4, -33.5, 9, -38.5); c.quadraticCurveTo(7.5, -43, 5.8, -45.2);
      c.quadraticCurveTo(2, -46.5, 0.6, -50); c.quadraticCurveTo(1.6, -55.5, 9.6, -57); c.closePath(); };
    shp(); c.fillStyle = o.shaylaCol || (o.head === 'bukhnag' ? HEADS.bukhnag : HEADS.shayla); c.fill();
    c.save(); c.clip(); c.fillStyle = 'rgba(0,0,0,.16)'; c.fillRect(-20, -52, 14, 22); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-6, -63); c.quadraticCurveTo(2, -65, 8, -60); c.stroke(); c.restore();
    shp(); c.strokeStyle = INK; c.lineWidth = 1.6; c.stroke();
    if (o.head === 'bukhnag') { c.strokeStyle = '#e8b64a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(9.2, -56.6); c.quadraticCurveTo(1.8, -55.2, 1.2, -50); c.quadraticCurveTo(2.4, -46.6, 5.4, -45.4);
      c.moveTo(-16, -36.2); c.quadraticCurveTo(-4, -35, 8.2, -39.4); c.stroke();
      c.fillStyle = '#e8b64a'; for (const [dx, dy] of [[-8, -40], [-3, -39.5], [2, -40.6], [-11, -45], [-6, -46]]) { c.beginPath(); c.arc(dx, dy, 0.9, 0, TAU); c.fill(); } }
  } else { // shemagh (red) or ghutra (white) with the black agal
    const scarf = o.scarf || (o.head === 'ghutra' ? HEADS.ghutra : HEADS.shemagh);
    const scarfPath = () => { c.beginPath(); c.moveTo(10.5, -55); c.quadraticCurveTo(11, -63, 1, -63.5); c.quadraticCurveTo(-9, -63, -11, -54);
      c.quadraticCurveTo(-14, -46, -15, -38); c.quadraticCurveTo(-24, -40 + wv, -33, tipY); c.quadraticCurveTo(-22, -49 + w2, -10, -46); c.quadraticCurveTo(-5, -48, -4, -52); c.quadraticCurveTo(3, -57.5, 10.5, -55); c.closePath(); };
    scarfPath(); c.fillStyle = scarf; c.fill();
    c.save(); c.clip(); c.fillStyle = 'rgba(40,10,10,.16)'; c.fillRect(-40, -50, 34, 16); c.fillRect(-14, -64, 4, 30);
    c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-6, -61.5); c.quadraticCurveTo(2, -63.4, 8.5, -60); c.stroke(); c.restore();
    scarfPath(); c.strokeStyle = INK; c.lineWidth = 1.6; c.stroke();
    c.strokeStyle = o.fringe || '#f2ece4'; c.lineWidth = 1.1; c.beginPath();
    for (let k = 0; k < 4; k++) { const fx = -33 + k * 2.4, fy = tipY - 1.2 + k * 1.7; c.moveTo(fx, fy); c.lineTo(fx - 3.6, fy + 2.2 + Math.sin(ph * 2 + k) * 0.8); }
    c.stroke();
    if (o.messy) { c.fillStyle = scarf; c.strokeStyle = INK; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(-3, -63); c.quadraticCurveTo(-9, -71 + w2, -14, -69); c.quadraticCurveTo(-9, -64, -7, -61); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(4, -57); c.quadraticCurveTo(12, -58, 13, -51 + wv * 0.3); c.quadraticCurveTo(9, -54, 6, -55); c.closePath(); c.fill(); c.stroke(); }
    const at = o.agalTilt || 0, ay = -60.5 + (o.agalY || 0);
    c.strokeStyle = '#121212'; c.lineWidth = 2.4; c.beginPath(); c.ellipse(0, ay, 10.6, 2.6, at, 0, TAU); c.stroke();
    c.lineWidth = 1.1; c.beginPath(); c.ellipse(0, ay + 2.3, 10.4, 2.3, at, 0.15, Math.PI - 0.15); c.stroke();
    const tx = -9.6, ty = ay + 2 - Math.sin(at) * 9; c.lineWidth = 1.2; c.fillStyle = '#121212'; c.beginPath();
    c.moveTo(tx, ty); c.quadraticCurveTo(tx - 3, ty + 6, tx - 4, ty + 12); c.moveTo(tx + 1, ty); c.quadraticCurveTo(tx - 1, ty + 6, tx - 1.5, ty + 13); c.stroke();
    c.beginPath(); c.arc(tx - 4, ty + 12.5, 1.1, 0, TAU); c.arc(tx - 1.5, ty + 13.5, 1.1, 0, TAU); c.fill();
  }
  c.restore();
  // front arm
  c.save(); c.translate(2, -41);
  const fa = o.arm;
  if (fa === 'slipper') limb(c, 2.8 + Math.sin(A * 2) * 0.28, 17, 6, robe, (c, l) => { hand(skin)(c, l); c.save(); c.translate(0, l + 2); c.rotate(-0.35 + Math.sin(A * 2) * 0.2); sandalShape(c); c.restore(); }, 1);
  else if (fa === 'phone') limb(c, -2.85, 13, 6, robe, (c, l) => { c.fillStyle = '#222'; c.beginPath(); c.roundRect(-3, l - 3, 6, 10, 1.5); c.fill(); hand(skin)(c, l); }, 1);
  else if (fa === 'wave') limb(c, -2.9 + Math.sin(A * 1.5) * 0.35, 15, 6, robe, hand(skin), 1);
  else if (fa === 'flail') limb(c, -2.6 + Math.sin(A * 3) * 1.2, 15, 6, robe, hand(skin), 1);
  else if (fa === 'grip') limb(c, -1.25, 15, 6, robe, hand(skin), 1);
  else if (fa === 'hold') limb(c, -3.0, 15, 6, robe, hand(skin), 1);
  else if (fa === 'fist') limb(c, -1.5, 15, 6, robe, (c, l) => { // the falconer's arm: level, with the padded cuff (mangalah) the falcon stands on
    hand(skin)(c, l); c.fillStyle = o.cuff || '#1d6a8f'; c.beginPath(); c.roundRect(-4.2, l - 8, 8.4, 9.5, 3); c.fill(); c.stroke();
    c.strokeStyle = '#fffaf0'; c.lineWidth = 1; c.beginPath(); c.moveTo(-4, l - 5); c.lineTo(4, l - 5); c.moveTo(-4, l - 2); c.lineTo(4, l - 2); c.stroke(); c.strokeStyle = INK; }, 1);
  else limb(c, still ? -0.1 : air ? -2.6 : -sw * 0.9, 15, 6, robe, hand(skin), 1);
  c.restore(); c.restore();
}
// presets: the canonical looks
export const ABOOD = (robe = 'white', head = 'shemagh') => ({ ...SKIN.abood, robe: ROBES[robe].col, robeD: ROBES[robe].shade, head, hs: 1.12, bigEyes: 1, blink: 1 });
export const MOZAH = (robe = 'jal_pink', head = 'bukhnag') => ({ ...SKIN.abood, robe: ROBES[robe].col, robeD: ROBES[robe].shade, head, girl: 1, hs: 1.12, bigEyes: 1, blink: 1 });
export const BABA = () => ({ ...SKIN.baba, s: 1.38, head: 'ghutra', fringe: '#dcd8cc', lean: 0.11, beard: 1, belly: 4, messy: 1, agalTilt: 0.32, agalY: -1, flap: 1.8, droop: 6 });

export function uaeFlag(c, x, y, w, h, lw = 0.7) {
  c.fillStyle = UAE.red; c.fillRect(x, y, w * 0.27, h);
  c.fillStyle = UAE.green; c.fillRect(x + w * 0.27, y, w * 0.73, h / 3);
  c.fillStyle = UAE.white; c.fillRect(x + w * 0.27, y + h / 3, w * 0.73, h / 3);
  c.fillStyle = UAE.black; c.fillRect(x + w * 0.27, y + 2 * h / 3, w * 0.73, h / 3);
  c.strokeStyle = INK; c.lineWidth = lw; c.strokeRect(x, y, w, h);
}
export function drawCoin(c, x, y, r = 10) {
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r); g.addColorStop(0, '#fff0b0'); g.addColorStop(0.58, '#e0a72a'); g.addColorStop(1, '#a8700e');
  c.fillStyle = g; c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(120,74,8,.45)'; c.lineWidth = 1; c.beginPath(); c.arc(x, y, r * 0.65, 0, TAU); c.stroke();
}
export function drawSweet(c, x, y, r = 7, col = '#e8572b') { // a wrapped sweet, the family pickup
  c.save(); c.translate(x, y); c.fillStyle = col; c.strokeStyle = INK; c.lineWidth = 1.4;
  c.beginPath(); c.ellipse(0, 0, r, r * 0.8, 0, 0, TAU); c.fill(); c.stroke();
  for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * r * 0.9, 0); c.lineTo(sd * r * 1.6, -r * 0.6); c.lineTo(sd * r * 1.6, r * 0.6); c.closePath(); c.fill(); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(-r * 0.3, -r * 0.3, r * 0.3, r * 0.2, -0.6, 0, TAU); c.fill(); c.restore();
}
// text helper: the game font, with the right direction for the current language
export function label(c, text, x, y, size = 14, weight = 800, col = INK, align = 'center') {
  c.font = `${weight} ${size}px ${FONT}`; c.textAlign = align; c.textBaseline = 'middle'; c.direction = lang() === 'ar' ? 'rtl' : 'ltr'; c.fillStyle = col; c.fillText(text, x, y);
}
// the menu / results avatar box: a warm backdrop with the chosen character standing in it
export function avatarScene(cv, who, t = 0, mood = 'smile') {
  const c = cv.getContext('2d'), W = cv.width, H = cv.height;
  c.clearRect(0, 0, W, H);
  const dark = document.documentElement.dataset.world === 'station';
  const g = c.createRadialGradient(W / 2, H * 0.4, 10, W / 2, H * 0.5, W * 0.7);
  g.addColorStop(0, dark ? '#4a3a8f' : '#fff6df'); g.addColorStop(1, dark ? '#171236' : '#f0d9a8'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.fillStyle = 'rgba(0,0,0,.12)'; c.beginPath(); c.ellipse(W / 2, H * 0.93, W * 0.2, H * 0.035, 0, 0, TAU); c.fill();
  const o = Object.assign(who === 'mozah' ? MOZAH() : who === 'baba' ? BABA() : ABOOD(), { still: 1, t, mouth: mood, arm: 'wave' });
  o.s = (H / 100) * (who === 'baba' ? 0.8 : 1.05); // ~80 units tall incl. the bigger head: fits with air above
  person(c, W / 2 + 4, H * 0.93, t * 2, false, o);
}
