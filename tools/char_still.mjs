// Render a character pose to PNG.  node tools/char_still.mjs --char mum2 [--pose stand] [--frame ref|still] [--sil] [--out file]
import { chromium } from 'playwright';
import { serve } from './serve.mjs';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes('--' + k);
export async function charStill({ char = 'mum2', pose, frame = 'still', sil = false, out, bg, ground, size } = {}) {
  const { srv, base } = await serve();
  const browser = await chromium.launch();
  const C = (await import(`../characters/${char}/character.js`)).default;
  const [W, H] = frame === 'ref' ? C.ref.sizePx : (size || [1080, 1920]);
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const q = new URLSearchParams({ char, frame, ...(pose ? { pose } : {}), ...(sil ? { sil: '1' } : {}), ...(bg ? { bg } : {}), ...(ground ? { ground } : {}) });
  await page.goto(`${base}/engine/view.html?${q}`);
  await page.waitForFunction(() => window.__ready === true);
  await page.locator('#stage svg').screenshot({ path: out });
  await browser.close(); srv.close();
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const out = arg('out', `out/${arg('char', 'mum2')}_${arg('pose', 'rest')}_${arg('frame', 'still')}${flag('sil') ? '_sil' : ''}.png`);
  await charStill({ char: arg('char', 'mum2'), pose: arg('pose'), frame: arg('frame', 'still'), sil: flag('sil'), out, bg: arg('bg'), ground: arg('ground') });
  console.log('wrote', out);
}
