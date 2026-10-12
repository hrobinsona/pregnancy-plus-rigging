// depth_view.mjs <char> <pose> [--side far] — debug view of the 2.5D depth proxies: the body proxies (engine/depth.js)
// and the 3D arm's points drawn over the render, plus each arm point's body coords and its overlap verdict.
// Writes out/depth_<pose>.png. Use it to check that the proxies sit on the drawing (bump, trunk, head) before trusting
// automatic draw order or overlap-order fit constraints.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRig } from '../engine/rig.js';
import { expandHands } from '../engine/handlib.js';
import { armFrame, armPoints, proxies, front, rayHits } from '../engine/depth.js';
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const [char, name] = argv, side = arg('side', 'far'), D = `characters/${char}/`;
const C = (await import(`../${D}character.js`)).default, rig = createRig(C);
const hl = Object.fromEntries((C.handLibrary || []).map((h) => [h, JSON.parse(fs.readFileSync(`${D}poses/hands/${h}.json`))]));
const pose = expandHands(JSON.parse(fs.readFileSync(`${D}poses/${name}.json`)), hl, C.handSides), st = rig.solve(pose);
const fr = armFrame(rig, st, side), A = armPoints(rig, st, side), prox = proxies(rig, st, fr);
const fx = rig.fx, SQ = Math.sqrt(1 - fx * fx), s = fr.s;
// body coords → screen: invert toBody (body = R(chest)ᵀ-upright screen + depth)
const k = (st.chest?.rot ?? 0) * Math.PI / 180, ck = Math.cos(k), sk = Math.sin(k);
const bodyToScreen = (p) => { const x = fx * p[0] + s * SQ * p[2], y = p[1]; return [fr.S[0] + ck * x - sk * y, fr.S[1] + sk * x + ck * y]; };
const out = { proxies: [], arm: [] };
for (const q of prox) {
  const pts = [];
  for (let i = 0; i < 24; i++) for (let j = 0; j < 12; j++) {
    const th = (i / 24) * 2 * Math.PI, ph = (j / 11) * Math.PI - Math.PI / 2;
    const u = q.kind === 'cylinder' ? [Math.cos(th), (j / 11) * 2 - 1, Math.sin(th)] : [Math.cos(ph) * Math.cos(th), Math.sin(ph), Math.cos(ph) * Math.sin(th)];
    pts.push(bodyToScreen([q.c[0] + q.axes[0] * u[0], q.c[1] + q.axes[1] * u[1], q.c[2] + q.axes[2] * u[2]]));
  }
  out.proxies.push({ name: q.name, pts, c: bodyToScreen(q.c) });
}
const lerp3 = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
for (const [nm, p] of [['shoulder', A.sh], ['elbow', A.el], ['fore', lerp3(A.el, A.wr, 0.6)], ['wrist', A.wr], ['hand', lerp3(A.wr, A.tip, 0.4)], ['tip', A.tip]]) {
  const b = fr.armToBody(p), v = front(b, fr, prox), hs = rayHits(b, fr, prox);
  out.arm.push({ nm, scr: fr.toScreen(p), body: b, v, hits: hs.map((h) => `${h.name} t0 ${h.t0.toFixed(2)} t1 ${h.t1.toFixed(2)}`) });
  console.log(`${nm.padEnd(8)} body F ${b[0].toFixed(2)} D ${b[1].toFixed(2)} L ${b[2].toFixed(2)}  verdict ${v}  ${hs.map((h) => `${h.name}[${h.t0.toFixed(2)},${h.t1.toFixed(2)}]`).join(' ')}`);
}
fs.writeFileSync(`out/depth_${name}.json`, JSON.stringify(out));
execFileSync('node', ['tools/char_still.mjs', '--char', char, '--pose', name, '--box', '-1.8,-6.5,1.8,-1.5', '--px', '700', '--out', `out/depth_${name}_r.png`]);
execFileSync('python3', ['-c', `
import json; from PIL import Image, ImageDraw
d=json.load(open('out/depth_${name}.json')); im=Image.open('out/depth_${name}_r.png').convert('RGB'); W,H=im.size; dr=ImageDraw.Draw(im)
X=lambda p:((p[0]+1.8)/3.6*W,(p[1]+6.5)/5.0*H)
cols={'trunk':(60,60,220),'bump':(0,150,0),'neck':(200,120,0),'head':(200,0,200),'jaw':(250,50,50)}
for q in d['proxies']:
  for p in q['pts']:
    x,y=X(p); dr.ellipse([x-1.5,y-1.5,x+1.5,y+1.5],fill=cols.get(q["name"],(0,0,0)))
pr=[X(a['scr']) for a in d['arm']]
dr.line(pr,fill=(0,0,0),width=2)
for a in d['arm']:
  x,y=X(a['scr']); c={1:(0,180,0),-1:(220,0,0),0:(120,120,120)}[a['v']]; dr.ellipse([x-5,y-5,x+5,y+5],fill=c)
im.save('out/depth_${name}.png')`]);
console.log('wrote', `out/depth_${name}.png`);
