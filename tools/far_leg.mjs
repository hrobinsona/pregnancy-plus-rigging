// far_leg.mjs — where the FAR leg sits against the near one, per pose: the knee, ankle and toe offsets (far − near, film px
// at 225 px/H; + = forward / down) and the angle between the two thighs and the two shins. Side-on round 5, every lens: the
// far knee "a complete second ball" beside the near one, the far shin crossing behind it in an X ("twin legs"). The rule
// from the stills (lesson 65): the legs PARALLEL (thighs within ~4°, shins within ~4°), the far knee showing only as a
// 15–30 px sliver past the near knee's outline; seated the far leg a little BEHIND the near one, kneeling and on all fours
// on the far floor line (up) and a little forward.
//   node tools/far_leg.mjs <char> <pose>...  (poses under poses/, e.g. side/kneel)
import fs from 'node:fs';
import { createRig } from '../engine/rig.js';
import { expandHands } from '../engine/handlib.js';
const [char, ...poses] = process.argv.slice(2), D = `characters/${char}/`;
const C = (await import(`../${D}character.js`)).default, rig = createRig(C), PX = 225;
const hl = Object.fromEntries((C.handLibrary || []).map((h) => [h, JSON.parse(fs.readFileSync(`${D}poses/hands/${h}.json`))]));
const dir = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI, wrap = (d) => ((d + 540) % 360) - 180;
for (const p of poses) {
  const st = rig.solve(expandHands(JSON.parse(fs.readFileSync(`${D}poses/${p}.json`)), hl, C.handSides));
  const at = (s, j) => (j === 'hip' ? st[`thigh.${s}`].pos : j === 'knee' ? st[`shin.${s}`].pos : j === 'ankle' ? st[`foot.${s}`].pos : st[`toe.${s}`].pos);
  const off = (j) => { const a = at('near', j), b = at('far', j); return `${j} ${((b[0] - a[0]) * PX).toFixed(0).padStart(4)},${((b[1] - a[1]) * PX).toFixed(0).padStart(4)}`; };
  const ang = (j0, j1) => wrap(dir(at('far', j0), at('far', j1)) - dir(at('near', j0), at('near', j1))).toFixed(0).padStart(4);
  console.log(`${p.padEnd(18)} ${['hip', 'knee', 'ankle', 'toe'].map(off).join('  ')}   thighs ${ang('hip', 'knee')}°  shins ${ang('knee', 'ankle')}°`);
}
