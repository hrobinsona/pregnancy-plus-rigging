// uv_check.mjs — where the far wrist and elbow actually go, in the TORSO frame (u across the shoulders, v shoulders→hips),
// frame by frame over a window: compare with the reference video's measured path (path.uv/euv) and look for jumps.
//   node tools/uv_check.mjs <char> <anim> <t0> <t1> [side]
import fs from 'node:fs';
import { createRig } from '../engine/rig.js';
import { makeAnim } from '../engine/anim.js';
import { expandHands } from '../engine/handlib.js';
const [char, name, t0s, t1s, side = 'far'] = process.argv.slice(2), D = `characters/${char}/`;
const C = (await import(`../${D}character.js`)).default, rig = createRig(C);
const handLib = Object.fromEntries((C.handLibrary || []).map((h) => [h, JSON.parse(fs.readFileSync(`${D}poses/hands/${h}.json`))]));
const spec = JSON.parse(fs.readFileSync(`${D}anims/${name}.json`));
const names = new Set(); JSON.stringify(spec, (k, v) => { if (k === 'pose' && typeof v === 'string') names.add(v); if (k === 'plant' && typeof v === 'string') names.add(v); return v; });
const lib = Object.fromEntries([...names].filter((p) => fs.existsSync(`${D}poses/${p}.json`)).map((p) => [p, expandHands(JSON.parse(fs.readFileSync(`${D}poses/${p}.json`)), handLib, C.handSides)]));
const A = makeAnim(spec, lib, { rig, C });
const tf = (S) => { const o = S['upperArm.near'].pos, f = S['upperArm.far'].pos, hn = S['thigh.near'].pos, hf = S['thigh.far'].pos, ex = [f[0] - o[0], f[1] - o[1]], ey = [(hn[0] + hf[0] - o[0] - f[0]) / 2, (hn[1] + hf[1] - o[1] - f[1]) / 2], det = ex[0] * ey[1] - ex[1] * ey[0];
  return (p) => { const d = [p[0] - o[0], p[1] - o[1]]; return [(d[0] * ey[1] - d[1] * ey[0]) / det, (ex[0] * d[1] - ex[1] * d[0]) / det]; }; };
let prev = null;
for (let i = Math.round(+t0s * spec.fps); i <= Math.round(+t1s * spec.fps); i++) {
  const t = i / spec.fps, pose = A.poseAt(t), S = rig.solve(pose), of = tf(S), w = of(S['hand.' + side].pos), e = of(S['forearm.' + side].pos), R = pose._reach?.[side] || {};
  const eT = R.elbowP ? of(R.elbowP) : null, sp = prev ? Math.hypot(S['hand.' + side].pos[0] - prev[0], S['hand.' + side].pos[1] - prev[1]) : 0; prev = S['hand.' + side].pos;
  console.log(`${i} t=${t.toFixed(3)} s=${(R.sP ?? NaN).toFixed(2)} wrist ${w.map((x) => x.toFixed(2)).join(',')} elbow ${e.map((x) => x.toFixed(2)).join(',')}${eT ? ' →' + eT.map((x) => x.toFixed(2)).join(',') : ''} spd ${sp.toFixed(3)} hand ${(pose.bones['hand.' + side] ?? 0).toFixed(0)} armAbd ${(pose.bones['armAbd.' + side] ?? 0).toFixed(0)} front ${(pose.fx['front.' + side] ?? 0).toFixed(2)}`);
}
