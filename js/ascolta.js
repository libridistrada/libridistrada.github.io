/* Libri di strada — audiolibri con voce umana (LibriVox: letture di volontari, in pubblico dominio).
   Nella scheda del libro: «Ascolta · voce umana». I file restano sull'Internet Archive e partono solo se premi
   il pulsante; il punto d'ascolto resta sul telefono. */
(() => {
  'use strict';
  const L = window.LDS;
  const esc = L.esc;
  const scheda = document.getElementById('scheda');
  const I = {
    cuffie: '<svg viewBox="0 0 24 24"><path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="5" height="7" rx="2"/><rect x="16" y="14" width="5" height="7" rx="2"/></svg>',
    play: '<svg viewBox="0 0 24 24" class="pieno"><path d="M8 5.5v13l11-6.5z"/></svg>',
    pausa: '<svg viewBox="0 0 24 24" class="pieno"><rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/></svg>',
    prec: '<svg viewBox="0 0 24 24"><path d="M6 5v14M18 5l-9 7 9 7z"/></svg>',
    succ: '<svg viewBox="0 0 24 24"><path d="M18 5v14M6 5l9 7-9 7z"/></svg>',
    indietro: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v4.5h4.5"/><text x="12" y="15.5" font-size="7" text-anchor="middle" fill="currentColor" stroke="none" font-family="Inter,sans-serif" font-weight="700">15</text></svg>',
    avanti: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.5-5.8M20 4v4.5h-4.5"/><text x="12" y="15.5" font-size="7" text-anchor="middle" fill="currentColor" stroke="none" font-family="Inter,sans-serif" font-weight="700">30</text></svg>',
    luna: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
    lista: '<svg viewBox="0 0 24 24"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>',
  };
  const VELOCITA = [0.75, 1, 1.25, 1.5, 2];
  const lista = b => (Array.isArray(b.au) ? b.au : b.au ? [b.au] : []);

  function aggiungi() {
    if (scheda.hidden || scheda.querySelector('.ascolta-btn')) return;
    const b = L.S.per.get(decodeURIComponent(location.hash.split('/').pop()));
    const bottoni = scheda.querySelector('.scheda-testa .bottoni');
    if (!b || !lista(b).length || !bottoni) return;
    bottoni.insertAdjacentHTML('beforeend', `<button class="btn secondario ascolta-btn">${I.cuffie} Ascolta · voce umana</button>`);
    bottoni.querySelector('.ascolta-btn').onclick = () => apri(b);
  }
  new MutationObserver(aggiungi).observe(scheda, { childList: true });

  // «avventure_di_pinocchio_ch_01_64kb.mp3» -> «Capitolo 1»; se c'è un titolo vero, quello
  function nomeParte(f) {
    const t = (f.title || '').trim();
    if (t && !/^[\w-]+$/.test(t)) return t;
    const n = (f.name.replace(/_64kb\.mp3$|\.mp3$/i, '').match(/(\d+)\D*$/) || [])[1];
    return n ? `Capitolo ${+n}` : f.name.replace(/_64kb\.mp3$|\.mp3$/i, '').replace(/[_-]+/g, ' ');
  }
  async function leggiVersione(id) {
    const m = await (await fetch(`https://archive.org/metadata/${encodeURIComponent(id)}`)).json();
    const d = String((m.metadata || {}).description || '').replace(/<[^>]+>/g, ' ');
    const lettore = (d.match(/Read (?:in Italian )?by ([^.\n]+?)(?:\.|\n|$)/i) || [])[1];
    const mp3 = (m.files || []).filter(f => /\.mp3$/i.test(f.name) && /64kb/i.test(f.name));
    const tracce = (mp3.length ? mp3 : (m.files || []).filter(f => /\.mp3$/i.test(f.name)))
      .sort((x, y) => x.name.localeCompare(y.name, 'it', { numeric: true }))
      .map(f => ({ url: `https://archive.org/download/${encodeURIComponent(id)}/${f.name.split('/').map(encodeURIComponent).join('/')}`, titolo: nomeParte(f), durata: +f.length || 0 }));
    const titolo = String((m.metadata || {}).title || '').replace(/^.*?:\s*/, '').trim();
    return { id, titolo, lettore: lettore ? lettore.replace(/\s+/g, ' ').trim() : null, tracce };
  }
  const mmss = s => { s = Math.max(0, Math.floor(s || 0)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = String(s % 60).padStart(2, '0'); return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`; };

  async function apri(b) {
    let p = scheda.querySelector('.ascolta');
    if (p) { p.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    scheda.querySelector('.scheda-corpo').insertAdjacentHTML('beforebegin', `<section class="ascolta"><div class="carica" style="min-height:160px"><div class="anello"></div></div></section>`);
    p = scheda.querySelector('.ascolta');
    p.scrollIntoView({ behavior: 'smooth', block: 'center' });
    let versioni;
    try { versioni = (await Promise.all(lista(b).map(id => leggiVersione(id).catch(() => null)))).filter(v => v && v.tracce.length); }
    catch { versioni = []; }
    if (!versioni.length) { p.innerHTML = '<p class="muted">L\'audiolibro non è raggiungibile in questo momento. Riprova più tardi.</p>'; return; }

    // stesso libro letto da persone diverse -> si scelgono i lettori; volumi diversi -> si scelgono i volumi
    const volumi = new Set(versioni.map(x => x.titolo)).size > 1;
    if (volumi) versioni.sort((x, y) => x.titolo.localeCompare(y.titolo, 'it', { numeric: true }));
    // etichette dei volumi senza la parte che si ripete: «Orlando Furioso (Canti 01-04)» -> «Canti 01-04»
    const comune = volumi ? versioni.map(x => x.titolo).reduce((a, t) => { let n = 0; while (n < a.length && a[n].toLowerCase() === (t[n] || '').toLowerCase()) n++; return a.slice(0, n); }) : '';
    const taglio = /\s$/.test(comune) ? comune.length : comune.lastIndexOf(' ') + 1;
    const etichetta = (x, i) => volumi ? (x.titolo.slice(taglio).replace(/^[\s(:,.-]+|\)\s*$/g, '').replace(/^(\d+)\s*[:.-]\s*/, 'Vol. $1 · ').trim() || x.titolo) : (x.lettore || 'Lettura ' + (i + 1));
    const salvato = L.store.get('audio', {})[b.id] || {};
    let v = Math.max(0, versioni.findIndex(x => x.id === salvato.id));
    let k = salvato.id === versioni[v].id ? Math.min(salvato.k || 0, versioni[v].tracce.length - 1) : 0;
    let vel = L.store.get('audio-vel', 1), timer = null, fineTimer = 0;
    const audio = new Audio();
    audio.preload = 'metadata';

    p.innerHTML = `<div class="as-testa">${L.copertina(b)}<div class="as-titoli"><span class="as-occhiello">${I.cuffie} Audiolibro · voce umana</span>
        <b>${esc(b.t.replace(/\s*\([^)]*\)\s*$/, ''))}</b><span class="as-cap" id="as-cap"></span></div></div>
      <div class="as-voci${volumi ? ' volumi' : ''}"><span>${volumi ? 'Volume' : versioni.length > 1 ? 'Scegli la voce' : 'Letto da'}</span><div>${versioni.map((x, i) => `<button class="as-voce ${i === v ? 'on' : ''}" data-v="${i}"><i>${volumi ? i + 1 : esc(etichetta(x, i)[0])}</i>${esc(etichetta(x, i))}</button>`).join('')}</div></div>
      <div class="as-tempo"><input type="range" id="as-pos" min="0" max="1000" value="0" aria-label="Posizione nel capitolo"><div><span id="as-ora">0:00</span><span id="as-tot">0:00</span></div></div>
      <div class="as-comandi">
        <button data-c="prec" aria-label="Capitolo precedente">${I.prec}</button><button data-c="indietro" aria-label="Indietro 15 secondi">${I.indietro}</button>
        <button data-c="play" class="as-play" aria-label="Riproduci">${I.play}</button>
        <button data-c="avanti" aria-label="Avanti 30 secondi">${I.avanti}</button><button data-c="succ" aria-label="Capitolo successivo">${I.succ}</button></div>
      <div class="as-opzioni">
        <div class="as-gruppo"><span>Velocità</span><div class="as-segmenti" id="as-vel">${VELOCITA.map(x => `<button data-vel="${x}" class="${x === vel ? 'on' : ''}">${String(x).replace('.', ',')}×</button>`).join('')}</div></div>
        <div class="as-gruppo"><span>${I.luna} Spegni dopo</span><div class="as-segmenti" id="as-timer">${[[0, 'No'], [15, '15 min'], [30, '30 min'], [60, '1 ora']].map(([m, n]) => `<button data-t="${m}" class="${m === 0 ? 'on' : ''}">${n}</button>`).join('')}</div></div></div>
      <details class="as-capitoli"><summary>${I.lista} Capitoli <em id="as-ncap"></em></summary><ol id="as-lista"></ol></details>
      <p class="as-crediti">Letture di volontari di <a href="https://librivox.org" target="_blank" rel="noopener">LibriVox</a>, in pubblico dominio.</p>`;

    const $ = s => p.querySelector(s);
    const play = $('.as-play'), pos = $('#as-pos');
    const tracce = () => versioni[v].tracce;
    const disegnaLista = () => {
      $('#as-ncap').textContent = `(${tracce().length})`;
      $('#as-lista').innerHTML = tracce().map((t, i) => `<li data-k="${i}" class="${i === k ? 'on' : ''}"><span>${esc(t.titolo)}</span><small>${t.durata ? mmss(t.durata) : ''}</small></li>`).join('');
    };
    const salva = () => { const a = L.store.get('audio', {}); a[b.id] = { id: versioni[v].id, k, t: Math.floor(audio.currentTime || 0) }; L.store.set('audio', a); };
    const carica = (n, t = 0, via = false) => {
      k = Math.max(0, Math.min(n, tracce().length - 1));
      audio.src = tracce()[k].url;
      audio.playbackRate = vel;
      $('#as-cap').textContent = `${tracce()[k].titolo} · ${k + 1} di ${tracce().length}`;
      p.querySelectorAll('#as-lista li').forEach((li, i) => li.classList.toggle('on', i === k));
      audio.addEventListener('loadedmetadata', () => { if (t) audio.currentTime = t; audio.playbackRate = vel; }, { once: true });
      if (via) audio.play().catch(() => {});
      salva();
    };
    disegnaLista();
    carica(k, salvato.id === versioni[v].id ? salvato.t || 0 : 0);

    audio.onplay = () => { play.innerHTML = I.pausa; p.classList.add('suona'); L.conta('lettura', b.id); };
    audio.onpause = () => { play.innerHTML = I.play; p.classList.remove('suona'); salva(); };
    audio.ontimeupdate = () => {
      if (audio.duration) pos.value = Math.round(audio.currentTime / audio.duration * 1000);
      $('#as-ora').textContent = mmss(audio.currentTime); $('#as-tot').textContent = mmss(audio.duration || tracce()[k].durata);
      pos.style.setProperty('--pieno', (pos.value / 10) + '%');
      if (Math.floor(audio.currentTime) % 10 === 0) salva();
      if (fineTimer && Date.now() > fineTimer) { audio.pause(); fineTimer = 0; p.querySelectorAll('#as-timer button').forEach((x, i) => x.classList.toggle('on', i === 0)); L.toast('Buonanotte: audio in pausa'); }
    };
    audio.onended = () => { if (k < tracce().length - 1) carica(k + 1, 0, true); };
    pos.oninput = () => { if (audio.duration) audio.currentTime = pos.value / 1000 * audio.duration; };
    p.addEventListener('click', e => {
      const c = e.target.closest('[data-c]'), vv = e.target.closest('[data-v]'), ve = e.target.closest('[data-vel]'), tm = e.target.closest('[data-t]'), li = e.target.closest('#as-lista li');
      if (c) {
        if (c.dataset.c === 'play') audio.paused ? audio.play().catch(() => L.toast('Non riesco a riprodurre l\'audio')) : audio.pause();
        if (c.dataset.c === 'indietro') audio.currentTime = Math.max(0, audio.currentTime - 15);
        if (c.dataset.c === 'avanti') audio.currentTime = Math.min(audio.duration || 1e9, audio.currentTime + 30);
        if (c.dataset.c === 'prec') carica(audio.currentTime > 5 ? k : k - 1, 0, !audio.paused);
        if (c.dataset.c === 'succ') carica(k + 1, 0, !audio.paused);
      }
      if (vv && +vv.dataset.v !== v) {
        const suonava = !audio.paused; v = +vv.dataset.v;
        p.querySelectorAll('.as-voce').forEach((x, i) => x.classList.toggle('on', i === v));
        disegnaLista(); carica(Math.min(k, tracce().length - 1), 0, suonava);
      }
      if (ve) { vel = +ve.dataset.vel; audio.playbackRate = vel; L.store.set('audio-vel', vel); p.querySelectorAll('#as-vel button').forEach(x => x.classList.toggle('on', x === ve)); }
      if (tm) { const m = +tm.dataset.t; fineTimer = m ? Date.now() + m * 60000 : 0; p.querySelectorAll('#as-timer button').forEach(x => x.classList.toggle('on', x === tm)); if (m) L.toast(`L'audio si fermerà tra ${m} minuti`); }
      if (li) carica(+li.dataset.k, 0, true);
    });
    new MutationObserver(() => { if (!p.isConnected) { audio.pause(); salva(); } }).observe(scheda, { childList: true });
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: b.t, artist: (b.a || []).join(', '), album: 'Libri di strada' });
      navigator.mediaSession.setActionHandler('previoustrack', () => carica(k - 1, 0, true));
      navigator.mediaSession.setActionHandler('nexttrack', () => carica(k + 1, 0, true));
      navigator.mediaSession.setActionHandler('seekbackward', () => { audio.currentTime -= 15; });
      navigator.mediaSession.setActionHandler('seekforward', () => { audio.currentTime += 30; });
    }
  }
  window.LDSAscolta = { apri };
})();
