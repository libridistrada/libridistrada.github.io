/* Libri di strada — avvisi «libri nuovi» (notifiche web). Solo per chi li chiede, al massimo uno a settimana.
   L'HP tiene solo l'indirizzo di consegna anonimo del browser; si disattiva con lo stesso tasto. */
(() => {
  'use strict';
  const L = window.LDS;
  const iphone = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const installata = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const possibile = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && location.protocol === 'https:';
  const CAMPANA = '<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/></svg>';
  const base64 = s => { const b = atob((s + '='.repeat((4 - s.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, c => c.charCodeAt(0)); };
  const invia = (cosa, sub) => fetch(L.S.server + '/avvisi/' + cosa, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub) });
  async function iscrizione() { const r = await navigator.serviceWorker.ready; return r.pushManager.getSubscription(); }
  const NO = 'lds:avvisi-no';
  const rifiutato = () => { try { return Date.now() - (+localStorage.getItem(NO) || 0) < 60 * 864e5; } catch { return false; } };

  async function attiva(btn) {
    btn.disabled = true;
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') throw new Error(perm === 'denied' ? 'Le notifiche sono bloccate: puoi riattivarle dalle impostazioni del browser per questo sito' : 'Avvisi non attivati');
      const k = await (await fetch(L.S.server + '/avvisi/chiave', { cache: 'no-store' })).json();
      const r = await navigator.serviceWorker.ready;
      const sub = (await r.pushManager.getSubscription()) || await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64(k.chiave) });
      const x = await invia('iscrivi', sub.toJSON());
      if (!x.ok) throw new Error('La libreria di casa non risponde: riprova più tardi');
      L.toast('Fatto! Ti avviseremo quando arrivano libri nuovi');
    } catch (e) { L.toast(e.message || 'Avvisi non attivati'); }
    disegna();
  }
  async function disattiva(btn) {
    btn.disabled = true;
    try {
      const sub = await iscrizione();
      if (sub) { invia('cancella', { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe(); }
      L.toast('Avvisi disattivati');
    } catch { L.toast('Non sono riuscito a disattivarli, riprova'); }
    disegna();
  }

  async function disegna() {
    const posti = document.querySelectorAll('[data-avvisi]'), righe = document.querySelectorAll('[data-avvisi-riga]');
    if (!posti.length && !righe.length) return;
    posti.forEach(p => { p.dataset.fatto = '1'; }); righe.forEach(p => { p.dataset.fatto = '1'; });
    let invito = '', riga = '';
    if (possibile) {
      let attivi = false;
      try { attivi = !!(await iscrizione()) && Notification.permission === 'granted'; } catch { /* */ }
      if (attivi) {
        riga = `<p class="avvisi-riga on">${CAMPANA}<span>Avvisi dei libri nuovi attivi</span><button class="link" data-avv="no">Disattiva</button></p>`;
      } else {
        riga = `<p class="avvisi-riga">${CAMPANA}<span>Avvisi dei libri nuovi spenti</span><button class="link" data-avv="si">Attiva</button></p>`;
        if (!rifiutato()) invito = `<div class="avvisi"><span class="avvisi-ico">${CAMPANA}</span><p><b>Vuoi sapere quando arrivano libri nuovi?</b><small>Al massimo un avviso a settimana. Nessun dato personale, si disattiva quando vuoi.</small></p>
          <span class="avvisi-bottoni"><button class="btn primario piccolo" data-avv="si">Avvisami</button><button class="link" data-avv="nograzie">No grazie</button></span></div>`;
      }
    } else if (iphone && !installata) {
      riga = `<p class="avvisi-riga">${CAMPANA}<span>Per gli avvisi dei libri nuovi su iPhone: Condividi → «Aggiungi alla schermata Home», poi apri Libri di strada da lì.</span></p>`;
    }
    posti.forEach(p => { p.innerHTML = invito; });
    righe.forEach(p => { p.innerHTML = riga; });
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-avv]');
    if (!b) return;
    if (b.dataset.avv === 'nograzie') { try { localStorage.setItem(NO, Date.now()); } catch { /* */ } L.toast('Va bene: se cambi idea, li trovi in fondo a «La mia libreria»'); return disegna(); }
    (b.dataset.avv === 'si' ? attiva : disattiva)(b);
  });
  new MutationObserver(() => { if (document.querySelector('[data-avvisi]:not([data-fatto]), [data-avvisi-riga]:not([data-fatto])')) disegna(); }).observe(document.getElementById('app'), { childList: true, subtree: true });
  disegna();
})();
