// Nothing educational ships without a source. Every fact and quiz item in js/data/facts.js must have a ledger row with
// an https source. `--release` also refuses anything not marked "verified" (a "sourced" row still needs a second read).
import { readFileSync } from 'node:fs';
import { FACTS } from '../js/data/facts.js';
const ledger = JSON.parse(readFileSync(new URL('../content/facts-ledger.json', import.meta.url), 'utf8')), rows = new Map(ledger.facts.map(f => [f.id, f]));
const release = process.argv.includes('--release'), fail = [], pending = [];
for (const f of FACTS) { const r = rows.get(f.id);
  if (!r) { fail.push(`${f.id}: no ledger row`); continue; }
  if (!Array.isArray(r.sources) || !r.sources.length || !r.sources.every(u => /^https:\/\//.test(u))) fail.push(`${f.id}: needs at least one https source`);
  if (!r.claim) fail.push(`${f.id}: the ledger row has no claim`);
  if (r.status === 'sourced') pending.push(f.id); else if (r.status !== 'verified') fail.push(`${f.id}: status is "${r.status}"`); }
for (const id of rows.keys()) if (!FACTS.some(f => f.id === id)) fail.push(`${id}: in the ledger but not in the game`);
if (release && pending.length) fail.push(`not yet verified by a second read: ${pending.join(', ')}`);
if (fail.length) { for (const f of fail) console.error('FAIL ' + f); process.exit(1); }
console.log(`facts ok: ${FACTS.length} facts, ${FACTS.length - pending.length} verified, ${pending.length} sourced and awaiting a second read${pending.length ? ' (' + pending.join(', ') + ')' : ''}; ${ledger.held_back.length} held back`);
