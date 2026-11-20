// Service worker: caches the whole game so it loads instantly and plays offline.
// deploy.sh replaces __BUILD__ with the commit id, so every release gets a fresh cache.
// Other Abood games may live on the same origin: this worker only ever touches caches named 'abood-falconry-*'.
const VERSION = '__BUILD__';
const CACHE = 'abood-falconry-' + VERSION;
const ASSETS = [
  './', './assets/fonts/baloo-bhaijaan-2-arabic-500-normal.woff2', './assets/fonts/baloo-bhaijaan-2-arabic-700-normal.woff2',
  './assets/fonts/baloo-bhaijaan-2-arabic-800-normal.woff2', './assets/fonts/baloo-bhaijaan-2-latin-500-normal.woff2',
  './assets/fonts/baloo-bhaijaan-2-latin-700-normal.woff2', './assets/fonts/baloo-bhaijaan-2-latin-800-normal.woff2', './assets/icons/favicon-32.png',
  './css/theme.css', './index.html', './js/art.js', './js/art/desert.js', './js/art/falcon.js', './js/audio.js', './js/data/facts.js',
  './js/data/loci.js', './js/data/names.js', './js/data/quarry.js', './js/game.js', './js/i18n.js', './js/i18n/facts.js', './js/i18n/strings.js',
  './js/net.js', './js/race.js', './js/save.js', './js/scenes/hunt.js', './js/sim/bits.js', './js/sim/breed.js', './js/sim/career.js',
  './js/sim/codes.js', './js/sim/genome.js', './js/sim/hunt-bot.js', './js/sim/hunt-sim.js', './js/sim/missions.js', './js/sim/pedigree.js',
  './js/sim/phenotype.js', './js/sim/rng.js', './js/sim/state.js', './js/ui.js', './js/ui/book.js', './js/ui/breed.js', './js/ui/falconcard.js',
  './js/ui/market.js', './js/ui/mews.js', './js/ui/missions.js', './js/vendor/peerjs.min.js', './js/vendor/zzfx.js', './manifest.webmanifest',
  './assets/icons/icon-192.png', './assets/icons/icon-512.png', './assets/icons/icon-maskable-512.png', './assets/icons/apple-touch-icon.png',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(ASSETS.map(a => c.add(a).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('abood-falconry-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return res;
  }).catch(() => caches.match('./index.html'))));
});
