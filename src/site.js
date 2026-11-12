// Page behaviour shared by home and project pages: waves, the right-edge rail (theme + active item),
// the compact wordmark/header after the hero, and work-image hover frames.
import { initWaves } from './waves.js';

initWaves();

const rail = document.querySelector('.rail');
const bar = document.querySelector('.bar');
const mini = document.querySelector('.mini');
const hero = document.getElementById('hero');
const sections = [...document.querySelectorAll('[data-theme]')];
const navLinks = [...document.querySelectorAll('.rail a, .bar nav a')];

// Rail colour follows the section behind its centre; the active item follows the section in view.
function themeAt(y) {
  for (const s of sections) { const r = s.getBoundingClientRect(); if (r.top <= y && r.bottom > y) return s; }
  return null;
}
let lastScroll = scrollY, upward = false;
function update() {
  const vh = innerHeight;
  const under = themeAt(vh / 2);
  const theme = under ? under.dataset.theme : 'light';
  if (rail) rail.dataset.on = theme;
  const top = themeAt(48);
  const barTheme = top ? top.dataset.theme : 'light';
  if (bar) bar.dataset.on = barTheme;
  if (mini) mini.dataset.on = barTheme;
  const nav = under?.dataset.nav || '';
  navLinks.forEach(a => { if (a.dataset.nav && a.dataset.nav === nav) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
  const pastHero = !hero || hero.getBoundingClientRect().bottom < 64;
  document.body.classList.toggle('past-hero', pastHero);
  upward = scrollY < lastScroll - 2 ? true : scrollY > lastScroll + 2 ? false : upward;
  lastScroll = scrollY;
  document.body.classList.toggle('scroll-up', upward && pastHero);
}
let queued = false;
addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; update(); }); } }, { passive: true });
addEventListener('resize', update);
document.addEventListener('focusin', e => { if (mini && mini.contains(e.target)) document.body.classList.add('scroll-up'); });
update();

// Work entries: one principal link; the frame contours appear in the gutter under the image on hover/focus.
document.querySelectorAll('.entry').forEach(entry => {
  const on = () => entry.classList.add('is-active'), off = () => entry.classList.remove('is-active');
  entry.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') on(); });
  entry.addEventListener('pointerleave', off);
  entry.addEventListener('focusin', on); entry.addEventListener('focusout', off);
});
