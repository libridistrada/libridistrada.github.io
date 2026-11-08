/* Libri di strada: funziona anche offline. Guscio in cache; catalogo e copertine aggiornati in sottofondo;
   i libri salvati stanno in IndexedDB (li gestisce la pagina), quelli dell'HP non passano da qui. */
const V = 'lds-33';
const GUSCIO = ['./', 'index.html', 'css/app.css', 'css/lettore.css', 'css/effetti.css', 'css/copertine.css', 'css/movimento.css', 'css/fondale.css', 'css/admin.css', 'css/lettore-libro.css', 'js/app.js', 'js/lettore.js', 'js/pubblica.js', 'js/movimento.js', 'js/fondale.js', 'js/sostieni.js', 'js/avvisi.js', 'js/admin.js', 'js/ascolta.js',
  'vendor/epub.min.js', 'vendor/jszip.min.js', 'manifest.webmanifest', 'img/icona-32.png', 'img/avviso-badge.png', 'img/segnaposto.webp', 'img/logo-breve.webp', 'img/targa.webp', 'img/targa-grande.webp', 'img/qr.png',
  'font/fraunces-latin-wght-normal.woff2', 'font/inter-latin-wght-normal.woff2', 'font/literata-latin-wght-normal.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(GUSCIO)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V && x !== 'lds-profilo').map(x => caches.delete(x)))).then(() => self.clients.claim())); });
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
  // la pagina (index.html) si chiede sempre al server: altrimenti il browser la tiene in memoria fino a 10 minuti e il telefono vede la versione vecchia
  const pagina = e.request.mode === 'navigate' || u.pathname.endsWith('/') || u.pathname.endsWith('.html');
  e.respondWith((pagina ? fetch(u.href, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(e.request)).then(r => { if (r.ok) { const copia = r.clone(); caches.open(V).then(c => c.put(e.request, copia)); } return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});

// avvisi «libri nuovi»: arrivano cifrati dall'HP solo a chi li ha chiesti; al tocco si apre il sito
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { testo: e.data ? e.data.text() : '' }; }
  e.waitUntil(proposta(d).then(p => {
    const dove = new URL((p && p.url) || d.url || './#/', self.registration.scope);
    const url = dove.origin === location.origin ? dove.href : self.registration.scope;
    return self.registration.showNotification((p && p.titolo) || d.titolo || 'Libri di strada', {
      body: (p && p.testo) || d.testo || 'Ci sono libri nuovi da leggere', icon: 'img/icona-192.png', badge: 'img/avviso-badge.png',
      ...(p && p.immagine ? { image: p.immagine } : {}), tag: 'libri-nuovi', data: { url } });
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(lista => {
    const aperta = lista.find(c => c.url.startsWith(self.registration.scope));
    if (aperta) return aperta.focus().then(c => (c && c.navigate ? c.navigate(url) : c));
    return self.clients.openWindow(url);
  }));
});

// proposta su misura, scelta qui sul telefono: incrocia i libri letti, salvati e aperti (profilo locale) con il catalogo
// e con le novità della settimana. Stesso autore, stessi scaffali, l'episodio successivo di un fumetto.
async function proposta(d) {
  try {
    const base = self.registration.scope;
    const pr = await (await caches.open('lds-profilo')).match(new URL('profilo-locale.json', base).href);
    if (!pr) return null;
    const prof = await pr.json();
    const rc = (await caches.match(new URL('data/catalogo.json', base).href, { ignoreSearch: true })) || await fetch(new URL('data/catalogo.json', base).href);
    const libri = (await rc.json()).libri || [];
    const per = new Map(libri.map(b => [b.id, b]));
    const letti = prof.letti || [], salvati = prof.salvati || [], visti = prof.visti || [];
    const noti = new Set([...letti, ...salvati, ...visti]);
    const semi = [...new Set([...letti, ...salvati, ...visti])].map(id => per.get(id)).filter(Boolean);
    if (!semi.length) return null;
    const COLLETTIVI = /^Autori di|Libri di strada/;
    const pesoAut = new Map(), pesoSc = new Map(), pesoCat = new Map();
    semi.forEach(b => {
      const w = letti.includes(b.id) ? 3 : salvati.includes(b.id) ? 2 : 1;
      (b.a || []).filter(a => !COLLETTIVI.test(a)).forEach(a => pesoAut.set(a, (pesoAut.get(a) || 0) + w));   // «Autori di Wikipedia» non è un autore
      [...(b.sf || []), ...(b.s || [])].forEach(x => pesoSc.set(x, (pesoSc.get(x) || 0) + w));
      pesoCat.set(b.c, (pesoCat.get(b.c) || 0) + w);
    });
    const nuovi = new Set(d.nuovi || []);
    const epLetto = Math.max(0, ...semi.filter(b => b.fu).map(b => b.ep || 0));
    const punti = b => {
      let p = (b.a || []).reduce((t, a) => t + (pesoAut.get(a) || 0) * 3, 0)
        + [...(b.sf || []), ...(b.s || [])].reduce((t, x) => t + (pesoSc.get(x) || 0) * 2, 0) + (pesoCat.get(b.c) || 0) * 0.5;
      if (b.fu && epLetto && b.ep === epLetto + 1) p += 100;    // il prossimo episodio del fumetto
      if (!p) return 0;
      if (nuovi.has(b.id)) p += 1.5;   // una novità ha un piccolo vantaggio, ma vince l'affinità
      if (b.mod) p *= 1.2;
      return p * (1 + Math.min(b.v || 0, 50) / 300);   // la popolarità conta poco: contano i gusti
    };
    let migliore = null, max = 0;
    for (const b of libri) { if (noti.has(b.id)) continue; const p = punti(b); if (p > max) { max = p; migliore = b; } }
    if (!migliore) return null;
    const seme = semi.find(s => (s.a || []).some(a => !COLLETTIVI.test(a) && (migliore.a || []).includes(a)))
      || semi.find(s => [...(s.sf || []), ...(s.s || [])].some(x => [...(migliore.sf || []), ...(migliore.s || [])].includes(x))) || semi[0];
    const novPerTe = [...nuovi].map(id => per.get(id)).filter(b => b && !noti.has(b.id) && b.id !== migliore.id && punti(b) > 0).length;
    const autore = migliore.a && migliore.a[0] && !/^Autori di/.test(migliore.a[0]) ? ` di ${migliore.a[0]}` : '';
    const copertina = migliore.cov ? new URL(`copertine/${migliore.cov === 1 ? migliore.id : migliore.cov}.webp`, base).href : null;
    return {
      titolo: 'Per te, questa settimana',
      testo: `Ti è piaciuto «${seme.t}»? Prova «${migliore.t}»${autore}.` + (novPerTe > 1 ? ` E ci sono ${novPerTe} novità che fanno per te.` : ''),
      url: new URL('#/libro/' + encodeURIComponent(migliore.id), base).href, immagine: copertina,
    };
  } catch { return null; }
}
