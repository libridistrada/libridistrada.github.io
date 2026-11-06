/* Libri di strada — il sito. Nessuna libreria esterna oltre al lettore; nessun cookie. */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const app = $('#app');

  // raccolte a tema (in evidenza) e colori delle categorie: [scuro, medio, chiaro]
  const RACCOLTE = {
    'Guide di oggi': { d: 'Intelligenza artificiale, sport, allenamento, cibo, spazio, musica: aggiornate ogni mese', c: ['#05051f', '#2d5bff', '#3affc3'],
      i: '<svg viewBox="0 0 24 24"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>' },
    'Lingue': { d: 'Inglese, francese, tedesco, spagnolo, cinese, polacco e altre 20 lingue: corsi e frasari', c: ['#1f0533', '#c2187b', '#ffb703'],
      i: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/></svg>' },
    'Autori emergenti': { d: 'Libri di oggi, regalati da chi li ha scritti', c: ['#3a2304', '#c27c0e', '#ffcf5c'],
      i: '<svg viewBox="0 0 24 24"><path d="M12 3l2.2 5.6L20 9.3l-4.5 3.9 1.4 5.8L12 16l-4.9 3 1.4-5.8L4 9.3l5.8-.7z"/></svg>' },
    'Roma': { d: 'Belli, Trilussa, Pascarella, Zanazzo: la città in dialetto, in versi e in cucina', c: ['#3d1206', '#c2461f', '#ff8a4c'],
      i: '<svg viewBox="0 0 24 24"><path d="M3 20h18M4 20V9h16v11M4 9l8-5 8 5M7 20v-6a2 2 0 0 1 4 0v6M13 20v-6a2 2 0 0 1 4 0v6"/></svg>' },
    'Horror e fantastico': { d: 'Vampiri, spettri e notti scapigliate', c: ['#1a0307', '#7d0d22', '#ff3355'],
      i: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/><path d="M15 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/></svg>' },
    'Esoterismo e mistero': { d: 'Magia, alchimia, cabala e filosofia occulta', c: ['#120a33', '#4b2fb0', '#a98bff'],
      i: '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4 4l1.5 1.5M20 4l-1.5 1.5"/></svg>' },
    'Lavoro e formazione': { d: 'Manuali, corsi e trattati per imparare un mestiere', c: ['#032224', '#0f7c6c', '#3fe0bf'],
      i: '<svg viewBox="0 0 24 24"><path d="M3 9l9-5 9 5-9 5z"/><path d="M7 11.5V16c0 1.5 2.2 3 5 3s5-1.5 5-3v-4.5M21 9v6"/></svg>' },
  };
  const CATEGORIE = {
    'Romanzi': ['#2a1505', '#a5531a', '#ffa552'], 'Racconti e novelle': ['#04202a', '#11708f', '#4fd1ff'],
    'Poesia': ['#2a0627', '#a01d7f', '#ff6fd8'], 'Teatro': ['#2a0505', '#b0182b', '#ffb03b'],
    'Ragazzi e fiabe': ['#0d2a05', '#4f9a14', '#c6ff5c'], 'Storia e biografie': ['#2a2105', '#9a7a12', '#ffe066'],
    'Saggi e pensiero': ['#060f2e', '#2747b5', '#7aa2ff'], 'Lettere': ['#2e0a14', '#b03b5c', '#ff9eb5'],
    'Scienza e curiosità': ['#022427', '#0b8a96', '#5ff2ff'], 'Lavoro e formazione': ['#032224', '#0f7c6c', '#3fe0bf'],
    'Avventura e pirati': ['#2a1803', '#b3620b', '#ffb547'], 'Gialli e misteri': ['#0b0b14', '#2e2e52', '#8f8fff'],
    'Fantascienza': ['#03162a', '#0d5bb3', '#43e0ff'], 'Amore e passioni': ['#2e0516', '#b3164f', '#ff7aa8'],
    'Romanzi storici': ['#251a0a', '#7d5a23', '#e8bf6a'], 'Viaggi ed esplorazioni': ['#03211c', '#0f7a5e', '#6ff0c2'],
    'Umorismo e satira': ['#2a2203', '#b39a0b', '#fff15c'], 'Classici stranieri': ['#120a24', '#5a3aa6', '#c4a6ff'],
    'Greci e latini': ['#1c1a14', '#6b6352', '#e8dcc0'], 'I best seller di sempre': ['#2a0c03', '#c2410c', '#ffd166'],
    'Opera e libretti': ['#22050f', '#8a1538', '#ff9ebb'], "Dialetti d'Italia": ['#0a2206', '#2f8a1f', '#a6ff6f'],
    'Religione e spiritualità': ['#1a1630', '#4b4499', '#d8cfff'],
    'Corsi e professioni': ['#04172a', '#1565c0', '#64ffda'], 'Tecnologia e IA': ['#05051f', '#2d5bff', '#3affc3'],
    'Sport e benessere': ['#1f1405', '#ff6b00', '#c6ff00'], 'Musica e spettacolo': ['#1f0533', '#8338ec', '#ff006e'],
    'Lingue': ['#1f0533', '#c2187b', '#ffb703'], 'Guide di oggi': ['#05051f', '#2d5bff', '#3affc3'],
  };
  // i reparti della libreria, come entrando in una grande libreria
  const REPARTI = [
    ['Di oggi', ['Tecnologia e IA', 'Sport e benessere', 'Musica e spettacolo', 'Corsi e professioni']],
    ['Generi', ['Avventura e pirati', 'Gialli e misteri', 'Fantascienza', 'Amore e passioni', 'Romanzi storici', 'Viaggi ed esplorazioni', 'Umorismo e satira']],
    ['Classici', ['I best seller di sempre', 'Classici stranieri', 'Greci e latini']],
    ['Narrativa e poesia', ['Romanzi', 'Racconti e novelle', 'Poesia', 'Teatro', 'Lettere']],
    ['Musica, dialetti e spirito', ['Opera e libretti', "Dialetti d'Italia", 'Religione e spiritualità']],
    ['Sapere', ['Storia e biografie', 'Saggi e pensiero', 'Scienza e curiosità', 'Lavoro e formazione']],
    ['Ragazzi', ['Ragazzi e fiabe']],
  ];
  const FREGI = [
    '<svg viewBox="0 0 60 30"><path d="M2 15h18M40 15h18M30 4c-6 6-6 16 0 22 6-6 6-16 0-22z"/><circle cx="30" cy="15" r="2.4"/></svg>',
    '<svg viewBox="0 0 60 30"><path d="M4 22c8-14 18-14 26 0 8-14 18-14 26 0"/><path d="M14 8h32"/></svg>',
    '<svg viewBox="0 0 60 30"><path d="M30 3l5 12-5 12-5-12z"/><path d="M4 15h16M40 15h16"/></svg>',
    '<svg viewBox="0 0 60 30"><circle cx="30" cy="15" r="10"/><circle cx="30" cy="15" r="4"/><path d="M2 15h14M44 15h14"/></svg>',
  ];

  const S = { cat: null, libri: [], per: new Map(), server: null, online: null, filtro: null };
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem('lds:' + k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('lds:' + k, JSON.stringify(v)); } catch { /* privato */ } },
  };

  // ---------------------------------------------------------------- libri salvati sul telefono (IndexedDB)
  const db = (() => {
    let p;
    const open = () => p || (p = new Promise((res, rej) => {
      const r = indexedDB.open('libridistrada', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('libri');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }));
    const tx = async (mode, fn) => { const d = await open(); return new Promise((res, rej) => {
      const t = d.transaction('libri', mode); const q = fn(t.objectStore('libri')); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }); };
    return {
      get: id => tx('readonly', s => s.get(id)).catch(() => null),
      put: (id, v) => tx('readwrite', s => s.put(v, id)),
      del: id => tx('readwrite', s => s.delete(id)),
      keys: () => tx('readonly', s => s.getAllKeys()).catch(() => []),
    };
  })();

  // ---------------------------------------------------------------- statistiche anonime (verso l'HP)
  function conta(e, id) {
    if (!S.server) return;
    const u = `${S.server}/conta?e=${e}${id ? '&id=' + encodeURIComponent(id) : ''}`;
    try { fetch(u, { mode: 'no-cors', keepalive: true, cache: 'no-store' }).catch(() => {}); } catch { /* */ }
  }

  // ---------------------------------------------------------------- utilità
  let toastT;
  function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2600); }
  const hash = s => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
  const colori = b => coloriCopertina(b);
  const autori = b => (b.a || []).join(', ');
  const mb = n => n > 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1e3)) + ' KB';
  const vita = b => b.n || b.m ? ` (${b.n || '?'}–${b.m || '?'})` : '';
  const ico = {
    play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12.5-7.5z"/></svg>',
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
    giu: '<svg viewBox="0 0 24 24"><path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19.5h14"/></svg>',
    salva: '<svg viewBox="0 0 24 24"><path d="M6 3.5h12v17l-6-4-6 4z"/></svg>',
    ok: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    freccia: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    avanti: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  };
  const progresso = id => (store.get('pos', {})[id] || {}).p || 0;

  // ---------------------------------------------------------------- copertina: poster grafico contemporaneo
  // [sfondo, accento, testo]. Le raccolte a tema hanno tavolozze proprie, gli altri libri pescano tra quelle vivaci.
  const TAVOLOZZE = [
    ['#ff5a36', '#1b1b3a', '#fff4e6'], ['#2d5bff', '#ffd23f', '#ffffff'], ['#00c2a8', '#ff3d7f', '#0e1116'], ['#ffcc00', '#e4002b', '#111111'],
    ['#7b2ff7', '#ff9f1c', '#f7f7ff'], ['#111111', '#c6ff00', '#f2f2f2'], ['#ff7aa2', '#2b2d42', '#ffffff'], ['#06d6a0', '#118ab2', '#06231f'],
    ['#f94144', '#f9c74f', '#1d1d1d'], ['#3a86ff', '#ff006e', '#ffffff'], ['#ffbe0b', '#3a0ca3', '#1a0f3a'], ['#e9ff70', '#ff70a6', '#1b1b1b'],
    ['#3d348b', '#ff8fab', '#ffffff'], ['#011627', '#2ec4b6', '#fdfffc'], ['#fb5607', '#ffe8d6', '#2b0d00'], ['#8338ec', '#3affc3', '#ffffff'],
  ];
  const TAVOLOZZE_TEMA = {
    'Guide di oggi': [['#2d5bff', '#3affc3', '#ffffff'], ['#0b0b0b', '#c6ff00', '#ffffff'], ['#ff006e', '#ffbe0b', '#ffffff'], ['#8338ec', '#3affc3', '#ffffff'], ['#3affc3', '#05051f', '#05051f']],
    'Lingue': [['#c2187b', '#ffb703', '#ffffff'], ['#ffb703', '#c2187b', '#1f0533'], ['#023e8a', '#ff5d8f', '#ffffff'], ['#06d6a0', '#073b4c', '#073b4c']],
    'Horror e fantastico': [['#0b0b0b', '#ff1f3d', '#f2f2f2'], ['#120a1f', '#9dff00', '#eeeeee'], ['#1a0005', '#ff4d6d', '#ffe5ec'], ['#000000', '#ff7b00', '#fff3e6']],
    'Roma': [['#e2552d', '#2b1a12', '#ffe9d6'], ['#f2a65a', '#7a1e12', '#2b0f08'], ['#ffd166', '#c0392b', '#1b0d08'], ['#7a1e12', '#ffb26b', '#fff1e3']],
    'Esoterismo e mistero': [['#1b0f3a', '#ffd166', '#f3e9ff'], ['#3c1e70', '#2ee6d6', '#ffffff'], ['#0b0620', '#c77dff', '#f7f0ff']],
    'Lavoro e formazione': [['#0b3d3a', '#c6ff00', '#f2fff4'], ['#00a896', '#0b0b0b', '#ffffff'], ['#e9ff70', '#0b3d3a', '#0b0b0b']],
    'Autori emergenti': [['#ffcf5c', '#111111', '#111111'], ['#111111', '#ffcf5c', '#ffffff']],
  };
  function tavolozza(b) {
    const h = hash(b.id);
    const tema = (b.s || []).find(n => TAVOLOZZE_TEMA[n]);
    const t = tema ? TAVOLOZZE_TEMA[tema] : TAVOLOZZE;
    return t[h % t.length];
  }
  const minutiLettura = b => b.w ? b.w / 230 : null;   // parole vere del libro, circa 230 al minuto
  const durata = b => {
    const m = minutiLettura(b);
    if (!m) return '';
    const min = Math.max(5, Math.round(m / 5) * 5);
    return min < 60 ? `${min} min` : min < 600 ? `${Math.round(min / 60)} h` : `${Math.round(min / 60)} h+`;
  };
  // dimensione del titolo: la parola più lunga deve stare intera sulla riga (niente «CRIPTOVA-LUTE»)
  function misuraTitolo(t, max = 13.5) {
    const parole = t.toUpperCase().split(/\s+/).filter(Boolean);
    const lunga = Math.max(...parole.map(p => p.length), 1);
    const perParola = 82 / (lunga * 0.64);              // larghezza utile ~82% della copertina, lettere ~0,64 em
    const perTotale = t.length > 60 ? 7 : t.length > 42 ? 8.4 : t.length > 26 ? 10.5 : max;
    return Math.max(5.6, Math.min(max, perParola, perTotale)).toFixed(1);
  }
  function copertina(b, opt = {}) {
    const [p1, p2, p3] = tavolozza(b);
    const h = hash(b.id);
    const lt = b.t.length > 46 ? 'lunghissimo' : b.t.length > 26 ? 'lungo' : '';
    const pr = opt.progresso ? progresso(b.id) : 0;
    const extra = (b.nuovo ? '<span class="bollino">Nuovo</span>' : '') + (pr > .01 ? `<span class="barra-lettura"><i style="width:${Math.round(pr * 100)}%"></i></span>` : '');
    const titolo = b.t.replace(/\s*\([^)]*\)\s*$/, '');   // via le note di edizione: «Fosca (1869)» -> «Fosca»
    const d = durata(b);
    if (b.cov === 1) {   // il libro ha una copertina o un'illustrazione sua: si vede quella
      return `<span class="poster con-immagine vera" style="--p1:${p1};--p2:${p2};--p3:${p3}"><img src="copertine/${esc(b.id)}.webp" alt="" loading="lazy" decoding="async"
        onerror="this.parentNode.className='poster moderna f${(h >> 4) % 8}';this.remove()"><span class="forma"></span>
        ${d ? `<span class="durata">${d}</span>` : ''}
        <span class="pt"><span class="pt-t" style="font-size:${misuraTitolo(titolo)}cqi">${esc(titolo)}</span><span class="pt-a">${esc(autori(b))}</span></span>
        <span class="costola"></span><span class="luce"></span>${extra}</span>`;
    }
    return `<span class="poster moderna f${(h >> 4) % 8}" style="--p1:${p1};--p2:${p2};--p3:${p3}">
      <span class="forma"></span>
      ${d ? `<span class="durata">${d}</span>` : ''}
      <span class="pt"><span class="pt-t" style="font-size:${misuraTitolo(titolo)}cqi">${esc(titolo)}</span><span class="pt-a">${esc(autori(b))}</span></span>
      <span class="costola"></span><span class="luce"></span>${extra}</span>`;
  }
  // i colori per aloni e sfondi seguono la copertina
  const coloriCopertina = b => { const [p1, p2] = tavolozza(b); return [p1, p2, p2]; };
  const tessera = (b, opt) => `<a class="libro" href="#/libro/${encodeURIComponent(b.id)}" aria-label="${esc(b.t)}, di ${esc(autori(b))}">
    ${copertina(b, opt)}${opt && opt.didascalia ? `<span class="sotto-titolo">${esc(b.t)}<span>${esc(autori(b))}</span></span>` : ''}</a>`;

  function fila(titolo, libri, opt = {}) {
    if (!libri.length) return '';
    return `<section class="fila${opt.top ? ' top' : ''}" style="--c:${opt.colore || 'var(--accent)'}">
      <div class="fila-testa"><h2><i class="punto"></i>${esc(titolo)}</h2>${opt.sotto ? `<span class="sotto">${esc(opt.sotto)}</span>` : ''}
        ${opt.link ? `<a class="tutti" href="${opt.link}">Vedi tutti ${ico.avanti}</a>` : ''}</div>
      <div class="scorri"><button class="freccia sx" aria-label="Indietro">${ico.freccia}</button>
        <div class="binario">${libri.slice(0, opt.max || 30).map((b, i) => opt.top
          ? `<div class="posto" style="--i:${i}"><span class="numero" aria-hidden="true">${i + 1}</span>${tessera(b, opt)}</div>`
          : tessera(b, opt).replace('<a class="libro"', `<a class="libro" style="--i:${Math.min(i, 12)}"`)).join('')}</div>
        <button class="freccia dx" aria-label="Avanti">${ico.freccia}</button></div></section>`;
  }
  function attivaFrecce(root) {
    root.querySelectorAll('.scorri').forEach(sc => {
      const b = sc.querySelector('.binario'), sx = sc.querySelector('.sx'), dx = sc.querySelector('.dx');
      const agg = () => { sx.disabled = b.scrollLeft < 10; dx.disabled = b.scrollLeft + b.clientWidth > b.scrollWidth - 10; };
      sx.onclick = () => b.scrollBy({ left: -b.clientWidth * .85, behavior: 'smooth' });
      dx.onclick = () => b.scrollBy({ left: b.clientWidth * .85, behavior: 'smooth' });
      b.addEventListener('scroll', agg, { passive: true }); agg();
    });
  }

  // ---------------------------------------------------------------- dati
  const ordina = (a, b) => (b.k - a.k) || ((b.v || 0) - (a.v || 0));
  const inRaccolta = n => S.libri.filter(b => (b.s || []).includes(n)).sort(ordina);
  const inCategoria = n => n === 'I best seller di sempre'
    ? [...S.libri].filter(b => b.v).sort((a, b) => b.v - a.v).slice(0, 40)
    : S.libri.filter(b => b.c === n || (b.sf || []).includes(n)).sort(ordina);

  function libroDelGiorno() {
    const cand = S.libri.filter(b => b.tr && (b.k || (b.s || []).length));
    const pool = cand.length ? cand : S.libri;
    const giorno = Math.floor(Date.now() / 864e5);
    return pool[hash(String(giorno)) % pool.length];
  }

  // ---------------------------------------------------------------- pagine
  function vetrina() {
    // 5 libri: prima quelli con immagine e trama, uno per raccolta, poi i grandi classici; cambiano ogni giorno
    const giorno = Math.floor(Date.now() / 864e5);
    const pesca = arr => arr.length ? arr[(hash(String(giorno)) + arr.length) % arr.length] : null;
    const bello = b => b.tr || b.inc;
    const scelti = [];
    for (const n of Object.keys(RACCOLTE)) {
      const x = pesca(inRaccolta(n).filter(bello).slice(0, 12));
      if (x && !scelti.includes(x)) scelti.push(x);
    }
    for (const b of S.libri.filter(b => bello(b) && b.k).sort(ordina)) { if (scelti.length >= 5) break; if (!scelti.includes(b)) scelti.push(b); }
    for (const b of S.libri.sort(ordina)) { if (scelti.length >= 5) break; if (!scelti.includes(b)) scelti.push(b); }
    return scelti.slice(0, 5);
  }

  function slide(h, i) {
    const [p1, p2] = tavolozza(h);
    return `<div class="slide hero${i === 0 ? ' on' : ''}" data-a1="${p1}" data-a2="${p2}">
      <div class="hero-sfondo moderno" style="--p1:${p1};--p2:${p2}"></div>
      <div class="hero-dentro"><div class="hero-testo">
        <div class="occhiello">${i === 0 ? 'Il libro di oggi' : 'Da non perdere'}${h.s && h.s[0] ? ' · ' + esc(h.s[0]) : ' · ' + esc(h.c)}</div>
        <h1>${esc(h.t)}</h1>
        <p class="autore"><b>${esc(autori(h))}</b>${h.y ? ' · ' + h.y : ''}</p>
        ${h.tr || h.inc ? `<p class="trama">${esc(h.tr || h.inc)}</p>` : '<p class="trama"></p>'}
        <div class="bottoni"><a class="btn primario" href="#/leggi/${encodeURIComponent(h.id)}">${ico.play} Leggi ora</a>
          <a class="btn secondario" href="#/libro/${encodeURIComponent(h.id)}">${ico.info} Dettagli</a></div>
      </div>${copertina(h)}</div></div>`;
  }

  let giroVetrina;
  function avviaVetrina(root) {
    const v = root.querySelector('.vetrina');
    if (!v) return;
    const slides = [...v.querySelectorAll('.slide')], punti = [...v.querySelectorAll('.vetrina-punti button')];
    const DURATA = 8000;
    let k = 0, pausa = false, t0 = Date.now(), resto = DURATA;
    const vai = n => {
      slides[k].classList.remove('on'); punti[k].classList.remove('on');
      punti.forEach((p, i) => p.classList.toggle('fatto', i < n));
      k = (n + slides.length) % slides.length;
      slides[k].classList.add('on');
      void punti[k].offsetWidth; punti[k].classList.add('on');
      v.style.setProperty('--a1', slides[k].dataset.a1); v.style.setProperty('--a2', slides[k].dataset.a2);
      t0 = Date.now(); resto = DURATA;
    };
    v.style.setProperty('--a1', slides[0].dataset.a1); v.style.setProperty('--a2', slides[0].dataset.a2);
    v.style.setProperty('--durata', DURATA + 'ms');
    punti[0].classList.add('on');
    punti.forEach((p, i) => (p.onclick = () => vai(i)));
    v.addEventListener('mouseenter', () => { pausa = true; resto -= Date.now() - t0; });
    v.addEventListener('mouseleave', () => { pausa = false; t0 = Date.now(); });
    let x0 = null;
    v.addEventListener('touchstart', e => (x0 = e.touches[0].clientX), { passive: true });
    v.addEventListener('touchend', e => { if (x0 !== null && Math.abs(e.changedTouches[0].clientX - x0) > 50) vai(k + (e.changedTouches[0].clientX < x0 ? 1 : -1)); x0 = null; }, { passive: true });
    clearInterval(giroVetrina);
    giroVetrina = setInterval(() => { if (!document.body.contains(v)) return clearInterval(giroVetrina);
      if (!pausa && !document.hidden && Date.now() - t0 >= resto) vai(k + 1); }, 250);
  }

  function home() {
    document.title = 'Libri di strada';
    const vv = vetrina();
    const inLettura = Object.entries(store.get('pos', {})).sort((a, b) => b[1].t - a[1].t).map(([id]) => S.per.get(id)).filter(Boolean);
    const nuovi = S.libri.filter(b => b.nuovo).sort((a, b) => (b.agg || '').localeCompare(a.agg || ''));
    const piuLetti = [...S.libri].sort((a, b) => (b.v || 0) - (a.v || 0));
    let html = '';
    if (vv.length) {
      html += `<section class="vetrina"><div class="aurora"><i></i><i></i><i></i></div>${vv.map(slide).join('')}<div class="hero-grana"></div>
        <div class="vetrina-punti">${vv.map((b, i) => `<button aria-label="${esc(b.t)}"><i></i></button>`).join('')}</div></section>`;
    }
    html += `<nav class="porte" aria-label="Raccolte">${Object.entries(RACCOLTE).map(([n, r]) => `<a class="porta" href="#/raccolta/${encodeURIComponent(n)}"
      style="--c0:${r.c[0]};--c1:${r.c[1]};--c2:${r.c[2]}">${r.i}<b>${esc(n)}</b><span>${inRaccolta(n).length || 'Presto'} libri</span></a>`).join('')}</nav>`;
    html += '<div class="file">';
    html += fila('Continua a leggere', inLettura, { progresso: true, colore: 'var(--gold)' });
    if (nuovi.length) html += fila('Appena arrivati', nuovi, { colore: 'var(--gold)' });
    // scaffali con un aggancio di oggi: film e serie, brividi brevi, letture da una sera
    const minuti = b => minutiLettura(b) || 9999;
    const FILM = /jekyll|sherlock|isola del tesoro|pinocchio|giro del mondo|corsaro nero|tigri di momp|promessi sposi|casa usher|cuore rivelatore|gatto nero|montecristo|dalla terra alla luna|isola misteriosa|ventimila leghe|cantico di natale|moschettieri|don chisciotte|frankenstein|dracula|amleto|romeo e giulietta|otello|macbeth|decameron|divina commedia|fu mattia pascal|piccolo lord|zanna bianca|robinson|gulliver|alice|le avventure di tom|^cuore$/i;
    const film = S.libri.filter(b => FILM.test(b.t)).sort(ordina);
    const brividi = S.libri.filter(b => (b.s || []).includes('Horror e fantastico') && minuti(b) <= 35).sort(ordina);
    const sera = S.libri.filter(b => minuti(b) > 25 && minuti(b) <= 150 && ['Romanzi', 'Racconti e novelle'].includes(b.c)).sort(ordina);
    const mondi = S.libri.filter(b => (b.sf || []).includes('Fantascienza') || /luna|fiab|mago|incantat|fata|drago|mostr|viaggio al centro/i.test(b.t)).sort(ordina);
    html += fila('Hanno ispirato film e serie', film, { colore: '#ff3d7f', sotto: 'Le storie originali dietro i film che conosci' });
    html += fila('Brividi in meno di 30 minuti', brividi, { colore: '#ff1f3d', sotto: 'Racconti brevi da leggere al buio' });
    html += fila('Da finire in una sera', sera, { colore: '#2ec4b6', sotto: 'Storie che cominci e finisci prima di dormire' });
    html += fila('Mondi fantastici', mondi, { colore: '#8338ec', sotto: 'Viaggi sulla Luna, fate, mostri e invenzioni impossibili' });
    const raccolte = Object.entries(RACCOLTE);
    raccolte.forEach(([n, r], i) => {
      html += fila(n, inRaccolta(n), { sotto: r.d, colore: r.c[2], link: '#/raccolta/' + encodeURIComponent(n) });
      if (i === 1) html += fila('I 10 più letti', piuLetti, { colore: 'var(--gold)', top: true, max: 10 });
    });
    for (const [, scaffali] of REPARTI) {
      for (const n of scaffali) {
        if (RACCOLTE[n]) continue;
        html += fila(n, inCategoria(n), { colore: CATEGORIE[n][2], link: '#/categoria/' + encodeURIComponent(n) });
      }
    }
    html += '</div>';
    app.innerHTML = html;
    attivaFrecce(app);
    avviaVetrina(app);
    rivela(app);
  }

  // ---------------------------------------------------------------- effetti
  let osservatore;
  function rivela(root) {
    if (!('IntersectionObserver' in window)) return root.querySelectorAll('.fila').forEach(f => f.classList.add('vista'));
    osservatore = osservatore || new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vista'); osservatore.unobserve(e.target); } }),
      { rootMargin: '0px 0px -8% 0px', threshold: .05 });
    root.querySelectorAll('.fila:not(.vista)').forEach(f => osservatore.observe(f));
  }
  // inclinazione 3D e luce che segue il mouse
  document.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const p = e.target.closest && e.target.closest('.libro .poster');
    if (!p) return;
    const r = p.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    p.style.setProperty('--ry', ((x - .5) * 14).toFixed(1) + 'deg');
    p.style.setProperty('--rx', ((.5 - y) * 12).toFixed(1) + 'deg');
    p.style.setProperty('--mx', (x * 100).toFixed(0) + '%');
    p.style.setProperty('--my', (y * 100).toFixed(0) + '%');
  }, { passive: true });
  // colore dominante di un'immagine (per lo sfondo della scheda)
  function coloreDominante(src) {
    return new Promise(res => {
      const im = new Image();
      im.onload = () => {
        try {
          const c = document.createElement('canvas'); c.width = c.height = 24;
          const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, 24, 24);
          const d = x.getImageData(0, 0, 24, 24).data;
          let r = 0, g = 0, b = 0, n = 0;
          for (let i = 0; i < d.length; i += 4) {
            const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
            const w = (mx - mn) / 255 + .05;   // pesano di più i colori vivi
            r += d[i] * w; g += d[i + 1] * w; b += d[i + 2] * w; n += w;
          }
          res(`rgb(${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)})`);
        } catch { res(null); }
      };
      im.onerror = () => res(null);
      im.src = src;
    });
  }

  function elenco(titolo, intro, libri) {
    document.title = titolo + ' · Libri di strada';
    app.innerHTML = `<div class="pagina"><h1>${esc(titolo)}</h1><p class="intro">${esc(intro)}</p>
      ${libri.length ? `<div class="griglia">${libri.map(b => tessera(b, { didascalia: true })).join('')}</div>`
        : '<div class="vuoto"><b>Ancora niente qui</b>Stiamo preparando questa raccolta: torna presto.</div>'}</div>`;
  }

  function raccolte() {
    document.title = 'Raccolte · Libri di strada';
    const t = (n, d, c) => `<a class="raccolta-tessera" href="#/${RACCOLTE[n] ? 'raccolta' : 'categoria'}/${encodeURIComponent(n)}" style="--c0:${c[0]};--c1:${c[1]};--c2:${c[2]}">
      <b>${esc(n)}</b><span>${esc(d)}</span></a>`;
    app.innerHTML = `<div class="pagina"><h1>Raccolte e scaffali</h1><p class="intro">Come entrare in una grande libreria: scegli un reparto. Tutti i libri sono gratuiti, per sempre.</p>
      <h2 class="reparto">In evidenza</h2>
      <div class="raccolte-elenco">${Object.entries(RACCOLTE).map(([n, r]) => t(n, `${inRaccolta(n).length || 'Presto i primi'} libri · ${r.d}`, r.c)).join('')}</div>
      ${REPARTI.map(([nome, sc]) => `<h2 class="reparto">${esc(nome)}</h2><div class="raccolte-elenco">${sc.filter(n => !RACCOLTE[n] || n === 'Lavoro e formazione')
        .map(n => t(n, `${inCategoria(n).length} libri`, CATEGORIE[n] || RACCOLTE[n].c)).join('')}</div>`).join('')}</div>`;
  }

  async function mia() {
    document.title = 'La mia libreria · Libri di strada';
    const salvati = (await db.keys()).map(id => S.per.get(id)).filter(Boolean);
    const pos = store.get('pos', {});
    const inLettura = Object.entries(pos).sort((a, b) => b[1].t - a[1].t).map(([id]) => S.per.get(id)).filter(Boolean);
    app.innerHTML = `<div class="pagina"><h1>La mia libreria</h1>
      <p class="intro">Resta su questo telefono, senza account: i libri salvati si leggono anche senza Internet.</p>
      ${inLettura.length ? `<h2 style="font:600 22px/1.2 var(--display);margin:10px 0 16px">Sto leggendo</h2>
        <div class="griglia" style="margin-bottom:40px">${inLettura.map(b => tessera(b, { didascalia: true, progresso: true })).join('')}</div>` : ''}
      <h2 style="font:600 22px/1.2 var(--display);margin:10px 0 16px">Salvati sul telefono</h2>
      ${salvati.length ? `<div class="griglia">${salvati.map(b => tessera(b, { didascalia: true })).join('')}</div>`
        : '<div class="vuoto"><b>Nessun libro salvato</b>Apri un libro e premi «Salva» per leggerlo anche offline.</div>'}
      <p class="muted" style="margin-top:36px;font-size:13px">Per averla come un'app: su iPhone Condividi → «Aggiungi alla schermata Home»; su Android ⋮ → «Installa app».</p></div>`;
  }

  // ---------------------------------------------------------------- scheda del libro
  async function scheda(id) {
    const b = S.per.get(id);
    if (!b) return;
    const el = $('#scheda');
    const salvato = !!(await db.get(id));
    const altriAutore = S.libri.filter(x => x.id !== b.id && autori(x) === autori(b)).sort(ordina);
    const stessa = S.libri.filter(x => x.id !== b.id && (b.s && b.s[0] ? (x.s || []).includes(b.s[0]) : x.c === b.c)).sort(ordina);
    const rac = (b.s || []).map(n => `<span class="etichetta c" style="--c:${RACCOLTE[n]?.c[2] || '#777'}">${esc(n)}</span>`).join('');
    const pr = progresso(b.id);
    const sfondo = `background:linear-gradient(135deg, ${tavolozza(b)[0]}, ${tavolozza(b)[1]})`;
    const scaricabile = S.online !== false || b.r;
    el.innerHTML = `<div class="scheda-foglio">
      <a class="a-casa" href="#/" aria-label="Torna alla home"><svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg> Home</a>
      <button class="chiudi" aria-label="Chiudi">${ico.x}</button>
      <div class="scheda-testa"><div class="sfondo" style="${sfondo}"></div>${copertina(b)}
        <div><h1>${esc(b.t)}</h1>
          <p class="chi">di <b>${esc(autori(b))}</b>${vita(b)}${b.y ? ` · ${b.y}` : ''}${durata(b) ? ` · <span class="durata-testo">${durata(b)} di lettura</span>` : ''}</p>
          <div class="etichette">${rac}<span class="etichetta">${esc(b.c)}</span>${(b.sf || []).map(n => `<a class="etichetta c" style="--c:${(CATEGORIE[n] || [, , '#777'])[2]}" href="#/categoria/${encodeURIComponent(n)}">${esc(n)}</a>`).join('')}${b.sc ? '<span class="etichetta">Edizione originale scansionata</span>' : ''}${b.nostra ? '<span class="etichetta">Edizione Libri di strada</span>' : ''}</div>
          <div class="bottoni">
            ${b.e ? `<a class="btn primario" href="#/leggi/${encodeURIComponent(b.id)}">${ico.play} ${pr > .01 ? `Riprendi (${Math.round(pr * 100)}%)` : 'Leggi ora'}</a>` : ''}
            ${b.e ? `<button class="btn secondario" data-salva>${salvato ? ico.ok + ' Salvato' : ico.salva + ' Salva'}</button>` : ''}
          </div></div></div>
      <div class="scheda-corpo"><div>
          <h3>${b.tr ? 'Trama' : b.inc ? 'Comincia così' : 'Il libro'}</h3>
          ${b.tr ? `<p class="trama">${esc(b.tr)}</p>${b.trf ? `<p class="fonte-trama">Testo da <a href="${esc(b.trf)}" target="_blank" rel="noopener">Wikipedia</a> (CC BY-SA 4.0)</p>` : ''}`
            : b.inc ? `<p class="trama incipit">«${esc(b.inc)}»</p>`
            : b.sc ? '<p class="trama">Un\'edizione storica da sfogliare com\'era stampata, con la sua carta e i suoi caratteri.</p>'
            : `<p class="trama">${esc(b.c)} di ${esc(autori(b))}${b.y ? ', ' + b.y : ''}. Premi «Leggi ora» per cominciare.</p>`}
        </div><div>
          <h3>Scarica</h3>
          <div class="bottoni" style="flex-direction:column;align-items:stretch">
            ${b.e ? `<a class="btn contorno piccolo" ${scaricabile ? `href="${esc(urlFile(b, 'e', true))}"` : 'aria-disabled="true"'} data-scarica>${ico.giu} ePub · ${mb(b.eb)}</a>` : ''}
            ${b.p ? `<a class="btn contorno piccolo" ${S.online !== false ? `href="${esc(urlFile(b, 'p', true))}"` : 'aria-disabled="true"'} data-scarica>${ico.giu} PDF · ${mb(b.pb)}</a>` : ''}
          </div>
          ${b.cov ? `<figure class="epoca"><img src="copertine/${esc(b.cov === 1 ? b.id : b.cov)}.webp" alt="" loading="lazy"><figcaption>${b.cov === 1 ? 'Dall\'edizione originale' : esc(b.a[0])}</figcaption></figure>` : ''}
          <dl style="margin-top:18px">${b.y ? `<dt>Anno</dt><dd>${b.y}</dd>` : ''}<dt>Genere</dt><dd>${esc(b.c)}</dd>
            ${b.m ? `<dt>Autore</dt><dd>morto nel ${b.m}</dd>` : ''}<dt>Fonte</dt><dd>${esc(b.fn || 'Wikisource')}</dd></dl>
          <p class="licenza">${esc(b.l || '')} <a href="${esc(b.f)}" target="_blank" rel="noopener">Vedi la fonte</a>.</p>
        </div></div>
      ${fila('Dello stesso autore', altriAutore, { max: 20 })}
      ${fila(b.s && b.s[0] ? 'Altro da ' + b.s[0] : 'Altri ' + b.c.toLowerCase(), stessa, { max: 20 })}
    </div>`;
    el.hidden = false;
    document.body.classList.add('bloccato');
    document.title = b.t + ' · Libri di strada';
    const foglio = el.querySelector('.scheda-foglio');
    foglio.style.setProperty('--amb', tavolozza(b)[0]);
    rivela(el);
    el.scrollTop = 0;
    attivaFrecce(el);
    el.querySelector('.chiudi').onclick = chiudiScheda;
    el.onclick = e => { if (e.target === el) chiudiScheda(); };
    el.querySelectorAll('[data-scarica]').forEach(a => a.addEventListener('click', () => toast('Scaricamento avviato')));
    const sv = el.querySelector('[data-salva]');
    if (sv) sv.onclick = async () => {
      if (await db.get(b.id)) { await db.del(b.id); sv.innerHTML = ico.salva + ' Salva'; toast('Tolto dal telefono'); return; }
      sv.innerHTML = '<span class="anello" style="width:18px;height:18px;border-width:2px"></span> Salvo…';
      try { await salvaSulTelefono(b); sv.innerHTML = ico.ok + ' Salvato'; toast('Salvato: si legge anche offline'); }
      catch (e) { sv.innerHTML = ico.salva + ' Salva'; toast(e.message); }
    };
  }
  function chiudiScheda() {
    const el = $('#scheda');
    if (el.hidden) return;
    el.hidden = true; el.innerHTML = '';
    document.body.classList.remove('bloccato');
    // torna sempre alla pagina di partenza (home, raccolta, ricerca), mai dentro il lettore
    if (location.hash.startsWith('#/libro/')) location.hash = S.base || '#/';
  }

  // ---------------------------------------------------------------- file dei libri
  function urlFile(b, tipo, scarica) {
    const rel = tipo === 'p' ? b.p : b.e;
    if (tipo === 'e' && b.r && S.online === false) return `riserva/${b.id}.epub`;
    return `${S.server}/file/${rel.split('/').map(encodeURIComponent).join('/')}${scarica ? `?scarica=1&id=${encodeURIComponent(b.id)}` : ''}`;
  }
  async function datiEpub(b) {
    const locale = await db.get(b.id);
    if (locale) return locale;
    const prova = [];
    if (S.online !== false) prova.push(urlFile(b, 'e'));
    if (b.r) prova.push(`riserva/${b.id}.epub`);
    for (const u of prova) {
      try {
        const r = await fetch(u);
        if (r.ok) return await r.arrayBuffer();
      } catch { /* provo la riserva */ }
    }
    throw new Error(S.online === false ? 'La libreria di casa sta dormendo: questo libro non è nella riserva, riprova più tardi' : 'Non riesco a scaricare il libro, riprova');
  }
  async function salvaSulTelefono(b) { await db.put(b.id, await datiEpub(b)); }

  // ---------------------------------------------------------------- ricerca
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function apriCerca() {
    const c = $('#cerca');
    c.hidden = false; document.body.classList.add('bloccato');
    const filtri = ['Tutti', ...Object.keys(RACCOLTE), ...REPARTI.flatMap(r => r[1]).filter(n => !RACCOLTE[n] && n !== 'I best seller di sempre')];
    $('#filtri').innerHTML = filtri.map(f => `<button class="filtro ${(S.filtro || 'Tutti') === f ? 'on' : ''}" data-f="${esc(f)}">${esc(f)}</button>`).join('');
    $('#filtri').onclick = e => { const f = e.target.closest('[data-f]'); if (!f) return; S.filtro = f.dataset.f === 'Tutti' ? null : f.dataset.f; apriCerca(); };
    cerca();
    setTimeout(() => $('#q').focus(), 50);
  }
  function chiudiCerca() { $('#cerca').hidden = true; document.body.classList.remove('bloccato'); }
  function cerca() {
    const q = norm($('#q').value.trim());
    const parole = q.split(/\s+/).filter(Boolean);
    let ris = S.libri.filter(b => !S.filtro || b.c === S.filtro || (b.s || []).includes(S.filtro) || (b.sf || []).includes(S.filtro));
    if (parole.length) {
      ris = ris.map(b => {
        const t = norm(b.t), a = norm(autori(b)), x = norm((b.tr || '') + ' ' + (b.s || []).join(' ') + ' ' + b.c);
        let p = 0;
        for (const w of parole) { if (t.includes(w)) p += 3; else if (a.includes(w)) p += 2; else if (x.includes(w)) p += 1; else return null; }
        return [p + (b.k ? .5 : 0), b];
      }).filter(Boolean).sort((a, b) => b[0] - a[0]).map(x => x[1]);
    } else ris = ris.sort(ordina);
    $('#risultati').innerHTML = `<div class="conta">${ris.length} libr${ris.length === 1 ? 'o' : 'i'}</div>
      ${ris.length ? `<div class="griglia">${ris.slice(0, 120).map(b => tessera(b, { didascalia: true })).join('')}</div>` : '<div class="vuoto"><b>Nessun libro trovato</b>Prova con un\'altra parola o un altro filtro.</div>'}`;
  }
  $('#btn-cerca').onclick = apriCerca;
  $('#cerca-chiudi').onclick = chiudiCerca;
  $('#cerca-home').onclick = () => { chiudiCerca(); };
  let qT; $('#q').addEventListener('input', () => { clearTimeout(qT); qT = setTimeout(cerca, 120); });
  $('#risultati').addEventListener('click', e => { if (e.target.closest('a.libro')) chiudiCerca(); });

  // ---------------------------------------------------------------- pagine di testo
  function testo(titolo, corpo) {
    document.title = titolo + ' · Libri di strada';
    app.innerHTML = `<div class="pagina"><h1>${esc(titolo)}</h1><div class="testo">${corpo}</div></div>`;
  }
  const PAGINE = {
    info: ['Come funziona', `<p>Hai trovato un cartello con un QR per strada? Sei nel posto giusto. <strong>Libri di strada</strong> è una libreria gratuita: scegli un libro, leggilo qui sul telefono o scaricalo. Non serve registrarsi, non ci sono pubblicità.</p>
      <h2>Leggere</h2><p>Premi <strong>Leggi ora</strong>: il libro si apre nel lettore. Puoi ingrandire il testo, scegliere un carattere ad alta leggibilità per la dislessia, il tema notte, e farti <strong>leggere il libro ad alta voce</strong> dal telefono. Il segno resta: quando torni riprendi da dove eri.</p>
      <h2>Tenerlo sempre con te</h2><p>Premi <strong>Salva</strong> e il libro resta sul telefono, leggibile anche senza Internet. Per avere Libri di strada come un'app: su iPhone Condividi → «Aggiungi alla schermata Home», su Android ⋮ → «Installa app».</p>
      <h2>Da dove vengono i libri</h2><p>Sono libri liberi da diritti: classici di autori morti da oltre 70 anni, edizioni storiche, e libri di autori di oggi che hanno scelto di regalarli. Ogni scheda dice da dove arriva il libro e perché è libero. I libri stanno su un piccolo server di casa: se a volte non risponde, sta dormendo — i libri salvati e quelli «di riserva» funzionano lo stesso.</p>`],
    licenze: ['Licenze e fonti', `<p>Ogni libro ha nella sua scheda la fonte e il motivo per cui è libero.</p>
      <h2>Classici</h2><p>Testi in pubblico dominio in Italia (autore morto da oltre 70 anni). Le trascrizioni vengono da <a href="https://it.wikisource.org" target="_blank" rel="noopener">Wikisource</a>, con licenza <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.it" target="_blank" rel="noopener">CC BY-SA 4.0</a>: puoi condividerle e modificarle citando la fonte e mantenendo la stessa licenza. Le raccolte costruite da noi (per esempio i <em>Sonetti romaneschi</em> del Belli in un unico volume) sono condivise con la stessa licenza.</p>
      <h2>Edizioni storiche</h2><p>Scansioni di libri stampati oltre un secolo fa, dall'<a href="https://archive.org" target="_blank" rel="noopener">Internet Archive</a>.</p>
      <h2>Trame</h2><p>Le trame dei classici sono le prime righe delle voci di <a href="https://it.wikipedia.org" target="_blank" rel="noopener">Wikipedia</a> in italiano (CC BY-SA 4.0), con il link alla voce. Dove manca, mostriamo l'inizio del libro.</p>
      <h2>Autori emergenti</h2><p>Libri pubblicati con il consenso dell'autore e una licenza libera che ne permette la diffusione gratuita (CC BY, CC BY-SA, CC BY-ND o CC0), indicata nella scheda.</p>
      <h2>Il sito</h2><p>Lettore: <a href="https://github.com/futurepress/epub.js" target="_blank" rel="noopener">epub.js</a> (licenza BSD) e JSZip (MIT). Caratteri: Fraunces, Inter, Literata e OpenDyslexic (SIL Open Font License). Hai trovato un libro che non dovrebbe essere qui? Scrivici e lo togliamo subito.</p>`],
    privacy: ['Privacy', `<p><strong>In breve: non sappiamo chi sei e non vogliamo saperlo.</strong></p>
      <h2>Niente account, niente cookie, niente pubblicità</h2><p>Il sito non usa cookie, non ha pubblicità e non usa servizi di statistiche di terzi. I caratteri e il lettore sono dentro il sito: aprendolo non contatti Google o altri.</p>
      <h2>Cosa resta sul tuo telefono</h2><p>Il punto a cui sei arrivato, i segnalibri, le impostazioni di lettura e i libri che salvi restano <strong>solo sul tuo telefono</strong> (memoria del browser). Puoi cancellarli in ogni momento dalle impostazioni del browser.</p>
      <h2>Cosa contiamo</h2><p>Per sapere se il progetto funziona contiamo, in forma anonima, quante volte il sito viene aperto, quante volte dal QR e quante volte un libro viene letto o scaricato. Non salviamo indirizzi IP né altri dati che possano identificarti: l'indirizzo serve solo, per qualche minuto e solo in memoria, a non contare due volte la stessa apertura.</p>
      <h2>Chi ospita</h2><p>Le pagine sono ospitate da GitHub Pages; i libri da un server privato collegato tramite Tailscale. Questi servizi, come ogni server web, ricevono l'indirizzo IP necessario a rispondere.</p>`],
  };

  // ---------------------------------------------------------------- navigazione
  function evidenzia(nome) { document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === nome)); }
  async function vai() {
    const h = decodeURIComponent(location.hash.slice(1) || '/');
    const [, p1, ...resto] = h.split('/');
    const p2 = resto.join('/');
    if (window.LDSLettore && p1 !== 'leggi') window.LDSLettore.chiudi(true);
    if (p1 !== 'libro') { const el = $('#scheda'); if (!el.hidden) { el.hidden = true; el.innerHTML = ''; document.body.classList.remove('bloccato'); } }
    if (p1 === 'libro') { if (!app.innerHTML) home(); return scheda(p2); }
    if (p1 === 'leggi') {
      const b = S.per.get(p2);
      if (!b) return (location.hash = '#/');
      if (!app.innerHTML) home();
      conta('lettura', b.id);
      return window.LDSLettore.apri(b);
    }
    S.base = location.hash || '#/';   // ultima pagina «normale»: la X della scheda torna qui
    if (S.base !== S.ultimaBase) { window.scrollTo(0, 0); S.ultimaBase = S.base; }
    evidenzia(p1 || 'home');
    if (!p1) return home();
    if (p1 === 'raccolte') return raccolte();
    if (p1 === 'mia') return mia();
    if (p1 === 'raccolta') return elenco(p2, RACCOLTE[p2]?.d || '', inRaccolta(p2));
    if (p1 === 'categoria') return elenco(p2, `${inCategoria(p2).length} libri`, inCategoria(p2));
    if (p1 === 'admin') return window.LDSAdmin(app);
    if (p1 === 'pubblica') return window.LDSPubblica ? window.LDSPubblica(app) : testo('Pubblica il tuo libro', '<p>In arrivo.</p>');
    if (PAGINE[p1]) return testo(...PAGINE[p1]);
    home();
  }
  window.addEventListener('hashchange', () => { S.dentro = true; vai(); });
  window.addEventListener('keydown', e => { if (e.key === 'Escape') { if (!$('#cerca').hidden) chiudiCerca(); else chiudiScheda(); } if (e.key === '/' && document.activeElement === document.body) { e.preventDefault(); apriCerca(); } });
  window.addEventListener('scroll', () => $('#nav').classList.toggle('solida', scrollY > 30), { passive: true });

  // ---------------------------------------------------------------- avvio
  async function controllaServer() {
    try {
      const c = new AbortController(); setTimeout(() => c.abort(), 6000);
      const r = await fetch(S.server + '/stato', { signal: c.signal, cache: 'no-store' });
      S.online = r.ok;
    } catch { S.online = false; }
    const av = $('#avviso');
    if (S.online === false) { av.textContent = 'La libreria di casa sta dormendo: puoi leggere i libri salvati e quelli di riserva.'; av.hidden = false; }
    else av.hidden = true;
  }

  async function avvio() {
    app.innerHTML = '<div class="carica"><div class="anello"></div></div>';
    try {
      const r = await fetch('data/catalogo.json', { cache: 'no-cache' });
      S.cat = await r.json();
    } catch {
      app.innerHTML = '<div class="pagina"><div class="vuoto"><b>Non riesco a caricare la libreria</b>Controlla la connessione e riprova.</div></div>';
      return;
    }
    S.server = S.cat.server;
    // solo in prova sul PC: ?server=http://127.0.0.1:8091 usa un server locale
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
      const sv = new URLSearchParams(location.search).get('server') || sessionStorage.getItem('lds:server');
      if (sv) { S.server = sv; sessionStorage.setItem('lds:server', sv); }
    }
    S.libri = S.cat.libri;
    S.libri.forEach(b => S.per.set(b.id, b));
    const qs = new URLSearchParams(location.search);
    if (qs.has('qr')) { conta('qr'); history.replaceState(null, '', location.pathname + location.hash); } else conta('visita');
    controllaServer();
    // libri approvati dall'admin dopo l'ultima pubblicazione del sito (Autori emergenti)
    fetch(S.server + '/novita.json', { cache: 'no-store' }).then(r => r.json()).then(n => {
      const nuovi = (n.libri || []).filter(b => !S.per.has(b.id));
      if (!nuovi.length) return;
      nuovi.forEach(b => { S.libri.push(b); S.per.set(b.id, b); });
      if (!location.hash || location.hash === '#/' || location.hash.startsWith('#/raccolta')) vai();
    }).catch(() => {});
    vai();
  }

  window.LDS = { S, esc, toast, conta, datiEpub, db, store, salvaSulTelefono, ico, chiudiScheda, copertina, tavolozza, durata, autori };
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  avvio();
})();
