/* Libri di strada: funziona anche offline. Guscio in cache; catalogo e copertine aggiornati in sottofondo;
   i libri salvati stanno in IndexedDB (li gestisce la pagina), quelli dell'HP non passano da qui. */
const V = 'lds-2';
const GUSCIO = ['./', 'index.html', 'css/app.css', 'css/lettore.css', 'css/effetti.css', 'css/lettore-libro.css', 'js/app.js', 'js/lettore.js', 'js/pubblica.js',
  'vendor/epub.min.js', 'vendor/jszip.min.js', 'manifest.webmanifest', 'img/icona.svg',
  'font/fraunces-latin-wght-normal.woff2', 'font/inter-latin-wght-normal.woff2', 'font/literata-latin-wght-normal.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(GUSCIO)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  // catalogo e copertine: subito dalla cache, intanto si aggiorna
  if (u.pathname.endsWith('/data/catalogo.json') || u.pathname.includes('/copertine/') || u.pathname.includes('/font/')) {
    e.respondWith(caches.open(V).then(async c => {
      const vecchio = await c.match(e.request);
      const nuovo = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => vecchio);
      return vecchio || nuovo;
    }));
    return;
  }
  if (u.pathname.includes('/riserva/')) return;   // ePub di riserva: li salva la pagina se serve
  // pagine e codice: prima la rete (così gli aggiornamenti arrivano), se manca la cache
  e.respondWith(fetch(e.request).then(r => { if (r.ok) caches.open(V).then(c => c.put(e.request, r.clone())); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
