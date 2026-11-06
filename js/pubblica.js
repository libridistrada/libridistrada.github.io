/* Libri di strada — «Pubblica il tuo libro»: la proposta arriva all'HP e viene approvata a mano. */
(() => {
  'use strict';
  const { esc, toast, S } = window.LDS;
  const LICENZE = [
    ['CC BY 4.0', 'Chiunque può leggerlo, condividerlo e anche adattarlo, citandoti.'],
    ['CC BY-SA 4.0', 'Come la precedente, ma chi lo adatta deve usare la stessa licenza.'],
    ['CC BY-ND 4.0', 'Si può leggere e condividere così com\'è, senza modifiche, citandoti.'],
    ['CC0', 'Lo regali a tutti, senza nessuna condizione.'],
  ];
  window.LDSPubblica = app => {
    document.title = 'Pubblica il tuo libro · Libri di strada';
    app.innerHTML = `<div class="pagina"><h1>Pubblica il tuo libro</h1>
      <p class="intro">Scrivi? Regala il tuo libro alla città. Finirà nella raccolta <b>Autori emergenti</b>, letto da chi trova i nostri QR per strada, con il tuo nome in copertina.</p>
      <div class="testo" style="margin-bottom:28px">
        <h2>Come funziona</h2>
        <p>Mandaci il libro in PDF o ePub e scegli una licenza libera: è quella che ci permette di distribuirlo gratis. Lo leggiamo e, se va bene, lo pubblichiamo. Ti scriviamo in ogni caso. Il libro resta tuo: la licenza non ti impedisce di pubblicarlo anche altrove, anche a pagamento.</p>
        <p>Non accettiamo libri di cui non sei l'autore o i diritti, né testi offensivi o illegali.</p>
      </div>
      <form class="modulo" id="modulo" novalidate>
        <label>Titolo del libro<input name="titolo" required maxlength="200" autocomplete="off"></label>
        <label>Nome dell'autore (come vuoi che appaia)<input name="autore" required maxlength="120" autocomplete="name"></label>
        <label>La tua email (solo per risponderti, non sarà pubblicata)<input name="email" type="email" required maxlength="200" autocomplete="email"></label>
        <label>Genere<select name="genere"><option value="">Scegli…</option>${['Romanzo', 'Racconti', 'Poesia', 'Horror e fantastico', 'Esoterismo e mistero', 'Saggio', 'Manuale e formazione', 'Sport e benessere', 'Tecnologia', 'Ragazzi', 'Altro'].map(g => `<option>${g}</option>`).join('')}</select></label>
        <fieldset style="border:0;padding:0;margin:0;display:grid;gap:8px"><legend style="font-size:13.5px;color:var(--fg2);margin-bottom:6px">Licenza</legend>
          ${LICENZE.map(([l, d], i) => `<label class="spunta"><input type="radio" name="licenza" value="${l}" ${i === 0 ? 'checked' : ''}><span><b>${l}</b> — ${d}</span></label>`).join('')}
        </fieldset>
        <label>Due righe sul libro (facoltativo)<textarea name="messaggio" rows="4" maxlength="1500"></textarea></label>
        <label>Il file (PDF o ePub, fino a 30 MB)<input name="file" type="file" accept=".pdf,.epub,application/pdf,application/epub+zip" required></label>
        <label class="spunta"><input type="checkbox" name="dichiaro"><span>Dichiaro di essere l'autore del libro (o di averne i diritti) e di rilasciarlo con la licenza scelta. <small>I dati servono solo a valutare la proposta e a risponderti; li cancelliamo se il libro non viene pubblicato.</small></span></label>
        <div><button class="btn primario" type="submit" id="invia">Invia la proposta</button></div>
        <p id="esito" class="muted"></p>
      </form></div>`;
    const f = document.getElementById('modulo');
    f.onsubmit = async e => {
      e.preventDefault();
      const d = new FormData(f), file = d.get('file'), esito = document.getElementById('esito'), btn = document.getElementById('invia');
      if (!d.get('titolo').trim() || !d.get('autore').trim() || !/^\S+@\S+\.\S{2,}$/.test(d.get('email'))) return (esito.textContent = 'Servono titolo, nome e un\'email valida.');
      if (!file || !file.size) return (esito.textContent = 'Scegli il file del libro.');
      if (file.size > 30 * 1024 * 1024) return (esito.textContent = 'Il file deve essere più piccolo di 30 MB.');
      if (!d.get('dichiaro')) return (esito.textContent = 'Serve la conferma di essere l\'autore.');
      const q = new URLSearchParams({ titolo: d.get('titolo'), autore: d.get('autore'), email: d.get('email'), licenza: d.get('licenza'),
        genere: d.get('genere') || '', messaggio: d.get('messaggio') || '', nome_file: file.name, dichiaro: '1' });
      btn.disabled = true; btn.textContent = 'Invio in corso…'; esito.textContent = '';
      try {
        const r = await fetch(`${S.server}/proponi?${q}`, { method: 'POST', body: file, headers: { 'Content-Type': 'application/octet-stream' } });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.errore || 'Invio non riuscito');
        f.innerHTML = `<div class="vuoto" style="text-align:left"><b>Grazie, ${esc(d.get('autore'))}!</b>Abbiamo ricevuto «${esc(d.get('titolo'))}». Ti scriveremo a ${esc(d.get('email'))} appena l'avremo letto.</div>`;
        toast('Proposta inviata');
      } catch (err) {
        esito.textContent = S.online === false ? 'La libreria di casa sta dormendo: riprova tra qualche ora.' : err.message;
        btn.disabled = false; btn.textContent = 'Invia la proposta';
      }
    };
  };
})();
