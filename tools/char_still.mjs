// Render a character pose to PNG.  node tools/char_still.mjs --char mum2 [--pose stand] [--frame ref|still] [--sil] [--out file]
//   detail zoom: --box x0,y0,x1,y1 (H units, y up is negative) [--px 1200]  → renders just that region, sharp
import { chromium } from 'playwright';
import { serve } from './serve.mjs';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes('--' + k);
export async function charStill({ char = 'mum2', pose, frame = 'still', sil = false, out, bg, ground, size, box, px = 1200 } = {}) {
  const { srv, base } = await serve();
  const browser = await chromium.launch();
  const C = (await import(`../characters/${char}/character.js`)).default;
  if (box) frame = 'box';
  const [W, H] = frame === 'ref' ? C.ref.sizePx : frame === 'box' ? [px, Math.round(px * (box[1][1] - box[0][1]) / (box[1][0] - box[0][0]))] : (size || [1080, 1920]);
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const q = new URLSearchParams({ char, frame, ...(pose ? { pose } : {}), ...(sil ? { sil: '1' } : {}), ...(bg ? { bg } : {}), ...(ground ? { ground } : {}), ...(box ? { box: JSON.stringify(box), width: String(px) } : {}) });
  await page.goto(`${base}/engine/view.html?${q}`);
  await page.waitForFunction(() => window.__ready === true);
  await page.locator('#stage svg').screenshot({ path: out });
  await browser.close(); srv.close();
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const out = arg('out', `out/${arg('char', 'mum2')}_${arg('pose', 'rest')}_${arg('frame', 'still')}${flag('sil') ? '_sil' : ''}.png`);
  await charStill({ char: arg('char', 'mum2'), pose: arg('pose'), frame: arg('frame', 'still'), sil: flag('sil'), out, bg: arg('bg'), ground: arg('ground'),
    box: arg('box') ? ((v) => [[v[0], v[1]], [v[2], v[3]]])(arg('box').split(',').map(Number)) : undefined, px: +arg('px', 1200) });
  console.log('wrote', out);
}
