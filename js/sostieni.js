/* Libri di strada — «Offrimi un caffè». Spento finché l'amministratore non lo accende dall'area admin.
   Tre posti, ognuno accendibile: in alto nella barra, popup al momento giusto, nella scheda e in fondo alla pagina.
   È un semplice link (niente script di terzi: nessun cookie, nessun tracciamento). */
(() => {
  'use strict';
  const L = window.LDS;
  const esc = L.esc;
  const TAZZA = '<svg viewBox="0 0 24 24"><path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 10.5h1.5a2.5 2.5 0 0 1 0 5H17M8 3.5c-.8 1 .8 2 0 3M12 3.5c-.8 1 .8 2 0 3"/></svg>';
  let cfg = null;

  function link(classe, testo) {
    return `<a class="${classe}" href="${esc(cfg.link)}" target="_blank" rel="noopener" data-caffe>${TAZZA}<span>${esc(testo || cfg.testo)}</span></a>`;
  }

  function inAlto() {
    document.querySelector('.caffe-alto')?.remove();
    if (!cfg || !cfg.attivo || !cfg.in_alto) return;
    document.getElementById('btn-cerca').insertAdjacentHTML('beforebegin', link('caffe-alto'));
  }
  function inFondo() {
    document.querySelector('.caffe-fondo')?.remove();
    if (!cfg || !cfg.attivo || !cfg.scheda) return;
    document.querySelector('#piede p').insertAdjacentHTML('afterend', `<div class="caffe-fondo">${link('btn caffe-btn')}</div>`);
  }
  function inScheda() {
    const s = document.getElementById('scheda');
    if (!cfg || !cfg.attivo || !cfg.scheda || s.hidden || s.querySelector('.caffe-scheda')) return;
    const dove = s.querySelector('.scheda-corpo > div:last-child');
    if (dove) dove.insertAdjacentHTML('beforeend', `<div class="caffe-scheda"><p>Ti piace Libri di strada?</p>${link('btn caffe-btn piccolo')}</div>`);
  }

  // ---- popup: dopo un po' di lettura o al terzo libro aperto; al massimo una volta a settimana
  function popup(forza, prova) {
    const vero = cfg;
    if (prova) cfg = { ...(cfg || {}), ...prova };   // anteprima dall'area admin, con i valori del modulo
    try { mostra(forza); } finally { if (prova) cfg = vero; }
  }
  function mostra(forza) {
    if (!cfg || !cfg.attivo || (!cfg.popup && !forza) || document.querySelector('.caffe-popup')) return;
    if (!forza) {
      const visto = L.store.get('caffe-visto', 0);
      if (Date.now() - visto < 7 * 864e5) return;
      L.store.set('caffe-visto', Date.now());
    }
    const el = document.createElement('div');
    el.className = 'caffe-popup';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', cfg.testo);
    el.innerHTML = `<div class="caffe-carta"><button class="caffe-x" aria-label="Chiudi">${L.ico.x}</button>
      <div class="caffe-tazza">${TAZZA}<i></i><i></i><i></i></div>
      <h3>${esc(cfg.testo)}</h3><p>${esc(cfg.messaggio)}</p>
      ${link('btn primario caffe-vai', 'Offri un caffè')}<button class="link caffe-dopo">Magari un'altra volta</button></div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('su'));
    const chiudi = () => { el.classList.remove('su'); setTimeout(() => el.remove(), 350); };
    el.querySelector('.caffe-x').onclick = chiudi;
    el.querySelector('.caffe-dopo').onclick = chiudi;
    el.onclick = e => { if (e.target === el) chiudi(); };
    el.querySelector('.caffe-vai').addEventListener('click', () => setTimeout(chiudi, 300));
  }
  // momenti giusti: uscita dal lettore dopo almeno 3 minuti di lettura, oppure il terzo libro aperto
  let inLettura = 0, aperti = L.store.get('caffe-aperti', 0);
  addEventListener('hashchange', e => {
    const da = (e.oldURL.split('#')[1] || ''), a = (e.newURL.split('#')[1] || '');
    if (a.startsWith('/leggi/')) inLettura = Date.now();
    if (da.startsWith('/leggi/') && inLettura && Date.now() - inLettura > 3 * 60e3) setTimeout(() => popup(), 900);
    if (a.startsWith('/libro/')) { aperti++; L.store.set('caffe-aperti', aperti); if (aperti === 3 || aperti === 12) setTimeout(() => popup(), 2500); }
  });

  new MutationObserver(inScheda).observe(document.getElementById('scheda'), { childList: true });

  async function carica() {
    if (!L.S.server) return setTimeout(carica, 300);
    try {
      const r = await fetch(L.S.server + '/config', { cache: 'no-store' });
      cfg = (await r.json()).sostieni;
    } catch { cfg = null; }
    inAlto(); inFondo(); inScheda();
  }
  window.LDSSostieni = { ricarica: carica, prova: c => popup(true, c), cfg: () => cfg };
  carica();
})();
