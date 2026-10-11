// Render a pose to PNG with Playwright.
// usage: node tools/still.mjs [--pose rest] [--frame still|ref] [--out out/mum_rest.png] [--bones '{"shin.near":30}'] [--sil]
import { chromium } from 'playwright';
import { serve } from './serve.mjs';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes('--' + k);

export async function renderStill({ pose = 'rest', frame = 'still', out, bones, sil = false, facing } = {}, shared) {
  const own = !shared;
  const { srv, base } = shared?.server || await serve();
  const browser = shared?.browser || await chromium.launch();
  const W = frame === 'ref' ? 1254 : 1080, H = frame === 'ref' ? 1254 : 1920;
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const q = new URLSearchParams({ pose, frame, ...(bones ? { bones } : {}), ...(sil ? { sil: '1' } : {}), ...(facing ? { facing } : {}) });
  await page.goto(`${base}/characters/mum/sheet.html?${q}`);
  await page.waitForFunction(() => window.__ready === true);
  const joints = await page.evaluate(() => window.jointWorld());
  const buf = await page.locator('#stage svg').screenshot({ path: out, animations: 'disabled' });
  await page.close();
  if (own) { await browser.close(); srv.close(); }
  return { buf, joints };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = arg('out', 'out/mum_rest.png');
  await renderStill({ pose: arg('pose', 'rest'), frame: arg('frame', 'still'), out, bones: arg('bones'), sil: flag('sil'), facing: arg('facing') });
  console.log('wrote', out);
}
