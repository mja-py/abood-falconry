// The market: what the buyers are asking for, falcons for sale, meat, and more room at home.
// Dirhams are pretend: the first line says so. Selling a falcon is done from its own card in "My falcons".
import { T, nf } from '../i18n.js';
import * as S from '../save.js';
import * as U from '../ui.js';
import { play } from '../audio.js';
import * as C from '../sim/career.js';
import { unpack } from '../sim/genome.js';
import { stars, potential } from '../sim/phenotype.js';
import { portrait, lookOfGenome, colourName, coinBtn, starRow } from './falconcard.js';
import { INK } from '../art.js';

const orderText = o => o.want === 'colour' ? T('or_colour', T('col_' + o.v)) : o.want === 'sex' ? T('or_sex', T(o.v === 'f' ? 'sex_f' : 'sex_m')) : o.want === 'stat' ? T('or_stat', T('tr_' + o.stat), o.min) : T('or_rare', T('rg_' + o.v));
export const orderLine = o => `<div class="order"><span>${orderText(o)}</span><b dir="ltr">× ${o.bonus}</b></div>`;
function box(cv, kind) {
  const c = cv.getContext('2d'); c.setTransform(cv.width / 64, 0, 0, cv.height / 64, 0, 0); c.clearRect(0, 0, 64, 64); c.lineJoin = 'round'; c.strokeStyle = INK; c.lineWidth = 2;
  const r = (col, x, y, w, h, rad = 6) => { c.fillStyle = col; c.beginPath(); c.roundRect(x, y, w, h, rad); c.fill(); c.stroke(); };
  if (kind === 'meat' || kind === 'meat5') { const n = kind === 'meat' ? 1 : 3; for (let i = 0; i < n; i++) { r('#e9d3a3', 12 + i * 9, 34 - i * 7, 30, 18, 5); c.fillStyle = '#c8202b'; c.fillRect(13 + i * 9, 40 - i * 7, 28, 4); } }
  else if (kind === 'mews') { r('#8a5a34', 10, 30, 44, 24, 4); c.fillStyle = '#2f2622'; c.beginPath(); c.moveTo(6, 32); c.lineTo(32, 12); c.lineTo(58, 32); c.closePath(); c.fill(); c.stroke(); r('#1d6a8f', 26, 38, 12, 6, 3); }
  else { c.fillStyle = '#b98a55'; c.beginPath(); c.ellipse(32, 42, 22, 10, 0, 0, Math.PI * 2); c.fill(); c.stroke(); c.fillStyle = '#e9c9a0'; for (const x of [24, 34]) { c.beginPath(); c.ellipse(x, 36, 6, 8, 0, 0, Math.PI * 2); c.fill(); c.stroke(); } }
}
U.registerSheet('market', 't_market', body => {
  const s = S.data(), full = C.mine(s).length >= s.mewsCap, mc = C.mewsCost(s), nc = C.nestCost(s);
  const offer = (o, i) => { const g = unpack(o.g), p = potential(g), st = Math.round([p.speed, p.stamina, (p.stoop + p.burst + p.accuracy) / 3, p.agility, p.eyes].reduce((a, v) => a + stars(v), 0) / 5);
    return `<div class="card"><canvas data-offer="${i}" width="200" height="160" style="width:120px;height:96px" aria-hidden="true"></canvas><b>${T(g.sex === 'f' ? 'sex_f' : 'sex_m')} · ${colourName(g)}</b>${starRow(st)}<button type="button" data-buy="${i}" ${full ? 'disabled' : ''}>${full ? T('mk_full') : coinBtn(T('sh_buy'), o.price)}</button></div>`; };
  const item = (id, title, sub, btn, off) => `<div class="card shopitem"><canvas data-box="${id}" width="128" height="128" aria-hidden="true"></canvas><b>${title}</b><small>${sub}</small><button type="button" data-item="${id}" ${off ? 'disabled' : ''}>${btn}</button></div>`;
  body.innerHTML = `<p class="hint">${T('shopNote')}</p>
    <p class="sec-title">${T('mk_orders')}</p>${s.market.orders.map(orderLine).join('') || `<p class="hint">${T('mk_noorders')}</p>`}<p class="hint">${T('mk_sellhow')}</p>
    <p class="sec-title">${T('mk_falcons')}</p><div class="cards">${s.market.offers.map(offer).join('')}</div>
    <p class="sec-title">${T('mk_stock')}</p><div class="cards">${item('meat', T('it_meat'), T('mk_have', s.meat), coinBtn(T('sh_buy'), C.MEAT_PRICE))}${item('meat5', T('it_meat5'), T('it_meat5_d'), coinBtn(T('sh_buy'), Math.round(C.MEAT_PRICE * 5 * 0.9)))}
      ${item('mews', T('it_mews'), T('it_mews_d', s.mewsCap), mc == null ? T('mw_max') : coinBtn(T('sh_buy'), mc), mc == null)}${item('nest', T('it_nest'), T('it_nest_d', s.nestCap), nc == null ? T('mw_max') : coinBtn(T('sh_buy'), nc), nc == null)}</div>`;
  body.querySelectorAll('[data-offer]').forEach(cv => portrait(cv, lookOfGenome(unpack(s.market.offers[+cv.dataset.offer].g)), { s: 1.8, time: 'day' }));
  body.querySelectorAll('[data-box]').forEach(cv => box(cv, cv.dataset.box));
  const done = (r, msg) => { if (r.ok) { S.save(); play('coin'); U.note(msg); U.refreshCoins(); U.reopen(); } else { play('hit'); U.note(T(r.why === 'coins' ? 'notEnough' : r.why === 'full' ? 'mk_full' : 'mw_max')); } };
  body.querySelectorAll('[data-buy]').forEach(x => { x.onclick = () => { if (body.moved) return; done(C.buyFalcon(s, +x.dataset.buy), T('mk_bought')); }; });
  body.querySelectorAll('[data-item]').forEach(x => { x.onclick = () => { if (body.moved) return; const k = x.dataset.item; done(k === 'meat' ? C.buyMeat(s, 1) : k === 'meat5' ? C.buyMeat(s, 5) : k === 'mews' ? C.buyMews(s) : C.buyNest(s), T('bought')); }; });
});
