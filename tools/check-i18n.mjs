// Every string exists in both languages, every key the code asks for exists, and no button text carries a symbol glyph.
import { readFileSync, readdirSync } from 'node:fs';
import { UI_AR, UI_EN } from '../js/i18n/strings.js';
import { FACTS_AR, FACTS_EN } from '../js/i18n/facts.js';
import { FACTS } from '../js/data/facts.js';
const base = readFileSync(new URL('../js/i18n.js', import.meta.url), 'utf8');
const block = (from, to) => new Set([...base.slice(base.indexOf(from), base.indexOf(to)).matchAll(/(?:^|[\s,{])([A-Za-z0-9_]+): (?=['"\[`]|\(?[a-z, ]*\)? =>)/g)].map(m => m[1]));
const ar = new Set([...block('  ar: {', '  en: {'), ...Object.keys(UI_AR), ...Object.keys(FACTS_AR)]), en = new Set([...block('  en: {', 'export const FLAG'), ...Object.keys(UI_EN), ...Object.keys(FACTS_EN)]);
const fail = [], warn = [];
for (const k of ar) if (!en.has(k) && !(k.endsWith('G') && en.has(k.slice(0, -1)))) fail.push('missing in English: ' + k);
for (const k of en) if (!ar.has(k)) fail.push('missing in Arabic: ' + k);
for (const f of FACTS) for (const L of [FACTS_AR, FACTS_EN]) if (!L['fact_' + f.id]) fail.push('fact without words: ' + f.id);
const dir = p => readdirSync(new URL(p, import.meta.url)).filter(f => f.endsWith('.js')).map(f => p + f);
const files = ['../index.html', '../js/game.js', '../js/ui.js', '../js/race.js', ...dir('../js/ui/'), ...dir('../js/scenes/')], used = new Set();
for (const f of files) { const s = readFileSync(new URL(f, import.meta.url), 'utf8'); for (const m of s.matchAll(/\bTL?\(\s*'([A-Za-z0-9_]+)'\s*[,)]/g)) used.add(m[1]); for (const m of s.matchAll(/data-i18n(?:-aria)?="([A-Za-z0-9_]+)"/g)) used.add(m[1]); for (const m of s.matchAll(/\? '([a-z]+_[A-Za-z0-9_]+)' : '([a-z]+_[A-Za-z0-9_]+)'/g)) { used.add(m[1]); used.add(m[2]); } }
for (const k of used) if (!ar.has(k)) fail.push('used in code but has no string: ' + k);
const glyph = /[←-⯿✀-➿\u{1f000}-\u{1faff}]/u;
for (const [name, L] of [['ar', { ...UI_AR, ...FACTS_AR }], ['en', { ...UI_EN, ...FACTS_EN }]]) for (const [k, v] of Object.entries(L)) { const txt = typeof v === 'function' ? String(v(1, 2, 3)) : Array.isArray(v) ? v.join(' ') : v; if (glyph.test(txt)) fail.push(`symbol glyph in ${name}.${k}`); if (/\b(kill|killed|dead|blood)\b|قتل|ذبح|دم\b/.test(txt)) fail.push(`harsh word in ${name}.${k}`); }
for (const k of Object.keys(UI_AR)) if (/[اأ](ضغط|سحب|ختر|شتر)\b/.test(String(typeof UI_AR[k] === 'function' ? UI_AR[k](1, 2) : UI_AR[k])) && !UI_AR[k + 'G'] && !/^(sh_|bu_|a_|mw_)/.test(k)) warn.push('speaks to one child without a Mozah twin: ' + k);
for (const w of warn) console.log('WARN ' + w);
if (fail.length) { for (const f of fail) console.error('FAIL ' + f); process.exit(1); }
console.log(`i18n ok: ${ar.size} Arabic keys, ${en.size} English keys, ${used.size} used in code, ${warn.length} warnings`);
