// The facts the game teaches: ids and categories only. The words are in js/i18n/facts.js (fact_<id> in both languages),
// and the proof is in content/facts-ledger.json: tools/check-facts.mjs refuses to pass unless every id here has a ledger
// row marked "verified" with at least one https source. APPEND ONLY.
// cat: history · law · craft (the falconer's tools and ways) · quarry · care · birds
export const FACTS = [
  { id: 'hood_calm', cat: 'craft' }, { id: 'drones', cat: 'craft' }, { id: 'dawn_dusk', cat: 'craft' }, { id: 'mangalah', cat: 'craft' }, { id: 'wakr', cat: 'craft' },
  { id: 'season', cat: 'law' }, { id: 'licence', cat: 'law' }, { id: 'sunrise', cat: 'law' }, { id: 'captive_houbara', cat: 'law' }, { id: 'marzoom', cat: 'law' },
  { id: 'passport_2002', cat: 'law' }, { id: 'passport_ring', cat: 'law' },
  { id: 'bedouin_food', cat: 'history' }, { id: 'bedouin_release', cat: 'history' }, { id: 'hood_arab', cat: 'history' }, { id: 'unesco_2010', cat: 'history' },
  { id: 'unesco_24', cat: 'history' }, { id: 'unesco_4000', cat: 'history' }, { id: 'conf_1976', cat: 'history' }, { id: 'release_1995', cat: 'history' },
  { id: 'falconers_5000', cat: 'history' }, { id: 'school', cat: 'history' }, { id: 'women_2018', cat: 'history' },
  { id: 'saluki', cat: 'quarry' }, { id: 'houbara_spiral', cat: 'quarry' }, { id: 'houbara_fund', cat: 'quarry' }, { id: 'houbara_vuln', cat: 'quarry' },
  { id: 'aspergillosis', cat: 'care' }, { id: 'hybrids_hardy', cat: 'care' }, { id: 'bumblefoot', cat: 'care' }, { id: 'gps', cat: 'care' },
  { id: 'saker_pref', cat: 'birds' }, { id: 'tiercel', cat: 'birds' }, { id: 'race_400', cat: 'birds' }, { id: 'race_ages', cat: 'birds' },
  { id: 'spring_light', cat: 'birds' }, { id: 'clutch', cat: 'birds' }, { id: 'second_clutch', cat: 'birds' }, { id: 'record_white', cat: 'birds' },
];
export const FACT_IDS = FACTS.map(f => f.id);
