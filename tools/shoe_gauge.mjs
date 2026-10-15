// shoe_gauge.mjs — how deep each drawn shoe is: the shoe's side, from its opening down to its sole, at its slimmest across
// the middle of the foot (35–65 % of the way from heel to tip, measured across the heel→tip axis on the POSED outline), as
// a share of the near shoe's at rest (the master's: 0.12–0.14 H).
//   node tools/shoe_gauge.mjs --char mum3 [pose …]      (no pose: rest; e.g. side/walk-pass side/squat)
// Why: the far shoe had been drawn with the near one's opening from its own, lower counter, 0.064 H deep at mid-foot where
// the master's is 0.11, and every side-on pose shows that foot whole: Harry, round 8, "the shoe… cut off at the bottom
// making the foot look very thin", "one shoe always looks really thin/cut off" (lesson 69). qa_checks.mjs gate `shoes`
// wants ≥ 0.75 on every frame.
import fs from 'node:fs';
import { createRig } from '../engine/rig.js';
import { expandHands } from '../engine/handlib.js';
import { ap } from '../engine/geom.js';

const bez = (a, b, c, d, t) => { const u = 1 - t; return [0, 1].map((k) => u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * d[k]); };
/** the part's outline, posed (skinned parts carry posed geometry, rigid ones a matrix), sampled densely */
export function outline(p, n = 12) {
  const g = p.geom, m = (v) => (p.M ? ap(p.M, v) : v), P = g.P.length, out = [];
  for (let i = 0; i < P; i++) { const j = (i + 1) % P; for (let k = 0; k < n; k++) out.push(m(bez(g.P[i], g.hout?.[i] ?? g.P[i], g.hin?.[j] ?? g.P[j], g.P[j], k / n))); }
  return out;
}
/** the shoe's slimmest depth (H) across the middle of the foot: the outline's extent across the heel→tip axis at each
 *  station u in [lo, hi] of its length; heel and tip are the part's named anchors (names.heel, names.tip) */
export function shoeDepth(p, lo = 0.35, hi = 0.65) {
  const pts = outline(p), N = p.names || {}, m = (v) => (p.M ? ap(p.M, v) : v);
  const H = m(p.geom.P[N.heel ?? 12]), T = m(p.geom.P[N.tip ?? 8]), ax = [T[0] - H[0], T[1] - H[1]], L = Math.hypot(...ax), e = [ax[0] / L, ax[1] / L], nrm = [-e[1], e[0]];
  const uv = pts.map((q) => [((q[0] - H[0]) * e[0] + (q[1] - H[1]) * e[1]) / L, (q[0] - H[0]) * nrm[0] + (q[1] - H[1]) * nrm[1]]);
  let min = Infinity, at = lo;
  for (let u = lo; u <= hi + 1e-9; u += 0.05) {
    const xs = [];   // where the closed outline crosses the station: its extent across the axis there
    for (let i = 0; i < uv.length; i++) { const a = uv[i], b = uv[(i + 1) % uv.length]; if ((a[0] - u) * (b[0] - u) <= 0 && a[0] !== b[0]) xs.push(a[1] + (b[1] - a[1]) * (u - a[0]) / (b[0] - a[0])); }
    if (xs.length >= 2) { const d = Math.max(...xs) - Math.min(...xs); if (d < min) { min = d; at = u; } }
  }
  return { depth: min, at, length: L };
}
/** the reference depth: the near shoe at rest */
export function restDepth(rig) { const s = rig.build({}).find((p) => p.id === 'shoe.near'); return s ? shoeDepth(s).depth : null; }

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
  const char = arg('char', 'mum3'), D = `characters/${char}/`, C = (await import(`../${D}character.js`)).default, rig = createRig(C);
  const lib = Object.fromEntries((C.handLibrary || []).map((h) => [h, JSON.parse(fs.readFileSync(`${D}poses/hands/${h}.json`))]));
  const poses = process.argv.slice(2).filter((a, i, A) => !a.startsWith('--') && !(A[i - 1] || '').startsWith('--'));
  const ref = restDepth(rig); console.log(`near shoe at rest: ${ref.toFixed(3)} H deep at mid-foot`);
  for (const pn of poses.length ? poses : ['rest']) {
    const pose = pn === 'rest' ? {} : expandHands(JSON.parse(fs.readFileSync(`${D}poses/${pn}.json`)), lib, C.handSides);
    const parts = rig.build(pose);
    console.log(pn.padEnd(18), ['near', 'far'].map((s) => { const p = parts.find((q) => q.id === `shoe.${s}`); if (!p) return `${s} —`; const d = shoeDepth(p); return `${s} ${d.depth.toFixed(3)} H (${(100 * d.depth / ref).toFixed(0)}%) at ${(100 * d.at).toFixed(0)}%`; }).join('   '));
  }
}
