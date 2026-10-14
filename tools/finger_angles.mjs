// finger_angles.mjs — each finger's screen angle and drawn length (knuckle → tip), on a pose or on the shot's frames, against
// the still's measured angles. The fitted KEY can match the still while the FILM doesn't: mum3q look-up v9's breath turned
// the end-on forearm and laid the draped fingers 5° flatter than the key, and its squeeze curled them into "a paw" (lesson 54).
//   node tools/finger_angles.mjs --char mum3q --side far (--pose fit-q_k4_down | --anim look-up [--t 0,3.5,7.3 | --every 0.5])
//        [--want 38,35,30,28] [--tol 6] [--fan]
// angle: degrees below the horizontal, measured AWAY from the wrist's side (+ = the tip lower than the knuckle); length in
// the still's px (C.ref.Hpx). --want: the still's angles, index → little (measure them on the still: the lines between the
// fingers, the tips); exit 1 if a finger in any sampled frame is off by more than --tol degrees (sample the frames that
// should match the still: a squeeze or a lift is meant to leave it).
// --fan: compare the SHAPE only, each finger's angle less the four's mean (the fan, the steps between the tips), so a whole-
// hand turn (a stroke, the breath) passes and a change of shape doesn't: mum3q look-up v22's cradling fingers, bent at the
// knuckles to "gather" as she looked up, went straight and parallel on the film ("a rake", lesson 59) between the key frames
// the angle check sampled. Sample every 0.5 s with --fan; keep the angle check at the frames that should match the still.
import fs from 'node:fs';
import { createRig } from '../engine/rig.js';
import { expandHands } from '../engine/handlib.js';
import { makeAnim } from '../engine/anim.js';
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const char = arg('char'), side = arg('side', 'far'), D = `characters/${char}/`;
const C = (await import(`../${D}character.js`)).default, rig = createRig(C), Hpx = C.ref.Hpx;
const handLib = Object.fromEntries((C.handLibrary || []).map((h) => [h, JSON.parse(fs.readFileSync(`${D}poses/hands/${h}.json`))]));
const load = (p) => expandHands(JSON.parse(fs.readFileSync(`${D}poses/${p}.json`)), handLib, C.handSides);
const ap = (M, q) => [M[0] * q[0] + M[2] * q[1] + M[4], M[1] * q[0] + M[3] * q[1] + M[5]], J = C.joints, id = `hand.${side}`;
const want = arg('want')?.split(',').map(Number), tol = +arg('tol', 6), fan = argv.includes('--fan');
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length, wantM = want ? mean(want) : 0;
function fingers(pose) {
  const st = rig.solve(pose), W = st[id].pos;
  return ['f1', 'f2', 'f3', 'f4'].map((f) => {
    const a = st[`${id}.${f}a`].pos, d = J[`${id}.${f}d`], t = ap(st[`${id}.${f}c`].M, [J[`${id}.${f}t`][0] - d[0], J[`${id}.${f}t`][1] - d[1]]);
    const away = Math.sign(a[0] - W[0]) || 1;   // the fingers point away from the wrist on screen
    return { ang: Math.atan2(t[1] - a[1], away * (t[0] - a[0])) * 180 / Math.PI, len: Math.hypot(t[0] - a[0], t[1] - a[1]) * Hpx };
  });
}
let samples;
if (arg('pose')) samples = [[arg('pose'), load(arg('pose'))]];
else {
  const spec = JSON.parse(fs.readFileSync(`${D}anims/${arg('anim')}.json`)), names = new Set();
  JSON.stringify(spec, (k, v) => { if (k === 'pose' && typeof v === 'string') names.add(v); return v; });
  const lib = Object.fromEntries([...names].map((p) => [p, load(p)])), A = makeAnim(spec, lib, { rig, C, quiet: true });
  const ts = arg('t') ? arg('t').split(',').map(Number) : Array.from({ length: Math.floor(spec.duration / +arg('every', 0.5)) }, (_, i) => i * +arg('every', 0.5));
  samples = ts.map((t) => [`${t.toFixed(2)} s`, A.poseAt(t)]);
}
let worst = 0;
console.log(`${id}: angle° / length px, index → little${want ? `  (still: ${want.join(', ')})` : ''}${fan ? '  [--fan: off = the fan\'s shape, a whole-hand turn removed]' : ''}`);
for (const [lab, pose] of samples) {
  const F = fingers(pose), m = fan ? mean(F.map((f) => f.ang)) - wantM : 0;
  const off = want ? Math.max(...F.map((f, i) => Math.abs(f.ang - m - want[i]))) : 0; worst = Math.max(worst, off);
  console.log(`  ${lab.padEnd(16)} ${F.map((f) => `${f.ang.toFixed(0).padStart(3)}°/${f.len.toFixed(0)}`).join('  ')}${want ? `   off ${off.toFixed(0)}°` : ''}`);
}
if (want) { console.log(worst <= tol ? `PASS (worst ${worst.toFixed(0)}° ≤ ${tol}°)` : `FAIL: a finger ${worst.toFixed(0)}° off the still's${fan ? ' fan' : ''} (> ${tol}°)`); process.exit(worst <= tol ? 0 : 1); }
