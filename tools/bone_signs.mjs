// bone_signs.mjs — what +deg on a bone does ON SCREEN: how far and which way the bone's end (its aim joint) moves, in film
// px (1 H = 225), beside the bone's limits. Run it before writing a recipe's `--add bone=…` that claims a direction
// ("shoulders up", "a soft knee"): sign conventions differ per bone AND per side, and recipes got them backwards twice —
// mum3 ease-sway's `shin.near=+3` "soft knee" was a clamped hyperextension (lesson 60); mum3q look-up's n-up
// `clavicle.far=2` "shoulders up a touch" LOWERED her far shoulder 2.4 px for ten versions, hiding her far arm behind her
// bust as she looked up (lesson 61).
//   node tools/bone_signs.mjs <char> [pose] [--bones clavicle,shin] [--deg 2]
// pose: a pose name (default rest). --bones: ids or prefixes (default every bone). A bone held at a limit prints CLAMPED.
import fs from 'node:fs';
import path from 'node:path';
const R = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..') + '/'; process.chdir(R);
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const pos = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const [ch, poseName] = pos, deg = +opt('--deg', 2), only = opt('--bones', '').split(',').filter(Boolean);
if (!ch) { console.error('usage: node tools/bone_signs.mjs <char> [pose] [--bones clavicle,shin] [--deg 2]'); process.exit(2); }
const { createRig } = await import(R + 'engine/rig.js'); const { expandHands } = await import(R + 'engine/handlib.js');
const D = R + `characters/${ch}/`, C = (await import(D + 'character.js')).default, rig = createRig(C);
const hl = Object.fromEntries((C.handLibrary || []).map((h) => [h, JSON.parse(fs.readFileSync(`${D}poses/hands/${h}.json`))]));
const pose = poseName && poseName !== 'rest' ? expandHands(JSON.parse(fs.readFileSync(`${D}poses/${poseName}.json`)), hl, C.handSides) : { bones: {} };
const s0 = rig.solve(pose), px = 225;
const dir = (d, pos_, neg) => (Math.abs(d) < 0.05 ? '' : `${d > 0 ? pos_ : neg} ${Math.abs(d).toFixed(1)}`);
console.log(`${ch} ${poseName || 'rest'}: +${deg}° on each bone moves its end (film px; y down)`);
for (const b of rig.BONES) {
  if (only.length && !only.some((o) => b.id === o || b.id.startsWith(o))) continue;
  const v = pose.bones?.[b.id] ?? 0, q = { ...pose, bones: { ...pose.bones, [b.id]: v + deg } }, s1 = rig.solve(q);
  const e0 = rig.carry(s0, b.id, b.aim), e1 = rig.carry(s1, b.id, b.aim), dx = (e1[0] - e0[0]) * px, dy = (e1[1] - e0[1]) * px;
  const clamped = (b.max !== undefined && v + deg > b.max) || (b.min !== undefined && v + deg < b.min);
  const lim = `[${b.min ?? '−∞'}, ${b.max ?? '∞'}]`;
  console.log(`${b.id.padEnd(16)} at ${(+v).toFixed(1).padStart(6)} ${lim.padEnd(12)} → ${[dir(-dy, 'up', 'down'), dir(dx, 'right', 'left')].filter(Boolean).join(', ') || 'no move'}${clamped ? '  CLAMPED' : ''}`);
}
