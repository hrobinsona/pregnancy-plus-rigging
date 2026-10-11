// Tests: (1) determinism — render rest twice, identical PNG hashes (and identical SVG strings)
//        (2) topology — every part's anchor count constant across poses / variants / lattice deformation
//        (3) joints — rotate every bone to min and max; the joint disc (radius = bone.cap) must have no background pixels
import crypto from 'node:crypto';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { serve } from '../../../tools/serve.mjs';
import { build, toSVG, jointWorld } from '../rig.js';
import { BONES } from '../skeleton.js';
import { H } from '../proportions.js';
import * as hands from '../parts/hands.js';

const rest = JSON.parse(fs.readFileSync(new URL('../poses/rest.json', import.meta.url)));
let failures = 0;
const ok = (cond, msg) => { console.log((cond ? '  ok   ' : '  FAIL ') + msg); if (!cond) failures++; };
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex').slice(0, 16);

// ---------- (2) topology (pure, no browser)
console.log('topology');
const counts = (pose) => Object.fromEntries(build(pose).map((p) => [p.id, p.anchors]));
const base = counts(rest);
const variants = [
  { ...rest, expression: 'neutral' },
  { ...rest, lattice: { belly: [0, 1, 2, 3].map((j) => [0, 1, 2, 3].map((i) => [((i * 7 + j * 3) % 5 - 2) * 0.01, ((i * 3 + j * 5) % 5 - 2) * 0.01])) } },
  ...BONES.flatMap((b) => [{ ...rest, bones: { [b.id]: b.min } }, { ...rest, bones: { [b.id]: b.max } }]),
  { ...rest, facing: 'left' },
];
let topoOK = true;
for (const v of variants) {
  const c = counts(v);
  for (const [id, n] of Object.entries(base)) if (c[id] !== n) { topoOK = false; console.log(`    ${id}: ${n} -> ${c[id]}`); }
  if (Object.keys(c).length !== Object.keys(base).length) topoOK = false;
}
ok(topoOK, `${Object.keys(base).length} parts keep their anchor counts across ${variants.length} poses/variants`);
const handShapes = Object.entries(rest.hands).length;
ok(base['mum.hand.near'] === 18 && base['mum.hand.far'] === 18, `hand shapes share 18 anchors (${handShapes} hands)`);

// ---------- browser tests
const { srv, base: url } = await serve();
const browser = await chromium.launch();
async function shot(q, w = 1254, h = 1254, disc = null) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.goto(`${url}/characters/mum/sheet.html?${new URLSearchParams(q)}`);
  await page.waitForFunction(() => window.__ready === true);
  let buf = null, cover = null;
  if (disc) {
    cover = await page.evaluate(async ([cx, cy, r]) => {
      const svg = document.querySelector('#stage svg');
      const img = new Image(); img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg.outerHTML)));
      await img.decode();
      const c = document.createElement('canvas'); c.width = svg.width.baseVal.value; c.height = svg.height.baseVal.value;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const x0 = Math.floor(cx - r), y0 = Math.floor(cy - r), n = Math.ceil(2 * r) + 1;
      const d = g.getImageData(x0, y0, n, n).data;
      let bg = 0, tot = 0;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        if ((x0 + x - cx) ** 2 + (y0 + y - cy) ** 2 > r * r) continue;
        tot++; if (d[(y * n + x) * 4] > 128) bg++;
      }
      return { bg, tot };
    }, disc);
  } else buf = await page.locator('#stage svg').screenshot();
  await page.close();
  return { buf, cover };
}

console.log('determinism');
const a = await shot({ pose: 'rest', frame: 'still' }, 1080, 1920);
const b = await shot({ pose: 'rest', frame: 'still' }, 1080, 1920);
ok(sha(a.buf) === sha(b.buf), `rest still rendered twice: ${sha(a.buf)} == ${sha(b.buf)}`);
ok(toSVG(rest) === toSVG(rest), 'toSVG(rest) is a pure function');

console.log('joints (silhouette at bone min/max; joint disc must be fully covered)');
const G = JSON.parse(fs.readFileSync(new URL('../ref/measurements.json', import.meta.url))).landmarks.ground;
for (const bone of BONES.filter((x) => x.cap)) {
  for (const ang of [bone.min, bone.max]) {
    const pose = { ...rest, bones: { [bone.id]: ang } };
    const j = jointWorld(pose)[bone.id];
    const cx = G[0] + j[0] * H, cy = G[1] + j[1] * H, r = bone.cap * H;
    const { cover } = await shot({ pose: 'rest', frame: 'ref', sil: '1', bones: JSON.stringify({ [bone.id]: ang }) }, 1254, 1254, [cx, cy, r]);
    const { bg, tot } = cover;
    ok(bg === 0, `${bone.id} @ ${ang > 0 ? '+' : ''}${ang}°: ${bg}/${tot} background px in joint disc r=${r.toFixed(0)}px`);
  }
}
await browser.close(); srv.close();
console.log(failures ? `\n${failures} FAILED` : '\nall tests passed');
process.exit(failures ? 1 : 0);
