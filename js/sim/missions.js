// The family's mission staples on this game's numbers: an endless ladder of three-mission sets, three daily missions,
// tiered badges and the seven-day login gift. A mission is "raise one of the save's counters by N from where it stood".
// Dirham amounts are about a hundred times the other Abood games, like everything else here.
import { hash32 } from './rng.js';

export const KINDS = { // counter in save.stats → the base goal at ladder level 1
  catches: 4, flights: 9, perfect: 3, clean: 2, trains: 3, hunts: 3, quizRight: 4, fed: 3, hare: 3, sandgrouse: 2, outings: 5,
};
const LADDER_ORDER = [['trains', 'flights', 'fed'], ['catches', 'perfect', 'quizRight'], ['hunts', 'hare', 'clean'], ['outings', 'catches', 'trains'], ['flights', 'sandgrouse', 'perfect'], ['hunts', 'quizRight', 'clean']];
export const MULT_STEP = 0.1, MULT_MAX = 2.5, GIRL_MISSIONS = 10;
export const ladderReward = lv => 200 + 100 * lv;
export const DAILY_REWARD = 120, DAILY_ALL = 200;
const DAILY_POOL = ['catches', 'flights', 'perfect', 'trains', 'quizRight', 'fed', 'outings', 'clean'];
const item = (s, k, goal) => ({ k, goal, from: s.stats[k] || 0 });
export const progress = (s, m) => Math.max(0, Math.min(m.goal, (s.stats[m.k] || 0) - m.from));
export const done = (s, m) => progress(s, m) >= m.goal;

export function ladderSet(s) {
  if (!s.ladder.set) { const lv = s.ladder.lv, kinds = LADDER_ORDER[(lv - 1) % LADDER_ORDER.length]; s.ladder.set = kinds.map(k => item(s, k, Math.max(1, Math.round(KINDS[k] * (1 + 0.3 * (lv - 1)))))); }
  return s.ladder.set;
}
// a finished set raises the level at the end of an outing: more dirhams per point from then on
export function settleLadder(s) {
  const set = ladderSet(s); if (!set.every(m => done(s, m))) return null;
  const reward = ladderReward(s.ladder.lv); s.coins += reward; s.ladder.lv++; s.ladder.set = null; s.missionsDone += 3; ladderSet(s);
  return { reward, lv: s.ladder.lv };
}
// three missions for the given calendar day ('2027-01-05'); yesterday's finished-but-unclaimed ones pay automatically
export function dailyList(s, day) {
  if (s.daily.day !== day) {
    let paid = 0; for (const m of s.daily.list) if (!m.claimed && done(s, m)) { paid += DAILY_REWARD; s.missionsDone++; }
    s.coins += paid;
    const h = hash32(s.seed + ':' + day), pool = DAILY_POOL.slice(), list = [];
    for (let i = 0; i < 3; i++) { const k = pool.splice((h >>> (i * 5)) % pool.length, 1)[0]; list.push(Object.assign(item(s, k, Math.max(1, Math.round(KINDS[k] * 0.6))), { claimed: 0 })); }
    s.daily = { day, list, all: 0 };
  }
  return s.daily.list;
}
export function claimDaily(s, i) {
  const m = s.daily.list[i]; if (!m || m.claimed || !done(s, m)) return 0;
  m.claimed = 1; s.missionsDone++; let pay = DAILY_REWARD;
  if (!s.daily.all && s.daily.list.every(x => x.claimed)) { s.daily.all = 1; pay += DAILY_ALL; }
  s.coins += pay; return pay;
}
export const claimable = s => s.daily.list.some(m => !m.claimed && done(s, m));
export const girlOpen = s => s.missionsDone >= GIRL_MISSIONS;

// badges: bronze, silver, gold at ×10 the goal and ×10 the reward
export const BADGES = [
  { id: 'catches', stat: 'catches', goal: 10 }, { id: 'flights', stat: 'flights', goal: 30 }, { id: 'perfect', stat: 'perfect', goal: 10 }, { id: 'clean', stat: 'clean', goal: 5 },
  { id: 'trains', stat: 'trains', goal: 10 }, { id: 'quiz', stat: 'quizRight', goal: 10 }, { id: 'chicks', stat: 'chicks', goal: 1 }, { id: 'fed', stat: 'fed', goal: 10 },
  { id: 'hare', stat: 'hare', goal: 10 }, { id: 'weeks', stat: 'weeks', goal: 48 },
];
export const TIER_REWARD = [100, 1000, 10000];
export const tierOf = (s, b) => { const v = s.stats[b.stat] || 0; return v >= b.goal * 100 ? 3 : v >= b.goal * 10 ? 2 : v >= b.goal ? 1 : 0; };
// newly earned tiers are paid at the end of an outing and shown as chips on the results card
export function settleBadges(s) {
  const out = [];
  for (const b of BADGES) { const have = s.badges[b.id] || 0, now = tierOf(s, b); for (let t = have; t < now; t++) { s.coins += TIER_REWARD[t]; out.push({ id: b.id, tier: t, reward: TIER_REWARD[t] }); } if (now > have) s.badges[b.id] = now; }
  return out;
}
// the seven-day login gift: food for the falcon, never birds or genes. → the day index to claim (0–6), or -1 when taken today
export const LOGIN = [1, 1, 2, 2, 3, 3, 5];
export function loginDay(s, today, yesterday) { return s.login.day === today ? -1 : s.login.day === yesterday ? s.login.streak % 7 : 0; }
export function claimLogin(s, today, yesterday) { const i = loginDay(s, today, yesterday); if (i < 0) return 0; s.login = { day: today, streak: i + 1 }; s.food += LOGIN[i]; return LOGIN[i]; }
