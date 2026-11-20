// The rules must stay pure: js/sim and js/data may import only each other, and may not touch the page, storage, the
// clock or Math.random. That is what lets node test them and the balance tool replay whole careers.
import { readFileSync, readdirSync } from 'node:fs';
const fail = [], ban = /(?<![.\w$])(document|window|localStorage|sessionStorage|navigator|performance|requestAnimationFrame)\b(?!\s*:)|Math\.random|new Date|Date\.now/;   // a property or key called `window` (the strike window) is fine
for (const dir of ['sim', 'data']) for (const f of readdirSync(new URL(`../js/${dir}/`, import.meta.url)).filter(x => x.endsWith('.js'))) {
  const src = readFileSync(new URL(`../js/${dir}/${f}`, import.meta.url), 'utf8'), code = src.split('\n').filter(l => !l.trim().startsWith('//')).join('\n').replace(/\/\/.*$/gm, '');
  const m = ban.exec(code); if (m) fail.push(`js/${dir}/${f}: uses ${m[0]}`);
  for (const im of code.matchAll(/from '([^']+)'/g)) { const p = im[1]; if (dir === 'data' && !/^\.\/[a-z-]+\.js$/.test(p)) fail.push(`js/data/${f}: imports ${p}`); if (dir === 'sim' && !/^(\.\/|\.\.\/data\/)[a-z-]+\.js$/.test(p)) fail.push(`js/sim/${f}: imports ${p}`); }
}
if (fail.length) { for (const f of fail) console.error('FAIL ' + f); process.exit(1); }
console.log('imports ok: js/sim and js/data are pure');
