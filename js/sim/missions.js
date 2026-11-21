// The family's mission ladder on this game's loop: three goals at a time, each "raise one of the save's counters by N".
// A finished set pays and makes every point worth a little more. Badges mark the long totals. Mozah joins at ten missions.
export const KINDS = { catches: 4, hare: 3, sandgrouse: 2, houbara: 1, hunts: 3, flights: 8, fed: 4, enhanced: 2, sold: 1, chicks: 1 };   // counter → goal at level 1
const ORDER = [['catches', 'fed', 'enhanced'], ['hare', 'hunts', 'chicks'], ['sandgrouse', 'flights', 'sold'], ['catches', 'enhanced', 'hunts'], ['hare', 'fed', 'chicks'], ['sandgrouse', 'sold', 'enhanced'], ['houbara', 'catches', 'chicks']];
export const MULT_STEP = 0.1, MULT_MAX = 2.5, GIRL_MISSIONS = 10;
export const ladderReward = lv => 150 + 75 * lv;
const item = (s, k, goal) => ({ k, goal, from: s.stats[k] || 0 });
export const progress = (s, m) => Math.max(0, Math.min(m.goal, (s.stats[m.k] || 0) - m.from));
export const done = (s, m) => progress(s, m) >= m.goal;
const grows = k => k !== 'sold' && k !== 'chicks' && k !== 'houbara';
export function ladderSet(s) {
  if (!s.ladder.set) { const lv = s.ladder.lv; let kinds = ORDER[(lv - 1) % ORDER.length]; if (lv < 7) kinds = kinds.map(k => (k === 'houbara' ? 'catches' : k));
    s.ladder.set = kinds.map(k => item(s, k, Math.max(1, Math.round(KINDS[k] * (grows(k) ? 1 + 0.25 * (lv - 1) : 1 + Math.floor((lv - 1) / 7)))))); }
  return s.ladder.set;
}
// a finished set raises the level: more dirhams per point from then on
export function settleLadder(s) {
  const set = ladderSet(s); if (!set.every(m => done(s, m))) return null;
  const reward = ladderReward(s.ladder.lv); s.coins += reward; s.ladder.lv++; s.ladder.set = null; s.missionsDone += 3; ladderSet(s);
  return { reward, lv: s.ladder.lv };
}
export const girlOpen = s => s.missionsDone >= GIRL_MISSIONS;
// badges: bronze, silver, gold at ×10 the goal and ×10 the reward
export const BADGES = [{ id: 'catches', stat: 'catches', goal: 10 }, { id: 'hare', stat: 'hare', goal: 10 }, { id: 'sandgrouse', stat: 'sandgrouse', goal: 10 }, { id: 'houbara', stat: 'houbara', goal: 5 },
  { id: 'hunts', stat: 'hunts', goal: 10 }, { id: 'fed', stat: 'fed', goal: 10 }, { id: 'enhanced', stat: 'enhanced', goal: 5 }, { id: 'chicks', stat: 'chicks', goal: 3 }, { id: 'sold', stat: 'sold', goal: 3 }];
export const TIER_REWARD = [100, 1000, 10000];
export const tierOf = (s, b) => { const v = s.stats[b.stat] || 0; return v >= b.goal * 100 ? 3 : v >= b.goal * 10 ? 2 : v >= b.goal ? 1 : 0; };
export function settleBadges(s) {
  const out = [];
  for (const b of BADGES) { const have = s.badges[b.id] || 0, now = tierOf(s, b); for (let t = have; t < now; t++) { s.coins += TIER_REWARD[t]; out.push({ id: b.id, tier: t, reward: TIER_REWARD[t] }); } if (now > have) s.badges[b.id] = now; }
  return out;
}
