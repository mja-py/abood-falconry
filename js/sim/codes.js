// Friend codes: a falcon as a short text a child can read out or type, with no server and no account.
// A code carries the beads, the sex, the age, a name picked from the game's own list and half the training.
// It never carries dirhams, titles, registry stamps or anything personal.
// Layout: rows of 12 characters + 1 check character each, so a typing slip is located to its row; a CRC-16 over the
// whole payload sits inside it.
import { BitWriter, BitReader, ALPHABET, normalise, crc16, valueOf } from './bits.js';
import { pack, unpack, PACKED_LENGTH } from './genome.js';
import { TRAINABLE } from '../data/loci.js';

export const CODE_VERSION = 1, TYPE_FALCON = 1, ROW = 12;
const rowCheck = row => { let s = 0; for (let i = 0; i < row.length; i++) s = (s * 31 + valueOf(row[i]) + i + 1) % 32; return ALPHABET[s]; };

function seal(payloadBits) { // payload → text with the CRC and row checks
  const body = payloadBits.text(), crc = crc16(body), w = new BitWriter(); w.push(crc, 16);
  const plain = body + w.text().slice(0, 4);                           // 16 bits → 4 characters (20 bits, last 4 zero)
  let out = ''; for (let i = 0; i < plain.length; i += ROW) { const row = plain.slice(i, i + ROW); out += row + rowCheck(row); }
  return out;
}
// → { ok, body } or { ok: false, row } naming the first bad row (1-based), or row 0 when the whole code fails its CRC
function unseal(text) {
  const t = normalise(text); let plain = '';
  for (let i = 0, n = 1; i < t.length; i += ROW + 1, n++) {
    const row = t.slice(i, Math.min(i + ROW, t.length - 1)), check = t[i + row.length];
    if (!row.length || check === undefined || rowCheck(row) !== check) return { ok: false, row: n };
    plain += row;
  }
  if (plain.length < 5) return { ok: false, row: 0 };
  const body = plain.slice(0, -4), r = new BitReader(plain.slice(-4));
  return r.take(16) === crc16(body) ? { ok: true, body } : { ok: false, row: 0 };
}
export const rowsOf = text => { const t = normalise(text), rows = []; for (let i = 0; i < t.length; i += ROW + 1) rows.push(t.slice(i, i + ROW + 1)); return rows; };
// which rows of a half-typed code are right so far (for turning a row green as soon as it is complete)
export const rowStates = text => rowsOf(text).map(r => r.length < 2 ? 'open' : rowCheck(r.slice(0, -1)) === r[r.length - 1] ? 'ok' : 'open');
// codes are shown in groups of four inside an LTR run
export const pretty = text => normalise(text).replace(/(.{4})/g, '$1 ').trim();

// falcon: { g, nameIdx (0–1023), ageWeeks (0–4095), gen (0–63), F (0–1), tr: {trait: 0–1} }
export function encodeFalcon(f) {
  const w = new BitWriter();
  w.push(TYPE_FALCON, 3); w.push(CODE_VERSION, 4);
  w.push(f.nameIdx & 1023, 10); w.push(Math.min(4095, f.ageWeeks | 0), 12); w.push(Math.min(63, f.gen | 0), 6); w.push(Math.round(Math.min(1, Math.max(0, f.F || 0)) * 63), 6);
  for (const t of TRAINABLE) w.push(Math.round(Math.min(1, Math.max(0, (f.tr && f.tr[t]) || 0)) * 0.5 * 15), 4);   // a guest arrives half as trained
  while (w.length % 5) w.push(0, 1);
  const head = w.text();
  return seal({ text: () => head + pack(f.g) });
}
export function decodeFalcon(text) {
  const u = unseal(text); if (!u.ok) return { ok: false, row: u.row, why: 'check' };
  const headLen = u.body.length - PACKED_LENGTH; if (headLen < 1) return { ok: false, row: 0, why: 'short' };
  const r = new BitReader(u.body.slice(0, headLen)), type = r.take(3), ver = r.take(4);
  if (type !== TYPE_FALCON) return { ok: false, row: 0, why: 'type' };
  if (ver > CODE_VERSION) return { ok: false, row: 0, why: 'newer' };
  const nameIdx = r.take(10), ageWeeks = r.take(12), gen = r.take(6), F = r.take(6) / 63, tr = {};
  for (const t of TRAINABLE) tr[t] = r.take(4) / 15;
  const g = unpack(u.body.slice(headLen));
  if (!g || !r.ok) return { ok: false, row: 0, why: 'genome' };
  return { ok: true, falcon: { g, nameIdx, ageWeeks, gen, F, tr } };
}
export { normalise };
