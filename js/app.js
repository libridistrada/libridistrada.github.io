/* Libri di strada — il sito. Nessuna libreria esterna oltre al lettore; nessun cookie. */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const app = $('#app');

  // raccolte a tema (in evidenza) e colori delle categorie: [scuro, medio, chiaro]
  const RACCOLTE = {
    'Autori emergenti': { d: 'Libri di oggi, regalati da chi li ha scritti', c: ['#2a1d05', '#8a6215', '#e9b44c'] },
    'Roma': { d: 'Belli, Trilussa, Pascarella, Zanazzo: la città in dialetto, in versi e in cucina', c: ['#2b0f08', '#8f3a22', '#e0703f'] },
    'Horror e fantastico': { d: 'Vampiri, spettri e notti scapigliate', c: ['#120406', '#5c0f1a', '#a31d2e'] },
    'Esoterismo e mistero': { d: 'Magia, alchimia, cabala e filosofia occulta', c: ['#0d0820', '#3b2a78', '#7b5fd6'] },
    'Lavoro e formazione': { d: 'Manuali, corsi e trattati per imparare un mestiere', c: ['#04171a', '#16564f', '#33a08d'] },
  };
  const CATEGORIE = {
    'Romanzi': ['#14100c', '#5a3a22', '#a8743f'], 'Racconti e novelle': ['#0d1418', '#24485a', '#4f8fae'],
    'Poesia': ['#160d16', '#5a2a52', '#b05c9f'], 'Teatro': ['#170c0b', '#6b1f1a', '#c2452f'],
    'Ragazzi e fiabe': ['#0e1609', '#3a6324', '#7fb34d'], 'Storia e biografie': ['#14120a', '#5b5124', '#b29f45'],
    'Saggi e pensiero': ['#0b0f17', '#28375e', '#5872b8'], 'Lettere': ['#15100f', '#5d3b33', '#b07a67'],
    'Scienza e curiosità': ['#06141a', '#1d5560', '#3fa2b0'], 'Lavoro e formazione': ['#04171a', '#16564f', '#33a08d'],
  };
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
  const colori = b => (b.s && b.s[0] && RACCOLTE[b.s[0]]?.c) || CATEGORIE[b.c] || ['#151515', '#3a3a3a', '#777'];
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

  // ---------------------------------------------------------------- copertina
  function copertina(b, opt = {}) {
    const [c0, c1, c2] = colori(b);
    const lt = b.t.length > 46 ? 'lunghissimo' : b.t.length > 26 ? 'lungo' : '';
    const pr = opt.progresso ? progresso(b.id) : 0;
    const extra = (b.nuovo ? '<span class="bollino">Nuovo</span>' : '') + (pr > .01 ? `<span class="barra-lettura"><i style="width:${Math.round(pr * 100)}%"></i></span>` : '');
    const testo = `<span class="pt"><span class="pt-a">${esc(autori(b))}</span><span class="pt-t ${lt}">${esc(b.t)}</span></span>`;
    if (b.cov) {
      const img = b.cov === 1 ? b.id : b.cov;   // 1 = immagine del libro, altrimenti il ritratto dell'autore
      return `<span class="poster con-immagine${b.cov === 1 ? '' : ' ritratto'}" style="--c0:${c0};--c1:${c1};--c2:${c2}"><img src="copertine/${esc(img)}.webp" alt="" loading="lazy" decoding="async"
        onerror="this.parentNode.classList.remove('con-immagine');this.parentNode.classList.add('disegnata');this.remove()">${testo}${extra}</span>`;
    }
    const h = hash(b.id);
    const varia = `filter:hue-rotate(${(h % 29) - 14}deg) saturate(${0.85 + (h >> 5) % 30 / 100});background-position:${(h >> 9) % 100}% 0`;
    return `<span class="poster disegnata" style="--c0:${c0};--c1:${c1};--c2:${c2};${varia}"><span class="marchio">LdS</span>
      <span class="fregio">${FREGI[hash(b.id) % FREGI.length]}</span>${testo}${extra}</span>`;
  }
  const tessera = (b, opt) => `<a class="libro" href="#/libro/${encodeURIComponent(b.id)}" aria-label="${esc(b.t)}, di ${esc(autori(b))}">
    ${copertina(b, opt)}${opt && opt.didascalia ? `<span class="sotto-titolo">${esc(b.t)}<span>${esc(autori(b))}</span></span>` : ''}</a>`;

  function fila(titolo, libri, opt = {}) {
    if (!libri.length) return '';
    return `<section class="fila" style="--c:${opt.colore || 'var(--accent)'}">
      <div class="fila-testa"><h2><i class="punto"></i>${esc(titolo)}</h2>${opt.sotto ? `<span class="sotto">${esc(opt.sotto)}</span>` : ''}
        ${opt.link ? `<a class="tutti" href="${opt.link}">Vedi tutti ${ico.avanti}</a>` : ''}</div>
      <div class="scorri"><button class="freccia sx" aria-label="Indietro">${ico.freccia}</button>
        <div class="binario">${libri.slice(0, opt.max || 30).map(b => tessera(b, opt)).join('')}</div>
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
  const inCategoria = n => S.libri.filter(b => b.c === n).sort(ordina);

  function libroDelGiorno() {
    const cand = S.libri.filter(b => b.tr && (b.k || (b.s || []).length));
    const pool = cand.length ? cand : S.libri;
    const giorno = Math.floor(Date.now() / 864e5);
    return pool[hash(String(giorno)) % pool.length];
  }

  // ---------------------------------------------------------------- pagine
  function home() {
    document.title = 'Libri di strada';
    const h = libroDelGiorno();
    const inLettura = Object.entries(store.get('pos', {})).sort((a, b) => b[1].t - a[1].t).map(([id]) => S.per.get(id)).filter(Boolean);
    const nuovi = S.libri.filter(b => b.nuovo).sort((a, b) => (b.agg || '').localeCompare(a.agg || ''));
    const piuLetti = [...S.libri].sort((a, b) => (b.v || 0) - (a.v || 0));
    let html = '';
    if (h) {
      const sfondo = h.cov ? `copertine/${h.cov === 1 ? h.id : h.cov}.webp` : '';
      html += `<section class="hero">${sfondo ? `<div class="hero-sfondo" style="background-image:url('${esc(sfondo)}')"></div>` : `<div class="hero-sfondo" style="background:radial-gradient(circle at 70% 30%, ${colori(h)[2]}, ${colori(h)[0]})"></div>`}
        <div class="hero-grana"></div>
        <div class="hero-dentro"><div class="hero-testo">
          <div class="occhiello">Il libro di oggi${h.s && h.s[0] ? ' · ' + esc(h.s[0]) : ''}</div>
          <h1>${esc(h.t)}</h1>
          <p class="autore"><b>${esc(autori(h))}</b>${h.y ? ' · ' + h.y : ''}</p>
          ${h.tr || h.inc ? `<p class="trama">${esc(h.tr || h.inc)}</p>` : ''}
          <div class="bottoni"><a class="btn primario" href="#/leggi/${encodeURIComponent(h.id)}">${ico.play} Leggi ora</a>
            <a class="btn secondario" href="#/libro/${encodeURIComponent(h.id)}">${ico.info} Dettagli</a></div>
        </div>${copertina(h)}</div></section>`;
    }
    html += '<div class="file">';
    html += fila('Continua a leggere', inLettura, { progresso: true, colore: 'var(--gold)' });
    if (nuovi.length) html += fila('Appena arrivati', nuovi, { colore: 'var(--gold)' });
    for (const [n, r] of Object.entries(RACCOLTE)) {
      html += fila(n, inRaccolta(n), { sotto: r.d, colore: r.c[2], link: '#/raccolta/' + encodeURIComponent(n) });
    }
    html += fila('I più letti', piuLetti, { colore: 'var(--accent)' });
    for (const n of Object.keys(CATEGORIE)) {
      html += fila(n, inCategoria(n), { colore: CATEGORIE[n][2], link: '#/categoria/' + encodeURIComponent(n) });
    }
    html += '</div>';
    app.innerHTML = html;
    attivaFrecce(app);
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
    app.innerHTML = `<div class="pagina"><h1>Raccolte</h1><p class="intro">Scegli da dove cominciare. Tutti i libri sono gratuiti, per sempre.</p>
      <div class="raccolte-elenco">${Object.entries(RACCOLTE).map(([n, r]) => t(n, `${inRaccolta(n).length} libri · ${r.d}`, r.c)).join('')}</div>
      <h2 class="fila-testa" style="padding:0;margin:40px 0 16px;font:600 24px/1.2 var(--display)">Per genere</h2>
      <div class="raccolte-elenco">${Object.entries(CATEGORIE).filter(([n]) => !RACCOLTE[n]).map(([n, c]) => t(n, `${inCategoria(n).length} libri`, c)).join('')}</div></div>`;
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
    const sfondo = b.cov ? `background-image:url('copertine/${esc(b.cov === 1 ? b.id : b.cov)}.webp')` : `background:${colori(b)[2]}`;
    const scaricabile = S.online !== false || b.r;
    el.innerHTML = `<div class="scheda-foglio">
      <button class="chiudi" aria-label="Chiudi">${ico.x}</button>
      <div class="scheda-testa"><div class="sfondo" style="${sfondo}"></div>${copertina(b)}
        <div><h1>${esc(b.t)}</h1>
          <p class="chi">di <b>${esc(autori(b))}</b>${vita(b)}${b.y ? ` · ${b.y}` : ''}</p>
          <div class="etichette">${rac}<span class="etichetta">${esc(b.c)}</span>${b.sc ? '<span class="etichetta">Edizione originale scansionata</span>' : ''}${b.nostra ? '<span class="etichetta">Edizione Libri di strada</span>' : ''}</div>
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
    if (location.hash.startsWith('#/libro/')) history.length > 1 && S.dentro ? history.back() : (location.hash = '#/');
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
    const filtri = ['Tutti', ...Object.keys(RACCOLTE), ...Object.keys(CATEGORIE).filter(n => !RACCOLTE[n])];
    $('#filtri').innerHTML = filtri.map(f => `<button class="filtro ${(S.filtro || 'Tutti') === f ? 'on' : ''}" data-f="${esc(f)}">${esc(f)}</button>`).join('');
    $('#filtri').onclick = e => { const f = e.target.closest('[data-f]'); if (!f) return; S.filtro = f.dataset.f === 'Tutti' ? null : f.dataset.f; apriCerca(); };
    cerca();
    setTimeout(() => $('#q').focus(), 50);
  }
  function chiudiCerca() { $('#cerca').hidden = true; document.body.classList.remove('bloccato'); }
  function cerca() {
    const q = norm($('#q').value.trim());
    const parole = q.split(/\s+/).filter(Boolean);
    let ris = S.libri.filter(b => !S.filtro || b.c === S.filtro || (b.s || []).includes(S.filtro));
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
    window.scrollTo(0, 0);
    evidenzia(p1 || 'home');
    if (!p1) return home();
    if (p1 === 'raccolte') return raccolte();
    if (p1 === 'mia') return mia();
    if (p1 === 'raccolta') return elenco(p2, RACCOLTE[p2]?.d || '', inRaccolta(p2));
    if (p1 === 'categoria') return elenco(p2, `${inCategoria(p2).length} libri`, inCategoria(p2));
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
    S.libri = S.cat.libri;
    S.libri.forEach(b => S.per.set(b.id, b));
    const qs = new URLSearchParams(location.search);
    if (qs.has('qr')) { conta('qr'); history.replaceState(null, '', location.pathname + location.hash); } else conta('visita');
    controllaServer();
    vai();
  }

  window.LDS = { S, esc, toast, conta, datiEpub, db, store, salvaSulTelefono, ico, chiudiScheda };
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  avvio();
})();
