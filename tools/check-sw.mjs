// The service worker must list every file the game loads, or it silently breaks offline play (its install step
// swallows a failed fetch). `--write` rebuilds the list in sw.js from what is on disk.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
const root = new URL('../', import.meta.url), walk = d => readdirSync(new URL(d, root)).flatMap(n => (statSync(new URL(d + n, root)).isDirectory() ? walk(d + n + '/') : [d + n]));
const files = ['index.html', 'manifest.webmanifest', ...walk('css/'), ...walk('js/'), ...walk('assets/')].filter(f => !/\.(txt|md)$/i.test(f) && !f.endsWith('.DS_Store')).map(f => './' + f).sort();
const icons = ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'].map(n => './assets/icons/' + n), want = ['./', ...new Set([...files, ...icons])];
const p = new URL('sw.js', root); let sw = readFileSync(p, 'utf8'); const a = sw.indexOf('const ASSETS = ['), b = sw.indexOf('];', a);
const have = [...sw.slice(a, b).matchAll(/'([^']+)'/g)].map(m => m[1]);
if (process.argv.includes('--write')) { sw = sw.slice(0, a) + 'const ASSETS = [\n  ' + want.map(f => `'${f}'`).join(', ').replace(/(.{1,150})(, |$)/g, '$1,\n  ').trimEnd().replace(/,$/, '') + ',\n' + sw.slice(b); writeFileSync(p, sw); console.log(`sw.js: wrote ${want.length} entries`); }
else { const missing = want.filter(f => !have.includes(f)), extra = have.filter(f => !want.includes(f));
  if (missing.length || extra.length) { if (missing.length) console.error('FAIL not in sw.js: ' + missing.join(' ')); if (extra.length) console.error('FAIL listed but not on disk: ' + extra.join(' ')); process.exit(1); }
  console.log(`sw ok: ${have.length} files listed`); }
