// fit_pose.mjs — fit the rig to a reference image's MEASURED landmarks (MediaPipe body + hands, tools/pose_est.py).
//   node tools/fit_pose.mjs <char> <refPoseJson> <outPoseName> [--base bump-rest] [--hands] [--fix bone=val,...] [--note "..."]
//        [--z arm.far.fore=55] [--view far=back] [--hand far=cover] [--order far.hand=front,far.fore=front]   (draw order / hand view SEEN in the reference: forearm in front, back of hand)
// The reference is measurement only: its landmarks become IK targets for "virtual points" — where the same landmark sits
// on the REST drawing, carried by the bone that moves it. Calibration (virtual points) comes from running the same
// estimator on the rest drawing (ref/standing_34 → refs/pose/standing_34.json), so the estimator's own conventions cancel.
// Image → rig units: similarity fitted on the feet/ankles/knees/hips of the calibration image vs this image (they share the
// generator's framing), so the fit compares like with like. Solver: coordinate descent with step halving inside joint
// limits, regularised toward the base pose. Writes characters/<char>/poses/<outPoseName>.json + a report.
import fs from 'node:fs';
import { createRig } from '../engine/rig.js';
import { expandHands } from '../engine/handlib.js';
import { armFrame, armPoints, proxies, orderPenalty } from '../engine/depth.js';
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; }, flag = (k) => argv.includes('--' + k);
const [char, refJson, outName] = argv;
const C = (await import(`../characters/${char}/character.js`)).default, rig = createRig(C), { J, BONE } = rig;
const D = `characters/${char}/`;
const handLib = Object.fromEntries((C.handLibrary || []).map((h) => [h, JSON.parse(fs.readFileSync(`${D}poses/hands/${h}.json`))]));
const P = C.params, Lm = JSON.parse(fs.readFileSync(`${D}ref/landmarks.json`));
const toH = (p) => [(p[0] - Lm.ground[0]) / Lm.Hpx, (p[1] - Lm.ground[1]) / Lm.Hpx];

// ---- which bone carries each MediaPipe landmark (R = near side in a ¾ view facing right)
const side = (s) => (s === 'R' ? 'near' : 'far');
const carrier = (n) => {
  const m = n.match(/^(shoulder|elbow|wrist|pinky|index|thumb|hip|knee|ankle|heel|foot)(L|R)$/);
  if (!m) return 'head';                                               // nose, eyes, ears, mouth
  const s = side(m[2]);
  return { shoulder: `clavicle.${s}`, elbow: `upperArm.${s}`, wrist: `forearm.${s}`, pinky: `hand.${s}`, index: `hand.${s}`, thumb: `hand.${s}`,
           hip: 'pelvis', knee: `thigh.${s}`, ankle: `shin.${s}`, heel: `foot.${s}`, foot: `foot.${s}` }[m[1]];
};
const W8 = { shoulder: 1, elbow: 1, wrist: 1.2, index: 0.5, pinky: 0.5, thumb: 0.3, hip: 0.6, knee: 0.8, ankle: 1, heel: 0.6, foot: 0.6, nose: 0.8, ear: 0.8, eye: 0.6, mouth: 0.6 };
const wOf = (n) => { for (const [k, v] of Object.entries(W8)) if (n.startsWith(k)) return v; return 0.4; };

// ---- calibration: landmarks of the REST drawing (rig units) — the virtual points
const cal = JSON.parse(fs.readFileSync(fs.existsSync(`${D}refs/pose/master.json`) ? `${D}refs/pose/master.json` : `${D}refs/pose/standing_34.json`));   // the rest drawing's own landmarks
const calScale = [Lm.sizePx[0] / cal.W, Lm.sizePx[1] / cal.H];
const calH = Object.fromEntries(Object.entries(cal.pose).map(([n, p]) => [n, toH([p[0] * calScale[0], p[1] * calScale[1]])]));

// ---- this reference → rig units: similarity from stable lower-body landmarks
const ref = JSON.parse(fs.readFileSync(refJson));
if (!ref.pose) throw new Error('no pose in ' + refJson);
const refN = Object.fromEntries(Object.entries(ref.pose).map(([n, p]) => [n, [p[0] / ref.W * Lm.sizePx[0], p[1] / ref.H * Lm.sizePx[1]]]));
const anchors = (arg('anchors', 'ankleL,ankleR,heelL,heelR,footL,footR,kneeL,kneeR,hipL,hipR')).split(',');
// least-squares similarity (s, tx, ty) mapping refN → calibration px, no rotation (both are upright stills)
const calPx = Object.fromEntries(Object.entries(cal.pose).map(([n, p]) => [n, [p[0] * calScale[0], p[1] * calScale[1]]]));
let sx = 0, sy = 0, cx = 0, cy = 0, k = 0; for (const n of anchors) { sx += refN[n][0]; sy += refN[n][1]; cx += calPx[n][0]; cy += calPx[n][1]; k++; }
sx /= k; sy /= k; cx /= k; cy /= k;
let num = 0, den = 0; for (const n of anchors) { num += (refN[n][0] - sx) * (calPx[n][0] - cx) + (refN[n][1] - sy) * (calPx[n][1] - cy); den += (refN[n][0] - sx) ** 2 + (refN[n][1] - sy) ** 2; }
const s = flag('noscale') ? 1 : num / den;
const toRig = (p) => toH([cx + s * (p[0] - sx), cy + s * (p[1] - sy)]);
const tgt = Object.fromEntries(Object.entries(refN).map(([n, p]) => [n, toRig(p)]));
const vis = Object.fromEntries(Object.entries(ref.pose).map(([n, p]) => [n, p[2]]));

// ---- targets: every body landmark that is visible enough
const targets = [];
for (const n of Object.keys(tgt)) {
  if (vis[n] < 0.3 || !calH[n]) continue;
  targets.push({ n, bone: carrier(n), rest: calH[n], to: tgt[n], w: wOf(n) * Math.min(1, vis[n] + 0.2) });
}
// hands (MediaPipe hand landmarks): attach each detected hand to the nearer pose wrist; joints of OUR hand rig as points
const HJ = ['wrist', 'tc', 'tb', 'tm', 'tt', 'f1k', 'f1m', 'f1d', 'f1t', 'f2k', 'f2m', 'f2d', 'f2t', 'f3k', 'f3m', 'f3d', 'f3t', 'f4k', 'f4m', 'f4d', 'f4t'];
if (flag('hands')) for (const h of ref.hands || []) {
  const pts = h.pts.map((p) => toRig([p[0] / ref.W * Lm.sizePx[0], p[1] / ref.H * Lm.sizePx[1]]));
  const dN = Math.hypot(pts[0][0] - tgt.wristR[0], pts[0][1] - tgt.wristR[1]), dF = Math.hypot(pts[0][0] - tgt.wristL[0], pts[0][1] - tgt.wristL[1]);
  const sd = dN < dF ? 'near' : 'far', pre = (argv.includes('--farback') && sd === 'far') ? 'hand.farB' : `hand.${sd}`;
  HJ.forEach((j, i) => {
    if (i === 0) return;
    const jn = `${pre}.${j}`; if (!J[jn]) return;
    const bn = C.bones.find((b) => b.joint === jn)?.parent || C.bones.find((b) => b.aim === jn)?.id;
    if (!bn) return;
    targets.push({ n: jn, bone: bn, rest: J[jn], to: pts[i], w: j.endsWith('t') ? 0.25 : 0.35, hand: true });
  });
}

// ---- solve
const base = JSON.parse(fs.readFileSync(`${D}poses/${arg('base', 'bump-rest')}.json`));
const fixed = Object.fromEntries((arg('fix', '') || '').split(',').filter(Boolean).map((kv) => { const [a, b] = kv.split('='); return [a, +b]; }));
const VARS = ['root.0', 'root.1', 'pelvis', 'spineLower', 'spineUpper', 'chest', 'neck', 'head', 'belly',
  ...['near', 'far'].flatMap((sd) => [`clavicle.${sd}`, `shoulderAbd.${sd}`, `upperArm.${sd}`, `armAbd.${sd}`, `armRot.${sd}`, `forearm.${sd}`, `foreRot.${sd}`, `hand.${sd}`, `thigh.${sd}`, `shin.${sd}`, `foot.${sd}`, `hipAbd.${sd}`]),
  ...(flag('hands') ? ['near', 'far'].flatMap((sd) => [1, 2, 3, 4].flatMap((f) => [`hand.${sd}.f${f}a`, `hand.${sd}.f${f}b`, `hand.${sd}.f${f}s`]).concat([`hand.${sd}.t0`, `hand.${sd}.t1`, `hand.${sd}.ts`])) : [])]
  .filter((v) => !(v in fixed) && (v.startsWith('root') || BONE[v]))
  // the head NOD (C.warps.head, engine/warp.js) is a DOF too: a ¾ head looking down moves its face down the skull — fitted
  // with a flat rotation only, the fit ROLLED the head to bring the face landmarks down (critic: "head rolls on a stalk")
  .concat(C.warps?.head && !('fx.headPitch' in fixed) ? ['fx.headPitch'] : [])
  // --fold: the trunk's FORESHORTENING as degrees of freedom (along-scale of the upper spine and the neck). A ¾ figure
  // doubling over bends toward the camera: her shoulders DROP more than they move sideways (measured on the retch video:
  // nose 1.2 H down, 0.6 H forward). Flat rotations alone can only swing them sideways ("topples like a post").
  .concat(flag('fold') ? ['scale.chest.0', 'scale.neck.0'] : []);   // (not the upper spine: it carries the top of the bump, which must keep its size — critic R18 "the bump shrinks")
const basePose = expandHands({ ...base }, handLib, C.handSides);
const b0 = { ...basePose.bones, ...fixed }, r0 = base.root || [0, 0];
const val0 = (v) => (v.startsWith('root') ? r0[+v.slice(5)] : v.startsWith('fx.') ? (base.fx?.[v.slice(3)] ?? 0) : v.startsWith('scale.') ? (base.scale?.[v.split('.')[1]]?.[+v.split('.')[2]] ?? 1) : (b0[v] ?? 0));
const lim = (v) => (v.startsWith('root') ? [-0.6, 0.6] : v === 'fx.headPitch' ? [-30, 45] : v.startsWith('scale.') ? [0.62, 1.1] : [BONE[v].min ?? -180, BONE[v].max ?? 180]);
const poseOf = (x) => { const bones = { ...b0 }, root = [...r0], fx = { ...(basePose.fx || {}) }, scale = Object.fromEntries(Object.entries(basePose.scale || {}).map(([k, v]) => [k, [...v]]));
  VARS.forEach((v, i) => { if (v.startsWith('root')) root[+v.slice(5)] = x[i]; else if (v.startsWith('fx.')) fx[v.slice(3)] = x[i]; else if (v.startsWith('scale.')) { const [, b, ix] = v.split('.'); (scale[b] ||= [1, 1])[+ix] = x[i]; } else bones[v] = x[i]; });
  return { ...basePose, bones, root, fx, scale }; };
// a landmark drawn on a WARPED bone (the nodding head) is carried through the warp first, like the drawing
const carry = (st, bone, p, pose) => { if (pose && C.warps?.[bone]) p = C.warps[bone](pose)(p); const M = st[bone].M, j = J[BONE[bone].joint]; return [M[0] * (p[0] - j[0]) + M[2] * (p[1] - j[1]) + M[4], M[1] * (p[0] - j[0]) + M[3] * (p[1] - j[1]) + M[5]]; };
const reg = +arg('reg', 2e-6);
const err = (x) => {
  const po = poseOf(x), st = rig.solve(po); let e = 0;
  for (const t of targets) { const a = carry(st, t.bone, t.rest, po); e += t.w * ((a[0] - t.to[0]) ** 2 + (a[1] - t.to[1]) ** 2); }
  return e + reg * VARS.reduce((acc, v, i) => acc + (v.startsWith('root') ? 400 : v.startsWith('scale.') ? 2500 : 1) * (x[i] - val0(v)) ** 2, 0) + prior3(x) + order3(st);
};
// OVERLAP ORDER seen in the reference (--order far.hand=front,far.fore=front | far.hand=behind): 2D landmarks leave the arm's
// depth free (mirror solutions); what is drawn over what in the reference settles it (engine/depth.js proxies).
const ORDER = (arg('order', '') || '').split(',').filter(Boolean).map((kv) => { const [k, w] = kv.split('='); const [sd, part] = k.split('.'); return { sd, part, want: w }; });   // want: front|behind|onfront|onback[:proxy+proxy]
const lerp3 = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
function order3(st) {
  let pen = 0;
  for (const o of ORDER) {
    const fr = armFrame(rig, st, o.sd), A = armPoints(rig, st, o.sd), prox = proxies(rig, st, fr);
    const pt = { hand: lerp3(A.wr, A.tip, 0.4), fore: lerp3(A.el, A.wr, 0.6), elbow: A.el, wrist: A.wr }[o.part];
    pen += 50 * orderPenalty(fr.armToBody(pt), fr, prox, o.want);
  }
  return pen;
}
// 3D ARM PRIOR. One 2D view cannot tell an elbow raised forward-and-across from one raised out-and-back: both project to
// the same picture (mirror solutions in depth). Real arms raise in the scapular plane (≈ 45° between forward and side),
// with moderate humeral rotation — so ask for that, weighted by how far the arm is raised (a hanging arm has no plane).
const DEG = Math.PI / 180, PRI = +arg('prior', 4e-6);
function prior3(x) {
  let p = 0;
  for (const sd of ['near', 'far']) {
    const iU = VARS.indexOf(`upperArm.${sd}`), iB = VARS.indexOf(`armAbd.${sd}`), iR = VARS.indexOf(`armRot.${sd}`), iA = VARS.indexOf(`shoulderAbd.${sd}`);
    if (iB < 0) continue;
    const e = x[iU], s2 = Math.sin(Math.min(90, Math.abs(e)) * DEG) ** 2;
    p += PRI * (s2 * (x[iB] - 45) ** 2 + (1 - s2) * x[iB] ** 2 + 0.5 * x[iR] ** 2 + 2 * (iA >= 0 ? (x[iA] - val0(`shoulderAbd.${sd}`)) ** 2 : 0));   // shoulderAbd is a 2D screen rotation: keep it for small corrections
  }
  // TRUNK PRIOR: 2D shoulder/hip landmarks barely constrain how the bend shares out between the spine links, and the free
  // fit invented S-curves (lower back forward, upper back and chest arched back, neck back, head rolled 40° forward). A real
  // trunk bends as one smooth curve: neighbouring links alike. Legs stay near their rest unless the picture insists.
  const v = (n) => { const i = VARS.indexOf(n); return i >= 0 ? x[i] : (b0[n] ?? 0); };
  const TW = +arg('trunkPrior', 2e-5), LW = +arg('legPrior', 1e-5);
  p += TW * ((v('spineLower') - v('spineUpper')) ** 2 + (v('spineUpper') - v('chest')) ** 2 + 0.5 * (v('chest') - v('neck')) ** 2 + 0.5 * (v('neck') - v('head')) ** 2);
  for (const sd of ['near', 'far']) for (const b of ['thigh', 'shin', 'foot', 'hipAbd']) p += LW * (v(`${b}.${sd}`) - (b0[`${b}.${sd}`] ?? 0)) ** 2;
  return p;
}
let x = VARS.map(val0), e = err(x);
// ARM INIT: coordinate descent gets stuck on the wrong elbow branch (a far arm reaching round the bump, a hand brought to
// the mouth with the elbow out); grid-search each arm's 3D DOF (elevation, plane of elevation, humeral rotation, elbow)
// against its own elbow/wrist/hand targets first, then refine everything. Arms without 3D DOF fall back to the 2D grid.
for (const sd of flag('nogrid') ? [] : ['near', 'far']) {   // --nogrid: start from the base (a video frame fitted from the previous one keeps its branch)
  const ix = (n) => VARS.indexOf(`${n}.${sd}`), iA = ix('shoulderAbd'), iU = ix('upperArm'), iF = ix('forearm'), iB = ix('armAbd'), iR = ix('armRot');
  if (iU < 0 || iF < 0) continue;
  const S = sd === 'near' ? 'R' : 'L', mine = targets.filter((t) => [`elbow${S}`, `wrist${S}`, `index${S}`, `pinky${S}`].includes(t.n));
  if (!mine.length) continue;
  const armErr = (y) => { const st = rig.solve(poseOf(y)); return mine.reduce((acc, t) => { const a = carry(st, t.bone, t.rest); return acc + t.w * ((a[0] - t.to[0]) ** 2 + (a[1] - t.to[1]) ** 2); }, 0)
    + prior3(y) + order3(st); };
  const grid = (i, st_) => { if (i < 0) return [null]; const [lo, hi] = lim(VARS[i]); const out = []; for (let v = lo; v <= hi + 1e-9; v += st_) out.push(v); return out; };
  let best = [armErr(x), x.slice()];
  for (const B of grid(iB, 15)) for (const R of grid(iR, 15)) for (const U of grid(iU, 10)) for (const Fv of grid(iF, 10)) for (const A of (iB >= 0 ? [x[iA]] : grid(iA, 10))) {
    const y = x.slice(); if (iB >= 0) y[iB] = B; if (iR >= 0) y[iR] = R; y[iU] = U; y[iF] = Fv; if (iA >= 0) y[iA] = A;
    const ey = armErr(y); if (ey < best[0]) best = [ey, y];
  }
  x = best[1];
}
e = err(x);
for (let step = 16; step > 0.05; step /= 2) {
  for (let pass = 0, imp = true; imp && pass < 40; pass++) {
    imp = false;
    for (let i = 0; i < x.length; i++) {
      const sc = VARS[i].startsWith('root') ? 0.004 : VARS[i].startsWith('scale.') ? 0.01 : 1;   // (fx.headPitch: degrees, like the bones)
      for (const sg of [1, -1]) { const y = x.slice(); const [lo, hi] = lim(VARS[i]); y[i] = Math.max(lo, Math.min(hi, y[i] + sg * step * sc)); const ey = err(y); if (ey < e) { x = y; e = ey; imp = true; } }
    }
  }
}
const poF = poseOf(x), st = rig.solve(poF), rep = [];
for (const t of targets) { const a = carry(st, t.bone, t.rest, poF); rep.push([t.n, Math.hypot(a[0] - t.to[0], a[1] - t.to[1])]); }
rep.sort((a, b) => b[1] - a[1]);
const handArg = Object.fromEntries((arg('hand', '') || '').split(',').filter(Boolean).map((kv) => kv.split('=')));   // --hand far=cover: the library shape SEEN in the reference
const out = { name: outName, note: arg('note', `fitted to ${refJson} (MediaPipe landmarks, base ${arg('base', 'bump-rest')})`), ...((base.hands || arg('hand')) && !flag('hands') ? { hands: { ...(base.hands || {}), ...handArg } } : {}),
  ...(base.handView || arg('view') ? { handView: { ...(base.handView || {}), ...Object.fromEntries((arg('view', '') || '').split(',').filter(Boolean).map((kv) => kv.split('='))) } } : {}),
  ...(base.zBias || arg('z') ? { zBias: { ...(base.zBias || {}), ...Object.fromEntries((arg('z', '') || '').split(',').filter(Boolean).map((kv) => { const [a, b] = kv.split('='); return [a, +b]; })) } } : {}), ...(base.fx || poF.fx?.headPitch ? { fx: { ...(base.fx || {}), ...(VARS.includes('fx.headPitch') ? { headPitch: Math.round(poF.fx.headPitch * 10) / 10 } : {}) } } : {}), ...(base.scale || flag('fold') ? { scale: Object.fromEntries(Object.entries(poF.scale || {}).map(([k, v]) => [k, v.map((q) => Math.round(q * 1000) / 1000)])) } : {}),
  root: [+poseOf(x).root[0].toFixed(4), +poseOf(x).root[1].toFixed(4)],
  bones: Object.fromEntries(Object.entries(poseOf(x).bones).filter(([k]) => flag('hands') || !/^hand\.(near|far|farB)\./.test(k)).map(([k, v]) => [k, Math.round(v * 10) / 10])),
  _fit: { ref: refJson, scale: +s.toFixed(4), rms: +Math.sqrt(rep.reduce((a, r) => a + r[1] ** 2, 0) / rep.length).toFixed(4), worst: rep.slice(0, 5).map(([n, d]) => `${n} ${d.toFixed(3)}`) } };
fs.mkdirSync(`${D}poses/${outName}`.replace(/\/[^/]*$/, ''), { recursive: true }); fs.writeFileSync(`${D}poses/${outName}.json`, JSON.stringify(out, null, 1));
console.log(`fit ${outName}: ${targets.length} targets, rms ${out._fit.rms} H, scale ${s.toFixed(3)}; worst: ${out._fit.worst.join(', ')}`);
// targets in rig units for the overlay tool
fs.mkdirSync(`out/fit_${outName}`.replace(/\/[^/]*$/, ''), { recursive: true }); fs.writeFileSync(`out/fit_${outName}_targets.json`, JSON.stringify({ ref: refJson, xf: { s, sx, sy, cx, cy, sizePx: Lm.sizePx, ground: Lm.ground, Hpx: Lm.Hpx, W: ref.W, H: ref.H }, targets: targets.map((t) => ({ n: t.n, to: t.to, got: carry(st, t.bone, t.rest, poF), bone: t.bone, rest: t.rest, w: t.w })) }));
