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

// ---------- Menu ----------
const menu = $('#menu'), menuBtn = $('[data-menu-btn]');
const setMenu = (open) => {
  if (!menu) return;
  if (open) { menu.hidden = false; requestAnimationFrame(() => menu.classList.add('open')); }
  else { menu.classList.remove('open'); setTimeout(() => { if (!menu.classList.contains('open')) menu.hidden = true; }, 700); }
  menuBtn.setAttribute('aria-expanded', String(open)); menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  document.body.classList.toggle('menu-open', open);
  $$('.menu-links a').forEach((a, i) => { a.style.transitionDelay = open ? 120 + i * 35 + 'ms' : '0ms'; });
  $$('video', menu).forEach(v => open ? v.play().catch(() => {}) : v.pause());
  if (open) setTimeout(() => $('.menu-links a')?.focus({ preventScroll: true }), 350); else menuBtn.focus({ preventScroll: true });
};
menuBtn?.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
addEventListener('keydown', e => { if (e.key === 'Escape' && menu?.classList.contains('open')) setMenu(false); });
$$('.menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));

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

// ---------- Contact: the brief drops open; sending composes an email (there is no form backend) ----------
const briefBtn = $('[data-brief]');
briefBtn?.addEventListener('click', () => {
  const open = briefBtn.getAttribute('aria-expanded') !== 'true';
  briefBtn.setAttribute('aria-expanded', String(open)); briefBtn.closest('.brief').classList.toggle('open', open);
  if (open) setTimeout(() => $('[data-brief-form] input')?.focus({ preventScroll: true }), 400);
});
$('[data-brief-form]')?.addEventListener('submit', e => {
  e.preventDefault();
  const f = e.currentTarget, note = $('[data-brief-note]');
  if (!f.reportValidity()) return;
  const d = new FormData(f), needs = d.getAll('need').join(', ') || 'Not specified';
  const body = `Name: ${d.get('name')}\nEmail: ${d.get('email')}\nCompany: ${d.get('company') || '-'}\nNeeds: ${needs}\n\n${d.get('message')}`;
  location.href = `mailto:hq@vimaksh.in?subject=${encodeURIComponent('Project brief — ' + d.get('name'))}&body=${encodeURIComponent(body)}`;
  if (note) note.textContent = 'Your email app should open with the brief. If not, write to hq@vimaksh.in.';
});

// ---------- Work videos: play only while on screen ----------
const vio = new IntersectionObserver(es => es.forEach(e => { const v = e.target; if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }), { threshold: .2 });
$$('.card video').forEach(v => { v.playbackRate = reduced ? .7 : 1; vio.observe(v); });

// ---------- Pixel graphics (with the heat gradient, the brand's two graphic elements) ----------
import { pixelEdge, portrait, bot, skyline, desk, field } from './pixelart.js';
const cssVar = n => getComputedStyle(html).getPropertyValue(n).trim();
const drawEdges = () => $$('canvas.edge').forEach((c, i) => pixelEdge(c, { color: c.dataset.edge === 'night' ? '#0D0E1C' : cssVar('--paper'), seed: 3 + i }));
drawEdges();
addEventListener('themechange', () => setTimeout(drawEdges, 30));
let rz = 0; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(drawEdges, 150); });
$$('canvas.px').forEach(c => {
  const k = c.dataset.px;
  if (k === 'portrait') portrait(c, +c.dataset.seed);
  else if (k === 'gpt' || k === 'claude') bot(c, k);
  else if (k === 'skyline') skyline(c);
  else if (k === 'desk') desk(c);
  else if (k === 'field') field(c, 5);
});

// ---------- Scroll: hero recedes as work rises over it; footer drifts up into place; header reads its background ----------
const hero = $('.hero'), foot = $('.foot'), hdr = $('.hdr');
const onScroll = () => {
  const vh = innerHeight;
  if (hero) hero.style.setProperty('--p', Math.min(1, Math.max(0, scrollY / vh)).toFixed(3));
  if (foot) { const r = foot.getBoundingClientRect(); foot.style.setProperty('--fp', Math.min(1, Math.max(0, (vh - r.top) / Math.min(vh, r.height))).toFixed(3)); }
  if (hdr && foot) { const r = foot.getBoundingClientRect(); hdr.classList.toggle('on-dark', r.top < 60 && r.bottom > 60 && !document.body.classList.contains('menu-open')); }
  hdr?.classList.toggle('tuck', scrollY > vh * .6 && innerWidth < 760);
  // The navigation stack folds to just its menu box once you scroll, and turns light over the dark footer.
  document.body.classList.toggle('nav-compact', scrollY > vh * .3);
  if (foot) document.body.classList.toggle('nav-dark', foot.getBoundingClientRect().top < vh - 40 && !document.body.classList.contains('menu-open'));
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
const rv = $$('.sec-head, .card, .statement > *, .srow, .svc-text, .svc-art, .split > *, .nums > div, .pgrid article, .person, .band > *, .foot-top > *, .cols > div');
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px' });
rv.forEach((el, i) => { el.classList.add('rv'); el.style.transitionDelay = (i % 3) * 80 + 'ms'; io.observe(el); });

// ---------- Home hero: the pixel surface with the mark built from it (loaded only where there is a stage) ----------
const stage = $('#stage');
if (stage) import('./pixelhero.js').then(async m => { if (!(await m.startPixelHero(stage, { reduced }))) hero.classList.add('no-gl'); }).catch(e => { console.error(e); hero.classList.add('no-gl'); });
