// pose_dirs.mjs — set bones by the DIRECTION they are drawn in on screen (a posture read off a still, or chosen).
//   node tools/pose_dirs.mjs <char> <pose> [--out <pose>] --dir shin.near=130,thigh.near=-15,pelvis=-60 [--twin legs]
// Angle in degrees on screen from the bone's joint to its aim joint: 0 = forward (she faces right), 90 = straight down,
// -90 = straight up. Each named bone is set in parent-before-child order, by a 1D search over its range (so parents
// moved first carry their children), everything else is kept. --twin legs copies the near leg's angles to the far leg
// (fit_pose --twin legs). A pose's contacts are put back on the floor afterwards (tools/floor_pose.mjs).
// Why: the stills draw her with their own proportions, so a fit to their landmarks is a compromise (the bend still's
// longer arms reach the floor from a squat ours can't); where the posture matters more than the still's points, the
// posture is written down as segment directions and the contacts solved after.
import fs from 'node:fs';
import { createRig } from '../engine/rig.js';
import { expandHands } from '../engine/handlib.js';
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const [char, poseName] = argv;
if (!char || !poseName || !arg('dir')) { console.error('usage: node tools/pose_dirs.mjs <char> <pose> --dir bone=deg,... [--out pose] [--twin legs]'); process.exit(2); }
const C = (await import(`../characters/${char}/character.js`)).default, rig = createRig(C), D = `characters/${char}/`;
const lib = Object.fromEntries((C.handLibrary || []).map((h) => [h, JSON.parse(fs.readFileSync(`${D}poses/hands/${h}.json`))]));
const raw = JSON.parse(fs.readFileSync(`${D}poses/${poseName}.json`)), bones = { ...raw.bones };
const TWIN = arg('twin') === 'legs', twin = (b) => { if (TWIN) for (const k of ['thigh', 'shin', 'foot', 'toe', 'hipAbd']) if (`${k}.near` in b) b[`${k}.far`] = b[`${k}.near`]; return b; };
const want = Object.fromEntries(arg('dir').split(',').map((kv) => { const [b, d] = kv.split('='); if (!rig.BONE[b]) throw new Error('no bone ' + b); return [b, +d]; }));
const order = C.bones.map((b) => b.id).filter((id) => id in want);
const drawn = (bs, id) => { const st = rig.solve(expandHands({ ...raw, bones: twin({ ...bs }) }, lib, C.handSides)), B = rig.BONE[id];
  const p = st[id].pos, q = st[B.aim]?.pos ?? (() => { const M = st[id].M, a = rig.J[B.aim], j = rig.J[B.joint]; return [M[0] * (a[0] - j[0]) + M[2] * (a[1] - j[1]) + M[4], M[1] * (a[0] - j[0]) + M[3] * (a[1] - j[1]) + M[5]]; })();
  return Math.atan2(q[1] - p[1], q[0] - p[0]) * 180 / Math.PI; };
const dA = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
const rep = [];
for (const id of order) {
  const B = rig.BONE[id], lo = B.min ?? -180, hi = B.max ?? 180;
  let best = bones[id] ?? 0, be = dA(drawn(bones, id), want[id]);
  for (let v = lo; v <= hi; v += 1) { const e = dA(drawn({ ...bones, [id]: v }, id), want[id]); if (e < be) { be = e; best = v; } }
  for (let s = 0.5; s > 0.01; s /= 2) for (const v of [best - s, best + s]) { if (v < lo || v > hi) continue; const e = dA(drawn({ ...bones, [id]: v }, id), want[id]); if (e < be) { be = e; best = v; } }
  bones[id] = Math.round(best * 10) / 10; rep.push(`${id} ${bones[id]} (drawn ${drawn(bones, id).toFixed(1)}°${be > 1 ? `, ${be.toFixed(1)}° off: at its limit` : ''})`);
}
const out = { ...raw, bones: twin(bones), note: (raw.note ? raw.note + '; ' : '') + `pose_dirs: ${arg('dir')}` };
out.fitFrom = raw.fitFrom || poseName;
fs.writeFileSync(`${D}poses/${arg('out', poseName)}.json`, JSON.stringify(out, null, 1));
console.log(`pose_dirs ${arg('out', poseName)}: ` + rep.join(', '));
