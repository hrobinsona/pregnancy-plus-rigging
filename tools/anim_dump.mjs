// anim_dump.mjs — numbers behind a stretch of a shot, frame by frame: channel values (bones, fx.*, scale.*) and where the
// body actually is (head tip, head, neck, hip, knee, ankle x, near shoulder — H units). Settles "lunge vs fold", "the head
// only drops", "which channel pops at frame N" before anyone argues about a picture.
//   node tools/anim_dump.mjs <char> <anim> <f0> <f1> [ch1,ch2,…]      e.g.  … mum2 nausea-to-belly 88 100 spineLower,chest,fx.headPitch,scale.chest
//   channels: a bone name, fx.<name>, scale.<bone> (along); with no list, the landmark positions are printed
import fs from 'node:fs';
import { createRig } from '../engine/rig.js';
import { makeAnim } from '../engine/anim.js';
import { expandHands } from '../engine/handlib.js';
const [char, name, f0, f1, chs] = process.argv.slice(2), D = `characters/${char}/`;
const C = (await import(`../${D}character.js`)).default, rig = createRig(C);
const handLib = Object.fromEntries((C.handLibrary || []).map((h) => [h, JSON.parse(fs.readFileSync(`${D}poses/hands/${h}.json`))]));
const spec = JSON.parse(fs.readFileSync(`${D}anims/${name}.json`));
const names = new Set(); JSON.stringify(spec, (k, v) => { if ((k === 'pose' || k === 'plant') && typeof v === 'string') names.add(v); return v; });
const lib = Object.fromEntries([...names].filter((p) => fs.existsSync(`${D}poses/${p}.json`)).map((p) => [p, expandHands(JSON.parse(fs.readFileSync(`${D}poses/${p}.json`)), handLib, C.handSides)]));
const A = makeAnim(spec, lib, { rig, C });
const f = (v) => v.map((x) => x.toFixed(2)).join(',');
for (let i = +f0; i <= +f1; i++) {
  const p = A.poseAt(i / spec.fps), st = rig.solve(p), car = (b, j) => rig.carry(st, b, j);
  if (chs) { console.log(i, chs.split(',').map((c) => `${c} ${(c.startsWith('fx.') ? p.fx[c.slice(3)] : c.startsWith('scale.') ? (p.scale[c.slice(6)] || [1])[0] : p.bones[c])?.toFixed?.(2)}`).join(' | ')); continue; }
  const ank = (car('shin.near', 'ankleNear')[0] + car('shin.far', 'ankleFar')[0]) / 2;
  console.log(i, (i / spec.fps).toFixed(2), 'headTip', f(car('head', 'headTip')), 'head', f(st.head.pos), 'neck', f(st.neck.pos), 'hip', f(st['thigh.near'].pos), 'knee', f(st['shin.near'].pos), 'ankleX', ank.toFixed(2), 'shoulderN', f(st['upperArm.near'].pos));
}
