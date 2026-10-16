// Where the feet are, every --step s of a shot (film px at 1080 wide: 1 H = 225 px): each ankle and ball, and the near
// hip. A planted foot holds within ~1 px; a hip shift that lifts or sinks the feet shows here before it shows on the film
// (mum3 ease-sway: both feet 3 px off the floor at the forward sway until spec.plantFeetSink, lesson 60).
//   node tools/feet_probe.mjs <char> <anim> [--step 0.5]
import fs from 'node:fs';
import path from 'node:path';
const R = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..') + '/'; process.chdir(R);
const [ch, an] = process.argv.slice(2), step = +(process.argv[process.argv.indexOf('--step') + 1] || 0) || 0.5;
if (!ch || !an) { console.error('usage: node tools/feet_probe.mjs <char> <anim> [--step 0.5]'); process.exit(2); }
const { createRig } = await import(R + 'engine/rig.js'); const { expandHands } = await import(R + 'engine/handlib.js'); const { makeAnim } = await import(R + 'engine/anim.js');
const D = R + `characters/${ch}/`, C = (await import(D + 'character.js')).default, rig = createRig(C);
const hl = Object.fromEntries((C.handLibrary || []).map((h) => [h, JSON.parse(fs.readFileSync(`${D}poses/hands/${h}.json`))]));
// (the poses the shot names, wherever they live: a move's keys are under poses/side/move/<name>/, tools/side_move.mjs)
const spec = JSON.parse(fs.readFileSync(`${D}anims/${an}.json`)), names = new Set(); JSON.stringify(spec, (k, v) => { if ((k === 'pose' || k === 'plant' || k === 'propsFrom' || k === 'plantFeetRef') && typeof v === 'string') names.add(v); return v; });
const lib = Object.fromEntries([...names].filter((p) => fs.existsSync(`${D}poses/${p}.json`)).map((p) => [p, expandHands(JSON.parse(fs.readFileSync(`${D}poses/${p}.json`)), hl, C.handSides)]));
const A = makeAnim(spec, lib, { rig, C, quiet: true }), L = C.roles.legs;
const px = (v) => (v * 225).toFixed(1), rows = [];
for (let t = 0; t <= spec.duration + 1e-9; t += step) {
  const st = rig.solve(A.poseAt(t)), J = (b, j) => rig.carry(st, b, j);
  const r = { t, aN: J(L.near.shin, L.near.ankle), bN: J(L.near.foot, L.near.ball), aF: J(L.far.shin, L.far.ankle), bF: J(L.far.foot, L.far.ball), hip: J(L.near.thigh, L.near.hip) };
  rows.push(r);
  console.log(t.toFixed(2), ' ankle N', r.aN.map(px).join(','), ' ball N', r.bN.map(px).join(','), '  ankle F', r.aF.map(px).join(','), ' ball F', r.bF.map(px).join(','), '  hip', r.hip.map(px).join(','));
}
const span = (k, i) => (Math.max(...rows.map((r) => r[k][i])) - Math.min(...rows.map((r) => r[k][i]))) * 225;
console.log(`feet drift (max − min, px): ankle N ${span('aN', 0).toFixed(1)} × ${span('aN', 1).toFixed(1)}, ball N ${span('bN', 0).toFixed(1)} × ${span('bN', 1).toFixed(1)}, ankle F ${span('aF', 0).toFixed(1)} × ${span('aF', 1).toFixed(1)}, ball F ${span('bF', 0).toFixed(1)} × ${span('bF', 1).toFixed(1)}; hip travel ${span('hip', 0).toFixed(1)} × ${span('hip', 1).toFixed(1)}`);
