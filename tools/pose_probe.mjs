// pose_probe.mjs — A/B a degree of freedom on one frame of a shot: render the frame at time t with one channel set (or
// offset) to each of several values, side by side, cropped. For finding which DOF a look needs before keying it.
//   node tools/pose_probe.mjs --char mum2 --anim nausea-to-belly --t 2.333 --vary foreRot.far=-60,0,60 [--add] \
//        [--set 'hand.far=20,fx.headPitch=10'] [--crop 300,150,900,900] [--out out/probe.png]
// Channels: a bone name, fx.<name>, or scale.<bone>.<0|1> (along / across). --add offsets instead of setting. Overrides apply AFTER the animation solve (arm
// IK already done), so they show the channel's own effect on the drawing.
import fs from 'node:fs';
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { serve } from './serve.mjs';
import { createRig } from '../engine/rig.js';
import { makeAnim } from '../engine/anim.js';
import { expandHands } from '../engine/handlib.js';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i >= 0 ? process.argv[i + 1] : d; };
const char = arg('char', 'mum2'), name = arg('anim'), D = `characters/${char}/`;
const C = (await import(`../${D}character.js`)).default, rig = createRig(C);
const handLib = Object.fromEntries((C.handLibrary || []).map((h) => [h, JSON.parse(fs.readFileSync(`${D}poses/hands/${h}.json`))]));
const spec = JSON.parse(fs.readFileSync(`${D}anims/${name}.json`));
const names = new Set(); JSON.stringify(spec, (k, v) => { if ((k === 'pose' || k === 'plant') && typeof v === 'string') names.add(v); return v; });
const lib = Object.fromEntries([...names].filter((p) => fs.existsSync(`${D}poses/${p}.json`)).map((p) => [p, expandHands(JSON.parse(fs.readFileSync(`${D}poses/${p}.json`)), handLib, C.handSides)]));
const A = makeAnim(spec, lib, { rig, C });
const t = +arg('t', 0), [ch, vs] = arg('vary', 'none=0').split('='), vals = vs.split(',').map(Number), add = process.argv.includes('--add');
const setAll = (pose, k, v, plus) => { if (k.startsWith('scale.')) { const m = k.match(/^scale\.(.+)\.([01])$/), sc = (pose.scale[m[1]] ||= [1, 1]); sc[+m[2]] = (plus ? sc[+m[2]] : 0) + v; return; } if (k.startsWith('fx.')) { const f = k.slice(3); pose.fx[f] = (plus ? pose.fx[f] || 0 : 0) + v; } else pose.bones[k] = (plus ? pose.bones[k] || 0 : 0) + v; };
const crop = (arg('crop', '0,0,1080,1920')).split(',').map(Number), out = arg('out', 'out/probe.png');
const { srv, base } = await serve(), browser = await chromium.launch();
const pg = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await pg.goto(`${base}/engine/view.html?char=${char}&frame=still`); await pg.waitForFunction(() => window.__ready === true);
const files = [];
for (const v of vals) {
  const pose = A.poseAt(t);
  for (const kv of (arg('set', '') || '').split(',').filter(Boolean)) { const [k, x] = kv.split('='); setAll(pose, k, +x, false); }
  if (ch !== 'none') setAll(pose, ch, v, add);
  await pg.evaluate((p) => window.renderPose(p), pose);
  const f = `/tmp/_probe_${files.length}.png`; await pg.locator('#stage svg').screenshot({ path: f }); files.push([f, v]);
}
await browser.close(); srv.close();
const py = `
from PIL import Image, ImageDraw
import json, sys
fs = json.loads(sys.argv[1]); c = json.loads(sys.argv[2]); W = 300; H = int((c[3]-c[1])*W/(c[2]-c[0]))
S = Image.new('RGB', (W*len(fs), H+20), 'white'); D = ImageDraw.Draw(S)
for k, (f, v) in enumerate(fs):
    S.paste(Image.open(f).convert('RGB').crop(c).resize((W, H)), (k*W, 20)); D.text((k*W+4, 3), sys.argv[3] + '=' + str(v), fill='black')
S.save(sys.argv[4])`;
execFileSync('python3', ['-c', py, JSON.stringify(files), JSON.stringify(crop), `${add ? '+' : ''}${ch} @${t}`, out]);
console.log('wrote', out);
