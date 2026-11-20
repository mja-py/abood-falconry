// Breeding: choose the pair and read the odds first, then the eggs, the chicks, and (in Baba's first lesson) the one
// chick Abood keeps. The odds on this screen come from the same rules that lay the eggs: probability a child can read.
import { T, nf } from '../i18n.js';
import * as S from '../save.js';
import * as U from '../ui.js';
import { play } from '../audio.js';
import * as C from '../sim/career.js';
import { odds, quarters } from '../sim/breed.js';
import { coi } from '../sim/pedigree.js';
import { unpack, copies, shows } from '../sim/genome.js';
import { appearance, potential, colourOf } from '../sim/phenotype.js';
import { TRAINABLE } from '../data/loci.js';
import { portrait, thumb, birdName, birdLine, starRow, eggPic, chickPic, colourName } from './falconcard.js';
import { swatch } from './mews.js';

let pick = { sire: 0, dam: 0 };
const BABA_KNOWS = b => b.own === 'baba';             // Baba knows his own birds' beads; a stranger's need a DNA test

U.registerSheet('breed', 't_breed', body => {
  const s = S.data(), c = s.clutch, why = C.mayPair(s);
  if (c) return clutchView(body, s, c);
  if (why === 'season') { body.innerHTML = `<p class="sec-title">${T('br_wait_t')}</p><p>${T('br_wait', C.weekOfYear(s.week) < 24 ? 24 - C.weekOfYear(s.week) : 72 - C.weekOfYear(s.week))}</p><p class="fact"><b>${T('did_you_know')}</b> ${T('fact_spring_light')}</p>`; return; }
  const { sires, dams } = C.pairable(s);
  if (!sires.length || !dams.length) { body.innerHTML = `<p>${T('br_none')}</p>`; return; }
  if (!dams.some(b => b.id === pick.dam)) pick.dam = (dams.find(b => b.own === 'me') || dams[0]).id;
  if (!sires.some(b => b.id === pick.sire)) pick.sire = sires[0].id;
  const sire = C.bird(s, pick.sire), dam = C.bird(s, pick.dam), gs = C.genomeOf(sire), gd = C.genomeOf(dam), o = odds(gs, gd), F = coi(C.pedMap(s), sire.id, dam.id);
  const card = (b, kind) => `<button type="button" class="rbird ${b.id === pick[kind] ? 'on' : ''}" data-${kind}="${b.id}"><canvas width="112" height="92" aria-hidden="true"></canvas><span>${birdName(b)}</span></button>`;
  const colours = Object.entries(o.colour).sort((a, b) => b[1] - a[1]).map(([k, p]) => `<span class="odd">${swatch(k)}${T('col_' + k)} · ${T('br_of4', quarters(p))}</span>`).join('');
  const known = BABA_KNOWS(sire) || s.seen['dna' + sire.id], knownD = BABA_KNOWS(dam) || s.seen['dna' + dam.id];
  const barq = o.rare.barq, showGrid = known && knownD && (copies(gs, 'barq') || copies(gd, 'barq'));
  const bead = n => `<span class="bp"><i class="bead ${n > 0 ? 'rare' : ''}"></i><i class="bead ${n > 1 ? 'rare' : ''}"></i></span>`;
  const grid = showGrid ? `<p class="sec-title">${T('br_grid', T('rg_barq'))}</p><div class="punnett">
      <span></span><span><i class="bead ${gd.h[0].r[0] ? 'rare' : ''}"></i></span><span><i class="bead ${gd.h[1].r[0] ? 'rare' : ''}"></i></span>
      <span><i class="bead ${gs.h[0].r[0] ? 'rare' : ''}"></i></span><div class="cell ${barq.grid[0] === 2 ? 'hit' : ''}">${bead(barq.grid[0])}</div><div class="cell ${barq.grid[1] === 2 ? 'hit' : ''}">${bead(barq.grid[1])}</div>
      <span><i class="bead ${gs.h[1].r[0] ? 'rare' : ''}"></i></span><div class="cell ${barq.grid[2] === 2 ? 'hit' : ''}">${bead(barq.grid[2])}</div><div class="cell ${barq.grid[3] === 2 ? 'hit' : ''}">${bead(barq.grid[3])}</div>
    </div><p class="hint">${T('br_grid_how', quarters(barq.carrier), quarters(barq.shows))}</p>` : `<p class="hint">${T('br_dna_hint')}</p>`;
  const traits = TRAINABLE.slice(0, 4).map(t => `<div class="statline"><span>${T('tr_' + t)}</span>${starRow(o.traits[t].lo * 2 + 40, o.traits[t].hi * 2 + 40)}</div>`).join('');
  body.innerHTML = `<p class="hint">${T('br_how')}</p>
    <div class="pairgrid"><div><p class="sec-title">${T('br_dam')}</p><div class="roster" id="brDams">${dams.map(b => card(b, 'dam')).join('')}</div></div>
      <div><p class="sec-title">${T('br_sire')}</p><div class="roster" id="brSires">${sires.map(b => card(b, 'sire')).join('')}</div></div></div>
    <p class="sec-title">${T('br_odds', birdName(sire), birdName(dam))}</p><div class="odds">${colours}</div>
    <div class="statgrid">${traits}</div>
    ${F > 0 ? `<p class="hint">${T('br_kin', Math.round(F * 100))}</p>` : ''}
    ${grid}
    <button type="button" class="btn" id="brGo">${T('br_go')}</button>`;
  body.querySelectorAll('.rbird').forEach(x => { const kind = x.dataset.dam ? 'dam' : 'sire', id = +(x.dataset.dam || x.dataset.sire); thumb(x.querySelector('canvas'), s, C.bird(s, id)); x.onclick = () => { pick[kind] = id; play('click'); U.reopen(); }; });
  body.querySelector('#brGo').onclick = () => { const r = C.startClutch(s, pick.sire, pick.dam); if (r.ok) { S.save(); play('fanfare'); U.note(T('br_laid', r.n)); U.reopen(); } };
});

function clutchView(body, s, c) {
  const sire = C.bird(s, c.sire), dam = C.bird(s, c.dam), names = `${sire ? birdName(sire) : ''} × ${dam ? birdName(dam) : ''}`;
  if (c.stage === 'eggs') {
    const left = Math.max(0, c.hatch - s.week);
    body.innerHTML = `<div class="nopage quiz"><h3>${T('br_eggs_t', c.eggs.length)}</h3><p>${names}</p>
      <div class="eggrow">${c.eggs.map((e, i) => `<canvas data-egg="${i}" width="128" height="128" aria-hidden="true"></canvas>`).join('')}</div>
      <p>${T(c.candled ? 'br_candled' : 'br_eggs', left)}${c.candled ? ' ' + T('br_fertile', c.eggs.filter(e => e.fertile).length) : ''}</p>
      <div class="rowbtns"><button type="button" class="ghost" id="brCandle" ${c.candled ? 'disabled' : ''}>${T('br_candle')}</button></div>
      <p class="fact"><b>${T('did_you_know')}</b> ${T('fact_clutch')}</p></div>`;
    body.querySelectorAll('[data-egg]').forEach(cv => { const e = c.eggs[+cv.dataset.egg]; eggPic(cv, 100 + (+cv.dataset.egg) * 17 + c.laid, c.candled && !e.fertile); });
    body.querySelector('#brCandle').onclick = () => { c.candled = 1; S.save(); play('pickup'); U.reopen(); };
  } else if (c.stage === 'chicks') {
    body.innerHTML = `<div class="nopage quiz"><h3>${T('br_chicks_t', c.eggs.length)}</h3><p>${names}</p>
      <div class="eggrow">${c.eggs.map(() => '<canvas data-chick width="128" height="128" aria-hidden="true"></canvas>').join('')}</div>
      <p>${T('br_chicks', Math.max(0, c.fledge - s.week))}</p></div>`;
    body.querySelectorAll('[data-chick]').forEach((cv, i) => chickPic(cv, i, 1.2 + Math.min(0.8, (s.week - c.hatch) * 0.12)));
  } else { // fledged, and it is Baba's clutch: Abood chooses the one he will raise
    const full = C.mine(s).length >= s.mews.cap;
    body.innerHTML = `<p class="hint">${T(full ? 'br_full' : 'br_choose')}</p><div class="cards">${c.eggs.map((e, i) => { const g = unpack(e.g), pot = potential(g, c.F);
      return `<div class="card"><canvas data-kid="${i}" width="200" height="160" style="width:120px;height:96px" aria-hidden="true"></canvas><b>${T(g.sex === 'f' ? 'sex_f' : 'sex_m')} · ${colourName(g)}</b>
        <div class="statline"><span>${T('tr_speed')}</span>${starRow(pot.speed * 0.64, pot.speed)}</div><div class="statline"><span>${T('tr_burst')}</span>${starRow(pot.burst * 0.64, pot.burst)}</div>
        <small>${copies(g, 'barq') ? T('br_kid_barq') : T('br_kid_plain')}</small><button type="button" data-keep="${i}" ${full ? 'disabled' : ''}>${T('br_keep')}</button></div>`; }).join('')}</div>`;
    body.querySelectorAll('[data-kid]').forEach(cv => { const g = unpack(c.eggs[+cv.dataset.kid].g); portrait(cv, s, { id: +cv.dataset.kid + 50 }, { look: appearance(g, 12), time: 'dawn', s: 1.8 }); });
    body.querySelectorAll('[data-keep]').forEach(x => { x.onclick = () => { const kept = C.keepChicks(s, [+x.dataset.keep]); if (kept.length) { S.save(); play('fanfare'); U.closeAllSheets(); U.news([{ kick: T('nw_chick_k'), title: birdName(kept[0]), text: T('nw_chick', birdName(kept[0])), art: (g2, W, H) => { const cv = document.createElement('canvas'); cv.width = 400; cv.height = 320; portrait(cv, s, kept[0], { time: 'dawn' }); g2.drawImage(cv, (W - 275) / 2, 0, 275, 220); } }]); } }; });
  }
}
export const breedDot = s => !!(s.clutch && s.clutch.stage === 'fledged') || (!s.clutch && C.seasonOf(s.week) === 'breed');
