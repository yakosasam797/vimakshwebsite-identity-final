// Render the four service images (3D mark, one colourway each) in light and dark, as still product shots.
// Needs the dev server: npx vite --port 4190   then: node tools/render_marks.mjs
import { chromium } from '../../src/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';
const S = {
  brand:    { main: 'FF5E55', accent: 'E42114', angle: -25, light: ['F3E5DF', 'F6EAE5'], dark: ['22121A', '27151D'] },
  digital:  { main: '2D36FF', accent: 'FF5E55', angle: -8,  light: ['E2E6F6', 'E8EBF8'], dark: ['0E1034', '12153D'] },
  product:  { main: '1C1D2E', accent: 'E42114', angle: -40, light: ['EAE7E0', 'EFECE6'], dark: null, darkMain: 'E8E9F6' },
  research: { main: '7C8DFF', accent: '1A18FF', angle: 6,   light: ['E8E9F0', 'EEEFF4'], dark: ['121428', '161830'] },
};
S.product.dark = ['13141F', '181926'];
mkdirSync('public/services', { recursive: true });
const b = await chromium.launch({ headless: true, executablePath: process.env.CHROME, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
for (const [name, s] of Object.entries(S)) for (const mode of ['light', 'dark']) {
  const p = await b.newPage({ viewport: { width: 1200, height: 960 }, deviceScaleFactor: 1 });
  const [bg, floor] = s[mode];
  const main = mode === 'dark' && s.darkMain ? s.darkMain : s.main;
  await p.goto(`http://localhost:4190/render-marks.html?bg=${bg}&floor=${floor}&main=${main}&accent=${s.accent}&angle=${s.angle}&dark=${mode === 'dark' ? 1 : 0}&fill=.66`);
  await p.waitForFunction(() => window.__done, null, { timeout: 60000 });
  await p.screenshot({ path: `public/services/${name}-${mode}.jpg`, type: 'jpeg', quality: 88 });
  await p.close(); console.log(name, mode);
}
await b.close();
