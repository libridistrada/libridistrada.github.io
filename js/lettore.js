/* Libri di strada — lettore ePub (epub.js) con «Lettura per tutti»:
   voce del telefono, carattere per dislessia, testo grande, temi, segnalibri, riprendi da dove eri. */
(() => {
  'use strict';
  const L = window.LDS;
  const { esc, toast, store, ico } = L;
  const el = document.getElementById('lettore');
  const TEMI = {
    carta: { bg: '#f7f2e8', fg: '#1f1b16', ui: 'chiaro' },
    seppia: { bg: '#efe0c2', fg: '#3b2c1a', ui: 'chiaro' },
    notte: { bg: '#111114', fg: '#d9d3c7', ui: 'scuro' },
  };
  const CARATTERI = { Literata: 'Literata, Georgia, serif', OpenDyslexic: 'OpenDyslexic, sans-serif', Classico: 'Georgia, "Times New Roman", serif', Moderno: 'Inter, system-ui, sans-serif' };
  const imp = () => Object.assign({ tema: 'carta', dim: 110, font: 'Literata', riga: 1.6 }, store.get('imp', {}));
  const LIBRO_CSS = new URL('css/lettore-libro.css', location.href).href;

  const R = { book: null, rend: null, b: null, voce: false, locOk: false };
  const sv = (k, v) => { const i = imp(); i[k] = v; store.set('imp', i); };

  const icone = {
    indietro: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    indice: '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
    segno: '<svg viewBox="0 0 24 24"><path d="M6 3.5h12v17l-6-4-6 4z"/></svg>',
    aa: '<svg viewBox="0 0 24 24"><path d="M3 19l5-14 5 14M5 14h6M15 19l3.5-9 3.5 9M16 16h5"/></svg>',
    voce: '<svg viewBox="0 0 24 24"><path d="M4 9.5v5h4l5 4v-13l-5 4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
    pausa: '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>',
  };

  function interfaccia(b) {
    const i = imp();
    el.className = 'lettore ui-' + TEMI[i.tema].ui;
    el.style.setProperty('--lt-bg', TEMI[i.tema].bg); el.style.setProperty('--lt-fg', TEMI[i.tema].fg);
    el.innerHTML = `
      <div class="lt-barra lt-su">
        <button class="lt-btn" data-a="esci" aria-label="Chiudi il libro">${icone.indietro}</button>
        <div class="lt-titolo"><b>${esc(b.t)}</b><span id="lt-cap"></span></div>
        <button class="lt-btn" data-a="indice" aria-label="Indice">${icone.indice}</button>
        <button class="lt-btn" data-a="segno" aria-label="Segnalibro">${icone.segno}</button>
        <button class="lt-btn" data-a="voce" aria-label="Leggi ad alta voce">${icone.voce}</button>
        <button class="lt-btn" data-a="aa" aria-label="Impostazioni di lettura">${icone.aa}</button>
      </div>
      <div class="lt-pagina"><div id="lt-libro"></div>
        <button class="lt-zona sx" data-a="prec" aria-label="Pagina precedente"></button>
        <button class="lt-zona dx" data-a="succ" aria-label="Pagina successiva"></button>
        <div class="lt-carica" id="lt-carica"><div class="anello"></div><span>Apro il libro…</span></div></div>
      <div class="lt-barra lt-giu"><span id="lt-perc">—</span>
        <input type="range" id="lt-cursore" min="0" max="1000" value="0" aria-label="Posizione nel libro" disabled>
        <span id="lt-resto"></span></div>
      <div class="lt-pannello" id="lt-pannello" hidden></div>`;
    el.hidden = false;
    document.body.classList.add('bloccato');
    el.onclick = e => { const a = e.target.closest('[data-a]'); if (a) azione(a.dataset.a); };
  }

  function applicaStile() {
    if (!R.rend) return;
    const i = imp(), t = TEMI[i.tema];
    R.rend.themes.override('color', t.fg, true);
    R.rend.themes.override('background', t.bg, true);
    R.rend.themes.override('font-family', CARATTERI[i.font], true);
    R.rend.themes.override('line-height', String(i.riga), true);
    R.rend.themes.fontSize(i.dim + '%');
    el.className = 'lettore ui-' + t.ui;
    el.style.setProperty('--lt-bg', t.bg); el.style.setProperty('--lt-fg', t.fg);
  }

  async function apri(b) {
    chiudi(true);
    R.b = b;
    interfaccia(b);
    let dati;
    try { dati = await L.datiEpub(b); }
    catch (e) { document.getElementById('lt-carica').innerHTML = `<p>${esc(e.message)}</p><button class="btn contorno" data-a="esci">Torna indietro</button>`; return; }
    if (R.b !== b) return;
    R.book = ePub(dati);
    R.rend = R.book.renderTo('lt-libro', { width: '100%', height: '100%', flow: 'paginated', spread: 'auto', minSpreadWidth: 900, allowScriptedContent: false });
    R.rend.themes.register('lds', LIBRO_CSS);
    R.rend.themes.select('lds');
    applicaStile();
    // tocchi e scorrimenti dentro la pagina del libro
    R.rend.hooks.content.register(c => {
      const d = c.document;
      let x0 = null, y0 = null;
      d.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
      d.addEventListener('touchend', e => {
        if (x0 === null) return;
        const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) azione(dx < 0 ? 'succ' : 'prec');
        x0 = null;
      }, { passive: true });
      d.addEventListener('keydown', tasti);
      d.addEventListener('click', () => { const p = document.getElementById('lt-pannello'); if (p) p.hidden = true; });
    });
    R.rend.on('relocated', loc => posizione(loc));
    const pos = (store.get('pos', {})[b.id] || {}).cfi;
    try { await R.rend.display(pos || undefined); }
    catch { await R.rend.display(); }
    document.getElementById('lt-carica').remove();
    // le posizioni (per la percentuale) si calcolano dopo, senza bloccare la lettura
    R.book.ready.then(() => R.book.locations.generate(1600)).then(() => {
      if (R.book !== null) { R.locOk = true; const c = document.getElementById('lt-cursore'); if (c) c.disabled = false; if (R.rend.location) posizione(R.rend.location); }
    }).catch(() => {});
    const cur = document.getElementById('lt-cursore');
    cur.onchange = () => { if (R.locOk) R.rend.display(R.book.locations.cfiFromPercentage(cur.value / 1000)); };
  }

  function posizione(loc) {
    if (!loc || !loc.start || !R.b) return;
    const cfi = loc.start.cfi;
    let p = loc.start.percentage || 0;
    if (R.locOk) p = R.book.locations.percentageFromCfi(cfi) || p;
    const tutte = store.get('pos', {});
    tutte[R.b.id] = { cfi, p, t: Date.now() };
    store.set('pos', tutte);
    const perc = document.getElementById('lt-perc'), cur = document.getElementById('lt-cursore'), resto = document.getElementById('lt-resto');
    if (perc) perc.textContent = R.locOk ? Math.round(p * 100) + '%' : '';
    if (cur && R.locOk) cur.value = Math.round(p * 1000);
    if (resto && R.locOk) { const n = R.book.locations.length(); const min = Math.max(1, Math.round((1 - p) * n * 1600 / 5.5 / 230)); resto.textContent = min > 90 ? `${Math.round(min / 60)} ore alla fine` : `${min} min alla fine`; }
    const capEl = document.getElementById('lt-cap');
    if (capEl) {
      const voce = R.book.navigation && R.book.navigation.get(loc.start.href);
      capEl.textContent = voce ? voce.label.trim() : '';
    }
    segnoAttivo();
  }

  function segni() { return store.get('segni', {})[R.b.id] || []; }
  function segnoAttivo() {
    const btn = el.querySelector('[data-a="segno"]');
    if (!btn || !R.rend || !R.rend.location) return;
    const cfi = R.rend.location.start.cfi;
    btn.classList.toggle('on', segni().some(s => s.cfi === cfi));
  }

  async function testoPagina() {
    // testo della pagina visibile: dall'inizio alla fine della posizione corrente
    const loc = R.rend && R.rend.location;
    if (!loc) return '';
    try {
      const a = await R.book.getRange(loc.start.cfi), z = await R.book.getRange(loc.end.cfi);
      if (a && z && a.startContainer.ownerDocument === z.startContainer.ownerDocument) {
        const r = a.startContainer.ownerDocument.createRange();
        r.setStart(a.startContainer, a.startOffset);
        r.setEnd(z.startContainer, z.startOffset);
        const t = r.toString();
        if (t.trim()) return t;
      }
    } catch { /* sotto il metodo di riserva */ }
    try { const c = R.rend.getContents()[0]; return c ? c.document.body.innerText.slice(0, 1500) : ''; } catch { return ''; }
  }

  function voceItaliana() {
    const v = speechSynthesis.getVoices();
    return v.find(x => /^it/i.test(x.lang) && /google|enhanced|premium|alice|federica|luca/i.test(x.name)) || v.find(x => /^it/i.test(x.lang));
  }
  async function leggiAdAltaVoce() {
    if (!('speechSynthesis' in window)) return toast('Il telefono non sa leggere ad alta voce da qui');
    if (R.voce) { R.voce = false; speechSynthesis.cancel(); aggiornaVoce(); return; }
    R.voce = true; aggiornaVoce();
    const giro = async () => {
      if (!R.voce || !R.rend) return;
      const t = (await testoPagina()).replace(/\s+/g, ' ').trim();
      const prossima = async () => { if (!R.voce) return; await R.rend.next(); setTimeout(giro, 250); };
      if (!t) return prossima();
      // frasi corte: le voci dei telefoni si interrompono con testi lunghi
      const frasi = t.match(/[^.!?;:]+[.!?;:]*\s*/g) || [t];
      let i = 0;
      const dì = () => {
        if (!R.voce) return;
        if (i >= frasi.length) return prossima();
        const u = new SpeechSynthesisUtterance(frasi[i++]);
        u.lang = 'it-IT'; const v = voceItaliana(); if (v) u.voice = v;
        u.rate = imp().velocita || 1;
        u.onend = dì; u.onerror = () => { R.voce = false; aggiornaVoce(); };
        speechSynthesis.speak(u);
      };
      dì();
    };
    giro();
  }
  function aggiornaVoce() {
    const b = el.querySelector('[data-a="voce"]');
    if (b) { b.classList.toggle('on', R.voce); b.innerHTML = R.voce ? icone.pausa : icone.voce; b.setAttribute('aria-label', R.voce ? 'Ferma la lettura' : 'Leggi ad alta voce'); }
  }

  function pannello(html) {
    const p = document.getElementById('lt-pannello');
    if (!html || (!p.hidden && p.dataset.tipo === html.tipo)) { p.hidden = true; p.dataset.tipo = ''; return; }
    p.innerHTML = html.corpo; p.dataset.tipo = html.tipo; p.hidden = false;
    return p;
  }

  function pannelloImpostazioni() {
    const i = imp();
    const p = pannello({ tipo: 'aa', corpo: `
      <h4>Lettura</h4>
      <div class="lt-riga"><span>Testo</span><div class="lt-passi"><button data-dim="-10" aria-label="Testo più piccolo">A−</button><b>${i.dim}%</b><button data-dim="10" aria-label="Testo più grande">A+</button></div></div>
      <div class="lt-riga"><span>Carattere</span><div class="lt-scelte">${Object.keys(CARATTERI).map(f => `<button class="${i.font === f ? 'on' : ''}" data-font="${f}" style="font-family:${CARATTERI[f]}">${f === 'OpenDyslexic' ? 'Dislessia' : f}</button>`).join('')}</div></div>
      <div class="lt-riga"><span>Interlinea</span><div class="lt-scelte">${[[1.4, 'Stretta'], [1.6, 'Normale'], [1.9, 'Ampia']].map(([v, n]) => `<button class="${i.riga === v ? 'on' : ''}" data-riga="${v}">${n}</button>`).join('')}</div></div>
      <div class="lt-riga"><span>Tema</span><div class="lt-scelte">${Object.entries(TEMI).map(([n, t]) => `<button class="tema ${i.tema === n ? 'on' : ''}" data-tema="${n}" style="background:${t.bg};color:${t.fg}">${n[0].toUpperCase() + n.slice(1)}</button>`).join('')}</div></div>
      <div class="lt-riga"><span>Voce</span><div class="lt-scelte">${[[.85, 'Lenta'], [1, 'Normale'], [1.2, 'Veloce']].map(([v, n]) => `<button class="${(i.velocita || 1) === v ? 'on' : ''}" data-vel="${v}">${n}</button>`).join('')}</div></div>` });
    if (!p) return;
    p.onclick = e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.dim) sv('dim', Math.min(200, Math.max(70, imp().dim + Number(t.dataset.dim))));
      if (t.dataset.font) sv('font', t.dataset.font);
      if (t.dataset.riga) sv('riga', Number(t.dataset.riga));
      if (t.dataset.tema) sv('tema', t.dataset.tema);
      if (t.dataset.vel) sv('velocita', Number(t.dataset.vel));
      applicaStile(); p.hidden = true; pannelloImpostazioni();
    };
  }

  function pannelloIndice() {
    const toc = (R.book && R.book.navigation && R.book.navigation.toc) || [];
    const piatta = (arr, liv = 0) => arr.flatMap(v => [[v, liv], ...piatta(v.subitems || [], liv + 1)]);
    const ss = segni();
    const p = pannello({ tipo: 'indice', corpo: `<h4>Indice</h4><div class="lt-lista">${piatta(toc).map(([v, l]) => `<button data-vai="${esc(v.href)}" style="padding-left:${12 + l * 16}px">${esc(v.label.trim())}</button>`).join('') || '<p class="muted">Questo libro non ha un indice.</p>'}</div>
      ${ss.length ? `<h4>Segnalibri</h4><div class="lt-lista">${ss.map((s, k) => `<button data-segno="${k}">${esc(s.testo || 'Segnalibro')}<small>${Math.round((s.p || 0) * 100)}%</small></button>`).join('')}</div>` : ''}` });
    if (!p) return;
    p.onclick = e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.vai) R.rend.display(t.dataset.vai);
      if (t.dataset.segno) R.rend.display(ss[Number(t.dataset.segno)].cfi);
      p.hidden = true;
    };
  }

  async function segnalibro() {
    const loc = R.rend && R.rend.location; if (!loc) return;
    const tutti = store.get('segni', {}); const ss = tutti[R.b.id] || [];
    const k = ss.findIndex(s => s.cfi === loc.start.cfi);
    if (k >= 0) { ss.splice(k, 1); toast('Segnalibro tolto'); }
    else {
      const t = (await testoPagina()).replace(/\s+/g, ' ').trim().slice(0, 70);
      ss.push({ cfi: loc.start.cfi, p: (store.get('pos', {})[R.b.id] || {}).p || 0, testo: t ? t + '…' : '', t: Date.now() });
      toast('Segnalibro aggiunto');
    }
    tutti[R.b.id] = ss; store.set('segni', tutti); segnoAttivo();
  }

  function azione(a) {
    if (a === 'esci') return esci();
    if (!R.rend) return;
    if (a === 'succ') { document.getElementById('lt-pannello').hidden = true; return R.rend.next(); }
    if (a === 'prec') { document.getElementById('lt-pannello').hidden = true; return R.rend.prev(); }
    if (a === 'aa') return pannelloImpostazioni();
    if (a === 'indice') return pannelloIndice();
    if (a === 'segno') return segnalibro();
    if (a === 'voce') return leggiAdAltaVoce();
  }
  function tasti(e) {
    if (el.hidden) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); azione('succ'); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); azione('prec'); }
    if (e.key === 'Escape') esci();
  }
  document.addEventListener('keydown', tasti);

  function esci() {
    const id = R.b && R.b.id;
    chiudi(true);
    if (location.hash.startsWith('#/leggi/')) location.hash = id ? '#/libro/' + encodeURIComponent(id) : '#/';
  }
  function chiudi(silenzioso) {
    R.voce = false; try { speechSynthesis.cancel(); } catch { /* */ }
    if (R.book) { try { R.book.destroy(); } catch { /* */ } }
    R.book = R.rend = null; R.b = null; R.locOk = false;
    if (!el.hidden) { el.hidden = true; el.innerHTML = ''; document.body.classList.remove('bloccato'); }
  }

  window.LDSLettore = { apri, chiudi };
})();
