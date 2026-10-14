// hand_keys.mjs — solve an arm so its HAND lands on points marked on a still, with the arm kept hidden behind the body.
// Called by tools/hand_place.py --keys (which marks nothing itself: the points are measured by eye on the still and
// recorded in refs/fit_keys.sh; the body silhouette comes from renders).
//   node tools/hand_keys.mjs <char> <pose> --side far --keys wx,wy[,kx,ky],tx,ty [--tips x1,y1,…,x4,y4] --sil out/_sil.json [--hand <shape>]
//        [--bones upperArm,forearm,hand,armAbd,armRot,foreRot] [--seed a,b,...]... [--restarts N] [--natural [--palm-down D]]
//        [--fore fx,fy] [--elbow ex,ey] [--hide arm|upper|none] [--margin ua,fa] [--hang 0.55] [--hand-len 0.25]
// keys (still px): W the wrist (where the hand comes out from behind her), K the middle knuckle (optional), T the centroid
// of the four fingertips. cost = rms px over the keys + a penalty for each sample of the upper arm and forearm that comes
// closer than its drawn half-width to the body's outline or leaves it (the last 20% of the forearm may: the wrist
// emerges there; so may the upper arm's top fifth, the shoulder's cap is part of the drawing) + a weak pull to the seed (an arm has many ways to put a hand somewhere; keep the one nearest the fitted arm).
// --fore: a point on a forearm the still SHOWS — its distance to the drawn forearm joins the rms, and --hide upper then
// keeps only the upper arm hidden. --elbow: the still's elbow, a key too. --hide none: a VISIBLE arm (the near hand
// curled over the top of the bump, q_k4_down: the estimator's wrist is right, but the drawn forearm is shorter than the
// illustration's, so a joint fit leaves the hand 50 px low; W, K, T and the elbow put the hand where the still has it).
// --natural: the arm must also be one a body can make, judged in 3D (rig.js arm3's frame: F forward, D down, L out to the
// side): the upper arm hangs (D ≥ --hang, default 0.55; lower it for an elbow lifted out to the side) with the elbow out at her side (L ≥ 0.1, not through her chest), and the BACK
// of the hand faces us (the drawn hand is always its back view). Without it the best rms on q_k3 put the elbow inside
// her bust with the upper arm reaching across her chest toward the camera (PIPELINE lesson 49).
// --hand-len L (with --natural): the hand's drawn length (a3.len) ≥ L. An illustration draws a hand resting on her nearly
// unforeshortened, whatever the 3D says (q_k4_down_0's top hand); a hand solved pointing at the camera (0.68) read as a
// stubby mitten in flat style (v6 draft, natural lens: "a block, three thick grooves"). 0.9 for a hand on the bump.
// --palm-down D (with --natural): the palm normal's screen-down component (a3.ncam[1]) ≥ D. A hand lying on the TOP of the
// dome, seen from the front, faces down onto it; then its curl bends the fingers down over the dome ON SCREEN. With the
// palm normal pointing mostly away from us (q_k4_down's first solve: ncam (−0.41, 0.39, 0.82)) a 3D curl only
// foreshortens the fingers: "straight planks", "a mitten" (natural lens, v6 rounds 1–3). ~0.6 for a hand on top of the bump.
// --restarts N: N deterministic random seeds over the bones' ranges (with --natural there is no trustworthy fitted arm).
// --tips x1,y1,…,x4,y4: each fingertip (index → little) on the still, in place of T's centroid. The centroid leaves the hand
// free to roll about it: v8 met T to 1 px with its tips stacked straight down (knuckle line 12° off vertical) where the still
// steps them along a diagonal (34°), "fingers too flat, bunched" (natural lens; lesson 54).
// Leave K out when the still's palm is foreshortened more than its fingers (a hand curving over the dome toward us):
// the drawn fingers never foreshorten, so W, K and T can't all be met (q_k3: 22 px rms with K, 3 px without).
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
const BONE = Object.fromEntries(C.bones.map((b) => [b.id, b]));
const names = arg('bones', 'upperArm,forearm,hand,armAbd,armRot,foreRot').split(',').map((b) => `${b}.${side}`);
const K = arg('keys').split(',').map(Number), KW = [K[0], K[1]], KK = K.length === 6 ? [K[2], K[3]] : null, KT = K.slice(-2);
const natural = argv.includes('--natural'), SL = +arg('slack', 8), HANG = +arg('hang', 0.55), HLEN = +arg('hand-len', 0.25), PDOWN = +arg('palm-down', -1);
const KT4 = arg('tips') ? arg('tips').split(',').map(Number) : null;
const KF = arg('fore') ? arg('fore').split(',').map(Number) : null, KE = arg('elbow') ? arg('elbow').split(',').map(Number) : null, hide = arg('hide', 'arm'), hideFore = hide === 'arm';
const segD2 = (p, a, b) => { const d = [b[0] - a[0], b[1] - a[1]], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / ((d[0] ** 2 + d[1] ** 2) || 1))); return d2(p, [a[0] + t * d[0], a[1] + t * d[1]]); };
const sil = JSON.parse(fs.readFileSync(arg('sil'))), y0 = sil.y0;          // sil.rows[y - y0] = [[x0, x1], ...] inside the body
const G = C.ref.groundPx, Hpx = C.ref.Hpx, px = (p) => [G[0] + p[0] * Hpx, G[1] + p[1] * Hpx];
const margin = (p) => {                                                    // px inside the outline (negative: outside)
  const r = sil.rows[Math.round(p[1]) - y0]; if (!r) return -50;
  let best = -50; for (const [a, b] of r) best = Math.max(best, Math.min(p[0] - a, b - p[0])); return best;
};
// hidden means the arm's EDGES stay inside: the margins are the drawn half-widths (params P.arm/armFar .w, the widest of
// front/back; mum3q's far upper arm is 31 px), the forearm's tapering to its wrist (q_k3 with a flat 9 px: the upper
// arm's front edge showed in the notch under her bust). --margin ua,fa overrides (px).
const PP = C.params?.P ?? C.params, AW = (PP?.[side === 'far' ? 'armFar' : 'arm'] ?? PP?.arm)?.w, hw = (i, j) => AW && Math.max(...AW.slice(i, j + 1).map((w) => Math.max(w.front, w.back))) * Hpx;
const [MU, MF] = arg('margin') ? arg('margin').split(',').map(Number) : [hw(1, 2) || 9, hw(3, 3) || 7];
const tips = [1, 2, 3, 4].map((i) => [`hand.${side}.f${i}c`, `hand.${side}.f${i}t`]);
function measure(x) {
  const p = { ...base, bones: { ...base.bones } }; names.forEach((n, i) => { p.bones[n] = x[i]; });
  const st = rig.solve(expandHands(p, lib, C.handSides));
  const S = px(st[`upperArm.${side}`].pos), E = px(st[`forearm.${side}`].pos), W = px(st[`hand.${side}`].pos), Kn = px(st[`hand.${side}.f2a`].pos);
  const T4 = tips.map(([b, j]) => px(rig.carry(st, b, j))), T = T4.reduce((a, q) => [a[0] + q[0] / 4, a[1] + q[1] / 4], [0, 0]);
  return { S, E, W, K: Kn, T, T4, ua: st[`upperArm.${side}`].a3, ha: st[`hand.${side}`].a3 };
}
const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
function cost(x, seed) {
  const m = measure(x), terms = [d2(m.W, KW), ...(KK ? [d2(m.K, KK)] : []), ...(KT4 ? m.T4.map((q, i) => d2(q, [KT4[2 * i], KT4[2 * i + 1]])) : [d2(m.T, KT)]), ...(KF ? [segD2(KF, m.E, m.W)] : []), ...(KE ? [d2(m.E, KE)] : [])], rms = Math.sqrt(terms.reduce((a, v) => a + v, 0) / terms.length);
  let out = 0;
  if (hide !== 'none') for (let u = 0.2; u <= 1.001; u += 0.1) { const q = [m.S[0] + u * (m.E[0] - m.S[0]), m.S[1] + u * (m.E[1] - m.S[1])]; out += Math.max(0, MU - margin(q)) ** 2; }
  if (hideFore) for (let u = 0; u <= 0.8; u += 0.1) { const q = [m.E[0] + u * (m.W[0] - m.E[0]), m.E[1] + u * (m.W[1] - m.E[1])]; out += Math.max(0, MF * (1 - 0.6 * u) - margin(q)) ** 2; }
  const reg = x.reduce((a, v, i) => a + (v - seed[i]) ** 2, 0) * (natural ? 0.0002 : 0.002);
  // a body's arm: hanging, elbow out at her side, the back of the hand to us (ha.ncam[2] = the palm normal's depth, + = away)
  // … and every joint 8° clear of its limit: the shot's reach (keepSize) and fidgets need room to move it (q_k3 at the
  // wrist's −60° flexion limit: keepSize couldn't hold the hand's size, 36–43%)
  const nat = natural ? 30 * (Math.max(0, HANG - m.ua.v[1]) + Math.max(0, 0.1 - m.ua.v[2]) + Math.max(0, 0.3 - m.ha.ncam[2]) + Math.max(0, HLEN - m.ha.len) + Math.max(0, PDOWN - m.ha.ncam[1]))
    + 0.05 * x.reduce((a, v, i) => { const b = BONE[names[i]]; return a + Math.max(0, SL - (v - (b.min ?? -180))) ** 2 + Math.max(0, SL - ((b.max ?? 180) - v)) ** 2; }, 0) : 0;
  return { c: rms + 0.5 * Math.sqrt(out) + reg + nat, rms, out: Math.sqrt(out), nat };
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
let rnd = 1; const rand = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
const seeds = [...all('seed').map((s) => s.split(',').map(Number)),
  ...Array.from({ length: +arg('restarts', 0) }, () => names.map((n) => { const lo = Math.max(BONE[n].min ?? -90, -90), hi = Math.min(BONE[n].max ?? 90, 150); return lo + rand() * (hi - lo); }))];
if (!seeds.length) seeds.push(names.map((n) => base.bones[n] ?? 0));
let best = null;
for (const sd of seeds) {
  let x = sd; for (let r = 0; r < 3; r++) x = nelderMead((y) => cost(y, sd).c, x, r ? 4 : 12);   // restarts shake it out of a collapsed simplex
  const c = cost(x, sd); if (seeds.length <= 8) process.stderr.write(`  from ${sd.map((v) => v.toFixed(0)).join(',')}: ${x.map((v) => v.toFixed(1)).join(',')} → rms ${c.rms.toFixed(1)} px, arm outside ${c.out.toFixed(1)}\n`);
  if (!best || c.c < best.c) best = { x, ...c };
}
const { ua, ha, T4, ...m } = measure(best.x);
console.log(JSON.stringify({ names, x: best.x.map((v) => +v.toFixed(1)), cost: +best.c.toFixed(2), rms: +best.rms.toFixed(1), out: +best.out.toFixed(1), ...(natural ? { len: +ha.len.toFixed(2), back: +ha.ncam[2].toFixed(2), palmDown: +ha.ncam[1].toFixed(2), elbowOut: +ua.v[2].toFixed(2) } : {}), at: Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v.map(Math.round)])) }));
