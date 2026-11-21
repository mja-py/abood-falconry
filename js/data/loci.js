// The genome layout and the species tables. Plain data: ids only, names live in i18n.
// This is a GAME MODEL of inheritance (dominance, carriers, polygenic traits, sex linkage), simple enough to teach
// with coloured beads. It is not a description of real falcon colour genetics, and the Falconer's Book says so.

// ten performance traits, each built from four additive loci worth 4 / 3 / 2 / 1 points per "plus" bead
export const TRAITS = ['speed', 'burst', 'stoop', 'stamina', 'agility', 'accuracy', 'eyes', 'temper', 'hardy', 'size'];
export const LOCI_PER_TRAIT = 4;
export const WEIGHTS = [4, 3, 2, 1];          // max 2 × 10 = 20 genetic points per trait
export const POINT_VALUE = 2;                 // each point adds 2 to the 0–100 stat
export const TRAINABLE = ['speed', 'burst', 'stoop', 'stamina', 'agility', 'accuracy'];

// one colour locus, an allelic series: a darker bead hides a paler one (index 0 is the most dominant)
export const COLOURS = ['adham', 'ahmar', 'ramadi', 'akhdar', 'ashgar', 'fiddi', 'abyad'];
export const PATTERNS = ['plain', 'barred', 'spotted'];   // codominant: both beads show

// the nine rare genes (names invented for the game). mode: rec = needs two copies · zrec = on the Z chromosome, so a
// daughter shows it with one copy · inc = one copy gives a part of the effect
export const RARE = [
  { id: 'barq', mode: 'rec' },      // top speed
  { id: 'sahm', mode: 'rec' },      // burst off the fist, no early fade
  { id: 'ain', mode: 'zrec' },      // a wider strike window
  { id: 'shihab', mode: 'inc' },    // the stoop
  { id: 'mikhlab', mode: 'rec' },   // quarry cannot break free
  { id: 'nafas', mode: 'rec' },     // no stamina fade
  { id: 'reesha', mode: 'rec' },    // feathers never break
  { id: 'thalj', mode: 'rec' },     // clean plumage; with white it makes "super white"
  { id: 'suhail', mode: 'rec' },    // heat tolerance
];
export const RARE_IDS = RARE.map(r => r.id);

export const SPECIES = ['saker', 'peregrine', 'gyr', 'wakri'];
// base stats on the 0–100 scale before genes
export const BASE = {
  saker:     { speed: 45, burst: 50, stoop: 35, stamina: 45, agility: 35, accuracy: 40, eyes: 40, temper: 40, hardy: 50, size: 50 },
  peregrine: { speed: 50, burst: 35, stoop: 60, stamina: 40, agility: 55, accuracy: 45, eyes: 45, temper: 35, hardy: 45, size: 30 },
  gyr:       { speed: 55, burst: 40, stoop: 45, stamina: 50, agility: 30, accuracy: 35, eyes: 40, temper: 30, hardy: 25, size: 65 },
  wakri:     { speed: 35, burst: 40, stoop: 35, stamina: 35, agility: 45, accuracy: 35, eyes: 35, temper: 55, hardy: 50, size: 25 },
};
export const MALE_SIZE = { saker: 0.8, peregrine: 0.7, gyr: 0.8, wakri: 0.8 };   // females are the larger sex
export const SIGNATURE = { saker: ['burst'], peregrine: ['stoop', 'agility'], gyr: ['speed', 'size'], wakri: ['temper'] };
export const SIGNATURE_BONUS = 0.15;
// which colour beads exist in each species' founders, and how common they are
export const COLOUR_POOL = {
  saker:     { adham: 0.30, ahmar: 0.30, akhdar: 0.22, ashgar: 0.15, abyad: 0.03 },
  peregrine: { adham: 0.40, ramadi: 0.45, fiddi: 0.15 },
  gyr:       { adham: 0.25, ramadi: 0.40, fiddi: 0.25, abyad: 0.10 },
  wakri:     { ramadi: 0.60, ahmar: 0.40 },
};
export const PATTERN_POOL = [0.4, 0.3, 0.3];
// how good the "plus" beads are, by where a bird comes from
export const PLUS = { starter: 0.35, common: 0.30, good: 0.45, auction: 0.60 };
// hybrid vigour, scaled by the hybrid index (1 for a first cross, 0.5 for the next generation)
export const HETEROSIS = { hardy: 12, temper: 6, size: 5 };
export const INBREED = { hardy: 40, fertility: 1.6, fertilityFloor: 0.3 };       // soft costs only, never a gate
export const MUTATION = 1 / 400;                                                 // one chick in 400 flips one bead
export const ADULT_WEEKS = 90;                                                   // a chick hatched one spring breeds in its second spring after
