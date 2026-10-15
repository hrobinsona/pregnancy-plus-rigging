// floor_pose.mjs — put a side-on pose's CONTACTS on the floor: the drawn outline points named by --touch land exactly
// on it (y = 0) and nothing of her goes through it, by moving only the bones named by --bones (and the root's height),
// as little as possible. A fit to a still's landmarks leaves a kneeling shin tilted off the floor and a foot pointing
// into it (the estimator can't see where a shin rests); a reader sees that at once.
//   node tools/floor_pose.mjs <char> <pose> [--out <pose>] --touch leg.near:4,leg.near:7,shoe.near:top [--bones shin,foot,toe]
//        [--sides near,far] [--free root.0] [--keep 1]
// --touch  part[:anchor | :low | :top][@y]: (@y: on a surface at height y, H: a counter top; default the floor) an anchor index of a posed outline (engine/leg.js: 4 = the knee's front, 7 = the
//          shin's front above the ankle), :low (default) the part's lowest anchor, :top the anchor that is lowest when
//          the part is flipped (a shoe's vamp on the floor when kneeling: its highest point at rest)
// --bones  bone stems to move, for each of --sides (default near,far); root.1 always moves
// --keep   weight pulling each bone back to its start (default 1; smaller lets the contacts win more)
// --aim    hand.near=0,…: a bone's drawn direction on screen (0 = forward): fingers forward on the floor
// --fixroot  keep her height (only the named bones move: a hand laid on the floor under a body already placed)
// --flat   hand.near,…: lay that palm flat (level, fingers forward, palm down) on what it touches
// --vars   extra bones to move by full name (wristFlex.near,hand.near,foreRot.near: a palm laid flat)
// --twin legs  the far leg copies the near one (a squat fitted with fit_pose --twin legs); --twin legs,arms the far arm too
// Writes the pose (default: in place) and prints each contact's height before and after (film px).
import fs from 'node:fs';
import { createRig } from '../engine/rig.js';
import { expandHands } from '../engine/handlib.js';
import { ap } from '../engine/geom.js';
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const [char, poseName] = argv;
if (!char || !poseName) { console.error('usage: node tools/floor_pose.mjs <char> <pose> --touch part[:i|:low|:top],… [--bones shin,foot] [--out pose]'); process.exit(2); }
const C = (await import(`../characters/${char}/character.js`)).default, rig = createRig(C), D = `characters/${char}/`;
const lib = Object.fromEntries((C.handLibrary || []).map((h) => [h, JSON.parse(fs.readFileSync(`${D}poses/hands/${h}.json`))]));
const raw = JSON.parse(fs.readFileSync(`${D}poses/${poseName}.json`)), pose0 = expandHands(raw, lib, C.handSides);
const touch = arg('touch', '').split(',').filter(Boolean).map((s) => { const [pw, lv = '0'] = s.split('@'), [part, w = 'low'] = pw.split(':'); return { part, w, lv: +lv }; });   // @y: a surface at height y (H; a counter top), not the floor
const sides = arg('sides', (arg('twin') || '').split(',').includes('legs') ? 'near' : 'near,far').split(','), stems = arg('bones', 'shin,foot').split(',');
const VARS = [...(argv.includes('--fixroot') ? [] : ['root.1']), ...(arg('free', '') ? arg('free').split(',') : []), ...(arg('vars', '') ? arg('vars').split(',') : []), ...stems.flatMap((b) => sides.map((s) => `${b}.${s}`)).filter((b) => rig.BONE[b])];
const keep = +arg('keep', 1), PX = 225;
const val0 = (v) => (v.startsWith('root') ? (pose0.root || [0, 0])[+v.slice(5)] : pose0.bones?.[v] ?? 0);
const lim = (v) => (v.startsWith('root') ? [-6, 6] : [rig.BONE[v].min ?? -180, rig.BONE[v].max ?? 180]);
// --twin legs: the far leg is the near one's twin (fit_pose --twin legs: a squat): only the near leg's bones move, the far copies them
// --twin legs,arms: the far arm too (both hands reach for the same thing, the far one hidden behind the near)
const TW = (arg('twin') || '').split(','), TWB = [...(TW.includes('legs') ? ['thigh', 'shin', 'foot', 'toe', 'hipAbd'] : []), ...(TW.includes('arms') ? ['upperArm', 'forearm', 'hand', 'wristFlex', 'foreRot'] : [])];
const TWIN = TW.includes('legs'), twin = (b) => { for (const k of TWB) if (`${k}.near` in b) b[`${k}.far`] = b[`${k}.near`]; return b; };
const poseOf = (x) => { const p = { ...pose0, bones: { ...pose0.bones }, root: [...(pose0.root || [0, 0])] }; VARS.forEach((v, i) => { if (v.startsWith('root')) p.root[+v.slice(5)] = x[i]; else p.bones[v] = x[i]; }); twin(p.bones); return p; };
// rest-pose anchor for ':top' (which anchor is the part's highest at rest)
const rest = Object.fromEntries(rig.build({ ...pose0, bones: {} }).map((p) => [p.id, p.geom.P.map((q) => ap(p.M, q))]));
const pick = (pts, t) => {
  if (/^\d+$/.test(t.w)) return pts[+t.w][1];
  if (t.w === 'top') { const r = rest[t.part], i = r.reduce((b, q, k) => (q[1] < r[b][1] ? k : b), 0); return pts[i][1]; }
  return Math.max(...pts.map((q) => q[1]));                                    // lowest = largest y
};
const measure = (x) => {
  const parts = rig.build(poseOf(x)), by = Object.fromEntries(parts.map((p) => [p.id, p.geom.P.map((q) => ap(p.M, q))]));
  const t = touch.map((tt) => { if (!by[tt.part]) throw new Error('no part ' + tt.part); return pick(by[tt.part], tt); });
  let pen = 0; for (const p of parts) if (!p.stroke && !(p.opacity <= 0.002) && !/^prop\./.test(p.id)) for (const q of by[p.id]) if (q[1] > 0) pen += q[1] ** 2;   // (props aren't her body: a toy nearer us sits a little lower)
  return { t, pen };
};
// --aim hand.near=0: a bone's drawn direction on screen (degrees, 0 = forward, 90 = down): a hand flat on the floor points
// its fingers forward, as every all-fours still draws them (without it a palm laid flat could point back at her knees)
const AIM = (arg('aim', '') || '').split(',').filter(Boolean).map((kv) => { const [b, d] = kv.split('='); return { b, d: +d }; });
const aimErr = (x) => { if (!AIM.length) return 0; const st = rig.solve(poseOf(x)); let e = 0;
  for (const { b, d } of AIM) { const B = rig.BONE[b], q = ap(st[b].M, [rig.J[B.aim][0] - rig.J[B.joint][0], rig.J[B.aim][1] - rig.J[B.joint][1]]), p = st[b].pos;
    const a = Math.atan2(q[1] - p[1], q[0] - p[0]) * 180 / Math.PI; e += (((a - d + 540) % 360) - 180) ** 2; }
  return 2e-6 * e; };
const err = (x) => { const m = measure(x); return m.t.reduce((a, y, i) => a + (y - touch[i].lv) ** 2, 0) + 4 * m.pen + aimErr(x) + keep * 2e-8 * VARS.reduce((a, v, i) => a + (v.startsWith('root') ? 0 : (x[i] - val0(v)) ** 2), 0); };
let x = VARS.map(val0);
const before = measure(x).t;
// LEVENBERG–MARQUARDT on the residuals (contacts, penetration, aims, keep): the contacts couple many bones at once (a
// palm on the floor needs the shoulder low enough, so the trunk pitches and the thighs follow to keep the knees down);
// one-bone-at-a-time descent stalled there with the knees 50 px up. Then a coordinate polish.
const resid = (x) => {
  const m = measure(x), r = m.t.map((y, i) => y - touch[i].lv);
  r.push(2 * Math.sqrt(m.pen));
  if (AIM.length) { const st = rig.solve(poseOf(x)); for (const { b, d } of AIM) { const B = rig.BONE[b], q = ap(st[b].M, [rig.J[B.aim][0] - rig.J[B.joint][0], rig.J[B.aim][1] - rig.J[B.joint][1]]), p = st[b].pos;
    r.push(Math.sqrt(2e-6) * ((((Math.atan2(q[1] - p[1], q[0] - p[0]) * 180 / Math.PI - d) + 540) % 360) - 180)); } }
  if (FLAT.length) { const st = rig.solve(poseOf(x)); for (const b of FLAT) r.push(...flatRes(st, b)); }
  VARS.forEach((v, i) => { if (!v.startsWith('root')) r.push(Math.sqrt(keep * 2e-8) * (x[i] - val0(v))); });
  return r;
};
const ss = (r) => r.reduce((a, v) => a + v * v, 0);
// --flat hand.near,hand.far: the PALM FLAT on what it touches (the floor, a counter): the hand's 3D direction level and
// pointing forward, its palm normal straight down, read from the 3D arm (st[hand].a3: the camera-frame direction and palm
// normal before the trunk's turn on screen, baseRot). Two contact points can't say this: the LM laid the hand on its edge.
const FLAT = (arg('flat', '') || '').split(',').filter(Boolean);
function flatRes(st, b) {
  const a = st[b].a3; if (!a?.ncam) return [0, 0, 0];
  const t = (st[b].baseRot ?? 0) * Math.PI / 180, c = Math.cos(t), s_ = Math.sin(t), w = (q) => [c * q[0] - s_ * q[1], s_ * q[0] + c * q[1]];
  const v = w(a.cam), n = w(a.ncam), k = 0.1;
  return [k * v[1], k * 0.5 * (1 - v[0]), k * (1 - n[1])];
}
const clampX = (x) => x.map((v, i) => { const [lo, hi] = lim(VARS[i]); return Math.max(lo, Math.min(hi, v)); });
function solveLin(A, b) {   // Gaussian elimination with partial pivoting
  const n = b.length, M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]]; if (Math.abs(M[c][c]) < 1e-18) continue;
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((row, i) => (Math.abs(row[i]) < 1e-18 ? 0 : row[n] / row[i]));
}
{
  let r0 = resid(x), f0 = ss(r0), lam = 1e-2;
  for (let it = 0; it < 80 && f0 > 1e-10; it++) {
    const cols = VARS.map((v, i) => { const h = v.startsWith('root') ? 0.004 : 0.5, [lo, hi] = lim(v), y = x.slice(); const hh = y[i] + h > hi ? -h : h; y[i] += hh; return resid(y).map((q, k) => (q - r0[k]) / hh); });
    const n = VARS.length, A = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => cols[i].reduce((a, q, k) => a + q * cols[j][k], 0)));
    const g = cols.map((c) => c.reduce((a, q, k) => a + q * r0[k], 0));
    let ok = false;
    for (let tries = 0; tries < 10; tries++) {
      const Ad = A.map((row, i) => row.map((v, j) => (i === j ? v * (1 + lam) + 1e-12 : v))), d = solveLin(Ad, g.map((v) => -v));
      const xn = clampX(x.map((v, i) => v + d[i])), rn = resid(xn), fn = ss(rn);
      if (fn < f0) { x = xn; r0 = rn; ok = f0 - fn > 1e-12 * f0; f0 = fn; lam = Math.max(1e-6, lam / 3); break; }
      lam *= 5;
    }
    if (!ok) break;
  }
}
let e = err(x);
for (let step = 2; step > 0.02; step /= 2) for (let pass = 0, imp = true; imp && pass < 20; pass++) {
  imp = false;
  for (let i = 0; i < x.length; i++) {
    const sc = VARS[i].startsWith('root') ? 0.01 : 1;
    for (const sg of [1, -1]) { const y = x.slice(), [lo, hi] = lim(VARS[i]); y[i] = Math.max(lo, Math.min(hi, y[i] + sg * step * sc)); const ey = err(y); if (ey < e) { x = y; e = ey; imp = true; } }
  }
}
const after = measure(x);
const out = { ...raw, root: poseOf(x).root.map((v) => +v.toFixed(4)), bones: twin({ ...raw.bones, ...Object.fromEntries(VARS.filter((v) => !v.startsWith('root')).map((v, i) => [v, Math.round(x[VARS.indexOf(v)] * 10) / 10])) }) };
out.note = (raw.note ? raw.note + '; ' : '') + `floor_pose: ${touch.map((t) => t.part + ':' + t.w).join(', ')} on the floor`;
out.fitFrom = raw.fitFrom || poseName;   // the still's mapping (out/fit_<pose>_targets.json) stays the fit's: side_match.py finds it
const outName = arg('out', poseName);
fs.writeFileSync(`${D}poses/${outName}.json`, JSON.stringify(out, null, 1));
console.log(`floor_pose ${outName}: ` + touch.map((t, i) => `${t.part}:${t.w} ${((t.lv - before[i]) * PX).toFixed(1)} → ${((t.lv - after.t[i]) * PX).toFixed(1)} px above`).join(', ') + `; below the floor ${Math.sqrt(after.pen) * PX < 0.5 ? 'none' : (Math.sqrt(after.pen) * PX).toFixed(1) + ' px (rms)'}`);
{ const parts = rig.build(poseOf(x)), deep = parts.filter((p) => !p.stroke && !(p.opacity <= 0.002) && !/^prop\./.test(p.id)).map((p) => [p.id, Math.max(...p.geom.P.map((q) => ap(p.M, q)[1]))]).filter(([, y]) => y > 0.002).sort((a, b) => b[1] - a[1]);
  if (deep.length) console.log('through the floor: ' + deep.slice(0, 6).map(([id, y]) => `${id} ${(y * PX).toFixed(1)} px`).join(', ')); }
console.log('moved: ' + VARS.map((v, i) => `${v} ${val0(v).toFixed?.(2) ?? val0(v)} → ${x[i].toFixed(2)}`).join(', '));
