// Renders public/icons/icon.svg into the PNG sizes phones need.
// Usage: npm run icons   (needs Playwright + Chromium available)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(require('node:child_process').execSync('npm root -g').toString().trim() + '/playwright')); }
import { readFileSync } from 'node:fs';

const svg = readFileSync(new URL('../public/icons/icon.svg', import.meta.url), 'utf8');
const out = (f) => new URL('../public/icons/' + f, import.meta.url).pathname;

const browser = await chromium.launch();
const page = await browser.newPage();
async function render(file, size, { maskable = false } = {}) {
  await page.setViewportSize({ width: size, height: size });
  // Maskable icons get a full-bleed background and the logo inside the 80% safe zone.
  const inner = maskable ? Math.round(size * 0.8) : size;
  const bg = maskable ? 'linear-gradient(135deg,#6366f1,#0ea5e9)' : 'transparent';
  await page.setContent(`<html><body style="margin:0;width:${size}px;height:${size}px;display:grid;place-items:center;background:${bg}">
    <img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="${inner}" height="${inner}"></body></html>`);
  await page.screenshot({ path: out(file), omitBackground: !maskable });
}
await render('icon-192.png', 192);
await render('icon-512.png', 512);
await render('maskable-512.png', 512, { maskable: true });
await render('apple-touch-icon.png', 180, { maskable: true }); // iOS wants an opaque square
await browser.close();
console.log('Icons written to public/icons/');
