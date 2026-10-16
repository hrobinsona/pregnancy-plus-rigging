// contact_pose.mjs — make a key pose whose hand RESTS ON the body at a chosen spot, with the 3D arm solved to it.
//   node tools/contact_pose.mjs <char> <basePose> <outPose> --side far --at x,y (screen H, the wrist) --surface bump
//        [--gap 0.05] [--back] [--phi deg (elbow swivel; default: the base pose's)] [--handDir deg (screen angle the hand points)]
//        [--hand '{"pose":"relaxed","mix":{"cup":0.35}}'] [--view back] [--on belly (--at in that bone's rest space) [--print-rest]]
//        [--inside m (H: the fingertips kept that far inside the surface's outline; the wrist slides back along --handDir)]
// For contacts no reference shows (or shows badly): the wrist goes on the proxy's near surface at that point of the screen
// (engine/depth.js), the arm comes from 2-bone 3D IK at the given swivel, the hand is turned to point along the surface.
// Everything else is copied from the base pose; the recipe is stored in the pose (_contact) so it can be re-made.
import fs from 'node:fs';
import { createRig } from '../engine/rig.js';
import { armFrame, armPoints, proxies, rayHits, swivelOf, ik2, armAngles } from '../engine/depth.js';
import { expandHands } from '../engine/handlib.js';
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const [char, baseName, outName] = argv, D = `characters/${char}/`;
const C = (await import(`../${D}character.js`)).default, rig = createRig(C), J = C.joints, BONE = rig.BONE;
const base = JSON.parse(fs.readFileSync(`${D}poses/${baseName}.json`)), pose = structuredClone(base); pose.bones ||= {};
const side = arg('side', 'far'), S = side === 'near' ? 'Near' : 'Far', ua = `upperArm.${side}`, fa = `forearm.${side}`, ha = `hand.${side}`, ab = `armAbd.${side}`, ar = `armRot.${side}`;
let at = arg('at').split(',').map(Number); const gap = +arg('gap', 0.05);
const L = (a, b) => Math.hypot(J[b][0] - J[a][0], J[b][1] - J[a][1]), L1 = L('shoulder' + S, 'elbow' + S), L2 = L('elbow' + S, 'wrist' + S);
const st0 = rig.solve(pose), fr0 = armFrame(rig, st0, side), A0 = armPoints(rig, st0, side);
// --on belly: --at is a REST-space point carried by that bone (a spot on the bump, wherever the pose has put the bump: a
// library pose rebuilt from a new fit keeps its hands on the same spot), --print-rest: say where a posed --at is in it
if (arg('on')) { const b = arg('on'), M = st0[b].M, j = J[BONE[b].joint];
  if (argv.includes('--print-rest')) { const det = M[0] * M[3] - M[1] * M[2], dx = at[0] - M[4], dy = at[1] - M[5]; console.log(`${at} posed = ${b} rest ${((M[3] * dx - M[2] * dy) / det + j[0]).toFixed(3)},${((-M[1] * dx + M[0] * dy) / det + j[1]).toFixed(3)}`); process.exit(0); }
  at = [M[0] * (at[0] - j[0]) + M[2] * (at[1] - j[1]) + M[4], M[1] * (at[0] - j[0]) + M[3] * (at[1] - j[1]) + M[5]]; }
const phi = arg('phi') !== undefined ? +arg('phi') * Math.PI / 180 : swivelOf(A0.el, A0.wr);
const surf = arg('surface') && proxies(rig, st0, fr0).find((p) => p.name === arg('surface'));
const over = (pt) => surf && rayHits(fr0.toBody(pt, 0), fr0, [surf])[0];
const keyed = { e: pose.bones[ua] || 0, al: pose.bones[ab] || 0, tau: pose.bones[ar] || 0 }, lim = (b) => [BONE[b].min ?? -180, BONE[b].max ?? 180];
let z;
function place(at) {   // the arm solved to put the wrist at `at` (screen H) on the surface, the hand turned to --handDir
  z = fr0.depthOf(A0.wr);
  if (arg('surface')) {
    const h = over(at);
    if (!h) throw new Error(`the point ${at} is not over the ${arg('surface')} proxy`);
    z = arg('back') !== undefined ? h.t1 + gap : h.t0 - gap;   // --back: on the FAR surface (a hand round the far side of the bump)
  }
  let aim = at.slice();
  for (let it = 0; it < 4; it++) {
    const fr = armFrame(rig, rig.solve(pose), side), sol = ik2(fr.fromScreen(aim, z), L1, L2, phi), g = armAngles(sol.el, sol.wr, L1, L2, keyed, { e: lim(ua), al: lim(ab) });
    Object.assign(pose.bones, { [ua]: g.e, [ab]: g.al, [ar]: g.tau, [fa]: g.c });
    const w = rig.solve(pose)[ha].pos; aim = [aim[0] + at[0] - w[0], aim[1] + at[1] - w[1]];
  }
  if (arg('handDir') !== undefined) {
    // the hand's direction on screen comes from the wrist bend AND the forearm's twist (which turns the plane it bends in):
    // scan both, prefer little twist
    const want = +arg('handDir'), r0 = rig.restAngle(BONE[ha]), fr_ = `foreRot.${side}`;
    const err = (v, t) => { const p = { ...pose, bones: { ...pose.bones, [ha]: v, [fr_]: t } }; return Math.abs(((r0 + rig.solve(p)[ha].rot - want + 540) % 360) - 180); };
    let best = [pose.bones[ha] || 0, pose.bones[fr_] || 0], be = Infinity;
    for (let t = -90; t <= 90; t += 10) for (let v = BONE[ha].min; v <= BONE[ha].max; v += 2) { const e = err(v, t) + 0.05 * Math.abs(t); if (e < be) { be = e; best = [v, t]; } }
    pose.bones[ha] = best[0]; pose.bones[fr_] = best[1]; if (err(...best) > 10) console.warn(`hand direction: closest reachable is ${err(...best).toFixed(0)}° off`);
  }
}
if (arg('hand')) { let h = arg('hand'); try { h = JSON.parse(h); } catch {} pose.hands = { ...(pose.hands || {}), [side]: h }; }
place(at);
// --inside m (H): the fingertips stay INSIDE the surface's outline by m: the wrist slides back against the hand's
// direction until every fingertip (with the pose's hand shape) is over the surface. A hand laid on the bump at the still's
// spot ran its fingers past our bump's front into the air (side-on sit-chair, lesson 64): our bump is not the still's.
if (arg('inside') !== undefined && surf) {
  const m = +arg('inside'), lib = Object.fromEntries((C.handLibrary || []).map((h) => [h, JSON.parse(fs.readFileSync(`${D}poses/hands/${h}.json`))]));
  const tipsIn = () => { const st = rig.solve(expandHands(pose, lib, C.handSides)), w = st[ha].pos;
    return [1, 2, 3, 4].every((i) => { const t = rig.carry(st, `${ha}.f${i}c`, `${ha}.f${i}t`), d = Math.hypot(t[0] - w[0], t[1] - w[1]); return over([t[0] + m * (t[0] - w[0]) / d, t[1] + m * (t[1] - w[1]) / d]); }); };
  const u = arg('handDir') !== undefined ? [Math.cos(+arg('handDir') * Math.PI / 180), Math.sin(+arg('handDir') * Math.PI / 180)] : null;
  let k = 0;
  for (; k < 40 && u && !tipsIn(); k++) { at = [at[0] - 0.01 * u[0], at[1] - 0.01 * u[1]]; place(at); }
  if (k) console.log(`--inside: the wrist slid back ${(k * 0.01).toFixed(2)} H`);
}
if (arg('view')) pose.handView = { ...(pose.handView || {}), [side]: arg('view') };
for (const k of [ua, fa, ha, ab, ar]) pose.bones[k] = Math.round(pose.bones[k] * 10) / 10;
pose.name = outName; pose._contact = argv.slice(3).join(' ') + ` (base ${baseName})`;
delete pose._orig; delete pose._edits;
fs.writeFileSync(`${D}poses/${outName}.json`, JSON.stringify(pose, null, 1));
const w = rig.solve(pose)[ha].pos;
console.log(`${outName}: ${side} wrist at ${w.map((v) => v.toFixed(3))} (asked ${at}), depth ${z.toFixed(2)}, swivel ${(phi * 180 / Math.PI).toFixed(0)}°; arm e ${pose.bones[ua]} abd ${pose.bones[ab]} rot ${pose.bones[ar]} elbow ${pose.bones[fa]} hand ${pose.bones[ha]}`);
