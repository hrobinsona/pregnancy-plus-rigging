// Hand model sheet: every hand-library pose on both hands, zoomed, with the reference's hands as column 0.
// node tools/hand_sheet.mjs --char mum2 [--out out/mum2_hands.png]
import fs from 'node:fs';
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { serve } from './serve.mjs';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const char = arg('char', 'mum2'), out = arg('out', `out/${char}_hands.png`);
const C = (await import(`../characters/${char}/character.js`)).default;
const { srv, base } = await serve();
const browser = await chromium.launch();
const [W, H] = C.ref.sizePx;
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
const tmp = 'out/tmp_hands'; fs.mkdirSync(tmp, { recursive: true });
const shots = [];
for (const h of C.handLibrary) {
  const pose = { hands: { near: h, far: h } };
  await page.goto(`${base}/engine/view.html?${new URLSearchParams({ char, frame: 'ref', inline: JSON.stringify(pose) })}`);
  await page.waitForFunction(() => window.__ready === true);
  const p = `${tmp}/${h}.png`; await page.locator('#stage svg').screenshot({ path: p }); shots.push([h, p]);
}
await browser.close(); srv.close();
const toPx = (j) => [(C.joints[j][0] * C.ref.Hpx + C.ref.groundPx[0]), (C.joints[j][1] * C.ref.Hpx + C.ref.groundPx[1])];
fs.writeFileSync(`${tmp}/meta.json`, JSON.stringify({ shots, wrists: { near: toPx('wristNear'), far: toPx('wristFar') }, ref: `characters/${char}/${C.ref.image}`, out }));
execFileSync('python3', ['-c', `
import json
from PIL import Image, ImageDraw, ImageFont
m=json.load(open('${tmp}/meta.json')); F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',22)
R=Image.open(m['ref']).convert('RGB'); T=330
def crop(im, c, s):  # box centred below the wrist
    x,y=c[0]*s, c[1]*s; b=(int(x-T*s*0.5), int(y-T*s*0.15), int(x+T*s*0.5), int(y+T*s*0.95)); return im.crop(b).resize((300,330))
cols=[('reference', R, 1)]+[(n, Image.open(p).convert('RGB'), 2) for n,p in m['shots']]
sheet=Image.new('RGB',(300*len(cols), 34+330*2),'white'); d=ImageDraw.Draw(sheet)
for i,(n,im,s) in enumerate(cols):
    d.text((i*300+8,6),n,fill='#111',font=F)
    for r,side in enumerate(['near','far']): sheet.paste(crop(im, m['wrists'][side], s), (i*300, 34+r*330))
sheet.save(m['out']); print('wrote', m['out'])
`], { stdio: 'inherit' });
