/* Libri di strada — FONDALE: lo sfondo animato dietro tutto il sito.
   Una mappa di città che si disegna, luci di colore, grana di carta e un motivo che cambia con il genere
   della fila che stai guardando (horror, Roma, esoterismo, lingue, guide…). */
(() => {
  'use strict';
  if (document.documentElement.classList.contains('leggero')) return;   // telefono lento: niente sfondo animato
  const fermo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const f = document.createElement('div');
  f.id = 'fondale';
  f.setAttribute('aria-hidden', 'true');

  // ---- mappa di una città immaginaria: strade storte, viali, piazze e un fiume
  let seme = 7;
  const caso = () => (seme = (seme * 16807) % 2147483647) / 2147483647;
  const W = 1600, H = 1200;
  const strade = [];
  for (let i = 0; i < 26; i++) {   // vie che vagano
    let x = caso() * W, y = caso() * H, a = caso() * Math.PI * 2;
    let d = `M${x.toFixed(0)} ${y.toFixed(0)}`;
    for (let k = 0; k < 9; k++) {
      a += (caso() - .5) * .9;
      const l = 60 + caso() * 140;
      const cx = x + Math.cos(a) * l * .5, cy = y + Math.sin(a) * l * .5;
      x += Math.cos(a) * l; y += Math.sin(a) * l;
      d += ` Q${cx.toFixed(0)} ${cy.toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)}`;
    }
    strade.push(`<path class="via" d="${d}" style="--l:${1400 + Math.round(caso() * 900)};--t:${(caso() * 14).toFixed(1)}s"/>`);
  }
  for (let i = 0; i < 7; i++) {   // viali dritti
    const y = caso() * H, a = (caso() - .5) * .5;
    strade.push(`<path class="viale" d="M-50 ${y.toFixed(0)} L${W + 50} ${(y + Math.tan(a) * W).toFixed(0)}" style="--l:1800;--t:${(caso() * 10).toFixed(1)}s"/>`);
  }
  const piazze = Array.from({ length: 9 }, () => `<circle class="piazza" cx="${(caso() * W).toFixed(0)}" cy="${(caso() * H).toFixed(0)}" r="${(14 + caso() * 30).toFixed(0)}"/>`);
  const fiume = `<path class="fiume" d="M-60 ${H * .35} C ${W * .2} ${H * .15}, ${W * .3} ${H * .75}, ${W * .5} ${H * .55} S ${W * .8} ${H * .2}, ${W + 60} ${H * .45}"/>`;
  f.innerHTML = `
    <div class="f-luci"><i></i><i></i><i></i></div>
    <svg class="f-mappa" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${fiume}${strade.join('')}${piazze.join('')}</svg>
    <div class="f-motivo m-pagine"></div><div class="f-motivo m-horror"><i></i><i></i></div><div class="f-motivo m-roma"></div>
    <div class="f-motivo m-esoterismo"><i></i></div><div class="f-motivo m-lingue">${Array.from({ length: 26 }, (_, i) =>
      `<b style="--x:${(caso() * 100).toFixed(1)}%;--y:${(caso() * 100).toFixed(1)}%;--d:${(18 + caso() * 22).toFixed(1)}s;--r:${(-caso() * 30).toFixed(1)}s;--s:${(18 + caso() * 46).toFixed(0)}px">${'AБ中あعΩßÇŁ한אñØ文ЖλÉ'.split('')[i % 18]}</b>`).join('')}</div>
    <div class="f-motivo m-guide"></div>
    <div class="f-grana"></div><div class="f-vignetta"></div>`;
  document.body.prepend(f);

  // ---- il tema segue la fila al centro dello schermo
  const TEMI = [
    [/horror|brividi|gialli/i, 'horror'], [/roma/i, 'roma'], [/esoterismo|religione|mondi fantastici|miti|leggende/i, 'esoterismo'],
    [/lingue|dialetti|stranieri/i, 'lingue'], [/guide|corsi|tecnologia|sport|lavoro|musica e spett|fumetti|moda|collezion/i, 'guide'],
  ];
  const temaDi = t => (TEMI.find(([re]) => re.test(t)) || [, 'pagine'])[1];
  let corrente = '';
  const metti = t => { if (t !== corrente) { corrente = t; document.body.dataset.tema = t; } };
  metti('pagine');
  const osserva = new IntersectionObserver(es => {
    const vis = es.filter(e => e.isIntersecting).sort((a, b) => Math.abs(a.boundingClientRect.top - innerHeight * .4) - Math.abs(b.boundingClientRect.top - innerHeight * .4))[0];
    if (vis) metti(temaDi(vis.target.dataset.titolo || vis.target.textContent.slice(0, 60)));
  }, { rootMargin: '-35% 0px -45% 0px' });
  const aggancia = () => {
    document.querySelectorAll('#app .fila, #app .pagina h1').forEach(x => {
      if (x.dataset.fon) return;
      x.dataset.fon = 1;
      const h = x.querySelector && x.querySelector('h2');
      x.dataset.titolo = (h ? h.textContent : x.textContent || '').trim();
      osserva.observe(x);
    });
    if (!document.querySelector('#app .fila')) {   // pagine senza file: il tema dal titolo o dall'indirizzo
      metti(temaDi(decodeURIComponent(location.hash) + ' ' + ((document.querySelector('#app h1') || {}).textContent || '')));
    }
  };
  new MutationObserver(aggancia).observe(document.getElementById('app'), { childList: true });
  addEventListener('hashchange', () => setTimeout(aggancia, 60));
  aggancia();

  // ---- la mappa scorre piano con la pagina (parallasse)
  if (!fermo) {
    const m = f.querySelector('.f-mappa');
    let y = 0, target = 0;
    addEventListener('scroll', () => { target = scrollY; }, { passive: true });
    (function giro() { y += (target - y) * .08; m.style.transform = `translate3d(0, ${(-y * .06).toFixed(1)}px, 0) scale(1.08)`; requestAnimationFrame(giro); })();
  }
})();
