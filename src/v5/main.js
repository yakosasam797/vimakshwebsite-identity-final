// Vimaksh v5: one script for every page.
const reduced = matchMedia('(prefers-reduced-motion:reduce)').matches;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const html = document.documentElement;

// ---------- Theme switch ----------
const toggle = $('[data-toggle-theme]');
const syncToggle = () => toggle?.setAttribute('aria-label', html.dataset.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
syncToggle();
toggle?.addEventListener('click', () => {
  html.classList.add('theme-anim');
  html.dataset.theme = html.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('vimaksh-theme', html.dataset.theme); } catch (e) {}
  $('meta[name=theme-color]')?.setAttribute('content', html.dataset.theme === 'dark' ? '#0F1020' : '#F4F2EE');
  syncToggle(); dispatchEvent(new Event('themechange'));
  setTimeout(() => html.classList.remove('theme-anim'), 700);
});

// ---------- Navigation stack: the menu box unfolds the four links above it (no separate menu page) ----------
const menuBtn = $('[data-menu-btn]'), navbox = $('[data-navbox]');
const setNav = open => {
  document.body.classList.toggle('nav-open', open);
  menuBtn?.setAttribute('aria-expanded', String(open));
  menuBtn?.setAttribute('aria-label', open ? 'Hide navigation' : 'Show navigation');
  $$('a', navbox).forEach((a, i, all) => { a.style.transitionDelay = open ? (all.length - 1 - i) * 45 + 'ms' : '0ms'; });
};
menuBtn?.addEventListener('click', () => setNav(!document.body.classList.contains('nav-open')));
$$('a', navbox).forEach(a => a.addEventListener('click', () => setNav(false)));
addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('nav-open')) { setNav(false); menuBtn?.focus(); } });
addEventListener('pointerdown', e => { if (document.body.classList.contains('nav-open') && !navbox?.contains(e.target)) setNav(false); });

// ---------- Copy to clipboard, with a label that follows the pointer ----------
const tip = $('.tip');
let tipTimer = 0;
const showTip = (text, x, y) => { if (!tip) return; tip.textContent = text; tip.style.left = x + 'px'; tip.style.top = y + 'px'; tip.classList.add('on'); };
$$('[data-copy]').forEach(el => {
  el.addEventListener('pointerenter', e => showTip('Copy', e.clientX, e.clientY));
  el.addEventListener('pointermove', e => { if (tip) { tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY + 'px'; } });
  el.addEventListener('pointerleave', () => tip?.classList.remove('on'));
  el.addEventListener('click', async e => {
    const value = el.dataset.copy;
    let ok = false;
    try { await navigator.clipboard.writeText(value); ok = true; } catch (err) {
      const ta = document.createElement('textarea'); ta.value = value; document.body.append(ta); ta.select(); ok = document.execCommand('copy'); ta.remove();
    }
    const r = el.getBoundingClientRect();
    showTip(ok ? 'Copied ✓' : 'Copy failed', e.clientX || r.left + r.width / 2, e.clientY || r.top);
    clearTimeout(tipTimer); tipTimer = setTimeout(() => tip?.classList.remove('on'), 1300);
  });
});

// ---------- Let's talk: the brief drops open; sending composes an email (there is no form backend) ----------
const briefBtn = $('[data-brief]');
briefBtn?.addEventListener('click', () => {
  const open = briefBtn.getAttribute('aria-expanded') !== 'true';
  briefBtn.setAttribute('aria-expanded', String(open)); briefBtn.closest('.brief').classList.toggle('open', open);
  if (open) setTimeout(() => $('[data-brief-form] input')?.focus({ preventScroll: true }), 400);
});
$$('[data-brief-form]').forEach(form => form.addEventListener('submit', e => {
  e.preventDefault();
  const f = e.currentTarget, note = $('[data-brief-note]', f);
  if (!f.reportValidity()) return;
  const d = new FormData(f), needs = d.getAll('need').join(', ') || 'Not specified';
  const body = `Name: ${d.get('name')}\nEmail: ${d.get('email')}\nCompany: ${d.get('company') || '-'}\nNeeds: ${needs}\n\n${d.get('message')}`;
  location.href = `mailto:hq@vimaksh.in?subject=${encodeURIComponent('Project brief — ' + d.get('name'))}&body=${encodeURIComponent(body)}`;
  if (note) note.textContent = 'Your email app should open with the brief. If not, write to hq@vimaksh.in.';
}));

// ---------- Work videos: play only while on screen ----------
const vio = new IntersectionObserver(es => es.forEach(e => { const v = e.target; if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }), { threshold: .2 });
$$('.card video').forEach(v => { v.playbackRate = reduced ? .7 : 1; vio.observe(v); });

// ---------- Pixel graphics (with the heat gradient, the brand's two graphic elements) ----------
import { pixelEdge, portrait, bot, skyline, desk, field } from './pixelart.js';
import { pixelMask, saas } from './pixelsaas.js';
const cssVar = n => getComputedStyle(html).getPropertyValue(n).trim();
const drawEdges = () => {
  $$('canvas.edge').forEach((c, i) => pixelEdge(c, { color: c.dataset.edge === 'night' ? '#0D0E1C' : cssVar('--paper'), seed: 3 + i }));
  // Footer gradient: its top edge breaks into squares through a mask, so the dark footer itself shows between them.
  $$('[data-pixel-mask]').forEach(el => {
    const cell = innerWidth < 760 ? 10 : 14, m = pixelMask(el.clientWidth, { cell, seed: 7 });
    const v = `url(${m.url}) 0 0 / ${m.w}px ${m.h}px no-repeat, linear-gradient(#000, #000) 0 ${m.h}px / 100% calc(100% - ${m.h}px) no-repeat`;
    el.style.webkitMask = v; el.style.mask = v; el.style.setProperty('--edge-h', m.h + 'px');
  });
};
drawEdges();
let rzW = innerWidth, rz = 0;
addEventListener('resize', () => { if (innerWidth === rzW) return; rzW = innerWidth; clearTimeout(rz); rz = setTimeout(drawEdges, 150); });
// What we build: one pixel graphic per kind of software, in its own colour; redrawn for the theme.
const drawSaas = () => $$('canvas[data-px=saas]').forEach(c => saas(c, c.dataset.kind, c.dataset.c));
drawSaas();
addEventListener('themechange', () => setTimeout(() => { drawEdges(); drawSaas(); }, 30));
$$('canvas.px').forEach(c => {
  const k = c.dataset.px;
  if (k === 'portrait') portrait(c, +c.dataset.seed);
  else if (k === 'gpt' || k === 'claude') bot(c, k);
  else if (k === 'skyline') skyline(c);
  else if (k === 'desk') desk(c);
  else if (k === 'field') field(c, 5);
});

// ---------- Scroll: hero recedes as work rises over it; footer drifts up into place; header reads its background ----------
const hero = $('.hero'), foot = $('.foot'), hdr = $('.hdr'), isHome = html.dataset.page === 'home';
let lastY = scrollY;
const onScroll = () => {
  const vh = innerHeight;
  if (hero) hero.style.setProperty('--p', Math.min(1, Math.max(0, scrollY / vh)).toFixed(3));
  if (foot) { const r = foot.getBoundingClientRect(); foot.style.setProperty('--fp', Math.min(1, Math.max(0, (vh - r.top) / Math.min(vh, r.height))).toFixed(3)); }
  if (hdr && foot) { const r = foot.getBoundingClientRect(); hdr.classList.toggle('on-dark', r.top < 60 && r.bottom > 60); }
  // Header: clear at the top of the page; once you scroll it gets its own backing so it never sits on top of
  // content, slides away while you read down, and comes back as soon as you scroll up.
  if (hdr) {
    const y = scrollY, dy = y - lastY;
    hdr.classList.toggle('solid', y > 24);
    if (Math.abs(dy) > 6) { hdr.classList.toggle('hide', dy > 0 && y > 140); lastY = y; }
    if (y < 24) { hdr.classList.remove('hide'); lastY = y; }
  }
  // The navigation stack folds to just its menu box once you scroll, and turns light over the dark footer.
  // Only the home hero shows the full stack; every other page shows just the menu box.
  document.body.classList.toggle('nav-compact', !isHome || innerWidth < 760 || scrollY > vh * .3);
  if (foot) document.body.classList.toggle('nav-dark', foot.getBoundingClientRect().top < vh - 40);
};
// perf: at most one update per frame, however many scroll events arrive.
let scrollQueued = false;
const queueScroll = () => { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(() => { scrollQueued = false; onScroll(); }); } };
addEventListener('scroll', queueScroll, { passive: true }); addEventListener('resize', queueScroll); onScroll();

// ---------- Live Bengaluru clock ----------
const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const tick = () => { const s = fmt.format(new Date()); $$('[data-clock]').forEach(c => { c.textContent = s; }); };
tick(); setInterval(tick, 1000);
$$('[data-year]').forEach(n => { n.textContent = new Date().getFullYear(); });

// ---------- Footer mark: the six arrows fly in and lock together; the red one last ----------
(() => {
  const host = $('.fmark'); if (!host) return;
  const svg = $('svg', host), paths = $$('path', svg), C = { x: 290, y: 290 };
  const order = paths.map(p => ({ p, red: /E32112/i.test(p.getAttribute('fill')) })).sort((a, b) => a.red - b.red);
  let running = [];
  const play = () => {
    running.forEach(a => a.cancel()); running = []; host.classList.add('played');
    order.forEach(({ p, red }, k) => {
      const b = p.getBBox(), dx = b.x + b.width / 2 - C.x, dy = b.y + b.height / 2 - C.y, len = Math.hypot(dx, dy) || 1;
      running.push(p.animate([
        { opacity: 0, transform: `translate(${dx / len * 80}px, ${dy / len * 80}px) rotate(${k % 2 ? -60 : 60}deg) scale(.55)` },
        { opacity: 1, offset: .6 }, { opacity: 1, transform: 'none' },
      ], { duration: red ? 820 : 640, delay: k * 85, easing: red ? 'cubic-bezier(.34,1.56,.64,1)' : 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }));
    });
  };
  new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) play(); }), { threshold: .6 }).observe(host);
  host.addEventListener('mouseenter', play);
})();

// ---------- Gentle reveal ----------
const rv = $$('.sec-head, .card, .about-home > *, .build-head > *, .split > *, .nums > div, .pgrid article, .person, .band > *, .foot-top > *, .cols > div');
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px' });
rv.forEach((el, i) => { el.classList.add('rv'); el.style.transitionDelay = (i % 3) * 80 + 'ms'; io.observe(el); });

// ---------- What we build: an endless sideways track that drifts slowly on its own ----------
// The cards are repeated once so the drift loops without a seam. It pauses while you hover, touch or use
// the arrows, then picks up again; with reduced motion it stays still and works as a plain scroller.
(() => {
  const track = $('[data-track]'); if (!track) return;
  const bar = $('[data-track-bar]'), prev = $('[data-track-prev]'), next = $('[data-track-next]');
  const originals = $$('.bcard', track);
  originals.forEach(c => { const k = c.cloneNode(true); k.setAttribute('aria-hidden', 'true'); track.append(k); });
  drawSaas();
  const gap = () => parseFloat(getComputedStyle(track).columnGap) || 0;
  const stepW = () => originals[0].getBoundingClientRect().width + gap();
  const setW = () => originals.length * stepW();
  const SPEED = 28;                                   // px per second: slow enough to read while it moves
  let pos = 0, paused = 0, hold = false, last = performance.now(), onScreen = false;
  const sync = () => {
    const w = setW(), p = (((track.scrollLeft % w) + w) % w) / w, vis = Math.min(1, track.clientWidth / w);
    if (bar) { bar.style.width = (vis * 100).toFixed(2) + '%'; bar.style.transform = `translateX(${(p / vis * 100).toFixed(2)}%)`; }
  };
  const pauseFor = ms => { paused = performance.now() + ms; };
  const jump = dir => {
    pauseFor(2600);
    if (dir < 0 && track.scrollLeft < stepW()) track.scrollLeft += setW();
    if (dir > 0 && track.scrollLeft >= setW()) track.scrollLeft -= setW();
    track.scrollBy({ left: dir * stepW(), behavior: reduced ? 'auto' : 'smooth' });
  };
  prev?.addEventListener('click', () => jump(-1));
  next?.addEventListener('click', () => jump(1));
  track.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hold = true; });
  track.addEventListener('pointerleave', () => { hold = false; pauseFor(500); });
  track.addEventListener('touchstart', () => pauseFor(4000), { passive: true });
  track.addEventListener('wheel', () => pauseFor(2500), { passive: true });
  track.addEventListener('focusin', () => { hold = true; });
  track.addEventListener('focusout', () => { hold = false; });
  track.addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true });
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }).observe(track);
  const tick = now => {
    requestAnimationFrame(tick);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (reduced || hold || !onScreen || document.hidden || now < paused) { pos = track.scrollLeft; return; }
    const w = setW();
    pos += SPEED * dt; if (pos >= w) pos -= w;
    track.scrollLeft = pos;
  };
  if (!reduced) track.classList.add('track--auto');
  requestAnimationFrame(tick);
  addEventListener('resize', sync); sync();
})();

// ---------- Home hero: the pixel surface with the mark built from it (loaded only where there is a stage) ----------
const stage = $('#stage');
if (stage) import('./pixelhero.js').then(async m => { if (!(await m.startPixelHero(stage, { reduced }))) hero.classList.add('no-gl'); }).catch(e => { console.error(e); hero.classList.add('no-gl'); });
