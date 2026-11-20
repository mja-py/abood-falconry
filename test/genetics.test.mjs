import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry, stream, hash32 } from '../js/sim/rng.js';
import { founder, cross, pack, unpack, copies, shows, mutate, isPure, typeOf, PACKED_LENGTH, NQ } from '../js/sim/genome.js';
import { potential, effective, points, colourOf, appearance, appKey, superWhite } from '../js/sim/phenotype.js';
import { kinship, coi, prune, tree } from '../js/sim/pedigree.js';
import { layClutch, odds, fertilityOf } from '../js/sim/breed.js';
import { TRAITS, COLOURS } from '../js/data/loci.js';

const near = (got, want, tol, msg) => assert.ok(Math.abs(got - want) <= tol, `${msg}: got ${got}, want ${want} ± ${tol}`);

test('rng: same seed, same numbers; named streams differ', () => {
  const a = mulberry(7), b = mulberry(7); for (let i = 0; i < 20; i++) assert.equal(a(), b());
  assert.notEqual(stream('s', 'breed', 1)(), stream('s', 'breed', 2)());
  assert.equal(hash32('abc'), hash32('abc'));
});

test('genome: pack and unpack round trip for many founders and crosses', () => {
  const rng = mulberry(11);
  for (let i = 0; i < 300; i++) {
    const sp = ['saker', 'peregrine', 'gyr', 'wakri'][i % 4];
    const s = founder(rng, { species: sp, sex: 'm', source: 'good', rareFreq: { barq: 0.5, ain: 0.5, shihab: 0.5 } });
    const d = founder(rng, { species: ['saker', 'gyr'][i % 2], sex: 'f', rareFreq: { barq: 0.5, ain: 0.5 } });
    for (const g of [s, d, cross(s, d, rng)]) { const t = pack(g); assert.equal(t.length, PACKED_LENGTH); assert.deepEqual(unpack(t), g); }
  }
  assert.equal(unpack('nonsense'), null);
});

test('genome: a recessive gene follows Mendel (carrier × carrier → 1 : 2 : 1)', () => {
  const rng = mulberry(3), s = founder(rng, { species: 'saker', sex: 'm', rare: { barq: 1 } }), d = founder(rng, { species: 'saker', sex: 'f', rare: { barq: 1 } });
  const n = 10000, seen = [0, 0, 0]; let hens = 0;
  for (let i = 0; i < n; i++) { const c = cross(s, d, rng); seen[copies(c, 'barq')]++; if (c.sex === 'f') hens++; }
  near(seen[0] / n, 0.25, 0.02, 'no copies'); near(seen[1] / n, 0.5, 0.02, 'carriers'); near(seen[2] / n, 0.25, 0.02, 'two copies');
  near(hens / n, 0.5, 0.02, 'hens');
});

test('genome: a Z-linked gene shows in daughters with one copy and needs two in sons', () => {
  const rng = mulberry(5);
  const sire = founder(rng, { species: 'saker', sex: 'm', rare: { ain: 1 } }), plainDam = founder(rng, { species: 'saker', sex: 'f' });
  let showF = 0, showM = 0, f = 0, m = 0;
  for (let i = 0; i < 8000; i++) { const c = cross(sire, plainDam, rng); if (c.sex === 'f') { f++; showF += shows(c, 'ain'); assert.equal(c.h[1].r[2], 0); } else { m++; showM += shows(c, 'ain'); } }
  near(showF / f, 0.5, 0.03, 'daughters showing'); assert.equal(showM, 0, 'sons of a plain hen never show it');
  const hen = founder(rng, { species: 'saker', sex: 'f', rare: { ain: 1 } }); assert.equal(shows(hen, 'ain'), 1);
  const plainSire = founder(rng, { species: 'saker', sex: 'm' });
  for (let i = 0; i < 400; i++) { const c = cross(plainSire, hen, rng); if (c.sex === 'm') assert.equal(copies(c, 'ain'), 1, 'every son of a showing hen carries'); else assert.equal(copies(c, 'ain'), 0); }
});

test('genome: colour is a dominance series and ancestry mixes', () => {
  const rng = mulberry(9);
  const dark = founder(rng, { species: 'saker', sex: 'm', colour: ['adham', 'abyad'] }), white = founder(rng, { species: 'saker', sex: 'f', colour: ['abyad', 'abyad'] });
  assert.equal(colourOf(dark), 'adham'); assert.equal(colourOf(white), 'abyad');
  let w = 0; for (let i = 0; i < 4000; i++) if (colourOf(cross(dark, white, rng)) === 'abyad') w++;
  near(w / 4000, 0.5, 0.03, 'white chicks from a carrier × white');
  const gyr = founder(rng, { species: 'gyr', sex: 'm' }), f1 = cross(gyr, white, rng);
  assert.deepEqual(f1.anc, [8, 0, 8, 0]); assert.equal(f1.hy, 16); assert.equal(isPure(f1), false); assert.equal(typeOf(f1), 'gyr_saker');
  const f2 = cross(f1, f1.sex === 'm' ? white : gyr, rng); assert.equal(f2.anc.reduce((a, b) => a + b, 0), 16);
});

test('phenotype: more plus beads never lower a stat; hybrids are hardier; inbreeding costs hardiness', () => {
  const rng = mulberry(21);
  for (let i = 0; i < 200; i++) {
    const g = founder(rng, { species: 'saker', sex: 'f' }), before = potential(g), k = Math.floor(rng() * NQ);
    if (g.h[0].q[k] === 0) { g.h[0].q[k] = 1; const after = potential(g), name = TRAITS[Math.floor(k / 4)]; assert.ok(after[name] >= before[name]); }
  }
  const gyr = founder(mulberry(1), { species: 'gyr', sex: 'f', plus: 0.3 }), sak = founder(mulberry(2), { species: 'saker', sex: 'm', plus: 0.3 });
  let pure = 0, hyb = 0; const r = mulberry(4);
  for (let i = 0; i < 300; i++) { hyb += potential(cross(sak, gyr, r)).hardy; pure += potential(founder(r, { species: 'gyr', plus: 0.3 })).hardy; }
  assert.ok(hyb > pure, 'gyr hybrids are hardier than pure gyrs');
  const g = founder(mulberry(8), { species: 'saker', sex: 'f' });
  assert.ok(potential(g, 0.25).hardy < potential(g, 0).hardy);
  const male = { ...g, sex: 'm' }; assert.ok(potential(male).size < potential(g).size, 'the tiercel is smaller');
});

test('phenotype: rare genes change the bird; appearance is deterministic', () => {
  const rng = mulberry(31), plain = founder(rng, { species: 'saker', sex: 'm' }), fast = JSON.parse(JSON.stringify(plain));
  fast.h[0].r[0] = fast.h[1].r[0] = 1;
  assert.ok(effective(fast, 0).speed > effective(plain, 0).speed);
  assert.equal(effective(plain, 0).flags.window, 1);
  const a = appearance(plain, 100), b = appearance(unpack(pack(plain)), 100);
  assert.equal(appKey(a), appKey(b));
  const sw = founder(rng, { species: 'gyr', sex: 'f', colour: ['abyad', 'abyad'], rare: { thalj: 2 } }); assert.equal(superWhite(sw), true); assert.equal(appearance(sw).density, 0);
  assert.ok(effective(plain, 0, { tr: { speed: 1 } }).speed > effective(plain, 0, { tr: { speed: 0 } }).speed, 'training raises a stat');
  assert.ok(points(plain, 'speed') >= 0 && points(plain, 'speed') <= 20);
});

test('pedigree: textbook inbreeding coefficients', () => {
  const ped = new Map([[1, { s: 0, d: 0, F: 0 }], [2, { s: 0, d: 0, F: 0 }], [3, { s: 1, d: 2, F: 0 }], [4, { s: 1, d: 2, F: 0 }], [5, { s: 0, d: 0, F: 0 }], [6, { s: 1, d: 5, F: 0 }]]);
  assert.equal(coi(ped, 3, 4), 0.25, 'full siblings'); assert.equal(coi(ped, 1, 3), 0.25, 'parent and offspring');
  assert.equal(coi(ped, 3, 6), 0.125, 'half siblings'); assert.equal(coi(ped, 2, 5), 0, 'unrelated founders');
  ped.set(7, { s: 3, d: 4, F: 0.25 }); assert.equal(kinship(ped, 7, 7), 0.625);
  assert.deepEqual(tree(ped, 7, 2), [[7], [3, 4], [1, 2, 1, 2]]);
  const kept = prune(ped, [7], 1); assert.deepEqual([...kept.keys()].sort(), [3, 4, 7]);
});

test('breeding: the odds shown match the eggs laid', () => {
  const rng = mulberry(77);
  const s = founder(rng, { species: 'saker', sex: 'm', rare: { barq: 1, shihab: 1 }, colour: ['ahmar', 'abyad'] });
  const d = founder(rng, { species: 'saker', sex: 'f', rare: { barq: 1 }, colour: ['ashgar', 'abyad'] });
  const o = odds(s, d), n = 12000, seen = { barq: 0, shihab: 0, white: 0, speed: 0 };
  for (let i = 0; i < n; i++) { const c = cross(s, d, rng); if (shows(c, 'barq') === 1) seen.barq++; if (shows(c, 'shihab') > 0) seen.shihab++; if (colourOf(c) === 'abyad') seen.white++; seen.speed += points(c, 'speed'); }
  near(seen.barq / n, o.rare.barq.shows, 0.02, 'barq'); assert.equal(o.rare.barq.shows, 0.25); assert.deepEqual([...o.rare.barq.grid].sort(), [0, 1, 1, 2]);
  near(seen.shihab / n, o.rare.shihab.shows, 0.02, 'shihab'); near(seen.white / n, o.colour.abyad, 0.02, 'white');
  near(seen.speed / n, o.traits.speed.mean, 0.15, 'mean speed points');
  assert.ok(o.traits.speed.min <= o.traits.speed.lo && o.traits.speed.hi <= o.traits.speed.max);
  near(Object.values(o.colour).reduce((a, b) => a + b, 0), 1, 1e-9, 'colour odds sum');
});

test('breeding: clutches are 1–5 eggs, inbreeding lowers fertility but never to zero, promised eggs are kept', () => {
  const rng = mulberry(5), s = founder(rng, { species: 'saker', sex: 'm' }), d = founder(rng, { species: 'saker', sex: 'f' });
  let eggs = 0, fertile = 0;
  for (let i = 0; i < 3000; i++) { const c = layClutch(s, d, rng); assert.ok(c.length >= 1 && c.length <= 5); eggs += c.length; fertile += c.filter(e => e.fertile).length; }
  near(eggs / 3000, 3.15, 0.08, 'mean clutch'); near(fertile / eggs, 0.66, 0.03, 'fertility');
  assert.ok(fertilityOf(0.66, 0.25) < 0.66); assert.ok(fertilityOf(0.66, 1) > 0);
  for (let i = 0; i < 200; i++) assert.ok(layClutch(s, d, rng, { min: 2 }).filter(e => e.fertile).length >= 2);
  let muts = 0; const r2 = mulberry(6); for (let i = 0; i < 40000; i++) { const g = founder(r2, { species: 'saker' }); if (mutate(g, r2)) muts++; }
  near(muts / 40000, 1 / 400, 0.0012, 'mutation rate');
  assert.ok(COLOURS.length === 7);
});
