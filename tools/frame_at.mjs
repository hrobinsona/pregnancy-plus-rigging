// Render single animation frames to PNG (review aid). Optional --mods JSON overrides spec fields to isolate a layer.
// usage: node tools/frame_at.mjs --anim idle-seated --t 0,2.5 --out out/x_%t.png [--mods '{"drift":{"amp":0}}']
import { chromium } from 'playwright';
import { serve } from './serve.mjs';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const { srv, base } = await serve();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
const q = new URLSearchParams({ anim: arg('anim', 'idle-seated'), ...(arg('mods') ? { mods: arg('mods') } : {}) });
await page.goto(`${base}/characters/mum/anim.html?${q}`);
await page.waitForFunction(() => window.__ready === true);
for (const t of arg('t', '0').split(',').map(Number)) {
  await page.evaluate((tt) => window.renderAt(tt), t);
  const out = arg('out', 'out/frame_%t.png').replace('%t', t.toFixed(3));
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
  console.log('wrote', out);
}
await browser.close(); srv.close();
