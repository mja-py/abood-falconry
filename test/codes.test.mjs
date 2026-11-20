import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry } from '../js/sim/rng.js';
import { founder, cross } from '../js/sim/genome.js';
import { encodeFalcon, decodeFalcon, pretty, rowsOf, normalise } from '../js/sim/codes.js';
import { ALPHABET } from '../js/sim/bits.js';

const sample = seed => { const r = mulberry(seed), s = founder(r, { species: 'saker', sex: 'm', rare: { barq: 1 } }), d = founder(r, { species: 'gyr', sex: 'f' });
  return { g: cross(s, d, r), nameIdx: seed % 1024, ageWeeks: 60 + seed, gen: seed % 9, F: 0.125, tr: { speed: 0.8, burst: 0.6, stoop: 0.2, stamina: 1, agility: 0, accuracy: 0.4 } }; };

test('codes: a falcon survives the trip and the code is short enough to type', () => {
  for (let i = 1; i <= 200; i++) {
    const f = sample(i), code = encodeFalcon(f), back = decodeFalcon(code);
    assert.ok(code.length <= 52, `code is ${code.length} characters`);
    assert.ok(back.ok); assert.deepEqual(back.falcon.g, f.g); assert.equal(back.falcon.nameIdx, f.nameIdx); assert.equal(back.falcon.ageWeeks, f.ageWeeks); assert.equal(back.falcon.gen, f.gen);
    assert.ok(Math.abs(back.falcon.tr.speed - 0.4) < 0.05, 'a guest arrives half as trained');
  }
});

test('codes: every single wrong character is caught, and the row is named', () => {
  const code = encodeFalcon(sample(42)), rows = rowsOf(code);
  for (let i = 0; i < code.length; i++) {
    for (const ch of [ALPHABET[(ALPHABET.indexOf(code[i]) + 1) % 32], ALPHABET[(ALPHABET.indexOf(code[i]) + 17) % 32]]) {
      const bad = code.slice(0, i) + ch + code.slice(i + 1), r = decodeFalcon(bad);
      assert.equal(r.ok, false, `changed character ${i}`);
      if (r.row) assert.equal(r.row, Math.floor(i / 13) + 1);
    }
  }
  assert.equal(rows.length, Math.ceil(code.length / 13));
  assert.equal(decodeFalcon('').ok, false); assert.equal(decodeFalcon('0000').ok, false); assert.equal(decodeFalcon(code.slice(0, -3)).ok, false);
});

test('codes: forgiving about how people type', () => {
  const f = sample(7), code = encodeFalcon(f);
  assert.ok(decodeFalcon(pretty(code).toLowerCase()).ok, 'lower case and spaces');
  assert.ok(decodeFalcon(code.replace(/(.{4})/g, '$1-')).ok, 'dashes');
  const arabic = code.replace(/[0-9]/g, d => String.fromCharCode(0x0660 + +d)); assert.ok(decodeFalcon(arabic).ok, 'Arabic-Indic digits');
  assert.equal(normalise('o0 iIlL'), '001111');
  const swapped = code.replace(/0/g, 'O').replace(/1/g, 'I'); assert.ok(decodeFalcon(swapped).ok, 'O for zero, I for one');
});
