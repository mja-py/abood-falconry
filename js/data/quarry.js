// What the falcon hunts in the open desert, from easiest to hardest. Numbers only; the behaviour is in sim/hunt-sim.js.
// speed: units per second when fleeing · alert: how close the truck / the falcon may come before it bolts
// jink: how sharply it turns away at the last moment · wind: seconds of flight before it has tired
// value: points for a catch · meat: meals it gives · level: the falconer level at which it appears · quota: most per outing
export const QUARRY = {
  hare:       { id: 'hare',       air: false, speed: 178, alert: [240, 330], jink: 0.7, wind: 14, value: 40,  meat: 2, level: 1, ring: [700, 2500],  groups: 7, flock: 1, cover: true },
  sandgrouse: { id: 'sandgrouse', air: true,  speed: 214, alert: [300, 380], jink: 0.9, wind: 20, value: 60,  meat: 1, level: 1, ring: [1100, 2600], groups: 3, flock: 4 },
  houbara:    { id: 'houbara',    air: true,  speed: 236, alert: [340, 430], jink: 1.1, wind: 18, value: 200, meat: 3, level: 3, ring: [2900, 4200], groups: 3, flock: 1, quota: 2, runs: 2, breaks: true },
};
export const QUARRY_IDS = Object.keys(QUARRY);
