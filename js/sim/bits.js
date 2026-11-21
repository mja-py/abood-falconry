// Bit packing and the text alphabet shared by saved genomes and friend codes.
// Crockford base32: no I, L, O or U, so a code read aloud or typed by a child survives. 5 bits per character.
export const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const VALUE = {}; for (let i = 0; i < 32; i++) VALUE[ALPHABET[i]] = i;

export class BitWriter {
  constructor() { this.bits = []; }
  push(value, n) { for (let i = n - 1; i >= 0; i--) this.bits.push((value >>> i) & 1); return this; }
  get length() { return this.bits.length; }
  text() { // pads the tail with zero bits to a whole character
    let out = '';
    for (let i = 0; i < this.bits.length; i += 5) { let v = 0; for (let k = 0; k < 5; k++) v = (v << 1) | (this.bits[i + k] || 0); out += ALPHABET[v]; }
    return out;
  }
}
export class BitReader {
  constructor(text) {
    this.bits = []; this.pos = 0; this.ok = true;
    for (const ch of text) { const v = VALUE[ch]; if (v === undefined) { this.ok = false; break; } for (let k = 4; k >= 0; k--) this.bits.push((v >>> k) & 1); }
  }
  take(n) { let v = 0; for (let i = 0; i < n; i++) { if (this.pos >= this.bits.length) { this.ok = false; return 0; } v = (v << 1) | this.bits[this.pos++]; } return v >>> 0; }
}
// what people actually type: lower case, spaces, dashes, O for 0, I or L for 1, Arabic-Indic and Persian digits
export function normalise(text) {
  let out = '';
  for (const ch of String(text || '').toUpperCase()) {
    const cp = ch.codePointAt(0);
    if (cp >= 0x0660 && cp <= 0x0669) out += String(cp - 0x0660);
    else if (cp >= 0x06F0 && cp <= 0x06F9) out += String(cp - 0x06F0);
    else if (ch === 'O') out += '0';
    else if (ch === 'I' || ch === 'L') out += '1';
    else if (ch === 'U') out += 'V';
    else if (VALUE[ch] !== undefined) out += ch;
  }
  return out;
}
export function crc16(text) { // CRC-16/CCITT over the characters
  let crc = 0xFFFF;
  for (let i = 0; i < text.length; i++) {
    crc ^= text.charCodeAt(i) << 8;
    for (let k = 0; k < 8; k++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
  }
  return crc;
}
export const valueOf = ch => VALUE[ch];
