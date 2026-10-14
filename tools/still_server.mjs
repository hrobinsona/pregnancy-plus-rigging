// Persistent still renderer for search loops: one browser, one page, many poses.
//   node tools/still_server.mjs --char mum3q [--box x0,y0,x1,y1 --px 1200] [--hand-style JSON]   then one JSON line per still on stdin:
//   {"pose": {...pose json...}, "out": "out/x.png"}   → prints "ok" (or "err <message>") per line.
// Same picture as tools/char_still.mjs (engine/view.html, window.renderPose), ~20× faster per still: a fit that renders
// a few hundred candidate poses (tools/hand_place.py) doesn't pay a browser launch each time.
import { chromium } from 'playwright';
import { createInterface } from 'node:readline';
import { serve } from './serve.mjs';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const char = arg('char', 'mum3q'), px = +arg('px', 1200), boxA = arg('box') ? arg('box').split(',').map(Number) : null;
const box = boxA ? [[boxA[0], boxA[1]], [boxA[2], boxA[3]]] : null;
const [W, H] = box ? [px, Math.round(px * (box[1][1] - box[0][1]) / (box[1][0] - box[0][0]))] : [1080, 1920];
const { srv, base } = await serve();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const q = new URLSearchParams({ char, frame: box ? 'box' : 'still', ...(box ? { box: JSON.stringify(box), width: String(px) } : {}),
                                ...(arg('hand-style') ? { handStyle: arg('hand-style') } : {}) });   // --hand-style: hand drawing overrides to try (engine/hand.js HAND_STYLE_TRY)
await page.goto(`${base}/engine/view.html?${q}`);
await page.waitForFunction(() => window.__ready === true);
const rl = createInterface({ input: process.stdin });
for await (const line of rl) {
  if (!line.trim()) continue;
  try {
    const { pose, out } = JSON.parse(line);
    await page.evaluate((p) => window.renderPose(p), pose);
    await page.locator('#stage svg').screenshot({ path: out });
    process.stdout.write('ok\n');
  } catch (e) { process.stdout.write(`err ${String(e.message).split('\n')[0]}\n`); }
}
await browser.close(); srv.close();
