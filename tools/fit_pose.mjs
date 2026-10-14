// fit_pose.mjs — fit the rig to a reference image's MEASURED landmarks (MediaPipe body + hands, tools/pose_est.py).
//   node tools/fit_pose.mjs <char> <refPoseJson> <outPoseName> [--base bump-rest] [--hands] [--fix bone=val,...] [--note "..."]
//        [--z arm.far.fore=55] [--view far=back] [--hand far=cover] [--order far.hand=front,far.fore=front]   (draw order / hand view SEEN in the reference: forearm in front, back of hand)
//        [--floor] [--show far.arm]   (a side-on pose off her feet, placed by the still's floor row; a hidden limb the still shows)
//        [--set kneeR:x:y,...] [--swap legs|arms|both]   (landmarks read off the still where the estimator failed; L/R swapped)
//        [--splay] [--props chair,ball,counter,toy,chair:back=1]   (thighs foreshortened by knees turned out; the pose's furniture)
//        [--dirs 0.5] [--posw 0.3]   (match each segment's DIRECTION: the posture, whatever the still's proportions)
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
// --set kneeR:400:1170,ankleR:410:1440 (still px): landmarks READ OFF THE STILL where the estimator failed. Side-on, MediaPipe
// mixes the legs up when one passes the other (walking: the front knee on the back ankle) and puts a squat's hips at the
// back of the skirt; the fit then folds the legs wrongly. Read them on a grid (tools/grid_still.py) and record them in
// the pose's fit script, so the fit is reproducible.
// --swap legs|arms|both: the estimator's L/R labels the other way round (a side view hides which leg is which)
for (const kv of (arg('set', '') || '').split(',').filter(Boolean)) { const [n, x, y] = kv.split(':'); ref.pose[n] = [+x, +y, 1]; }
if (arg('swap')) {
  const groups = { legs: ['hip', 'knee', 'ankle', 'heel', 'foot'], arms: ['shoulder', 'elbow', 'wrist', 'pinky', 'index', 'thumb'] };
  for (const g of arg('swap') === 'both' ? ['legs', 'arms'] : [arg('swap')]) for (const b of groups[g]) [ref.pose[b + 'L'], ref.pose[b + 'R']] = [ref.pose[b + 'R'], ref.pose[b + 'L']];
}
// one scale for both axes (by height): a still of another aspect (all fours is landscape, 1536x1024) stretched per axis
// came out squashed, her hips 1 H off. For the master's own aspect it is the same as before.
const KX = Lm.sizePx[1] / ref.H, KY = KX;
const refN = Object.fromEntries(Object.entries(ref.pose).map(([n, p]) => [n, [p[0] * KX, p[1] * KY]]));
const anchors = (arg('anchors', 'ankleL,ankleR,heelL,heelR,footL,footR,kneeL,kneeR,hipL,hipR')).split(',');
// least-squares similarity (s, tx, ty) mapping refN → calibration px, no rotation (both are upright stills)
const calPx = Object.fromEntries(Object.entries(cal.pose).map(([n, p]) => [n, [p[0] * calScale[0], p[1] * calScale[1]]]));
let sx = 0, sy = 0, cx = 0, cy = 0, k = 0, s;
// --floor: a SIDE-ON pose off her feet (kneeling, all fours, sitting, squatting). Her feet, knees and hips have moved, so
// they can't set the still's scale and place: the scale is the median ratio of rigid segments (thigh, shin, upper arm,
// forearm: in a side view they lie in the picture), the still's floor row (pose_est.py groundY) goes onto the rig's
// ground, x onto the master's centroid; the root then moves freely (±4 H) to put her where the still does.
const FLOOR = flag('floor');
if (FLOOR) {
  const vis_ = (n, P) => (P[n]?.[2] ?? 0) > 0.5, d2 = (P, a, b) => Math.hypot(P[a][0] - P[b][0], P[a][1] - P[b][1]);
  const segs = ['R', 'L'].flatMap((S) => [[`hip${S}`, `knee${S}`], [`knee${S}`, `ankle${S}`], [`shoulder${S}`, `elbow${S}`], [`elbow${S}`, `wrist${S}`]]);
  const rat = segs.filter(([a, b]) => vis_(a, ref.pose) && vis_(b, ref.pose) && vis_(a, cal.pose) && vis_(b, cal.pose)).map(([a, b]) => d2(calPx, a, b) / d2(refN, a, b)).sort((a, b) => a - b);
  if (!rat.length) throw new Error('--floor: no rigid segment visible in both the still and the master');
  s = rat[rat.length >> 1];
  if (ref.groundY === undefined) throw new Error('--floor: re-run pose_est.py on the still (it records groundY)');
  const vn = Object.keys(refN).filter((n) => vis_(n, ref.pose) && calPx[n]);
  sx = vn.reduce((a, n) => a + refN[n][0], 0) / vn.length; cx = vn.reduce((a, n) => a + calPx[n][0], 0) / vn.length;
  sy = ref.groundY * KY; cy = Lm.ground[1];
} else {
  for (const n of anchors) { sx += refN[n][0]; sy += refN[n][1]; cx += calPx[n][0]; cy += calPx[n][1]; k++; }
  sx /= k; sy /= k; cx /= k; cy /= k;
  let num = 0, den = 0; for (const n of anchors) { num += (refN[n][0] - sx) * (calPx[n][0] - cx) + (refN[n][1] - sy) * (calPx[n][1] - cy); den += (refN[n][0] - sx) ** 2 + (refN[n][1] - sy) ** 2; }
  s = flag('noscale') ? 1 : num / den;
}
const toRig = (p) => toH([cx + s * (p[0] - sx), cy + s * (p[1] - sy)]);
const tgt = Object.fromEntries(Object.entries(refN).map(([n, p]) => [n, toRig(p)]));
const vis = Object.fromEntries(Object.entries(ref.pose).map(([n, p]) => [n, p[2]]));

// ---- targets: every body landmark that is visible enough
// C.fit.hidden: limbs the DESIGN keeps hidden (a profile's far arm behind her body): the estimator only guesses them, and
// fitting those guesses pulled the far arm out past her back. Their landmarks are skipped and their bones stay at the base.
const HID = new Set((C.fit?.hidden || []).filter((h) => !(arg('show', '') || '').split(',').includes(h)));   // --show far.arm: a pose that shows it (all fours)
const hiddenBone = (b) => [...HID].some((h) => { const [sd, limb] = h.split('.'); return limb === 'arm' && new RegExp(`^(clavicle|shoulderAbd|upperArm|armAbd|armRot|forearm|foreRot|hand)\\.${sd}$`).test(b); });
const targets = [];
for (const n of Object.keys(tgt)) {
  if (vis[n] < 0.3 || !calH[n] || hiddenBone(carrier(n))) continue;
  targets.push({ n, bone: carrier(n), rest: calH[n], to: tgt[n], w: wOf(n) * Math.min(1, vis[n] + 0.2) });
}
// hands (MediaPipe hand landmarks): attach each detected hand to the nearer pose wrist; joints of OUR hand rig as points
const HJ = ['wrist', 'tc', 'tb', 'tm', 'tt', 'f1k', 'f1m', 'f1d', 'f1t', 'f2k', 'f2m', 'f2d', 'f2t', 'f3k', 'f3m', 'f3d', 'f3t', 'f4k', 'f4m', 'f4d', 'f4t'];
if (flag('hands')) for (const h of ref.hands || []) {
  const pts = h.pts.map((p) => toRig([p[0] * KX, p[1] * KY]));
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

const FAR_UNSEEN = 1 - ['kneeL', 'ankleL', 'heelL', 'footL'].filter((n) => targets.some((t) => t.n === n && t.w > 0.3)).length / 4;
const FAR_ARM_UNSEEN = 1 - ['elbowL', 'wristL'].filter((n) => targets.some((t) => t.n === n && t.w > 0.3)).length / 2;
// ---- solve
const baseName = arg('base', fs.existsSync(`${D}poses/bump-rest.json`) ? 'bump-rest' : 'rest');
const base = JSON.parse(fs.readFileSync(`${D}poses/${baseName}.json`));
const fixed = Object.fromEntries((arg('fix', '') || '').split(',').filter(Boolean).map((kv) => { const [a, b] = kv.split('='); return [a, +b]; }));
const VARS = ['root.0', 'root.1', 'pelvis', 'spineLower', 'spineUpper', 'chest', 'neck', 'head', 'belly',
  ...['near', 'far'].flatMap((sd) => [`clavicle.${sd}`, `shoulderAbd.${sd}`, `upperArm.${sd}`, `armAbd.${sd}`, `armRot.${sd}`, `forearm.${sd}`, `foreRot.${sd}`, `hand.${sd}`, `thigh.${sd}`, `shin.${sd}`, `foot.${sd}`, `hipAbd.${sd}`]),
  ...(flag('hands') ? ['near', 'far'].flatMap((sd) => [1, 2, 3, 4].flatMap((f) => [`hand.${sd}.f${f}a`, `hand.${sd}.f${f}b`, `hand.${sd}.f${f}s`]).concat([`hand.${sd}.t0`, `hand.${sd}.t1`, `hand.${sd}.ts`])) : [])]
  .filter((v) => !(v in fixed) && (v.startsWith('root') || BONE[v]) && !hiddenBone(v))
  // the head NOD (C.warps.head, engine/warp.js) is a DOF too: a ¾ head looking down moves its face down the skull — fitted
  // with a flat rotation only, the fit ROLLED the head to bring the face landmarks down (critic: "head rolls on a stalk")
  .concat(C.warps?.head && !('fx.headPitch' in fixed) ? ['fx.headPitch'] : [])
  // --fold: the trunk's FORESHORTENING as degrees of freedom (along-scale of the upper spine and the neck). A ¾ figure
  // doubling over bends toward the camera: her shoulders DROP more than they move sideways (measured on the retch video:
  // nose 1.2 H down, 0.6 H forward). Flat rotations alone can only swing them sideways ("topples like a post").
  .concat(flag('fold') ? ['scale.chest.0', 'scale.neck.0'] : [])
  // --splay: the THIGHS' foreshortening. Squatting (or sitting with the knees apart, as a pregnant woman does to make room
  // for her bump) the knees turn out toward us and a side view sees the thighs shorter: the squat still's thigh is 0.8 of
  // hers. Without it the fit pushed the knees out past the still's (rms 0.084 H, the hips 0.16 H off)
  .concat(flag('splay') ? ['scale.thigh.near.0', 'scale.thigh.far.0'] : []);   // (not the upper spine: it carries the top of the bump, which must keep its size — critic R18 "the bump shrinks")
// a fixed fx.* channel (--fix fx.headPitch=22: a nod measured on the face, tools/head_pose.py) is held in the pose's fx,
// not among the bones (it was silently dropped)
const fixedFx = Object.fromEntries(Object.entries(fixed).filter(([k]) => k.startsWith('fx.')).map(([k, v]) => [k.slice(3), v]));
const basePose = expandHands({ ...base, ...(Object.keys(fixedFx).length ? { fx: { ...(base.fx || {}), ...fixedFx } } : {}) }, handLib, C.handSides);
const b0 = { ...basePose.bones, ...Object.fromEntries(Object.entries(fixed).filter(([k]) => !k.startsWith('fx.'))) }, r0 = base.root || [0, 0];
const val0 = (v) => (v.startsWith('root') ? r0[+v.slice(5)] : v.startsWith('fx.') ? (base.fx?.[v.slice(3)] ?? 0) : v.startsWith('scale.') ? (base.scale?.[v.split('.').slice(1, -1).join('.')]?.[+v.split('.').at(-1)] ?? 1) : (b0[v] ?? 0));
const lim = (v) => (v.startsWith('root') ? (FLOOR ? [-4, 4] : [-0.6, 0.6]) : v === 'fx.headPitch' ? [-30, 45] : v.startsWith('scale.') ? [0.62, 1.1] : [BONE[v].min ?? -180, BONE[v].max ?? 180]);
const poseOf = (x) => { const bones = { ...b0 }, root = [...r0], fx = { ...(basePose.fx || {}) }, scale = Object.fromEntries(Object.entries(basePose.scale || {}).map(([k, v]) => [k, [...v]]));
  VARS.forEach((v, i) => { if (v.startsWith('root')) root[+v.slice(5)] = x[i]; else if (v.startsWith('fx.')) fx[v.slice(3)] = x[i]; else if (v.startsWith('scale.')) { const q = v.split('.'), b = q.slice(1, -1).join('.'), ix = q.at(-1); (scale[b] ||= [1, 1])[+ix] = x[i]; } else bones[v] = x[i]; });
  return { ...basePose, bones, root, fx, scale }; };
// a landmark drawn on a WARPED bone (the nodding head) is carried through the warp first, like the drawing
const carry = (st, bone, p, pose) => { if (pose && C.warps?.[bone]) p = C.warps[bone](pose)(p); const M = st[bone].M, j = J[BONE[bone].joint]; return [M[0] * (p[0] - j[0]) + M[2] * (p[1] - j[1]) + M[4], M[1] * (p[0] - j[0]) + M[3] * (p[1] - j[1]) + M[5]]; };
const reg = +arg('reg', 2e-6);
// --dirs w: fit the POSTURE, not the proportions. A generated still draws her with its own proportions (a bigger head, a
// trunk 15% shorter than the master's on the bend still), and fitting positions bent the rig to make up the difference:
// the pelvis pitched 47° forward against a spine arched back, the head thrown back, to put shoulders and ears where a
// shorter body has them. With --dirs each SEGMENT's direction is matched (hips → shoulders, shoulders → ears, ears → nose,
// each limb bone), weight w, and the positions only anchor her (× --posw, default 0.3; the feet at full weight: they
// stand on the floor). Side-on library, lesson 62.
const DIRW = +arg('dirs', 0), POSW = DIRW ? +arg('posw', 0.3) : 1;
const mid = (a, b) => (a && b ? [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] : a || b);
const SEGS = [[['hipL', 'hipR'], ['shoulderL', 'shoulderR'], 2], [['shoulderL', 'shoulderR'], ['earL', 'earR'], 1], [['earL', 'earR'], ['nose'], 0.5],
  ...['L', 'R'].flatMap((S) => [[[`hip${S}`], [`knee${S}`], 1], [[`knee${S}`], [`ankle${S}`], 1], [[`heel${S}`], [`foot${S}`], 0.5], [[`shoulder${S}`], [`elbow${S}`], 1], [[`elbow${S}`], [`wrist${S}`], 1], [[`wrist${S}`], [`index${S}`], 0.3]])];
const FEET = /^(ankle|heel|foot)[LR]$/;
function dirRes(got) {
  const r = []; if (!DIRW) return r;
  const tw = Object.fromEntries(targets.map((t) => [t.n, t]));
  for (const [A, B, w] of SEGS) {
    if (!A.some((n) => tw[n]) || !B.some((n) => tw[n])) continue;
    const pick = (ns, k) => mid(...ns.map((n) => (tw[n] ? (k === 'to' ? tw[n].to : got[n]) : null)).filter(Boolean).concat([null]).slice(0, 2));
    const vs = Math.min(...[...A, ...B].filter((n) => tw[n]).map((n) => tw[n].w));
    const d1 = [pick(B, 'to')[0] - pick(A, 'to')[0], pick(B, 'to')[1] - pick(A, 'to')[1]], d2 = [pick(B, 'got')[0] - pick(A, 'got')[0], pick(B, 'got')[1] - pick(A, 'got')[1]];
    const l1 = Math.hypot(...d1) || 1, l2 = Math.hypot(...d2) || 1, k = Math.sqrt(DIRW * w * vs);
    r.push(k * (d1[0] / l1 - d2[0] / l2), k * (d1[1] / l1 - d2[1] / l2));
  }
  return r;
}
// (the hands least of all: a longer-armed still reaches the floor where her hand can't, and chasing it pitched her trunk;
// a prop the hand holds is placed from the hand, parts/props.js)
const posW = (t) => (FEET.test(t.n) ? 1 : DIRW && /^(wrist|index|pinky|thumb)[LR]$/.test(t.n) ? 0.05 * POSW : POSW);
const err = (x) => {
  const po = poseOf(x), st = rig.solve(po); let e = 0; const got = {};
  for (const t of targets) { const a = carry(st, t.bone, t.rest, po); got[t.n] = a; e += posW(t) * t.w * ((a[0] - t.to[0]) ** 2 + (a[1] - t.to[1]) ** 2); }
  for (const q of dirRes(got)) e += q * q;
  return e + reg * VARS.reduce((acc, v, i) => acc + (v.startsWith('root') ? (FLOOR ? 1 : 400) : v.startsWith('scale.') ? 2500 : 1) * (x[i] - val0(v)) ** 2, 0) + prior3(x) + order3(st);
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
  const TW = +arg('trunkPrior', 2e-5), LW = +arg('legPrior', FLOOR ? 1e-7 : 1e-5);   // off her feet the legs go where the still puts them
  p += TW * ((v('spineLower') - v('spineUpper')) ** 2 + (v('spineUpper') - v('chest')) ** 2 + 0.5 * (v('chest') - v('neck')) ** 2 + 0.5 * (v('neck') - v('head')) ** 2);
  // NEUTRAL SPINE (--floor): off her feet the hips' landmarks are guesses under the dress (0.3–0.5 H off), and the fit
  // pitched the pelvis 49° forward against a lumbar arched 34° back to meet them: the bump rotated down behind the thighs
  // ("where is the bump?") and the head thrown back. A pregnant woman squatting, bending, kneeling keeps her back long:
  // the trunk leans from the hips, the spine near its rest curve, the head in line. The picture can still bend it.
  if (FLOOR) p += +arg('neutral', 1e-5) * (v('spineLower') ** 2 + v('spineUpper') ** 2 + v('chest') ** 2 + 0.5 * v('neck') ** 2 + 0.5 * v('head') ** 2);
  for (const sd of ['near', 'far']) for (const b of ['thigh', 'shin', 'foot', 'hipAbd']) p += LW * (v(`${b}.${sd}`) - (b0[`${b}.${sd}`] ?? 0)) ** 2;
  // off her feet the far leg is mostly hidden behind the near one and the estimator drops its landmarks: it then folds
  // like the near leg (kneeling, all fours) instead of staying where the base had it (a leg left standing under a kneel)
  // (only as far as its landmarks are missing: a walk's back leg, seen, keeps its own bend)
  if (FLOOR) for (const b of ['thigh', 'shin', 'foot']) p += 2e-5 * FAR_UNSEEN * (v(`${b}.far`) - v(`${b}.near`)) ** 2;
  // a far arm the pose SHOWS (--show far.arm) but the still hides (behind her, its landmarks dropped) does what the near
  // one does: the squat still's far hand is on the chair too (left at rest it hung down her back)
  if (FLOOR && !HID.has('far.arm')) for (const b of ['upperArm', 'armAbd', 'forearm', 'hand']) p += 2e-5 * FAR_ARM_UNSEEN * (v(`${b}.far`) - v(`${b}.near`)) ** 2;
  return p;
}
let x = VARS.map(val0), e = err(x);
// BODY INIT (--floor): from a standing start, coordinate descent can't reach all fours (it stalled with her hips 1.2 H off,
// rms 0.54 H). So first pick the whole-body pitch: for each pelvis angle, put the root so her hips land on the still's
// hips, then each leg bone in turn (thigh → knee, shin → ankle, foot → heel/toe) by a 1-D scan; keep the best pitch.
if (FLOOR) {
  const iv = (n) => VARS.indexOf(n), body = targets.filter((t) => !/^(clavicle|shoulderAbd|upperArm|forearm|hand)\./.test(t.bone));
  const errOn = (y, ts) => { const po = poseOf(y), st_ = rig.solve(po); return ts.reduce((a, t) => { const q = carry(st_, t.bone, t.rest, po); return a + t.w * ((q[0] - t.to[0]) ** 2 + (q[1] - t.to[1]) ** 2); }, 0); };
  const hips = body.filter((t) => /^hip/.test(t.n)), legT = (sd, b) => body.filter((t) => t.bone === `${b}.${sd}`);
  let best = [Infinity, x];
  for (let pv = -40; pv <= 110; pv += 10) {
    const y = x.slice(); if (iv('pelvis') >= 0) y[iv('pelvis')] = pv;
    if (hips.length) {   // root: the mean hip offset, twice (the pelvis turns about its own joint, not the root)
      for (let it = 0; it < 2; it++) { const po = poseOf(y), st_ = rig.solve(po); let dx = 0, dy = 0; for (const t of hips) { const q = carry(st_, t.bone, t.rest, po); dx += t.to[0] - q[0]; dy += t.to[1] - q[1]; }
        y[iv('root.0')] += dx / hips.length; y[iv('root.1')] += dy / hips.length; }
    }
    for (const sd of ['near', 'far']) {
      // a leg whose knee and ankle the estimator dropped (the far leg of a seated still: only its heel and toe seen) is
      // scanned as a whole: thigh × shin together against what IS seen below, starting from the near leg (it folds the
      // same way). Scanned one bone at a time it had nothing to aim the thigh and shin at and left them standing straight,
      // the far heel 1.6 H from the still's.
      const iT = iv(`thigh.${sd}`), iS = iv(`shin.${sd}`), below = [...legT(sd, 'shin'), ...legT(sd, 'foot')];
      if (sd === 'far' && iT >= 0 && iS >= 0 && !legT(sd, 'thigh').length && !legT(sd, 'shin').length && below.length) {
        const [tl, th] = lim(VARS[iT]), [sl, sh] = lim(VARS[iS]); let bb = [Infinity, y[iT], y[iS]];
        for (let a = tl; a <= th; a += 5) for (let c = sl; c <= sh; c += 5) { y[iT] = a; y[iS] = c;
          const ev = errOn(y, below) + 1e-4 * ((a - y[iv('thigh.near')]) ** 2 + (c - y[iv('shin.near')]) ** 2) / 100; if (ev < bb[0]) bb = [ev, a, c]; }
        [, y[iT], y[iS]] = bb;
      }
      for (const b of ['thigh', 'shin', 'foot']) {
        const i = iv(`${b}.${sd}`), ts = [...legT(sd, b), ...(b === 'thigh' ? legT(sd, 'shin') : [])]; if (i < 0 || !ts.length) continue;
        const [lo, hi] = lim(VARS[i]); let bb = [Infinity, y[i]];
        for (let v = lo; v <= hi; v += 5) { y[i] = v; const ev = errOn(y, legT(sd, b).length ? legT(sd, b) : ts); if (ev < bb[0]) bb = [ev, v]; }
        y[i] = bb[1];
      }
    }
    const ey = errOn(y, body); if (ey < best[0]) best = [ey, y];
  }
  x = best[1]; e = err(x);
  console.log(`body init: pelvis ${x[iv('pelvis')]}, root ${x[iv('root.0')].toFixed(2)}, ${x[iv('root.1')].toFixed(2)}`);
}
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
// LEVENBERG–MARQUARDT (--floor): off her feet every landmark pulls on the whole chain at once (a seated still's far heel
// needs the knee bent AND the hip flexed AND the pelvis upright), and coordinate descent from the body init wandered into
// a far leg held out straight, its heel 1 H from the still's (rms 0.215 H where a joint solve reaches 0.04). LM moves all
// the bones together on the residuals (each landmark's x and y, weighted; the priors as one more), then the descent polishes.
if (FLOOR) {
  const resid = (y) => { const po = poseOf(y), st_ = rig.solve(po), r = [], got = {};
    for (const t of targets) { const a = carry(st_, t.bone, t.rest, po), w = Math.sqrt(posW(t) * t.w); got[t.n] = a; r.push(w * (a[0] - t.to[0]), w * (a[1] - t.to[1])); }
    r.push(...dirRes(got));
    r.push(Math.sqrt(Math.max(0, err(y) - r.reduce((a, v) => a + v * v, 0)))); return r; };
  const ss = (r) => r.reduce((a, v) => a + v * v, 0), clampV = (y) => y.map((v, i) => { const [lo, hi] = lim(VARS[i]); return Math.max(lo, Math.min(hi, v)); });
  const solveLin = (A, b) => { const n = b.length, M = A.map((row, i) => [...row, b[i]]);
    for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      [M[c], M[p]] = [M[p], M[c]]; if (Math.abs(M[c][c]) < 1e-18) continue;
      for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; } }
    return M.map((row, i) => (Math.abs(row[i]) < 1e-18 ? 0 : row[n] / row[i])); };
  let r0 = resid(x), f0 = ss(r0), lam = 1e-2;
  for (let it = 0; it < 60; it++) {
    const cols = VARS.map((v, i) => { const h = v.startsWith('root') ? 0.004 : v.startsWith('scale.') ? 0.005 : 0.5, [lo, hi] = lim(v), y = x.slice(), hh = y[i] + h > hi ? -h : h; y[i] += hh; return resid(y).map((q, k) => (q - r0[k]) / hh); });
    const n = VARS.length, A = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => cols[i].reduce((a, q, k) => a + q * cols[j][k], 0)));
    const g = cols.map((c) => c.reduce((a, q, k) => a + q * r0[k], 0));
    let ok = false;
    for (let tries = 0; tries < 10; tries++) {
      const d = solveLin(A.map((row, i) => row.map((v, j) => (i === j ? v * (1 + lam) + 1e-12 : v))), g.map((v) => -v));
      const xn = clampV(x.map((v, i) => v + d[i])), rn = resid(xn), fn = ss(rn);
      if (fn < f0) { x = xn; r0 = rn; ok = f0 - fn > 1e-9 * f0; f0 = fn; lam = Math.max(1e-6, lam / 3); break; }
      lam *= 5;
    }
    if (!ok) break;
  }
  e = err(x);
}
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
if (flag('why')) {   // --why: what the final error is made of (positions, directions, priors), biggest first
  const got = {}, rows = [];
  for (const t of targets) { const a = carry(st, t.bone, t.rest, poF); got[t.n] = a; rows.push([`pos ${t.n}`, posW(t) * t.w * ((a[0] - t.to[0]) ** 2 + (a[1] - t.to[1]) ** 2)]); }
  const dr = dirRes(got); let k = 0;
  for (const [A, B] of SEGS) { const tw = Object.fromEntries(targets.map((t) => [t.n, 1])); if (!A.some((n) => tw[n]) || !B.some((n) => tw[n])) continue; rows.push([`dir ${A.join('+')}→${B.join('+')}`, dr[k] ** 2 + dr[k + 1] ** 2]); k += 2; }
  rows.push(['prior3', prior3(x)], ['order3', order3(st)]);
  rows.sort((a, b) => b[1] - a[1]); console.log('why: ' + rows.slice(0, 14).map(([n, v]) => `${n} ${v.toFixed(4)}`).join(', '));
}
for (const t of targets) { const a = carry(st, t.bone, t.rest, poF); rep.push([t.n, Math.hypot(a[0] - t.to[0], a[1] - t.to[1])]); }
rep.sort((a, b) => b[1] - a[1]);
const handArg = Object.fromEntries((arg('hand', '') || '').split(',').filter(Boolean).map((kv) => kv.split('=')));   // --hand far=cover: the library shape SEEN in the reference
const out = { name: outName, note: arg('note', `fitted to ${refJson} (MediaPipe landmarks, base ${baseName})`), ...((base.hands || arg('hand')) && !flag('hands') ? { hands: { ...(base.hands || {}), ...handArg } } : {}),
  ...(base.handView || arg('view') ? { handView: { ...(base.handView || {}), ...Object.fromEntries((arg('view', '') || '').split(',').filter(Boolean).map((kv) => kv.split('='))) } } : {}),
  ...(base.zBias || arg('z') ? { zBias: { ...(base.zBias || {}), ...Object.fromEntries((arg('z', '') || '').split(',').filter(Boolean).map((kv) => { const [a, b] = kv.split('='); return [a, +b]; })) } } : {}), ...(basePose.fx || poF.fx?.headPitch || arg('show') ? { fx: { ...(basePose.fx || {}), ...(VARS.includes('fx.headPitch') ? { headPitch: Math.round(poF.fx.headPitch * 10) / 10 } : {}), ...Object.fromEntries((arg('show', '') || '').split(',').filter(Boolean).map((h) => [`show.${h}`, 1])) } } : {}), ...(base.scale || flag('fold') || flag('splay') ? { scale: Object.fromEntries(Object.entries(poF.scale || {}).map(([k, v]) => [k, v.map((q) => Math.round(q * 1000) / 1000)])) } : {}),
  // --props chair,ball,counter,toy,chair:back=1: the furniture the pose needs (characters/<c>/parts/props.js places it from
  // her posed body; the skirt rests on it)
  ...(arg('props') ? { props: { items: arg('props').split(',').map((t) => { const [type, ...kv] = t.split(':'); return { type, ...Object.fromEntries(kv.map((q) => { const [k, v] = q.split('='); return [k, isNaN(+v) ? v : +v]; })) }; }) } } : {}),
  root: [+poseOf(x).root[0].toFixed(4), +poseOf(x).root[1].toFixed(4)],
  bones: Object.fromEntries(Object.entries(poseOf(x).bones).filter(([k]) => flag('hands') || !/^hand\.(near|far|farB)\./.test(k)).map(([k, v]) => [k, Math.round(v * 10) / 10])),
  _fit: { ref: refJson, scale: +s.toFixed(4), rms: +Math.sqrt(rep.reduce((a, r) => a + r[1] ** 2, 0) / rep.length).toFixed(4), worst: rep.slice(0, 5).map(([n, d]) => `${n} ${d.toFixed(3)}`) } };
fs.mkdirSync(`${D}poses/${outName}`.replace(/\/[^/]*$/, ''), { recursive: true }); fs.writeFileSync(`${D}poses/${outName}.json`, JSON.stringify(out, null, 1));
console.log(`fit ${outName}: ${targets.length} targets, rms ${out._fit.rms} H, scale ${s.toFixed(3)}; worst: ${out._fit.worst.join(', ')}`);
// targets in rig units for the overlay tool
fs.mkdirSync(`out/fit_${outName}`.replace(/\/[^/]*$/, ''), { recursive: true }); fs.writeFileSync(`out/fit_${outName}_targets.json`, JSON.stringify({ ref: refJson, xf: { s, sx, sy, cx, cy, sizePx: Lm.sizePx, ground: Lm.ground, Hpx: Lm.Hpx, W: ref.W, H: ref.H, kx: KX, ky: KY }, targets: targets.map((t) => ({ n: t.n, to: t.to, got: carry(st, t.bone, t.rest, poF), bone: t.bone, rest: t.rest, w: t.w })) }));
