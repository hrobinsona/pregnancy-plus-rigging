// far_leg.mjs — where the FAR leg sits against the near one, per pose: the knee, ankle and toe offsets (far − near, film px
// at 225 px/H; + = forward / down) and the angle between the two thighs and the two shins. Side-on round 5, every lens: the
// far knee "a complete second ball" beside the near one, the far shin crossing behind it in an X ("twin legs"). The rule
// from the stills (lesson 65): the legs PARALLEL (thighs within ~4°, shins within ~4°), the far knee showing only as a
// 15–30 px sliver past the near knee's outline; seated the far leg a little BEHIND the near one, kneeling and on all fours
// on the far floor line (up) and a little forward.
//   node tools/far_leg.mjs <char> <pose>...  (poses under poses/, e.g. side/kneel)
//   node tools/far_leg.mjs <char> <pose> --set knee=dx,dy,ankle=dx,dy   (H, far − near, + forward / down; in place)
// --set PLACES the far leg where the still draws it, by measure: the far knee and ankle at those offsets from the near
// ones, each by its segment's direction AND drawn length (pose.scale: a thigh or shin pointing away from us is drawn
// shorter), the far foot and toe kept at the near ones' drawn angles (both flat). Read the offsets off the still (its
// landmarks through tools/side_dirs.mjs or by eye on its legs at 1:1; MediaPipe confuses a hidden far toe with the near
// one). Why: the twin far leg (parallel, raised onto the far floor line) is right standing and kneeling, but a squat's
// feet stand wide, so its far foot sits well ahead and up (0.3, −0.4 H) under a knee hidden behind the near one, and a
// chair's far foot is drawn set back, the far shin a strip behind the near one: the twin drew "legs not separated enough…
// the knee forms at a weird place/angle" (squat) and "far away knee/leg at the wrong position… lands awkwardly" (sit-chair,
// Harry, side-on round 8, lesson 69).
import fs from 'node:fs';
import { createRig } from '../engine/rig.js';
import { expandHands } from '../engine/handlib.js';
const [char, ...rest] = process.argv.slice(2), poses = rest.filter((a, i) => !a.startsWith('--') && rest[i - 1] !== '--set'), D = `characters/${char}/`;
const C = (await import(`../${D}character.js`)).default, rig = createRig(C), PX = 225;
const hl = Object.fromEntries((C.handLibrary || []).map((h) => [h, JSON.parse(fs.readFileSync(`${D}poses/hands/${h}.json`))]));
const dir = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI, wrap = (d) => ((d + 540) % 360) - 180;
const si = process.argv.indexOf('--set');
if (si > 0) {
  const p = poses.find((q) => !q.includes('=')), set = Object.fromEntries(process.argv[si + 1].split(/,(?=[a-z])/).map((kv) => { const [k, v] = kv.split('='); return [k, v.split(',').map(Number)]; }));
  const f = `${D}poses/${p}.json`, raw = JSON.parse(fs.readFileSync(f)), bones = { ...raw.bones }, scale = { ...(raw.scale || {}) };
  const solve = () => rig.solve(expandHands({ ...raw, bones, scale }, hl, C.handSides)), st0 = solve();
  const P = (st, b) => st[b].pos, add = (a, d) => [a[0] + d[0], a[1] + d[1]], len = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const K = add(P(st0, 'shin.near'), set.knee), A = add(P(st0, 'foot.near'), set.ankle);
  const fit = (id, want) => {   // the bone's value whose drawn direction is `want` (deg), by a 1D search over its range
    const B = rig.BONE[id], lo = B.min ?? -180, hi = B.max ?? 180, aim = { 'thigh.far': 'shin.far', 'shin.far': 'foot.far', 'foot.far': 'toe.far' }[id];
    const err = (v) => { bones[id] = v; const st = solve(); return Math.abs(((dir(P(st, id), aim ? P(st, aim) : null) - want + 540) % 360) - 180); };
    let best = bones[id] ?? 0, be = err(best);
    for (let v = lo; v <= hi; v += 1) { const e = err(v); if (e < be) { be = e; best = v; } }
    for (let sp = 0.5; sp > 0.01; sp /= 2) for (const v of [best - sp, best + sp]) { if (v < lo || v > hi) continue; const e = err(v); if (e < be) { be = e; best = v; } }
    bones[id] = Math.round(best * 10) / 10; return be;
  };
  // each segment: its direction, then its drawn length (the drawn length isn't the rest length × scale exactly: the
  // profile turn foreshortens the legs too), corrected over a few passes
  const place = (id, child, from, to) => {
    let e = 0;
    for (let k = 0; k < 4; k++) {
      e = fit(id, dir(from(), to));
      const st = solve(), got = len(P(st, id), P(st, child)), s0 = scale[id]?.[0] ?? 1;
      scale[id] = [+(s0 * len(from(), to) / got).toFixed(3), scale[id]?.[1] ?? 1];
    }
    return fit(id, dir(from(), to));
  };
  const e1 = place('thigh.far', 'shin.far', () => P(solve(), 'thigh.far'), K);
  const e2 = place('shin.far', 'foot.far', () => P(solve(), 'shin.far'), A), stN = solve();
  const e3 = fit('foot.far', dir(P(stN, 'foot.near'), P(stN, 'toe.near')));
  bones['toe.far'] = bones['toe.near'] ?? 0;   // (the feet at one drawn angle, the toes bent alike: both flat)
  const out = { ...raw, bones, scale, note: (raw.note ? raw.note + '; ' : '') + `far_leg --set ${process.argv[si + 1]}` };
  fs.writeFileSync(f, JSON.stringify(out, null, 1));
  console.log(`far_leg --set ${p}: thigh.far ${bones['thigh.far']} ×${scale['thigh.far'][0]}, shin.far ${bones['shin.far']} ×${scale['shin.far'][0]}, foot.far ${bones['foot.far']}${Math.max(e1, e2, e3) > 1 ? ` (${Math.max(e1, e2, e3).toFixed(1)}° off: at a limit)` : ''}`);
  poses.length = 0; poses.push(p);
}
for (const p of poses) {
  const st = rig.solve(expandHands(JSON.parse(fs.readFileSync(`${D}poses/${p}.json`)), hl, C.handSides));
  const at = (s, j) => (j === 'hip' ? st[`thigh.${s}`].pos : j === 'knee' ? st[`shin.${s}`].pos : j === 'ankle' ? st[`foot.${s}`].pos : st[`toe.${s}`].pos);
  const off = (j) => { const a = at('near', j), b = at('far', j); return `${j} ${((b[0] - a[0]) * PX).toFixed(0).padStart(4)},${((b[1] - a[1]) * PX).toFixed(0).padStart(4)}`; };
  const ang = (j0, j1) => wrap(dir(at('far', j0), at('far', j1)) - dir(at('near', j0), at('near', j1))).toFixed(0).padStart(4);
  console.log(`${p.padEnd(18)} ${['hip', 'knee', 'ankle', 'toe'].map(off).join('  ')}   thighs ${ang('hip', 'knee')}°  shins ${ang('knee', 'ankle')}°`);
}
