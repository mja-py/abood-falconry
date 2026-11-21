// DOM glue shared by every Abood game: menu, sheets, pause, results, toasts, loader, language picker, fullscreen.
// Game logic never touches the DOM directly: it calls these. Added for this game: sheets that route (a hub can open a
// page inside itself), the news card, and the family's no-scroll rule from Abood Space v3.7: nothing scrolls, rows and
// sheets are cut into pages measured on THIS screen and rebuilt when it changes.
import { T, TL, applyI18n, setLang, hasPickedLang, setGirl, nf, lang } from './i18n.js';
import * as S from './save.js';
import { play, unlockAudio, isMuted, setMuted } from './audio.js';

export const $ = id => document.getElementById(id);
export const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
let noteT = 0, bannerT = 0;
export const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M12 6l6 6-6 6"/></svg>';

export function note(text, ms = 1800) { const n = $('note'); if (!text) return; n.textContent = text; n.hidden = false; clearTimeout(noteT); noteT = setTimeout(() => { n.hidden = true; }, ms); }
export function banner(title, sub = '', ms = 2400) {
  const b = $('banner'); b.querySelector('b').textContent = title; b.querySelector('span').textContent = sub; b.hidden = false; b.classList.remove('in'); void b.offsetWidth; b.classList.add('in');
  clearTimeout(bannerT); bannerT = setTimeout(() => { b.hidden = true; }, ms);
}
export function refreshCoins() { document.querySelectorAll('.coinVal').forEach(e => { e.textContent = nf(S.coins()); }); }
export function pop(e) { if (!e || REDUCED) return; e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop'); }

// ---- loader ----
export function loader(f, msg) { $('ldFill').style.transform = `scaleX(${f})`; $('ldPct').textContent = Math.round(f * 100) + '%'; if (msg) $('ldMsg').textContent = msg; }
export function hideLoader() { const l = $('loader'); l.classList.add('done'); setTimeout(() => { l.hidden = true; }, 500); }

// ---- overlays ----
const OVERLAYS = ['menu', 'sheet', 'pause', 'over', 'langPick', 'friend', 'fPop', 'news'].filter(id => document.getElementById(id)); // friend / fPop exist only with the online module
export function show(id) { OVERLAYS.forEach(o => { $(o).hidden = o !== id; }); refreshCoins(); fitSoon(); }
export function hideMenus() { OVERLAYS.forEach(o => { $(o).hidden = true; }); }
export function showHud(on) { $('hud').hidden = !on; $('radar').hidden = !on; if (!on) { $('actBtn').hidden = true; $('tip').hidden = true; } }
export const shown = id => !$(id).hidden;

// ---- pages: nothing scrolls ----
const PG = {}, PGS = {};
function pgBtn(dir, dis, go) {
  const b = el('button', 'pg-btn ' + dir, ARROW); b.type = 'button'; b.disabled = !!dis; b.setAttribute('aria-label', T(dir === 'prev' ? 'pg_prev' : 'pg_next'));
  b.onclick = e => { e.stopPropagation(); if (b.disabled) return; play('click'); go(); }; return b;
}
function swipe(box, turn) { // a sideways drag turns the page (and never fires the card under the finger)
  let x0 = 0, y0 = 0, on = false; box.moved = false;
  box.onpointerdown = e => { on = true; box.moved = false; x0 = e.clientX; y0 = e.clientY; };
  box.onpointermove = e => { if (on && Math.abs(e.clientX - x0) > 12) box.moved = true; };
  box.onpointerup = box.onpointercancel = e => { if (!on) return; on = false; const dx = e.clientX - x0, dy = e.clientY - y0;
    if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.4) turn((dx < 0 ? 1 : -1) * (lang() === 'ar' ? -1 : 1)); setTimeout(() => { box.moved = false; }, 0); };
}
// a row of cards: as many as fit across, with an arrow at each end when there are more
export function pageRow(strip, key, selIdx, rerender) {
  strip.querySelectorAll(':scope > .pg-btn').forEach(b => b.remove());
  const kids = [...strip.children]; strip.classList.add('pg-row'); strip.classList.remove('pg-on'); strip.scrollLeft = 0; kids.forEach(k => { k.hidden = false; });
  const W0 = strip.clientWidth, N = kids.length; if (!W0 || N < 2) return;
  const cs = getComputedStyle(strip), gap = parseFloat(cs.columnGap) || parseFloat(cs.gap) || 8, cw = kids[0].getBoundingClientRect().width || 90;
  if (N <= Math.max(1, Math.floor((W0 + gap) / (cw + gap)))) { delete PG[key]; return; }
  const per = Math.max(1, Math.floor((W0 - 72 + gap) / (cw + gap))), pages = Math.ceil(N / per);
  if (PG[key] == null || PGS[key] !== selIdx) PG[key] = Math.floor(Math.max(0, selIdx) / per);
  PGS[key] = selIdx; const p = PG[key] = clamp(PG[key], 0, pages - 1);
  kids.forEach((k, i) => { k.hidden = Math.floor(i / per) !== p; }); strip.classList.add('pg-on');
  strip.appendChild(pgBtn('prev', p === 0, () => { PG[key] = p - 1; rerender(); }));
  strip.appendChild(pgBtn('next', p === pages - 1, () => { PG[key] = p + 1; rerender(); }));
  swipe(strip, d => { const q = clamp(p + d, 0, pages - 1); if (q !== p) { PG[key] = q; play('click'); rerender(); } });
}
// a sheet: its blocks are dealt onto pages no taller than the room this screen has. Grids of cards are split card by
// card, and a heading never ends a page alone. A sheet whose first child is .dr or .nopage lays itself out instead.
export function pageSheet(body, kind, keep) {
  const nav = $('sheetNav'); nav.hidden = true; nav.innerHTML = '';
  body.classList.remove('paged'); body.onpointerdown = body.onpointermove = body.onpointerup = body.onpointercancel = null;
  if (body.querySelector(':scope > .dr, :scope > .nopage')) return;
  const sheet = body.closest('.sheet'), maxS = parseFloat(getComputedStyle(sheet).maxHeight) || (innerHeight - 24);
  const maxH = Math.floor(maxS - (body.getBoundingClientRect().top - sheet.getBoundingClientRect().top) - 16);
  if (!(maxH > 80)) return;
  const units = [];
  for (const ch of [...body.children]) {
    if (ch.matches('.cards,.facts,.rows,.pairgrid')) for (const it of [...ch.children]) units.push({ n: it, g: ch.className });
    else if (ch.matches('.mission')) units.push({ n: ch, g: 'mrow' });
    else units.push({ n: ch, g: null, head: ch.matches('.sec-title,.hint,.tabs') });
  }
  body.innerHTML = ''; body.classList.add('paged');
  const pages = []; let page = null, gb = null, onPage = [];
  const open = () => { if (page) page.hidden = true; page = el('div', 'pg'); page.style.maxHeight = maxH + 'px'; body.appendChild(page); pages.push(page); gb = null; onPage = []; };
  const put = u => { if (u.g) { if (!gb || gb.className !== u.g) { gb = el('div', u.g); page.appendChild(gb); } gb.appendChild(u.n); } else { page.appendChild(u.n); gb = null; } onPage.push(u); };
  const take = () => { const u = onPage.pop(), par = u.n.parentNode; par.removeChild(u.n); if (par !== page && !par.childElementCount) { page.removeChild(par); gb = null; } else if (par !== page) gb = par; else { const last = page.lastElementChild, prev = onPage[onPage.length - 1]; gb = last && prev && prev.g && last.className === prev.g ? last : null; } return u; };
  open();
  for (const u of units) {
    put(u);
    if (page.scrollHeight > maxH + 1 && onPage.length > 1) { take(); const carry = []; while (onPage.length > 1 && onPage[onPage.length - 1].head) carry.unshift(take()); open(); for (const h of carry) put(h); put(u); }
  }
  const key = 'sheet:' + kind; let p = clamp(keep ? PG[key] | 0 : 0, 0, pages.length - 1);
  const showPage = q => {
    p = PG[key] = clamp(q, 0, pages.length - 1); pages.forEach((pg, i) => { pg.hidden = i !== p; pg.style.maxHeight = i === p && pg.scrollHeight > maxH + 1 ? 'none' : maxH + 'px'; }); fitSoon();
    if (pages.length < 2) return;
    nav.hidden = false; nav.innerHTML = ''; nav.appendChild(pgBtn('prev', p === 0, () => showPage(p - 1)));
    const lab = el('span', 'pg-n'); lab.setAttribute('dir', 'ltr'); lab.textContent = nf(p + 1) + ' / ' + nf(pages.length); nav.appendChild(lab);
    nav.appendChild(pgBtn('next', p === pages.length - 1, () => showPage(p + 1)));
  };
  showPage(p);
  if (pages.length > 1) swipe(body, d => { const q = clamp(p + d, 0, pages.length - 1); if (q !== p) { play('click'); showPage(q); } });
}
// every panel is measured against the screen it is on and scaled down when it would not fit: nothing is cut off
export function fitPanels() {
  try {
    for (const ov of document.querySelectorAll('.overlay')) {
      if (ov.hidden) continue; const p = ov.querySelector(':scope > .panel'); if (!p) continue;
      const paged = p.classList.contains('sheet') && $('sheetBody').classList.contains('paged');
      p.style.transform = ''; p.style.maxHeight = paged ? '' : 'none';
      if (paged) { const sb = $('sheetBody'); if (sb.scrollHeight > sb.clientHeight + 3) p.style.maxHeight = 'none'; }
      const cs = getComputedStyle(ov), ah = ov.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom), aw = ov.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const h = Math.max(p.offsetHeight, p.scrollHeight) + 6, w = p.offsetWidth, k = Math.min(1, ah / h, aw / w);
      if (k < 0.995 && k > 0.2) { p.style.transformOrigin = 'top center'; p.style.transform = 'translateY(' + Math.max(0, (ah - (h - 6) * k) / 2).toFixed(1) + 'px) scale(' + k.toFixed(3) + ')'; }
      else { p.style.maxHeight = ''; p.style.transformOrigin = ''; }
    }
  } catch (e) { console.error(e); }
}
let fitT = 0;
export function fitSoon() { if (fitT) return; fitT = setTimeout(() => { fitT = 0; fitPanels(); }, 30); }   // a timer, not a frame: it must also run while the page is in the background

// ---- sheets: one renderer per hub, and a stack so a hub can open a page inside itself and come back ----
const SHEETS = {}; let stack = [];
export function registerSheet(kind, titleKey, render) { SHEETS[kind] = { titleKey, render }; }
function renderTop(keep) {
  const top = stack[stack.length - 1], s = SHEETS[top.kind]; if (!s) return;
  $('sheetTitle').textContent = typeof s.titleKey === 'function' ? s.titleKey(top.params) : T(s.titleKey);
  $('sheetClose').textContent = T(stack.length > 1 ? 'b_back' : 'b_close');
  const body = $('sheetBody'); body.className = 'sheet-body'; body.innerHTML = ''; s.render(body, top.params || {}); applyI18n(body); show('sheet'); pageSheet(body, top.kind, keep); fitSoon();
}
// openSheet(kind, params): from the menu it starts a new stack; { push: true } opens a page on top of the current hub
export function openSheet(kind, params, o = {}) {
  if (!SHEETS[kind]) return; unlockAudio(); if (!o.quiet) play('click');
  if (o.push) stack.push({ kind, params }); else if (o.replace && stack.length) stack[stack.length - 1] = { kind, params }; else stack = [{ kind, params }];
  renderTop(!!o.keep);
}
export const reopen = () => { if (stack.length && shown('sheet')) renderTop(true); };
export const sheetKind = () => (stack.length && shown('sheet') ? stack[stack.length - 1].kind : null);
let onSheetClosed = null;
export function closeSheet() { play('click'); stack.pop(); if (stack.length) renderTop(true); else { stack = []; showMenu(); if (onSheetClosed) onSheetClosed(); } }
export function closeAllSheets() { stack = []; }

// ---- menu ----
let menuRender = null;
export const setMenuRenderer = fn => { menuRender = fn; };
export function showMenu() { show('menu'); if (menuRender) menuRender(); fitSoon(); }

// ---- news: what happened this week, one card at a time ----
let newsQueue = [], newsDone = null;
export function news(cards, done) { newsQueue = newsQueue.concat(cards || []); if (done) newsDone = done; if (!shown('news')) nextNews(); }
function nextNews() {
  const n = newsQueue.shift();
  if (!n) { const d = newsDone; newsDone = null; if (d) d(); else showMenu(); return; }
  $('newsKick').textContent = n.kick || ''; $('newsTitle').textContent = n.title || ''; $('newsText').textContent = n.text || '';
  const cv = $('newsCv'); cv.hidden = !n.art; if (n.art) { const c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); try { n.art(c, cv.width, cv.height); } catch (e) { console.error(e); } }
  $('newsOk').textContent = T(n.ok || 'b_ok'); show('news'); if (n.sfx !== false) play(n.sfx || 'pickup');
}

// ---- results: this outing's three numbers, the exchange counting up, a line from Baba, a fact ----
export function showResult(r) { // r: { win, title, quote, caught, meat, points, coins, mult, lines: [html], badges: [{ name }], fact, av(canvas) }
  const o = $('over'); o.classList.toggle('lose', !r.win); o.classList.toggle('win', !!r.win);
  $('overTitle').textContent = r.title; $('overQuote').textContent = r.quote || ''; $('overMsg').innerHTML = (r.lines || []).length ? r.lines[0] + ' ' + r.lines.slice(1).join(' · ') : '';
  $('sScore').textContent = nf(r.caught); $('sBest').textContent = '+' + nf(r.meat); $('sPicked').textContent = nf(r.points);
  $('swFrom').textContent = nf(r.points); $('swCoins').textContent = '0';
  $('swParts').innerHTML = `<span>${T('r_part_score', r.points)}</span><span class="hot">${T('r_part_mult', r.mult.toFixed(1))}</span>`;
  $('overBadges').innerHTML = (r.badges || []).map(b => `<span class="badge-chip">${b.name}</span>`).join('');
  const f = $('overFact'); f.hidden = !r.fact; if (r.fact) f.innerHTML = `<b>${T('did_you_know')}</b> ${r.fact}`;
  if (r.av) r.av($('avOver'));
  show('over');
  const t0 = performance.now(), dur = REDUCED ? 0 : 900;
  const tick = () => { const f2 = dur ? Math.min(1, (performance.now() - t0) / dur) : 1; $('swCoins').textContent = nf(Math.round(r.coins * f2)); if (f2 < 1) setTimeout(tick, 33); else { pop($('swCoins')); refreshCoins(); if (r.coins) play('coin', 1.2); } };
  tick();
}

// ---- wiring ----
export function initUI(h) { // h: { onPlay, onResume, onRestart, onQuit, onPause, onLangPicked, onAfterResult, onSheetClosed, onRelayout }
  applyI18n(); onSheetClosed = h.onSheetClosed || null;
  $('playBtn').onclick = () => { unlockAudio(); play('click'); h.onPlay(); };
  $('againBtn').onclick = () => { play('click'); h.onAfterResult(); };
  $('overMenuBtn').onclick = $('quitBtn').onclick = () => { play('click'); h.onQuit(); };
  $('resumeBtn').onclick = () => { play('click'); h.onResume(); };
  $('restartBtn').onclick = () => { play('click'); h.onRestart(); };
  $('pauseBtn').onclick = () => { unlockAudio(); h.onPause(); };
  $('sheetClose').onclick = closeSheet;
  $('newsOk').onclick = () => { play('click'); nextNews(); };
  document.querySelectorAll('.tile[data-sheet]').forEach(b => { b.onclick = () => openSheet(b.dataset.sheet); });
  const av = $('avBox'); av.onclick = () => openSheet('falconer'); av.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') openSheet('falconer'); };
  const mute = $('muteBtn'); const syncMute = () => mute.setAttribute('aria-pressed', String(isMuted()));
  mute.onclick = () => { unlockAudio(); setMuted(!isMuted()); syncMute(); if (!isMuted()) play('click'); }; syncMute();
  // full screen only where it exists and the game is not already installed
  const fs = $('fsBtn'), standalone = matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
  if (document.documentElement.requestFullscreen && !standalone) { fs.hidden = false; fs.onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); }; }
  document.querySelectorAll('.pick-btn').forEach(b => { b.onclick = () => { unlockAudio(); setLang(b.dataset.pick); play('click'); h.onLangPicked && h.onLangPicked(); }; });
  setGirl(S.char() === 'mozah');
  $('toastBtn').onclick = () => location.reload();
  addEventListener('keydown', e => { if (e.key === 'p' || e.key === 'P') h.onPause(); else if (e.key === 'Escape') { if (shown('sheet')) closeSheet(); else h.onPause(); } });
  // landscape check
  const rot = () => { const small = Math.min(innerWidth, innerHeight) < 600; $('rotate').hidden = !(small && innerHeight > innerWidth); };
  let relayT = 0; // the screen changed: forget the page numbers and lay everything out again
  addEventListener('resize', () => { rot(); clearTimeout(relayT); relayT = setTimeout(() => { for (const k in PG) delete PG[k]; if (shown('menu') && menuRender) menuRender(); if (shown('sheet')) renderTop(false); if (h.onRelayout) h.onRelayout(); fitPanels(); }, 160); }); rot();
}
export const needsLangPick = () => !hasPickedLang();
export { TL };
