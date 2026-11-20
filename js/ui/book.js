// The Falconer's Book (how to play, the facts collected so far, the words) and Baba's majlis, where a short story is
// followed by a question about it. A majlis visit is an outing: when it ends, a week has passed.
import { T, nf } from '../i18n.js';
import * as S from '../save.js';
import * as U from '../ui.js';
import { play } from '../audio.js';
import * as C from '../sim/career.js';
import { FACTS, QUIZ } from '../data/facts.js';
import { stream } from '../sim/rng.js';
import { person, BABA } from '../art.js';

const tabs = (cur, list, kind) => `<div class="tabs" role="tablist">${list.map(t => `<button type="button" class="tab ${t === cur ? 'on' : ''}" data-tab="${t}" role="tab" aria-selected="${t === cur}">${T('bk_' + t)}</button>`).join('')}</div>`;
const wireTabs = (body, kind) => body.querySelectorAll('[data-tab]').forEach(x => { x.onclick = () => U.openSheet(kind, { tab: x.dataset.tab }, { replace: true }); });
const HOW = ['how_1', 'how_2', 'how_3', 'how_4', 'how_5', 'how_6', 'how_7', 'how_8'];
const WORDS = ['burqa', 'mangalah', 'wakr', 'tilwah', 'farkh', 'jirnas', 'hurr', 'shaheen', 'jeer', 'hubara', 'saluqi', 'qanas'];

U.registerSheet('book', 't_book', (body, p) => {
  const s = S.data(), tab = p.tab || 'how', seen = FACTS.filter(f => s.facts[f.id]).length;
  let h = tabs(tab, ['how', 'facts', 'words'], 'book');
  if (tab === 'how') h += `<div class="facts">${HOW.map((k, i) => `<div class="factcard"><small dir="ltr">${i + 1}</small>${T(k)}</div>`).join('')}</div><p class="hint">${T('bd_model')}</p>`;
  else if (tab === 'facts') h += `<p class="hint">${T('bk_count', seen, FACTS.length)}</p><div class="facts">${FACTS.map(f => (s.facts[f.id] ? `<div class="factcard"><small>${T('cat_' + f.cat)}</small>${T('fact_' + f.id)}</div>` : `<div class="factcard shut">${T('bk_shut')}</div>`)).join('')}</div>`;
  else h += `<div class="facts">${WORDS.map(k => `<div class="factcard"><small>${T('wd_' + k)}</small>${T('wd_' + k + '_d')}</div>`).join('')}</div><p class="hint">${T('bk_words_note')}</p>`;
  body.innerHTML = h; wireTabs(body, 'book');
});

// ---- Baba's majlis ----
let round = null, onDone = null;
export const setMajlisDone = fn => { onDone = fn; };
function pickQuestions(s) { // three questions: facts not met yet first, and never the ones asked last time
  const r = stream(s.seed, 'quiz', s.ctr.quiz = (s.ctr.quiz || 0) + 1), pool = QUIZ.filter(q => !s.quiz.last.includes(q.id));
  const fresh = pool.filter(q => !s.facts[q.id]), old = pool.filter(q => s.facts[q.id]), out = [];
  const take = list => { while (out.length < 3 && list.length) out.push(list.splice(Math.floor(r() * list.length), 1)[0]); };
  take(fresh); take(old); take(QUIZ.filter(q => !out.includes(q))); return out;
}
export function startMajlis() { const s = S.data(); round = { qs: pickQuestions(s), i: 0, stage: 'story', right: 0, chosen: -1 }; U.openSheet('majlis', {}); }
function babaPic(cv, mouth) { const c = cv.getContext('2d'); c.setTransform(cv.width / 120, 0, 0, cv.height / 120, 0, 0); c.clearRect(0, 0, 120, 120); person(c, 56, 116, 0, false, Object.assign(BABA(), { s: 1.55, still: 1, mouth, arm: 'wave', t: 0.4 })); }
U.registerSheet('majlis', 'mj_title', body => {
  const s = S.data(); if (!round) { body.innerHTML = `<p>${T('mj_empty')}</p>`; return; }
  const q = round.qs[round.i], box = U.el('div', 'nopage quiz');
  if (round.stage === 'story') {
    box.innerHTML = `<canvas id="mjBaba" width="240" height="240" style="width:92px;height:92px;align-self:center" aria-hidden="true"></canvas><h3>${T('mj_story', round.i + 1, round.qs.length)}</h3><p>${T('fact_' + q.id)}</p><button type="button" class="btn" id="mjNext">${T('mj_got')}</button>`;
    body.appendChild(box); babaPic(box.querySelector('#mjBaba'), 'talk');
    box.querySelector('#mjNext').onclick = () => { s.facts[q.id] = 1; round.stage = 'ask'; round.chosen = -1; play('click'); U.reopen(); };
  } else if (round.stage === 'ask') {
    const opts = T('q_' + q.id + '_o'), done = round.chosen >= 0;
    box.innerHTML = `<h3>${T('q_' + q.id)}</h3><div class="opts">${opts.map((o, i) => `<button type="button" data-opt="${i}" class="${done && i === q.right ? 'right' : done && i === round.chosen ? 'wrong' : ''}" ${done ? 'disabled' : ''}>${o}</button>`).join('')}</div>
      <p>${done ? T(round.chosen === q.right ? 'mj_right' : 'mj_wrong') : T('mj_pick')}</p>${done ? `<button type="button" class="btn" id="mjNext">${T(round.i + 1 < round.qs.length ? 'mj_next' : 'mj_finish')}</button>` : ''}`;
    body.appendChild(box);
    box.querySelectorAll('[data-opt]').forEach(x => { x.onclick = () => { round.chosen = +x.dataset.opt; s.quiz.asked++; if (round.chosen === q.right) { round.right++; s.quiz.right++; s.stats.quizRight++; play('coin'); } else play('hit'); U.reopen(); }; });
    const nx = box.querySelector('#mjNext'); if (nx) nx.onclick = () => { play('click'); if (round.i + 1 < round.qs.length) { round.i++; round.stage = 'story'; U.reopen(); } else { round.stage = 'end'; U.reopen(); } };
  } else {
    const coins = Math.round(round.right * 15 * C.mult(s));
    box.innerHTML = `<canvas id="mjBaba" width="240" height="240" style="width:92px;height:92px;align-self:center" aria-hidden="true"></canvas><h3>${T(round.right === round.qs.length ? 'mj_all' : 'mj_some', round.right, round.qs.length)}</h3><p>${T('mj_pay', coins)}</p><button type="button" class="btn" id="mjEnd">${T('b_camp')}</button>`;
    body.appendChild(box); babaPic(box.querySelector('#mjBaba'), 'smile');
    box.querySelector('#mjEnd').onclick = () => { s.coins += coins; s.quiz.last = round.qs.map(x => x.id); s.stats.outings++; round = null; U.closeAllSheets(); const ev = C.weekTick(s); S.save(); if (onDone) onDone(ev); };
  }
});
