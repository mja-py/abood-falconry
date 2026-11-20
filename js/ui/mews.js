// The mews: where the falcons live. One bird on the stage with its trust, weight, health and feathers beside it, what
// it can do today as stars, its ration, feeding from the fist, and its beads (the genes, shown the way a child can read).
import { T, nf } from '../i18n.js';
import * as S from '../save.js';
import * as U from '../ui.js';
import { play } from '../audio.js';
import * as C from '../sim/career.js';
import { copies, shows } from '../sim/genome.js';
import { TRAITS, LOCI_PER_TRAIT, TRAINABLE, RARE, COLOURS } from '../data/loci.js';
import { portrait, thumb, birdName, birdLine, starRow, meter, colourName } from './falconcard.js';

let sel = 0;
const SWATCH = { adham: '#3b2a22', ahmar: '#7a4326', ramadi: '#5c6470', akhdar: '#6b6a4c', ashgar: '#b88a4a', fiddi: '#a9b0b8', abyad: '#e9e6dc' };
export const swatch = name => `<i class="swatch" style="background:${SWATCH[name]}"></i>`;

U.registerSheet('mews', 't_mews', body => {
  const s = S.data(), birds = C.mine(s); if (!birds.some(b => b.id === sel)) sel = s.active;
  const b = C.bird(s, sel), st = C.statsOf(s, b), pot = C.potentialOf(b), why = C.grounded(s, b), isActive = b.id === s.active;
  const wTxt = s.gear.scale ? nf(Math.round(b.w * 100)) + '%' : T(b.w < 0.95 ? 'w_light' : b.w > 1.05 ? 'w_heavy' : 'w_right');
  const dr = U.el('div', 'dr');
  dr.innerHTML = `<div class="dr-stage"><canvas id="mwCv" width="400" height="320" aria-hidden="true"></canvas><b>${birdName(b)}</b><small>${birdLine(s, b)} · ${colourName(C.genomeOf(b))}</small>
      ${why ? `<small class="why">${T('gr_' + why)}</small>` : ''}</div>
    <div class="dr-side">
      ${meter(T('mw_trust'), b.man)}${meter(T('mw_weight'), 1 - Math.min(1, Math.abs(b.w - 1) * 5), wTxt, b.w < 0.9)}${meter(T('mw_health'), b.hp, null, b.hp < 0.5)}${meter(T('mw_feathers'), b.fe, null, b.fe < 0.6)}
      <div class="statgrid">${[...TRAINABLE, 'eyes', 'size'].map(t => `<div class="statline"><span>${T('tr_' + t)}</span>${starRow(st[t], pot[t])}</div>`).join('')}</div>
      <div class="seg" role="group" aria-label="${T('mw_ration')}">${[0, 1, 2].map(r => `<button type="button" data-ration="${r}" aria-pressed="${b.ration === r}">${T('ra_' + r)}</button>`).join('')}</div>
      <div class="rowbtns"><button type="button" class="ghost" id="mwFeed" ${b.fedWeek === s.week || s.food < 0.3 ? 'disabled' : ''}>${T('mw_feed')}</button><button type="button" class="ghost" id="mwBeads">${T('mw_beads')}</button>${isActive ? '' : `<button type="button" class="ghost red" id="mwPick">${T('mw_pick')}</button>`}</div>
      ${birds.length > 1 ? `<div class="roster" id="mwRoster">${birds.map(x => `<button type="button" class="rbird ${x.id === b.id ? 'on' : ''}" data-bird="${x.id}"><canvas width="112" height="92" aria-hidden="true"></canvas><span>${birdName(x)}</span></button>`).join('')}</div>` : `<p class="hint">${T('mw_food', s.food)}</p>`}
    </div>`;
  body.appendChild(dr);
  portrait(dr.querySelector('#mwCv'), s, b, { hood: !isActive && false, hoodCol: C.HOODS[s.gear.hood] });
  dr.querySelectorAll('[data-ration]').forEach(x => { x.onclick = () => { C.setRation(s, b.id, +x.dataset.ration); S.save(); play('click'); U.reopen(); }; });
  dr.querySelector('#mwFeed').onclick = () => { if (C.feedOnFist(s, b.id)) { S.save(); play('pickup'); U.note(T('mw_fed', birdName(b))); U.reopen(); } };
  dr.querySelector('#mwBeads').onclick = () => U.openSheet('beads', { id: b.id }, { push: true });
  const pk = dr.querySelector('#mwPick'); if (pk) pk.onclick = () => { s.active = b.id; S.save(); play('pickup'); U.reopen(); };
  const ro = dr.querySelector('#mwRoster');
  if (ro) { ro.querySelectorAll('.rbird').forEach(x => { thumb(x.querySelector('canvas'), s, C.bird(s, +x.dataset.bird)); x.onclick = () => { if (ro.moved) return; sel = +x.dataset.bird; play('click'); U.reopen(); }; }); U.pageRow(ro, 'mews', birds.findIndex(x => x.id === b.id), U.reopen); }
});
export const selectBird = id => { sel = id; };

// the beads: every gene is a pair, one bead from the father and one from the mother
U.registerSheet('beads', p => T('bd_title', birdName(C.bird(S.data(), p.id))), (body, p) => {
  const s = S.data(), b = C.bird(s, p.id), g = C.genomeOf(b), known = !!s.seen['dna' + b.id];
  const pair = (a, c, cls) => `<span class="bp"><i class="bead ${a ? cls : ''}"></i><i class="bead ${c ? cls : ''}"></i></span>`;
  let h = `<p class="hint">${T('bd_how')}</p><div class="rows">`;
  h += `<div class="beadrow"><span>${T('bd_colour')}</span><span class="beads">${swatch(COLOURS[g.h[0].c])}${swatch(COLOURS[g.h[1].c])}</span><small>${colourName(g)}</small></div>`;
  TRAITS.forEach((t, i) => { let pts = ''; for (let l = 0; l < LOCI_PER_TRAIT; l++) pts += pair(g.h[0].q[i * LOCI_PER_TRAIT + l], g.h[1].q[i * LOCI_PER_TRAIT + l], 'plus'); h += `<div class="beadrow"><span>${T('tr_' + t)}</span><span class="beads">${pts}</span><small></small></div>`; });
  const hiddenRow = `<div class="beadrow"><span>${T('bd_rare')}</span><span class="beads"><span class="bp"><i class="bead q"></i><i class="bead q"></i></span></span><small>${T('bd_hidden')}</small></div>`;
  let any = false; // rare genes: the ones that show are always listed; carriers only after a DNA test
  RARE.forEach((r, i) => { const n = copies(g, i), sh = shows(g, i); if (!n || !(known || sh > 0)) return; any = true;
    h += `<div class="beadrow"><span>${T('rg_' + r.id)}</span><span class="beads">${pair(g.h[0].r[i], g.h[1].r[i], 'rare')}</span><small>${T(sh === 1 ? 'bd_shows' : 'bd_carries')}</small></div>`; });
  if (!known) h += hiddenRow; else if (!any) h += `<div class="beadrow"><span>${T('bd_rare')}</span><span class="beads"></span><small>${T('bd_none')}</small></div>`;
  body.innerHTML = h + `</div><p class="hint">${T(known ? 'bd_model' : 'bd_dna')}</p>`;
});
