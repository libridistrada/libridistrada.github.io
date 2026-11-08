/* Libri di strada — area amministratore nascosta (#/admin). Non è collegata da nessuna parte del sito.
   Tutto passa dal server di casa con utente e password; qui resta solo il gettone di accesso, e solo
   finché la scheda del browser è aperta (sessionStorage). */
(() => {
  'use strict';
  const L = window.LDS;
  const esc = L.esc;
  const tok = { get: () => { try { return sessionStorage.getItem('lds:admin'); } catch { return null; } },
    set: t => { try { t ? sessionStorage.setItem('lds:admin', t) : sessionStorage.removeItem('lds:admin'); } catch { /* */ } } };
  const SCAFFALI = ['Tecnologia e IA', 'Sport e benessere', 'Musica e spettacolo', 'Corsi e professioni', 'Avventura e pirati', 'Gialli e misteri',
    'Fantascienza', 'Amore e passioni', 'Romanzi storici', 'Viaggi ed esplorazioni', 'Umorismo e satira', 'Horror e fantastico'];
  const CATEGORIE = ['Romanzi', 'Racconti e novelle', 'Poesia', 'Teatro', 'Ragazzi e fiabe', 'Saggi e pensiero', 'Lavoro e formazione', 'Scienza e curiosità'];

  async function api(metodo, percorso, dati, blob) {
    const r = await fetch(L.S.server + percorso, { method: metodo, cache: 'no-store',
      headers: { ...(tok.get() ? { Authorization: 'Bearer ' + tok.get() } : {}), ...(dati ? { 'Content-Type': 'application/json' } : {}) },
      body: dati ? JSON.stringify(dati) : undefined });
    if (r.status === 401) { tok.set(null); throw new Error('Accedi di nuovo'); }
    if (blob) { if (!r.ok) throw new Error('File non disponibile'); return r.blob(); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.errore || 'Errore ' + r.status);
    return j;
  }

  function guscio(app, corpo) {
    document.title = 'Admin · Libri di strada';
    app.innerHTML = `<div class="pagina admin"><div class="admin-testa"><h1>Area admin</h1>${tok.get() ? '<button class="btn contorno piccolo" id="esci">Esci</button>' : ''}</div>${corpo}</div>`;
    const e = document.getElementById('esci');
    if (e) e.onclick = async () => { await api('POST', '/admin/esci', {}).catch(() => {}); tok.set(null); window.LDSAdmin(app); };
  }

  function modulo(app, attivazione) {
    guscio(app, `<form class="modulo admin-accesso" id="f" autocomplete="on">
      <p class="intro">${attivazione ? 'Primo accesso: scrivi il <b>codice di attivazione</b> e scegli il tuo nome utente e la password (almeno 10 caratteri). La password non viene mai salvata in chiaro.' : 'Accedi per gestire la libreria.'}</p>
      ${attivazione ? '<label>Codice di attivazione<input name="codice" required autocomplete="one-time-code" placeholder="XXXX-XXXX-XXXX" style="text-transform:uppercase;letter-spacing:.1em"></label>' : ''}
      <label>Nome utente<input name="utente" required autocomplete="username" title="Da 3 a 40 caratteri: lettere, numeri e . _ @ - (niente spazi)" placeholder="es. Francesco.Rossi">${attivazione ? '<small class="muted" style="display:block;margin-top:6px">Niente spazi: lettere, numeri e . _ @ -</small>' : ''}</label>
      <label>Password<input name="password" type="password" required autocomplete="${attivazione ? 'new-password' : 'current-password'}" minlength="${attivazione ? 10 : 1}"></label>
      ${attivazione ? '<label>Ripeti la password<input name="password2" type="password" required autocomplete="new-password"></label>' : ''}
      <div><button class="btn primario" type="submit">${attivazione ? 'Crea e entra' : 'Entra'}</button></div><p class="muted" id="esito"></p></form>`);
    document.getElementById('f').onsubmit = async e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target));
      const esito = document.getElementById('esito');
      esito.style.color = '';
      if (!/^[A-Za-z0-9._@-]{3,40}$/.test(d.utente || '')) { esito.style.color = '#ff6b6b'; return (esito.textContent = 'Nome utente: da 3 a 40 caratteri, solo lettere, numeri e . _ @ - (niente spazi).'); }
      if (attivazione && d.password !== d.password2) { esito.style.color = '#ff6b6b'; return (esito.textContent = 'Le due password non coincidono.'); }
      esito.textContent = 'Un momento…';
      try {
        const r = await api('POST', attivazione ? '/admin/attiva' : '/admin/entra', attivazione ? { codice: d.codice, utente: d.utente, password: d.password } : { utente: d.utente, password: d.password });
        tok.set(r.token);
        window.LDSAdmin(app);
      } catch (err) { esito.textContent = err.message; esito.style.color = '#ff6b6b'; }
    };
  }

  // ---------------------------------------------------------------- pannello
  async function pannello(app, scheda = 'sostieni') {
    guscio(app, `<nav class="admin-schede">${[['sostieni', 'Offrimi un caffè'], ['statistiche', 'Statistiche'], ['avvisi', 'Avvisi'], ['proposte', 'Proposte degli autori'], ['stampa', 'Da stampare']]
      .map(([k, n]) => `<button class="filtro ${k === scheda ? 'on' : ''}" data-s="${k}">${n}</button>`).join('')}</nav><div id="admin-corpo"><div class="carica"><div class="anello"></div></div></div>`);
    app.querySelector('.admin-schede').onclick = e => { const b = e.target.closest('[data-s]'); if (b) pannello(app, b.dataset.s); };
    const corpo = document.getElementById('admin-corpo');
    try { await ({ sostieni, statistiche, avvisi, proposte, stampa }[scheda])(corpo, app); }
    catch (err) { if (!tok.get()) return window.LDSAdmin(app); corpo.innerHTML = `<div class="vuoto"><b>Qualcosa non va</b>${esc(err.message)}</div>`; }
  }

  // ---- «Offrimi un caffè»: importi pronti + offerta libera, più modi di pagare (tutti link: il pagamento avviene altrove)
  const METODI = {
    stripe: ['Carta, Apple Pay o Google Pay', 'con Stripe', 'Chi dona non ha bisogno di nessun conto. Commissione circa 1,5% + 0,25 € a donazione, i soldi arrivano sul tuo IBAN.'],
    paypal: ['PayPal', 'PayPal.me', 'Chi dona deve avere un conto PayPal. Per ricevere dal pubblico PayPal chiede un conto Business, gratuito anche senza partita IVA.'],
    bmc: ['Buy Me a Coffee', 'pagina tua', 'Chi dona paga con carta o PayPal sul sito di Buy Me a Coffee e sceglie lì la cifra. Commissione 5% più quella della carta.'],
    kofi: ['Ko-fi', 'pagina tua', 'Come Buy Me a Coffee: chi dona sceglie la cifra sulla tua pagina Ko-fi.'],
  };
  const leggiImporti = t => [...new Set(String(t).split(/[\s,;€]+/).filter(Boolean).map(Number))].filter(n => Number.isInteger(n)).sort((a, b) => a - b);

  // stessa logica del server: serve per l'anteprima del popup prima di salvare
  function pubblico(d) {
    const out = [], imp = d.importi;
    const st = d.metodi.stripe;
    if (st.attivo) { const per = {}; imp.forEach(i => { if (st.link[i]) per[i] = st.link[i]; }); if (Object.keys(per).length || st.libero) out.push({ tipo: 'stripe', nome: METODI.stripe[0], importi: per, libero: st.libero }); }
    const pp = d.metodi.paypal;
    if (pp.attivo && pp.nome) { const b = 'https://paypal.me/' + pp.nome, per = {}; imp.forEach(i => { per[i] = `${b}/${i}EUR`; }); out.push({ tipo: 'paypal', nome: 'PayPal', importi: per, libero: b }); }
    for (const k of ['bmc', 'kofi']) if (d.metodi[k].attivo && d.metodi[k].link) out.push({ tipo: k, nome: METODI[k][0], importi: {}, libero: d.metodi[k].link });
    return out;
  }

  async function sostieni(corpo) {
    const s = (await api('GET', '/admin/config')).sostieni;
    const m = s.metodi_admin || { stripe: { link: {} }, paypal: {}, bmc: {}, kofi: {} };
    const stripeLink = { ...(m.stripe.link || {}) };
    const ck = (n, v, t, d) => `<label class="spunta interruttore"><input type="checkbox" name="${n}" ${v ? 'checked' : ''}><span><b>${t}</b><small>${d}</small></span></label>`;
    const metodo = (k, campi) => `<fieldset class="admin-dove admin-metodo"><legend>${METODI[k][0]} <small>${METODI[k][1]}</small></legend>
        ${ck(k + '_attivo', m[k] && m[k].attivo, 'Acceso', METODI[k][2])}${campi}</fieldset>`;
    corpo.innerHTML = `<form class="modulo" id="fs">
      ${ck('attivo', s.attivo, 'Pulsante acceso', 'Quando è spento non compare da nessuna parte del sito.')}
      <label>Importi in euro<input name="importi" value="${esc((s.importi || [2, 3, 5]).join(', '))}" inputmode="numeric" placeholder="2, 3, 5"></label>
      <p class="muted admin-nota">Da 1 a 6 cifre separate da virgola. Su 1 € le commissioni si prendono quasi 40 centesimi: meglio partire da 2 €.</p>
      ${ck('libera', s.libera !== false, 'Offerta libera', 'Un tasto in più: chi dona sceglie la cifra sul sito di pagamento.')}
      ${metodo('stripe', `<div id="stripe-importi"></div>
        <label>Link Stripe per l'offerta libera <small>(facoltativo)</small><input name="stripe_libero" value="${esc(m.stripe.libero || '')}" placeholder="https://buy.stripe.com/…" inputmode="url"></label>
        <details class="admin-aiuto"><summary>Come si creano i link Stripe</summary><ol>
          <li>Apri un account su stripe.com (anche da privato) e collega il tuo IBAN.</li>
          <li>Vai su <b>Payment Links</b> → <b>Nuovo</b>: prodotto «Un caffè per Libri di strada», prezzo 2 €. Ripeti per ogni importo.</li>
          <li>Per l'offerta libera scegli «Il cliente sceglie quanto pagare».</li>
          <li>Copia ogni link (inizia con https://buy.stripe.com/) e incollalo qui accanto alla sua cifra.</li></ol></details>`)}
      ${metodo('paypal', `<label>Il tuo nome PayPal.me<input name="paypal_nome" value="${esc(m.paypal.nome || '')}" placeholder="libridistrada" autocapitalize="off"></label>
        <p class="muted admin-nota" id="pp-anteprima"></p>`)}
      ${metodo('bmc', `<label>La tua pagina<input name="bmc_link" value="${esc(m.bmc.link || '')}" placeholder="https://buymeacoffee.com/tuonome" inputmode="url"></label>`)}
      ${metodo('kofi', `<label>La tua pagina<input name="kofi_link" value="${esc(m.kofi.link || '')}" placeholder="https://ko-fi.com/tuonome" inputmode="url"></label>`)}
      <label>Testo del pulsante<input name="testo" value="${esc(s.testo)}" maxlength="60"></label>
      <label>Messaggio del popup<textarea name="messaggio" rows="3" maxlength="400">${esc(s.messaggio)}</textarea></label>
      <fieldset class="admin-dove"><legend>Dove compare</legend>
        ${ck('in_alto', s.in_alto, 'In alto', 'Nella barra del sito, accanto alla ricerca.')}
        ${ck('popup', s.popup, 'Popup', 'Dopo 3 minuti di lettura o al terzo libro aperto. Al massimo una volta a settimana per persona.')}
        ${ck('scheda', s.scheda, 'Nella scheda e in fondo', 'Nella scheda di ogni libro e in fondo alla pagina.')}</fieldset>
      <div class="bottoni"><button class="btn primario" type="submit">Salva</button><button class="btn secondario" type="button" id="prova">Vedi il popup</button></div>
      <p class="muted" id="esito-s"></p></form>`;
    const f = document.getElementById('fs');
    // un campo Stripe per ogni importo; se cambi gli importi i link già scritti restano
    const campiStripe = () => {
      f.querySelectorAll('[name^="stripe_imp_"]').forEach(x => { stripeLink[x.name.slice(11)] = x.value.trim(); });
      document.getElementById('stripe-importi').innerHTML = leggiImporti(f.importi.value).filter(i => i >= 1 && i <= 100).map(i =>
        `<label>Link Stripe per ${i} €<input name="stripe_imp_${i}" value="${esc(stripeLink[i] || '')}" placeholder="https://buy.stripe.com/…" inputmode="url"></label>`).join('');
    };
    const anteprimaPP = () => {
      const n = f.paypal_nome.value.trim().replace(/^(https?:\/\/)?(www\.)?paypal\.me\//i, '').split('/')[0];
      document.getElementById('pp-anteprima').textContent = n ? 'Link pronti: ' + leggiImporti(f.importi.value).map(i => `paypal.me/${n}/${i}EUR`).join(' · ') + (f.libera.checked ? ` · offerta libera: paypal.me/${n}` : '') : 'Scrivi solo il nome: i link con la cifra li prepara il sito.';
    };
    campiStripe(); anteprimaPP();
    f.importi.addEventListener('input', () => { campiStripe(); anteprimaPP(); });
    f.paypal_nome.addEventListener('input', anteprimaPP);
    f.libera.addEventListener('change', anteprimaPP);

    const leggiF = () => {
      const d = new FormData(f), imp = leggiImporti(d.get('importi'));
      const link = {}; imp.forEach(i => { const v = (d.get('stripe_imp_' + i) || '').trim(); if (v) link[i] = v; });
      return { attivo: d.has('attivo'), importi: imp, libera: d.has('libera'), testo: d.get('testo'), messaggio: d.get('messaggio'),
        in_alto: d.has('in_alto'), popup: d.has('popup'), scheda: d.has('scheda'),
        metodi: { stripe: { attivo: d.has('stripe_attivo'), link, libero: d.get('stripe_libero').trim() },
          paypal: { attivo: d.has('paypal_attivo'), nome: d.get('paypal_nome').trim().replace(/^(https?:\/\/)?(www\.)?paypal\.me\//i, '').split('/')[0] },
          bmc: { attivo: d.has('bmc_attivo'), link: d.get('bmc_link').trim() }, kofi: { attivo: d.has('kofi_attivo'), link: d.get('kofi_link').trim() } } };
    };
    const problema = d => {
      if (!d.importi.length || d.importi.length > 6 || d.importi[0] < 1 || d.importi[d.importi.length - 1] > 100) return 'Metti da 1 a 6 importi interi fra 1 e 100 euro, per esempio 2, 3, 5.';
      const M = d.metodi;
      if (M.stripe.attivo && !Object.keys(M.stripe.link).length && !M.stripe.libero) return 'Stripe è acceso ma non hai incollato nessun link: aggiungine almeno uno o spegnilo.';
      if (M.paypal.attivo && !M.paypal.nome) return 'PayPal è acceso: scrivi il tuo nome PayPal.me o spegnilo.';
      if (M.bmc.attivo && !M.bmc.link) return 'Buy Me a Coffee è acceso: incolla la tua pagina o spegnilo.';
      if (M.kofi.attivo && !M.kofi.link) return 'Ko-fi è acceso: incolla la tua pagina o spegnilo.';
      if (d.attivo && !pubblico(d).length) return 'Per accendere il pulsante serve almeno un modo di pagare acceso e completo.';
      return '';
    };
    f.onsubmit = async e => {
      e.preventDefault();
      const out = document.getElementById('esito-s');
      const d = leggiF();
      out.style.color = '#ff6b6b';
      const p = problema(d); if (p) { out.textContent = p; return; }
      try {
        const r = await api('POST', '/admin/config', { sostieni: d });
        const acceso = r && r.sostieni ? r.sostieni.attivo : d.attivo;
        out.style.color = '#3ddc97';
        out.textContent = acceso ? 'Salvato e acceso: il pulsante compare subito sul sito (ricarica la pagina per vederlo).' : 'Salvato: il pulsante è spento.';
        window.LDSSostieni.ricarica();
      } catch (err) { out.textContent = err.message; }
    };
    document.getElementById('prova').onclick = () => {
      const d = leggiF();
      let metodi = pubblico(d);
      if (!metodi.length) metodi = [{ tipo: 'paypal', nome: 'PayPal', importi: Object.fromEntries(d.importi.map(i => [i, `https://paypal.me/tuonome/${i}EUR`])), libero: 'https://paypal.me/tuonome' }];
      window.LDSSostieni.prova({ ...d, attivo: true, metodi });
    };
  }

  // locandina e adesivo: stanno sull'HP e si scaricano solo da qui, non sono sul sito pubblico
  const STAMPA = {
    'locandina.pdf': ['Locandina A3', 'PDF pronto per la tipografia, 297 × 420 mm.'],
    'adesivo.pdf': ['Adesivo 10 × 14 cm', 'PDF pronto per la tipografia.'],
    'locandina.png': ['Locandina A3 · immagine', 'PNG ad alta risoluzione, per i social o la stampa in copisteria.'],
    'adesivo.png': ['Adesivo · immagine', 'PNG a 300 dpi.'],
    'qr_logo.png': ['QR code con il logo', 'PNG 3000 px, per qualsiasi altro stampato.'],
    'qr.svg': ['QR code vettoriale', 'SVG senza logo, si ingrandisce senza perdere qualità.'],
  };
  async function stampa(corpo) {
    const { file } = await api('GET', '/admin/stampa');
    corpo.innerHTML = `<p class="intro">Il materiale da stampare è riservato: sta sul server di casa e si scarica solo da qui.
        Ricorda: a Roma gli adesivi su muri, pali e cartelli pubblici sono affissione abusiva. Meglio bar, librerie, biblioteche e negozi, con il permesso del gestore.</p>
      ${file.length ? `<div class="admin-stampa">${file.map(f => { const [t, d] = STAMPA[f.nome] || [f.nome, '']; return `<div class="admin-file">
          <div><b>${esc(t)}</b><small>${esc(d)} · ${f.kb > 1024 ? (f.kb / 1024).toFixed(1).replace('.', ',') + ' MB' : f.kb + ' KB'}</small></div>
          <button class="btn secondario piccolo" data-f="${esc(f.nome)}">Scarica</button></div>`; }).join('')}</div>`
        : '<div class="vuoto"><b>Nessun file</b>Il materiale da stampare non è ancora sul server.</div>'}`;
    corpo.onclick = async e => {
      const b = e.target.closest('[data-f]'); if (!b) return;
      const prima = b.textContent; b.textContent = 'Scarico…'; b.disabled = true;
      try { const blob = await api('GET', '/admin/stampa/' + encodeURIComponent(b.dataset.f), null, true);
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'Libri di strada - ' + b.dataset.f; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 60e3); }
      catch (err) { L.toast(err.message); }
      finally { b.textContent = prima; b.disabled = false; }
    };
  }

  // clic su «Offrimi un caffè» e passaggi a ogni modo di pagare acceso (o già usato in passato)
  function caffe(s) {
    const t = s.totali, NOMI = { paypal: 'Passaggi a PayPal', stripe: 'Passaggi a Stripe', bmc: 'Passaggi a Buy Me a Coffee', kofi: 'Passaggi a Ko-fi' };
    const ultimi = e => Object.entries(s.giorni).sort((a, b) => a[0].localeCompare(b[0])).slice(-30).reduce((n, [, g]) => n + (g[e] || 0), 0);
    const tipi = Object.keys(NOMI).filter(k => (s.pagamenti || []).includes(k) || t[k]);
    const quota = k => t.caffe ? ` · ${Math.round(t[k] / t.caffe * 100)}% dei clic` : '';
    return [['caffe', 'Clic su «Offrimi un caffè»', '#ffbe0b', ''], ...tipi.map(k => [k, NOMI[k], k === 'paypal' ? '#7aa2ff' : '#3affc3', quota(k)])]
      .map(([k, n, c, q]) => `<div class="admin-numero" style="--c:${c}"><b data-n="${t[k] || 0}">0</b><span>${n}</span><small>${ultimi(k)} negli ultimi 30 giorni${q}</small></div>`).join('');
  }

  // cifre scelte da chi passa al pagamento: totale per cifra e storico mese per mese, con una stima del valore
  function importiScelti(s) {
    const tot = s.importi || {}, mesi = s.importi_mesi || {};
    const chiavi = Object.keys(tot).sort((a, b) => (a === 'libera') - (b === 'libera') || a - b);
    if (!chiavi.length) return '<p class="muted admin-nota" style="margin-top:12px">Le cifre scelte compariranno qui dal prossimo passaggio a PayPal.</p>';
    const nome = k => k === 'libera' ? 'Offerta libera' : k + ' €';
    const stima = o => Object.entries(o).reduce((t, [k, n]) => t + (k === 'libera' ? 0 : +k * n), 0);
    const max = Math.max(...Object.values(tot));
    const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
    return `<h3 class="admin-sotto">Cifre scelte</h3>
      <div class="admin-importi">${chiavi.map(k => `<div><span>${nome(k)}</span><i style="--w:${(tot[k] / max * 100).toFixed(1)}%"></i><b>${tot[k]}</b></div>`).join('')}</div>
      <div class="admin-tabella admin-mesi">${Object.entries(mesi).map(([m, o]) => `<div><b>${MESI[+m.slice(5) - 1]} ${m.slice(0, 4)}</b>
        <em>${Object.keys(o).sort((a, b) => (a === 'libera') - (b === 'libera') || a - b).map(k => `${nome(k)} ×${o[k]}`).join(' · ')}</em>
        <small>circa ${stima(o).toLocaleString('it-IT')} €${o.libera ? ' + offerte libere' : ''}</small></div>`).join('')}</div>
      <p class="muted admin-nota">È la cifra scelta prima di andare su PayPal, non quella pagata: «circa» somma solo le cifre fisse. Le offerte arrivate davvero le vedi nel conto PayPal.</p>`;
  }

  // ---- avvisi «libri nuovi»: partono da soli il sabato mattina, se ci sono novità
  async function avvisi(corpo) {
    const s = await api('GET', '/admin/avvisi');
    const data = d => new Date(d).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
    const a = s.anteprima, u = s.ultimo;
    corpo.innerHTML = `<div class="admin-numeri"><div class="admin-numero" style="--c:#ffbe0b"><b>${s.iscritti}</b><span>Iscritti agli avvisi</span></div>
        <div class="admin-numero" style="--c:#3affc3"><b>${a ? a.n : 0}</b><span>Libri nuovi da annunciare</span></div></div>
      <form class="modulo" id="fa" style="margin-top:18px"><label class="spunta interruttore"><input type="checkbox" name="attivo" ${s.attivo ? 'checked' : ''}><span><b>Invio automatico</b>
        <small>Il sabato mattina, una volta a settimana. Ognuno riceve una proposta su misura scelta dal suo telefono (in base a ciò che ha letto, salvato e aperto: il server non lo sa), più le novità. Il prossimo: ${esc(data(s.prossimo))}.</small></span></label></form>
      <h3 class="admin-sotto">Prossimo avviso</h3>
      ${a ? `<div class="avviso-anteprima"><img src="img/icona-192.png" alt=""><div><b>${esc(a.titolo)}</b><span>${esc(a.testo)}</span></div></div>`
        : ''}
      <p class="muted admin-nota">Questo è il testo per chi non ha ancora letto niente: chi ha già letto o salvato qualcosa vede al suo posto «Per te, questa settimana» con un libro scelto per lui.</p>
      <div class="bottoni" style="margin-top:14px"><button class="btn secondario" id="invia-ora" ${a && s.iscritti ? '' : 'disabled'}>Invia adesso</button></div>
      <p class="muted admin-nota" id="esito-a"></p>
      <h3 class="admin-sotto">Ultimo invio</h3>
      ${u ? `<p>${esc(u.quando.replace('T', ' '))} · «${esc(u.titolo)}» · consegnati ${u.consegnati}, non consegnati ${u.non_consegnati}${u.tolti ? ` (${u.tolti} iscritti non più attivi, tolti)` : ''}</p>` : '<p class="muted">Nessun avviso inviato finora.</p>'}
      <p class="muted admin-nota" style="margin-top:16px">Ci si iscrive dal sito con «Avvisami» (in «La mia libreria» e sotto «Appena arrivati»). Per ogni iscritto l'HP tiene solo l'indirizzo di consegna anonimo del browser.</p>`;
    corpo.querySelector('[name=attivo]').onchange = async e => {
      try { await api('POST', '/admin/avvisi', { attivo: e.target.checked }); L.toast(e.target.checked ? 'Invio automatico acceso' : 'Invio automatico spento'); }
      catch (err) { L.toast(err.message); e.target.checked = !e.target.checked; }
    };
    corpo.querySelector('#invia-ora').onclick = async e => {
      if (!confirm(`Mandare adesso l'avviso a ${s.iscritti} iscritti?`)) return;
      e.target.disabled = true;
      try { await api('POST', '/admin/avvisi/invia', {}); L.toast('Avviso inviato'); avvisi(corpo); }
      catch (err) { document.getElementById('esito-a').textContent = err.message; e.target.disabled = false; }
    };
  }

  // registro delle offerte ricevute: le scrivi tu (PayPal non le comunica al sito); solo data, importo, metodo, nota
  const euro = c => (c / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
  async function registroOfferte(box) {
    let r;
    try { r = await api('GET', '/admin/offerte'); } catch (e) { box.innerHTML = `<p class="muted">${esc(e.message)}</p>`; return; }
    const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
    const max = Math.max(1, ...Object.values(r.mesi).map(m => m.centesimi));
    const oggi = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
    const perc = r.obiettivo ? Math.min(100, r.questo_mese / r.obiettivo * 100) : 0;
    box.innerHTML = `<div class="admin-numeri"><div class="admin-numero" style="--c:#3ddc97"><b>${euro(r.totale)}</b><span>Totale ricevuto</span><small>${r.n} offert${r.n === 1 ? 'a' : 'e'}</small></div>
        <div class="admin-numero" style="--c:#ffbe0b"><b>${euro(r.questo_mese)}</b><span>Questo mese${r.obiettivo ? ` su ${euro(r.obiettivo)}` : ''}</span>
          ${r.obiettivo ? `<div class="obiettivo-barra"><i style="width:${perc.toFixed(1)}%"></i></div><small>${perc >= 100 ? 'Obiettivo raggiunto!' : `${Math.round(perc)}% dell'obiettivo · mancano ${euro(r.obiettivo - r.questo_mese)}`}</small>` : '<small>Nessun obiettivo impostato</small>'}</div></div>
      <form class="obiettivo-form modulo" id="fob"><label>Obiettivo del mese in euro <small>(privato: lo vedi solo tu qui)</small>
        <input name="importo" inputmode="decimal" value="${r.obiettivo ? String(r.obiettivo / 100).replace('.', ',') : ''}" placeholder="es. 20"></label>
        <button class="btn secondario piccolo" type="submit">Salva obiettivo</button></form>
      ${Object.keys(r.mesi).length ? `<div class="admin-importi" style="margin-top:14px">${Object.entries(r.mesi).map(([m, v]) => `<div><span>${MESI[+m.slice(5) - 1]} ${m.slice(0, 4)}</span>
        <i style="--w:${(v.centesimi / max * 100).toFixed(1)}%;background:linear-gradient(90deg,#3ddc97,#2ec4b6)"></i><b>${euro(v.centesimi)}</b></div>`).join('')}</div>` : ''}
      <form class="modulo offerta-nuova" id="fo">
        <label>Data<input type="date" name="data" value="${oggi}" max="${oggi}" required></label>
        <label>Importo in euro<input name="importo" inputmode="decimal" placeholder="3" required></label>
        <label>Metodo<select name="metodo">${Object.entries(r.metodi).map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join('')}</select></label>
        <label>Nota <small>(facoltativa, senza nomi)</small><input name="nota" maxlength="80" placeholder="es. dal QR di via Giulia"></label>
        <button class="btn primario" type="submit">Aggiungi offerta</button>
        <p class="muted" id="esito-o"></p></form>
      ${r.voci.length ? `<div class="admin-tabella admin-offerte">${r.voci.map(v => `<div><span>${esc(v.data.split('-').reverse().join('/'))}</span>
        <b>${euro(v.centesimi)} · ${esc(r.metodi[v.metodo] || v.metodo)}</b><em>${esc(v.nota || '')}</em>
        <small><button class="link" data-elimina="${esc(v.id)}">Elimina</button></small></div>`).join('')}</div>` : '<p class="muted">Nessuna offerta registrata: aggiungi la prima qui sopra.</p>'}`;
    box.querySelector('#fob').onsubmit = async e => {
      e.preventDefault();
      try { await api('POST', '/admin/offerte', { azione: 'obiettivo', importo: e.target.importo.value }); L.toast('Obiettivo salvato'); registroOfferte(box); }
      catch (err) { L.toast(err.message); }
    };
    const f = box.querySelector('#fo');
    f.onsubmit = async e => {
      e.preventDefault();
      try { await api('POST', '/admin/offerte', { data: f.data.value, importo: f.importo.value, metodo: f.metodo.value, nota: f.nota.value }); L.toast('Offerta registrata'); registroOfferte(box); }
      catch (err) { const o = box.querySelector('#esito-o'); o.style.color = '#ff6b6b'; o.textContent = err.message; }
    };
    box.querySelectorAll('[data-elimina]').forEach(b => {
      b.onclick = async () => {
        if (!confirm('Eliminare questa offerta dal registro?')) return;
        try { await api('POST', '/admin/offerte', { azione: 'elimina', id: b.dataset.elimina }); registroOfferte(box); } catch (err) { L.toast(err.message); }
      };
    });
  }

  async function statistiche(corpo) {
    const s = await api('GET', '/admin/statistiche');
    const giorni = Object.entries(s.giorni).sort((a, b) => a[0].localeCompare(b[0])).slice(-30);
    const max = Math.max(1, ...giorni.map(([, g]) => g.visita + g.qr));
    const t = s.totali;
    corpo.innerHTML = `<div class="admin-numeri">
        ${[['Persone oggi', (s.persone || {}).oggi || 0, '#ff8a4c'], ['Persone questo mese', (s.persone || {}).mese || 0, '#ff5d8f'], ['Persone da sempre', (s.persone || {}).totali || 0, '#c6ff00'],
           ['QR inquadrati', t.qr, '#ffbe0b'], ['Visite (aperture)', t.visita + t.qr, '#3affc3'], ['Letture', t.lettura, '#ff3d7f'], ['Download', t.download, '#7aa2ff'], ['Libri in catalogo', s.catalogo, '#fff']]
          .map(([n, v, c]) => `<div class="admin-numero" style="--c:${c}"><b data-n="${v}">0</b><span>${n}</span></div>`).join('')}</div>
      <p class="muted admin-nota" style="margin-top:10px">«Persone» sono telefoni o computer diversi, contati senza codici né cookie (si conta dal ${esc(((s.persone || {}).dal || '').split('-').reverse().join('/'))}). «Visite» sono le aperture del sito: una persona può aprirlo più volte.</p>
      <h2 class="reparto">Offrimi un caffè</h2>
      <div class="admin-numeri">${caffe(s)}</div>
      ${importiScelti(s)}
      <h3 class="admin-sotto">Offerte ricevute</h3><div id="offerte"><p class="muted">Leggo il registro…</p></div>
      <p class="muted admin-nota" style="margin-top:12px">Clic sul pulsante e passaggi al sito di pagamento. Se una persona ci clicca più volte in mezz'ora conta una volta sola; i tuoi clic mentre sei collegato qui non contano. Quanto è stato offerto davvero lo vedi solo nel tuo conto PayPal.</p>
      <h2 class="reparto">Ultimi 30 giorni</h2>
      ${giorni.length ? `<div class="admin-grafico">${giorni.map(([d, g]) => `<div class="colonna" title="${d}: ${g.qr} da QR, ${g.visita} altre visite, ${g.lettura} letture">
          <i class="v" style="height:${(g.visita / max * 100).toFixed(1)}%"></i><i class="q" style="height:${(g.qr / max * 100).toFixed(1)}%"></i><span>${d.slice(8)}</span></div>`).join('')}</div>
        <p class="muted" style="font-size:12.5px"><span class="legenda q"></span> aperture dal QR <span class="legenda v"></span> altre visite</p>`
        : '<div class="vuoto"><b>Ancora nessuna visita</b>Quando qualcuno apre il sito, i numeri compaiono qui.</div>'}
      <h2 class="reparto">I libri più letti</h2>
      ${s.libri.length ? `<div class="admin-tabella">${s.libri.slice(0, 40).map((b, i) => `<div><span>${i + 1}</span><b>${esc(b.titolo)}</b><em>${esc((b.autori || []).join(', '))}</em>
        <small>${b.lettura || 0} letture · ${b.download || 0} download</small></div>`).join('')}</div>` : '<div class="vuoto"><b>Nessuna lettura ancora</b></div>'}
      <p class="muted" style="font-size:12.5px;margin-top:24px">Conteggi anonimi: nessun dato personale viene salvato.</p>`;
    registroOfferte(document.getElementById('offerte'));
    corpo.querySelectorAll('[data-n]').forEach(el => { const fine = +el.dataset.n; let t0; const p = ts => { t0 = t0 || ts; const k = Math.min(1, (ts - t0) / 900);
      el.textContent = Math.round(fine * (1 - Math.pow(1 - k, 3))).toLocaleString('it-IT'); if (k < 1) requestAnimationFrame(p); }; requestAnimationFrame(p); });
  }

  async function proposte(corpo, app) {
    const { proposte: ps } = await api('GET', '/admin/proposte');
    if (!ps.length) { corpo.innerHTML = '<div class="vuoto"><b>Nessuna proposta in attesa</b>Le proposte da «Pubblica il tuo libro» arrivano qui.</div>'; return; }
    corpo.innerHTML = ps.map(p => `<article class="admin-proposta" data-id="${esc(p.id)}">
      <header><div><b>${esc(p.titolo)}</b><span>di ${esc(p.autore)} · ${esc(p.genere || 'genere non indicato')} · ${esc(p.licenza)}</span></div>
        <small>${esc(p.quando.replace('T', ' ').slice(0, 16))} · ${p.tipo.toUpperCase()} · ${(p.byte / 1e6).toFixed(1).replace('.', ',')} MB</small></header>
      ${p.messaggio ? `<p>${esc(p.messaggio)}</p>` : ''}
      <p class="muted" style="font-size:13px">Email dell'autore: <a href="mailto:${esc(p.email)}">${esc(p.email)}</a> (si cancella dopo la decisione)</p>
      <div class="admin-approva">
        <label>Categoria<select name="categoria">${CATEGORIE.map(c => `<option>${c}</option>`).join('')}</select></label>
        <label>Scaffali<select name="scaffali" multiple size="4">${SCAFFALI.map(c => `<option>${c}</option>`).join('')}</select></label>
        <label>Trama (facoltativa)<textarea name="trama" rows="3" maxlength="900">${esc(p.messaggio || '')}</textarea></label></div>
      <div class="bottoni"><button class="btn contorno piccolo" data-a="scarica">Scarica e leggi</button>
        <button class="btn primario piccolo" data-a="approva">Approva e pubblica</button><button class="btn secondario piccolo" data-a="rifiuta">Rifiuta</button></div></article>`).join('');
    corpo.onclick = async e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const art = b.closest('[data-id]'), id = art.dataset.id, p = ps.find(x => x.id === id);
      try {
        if (b.dataset.a === 'scarica') {
          const blob = await api('GET', `/admin/proposta/${id}/file`, null, true);
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${p.autore} - ${p.titolo}.${p.tipo}`; a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 5000); return;
        }
        if (b.dataset.a === 'rifiuta' && !confirm(`Rifiutare «${p.titolo}»? La proposta e i dati dell'autore vengono cancellati. Ricordati di scrivergli.`)) return;
        if (b.dataset.a === 'approva' && !confirm(`Pubblicare «${p.titolo}» di ${p.autore} con licenza ${p.licenza}? Controlla di averlo letto.`)) return;
        const sel = art.querySelector('[name=scaffali]');
        await api('POST', `/admin/proposta/${id}`, { azione: b.dataset.a, categoria: art.querySelector('[name=categoria]').value,
          scaffali: [...sel.selectedOptions].map(o => o.value), trama: art.querySelector('[name=trama]').value });
        L.toast(b.dataset.a === 'approva' ? 'Pubblicato in Autori emergenti' : 'Proposta rifiutata');
        pannello(app, 'proposte');
      } catch (err) { L.toast(err.message); }
    };
  }

  window.LDSAdmin = async app => {
    if (!L.S.server) { app.innerHTML = '<div class="carica"><div class="anello"></div></div>'; return setTimeout(() => window.LDSAdmin(app), 400); }
    if (tok.get()) return pannello(app);
    try { const s = await api('GET', '/admin/stato'); modulo(app, !s.configurato); }
    catch { guscio(app, '<div class="vuoto"><b>Il server di casa non risponde</b>L\'area admin funziona quando l\'HP è acceso.</div>'); }
  };
})();
