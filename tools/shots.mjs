// Screenshot v5 pages: node tools/shots.mjs [tag] — writes previews/*.png and prints errors/overflow.
import { chromium } from '../../src/node_modules/playwright/index.mjs';
const b = await chromium.launch({ headless: true, executablePath: process.env.CHROME, args: ['--use-angle=d3d11','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required'] });
const errs = [];
const plan = JSON.parse(process.argv[2] || '[]');
for (const s of plan) {
  const p = await b.newPage({ viewport: { width: s.w || 1440, height: s.h || 900 } });
  p.on('pageerror', e => errs.push(s.tag + ': ' + e.message)); p.on('console', m => m.type() === 'error' && errs.push(s.tag + ': ' + m.text()));
  if (s.theme) await p.addInitScript(t => localStorage.setItem('vimaksh-theme', t), s.theme);
  await p.goto('http://localhost:4185' + (s.path || '/'), { timeout: 60000 });
  if ((s.path || '/') === '/') await p.waitForFunction(() => window.__hero || document.querySelector('.no-gl'), null, { timeout: 60000 });
  await p.waitForTimeout(1500);
  if (s.sel) await p.evaluate(sel => document.querySelector(sel).scrollIntoView({ behavior: 'instant', block: 'start' }), s.sel);
  if (s.y != null) await p.evaluate(y => scrollTo(0, y < 0 ? document.documentElement.scrollHeight : y), s.y);
  if (s.click) { await p.click(s.click); }
  await p.waitForTimeout(s.wait || 1600);
  await p.evaluate(() => document.querySelectorAll('.rv').forEach(e => e.classList.add('in')));
  await p.waitForTimeout(400);
  await p.screenshot({ path: `previews/${s.tag}.png` });
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (ov > 0) errs.push(s.tag + ': horizontal overflow ' + ov);
  await p.close();
}
console.log(errs.length ? errs.join('\n') : 'no errors');
await b.close();
