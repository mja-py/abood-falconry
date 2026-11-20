// What the falcon flies at, from the training lure to real quarry. Numbers only; the behaviour code is in sim/hunt-sim.js.
// speed in field units per second · alt = cruising height range · jink = how much it can spoil a strike (0–1)
// flush = how close the falconer may walk before it bolts on its own · react = seconds it takes to get moving
// wind = seconds of hard flight before it has tired fully · value = the points one catch is worth · tier 0 cannot fail (the family rule for the easiest level)
export const QUARRY = {
  lure:       { id: 'lure',       air: true,  speed: 150, alt: [95, 130], size: 10, jink: 0,    flush: 0,   react: 0.2,  value: 12, tier: 0 },
  hare:       { id: 'hare',       air: false, speed: 180, alt: [0, 0],    size: 45, jink: 0.35, flush: 120, react: 0.35, value: 40, tier: 1, cover: true, breaks: true, wind: 16 },
  sandgrouse: { id: 'sandgrouse', air: true,  speed: 222, alt: [45, 105], size: 15, jink: 0.45, flush: 170, react: 0.25, value: 60, tier: 2, wind: 22 },
};
export const QUARRY_IDS = Object.keys(QUARRY);
