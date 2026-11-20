// The market (food, papers, gear, hoods, the falcon hospital) and the competition grounds.
// Dirhams are pretend: the first line of the shop says so, and says the numbers here are bigger than in the other games.
import { T, nf } from '../i18n.js';
import * as S from '../save.js';
import * as U from '../ui.js';
import { play } from '../audio.js';
import * as C from '../sim/career.js';
import { drawFalcon, drawBlock } from '../art/falcon.js';
import { INK } from '../art.js';
import { lookOf, coinBtn, birdName } from './falconcard.js';

const TAU = Math.PI * 2;
function itemArt(cv, id, s) {
  const c = cv.getContext('2d'); c.setTransform(cv.width / 64, 0, 0, cv.height / 64, 0, 0); c.clearRect(0, 0, 64, 64); c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = INK; c.lineWidth = 2;
  const box = (col, x, y, w, h, r = 6) => { c.fillStyle = col; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); c.stroke(); };
  if (id === 'food' || id === 'food10') { const n = id === 'food' ? 1 : 3; for (let i = 0; i < n; i++) { box('#e9d3a3', 12 + i * 9, 34 - i * 7, 30, 18, 5); c.fillStyle = '#c8202b'; c.fillRect(13 + i * 9, 40 - i * 7, 28, 4); } }
  else if (id === 'licence') { box('#fffaf0', 14, 12, 36, 42, 5); c.fillStyle = '#119a4b'; c.fillRect(15, 13, 34, 8); c.beginPath(); for (let i = 0; i < 3; i++) { c.moveTo(20, 30 + i * 7); c.lineTo(44, 30 + i * 7); } c.stroke(); c.fillStyle = '#e0a72a'; c.beginPath(); c.arc(42, 46, 6, 0, TAU); c.fill(); c.stroke(); }
  else if (id === 'scale') { box('#c9bea9', 12, 44, 40, 8, 4); c.beginPath(); c.moveTo(32, 44); c.lineTo(32, 30); c.stroke(); box('#fffaf0', 18, 14, 28, 18, 9); c.beginPath(); c.moveTo(32, 23); c.lineTo(39, 18); c.stroke(); }
  else if (id === 'perch') { drawBlock(c, 32, 18, 1.1, '#4f8a3a'); }
  else if (id.startsWith('hood')) { box('#8a5a34', 18, 20, 28, 30, 13); c.fillStyle = C.HOODS[id]; c.beginPath(); c.arc(32, 34, 14, Math.PI * 1.05, Math.PI * 1.95); c.closePath(); c.fill(); c.stroke(); c.strokeStyle = '#e0a72a'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(29, 20); c.lineTo(28, 10); c.moveTo(32, 19); c.lineTo(33, 8); c.moveTo(35, 20); c.lineTo(38, 11); c.stroke(); }
  else { // hospital: the active falcon with a small green cross card
    const b = C.active(s); drawFalcon(c, 26, 56, lookOf(s, b), { pose: 'block', s: 0.95 / lookOf(s, b).scale }); box('#fffaf0', 38, 10, 20, 20, 5); c.strokeStyle = '#119a4b'; c.lineWidth = 4; c.beginPath(); c.moveTo(48, 15); c.lineTo(48, 25); c.moveTo(43, 20); c.lineTo(53, 20); c.stroke(); }
}
U.registerSheet('market', 't_market', body => {
  const s = S.data(), b = C.active(s);
  const card = it => { const has = C.owned(s, it), worn = it.group === 'hood' && s.gear.hood === it.id;
    const fine = (it.id === 'imping' && b.fe >= 1) || (it.id === 'checkup' && b.hp >= 1) || (it.id === 'dna' && s.seen['dna' + b.id]);
    const label = worn ? T('sh_worn') : has ? (it.group === 'hood' ? T('sh_wear') : T('sh_have')) : fine ? T('sh_fine') : coinBtn(T('sh_buy'), it.price);
    return `<div class="card shopitem ${has ? 'has' : ''}"><canvas data-item="${it.id}" width="128" height="128" aria-hidden="true"></canvas><b>${T('it_' + it.id)}</b><small>${T('it_' + it.id + '_d')}</small>
      <button type="button" data-buy="${it.id}" ${(has && it.group !== 'hood') || worn || fine ? 'disabled' : ''}>${label}</button></div>`; };
  const group = (g, title) => `<p class="sec-title">${T(title)}</p><div class="cards">${C.SHOP.filter(it => it.group === g).map(card).join('')}</div>`;
  body.innerHTML = `<p class="hint">${T('shopNote')} ${T('sh_scale')}</p>` + group('food', 'sh_food') + group('papers', 'sh_papers') + group('gear', 'sh_gear') + group('hospital', 'sh_hospital') + group('hood', 'sh_hoods')
    + `<p class="sec-title">${T('sh_sell_t')}</p><p class="hint">${T('sh_sell')}</p>`;
  body.querySelectorAll('[data-item]').forEach(cv => itemArt(cv, cv.dataset.item, s));
  body.querySelectorAll('[data-buy]').forEach(x => { x.onclick = () => { if (body.moved) return; const r = C.buy(s, x.dataset.buy);
    if (r.ok) { S.save(); play(r.worn ? 'click' : 'coin'); U.note(r.worn ? T('sh_worn') : x.dataset.buy === 'dna' ? T('sh_dna_done', birdName(b)) : T('bought')); U.refreshCoins(); U.reopen(); } else { play('hit'); U.note(T(r.why === 'coins' ? 'notEnough' : 'sh_fine')); } }; });
});
U.registerSheet('compete', 't_compete', body => {
  body.innerHTML = `<p class="sec-title">${T('cp_soon_t')}</p><p>${T('cp_soon')}</p><p class="fact"><b>${T('did_you_know')}</b> ${T('fact_race_400')}</p><p class="fact"><b>${T('did_you_know')}</b> ${T('fact_race_ages')}</p>`;
});
