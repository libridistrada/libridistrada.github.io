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
      <label>Nome utente<input name="utente" required autocomplete="username"></label>
      <label>Password<input name="password" type="password" required autocomplete="${attivazione ? 'new-password' : 'current-password'}" minlength="${attivazione ? 10 : 1}"></label>
      ${attivazione ? '<label>Ripeti la password<input name="password2" type="password" required autocomplete="new-password"></label>' : ''}
      <div><button class="btn primario" type="submit">${attivazione ? 'Crea e entra' : 'Entra'}</button></div><p class="muted" id="esito"></p></form>`);
    document.getElementById('f').onsubmit = async e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target));
      const esito = document.getElementById('esito');
      if (attivazione && d.password !== d.password2) return (esito.textContent = 'Le due password non coincidono.');
      esito.textContent = 'Un momento…';
      try {
        const r = await api('POST', attivazione ? '/admin/attiva' : '/admin/entra', attivazione ? { codice: d.codice, utente: d.utente, password: d.password } : { utente: d.utente, password: d.password });
        tok.set(r.token);
        window.LDSAdmin(app);
      } catch (err) { esito.textContent = err.message; }
    };
  }

  // ---------------------------------------------------------------- pannello
  async function pannello(app, scheda = 'sostieni') {
    guscio(app, `<nav class="admin-schede">${[['sostieni', 'Offrimi un caffè'], ['statistiche', 'Statistiche'], ['proposte', 'Proposte degli autori']]
      .map(([k, n]) => `<button class="filtro ${k === scheda ? 'on' : ''}" data-s="${k}">${n}</button>`).join('')}</nav><div id="admin-corpo"><div class="carica"><div class="anello"></div></div></div>`);
    app.querySelector('.admin-schede').onclick = e => { const b = e.target.closest('[data-s]'); if (b) pannello(app, b.dataset.s); };
    const corpo = document.getElementById('admin-corpo');
    try { await ({ sostieni, statistiche, proposte }[scheda])(corpo, app); }
    catch (err) { if (!tok.get()) return window.LDSAdmin(app); corpo.innerHTML = `<div class="vuoto"><b>Qualcosa non va</b>${esc(err.message)}</div>`; }
  }

  async function sostieni(corpo) {
    const s = (await api('GET', '/admin/config')).sostieni;
    const ck = (n, v, t, d) => `<label class="spunta interruttore"><input type="checkbox" name="${n}" ${v ? 'checked' : ''}><span><b>${t}</b><small>${d}</small></span></label>`;
    corpo.innerHTML = `<form class="modulo" id="fs">
      ${ck('attivo', s.attivo, 'Pulsante acceso', 'Quando è spento non compare da nessuna parte del sito.')}
      <label>Il tuo link (Buy Me a Coffee, PayPal.me o Ko-fi)<input name="link" value="${esc(s.link)}" placeholder="https://buymeacoffee.com/libridistrada" inputmode="url"></label>
      <label>Testo del pulsante<input name="testo" value="${esc(s.testo)}" maxlength="60"></label>
      <label>Messaggio del popup<textarea name="messaggio" rows="3" maxlength="400">${esc(s.messaggio)}</textarea></label>
      <fieldset class="admin-dove"><legend>Dove compare</legend>
        ${ck('in_alto', s.in_alto, 'In alto', 'Nella barra del sito, accanto alla ricerca.')}
        ${ck('popup', s.popup, 'Popup', 'Dopo 3 minuti di lettura o al terzo libro aperto. Al massimo una volta a settimana per persona.')}
        ${ck('scheda', s.scheda, 'Nella scheda e in fondo', 'Nella scheda di ogni libro e in fondo alla pagina.')}</fieldset>
      <div class="bottoni"><button class="btn primario" type="submit">Salva</button><button class="btn secondario" type="button" id="prova">Vedi il popup</button></div>
      <p class="muted" id="esito-s"></p></form>`;
    const f = document.getElementById('fs');
    const leggiF = () => { const d = new FormData(f); return { attivo: d.has('attivo'), link: d.get('link').trim(), testo: d.get('testo'), messaggio: d.get('messaggio'),
      in_alto: d.has('in_alto'), popup: d.has('popup'), scheda: d.has('scheda') }; };
    f.onsubmit = async e => {
      e.preventDefault();
      const out = document.getElementById('esito-s');
      try { await api('POST', '/admin/config', { sostieni: leggiF() }); out.textContent = 'Salvato: il sito si aggiorna subito.'; window.LDSSostieni.ricarica(); }
      catch (err) { out.textContent = err.message; }
    };
    document.getElementById('prova').onclick = () => window.LDSSostieni.prova({ ...leggiF(), attivo: true, link: leggiF().link || 'https://buymeacoffee.com/' });
  }

  async function statistiche(corpo) {
    const s = await api('GET', '/admin/statistiche');
    const giorni = Object.entries(s.giorni).sort((a, b) => a[0].localeCompare(b[0])).slice(-30);
    const max = Math.max(1, ...giorni.map(([, g]) => g.visita + g.qr));
    const t = s.totali;
    corpo.innerHTML = `<div class="admin-numeri">
        ${[['QR inquadrati', t.qr, '#ffbe0b'], ['Visite', t.visita + t.qr, '#3affc3'], ['Letture', t.lettura, '#ff3d7f'], ['Download', t.download, '#7aa2ff'], ['Libri in catalogo', s.catalogo, '#fff']]
          .map(([n, v, c]) => `<div class="admin-numero" style="--c:${c}"><b data-n="${v}">0</b><span>${n}</span></div>`).join('')}</div>
      <h2 class="reparto">Ultimi 30 giorni</h2>
      ${giorni.length ? `<div class="admin-grafico">${giorni.map(([d, g]) => `<div class="colonna" title="${d}: ${g.qr} da QR, ${g.visita} altre visite, ${g.lettura} letture">
          <i class="v" style="height:${(g.visita / max * 100).toFixed(1)}%"></i><i class="q" style="height:${(g.qr / max * 100).toFixed(1)}%"></i><span>${d.slice(8)}</span></div>`).join('')}</div>
        <p class="muted" style="font-size:12.5px"><span class="legenda q"></span> aperture dal QR <span class="legenda v"></span> altre visite</p>`
        : '<div class="vuoto"><b>Ancora nessuna visita</b>Quando qualcuno apre il sito, i numeri compaiono qui.</div>'}
      <h2 class="reparto">I libri più letti</h2>
      ${s.libri.length ? `<div class="admin-tabella">${s.libri.slice(0, 40).map((b, i) => `<div><span>${i + 1}</span><b>${esc(b.titolo)}</b><em>${esc((b.autori || []).join(', '))}</em>
        <small>${b.lettura || 0} letture · ${b.download || 0} download</small></div>`).join('')}</div>` : '<div class="vuoto"><b>Nessuna lettura ancora</b></div>'}
      <p class="muted" style="font-size:12.5px;margin-top:24px">Conteggi anonimi: nessun dato personale viene salvato.</p>`;
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
