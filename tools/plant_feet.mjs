// plant_feet.mjs <char> <pose> [...] — FOOT LOCK for key poses: shift root so the feet (heels + balls) sit where they sit
// at rest. Fitted keys inherit the generator's framing drift (each ref places her a few % differently) and a fitted knee
// bend lowers the hips; without this the character slides and sinks between keys. Edits the pose files in place.
import fs from 'node:fs';
import { createRig } from '../engine/rig.js';
const [char, ...names] = process.argv.slice(2);
const C = (await import(`../characters/${char}/character.js`)).default, rig = createRig(C), J = C.joints;
const pts = [['foot.near', 'ankleNear'], ['foot.near', 'ballNear'], ['foot.far', 'ankleFar'], ['foot.far', 'ballFar']];
const at = (pose) => { const st = rig.solve(pose); return pts.map(([b, j]) => rig.carry(st, b, j)); };
const rest = at({});
for (const n of names) {
  const f = `characters/${char}/poses/${n}.json`, p = JSON.parse(fs.readFileSync(f));
  const r0 = p.root || [0, 0], now = at(p);
  const dx = rest.reduce((a, q, i) => a + q[0] - now[i][0], 0) / pts.length;
  const dy = Math.max(...now.map((q) => q[1])) - Math.max(...rest.map((q) => q[1]));   // lowest point back on the ground
  p.root = [+(r0[0] + dx).toFixed(4), +(r0[1] - dy).toFixed(4)];
  fs.writeFileSync(f, JSON.stringify(p, null, 1));
  console.log(`${n}: root ${r0.map((v) => v.toFixed(3))} → ${p.root.map((v) => v.toFixed(3))}`);
}
