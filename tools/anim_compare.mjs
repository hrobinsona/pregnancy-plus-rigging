// Two shots of one character frame by frame: the largest gap between any joint of the body (film px at 1080 wide) and
// how many frames the face differs. Proves a CUT is a cut: mum3 breathe-open-neutral (breathe-stroke's first 3.35 s with
// a neutral mouth) matched its source to 0.03 px once its drift was pinned to the 12 s loop's harmonics
// (`drift.freqs` = harmonics / D: a non-loop shot otherwise drifts at its own frequencies).
//   node tools/anim_compare.mjs <char> <animA> <animB> [--to seconds] [--tol 0.5]
import fs from 'node:fs';
import path from 'node:path';
const R = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..') + '/'; process.chdir(R);
const argv = process.argv.slice(2), opt = (k, d) => (argv.includes('--' + k) ? +argv[argv.indexOf('--' + k) + 1] : d);
const [ch, a1, a2] = argv;
if (!ch || !a1 || !a2) { console.error('usage: node tools/anim_compare.mjs <char> <animA> <animB> [--to s] [--tol px]'); process.exit(2); }
const { createRig } = await import(R + 'engine/rig.js'); const { expandHands } = await import(R + 'engine/handlib.js'); const { makeAnim } = await import(R + 'engine/anim.js');
const D = R + `characters/${ch}/`, C = (await import(D + 'character.js')).default, rig = createRig(C);
const hl = Object.fromEntries((C.handLibrary || []).map((h) => [h, JSON.parse(fs.readFileSync(`${D}poses/hands/${h}.json`))]));
const lib = Object.fromEntries(fs.readdirSync(D + 'poses').filter((f) => f.endsWith('.json')).map((f) => [f.slice(0, -5), expandHands(JSON.parse(fs.readFileSync(D + 'poses/' + f)), hl, C.handSides)]));
const spec = (a) => JSON.parse(fs.readFileSync(`${D}anims/${a}.json`)), S1 = spec(a1), S2 = spec(a2);
const A = makeAnim(S1, lib, { rig, C, quiet: true }), B = makeAnim(S2, lib, { rig, C, quiet: true });
const fps = S1.fps || 30, n = Math.round(opt('to', Math.min(S1.duration, S2.duration)) * fps), tol = opt('tol', 0.5);
let worst = 0, wf = 0, wj = '', face = 0, joints = 0;
for (let f = 0; f <= n; f++) {
  const p = A.poseAt(f / fps), q = B.poseAt(f / fps);
  if (JSON.stringify(p.face) !== JSON.stringify(q.face)) face++;
  const sp = rig.solve(p), sq = rig.solve(q);
  for (const k of Object.keys(sp)) {
    if (!sp[k]?.pos || !sq[k]?.pos) continue; joints++;
    const d = Math.hypot(sp[k].pos[0] - sq[k].pos[0], sp[k].pos[1] - sq[k].pos[1]) * 225;
    if (d > worst) { worst = d; wf = f; wj = k; }
  }
}
console.log(`${a1} vs ${a2}, frames 0–${n}: worst joint gap ${worst.toFixed(3)} px (${wj}, frame ${wf}; ${joints} joints compared); face differs on ${face} frames`);
console.log(worst <= tol ? `✓ the body matches within ${tol} px` : `✗ the body differs by more than ${tol} px`);
process.exit(worst <= tol ? 0 : 1);
