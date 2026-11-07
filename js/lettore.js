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
    casa: '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
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
        <a class="lt-btn" href="#/" aria-label="Torna alla home">${icone.casa}</a>
        <button class="lt-btn" data-a="indice" aria-label="Indice">${icone.indice}</button>
        <button class="lt-btn" data-a="salva" aria-label="Salva nella mia libreria"></button>
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
    const sv = el.querySelector('[data-a="salva"]');
    if (b.e) L.bottoneSalva(sv, b, { icona: L.ico.libreria, testo: false }); else sv.remove();
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
    R.pronto = true;   // da qui in poi pagine e voce funzionano
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
    aggiornaAvanzamento();
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

  // ---------------------------------------------------------------- narratore
  // Frasi intere (la voce fa da sola l'intonazione di virgole e incisi), pause scandite dalla punteggiatura,
  // dialoghi e domande con un tono diverso, pagine girate da sole senza spezzare le frasi.
  const PROFILI = {
    narratrice: { nome: 'Narratrice', pitch: 1, rate: 0.98, genere: 'f' },
    narratore: { nome: 'Narratore', pitch: 0.86, rate: 0.97, genere: 'm' },
    bambini: { nome: 'Per bambini', pitch: 1.16, rate: 0.86, genere: 'f' },
  };
  const FEMMINILI = /elsa|isabella|federica|alice|paola|emma|bianca|carla|giulia|chiara|elena|irene|silvia|lucia|sara|female|donna/i;
  const MASCHILI = /diego|luca|giuseppe|cosimo|calogero|benigno|gianni|marco|paolo|giorgio|rinaldo|male|uomo/i;
  function vociItaliane() {
    // Google italiano per prima: è la più espressiva; poi le voci «naturali» o «migliorate» del sistema
    const q = v => (/google/i.test(v.name) ? 4 : /natural|neural|premium|enhanced|migliorat|online|siri/i.test(v.name) ? 3 : v.localService ? 1 : 0);
    return speechSynthesis.getVoices().filter(v => /^it/i.test(v.lang)).sort((a, b) => q(b) - q(a));
  }
  function voceScelta() {
    const i = imp(), tutte = vociItaliane();
    if (i.voceNome) { const v = tutte.find(x => x.name === i.voceNome); if (v) return v; }
    const google = tutte.find(v => /google/i.test(v.name));
    if (google) return google;   // stessa voce per tutti i profili: cambiano tono e velocità
    const g = PROFILI[i.profilo || 'narratrice'].genere;
    return tutte.find(v => (g === 'f' ? FEMMINILI : MASCHILI).test(v.name)) || tutte[0] || null;
  }
  if ('speechSynthesis' in window) { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => {}; }

  const ROMANI = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  const daRomano = r => [...r].reduce((t, c, k, a) => t + (ROMANI[c] < (ROMANI[a[k + 1]] || 0) ? -ROMANI[c] : ROMANI[c]), 0);
  function pulisciPerVoce(t) {
    return t
      .replace(/\[\d+\]|\(\d+\)/g, '')                                                   // numeri di nota
      .replace(/\b(Capitolo|Canto|Parte|Libro|Scena|Atto)\s+([IVXLCDM]{1,7})\b/g, (m, p, r) => `${p} ${daRomano(r)}`)
      .replace(/\becc\.(?=\s|$)/gi, 'eccetera').replace(/\bpag\.\s*/gi, 'pagina ').replace(/\bSig\.\s*/g, 'Signor ').replace(/\bSig\.ra\s*/g, 'Signora ')
      .replace(/\bDott\.\s*/g, 'Dottor ').replace(/\bProf\.\s*/g, 'Professor ').replace(/\bS\. E\./g, 'Sua Eccellenza')
      .replace(/[_*#]+/g, ' ').replace(/[ \t]+/g, ' ');
  }
  // divide in frasi, ricordando dove finiscono i paragrafi e cosa è dialogo
  function frasiDi(testo) {
    const out = [];
    pulisciPerVoce(testo).split(/\n\s*\n|\n(?=\s*[—–-]\s)/).forEach(par => {
      const p = par.replace(/\s+/g, ' ').trim();
      if (!p) return;
      const pezzi = p.match(/[^.!?…]+(?:[.!?…]+["»”’)]*|$)\s*/g) || [p];
      pezzi.forEach((f, k) => {
        const s = f.trim();
        if (!s || !/[\p{L}\p{N}]/u.test(s)) return;
        out.push({ t: s, fine: k === pezzi.length - 1, dialogo: /^[«"“]/.test(s) || /^[—–-]\s*[\p{Lu}«"]/u.test(s) });   // «— rispose lui» è narrazione
      });
    });
    return out;
  }
  function parla(f, prof, voce) {
    return new Promise(res => {
      const u = new SpeechSynthesisUtterance(f.t.replace(/^[—–-]\s*/, ''));
      u.lang = 'it-IT';
      if (voce) u.voice = voce;
      const vel = imp().velocita || 1;
      let pitch = prof.pitch, rate = prof.rate * vel;
      if (f.dialogo) pitch += 0.08;                         // le voci dei personaggi un po' diverse dalla narrazione
      if (/\?["»”’)]*$/.test(f.t)) pitch += 0.05;            // le domande salgono
      if (/!["»”’)]*$/.test(f.t)) { pitch += 0.04; rate *= 1.04; }
      u.pitch = Math.min(2, pitch); u.rate = Math.max(0.5, Math.min(1.6, rate));
      u.onend = () => res(true); u.onerror = () => res(false);
      speechSynthesis.speak(u);
    });
  }
  const attendi = ms => new Promise(r => setTimeout(r, ms));
  const pausaDopo = f => (f.fine ? 650 : /[?!]["»”’)]*$/.test(f.t) ? 420 : /[.…]["»”’)]*$/.test(f.t) ? 330 : 120);

  // testo dalla posizione attuale fino alla fine del capitolo, e quanti caratteri ci sono nella pagina visibile
  async function testoDaQui() {
    const loc = R.rend.location;
    const a = await R.book.getRange(loc.start.cfi), z = await R.book.getRange(loc.end.cfi);
    const doc = a.startContainer.ownerDocument;
    const r = doc.createRange(); r.setStart(a.startContainer, a.startOffset); r.setEndAfter(doc.body.lastChild || doc.body);
    const pagina = doc.createRange(); pagina.setStart(a.startContainer, a.startOffset); pagina.setEnd(z.startContainer, z.startOffset);
    // i paragrafi diventano righe vuote, così le pause di fine paragrafo funzionano
    const div = doc.createElement('div'); div.appendChild(r.cloneContents());
    div.querySelectorAll('p, h1, h2, h3, h4, li, div, br').forEach(e => e.insertAdjacentText('afterend', '\n\n'));
    return { testo: div.textContent, pagina: pagina.toString().replace(/\s+/g, ' ').length };
  }

  // ---- controllo della lettura: pausa, ripeti la pagina, salta la frase, capitoli, spegnimento
  const N = { pausa: false, ripeti: false, fineTimer: 0, frase: 0, frasi: 0 };
  async function leggiAdAltaVoce() {
    if (!('speechSynthesis' in window)) return toast('Questo browser non sa leggere ad alta voce');
    R.voce = true; N.pausa = false; aggiornaVoce();
    const giro = R.giro = Symbol();
    if (!voceScelta()) toast('Nessuna voce italiana sul dispositivo: uso quella predefinita');
    while (R.voce && R.giro === giro && R.rend) {
      N.ripeti = false;
      let blocco;
      try { blocco = await testoDaQui(); } catch { blocco = { testo: await testoPagina(), pagina: 1e9 }; }
      const frasi = frasiDi(blocco.testo);
      let letti = 0, soglia = blocco.pagina, i = 0;
      N.frasi = frasi.length;
      while (i < frasi.length) {
        if (!R.voce || R.giro !== giro) return;
        if (N.ripeti) break;
        if (N.pausa) { await attendi(200); continue; }
        if (N.fineTimer && Date.now() > N.fineTimer) { N.fineTimer = 0; N.pausa = true; aggiornaVoce(); toast('Buonanotte: lettura in pausa'); continue; }
        const f = frasi[i];
        N.frase = i; aggiornaAvanzamento();
        const ok = await parla(f, PROFILI[imp().profilo || 'narratrice'], voceScelta());
        if (!ok && (N.pausa || N.ripeti)) continue;          // interrotta da pausa o «ripeti»: si riprende da qui
        i++;
        letti += f.t.length + 1;
        if (letti >= soglia - 4) {                           // pagina finita: si gira senza fermare la voce
          const prima = R.rend.location.start.cfi;
          await R.rend.next();
          try { const l = R.rend.location; const a = await R.book.getRange(l.start.cfi), z = await R.book.getRange(l.end.cfi);
            const pr = a.startContainer.ownerDocument.createRange(); pr.setStart(a.startContainer, a.startOffset); pr.setEnd(z.startContainer, z.startOffset);
            soglia += pr.toString().replace(/\s+/g, ' ').length; } catch { soglia = 1e9; }
          if (R.rend.location.start.cfi === prima) soglia = 1e9;
        }
        if (ok) await attendi(pausaDopo(f));
      }
      if (!R.voce || R.giro !== giro) return;
      if (N.ripeti) continue;
      const sezione = R.rend.location.start.index;
      await R.rend.next();
      while (R.rend.location && R.rend.location.start.index === sezione && !R.rend.location.atEnd) await R.rend.next();
      if (R.rend.location && R.rend.location.atEnd && R.rend.location.start.index === sezione) { fermaVoce(); toast('Fine del libro'); return; }
      await attendi(900);
    }
  }
  function fermaVoce() { R.voce = false; N.pausa = false; try { speechSynthesis.cancel(); } catch { /* */ } aggiornaVoce(); }
  function comandoVoce(c) {
    if (c === 'play') {
      if (!R.voce) return leggiAdAltaVoce();
      N.pausa = !N.pausa;
      if (N.pausa) speechSynthesis.cancel();
      return aggiornaVoce();
    }
    if (!R.voce) return;
    if (c === 'avanti') { speechSynthesis.cancel(); return; }                       // la frase in corso si salta
    if (c === 'indietro') { N.ripeti = true; speechSynthesis.cancel(); return; }    // si ricomincia la pagina
    if (c === 'prec' || c === 'succ') {
      const loc = R.rend.location, voci = (R.book.navigation && R.book.navigation.toc) || [];
      const piatta = voci.flatMap(v => [v, ...(v.subitems || [])]);
      const qui = piatta.findIndex(v => R.book.spine.get(v.href) && R.book.spine.get(v.href).index === loc.start.index);
      const dove = piatta[qui + (c === 'succ' ? 1 : -1)];
      N.ripeti = true; speechSynthesis.cancel();
      if (dove) R.rend.display(dove.href); else (c === 'succ' ? R.rend.next() : R.rend.prev());
    }
  }

  // ---- il pannello in basso, uguale al lettore degli audiolibri
  const SVG = {
    play: '<svg viewBox="0 0 24 24" class="pieno"><path d="M8 5.5v13l11-6.5z"/></svg>',
    pausa: '<svg viewBox="0 0 24 24" class="pieno"><rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/></svg>',
    prec: '<svg viewBox="0 0 24 24"><path d="M6 5v14M18 5l-9 7 9 7z"/></svg>', succ: '<svg viewBox="0 0 24 24"><path d="M18 5v14M6 5l9 7-9 7z"/></svg>',
    ripeti: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v4.5h4.5"/></svg>', salta: '<svg viewBox="0 0 24 24"><path d="M5 12h12M13 7l5 5-5 5"/></svg>',
    giu: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>', x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    luna: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
  };
  function apriPlayer() {
    let p = el.querySelector('.lt-player');
    if (p) { p.classList.remove('mini'); return; }
    const i = imp();
    el.insertAdjacentHTML('beforeend', `<div class="lt-player">
      <button class="lt-pl-maniglia" data-p="riduci" aria-label="Riduci">${SVG.giu}</button>
      <div class="lt-pl-mini"><button class="lt-pl-mini-play" data-p="play">${SVG.play}</button><span class="lt-pl-mini-cap"></span><button data-p="apri">Apri</button><button data-p="chiudi" aria-label="Ferma e chiudi">${SVG.x}</button></div>
      <div class="lt-pl-corpo">
        <div class="lt-pl-testa"><div><span class="lt-pl-occhiello">Voce narrante</span><b>${esc(R.b.t.replace(/\s*\([^)]*\)\s*$/, ''))}</b><span class="lt-pl-cap"></span></div>
          <button class="lt-pl-chiudi" data-p="chiudi" aria-label="Ferma e chiudi">${SVG.x}</button></div>
        <div class="lt-pl-gruppo"><span>Chi legge</span><div class="lt-pl-voci">${Object.entries(PROFILI).map(([k, p]) => `<button data-prof="${k}" class="${(i.profilo || 'narratrice') === k ? 'on' : ''}"><i>${p.nome[0]}</i>${p.nome}</button>`).join('')}
          <select data-voce aria-label="Altre voci"><option value="">Altre voci…</option>${vociItaliane().map(v => `<option ${i.voceNome === v.name ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select></div></div>
        <div class="lt-pl-tempo"><div class="lt-pl-barra"><i></i></div><div><span class="lt-pl-perc">0%</span><span class="lt-pl-frase"></span></div></div>
        <div class="lt-pl-comandi"><button data-p="prec" aria-label="Capitolo precedente">${SVG.prec}</button><button data-p="indietro" aria-label="Ripeti la pagina">${SVG.ripeti}</button>
          <button data-p="play" class="lt-pl-play" aria-label="Leggi">${SVG.play}</button>
          <button data-p="avanti" aria-label="Salta la frase">${SVG.salta}</button><button data-p="succ" aria-label="Capitolo successivo">${SVG.succ}</button></div>
        <div class="lt-pl-opzioni">
          <div class="lt-pl-gruppo"><span>Velocità</span><div class="lt-pl-seg">${[0.8, 0.9, 1, 1.15, 1.3].map(v => `<button data-vel="${v}" class="${(i.velocita || 1) === v ? 'on' : ''}">${String(v).replace('.', ',')}×</button>`).join('')}</div></div>
          <div class="lt-pl-gruppo"><span>${SVG.luna} Spegni dopo</span><div class="lt-pl-seg">${[[0, 'No'], [15, '15 min'], [30, '30 min'], [60, '1 ora']].map(([m, n]) => `<button data-t="${m}" class="${m === 0 ? 'on' : ''}">${n}</button>`).join('')}</div></div></div>
        <p class="lt-pl-consiglio">La voce è quella del tuo dispositivo. Per una più naturale: iPhone → Impostazioni → Accessibilità → Contenuti letti → Voci → scarica una voce «migliorata»; sul PC usa Edge. I libri con <b>voce umana</b> si ascoltano dalla scheda.</p>
      </div></div>`);
    p = el.querySelector('.lt-player');
    requestAnimationFrame(() => p.classList.add('su'));
    p.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.p === 'riduci') return p.classList.add('mini');
      if (b.dataset.p === 'apri') return p.classList.remove('mini');
      if (b.dataset.p === 'chiudi') { fermaVoce(); p.classList.remove('su'); return setTimeout(() => p.remove(), 300); }
      if (b.dataset.p) return comandoVoce(b.dataset.p);
      if (b.dataset.prof) { sv('profilo', b.dataset.prof); sv('voceNome', ''); p.querySelector('[data-voce]').value = ''; p.querySelectorAll('[data-prof]').forEach(x => x.classList.toggle('on', x === b)); }
      if (b.dataset.vel) { sv('velocita', +b.dataset.vel); p.querySelectorAll('[data-vel]').forEach(x => x.classList.toggle('on', x === b)); }
      if (b.dataset.t !== undefined) { const m = +b.dataset.t; N.fineTimer = m ? Date.now() + m * 60000 : 0; p.querySelectorAll('[data-t]').forEach(x => x.classList.toggle('on', x === b)); if (m) toast(`La lettura si fermerà tra ${m} minuti`); }
    });
    p.querySelector('[data-voce]').onchange = e => { sv('voceNome', e.target.value); p.querySelectorAll('[data-prof]').forEach(x => x.classList.toggle('on', !e.target.value && x.dataset.prof === (imp().profilo || 'narratrice'))); };
    aggiornaAvanzamento();
  }
  function aggiornaAvanzamento() {
    const p = el.querySelector('.lt-player'); if (!p) return;
    const perc = R.locOk && R.rend && R.rend.location ? Math.round((R.book.locations.percentageFromCfi(R.rend.location.start.cfi) || 0) * 100) : null;
    const cap = (document.getElementById('lt-cap') || {}).textContent || '';
    p.querySelector('.lt-pl-barra i').style.width = (perc || 0) + '%';
    p.querySelector('.lt-pl-perc').textContent = perc === null ? '' : `${perc}% del libro`;
    p.querySelector('.lt-pl-frase').textContent = R.voce && N.frasi ? `frase ${N.frase + 1} di ${N.frasi} del capitolo` : '';
    p.querySelectorAll('.lt-pl-cap, .lt-pl-mini-cap').forEach(x => (x.textContent = cap || 'Pronto a leggere'));
  }
  function aggiornaVoce() {
    const b = el.querySelector('[data-a="voce"]');
    const suona = R.voce && !N.pausa;
    if (b) { b.classList.toggle('on', R.voce); b.setAttribute('aria-label', 'Voce narrante'); }
    const p = el.querySelector('.lt-player');
    if (p) { p.querySelectorAll('[data-p="play"]').forEach(x => (x.innerHTML = suona ? SVG.pausa : SVG.play)); p.classList.toggle('suona', suona); }
    aggiornaAvanzamento();
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
` });
    if (!p) return;
    const sel = p.querySelector('[data-voce]');
    if (sel) {
      sel.onclick = e => e.stopPropagation();
      sel.onchange = () => {
        sv('voceNome', sel.value);
        if ('speechSynthesis' in window) { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance('Ciao, sono la voce che leggerà il tuo libro.'); const v = voceScelta(); if (v) u.voice = v; u.lang = 'it-IT'; speechSynthesis.speak(u); }
      };
    }
    p.onclick = e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.dim) sv('dim', Math.min(200, Math.max(70, imp().dim + Number(t.dataset.dim))));
      if (t.dataset.font) sv('font', t.dataset.font);
      if (t.dataset.riga) sv('riga', Number(t.dataset.riga));
      if (t.dataset.tema) sv('tema', t.dataset.tema);
      if (t.dataset.vel) sv('velocita', Number(t.dataset.vel));
      if (t.dataset.prof) { sv('profilo', t.dataset.prof); sv('voceNome', ''); }
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
    if (!R.rend || !R.pronto) return;   // il libro si sta ancora aprendo
    if (a === 'succ') { document.getElementById('lt-pannello').hidden = true; return R.rend.next(); }
    if (a === 'prec') { document.getElementById('lt-pannello').hidden = true; return R.rend.prev(); }
    if (a === 'aa') return pannelloImpostazioni();
    if (a === 'indice') return pannelloIndice();
    if (a === 'segno') return segnalibro();
    if (a === 'voce') { apriPlayer(); if (!R.voce) leggiAdAltaVoce(); return; }
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
    R.book = R.rend = null; R.b = null; R.locOk = false; R.pronto = false;
    if (!el.hidden) { el.hidden = true; el.innerHTML = ''; document.body.classList.remove('bloccato'); }
  }

  window.LDSLettore = { apri, chiudi };
})();
