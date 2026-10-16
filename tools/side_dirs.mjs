// side_dirs.mjs — a side-on library pose's POSTURE against its still's, segment by segment: the screen direction (deg: 0
// forward, 90 down, −90 up) of the neck (shoulder → ear), the trunk (hip → shoulder), each upper arm, forearm, thigh and
// shin, ours beside the still's (its landmarks, mapped into rig units by the pose's fit) and the difference. The fit
// matches directions only partly (--dirs 0.5), and floor_pose, contact_pose and the hand recipes move the arms and the
// trunk after it, so a posture can drift from the still while every contact holds. Side-on round 6 (Fable critics): the
// elbows behind the back line kneeling and seated (the upper arm 11–17° back of the still's) where the stills hang them
// at her side; the "long neck leaning forward" measured within 2–9° of the stills (so its fix is its drawing, not its
// direction). Measure here before re-keying a direction (`dirs` in fit_side.sh).
//   node tools/side_dirs.mjs <char> <pose (under poses/side/, or a path under poses/ with its fitFrom)>... [--tol 8]   (flags rows off by more than --tol degrees)
import fs from 'node:fs';
import { createRig } from '../engine/rig.js';
import { expandHands } from '../engine/handlib.js';
import { ap, sub } from '../engine/geom.js';
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const [char, ...rest] = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--'))), D = `characters/${char}/`, tol = +arg('tol', 8);
const C = (await import(`../${D}character.js`)).default, rig = createRig(C), J = C.joints;
const lib = Object.fromEntries((C.handLibrary || []).map((h) => [h, JSON.parse(fs.readFileSync(`${D}poses/hands/${h}.json`))]));
const deg = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI, wrap = (d) => ((d + 540) % 360) - 180;
const mid = (...p) => [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length];
// segments by landmark names (R = near, L = far: tools/fit_pose.mjs); a name list is their midpoint
const SEG = [['neck', ['shoulderR'], ['earL', 'earR']], ['trunk', ['hipR', 'hipL'], ['shoulderR', 'shoulderL']],
  ['upperArm.near', ['shoulderR'], ['elbowR']], ['forearm.near', ['elbowR'], ['wristR']], ['upperArm.far', ['shoulderL'], ['elbowL']], ['forearm.far', ['elbowL'], ['wristL']],
  ['thigh.near', ['hipR'], ['kneeR']], ['shin.near', ['kneeR'], ['ankleR']], ['thigh.far', ['hipL'], ['kneeL']], ['shin.far', ['kneeL'], ['ankleL']]];
for (const name of rest) {
  const pose = JSON.parse(fs.readFileSync(`${D}poses/${name.includes('/') ? name : 'side/' + name}.json`)), fitOf = pose.fitFrom || `side/fit/${name}`;
  const tf = `out/fit_${fitOf}_targets.json`;
  if (!fs.existsSync(tf)) { console.log(`${name}: no fit targets (${tf}): run refs/fit_side.sh ${name}`); continue; }
  const T = Object.fromEntries(JSON.parse(fs.readFileSync(tf)).targets.map((t) => [t.n, t]));
  const st = rig.solve(expandHands(pose, lib, C.handSides)), ours = (t) => ap(st[t.bone].M, sub(t.rest, J[rig.BONE[t.bone].joint]));
  const rows = [];
  for (const [seg, a, b] of SEG) {
    if (![...a, ...b].every((n) => T[n])) continue;
    const sa = mid(...a.map((n) => T[n].to)), sb = mid(...b.map((n) => T[n].to)), oa = mid(...a.map((n) => ours(T[n]))), ob = mid(...b.map((n) => ours(T[n])));
    const s = deg(sa, sb), o = deg(oa, ob), d = wrap(o - s);
    rows.push(`  ${seg.padEnd(14)} still ${s.toFixed(0).padStart(5)}°  ours ${o.toFixed(0).padStart(5)}°  ${d >= 0 ? '+' : ''}${d.toFixed(0)}°${Math.abs(d) > tol ? '  <<' : ''}`);
  }
  console.log(`${name} (directions on screen: 0 forward, 90 down, −90 up; ours − still, << off by more than ${tol}°)\n${rows.join('\n')}`);
}
