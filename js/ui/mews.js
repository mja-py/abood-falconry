// My falcons: one bird on the stage with everything a child does to it beside it. Feed it, enhance it (train one of
// five skills with dirhams, as far as its genes allow), choose it for the hunt, or sell it.
import { T, nf } from '../i18n.js';
import * as S from '../save.js';
import * as U from '../ui.js';
import { play } from '../audio.js';
import * as C from '../sim/career.js';
import { birdPortrait, birdName, birdLine, colourName, geneChips, meter, coinBtn } from './falconcard.js';

let sel = 0, sure = 0;
export const selectBird = id => { sel = id; sure = 0; };
U.registerSheet('mews', 't_mews', body => {
  const s = S.data(), birds = C.mine(s); if (!birds.some(b => b.id === sel)) sel = s.active;
  const b = C.bird(s, sel), st = C.starsOf(b), isActive = b.id === s.active, flies = C.canFly(s, b), hungry = b.fed < C.HUNGRY, sellWhy = C.maySell(s, b), oi = C.orderFor(s, b), value = Math.round(C.price(s, b) * (oi >= 0 ? s.market.orders[oi].bonus : 1));
  const row = k => { const lv = b.lv[k], cap = st[k], cost = C.ENHANCE_COST[lv];
    return `<div class="upg"><span>${T('tr_' + k)}</span><div class="pips">${[0, 1, 2, 3, 4].map(i => `<i class="${i < lv ? 'on' : i >= cap ? 'no' : ''}"></i>`).join('')}</div><button type="button" data-enh="${k}" ${lv >= cap || !flies ? 'disabled' : ''}>${lv >= cap ? T('mw_max') : coinBtn(T('mw_up'), cost)}</button></div>`; };
  const dr = U.el('div', 'dr');
  dr.innerHTML = `<div class="dr-stage"><canvas id="mwCv" width="400" height="320" aria-hidden="true"></canvas><b>${birdName(b)}</b><small>${birdLine(s, b)} · ${colourName(C.genomeOf(b))}</small>${geneChips(b)}
      ${flies ? '' : `<small class="why">${T('mw_chick', C.FLY_AGE - C.age(s, b))}</small>`}</div>
    <div class="dr-side">
      ${meter(T('mw_fed'), b.fed, T(hungry ? 'mw_hungry' : b.fed >= 1 ? 'mw_full' : 'mw_ok'), hungry)}
      ${C.STATS.map(row).join('')}
      <div class="rowbtns"><button type="button" class="ghost" id="mwFeed" ${b.fed >= 1 || s.meat < 1 ? 'disabled' : ''}>${T('mw_feed', s.meat)}</button>
        ${isActive || !flies ? '' : `<button type="button" class="ghost red" id="mwPick">${T('mw_pick')}</button>`}
        <button type="button" class="ghost" id="mwSell" ${sellWhy ? 'disabled' : ''}>${sure === b.id ? coinBtn(T('mw_sure'), value) : coinBtn(T('mw_sell'), value)}</button></div>
    </div>
    <div class="dr-foot">${birds.length > 1 ? `<div class="roster" id="mwRoster">${birds.map(x => `<button type="button" class="rbird ${x.id === b.id ? 'on' : ''}" data-bird="${x.id}"><canvas width="112" height="92" aria-hidden="true"></canvas><span>${birdName(x)}</span></button>`).join('')}</div>` : `<p class="hint">${T(sellWhy === 'last' ? 'mw_last' : 'mw_hint')}</p>`}</div>`;
  body.appendChild(dr);
  birdPortrait(dr.querySelector('#mwCv'), s, b);
  dr.querySelectorAll('[data-enh]').forEach(x => { x.onclick = () => { const r = C.enhance(s, b.id, x.dataset.enh); if (r.ok) { S.save(); play('fanfare'); U.note(T('mw_better', birdName(b), T('tr_' + x.dataset.enh))); U.refreshCoins(); U.reopen(); } else { play('hit'); U.note(T(r.why === 'coins' ? 'notEnough' : 'mw_genes')); } }; });
  dr.querySelector('#mwFeed').onclick = () => { if (C.feed(s, b.id)) { S.save(); play('pickup'); U.reopen(); } };
  const pk = dr.querySelector('#mwPick'); if (pk) pk.onclick = () => { s.active = b.id; S.save(); play('pickup'); U.reopen(); };
  dr.querySelector('#mwSell').onclick = () => { if (sure !== b.id) { sure = b.id; play('click'); U.reopen(); return; } const r = C.sell(s, b.id); sure = 0; if (r.ok) { S.save(); play('coin'); U.note(T(r.order ? 'mw_sold_order' : 'mw_sold', r.coins)); U.refreshCoins(); sel = s.active; U.reopen(); } };
  const ro = dr.querySelector('#mwRoster');
  if (ro) { ro.querySelectorAll('.rbird').forEach(x => { const o = C.bird(s, +x.dataset.bird), c = x.querySelector('canvas'); birdPortrait(c, s, o, { s: 1.7 }); x.onclick = () => { if (ro.moved) return; sel = o.id; sure = 0; play('click'); U.reopen(); }; }); U.pageRow(ro, 'mews', birds.findIndex(x => x.id === b.id), U.reopen); }
});
export const mewsDot = s => s.meat > 0 && C.mine(s).some(b => b.fed < C.HUNGRY);
