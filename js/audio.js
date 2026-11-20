// Sound for an Abood family game: ZzFX effects baked once at load, and a tiny synthesised tune in the Hijaz maqam on D
// with a maqsum darbuka (dum / tek). The same coin, pickup, hit, whoosh, close-call, zone, lose, dum and tek params
// play in Run, Abood! and Abood Space, so a player hears one family. Add game-specific effects below the shared block.
import { muted as savedMuted, setMuted as persistMuted } from './save.js';

export const SFX_DEF = { // name: [zzfx params, volume]
  // ---- shared family vocabulary (keep as is) ----
  coin:    [[1, 0, 1400, 0, .02, .12, 1, 1.6, 0, 0, 520, .04, 0, 0, 0, 0, 0, .6, .01], .3],
  pickup:  [[1, 0, 440, .02, .2, .35, 0, 1.6, 0, 0, 220, .07, .07, 0, 0, 0, 0, .8, .02], .5],
  hit:     [[1, .1, 120, 0, .04, .28, 4, 2.2, -8, 0, 0, 0, 0, 1.5, 0, .15, 0, .6, .04], .6],
  whoosh:  [[1, .2, 500, .06, .06, .24, 3, 1, -18, 0, 0, 0, 0, .8, 0, 0, 0, .5, .05], .4],
  close:   [[1, 0, 900, 0, .03, .14, 0, 2, 0, 0, 450, .05, 0, 0, 0, 0, 0, .6], .35],
  zone:    [[1, 0, 520, .02, .3, .45, 0, 1.4, 0, 0, 260, .12, .12, 0, 0, 0, 0, .7, .02], .45],
  lose:    [[1, 0, 330, .02, .25, .6, 1, 1.4, -2.5, 0, -110, .18, 0, 0, 0, 0, 0, .7, .05], .5],
  fanfare: [[1, 0, 392, .02, .45, .55, 1, 1.4, 0, 0, 196, .14, 0, 0, 0, 0, 0, .8, .05], .4],
  click:   [[1, 0, 1200, 0, 0, .03, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, .5, 0], .18],
  dum:     [[1, 0, 95, 0, .02, .22, 0, 3, -3.5, 0, 0, 0, 0, 0, 0, 0, 0, .4, .05], .9],
  tek:     [[1, 0, 1800, 0, 0, .05, 4, 1, 0, 0, 0, 0, 0, 4, 0, 0, 0, .3, .02], .3],
  // ---- this game ----
  jump:    [[1, .05, 180, 0, .05, .12, 0, 1.6, 9.5, 0, 0, 0, 0, 0, 0, 0, 0, .6, .02], .5],
};

let ZZ = null, actx = null, master = null, musicBus = null, mutedNow = savedMuted();
const SND = {};
// one sound per frame keeps the loader moving; the timer is there so a tab opened in the background still finishes loading
const nextFrame = () => new Promise(r => { let done = false; const go = () => { if (!done) { done = true; r(); } }; requestAnimationFrame(go); setTimeout(go, 60); });

export async function initAudio(onProgress) {
  try { ZZ = (await import('./vendor/zzfx.js?v=__BUILD__')).ZZFX; actx = ZZ.audioContext; }
  catch (e) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e2) { actx = null; } }
  if (!actx) return;
  master = actx.createGain(); master.gain.value = mutedNow ? 0 : 1; master.connect(actx.destination);
  musicBus = actx.createGain(); musicBus.gain.value = 0; musicBus.connect(master);
  if (!ZZ) return;
  const list = Object.entries(SFX_DEF);
  for (let i = 0; i < list.length; i++) {
    const [name, [p, vol]] = list[i];
    try { const s = ZZ.buildSamples(...p); const b = actx.createBuffer(1, s.length, ZZ.sampleRate); b.getChannelData(0).set(s); SND[name] = { b, vol }; } catch (e) {}
    if (onProgress) onProgress((i + 1) / list.length);
    await nextFrame();
  }
}
let unlocked = false;
export function unlockAudio() { // call from the first user gesture (iOS)
  if (!actx) return;
  if (actx.state === 'suspended') actx.resume().catch(() => {});
  if (!unlocked) { unlocked = true; try { const s = actx.createBufferSource(); s.buffer = actx.createBuffer(1, 1, 22050); s.connect(actx.destination); s.start(0); } catch (e) {} }
}
export function play(name, rate = 1, vol = 1, at = 0, bus = master) {
  const s = SND[name]; if (!s || !actx || mutedNow || actx.state !== 'running') return;
  const src = actx.createBufferSource(), g = actx.createGain();
  src.buffer = s.b; src.playbackRate.value = rate; g.gain.value = s.vol * vol;
  src.connect(g).connect(bus); src.start(at || actx.currentTime);
}
function tone(f, d, type, vol, at, bus = master) {
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, at); g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.0001, at + d);
  o.connect(g).connect(bus); o.start(at); o.stop(at + d + 0.02);
}
export const isMuted = () => mutedNow;
export function setMuted(b) { mutedNow = !!b; persistMuted(mutedNow); if (master) master.gain.value = mutedNow ? 0 : 1; }

// ---- music: Hijaz on D (D E♭ F# G A B♭ C D), maqsum rhythm: dum . tek . dum . tek tek ----
const HIJAZ = [0, 1, 4, 5, 7, 8, 10, 12, 13, 16];
const MEL = [0, -1, 1, 2, 3, -1, 2, 1, 2, -1, 3, 4, 5, 4, 3, 2, 4, -1, 5, 4, 3, 2, 1, 2, 3, 2, 1, -1, 0, -1, -1, -1,
  4, -1, 5, 6, 7, -1, 6, 5, 4, 5, 4, 3, 2, -1, 1, -1, 3, 4, 5, 4, 3, -1, 2, 1, 2, 1, 0, 1, 0, -1, -1, -1];
const BASS = [0, 0, 4, 4, 3, 3, 0, 0];
let nextNote = 0, step = 0, musicOn = false;
export let BPM = 120; // Run, Abood! 138 (a chase), Abood Space 84 (a drift). Pick what fits the game's pace.
export const setBpm = b => { BPM = b; };
function fade(v) { if (musicBus && actx) try { musicBus.gain.setTargetAtTime(v, actx.currentTime, v > 0 ? 0.4 : 0.15); } catch (e) {} }
// call every frame; `want` is true while the game is in play. Schedules ~150 ms ahead on the audio clock.
export function music(want) {
  if (!actx || mutedNow || actx.state !== 'running' || !want || document.hidden) {
    if (musicOn) { musicOn = false; fade(0); }
    if (actx) nextNote = actx.currentTime + 0.05; return;
  }
  if (!musicOn) { musicOn = true; fade(1); step -= step % 16; }
  const SP = 60 / BPM / 2;
  if (nextNote < actx.currentTime) nextNote = actx.currentTime + 0.05;
  while (nextNote < actx.currentTime + 0.15) {
    const s = step % MEL.length, b = step % 8, at = nextNote;
    if (MEL[s] >= 0) { const f = 293.66 * Math.pow(2, HIJAZ[MEL[s]] / 12); tone(f, SP * 1.6, 'triangle', 0.02, at, musicBus); tone(f * 2, SP * 0.7, 'square', 0.004, at, musicBus); }
    if (b === 0 || b === 4) play('dum', b === 0 ? 1 : 0.9, 0.5, at, musicBus);
    if (b === 1 || b === 3 || b === 6) play('tek', 1, b === 3 ? 0.5 : 0.35, at, musicBus);
    if (s % 4 === 0) tone(146.83 * Math.pow(2, HIJAZ[BASS[(s / 4 | 0) % 8]] / 12), SP * 3, 'sine', 0.03, at, musicBus);
    nextNote += SP; step++;
  }
}
export function buzz(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }
