// Authoring aid: turn a pose *spec* (spine angles + IK targets in reference px + face) into a pose of plain bone data.
// usage: node tools/pose_tool.mjs characters/mum/poses/src/queasy.json   -> writes characters/mum/poses/queasy.json
// Spec: { bones:{...}, scale:{...}, face:{...}, hands:{...}, ik: { near: { palmOn:"mouth"|[X,Y], handDeg, upperLen, foreLen, elbowSide:+1|-1 } } }
import fs from 'node:fs';
import path from 'node:path';
import { solve } from '../characters/mum/rig.js';
import * as prop from '../characters/mum/proportions.js';
import { BONE } from '../characters/mum/skeleton.js';
import { ap, sub, add, mul, R, len } from '../characters/mum/geom.js';

const G = prop.REF_GROUND, H = prop.H;
const at = ([X, Y]) => [(X - G[0]) / H, (Y - G[1]) / H];
const toPx = ([x, y]) => [x * H + G[0], y * H + G[1]];
const ang = (v) => Math.atan2(v[1], v[0]) * 180 / Math.PI;
const wrap = (a) => ((a + 540) % 360) - 180;
const LANDMARKS = { mouth: [606, 243], chin: [606, 280], sternum: [585, 400] };

export function armIK(pose, side, spec) {
  const S = side === 'near' ? 'Near' : 'Far';
  const st = solve(pose);
  // target on the head (landmark) follows the head bone in this pose
  let target = spec.palmOn;
  if (typeof target === 'string') {
    const local = sub(at(LANDMARKS[target]), prop.joints.head);
    target = toPx(ap(st.head.M, local));
  } else if (target && !Array.isArray(target)) {
    // contact on a moving surface: {bone, at:[X,Y]} = the rest-pose point at [X,Y] carried by that bone in this pose
    const local = sub(at(target.at), prop.joints[BONE[target.bone].joint]);
    target = toPx(ap(st[target.bone].M, local));
  }
  target = add(target, spec.palmOffset || [0, 0]);
  const palmLocal = sub(at(spec.palm || [612, 645]), prop.joints['wrist' + S]);   // palm centre in hand-local (rest)
  const W0 = sub(at(target), ap(R(spec.handDeg), palmLocal));                     // wrist position (H)
  const W = spec.wristOffset ? add(W0, [spec.wristOffset[0] / H, spec.wristOffset[1] / H]) : W0;
  const Sh = st['upperArm.' + side].pos;
  const u0 = sub(prop.joints['elbow' + S], prop.joints['shoulder' + S]);
  const f0 = sub(prop.joints['wrist' + S], prop.joints['elbow' + S]);
  const parentRot0 = st['clavicle.' + side].rot;
  if (spec.mode === 'reach') {
    // short, foreshortened forearm (far arm in 3/4): keep the forearm at foreDeg, reach with the upper arm (angle + along-stretch)
    const df = spec.foreDeg ?? 0, V = sub(W, Sh);
    const c = ap(R(df), f0);                                   // forearm vector in the upper arm's (unrotated) frame
    // |s·u0 + c| = |V|  ->  (u0·u0) s² + 2 (u0·c) s + (c·c − V·V) = 0
    const A = u0[0] ** 2 + u0[1] ** 2, B = 2 * (u0[0] * c[0] + u0[1] * c[1]), C = c[0] ** 2 + c[1] ** 2 - (V[0] ** 2 + V[1] ** 2);
    const s = (-B + Math.sqrt(B * B - 4 * A * C)) / (2 * A);
    const v = [s * u0[0] + c[0], s * u0[1] + c[1]];
    const du = wrap(ang(V) - ang(v) - parentRot0);
    const dh = wrap(spec.handDeg - (parentRot0 + du + df));
    return { bones: { ['upperArm.' + side]: +du.toFixed(2), ['forearm.' + side]: +df.toFixed(2), ['hand.' + side]: +dh.toFixed(2) },
             scale: { ['upperArm.' + side]: [+s.toFixed(4), 1] },
             debug: { wrist: toPx(W).map(Math.round), palm: target.map(Math.round), upperStretch: +s.toFixed(3) } };
  }
  const lu = len(u0) * spec.upperLen, lf = len(f0) * spec.foreLen;
  // circle-circle intersection for the elbow
  const d = len(sub(W, Sh));
  if (d > lu + lf || d < Math.abs(lu - lf)) throw new Error(`unreachable: d=${(d * H).toFixed(0)}px lu=${(lu * H).toFixed(0)} lf=${(lf * H).toFixed(0)}`);
  const a = (lu * lu - lf * lf + d * d) / (2 * d), hgt = Math.sqrt(Math.max(0, lu * lu - a * a));
  const ex = [(W[0] - Sh[0]) / d, (W[1] - Sh[1]) / d];
  const mid = add(Sh, [ex[0] * a, ex[1] * a]);
  const E1 = add(mid, [-ex[1] * hgt, ex[0] * hgt]), E2 = add(mid, [ex[1] * hgt, -ex[0] * hgt]);
  // default: the elbow that hangs lower (larger y); spec.elbowSide = 1|-1 forces a branch
  const E = spec.elbowSide === 1 ? E1 : spec.elbowSide === -1 ? E2 : (E1[1] >= E2[1] ? E1 : E2);
  const parentRot = st['clavicle.' + side].rot;
  const du = wrap(ang(sub(E, Sh)) - ang(u0) - parentRot);
  const df = wrap(ang(sub(W, E)) - ang(f0) - (parentRot + du));
  const dh = wrap(spec.handDeg - (parentRot + du + df));
  return { bones: { ['upperArm.' + side]: +du.toFixed(2), ['forearm.' + side]: +df.toFixed(2), ['hand.' + side]: +dh.toFixed(2) },
           scale: { ['upperArm.' + side]: [spec.upperLen, 1], ['forearm.' + side]: [spec.foreLen, 1] },
           debug: { elbow: toPx(E).map(Math.round), wrist: toPx(W).map(Math.round), palm: target.map(Math.round) } };
}

export function compile(spec) {
  const pose = { name: spec.name, bones: { ...(spec.bones || {}) }, scale: { ...(spec.scale || {}) }, lattice: spec.lattice || { belly: null },
                 face: spec.face || {}, fx: spec.fx || {}, hands: spec.hands || { near: 'cupping-belly', far: 'cupping-belly' }, facing: 'right' };
  for (const [side, s] of Object.entries(spec.ik || {})) {
    const r = armIK(pose, side, s);
    Object.assign(pose.bones, r.bones); Object.assign(pose.scale, r.scale);
    pose._ik = { ...(pose._ik || {}), [side]: r.debug };
  }
  return pose;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const f of process.argv.slice(2)) {
    const spec = JSON.parse(fs.readFileSync(f));
    const pose = compile(spec);
    const out = path.join(path.dirname(path.dirname(f)), path.basename(f));
    fs.writeFileSync(out, JSON.stringify(pose, null, 1));
    console.log(out, JSON.stringify(pose.bones), pose._ik ? JSON.stringify(pose._ik) : '');
  }
}
