/* Libri di strada — «Offrimi un caffè». Spento finché l'amministratore non lo accende dall'area admin.
   Tre posti, ognuno accendibile: in alto nella barra, popup al momento giusto, nella scheda e in fondo alla pagina.
   Ogni pulsante apre il popup: si sceglie la cifra (es. 2, 3, 5 € o offerta libera) e poi come pagare.
   Sono semplici link verso PayPal, Stripe, Buy Me a Coffee o Ko-fi: niente script di terzi, nessun cookie, nessun dato di pagamento qui. */
(() => {
  'use strict';
  const L = window.LDS;
  const esc = L.esc;
  const TAZZA = '<svg viewBox="0 0 24 24"><path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 10.5h1.5a2.5 2.5 0 0 1 0 5H17M8 3.5c-.8 1 .8 2 0 3M12 3.5c-.8 1 .8 2 0 3"/></svg>';
  const CON = { stripe: 'con carta, Apple Pay o Google Pay', paypal: 'con PayPal', bmc: 'con Buy Me a Coffee', kofi: 'con Ko-fi' };
  const DOVE = { stripe: 'Stripe', paypal: 'PayPal', bmc: 'Buy Me a Coffee', kofi: 'Ko-fi' };
  let cfg = null;

  // server vecchio (un solo link) o nuovo (importi e metodi): qui diventano la stessa cosa
  const metodi = c => (c && c.metodi && c.metodi.length ? c.metodi
    : (c && c.link ? [{ tipo: /paypal/.test(c.link) ? 'paypal' : /ko-fi/.test(c.link) ? 'kofi' : 'bmc', importi: {}, libero: c.link }] : []));

  function link(classe, testo) {
    const m = metodi(cfg)[0];
    const href = (m && (m.libero || Object.values(m.importi || {})[0])) || '#';
    return `<a class="${classe}" href="${esc(href)}" target="_blank" rel="noopener" role="button" data-caffe>${TAZZA}<span>${esc(testo || cfg.testo)}</span></a>`;
  }
  // ogni pulsante «Offrimi un caffè» apre il popup con le cifre invece di andare dritto al pagamento
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-caffe]');
    if (!a || !cfg) return;
    e.preventDefault();
    popup(true);
  });

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
    const M = metodi(cfg);
    if (!cfg || !cfg.attivo || !M.length || (!cfg.popup && !forza) || document.querySelector('.caffe-popup')) return;
    if (!forza) {
      const visto = L.store.get('caffe-visto', 0);
      if (Date.now() - visto < 7 * 864e5) return;
      L.store.set('caffe-visto', Date.now());
    }
    // cifre che almeno un modo di pagare sa gestire; «offerta libera» se c'è una pagina dove si sceglie la cifra
    const cifre = (cfg.importi || []).filter(i => M.some(m => m.importi && m.importi[i])).map(String);
    const libera = M.some(m => m.libero) && (cfg.libera !== false || !cifre.length);
    const scelte = cifre.concat(libera ? ['libera'] : []);
    let scelta = cifre.length >= 3 ? cifre[1] : cifre[0] || 'libera';   // con 2, 3, 5 parte selezionato il 3

    const el = document.createElement('div');
    el.className = 'caffe-popup';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', cfg.testo);
    el.innerHTML = `<div class="caffe-carta"><button class="caffe-x" aria-label="Chiudi">${L.ico.x}</button>
      <div class="caffe-tazza">${TAZZA}<i></i><i></i><i></i></div>
      <h3>${esc(cfg.testo)}</h3><p>${esc(cfg.messaggio)}</p>
      ${scelte.length > 1 ? `<div class="caffe-cifre" role="radiogroup" aria-label="Quanto vuoi offrire">${scelte.map(v =>
        `<button type="button" role="radio" data-v="${v}"${v === 'libera' ? ' class="libera"' : ''}>${v === 'libera' ? 'Offerta libera' : v + ' €'}</button>`).join('')}</div>` : ''}
      <div class="caffe-modi"></div>
      <p class="caffe-sicuro"></p>
      <button class="link caffe-dopo">Magari un'altra volta</button></div>`;
    const modi = el.querySelector('.caffe-modi');
    const disegna = () => {
      el.querySelectorAll('.caffe-cifre button').forEach(b => {
        const on = b.dataset.v === scelta;
        b.classList.toggle('on', on); b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1;
      });
      const pronti = M.map(m => ({ m, url: scelta === 'libera' ? m.libero : m.importi && m.importi[scelta] })).filter(x => x.url);
      modi.innerHTML = pronti.map(({ m, url }, i) => `<a class="btn ${i ? 'secondario' : 'primario'} caffe-vai" href="${esc(url)}" target="_blank" rel="noopener">${
        scelta === 'libera' ? 'Scegli tu quanto ' + CON[m.tipo] : `Offri ${scelta} € ` + CON[m.tipo]}</a>`).join('');
      const siti = [...new Set(pronti.map(x => DOVE[x.m.tipo]))];
      el.querySelector('.caffe-sicuro').textContent = `Paghi sul sito di ${siti.join(' o ')}: Libri di strada non vede mai i tuoi dati di pagamento.`;
    };
    disegna();
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('su'));
    const chiudi = () => { el.classList.remove('su'); setTimeout(() => el.remove(), 350); };
    el.querySelector('.caffe-x').onclick = chiudi;
    el.querySelector('.caffe-dopo').onclick = chiudi;
    el.onclick = e => {
      if (e.target === el) return chiudi();
      const b = e.target.closest('.caffe-cifre button');
      if (b) { scelta = b.dataset.v; disegna(); return; }
      if (e.target.closest('.caffe-vai')) setTimeout(chiudi, 300);
    };
    el.addEventListener('keydown', e => {
      if (e.key === 'Escape') return chiudi();
      const b = e.target.closest('.caffe-cifre button');
      if (!b || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      const i = (scelte.indexOf(scelta) + (e.key === 'ArrowRight' ? 1 : -1) + scelte.length) % scelte.length;
      scelta = scelte[i]; disegna(); el.querySelector(`.caffe-cifre [data-v="${scelta}"]`).focus();
    });
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
