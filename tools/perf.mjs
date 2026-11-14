// Measure smoothness: frame times while idle on the hero and while scrolling the whole home page.
// node tools/perf.mjs [port]
import { chromium } from '../../src/node_modules/playwright/index.mjs';
const port = process.argv[2] || '4183', css = process.argv[3] || '', q = process.argv[4] || '';
const b = await chromium.launch({ headless: true, executablePath: process.env.CHROME, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(`http://localhost:${port}/${q}`); await p.waitForFunction(() => window.__hero, null, { timeout: 60000 }); if (css) await p.addStyleTag({ content: css }); await p.waitForTimeout(2500);
const measure = (scroll) => p.evaluate(async (scroll) => {
  const times = []; let last = performance.now(), y = 0;
  const H = document.documentElement.scrollHeight - innerHeight;
  await new Promise(res => {
    const f = (t) => { times.push(t - last); last = t;
      if (scroll) { y += 22; scrollTo(0, y); if (y >= H) return res(); }
      else if (times.length > 180) return res();
      requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
  times.shift(); times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  return { frames: times.length, avg: +avg.toFixed(1), p95: +times[Math.floor(times.length * .95)].toFixed(1), janky: times.filter(t => t > 25).length };
}, scroll);
const idle = await measure(false);
await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(500);
const scroll = await measure(true);
console.log(JSON.stringify({ idle, scroll }));
await b.close();
