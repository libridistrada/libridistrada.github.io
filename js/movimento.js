/* Libri di strada — MOVIMENTO: cursore, anteprime, parallasse, lettere che fluttuano, libro 3D, onde al tocco.
   Si aggancia alle pagine da solo (osserva #app e #scheda). Rispetta «riduci movimento». */
(() => {
  'use strict';
  const L = window.LDS;
  const fermo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mouse = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = L.esc;

  // ---------------------------------------------------------------- barra di scorrimento
  const barra = document.createElement('div');
  barra.className = 'scorrimento';
  document.body.appendChild(barra);
  addEventListener('scroll', () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    barra.style.transform = `scaleX(${h > 0 ? scrollY / h : 0})`;
  }, { passive: true });

  // ---------------------------------------------------------------- onde al tocco
  document.addEventListener('pointerdown', e => {
    const t = e.target.closest('.btn, .porta, .filtro, .raccolta-tessera, .libro, .lt-scelte button');
    if (!t || fermo) return;
    const r = t.getBoundingClientRect();
    const o = document.createElement('span');
    o.className = 'onda';
    const d = Math.max(r.width, r.height) * 2.2;
    o.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    const dove = t.classList.contains('libro') ? t.querySelector('.poster') || t : t;
    if (getComputedStyle(dove).position === 'static') dove.style.position = 'relative';
    dove.appendChild(o);
    setTimeout(() => o.remove(), 700);
  }, { passive: true });

  if (!mouse || fermo) {
    // al tocco: il libro si «preme» un attimo
    document.addEventListener('touchstart', e => { const p = e.target.closest('.libro .poster'); if (p) { p.classList.add('premuto'); setTimeout(() => p.classList.remove('premuto'), 220); } }, { passive: true });
  }

  // ---------------------------------------------------------------- reazioni al passaggio del mouse (cursore normale)
  if (mouse && !fermo) {
    // pulsanti magnetici
    document.addEventListener('mousemove', e => {
      document.querySelectorAll('.magnetico').forEach(m => { if (!m.matches(':hover')) m.style.transform = ''; });
      const m = e.target.closest('.btn, .porta, .icon-btn, .vetrina-punti button');
      if (!m) return;
      m.classList.add('magnetico');
      const r = m.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
      const f = m.classList.contains('porta') ? .06 : .28;
      m.style.transform = `translate(${x * f}px, ${y * f * 1.2}px)${m.classList.contains('porta') ? ' scale(1.03)' : ''}`;
      if (m.classList.contains('porta')) { m.style.setProperty('--lx', (e.clientX - r.left) + 'px'); m.style.setProperty('--ly', (e.clientY - r.top) + 'px'); }
    }, { passive: true });
  }

  // ---------------------------------------------------------------- trascinare le file col mouse
  if (mouse) {
    let tr = null;
    document.addEventListener('pointerdown', e => {
      const b = e.target.closest('.binario');
      if (!b || e.pointerType !== 'mouse' || e.button !== 0) return;
      tr = { b, x: e.clientX, s: b.scrollLeft, mosso: false, v: 0, t: performance.now(), lx: e.clientX };
    });
    addEventListener('pointermove', e => {
      if (!tr) return;
      const dx = e.clientX - tr.x;
      if (Math.abs(dx) > 6) { tr.mosso = true; tr.b.classList.add('trascina'); }
      if (tr.mosso) {
        tr.b.scrollLeft = tr.s - dx;
        const now = performance.now(); tr.v = (e.clientX - tr.lx) / Math.max(1, now - tr.t); tr.t = now; tr.lx = e.clientX;
      }
    });
    addEventListener('pointerup', () => {
      if (!tr) return;
      const t = tr; tr = null;
      t.b.classList.remove('trascina');
      if (t.mosso) {
        // inerzia, e il clic che segue non apre il libro
        let v = -t.v * 16;
        (function scivola() { if (Math.abs(v) < .5) return; t.b.scrollLeft += v; v *= .92; requestAnimationFrame(scivola); })();
        const blocca = ev => { ev.preventDefault(); ev.stopPropagation(); };
        t.b.addEventListener('click', blocca, { capture: true, once: true });
        setTimeout(() => t.b.removeEventListener('click', blocca, true), 50);
      }
    });
  }

  // ---------------------------------------------------------------- anteprima ingrandita (come Netflix)
  let anteprimaT, anteprima;
  function chiudiAnteprima() { clearTimeout(anteprimaT); if (anteprima) { const a = anteprima; anteprima = null; a.classList.remove('su'); setTimeout(() => a.remove(), 250); } }
  if (mouse && !fermo) {
    document.addEventListener('mouseover', e => {
      const l = e.target.closest('.binario .libro, .griglia .libro');
      if (!l || (anteprima && anteprima.dataset.id === l.getAttribute('href'))) return;
      clearTimeout(anteprimaT);
      anteprimaT = setTimeout(() => apriAnteprima(l), 650);
    });
    document.addEventListener('mouseout', e => {
      const l = e.target.closest('.libro');
      if (l && !l.contains(e.relatedTarget) && !(anteprima && anteprima.contains(e.relatedTarget))) clearTimeout(anteprimaT);
    });
    addEventListener('scroll', chiudiAnteprima, { passive: true });
  }
  function apriAnteprima(l) {
    chiudiAnteprima();
    if (!l.isConnected || !l.matches(':hover')) return;
    const id = decodeURIComponent(l.getAttribute('href').split('/').pop());
    const b = L.S.per.get(id);
    if (!b) return;
    const r = l.querySelector('.poster').getBoundingClientRect();
    const w = Math.max(280, r.width * 1.9);
    const a = document.createElement('div');
    a.className = 'anteprima';
    a.dataset.id = l.getAttribute('href');
    const [p1, p2] = L.tavolozza(b);
    a.style.cssText = `--p1:${p1};--p2:${p2};width:${w}px;left:${Math.min(innerWidth - w - 12, Math.max(12, r.left + r.width / 2 - w / 2))}px;top:${Math.max(70, r.top - 30) + scrollY}px`;
    const testo = b.tr || b.inc || '';
    a.innerHTML = `<div class="anteprima-testa">${L.copertina(b)}<div><b>${esc(b.t.replace(/\s*\([^)]*\)\s*$/, ''))}</b><span>${esc(L.autori(b))}</span>
        <em>${[b.y, L.durata(b), b.c].filter(Boolean).map(esc).join(' · ')}</em></div></div>
      ${testo ? `<p>${esc(testo.slice(0, 220))}${testo.length > 220 ? '…' : ''}</p>` : ''}
      <div class="anteprima-tasti"><a class="btn primario piccolo" href="#/leggi/${encodeURIComponent(b.id)}">${L.ico.play} Leggi</a>
        <a class="btn secondario piccolo" href="#/libro/${encodeURIComponent(b.id)}">${L.ico.info} Scheda</a>
        ${b.e ? '<button class="btn secondario piccolo" data-salva></button>' : ''}</div>`;
    document.body.appendChild(a);
    const sv = a.querySelector('[data-salva]');
    if (sv) L.bottoneSalva(sv, b);
    anteprima = a;
    requestAnimationFrame(() => a.classList.add('su'));
    a.addEventListener('mouseleave', chiudiAnteprima);
    a.addEventListener('click', e => { if (e.target.closest('a')) chiudiAnteprima(); });
  }

  // ---------------------------------------------------------------- home: parallasse, lettere, contatori
  function lettereFluttuanti(v) {
    if (fermo || v.querySelector('canvas.lettere')) return;
    const c = document.createElement('canvas');
    c.className = 'lettere';
    v.prepend(c);
    const x = c.getContext('2d');
    const glifi = 'ABCDEFGHILMNOPQRSTUVZ&?!«»§¶';
    let W, H, dpr, parti = [], mx = -999, my = -999;
    const misura = () => {
      dpr = Math.min(2, devicePixelRatio || 1); W = v.clientWidth; H = v.clientHeight;
      c.width = W * dpr; c.height = H * dpr; c.style.width = W + 'px'; c.style.height = H + 'px';
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(W * H / 26000);
      parti = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 14 + Math.random() * 46, v: .15 + Math.random() * .45,
        r: Math.random() * 6.28, vr: (Math.random() - .5) * .006, g: glifi[Math.floor(Math.random() * glifi.length)], a: .05 + Math.random() * .13, dx: 0, dy: 0 }));
    };
    misura();
    addEventListener('resize', misura);
    v.addEventListener('mousemove', e => { const r = v.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
    v.addEventListener('mouseleave', () => { mx = my = -999; });
    (function disegna() {
      if (!c.isConnected) return;
      x.clearRect(0, 0, W, H);
      const col = getComputedStyle(v).getPropertyValue('--a2').trim() || '#fff';
      for (const p of parti) {
        p.y -= p.v; p.r += p.vr;
        if (p.y < -60) { p.y = H + 40; p.x = Math.random() * W; }
        const ddx = p.x - mx, ddy = p.y - my, d = Math.hypot(ddx, ddy);
        if (d < 140) { p.dx += ddx / d * 1.6; p.dy += ddy / d * 1.6; }   // il cursore le spinge via
        p.dx *= .92; p.dy *= .92; p.x += p.dx; p.y += p.dy;
        x.save(); x.translate(p.x, p.y); x.rotate(p.r);
        x.globalAlpha = p.a; x.fillStyle = col; x.font = `italic 600 ${p.s}px Fraunces, Georgia, serif`;
        x.fillText(p.g, 0, 0); x.restore();
      }
      requestAnimationFrame(disegna);
    })();
  }
  function parallasse(v) {
    if (!mouse || fermo || v.dataset.para) return;
    v.dataset.para = 1;
    v.addEventListener('mousemove', e => {
      const r = v.getBoundingClientRect();
      v.style.setProperty('--px', ((e.clientX - r.left) / r.width - .5).toFixed(3));
      v.style.setProperty('--py', ((e.clientY - r.top) / r.height - .5).toFixed(3));
    });
    v.addEventListener('mouseleave', () => { v.style.setProperty('--px', 0); v.style.setProperty('--py', 0); });
  }
  function contatori(root) {
    root.querySelectorAll('.porta span').forEach(s => {
      const m = s.textContent.match(/^(\d+)/);
      if (!m || fermo) return;
      const fine = +m[1], resto = s.textContent.slice(m[1].length);
      let t0 = null;
      const passo = t => { t0 = t0 || t; const k = Math.min(1, (t - t0) / 1200); s.textContent = Math.round(fine * (1 - Math.pow(1 - k, 3))) + resto; if (k < 1) requestAnimationFrame(passo); };
      requestAnimationFrame(passo);
    });
  }
  function titoliAnimati(root) {
    root.querySelectorAll('.fila-testa h2:not(.diviso)').forEach(h => {
      h.classList.add('diviso');
      const punto = h.querySelector('.punto');
      const t = h.textContent.trim();
      h.innerHTML = '';
      if (punto) h.appendChild(punto);
      const parola = document.createElement('span');   // un solo contenitore: il titolo resta una riga di testo normale
      parola.className = 'lts';
      [...t].forEach((ch, i) => { const s = document.createElement('span'); s.className = 'lt'; s.style.setProperty('--k', i); s.textContent = ch === ' ' ? ' ' : ch; parola.appendChild(s); });
      h.appendChild(parola);
    });
  }

  // ---------------------------------------------------------------- scheda: libro 3D e apertura
  function libro3d(scheda) {
    const testa = scheda.querySelector('.scheda-testa');
    const p = testa && testa.querySelector(':scope > .poster');
    if (!p || testa.querySelector('.libro3d')) return;
    const id = decodeURIComponent(location.hash.split('/').pop());
    const b = L.S.per.get(id);
    if (!b) return;
    const [p1, p2, p3] = L.tavolozza(b);
    const box = document.createElement('div');
    box.className = 'libro3d';
    box.style.cssText = `--p1:${p1};--p2:${p2};--p3:${p3}`;
    const spessore = Math.max(16, Math.min(46, (b.w || 30000) / 4000));
    box.style.setProperty('--sp', spessore + 'px');
    const retro = (b.tr || b.inc || '').slice(0, 260);
    box.innerHTML = `<div class="l3-corpo">
        <div class="l3-fronte"></div>
        <div class="l3-costola"><span>${esc(b.t.replace(/\s*\([^)]*\)\s*$/, ''))}</span><i>LdS</i></div>
        <div class="l3-retro"><p>${esc(retro)}${retro.length >= 260 ? '…' : ''}</p><b>Libri di strada</b><small>Gratis, per sempre</small></div>
        <div class="l3-pagine"></div><div class="l3-sopra"></div>
      </div><div class="l3-ombra"></div>`;
    box.querySelector('.l3-fronte').appendChild(p);
    testa.prepend(box);
    const corpo = box.querySelector('.l3-corpo');
    let ry = -22, rx = 8, girato = false, trasc = null, auto = true;
    const metti = () => { corpo.style.transform = `rotateX(${rx}deg) rotateY(${ry + (girato ? 180 : 0)}deg)`; };
    metti();
    // gira da solo piano finché non lo tocchi
    let t = 0;
    (function dondola() {
      if (!box.isConnected) return;
      if (auto && !fermo) { t += .012; ry = -22 + Math.sin(t) * 14; rx = 8 + Math.sin(t * .7) * 3; metti(); }
      requestAnimationFrame(dondola);
    })();
    box.addEventListener('pointerdown', e => { auto = false; trasc = { x: e.clientX, y: e.clientY, ry, rx, mosso: false }; box.setPointerCapture(e.pointerId); });
    box.addEventListener('pointermove', e => {
      if (trasc) {
        const dx = e.clientX - trasc.x, dy = e.clientY - trasc.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) trasc.mosso = true;
        ry = trasc.ry + dx * .6; rx = Math.max(-30, Math.min(30, trasc.rx - dy * .3)); metti();
      } else if (mouse) {
        auto = false;
        const r = box.getBoundingClientRect();
        ry = ((e.clientX - r.left) / r.width - .5) * 50; rx = -((e.clientY - r.top) / r.height - .5) * 24; metti();
      }
    });
    box.addEventListener('pointerup', () => { if (trasc && !trasc.mosso) { girato = !girato; corpo.classList.add('liscio'); metti(); setTimeout(() => corpo.classList.remove('liscio'), 700); } trasc = null; });
    box.addEventListener('mouseleave', () => { if (!trasc) auto = true; });
    // «Leggi»: la copertina si apre come un libro, poi il lettore
    scheda.querySelectorAll('a.btn.primario[href^="#/leggi/"]').forEach(a => a.addEventListener('click', e => {
      if (fermo) return;
      e.preventDefault();
      auto = false; girato = false; ry = 0; rx = 0; corpo.classList.add('liscio'); metti();
      box.classList.add('apre');
      setTimeout(() => { location.hash = a.getAttribute('href'); }, 820);
    }));
  }
  function particelle(scheda) {
    const testa = scheda.querySelector('.scheda-testa');
    if (!testa || fermo || testa.querySelector('.particelle')) return;
    const c = document.createElement('div');
    c.className = 'particelle';
    c.innerHTML = Array.from({ length: 18 }, (_, i) => `<i style="--x:${Math.random() * 100}%;--d:${6 + Math.random() * 8}s;--r:${-Math.random() * 10}s;--s:${3 + Math.random() * 9}px;--o:${.25 + Math.random() * .5}"></i>`).join('');
    testa.prepend(c);
    if (mouse) testa.addEventListener('mousemove', e => {
      const r = testa.getBoundingClientRect();
      testa.style.setProperty('--hx', ((e.clientX - r.left) / r.width - .5).toFixed(3));
      testa.style.setProperty('--hy', ((e.clientY - r.top) / r.height - .5).toFixed(3));
    });
  }

  // ---------------------------------------------------------------- aggancio alle pagine
  const app = $('#app'), scheda = $('#scheda');
  const suHome = () => {
    chiudiAnteprima();
    const v = app.querySelector('.vetrina');
    if (v) { lettereFluttuanti(v); parallasse(v); }
    contatori(app);
    titoliAnimati(app);
  };
  const suScheda = () => { if (!scheda.hidden && scheda.firstElementChild) { chiudiAnteprima(); libro3d(scheda); particelle(scheda); titoliAnimati(scheda); } };
  new MutationObserver(suHome).observe(app, { childList: true });
  new MutationObserver(suScheda).observe(scheda, { childList: true });
  suHome(); suScheda();
})();
