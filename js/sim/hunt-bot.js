// A pilot for hunt-sim, used by tests, the balance tool and the in-browser autopilot. skill 0 = a small child tapping
// more or less at the right moment, 1 = a practised hand. It never touches the world's own random stream.
import { mulberry } from './rng.js';
import { CEIL } from './hunt-sim.js';

export function makeBot(skill = 0.6, seed = 1) {
  const r = mulberry(seed * 7919 + Math.round(skill * 1000)); let castAt = -1, pressAt = -1, spotWait = -1, flight = 0;
  const slop = () => (r() - 0.5) * 2 * (1 - skill);                 // −1 … 1, scaled down with skill
  return function pilot(w) {
    if (w.flight !== flight) { flight = w.flight; castAt = pressAt = spotWait = -1; }
    const it = { ty: null, act: false, hold: false };
    if (w.phase === 'scout') { if (w.q.spotted) { if (spotWait < 0) spotWait = w.t + 0.25 + (1 - skill) * 1.2 * r(); if (w.t >= spotWait) it.act = true; } }
    else if (w.phase === 'cast') { if (castAt < 0) castAt = 0.9 + slop() * 0.35; if (w.cast.dirn > 0 && w.cast.m >= Math.min(0.98, Math.max(0.3, castAt))) it.act = true; }
    else if (w.phase === 'chase') {
      const gap = w.q.x - w.fal.x;
      const dy = w.fal.y - w.q.y, need = 50 + 60 * skill;                    // a practised hand waits for real height
      it.ty = Math.min(1, (w.q.y + (gap > 300 ? 50 : 125)) / CEIL);         // stay low to close, then get above
      it.hold = gap > 300 && w.fal.energy > 0.55;
      if (w.can === 'stoop' && (dy >= need || w.fal.energy < 0.35)) it.act = true; else if (w.can === 'grab' && (skill < 0.5 || w.fal.energy < 0.3)) it.act = true;
      pressAt = -1;
    } else if (w.phase === 'strike') {
      if (pressAt < 0) pressAt = w.st.T + slop() * 0.22;
      if (w.st.t >= pressAt) it.act = true;
    } else if (w.phase === 'recall') it.act = w.pt > 0.4;
    return it;
  };
}
// a pilot that presses and drags at random: what a toddler does. The easiest tier must still end in a catch.
export function makeMasher(seed = 1) {
  const r = mulberry(seed * 104729);
  return () => ({ ty: r() < 0.1 ? r() : null, act: r() < 0.04, hold: r() < 0.3 });
}
