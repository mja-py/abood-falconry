// Breeding: what is in the nests, and choosing a mother and a father with the odds shown first. The odds come from the
// same rules that lay the eggs, so this is probability a child can read ("2 of 4"), never a mystery box.
import { T, nf } from '../i18n.js';
import * as S from '../save.js';
import * as U from '../ui.js';
import { play } from '../audio.js';
import * as C from '../sim/career.js';
import { odds, quarters } from '../sim/breed.js';
import { coi } from '../sim/pedigree.js';
import { stars } from '../sim/phenotype.js';
import { RARE } from '../data/loci.js';
import { birdPortrait, birdName, starRow, eggPic, swatch } from './falconcard.js';

let pick = { sire: 0, dam: 0 };
U.registerSheet('breed', 't_breed', body => {
  const s = S.data(); let h = '';
  for (const n of s.nests) { const left = Math.max(0, n.hatch - s.hunts), dam = C.bird(s, n.dam), sire = C.bird(s, n.sire);
    h += `<div class="nest"><b>${sire ? birdName(sire) : ''} × ${dam ? birdName(dam) : ''}</b><div class="eggrow">${n.eggs.map((e, i) => `<canvas data-egg="${n.laid * 7 + i}" width="128" height="128" style="width:52px;height:52px" aria-hidden="true"></canvas>`).join('')}</div><small>${T(left ? 'br_eggs' : 'br_wait_room', left)}</small></div>`; }
  const { sires, dams } = C.pairable(s);
  if (s.nests.length >= s.nestCap) h += `<p class="hint">${T('br_busy')}</p>`;
  else if (!dams.length || !sires.length) h += `<p class="hint">${T('br_none')}</p>`;
  else {
    if (!dams.some(b => b.id === pick.dam)) pick.dam = dams[0].id;
    if (!sires.some(b => b.id === pick.sire)) pick.sire = (sires.find(b => b.own === 'me') || sires[0]).id;
    const sire = C.bird(s, pick.sire), dam = C.bird(s, pick.dam), gs = C.genomeOf(sire), gd = C.genomeOf(dam), o = odds(gs, gd), F = coi(C.pedMap(s), sire.id, dam.id), why = C.mayPair(s, sire, dam);
    const card = (b, kind) => `<button type="button" class="rbird ${b.id === pick[kind] ? 'on' : ''}" data-${kind}="${b.id}"><canvas width="112" height="92" aria-hidden="true"></canvas><span>${birdName(b)}${b.own === 'baba' ? ' · ' + T('n_baba') : ''}</span></button>`;
    const colours = Object.entries(o.colour).sort((a, b) => b[1] - a[1]).map(([k, p]) => `<span class="odd">${swatch(k)}${T('col_' + k)} · ${T('br_of4', quarters(p))}</span>`).join('');
    const rare = RARE.map(r => [r, o.rare[r.id]]).filter(([, x]) => x.carrier + x.shows > 0).map(([r, x]) => `<span class="odd"><i class="bead rare"></i>${T('rg_' + r.id)} · ${T('br_rare', quarters(x.shows), quarters(x.carrier))}</span>`).join('');
    const tr = t => o.traits[t], st = k => k === 'stoop' ? [(tr('stoop').lo + tr('burst').lo + tr('accuracy').lo) / 3, (tr('stoop').hi + tr('burst').hi + tr('accuracy').hi) / 3] : [tr(k).lo, tr(k).hi];
    const base = { speed: 45, stamina: 45, stoop: 42, agility: 35, eyes: 40 };
    const line = k => { const [lo, hi] = st(k); return `<div class="statline"><span>${T('tr_' + k)}</span>${starRow(stars(base[k] + hi * 2))}</div>`; };
    h += `<p class="hint">${T('br_how')}</p>
      <div class="pairgrid"><div><p class="sec-title">${T('br_dam')}</p><div class="roster" id="brDams">${dams.map(b => card(b, 'dam')).join('')}</div></div>
        <div><p class="sec-title">${T('br_sire')}</p><div class="roster" id="brSires">${sires.map(b => card(b, 'sire')).join('')}</div></div></div>
      <p class="sec-title">${T('br_odds', birdName(sire), birdName(dam))}</p><div class="odds">${colours}${rare}</div>
      <div class="statgrid">${C.STATS.map(line).join('')}</div>
      ${F > 0 ? `<p class="hint">${T('br_kin', Math.round(F * 100))}</p>` : ''}
      <button type="button" class="btn" id="brGo" ${why ? 'disabled' : ''}>${T(why === 'hungry' ? 'br_hungry' : 'br_go')}</button>`;
  }
  body.innerHTML = h || `<p class="hint">${T('br_none')}</p>`;
  body.querySelectorAll('[data-egg]').forEach(cv => eggPic(cv, +cv.dataset.egg + 100));
  body.querySelectorAll('.rbird').forEach(x => { const kind = x.dataset.dam ? 'dam' : 'sire', id = +(x.dataset.dam || x.dataset.sire); birdPortrait(x.querySelector('canvas'), s, C.bird(s, id), { s: 1.7 }); x.onclick = () => { pick[kind] = id; play('click'); U.reopen(); }; });
  const go = body.querySelector('#brGo'); if (go) go.onclick = () => { const r = C.pair(s, pick.sire, pick.dam); if (r.ok) { S.save(); play('fanfare'); U.note(T('br_laid', r.n)); U.reopen(); } };
});
export const breedDot = s => s.nests.length < s.nestCap && C.pairable(s).dams.length > 0;
