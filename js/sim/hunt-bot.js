// A player for hunt-sim, used by tests, the balance tool and the in-browser autopilot. skill 0 is a small child who
// steers roughly and forgets the button; 1 is a practised hand. It never touches the world's own random stream.
import { mulberry } from './rng.js';
import { alive, allowed, CAST_R } from './hunt-sim.js';
import { QUARRY } from '../data/quarry.js';

export function makeBot(skill = 0.6, seed = 1) {
  const r = mulberry(seed * 7919 + Math.round(skill * 1000)); let wob = 0, wobT = 0, pick = -1;
  const toward = (from, x, y, m = 1) => { const a = Math.atan2(y - from.y, x - from.x) + wob; return { jx: Math.cos(a) * m, jy: Math.sin(a) * m }; };
  return function pilot(w) {
    const it = { jx: 0, jy: 0, act: false, end: false }, f = w.fal, t = w.truck;
    const first = w.lesson && !w.caught && w.quarry[0] && allowed(w, w.quarry[0]) ? w.quarry[0] : null;   // in the lesson, follow Baba's arrow
    wobT -= 1 / 60; if (wobT <= 0) { wobT = 0.3 + r() * 0.5; wob = (r() - 0.5) * 1.5 * (1 - skill); }
    if (f.mode === 'fly') {
      let q = first || w.quarry[pick]; if (!q || !allowed(w, q)) { q = null; let bd = 1e12; for (const c of w.quarry) { if (!allowed(w, c) || c.state === 'idle' && Math.hypot(c.x - f.x, c.y - f.y) > 500) continue; const d = (c.x - f.x) ** 2 + (c.y - f.y) ** 2; if (d < bd) { bd = d; q = c; } } pick = q ? q.id : -1; }
      if (!q || Math.hypot(q.x - f.x, q.y - f.y) > 1500 || w.energy < 0.12 && Math.hypot(q.x - f.x, q.y - f.y) > 300) return Object.assign(it, toward(f, t.x, t.y));   // nothing to chase: back to the glove
      const d = Math.hypot(q.x - f.x, q.y - f.y), lead = skill * Math.min(1.2, d / Math.max(120, f.v));                                                        // aim where it will be
      Object.assign(it, toward(f, q.x + Math.cos(q.ang) * q.v * lead, q.y + Math.sin(q.ang) * q.v * lead));
      it.act = d < 230 && d > 40 && r() < 0.05 + skill * 0.5;
      return it;
    }
    if (f.mode === 'bind' || f.mode === 'down') return Object.assign(it, toward(t, f.x, f.y));
    // on the fist: drive to the nearest quarry and cast from a distance
    let q = null, bd = 1e12; for (const c of w.quarry) { if (!allowed(w, c)) continue; const d = (c.x - t.x) ** 2 + (c.y - t.y) ** 2; if (d < bd) { bd = d; q = c; } }
    if (first) { q = first; bd = (q.x - t.x) ** 2 + (q.y - t.y) ** 2; }
    if (!q || w.energy < 0.1) { it.end = true; return it; }
    pick = q.id;
    if (w.near >= 0) { const d = Math.sqrt(bd), stop = QUARRY[q.kind].alert[0] + 60 + (1 - skill) * 150; if (d < Math.max(stop, CAST_R - 120) || q.state === 'flee') it.act = r() < 0.2 + skill * 0.8; }
    return Object.assign(it, toward(t, q.x, q.y));
  };
}
// a child who drags and presses at random. The first lesson must still end in a catch.
export function makeMasher(seed = 1) {
  const r = mulberry(seed * 104729); let a = 0, n = 0;
  return () => { if (n-- <= 0) { a = r() * Math.PI * 2; n = 20 + r() * 60; } return { jx: Math.cos(a), jy: Math.sin(a), act: r() < 0.05, end: false }; };
}
export { alive };
