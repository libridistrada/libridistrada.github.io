/* Libri di strada — audiolibri con voce umana (LibriVox: letture di volontari, in pubblico dominio).
   Nella scheda del libro: «Ascolta l'audiolibro». I file restano sull'Internet Archive e partono solo se premi
   il pulsante; il punto d'ascolto resta sul telefono. */
(() => {
  'use strict';
  const L = window.LDS;
  const esc = L.esc;
  const scheda = document.getElementById('scheda');
  const CUFFIE = '<svg viewBox="0 0 24 24"><path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="5" height="7" rx="2"/><rect x="16" y="14" width="5" height="7" rx="2"/></svg>';

  function aggiungi() {
    if (scheda.hidden || scheda.querySelector('.ascolta-btn')) return;
    const id = decodeURIComponent(location.hash.split('/').pop());
    const b = L.S.per.get(id);
    const bottoni = scheda.querySelector('.scheda-testa .bottoni');
    if (!b || !b.au || !bottoni) return;
    bottoni.insertAdjacentHTML('beforeend', `<button class="btn secondario ascolta-btn">${CUFFIE} Ascolta · voce umana</button>`);
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
  async function apri(b) {
    let p = scheda.querySelector('.ascolta');
    if (p) { p.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    scheda.querySelector('.scheda-corpo').insertAdjacentHTML('beforebegin', `<section class="ascolta"><div class="carica" style="min-height:120px"><div class="anello"></div></div></section>`);
    p = scheda.querySelector('.ascolta');
    p.scrollIntoView({ behavior: 'smooth', block: 'center' });
    let tracce;
    try {
      const m = await (await fetch(`https://archive.org/metadata/${encodeURIComponent(b.au)}`)).json();
      const mp3 = (m.files || []).filter(f => /\.mp3$/i.test(f.name) && /64kb/i.test(f.name));
      tracce = (mp3.length ? mp3 : (m.files || []).filter(f => /\.mp3$/i.test(f.name)))
        .sort((x, y) => x.name.localeCompare(y.name, 'it', { numeric: true }))
        .map(f => ({ url: `https://archive.org/download/${encodeURIComponent(b.au)}/${f.name.split('/').map(encodeURIComponent).join('/')}`,
          titolo: nomeParte(f), durata: +f.length || 0 }));
      if (!tracce.length) throw new Error('vuoto');
    } catch {
      p.innerHTML = '<p class="muted">L\'audiolibro non è raggiungibile in questo momento. Riprova più tardi.</p>';
      return;
    }
    const pos = L.store.get('audio', {})[b.id] || { k: 0, t: 0 };
    const min = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    p.innerHTML = `<div class="ascolta-testa">${CUFFIE}<div><b>Audiolibro</b><span>Letto da volontari di <a href="https://librivox.org" target="_blank" rel="noopener">LibriVox</a> · pubblico dominio · ${tracce.length} parti</span></div></div>
      <div class="ascolta-lettore"><button class="ascolta-play" aria-label="Riproduci">${L.ico.play}</button>
        <div class="ascolta-info"><b id="as-titolo"></b><input type="range" id="as-pos" min="0" max="1000" value="0" aria-label="Posizione"><span id="as-tempo">0:00</span></div>
        <div class="ascolta-vel">${[0.9, 1, 1.25, 1.5].map(v => `<button data-v="${v}" class="${v === 1 ? 'on' : ''}">${v}×</button>`).join('')}</div></div>
      <ol class="ascolta-parti">${tracce.map((t, k) => `<li data-k="${k}"><span>${esc(t.titolo)}</span><small>${t.durata ? min(t.durata) : ''}</small></li>`).join('')}</ol>`;
    const audio = new Audio();
    audio.preload = 'none';
    let k = Math.min(pos.k, tracce.length - 1);
    const play = p.querySelector('.ascolta-play'), barra = p.querySelector('#as-pos'), tempo = p.querySelector('#as-tempo');
    const PAUSA = '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>';
    const carica = (n, t = 0, via = false) => {
      k = n; audio.src = tracce[k].url; audio.currentTime = 0;
      p.querySelector('#as-titolo').textContent = tracce[k].titolo;
      p.querySelectorAll('.ascolta-parti li').forEach((li, i) => li.classList.toggle('on', i === k));
      audio.addEventListener('loadedmetadata', () => { if (t) audio.currentTime = t; }, { once: true });
      if (via) audio.play().catch(() => {});
    };
    const salva = () => { const a = L.store.get('audio', {}); a[b.id] = { k, t: Math.floor(audio.currentTime) }; L.store.set('audio', a); };
    carica(k, pos.t);
    play.onclick = () => (audio.paused ? audio.play().catch(() => L.toast('Non riesco a riprodurre l\'audio')) : audio.pause());
    audio.onplay = () => { play.innerHTML = PAUSA; play.classList.add('su'); L.conta('lettura', b.id); };
    audio.onpause = () => { play.innerHTML = L.ico.play; play.classList.remove('su'); salva(); };
    audio.ontimeupdate = () => { if (audio.duration) barra.value = Math.round(audio.currentTime / audio.duration * 1000); tempo.textContent = `${min(audio.currentTime)} / ${min(audio.duration || 0)}`;
      if (Math.floor(audio.currentTime) % 15 === 0) salva(); };
    audio.onended = () => { if (k < tracce.length - 1) carica(k + 1, 0, true); };
    barra.oninput = () => { if (audio.duration) audio.currentTime = barra.value / 1000 * audio.duration; };
    p.querySelector('.ascolta-parti').onclick = e => { const li = e.target.closest('li'); if (li) carica(+li.dataset.k, 0, true); };
    p.querySelector('.ascolta-vel').onclick = e => { const v = e.target.closest('[data-v]'); if (!v) return; audio.playbackRate = +v.dataset.v;
      p.querySelectorAll('.ascolta-vel button').forEach(x => x.classList.toggle('on', x === v)); };
    // chiudendo la scheda l'audio si ferma
    new MutationObserver(() => { if (!p.isConnected) { audio.pause(); salva(); } }).observe(scheda, { childList: true });
    if ('mediaSession' in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: b.t, artist: (b.a || []).join(', '), album: 'Libri di strada' });
  }
})();
