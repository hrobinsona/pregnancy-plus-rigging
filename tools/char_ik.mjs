// char_ik.mjs — pose AUTHORING with targets (offline, numeric): node tools/char_ik.mjs <char> <spec.json>
// Writes characters/<char>/poses/<spec.name>.json: plain bone angles (the runtime never solves IK — every frame stays a pure
// function of t; keys are authored here, then blended in angle space).
// spec = { name, note?, root?, bones: {...base angles...}, hands?: {...}, zBias?: {...}, handView?: {...},
//          targets: [ { bone: 'hand.near', point: 'hand.near.f2k' | [x,y],      // the point that must land (carried by `bone`)
//                       to: { bone: 'head', point: 'mouth' | [x,y], offset?: [dx,dy] },   // where (a point carried by a bone)
//                       solve: ['shoulderAbd.near','upperArm.near','forearm.near'],     // bones the solver may move
//                       angle?: { bone: 'hand.near', deg },                               // optional: a bone's WORLD screen angle
//                       w?: 1 } ] }
// Points: a joint name of the character, a params landmark name (lm), or rest-space [x, y] in H. Solver: coordinate descent
// with step halving on the listed bones inside their limits, plus a small pull toward the base angles (keeps the pose
// natural when the target is under-constrained). Prints the residual per target.
import fs from 'node:fs';
import { createRig } from '../engine/rig.js';
import { expandHands } from '../engine/handlib.js';
const [char, specPath] = process.argv.slice(2);
const C = (await import(`../characters/${char}/character.js`)).default;
const rig = createRig(C), { J, BONE } = rig;
const lib = Object.fromEntries((C.handLibrary || []).map((h) => [h, JSON.parse(fs.readFileSync(`characters/${char}/poses/hands/${h}.json`))]));
const spec = JSON.parse(fs.readFileSync(specPath));
const lm = C.params.lm;
const restPoint = (p) => (Array.isArray(p) ? p : J[p] ?? lm(p));
const carried = (st, bone, p) => { const v = restPoint(p), j = J[BONE[bone].joint], M = st[bone].M; return [M[0] * (v[0] - j[0]) + M[2] * (v[1] - j[1]) + M[4], M[1] * (v[0] - j[0]) + M[3] * (v[1] - j[1]) + M[5]]; };
const base = { ...(spec.bones || {}) };
const vars = [...new Set(spec.targets.flatMap((t) => t.solve))];
const poseOf = (x) => expandHands({ ...spec, bones: { ...base, ...Object.fromEntries(vars.map((b, i) => [b, x[i]])) } }, lib, C.handSides);
const err = (x) => {
  const st = rig.solve(poseOf(x)); let e = 0;
  for (const t of spec.targets) {
    const a = carried(st, t.bone, t.point), tb = carried(st, t.to.bone, t.to.point), o = t.to.offset || [0, 0];
    e += (t.w ?? 1) * ((a[0] - tb[0] - o[0]) ** 2 + (a[1] - tb[1] - o[1]) ** 2);
    if (t.angle) { const d = ((st[t.angle.bone].rot + (BONE[t.angle.bone].restRot ?? 0) - t.angle.deg + 540) % 360) - 180; e += 1e-5 * d * d; }
  }
  return e + 1e-7 * vars.reduce((s, b, i) => s + (x[i] - (base[b] ?? 0)) ** 2, 0);
};
const lim = vars.map((b) => [BONE[b].min ?? -180, BONE[b].max ?? 180]);
let x = vars.map((b) => base[b] ?? 0), e = err(x);
for (let step = 16; step > 0.05; step /= 2) {
  for (let pass = 0, improved = true; improved && pass < 60; pass++) {
    improved = false;
    for (let i = 0; i < x.length; i++) for (const s of [step, -step]) {
      const y = x.slice(); y[i] = Math.max(lim[i][0], Math.min(lim[i][1], y[i] + s)); const ey = err(y);
      if (ey < e) { x = y; e = ey; improved = true; }
    }
  }
}
const st = rig.solve(poseOf(x));
for (const t of spec.targets) {
  const a = carried(st, t.bone, t.point), tb = carried(st, t.to.bone, t.to.point), o = t.to.offset || [0, 0];
  console.log(`${t.bone}:${t.point} → ${t.to.bone}:${t.to.point}  residual ${Math.hypot(a[0] - tb[0] - o[0], a[1] - tb[1] - o[1]).toFixed(4)} H`);
}
const out = { name: spec.name, note: spec.note, ...(spec.root ? { root: spec.root } : {}), bones: { ...base, ...Object.fromEntries(vars.map((b, i) => [b, Math.round(x[i] * 10) / 10])) },
              ...(spec.hands ? { hands: spec.hands } : {}), ...(spec.zBias ? { zBias: spec.zBias } : {}), ...(spec.handView ? { handView: spec.handView } : {}), _ik: spec.targets };
fs.writeFileSync(`characters/${char}/poses/${spec.name}.json`, JSON.stringify(out, null, 1));
console.log('wrote', `characters/${char}/poses/${spec.name}.json`, vars.map((b, i) => `${b} ${x[i].toFixed(1)}`).join(', '));
