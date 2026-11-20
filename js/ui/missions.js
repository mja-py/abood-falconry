// Missions (today's three, the ladder, the badges) and the falconer's own page: who is playing, the record so far,
// and the backup that keeps a long career safe.
import { T, nf, setGirl, applyI18n } from '../i18n.js';
import * as S from '../save.js';
import * as U from '../ui.js';
import { play } from '../audio.js';
import * as C from '../sim/career.js';
import * as M from '../sim/missions.js';
import { person, ABOOD, MOZAH } from '../art.js';
import { coinBtn } from './falconcard.js';

const tabs = (cur, list) => `<div class="tabs" role="tablist">${list.map(t => `<button type="button" class="tab ${t === cur ? 'on' : ''}" data-tab="${t}" role="tab" aria-selected="${t === cur}">${T('ms_' + t)}</button>`).join('')}</div>`;
const row = (s, m, extra = '') => { const p = M.progress(s, m), d = p >= m.goal; return `<div class="mission ${d ? 'done' : ''} ${m.claimed ? 'claimed' : ''}"><div><b>${T('mk_' + m.k, m.goal)}</b><br><small dir="ltr">${nf(p)} / ${nf(m.goal)}</small></div>${extra}<div class="prog"><i style="width:${Math.round(p / m.goal * 100)}%"></i></div></div>`; };

U.registerSheet('missions', 't_missions', (body, p) => {
  const s = S.data(), tab = p.tab || 'daily', daily = S.dailyList(), day = S.loginDay();
  let h = tabs(tab, ['daily', 'ladder', 'badges']);
  if (tab === 'daily') {
    if (day >= 0) h += `<div class="mission done"><div><b>${T('lg_title')}</b><br><small>${T('lg_food', M.LOGIN[day])}</small></div><button type="button" id="lgClaim">${T('claim')}</button><div class="login-days">${M.LOGIN.map((n, i) => `<div class="${i < day ? 'done' : i === day ? 'today' : ''}"><b dir="ltr">${n}</b></div>`).join('')}</div></div>`;
    h += `<p class="sec-title">${T('ms_daily_t')}</p>` + daily.map((m, i) => row(s, m, `<button type="button" data-claim="${i}" ${m.claimed || !M.done(s, m) ? 'disabled' : ''}>${m.claimed ? T('claimed') : coinBtn(T('claim'), M.DAILY_REWARD)}</button>`)).join('') + `<p class="hint">${T('ms_note')}</p>`;
  } else if (tab === 'ladder') {
    h += `<p class="sec-title">${T('ms_ladder_t', s.ladder.lv)} <span class="multpill">× ${C.mult(s).toFixed(1)}</span></p>` + M.ladderSet(s).map(m => row(s, m)).join('') + `<p class="hint">${T('ms_ladder_note', M.ladderReward(s.ladder.lv))}</p>` + (M.girlOpen(s) ? '' : `<p class="hint">${T('ms_mozah', Math.max(0, M.GIRL_MISSIONS - s.missionsDone))}</p>`);
  } else {
    h += `<div class="cards">${M.BADGES.map(b => { const t = s.badges[b.id] || 0, goal = b.goal * [1, 10, 100][Math.min(2, t)], v = s.stats[b.stat] || 0;
      return `<div class="card ${t ? 'has' : ''}"><span class="tier">${T(t ? 'tier_' + (t - 1) : 'bg_locked')}</span><b style="margin-top:18px">${T('bd_' + b.id)}</b><small dir="ltr">${nf(Math.min(v, goal))} / ${nf(goal)}</small><div class="prog"><i style="width:${Math.round(Math.min(1, v / goal) * 100)}%"></i></div><small>${t >= 3 ? T('tier_2') : T('bg_reward', M.TIER_REWARD[Math.min(2, t)])}</small></div>`; }).join('')}</div>`;
  }
  body.innerHTML = h;
  body.querySelectorAll('[data-tab]').forEach(x => { x.onclick = () => U.openSheet('missions', { tab: x.dataset.tab }, { replace: true }); });
  body.querySelectorAll('[data-claim]').forEach(x => { x.onclick = () => { const n = M.claimDaily(s, +x.dataset.claim); if (n) { S.save(); play('coin'); U.note('+' + nf(n)); U.refreshCoins(); U.reopen(); } }; });
  const lg = body.querySelector('#lgClaim'); if (lg) lg.onclick = () => { const n = S.claimLogin(); if (n) { play('fanfare'); U.note(T('lg_food', n)); U.reopen(); } };
});
export const missionsDot = s => M.claimable(s) || S.loginDay() >= 0;

// ---- the falconer ----
let gate = null;
U.registerSheet('falconer', 'fa_title', (body, p) => {
  const s = S.data(), tab = p.tab || 'me';
  let h = `<div class="tabs" role="tablist">${['me', 'backup'].map(t => `<button type="button" class="tab ${t === tab ? 'on' : ''}" data-tab="${t}">${T('fa_' + t)}</button>`).join('')}</div>`;
  if (tab === 'me') {
    h += `<p class="sec-title">${T('w_char')}</p><div class="cards">${['abood', 'mozah'].map(ch => { const locked = ch === 'mozah' && !S.girlOpen(), on = S.char() === ch;
      return `<div class="card ${on ? 'on' : ''} ${locked ? 'locked' : ''}"><canvas data-char="${ch}" width="192" height="192" aria-hidden="true"></canvas><b>${T('ch_' + ch)}</b><button type="button" data-pick-char="${ch}" ${locked || on ? 'disabled' : ''}>${on ? T(ch === 'mozah' ? 'w_playingG' : 'w_playing') : locked ? T('bg_locked') : T(ch === 'mozah' ? 'w_pickG' : 'w_pick')}</button>${locked ? `<small>${T('ms_mozah', Math.max(0, M.GIRL_MISSIONS - s.missionsDone))}</small>` : ''}</div>`; }).join('')}</div>
      <p class="sec-title">${T('fa_record')}</p><div class="facts">${[['fa_years', C.yearOf(s.week) + 1], ['fa_outings', s.stats.outings], ['fa_catches', s.stats.catches], ['fa_chicks', s.stats.chicks], ['fa_facts', Object.keys(s.facts).length], ['fa_hours', (s.playSec / 3600).toFixed(1)]].map(([k, v]) => `<div class="factcard"><small>${T(k)}</small><b dir="ltr">${typeof v === 'number' ? nf(v) : v}</b></div>`).join('')}</div>`;
  } else {
    h += `<p class="hint">${T('bu_why')}</p><div class="code-box" id="buCode" tabindex="0" dir="ltr" role="textbox" aria-readonly="true" aria-label="${T('bu_code')}"></div>
      <div class="rowbtns"><button type="button" class="ghost" id="buMake">${T('bu_make')}</button><button type="button" class="ghost" id="buCopy">${T('bu_copy')}</button><button type="button" class="ghost" id="buFile">${T('bu_file')}</button></div>
      <p class="sec-title">${T('bu_restore_t')}</p><p class="hint">${T('bu_restore')}</p>
      <div class="rowbtns"><button type="button" class="ghost" id="buPaste">${T('bu_paste')}</button></div><p class="hint" id="buMsg"></p>`;
  }
  body.innerHTML = h;
  body.querySelectorAll('[data-tab]').forEach(x => { x.onclick = () => U.openSheet('falconer', { tab: x.dataset.tab }, { replace: true }); });
  body.querySelectorAll('canvas[data-char]').forEach(c => { const g = c.getContext('2d'); g.setTransform(2, 0, 0, 2, 0, 0); person(g, 48, 90, 0, false, Object.assign(c.dataset.char === 'mozah' ? MOZAH() : ABOOD(), { s: 1.25, still: 1 })); });
  body.querySelectorAll('[data-pick-char]').forEach(b => { b.onclick = () => { S.setChar(b.dataset.pickChar); setGirl(S.char() === 'mozah'); applyI18n(); play('pickup'); U.reopen(); }; });
  if (tab !== 'backup') return;
  const box = body.querySelector('#buCode'), msg = body.querySelector('#buMsg'), code = () => { if (!box.textContent) box.textContent = S.backup(); return box.textContent; };
  const pickAll = () => { const r = document.createRange(); r.selectNodeContents(box); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); };
  body.querySelector('#buMake').onclick = () => { box.textContent = S.backup(); play('pickup'); msg.textContent = T('bu_made'); U.fitSoon(); };
  body.querySelector('#buCopy').onclick = async () => { const text = code(); try { await navigator.clipboard.writeText(text); msg.textContent = T('bu_copied'); } catch (e) { pickAll(); msg.textContent = T('bu_select'); } };
  body.querySelector('#buFile').onclick = () => { const text = code(); try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' })); a.download = 'abood-falconry-' + S.today() + '.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); msg.textContent = T('bu_made'); } catch (e) { pickAll(); msg.textContent = T('bu_select'); } };
  body.querySelector('#buPaste').onclick = async () => { // a restore replaces the save, so a grown-up answers a sum first
    let text = ''; try { text = await navigator.clipboard.readText(); } catch (e) {}
    if (!text) text = prompt(T('bu_paste_ask')) || '';
    const r = S.peek(text); if (!r.ok) { play('hit'); msg.textContent = T('bu_bad_' + r.why) === 'bu_bad_' + r.why ? T('bu_bad') : T('bu_bad_' + r.why); return; }
    if (!gate) gate = [3 + Math.floor(Math.random() * 6), 4 + Math.floor(Math.random() * 5)];
    const ans = prompt(T('mp_gateQ', gate[0], gate[1])); if (+ans !== gate[0] * gate[1]) { play('hit'); msg.textContent = T('mp_gateWrong'); gate = null; return; }
    gate = null; const done = S.restore(text); if (done.ok) { play('fanfare'); setGirl(S.char() === 'mozah'); applyI18n(); U.closeAllSheets(); U.showMenu(); U.note(T('bu_restored')); }
  };
});
