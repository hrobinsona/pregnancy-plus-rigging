// hand_keys.mjs — solve an arm so its HAND lands on three points marked on a still, with the arm kept hidden behind
// the body. Called by tools/hand_place.py --keys (which marks nothing itself: the points are measured by eye on the still
// and recorded in refs/fit_keys.sh; the body silhouette comes from renders).
//   node tools/hand_keys.mjs <char> <pose> --side far --keys wx,wy,kx,ky,tx,ty --sil out/_sil.json [--hand <shape>]
//        [--bones upperArm,forearm,hand,armAbd,armRot,foreRot] [--seed a,b,...]...
// keys (still px): W the wrist (where the hand comes out from behind her), K the middle knuckle, T the centroid of the
// four fingertips. cost = rms px over W, K, T + a penalty for each sample of the upper arm and forearm that comes closer
// than its half-width to the body's outline or leaves it (the last 20% of the forearm may: the wrist emerges there) + a
// weak pull to the seed (an arm has many ways to put a hand somewhere; keep the one nearest the fitted arm).
// Prints {"x": [...], "cost": c, "rms": px, "out": px outside} (best over the seeds) on stdout.
import fs from 'node:fs';
import { createRig } from '../engine/rig.js';
import { expandHands } from '../engine/handlib.js';
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const all = (k) => argv.flatMap((v, i) => (argv[i - 1] === '--' + k ? [v] : v.startsWith(`--${k}=`) ? [v.slice(k.length + 3)] : []));
const [char, poseName] = argv;
const side = arg('side', 'far'), D = `characters/${char}/`;
const C = (await import(`../${D}character.js`)).default, rig = createRig(C);
const lib = Object.fromEntries(C.handLibrary.map((h) => [h, JSON.parse(fs.readFileSync(`${D}poses/hands/${h}.json`))]));
const base = JSON.parse(fs.readFileSync(`${D}poses/${poseName}.json`));
if (arg('hand')) base.hands = { ...(base.hands || {}), [side]: arg('hand') };
const names = arg('bones', 'upperArm,forearm,hand,armAbd,armRot,foreRot').split(',').map((b) => `${b}.${side}`);
const K = arg('keys').split(',').map(Number), KW = [K[0], K[1]], KK = [K[2], K[3]], KT = [K[4], K[5]];
const sil = JSON.parse(fs.readFileSync(arg('sil'))), y0 = sil.y0;          // sil.rows[y - y0] = [[x0, x1], ...] inside the body
const G = C.ref.groundPx, Hpx = C.ref.Hpx, px = (p) => [G[0] + p[0] * Hpx, G[1] + p[1] * Hpx];
const margin = (p) => {                                                    // px inside the outline (negative: outside)
  const r = sil.rows[Math.round(p[1]) - y0]; if (!r) return -50;
  let best = -50; for (const [a, b] of r) best = Math.max(best, Math.min(p[0] - a, b - p[0])); return best;
};
const tips = [1, 2, 3, 4].map((i) => [`hand.${side}.f${i}c`, `hand.${side}.f${i}t`]);
function measure(x) {
  const p = { ...base, bones: { ...base.bones } }; names.forEach((n, i) => { p.bones[n] = x[i]; });
  const st = rig.solve(expandHands(p, lib, C.handSides));
  const S = px(st[`upperArm.${side}`].pos), E = px(st[`forearm.${side}`].pos), W = px(st[`hand.${side}`].pos), Kn = px(st[`hand.${side}.f2a`].pos);
  const T = tips.map(([b, j]) => px(rig.carry(st, b, j))).reduce((a, q) => [a[0] + q[0] / 4, a[1] + q[1] / 4], [0, 0]);
  return { S, E, W, K: Kn, T };
}
const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
function cost(x, seed) {
  const m = measure(x), rms = Math.sqrt((d2(m.W, KW) + d2(m.K, KK) + d2(m.T, KT)) / 3);
  let out = 0;
  for (let u = 0; u <= 1; u += 0.1) { const q = [m.S[0] + u * (m.E[0] - m.S[0]), m.S[1] + u * (m.E[1] - m.S[1])]; out += Math.max(0, 9 - margin(q)) ** 2; }
  for (let u = 0; u <= 0.8; u += 0.1) { const q = [m.E[0] + u * (m.W[0] - m.E[0]), m.E[1] + u * (m.W[1] - m.E[1])]; out += Math.max(0, 7 - margin(q)) ** 2; }
  const reg = x.reduce((a, v, i) => a + (v - seed[i]) ** 2, 0) * 0.002;
  return { c: rms + 0.5 * Math.sqrt(out) + reg, rms, out: Math.sqrt(out) };
}
function nelderMead(f, x0, size = 10, iters = 600) {
  const n = x0.length; let S = [x0, ...x0.map((_, i) => x0.map((v, j) => v + (i === j ? size : 0)))], F = S.map(f);
  for (let it = 0; it < iters; it++) {
    const o = S.map((_, i) => i).sort((a, b) => F[a] - F[b]); S = o.map((i) => S[i]); F = o.map((i) => F[i]);
    if (F[n] - F[0] < 1e-4) break;
    const c = x0.map((_, j) => S.slice(0, n).reduce((a, s) => a + s[j], 0) / n), at = (k) => c.map((v, j) => v + k * (S[n][j] - v));
    const r = at(-1), fr = f(r);
    if (fr < F[0]) { const e = at(-2), fe = f(e); [S[n], F[n]] = fe < fr ? [e, fe] : [r, fr]; }
    else if (fr < F[n - 1]) { S[n] = r; F[n] = fr; }
    else { const k = at(0.5), fk = f(k); if (fk < F[n]) { S[n] = k; F[n] = fk; } else { S = S.map((s) => S[0].map((v, j) => v + 0.5 * (s[j] - v))); F = S.map(f); } }
  }
  return S[0];
}
// seeds: the --seed arms if given (the fit's own arm is unreliable exactly when this tool is needed), else the pose's own
const seeds = all('seed').length ? all('seed').map((s) => s.split(',').map(Number)) : [names.map((n) => base.bones[n] ?? 0)];
let best = null;
for (const sd of seeds) {
  let x = sd; for (let r = 0; r < 3; r++) x = nelderMead((y) => cost(y, sd).c, x, r ? 4 : 12);   // restarts shake it out of a collapsed simplex
  const c = cost(x, sd); process.stderr.write(`  from ${sd.join(',')}: ${x.map((v) => v.toFixed(1)).join(',')} → rms ${c.rms.toFixed(1)} px, arm outside ${c.out.toFixed(1)}\n`);
  if (!best || c.c < best.c) best = { x, ...c };
}
const m = measure(best.x);
console.log(JSON.stringify({ names, x: best.x.map((v) => +v.toFixed(1)), cost: +best.c.toFixed(2), rms: +best.rms.toFixed(1), out: +best.out.toFixed(1), at: Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v.map(Math.round)])) }));
