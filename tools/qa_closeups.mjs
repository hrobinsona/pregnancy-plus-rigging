// Close-ups that FOLLOW the joints at chosen moments (ported from reels tools/rig/closeups.py): shoulders, elbows, both
// hands and the face, one row per time, for judging details at size (a crinkled finger or a step at the shoulder is
// invisible in a whole-frame sheet).
//   node tools/qa_closeups.mjs --char mum2 --anim nausea-to-belly --t 2.5,7.4,7.6,9 [--out out/closeups.png] [--zoom 2]
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { serve } from './serve.mjs';
import { createRig } from '../engine/rig.js';
import { makeAnim } from '../engine/anim.js';
import { expandHands } from '../engine/handlib.js';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const char = arg('char', 'mum2'), name = arg('anim', 'nausea-to-belly'), D = `characters/${char}/`, zoom = +arg('zoom', 2);
const out = arg('out', `out/${char}_${name}_closeups.png`), times = arg('t', '0').split(',').map(Number);
const C = (await import(`../${D}character.js`)).default, rig = createRig(C);
const handLib = Object.fromEntries((C.handLibrary || []).map((h) => [h, JSON.parse(fs.readFileSync(`${D}poses/hands/${h}.json`))]));
const spec = JSON.parse(fs.readFileSync(`${D}anims/${name}.json`));
const names = new Set(); JSON.stringify(spec, (k, v) => { if ((k === 'pose' || k === 'plant') && typeof v === 'string') names.add(v); return v; });
const lib = Object.fromEntries([...names].filter((p) => fs.existsSync(`${D}poses/${p}.json`)).map((p) => [p, expandHands(JSON.parse(fs.readFileSync(`${D}poses/${p}.json`)), handLib, C.handSides)]));
const A = makeAnim(spec, lib, { rig, C }), sc = (p) => rig.toScreen(p, { frame: 'still' });
const cols = [['near shoulder', (s) => s['upperArm.near'].pos, 150], ['near elbow', (s) => s['forearm.near'].pos, 150], ['near hand', (s) => s['hand.near'].pos, 200],
  ['far shoulder', (s) => s['upperArm.far'].pos, 150], ['far elbow', (s) => s['forearm.far'].pos, 150], ['far hand', (s) => s['hand.far'].pos, 200], ['face', (s) => s.head.pos, 260]];
const { srv, base } = await serve(), browser = await chromium.launch();
const pg = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await pg.goto(`${base}/engine/view.html?char=${char}&frame=still`); await pg.waitForFunction(() => window.__ready === true);
const tmp = fs.mkdtempSync('/tmp/closeups-'), rows = [];
for (const t of times) {
  const pose = A.poseAt(t), st = rig.solve(pose);
  await pg.evaluate((p) => window.renderPose(p), pose);
  const f = `${tmp}/t${t}.png`; await pg.locator('#stage svg').screenshot({ path: f });
  rows.push({ t, f, boxes: cols.map(([, at, size]) => { const [x, y] = sc(at(st)); return [Math.round(x - size / 2), Math.round(y - size / 2), size]; }) });
}
await browser.close(); srv.close();
fs.writeFileSync(`${tmp}/rows.json`, JSON.stringify({ rows, cols: cols.map((c) => c[0]), zoom, out }));
execFileSync('python3', ['-c', `
import json, sys; from PIL import Image, ImageDraw
J = json.load(open(sys.argv[1])); T = int(150 * J['zoom']); n = len(J['cols'])
sheet = Image.new('RGB', (60 + T * n, 24 + (T + 4) * len(J['rows'])), 'white'); d = ImageDraw.Draw(sheet)
for c, name in enumerate(J['cols']): d.text((64 + c * T, 6), name, fill=(0, 0, 0))
for r, row in enumerate(J['rows']):
    im = Image.open(row['f']).convert('RGB'); y = 24 + r * (T + 4); d.text((4, y + 4), '%.2fs' % row['t'], fill=(0, 0, 0))
    for c, (x0, y0, s) in enumerate(row['boxes']): sheet.paste(im.crop((x0, y0, x0 + s, y0 + s)).resize((T, T), Image.LANCZOS), (60 + c * T, y))
sheet.save(J['out']); print(J['out'])`, `${tmp}/rows.json`], { stdio: 'inherit' });
fs.rmSync(tmp, { recursive: true, force: true });
