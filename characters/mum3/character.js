// character.js — mum3, a standing pregnant woman in near PROFILE facing right, designed for a cut-out rig: bare arms (one
// continuous skinned tube from shoulder to wrist, no sleeve pivoting over a joint), a sleeveless dress, a clear neck, the
// far arm hidden behind her. The character contract the engine expects (see characters/mum2/character.js):
//   name, joints, bones, modules {ANCHORS, build}, palette, design {facing, forwardX, planes}, frame, ref, roles, params.
import * as params from './params.js';
import { makeHand } from '../../engine/hand.js';
import * as head from './parts/head.js';
import * as hair from './parts/hair.js';
import * as body from './parts/body.js';
import * as arms from './parts/arms.js';
import * as legs from './parts/legs.js';
import { skirtPart } from './parts/skirt.js';
import { propsFor } from './parts/props.js';
import { ap, add, sub, mulS, norm, lerp, loop, stroke, len } from '../../engine/geom.js';
const angOf = (v) => Math.atan2(v[1], v[0]) * 180 / Math.PI;


const J = { ...params.joints };
const hands = { near: makeHand(params.handSpecs.near), far: makeHand(params.handSpecs.far) };
Object.assign(J, hands.near.joints, hands.far.joints);
J.handNearTip = J['hand.near.f2t'];
J.handFarTip = J['hand.far.f2t'];

// angle limits: screen-plane bones in degrees relative to rest; sagittal bones are ANATOMICAL (+ = forward/flexion)
const bones = [
  { id: 'root', parent: null, joint: 'root', aim: 'pelvis', min: 0, max: 0 },
  // the pelvis carries the whole body (spine, bump, legs): its range is her whole-body pitch for side-on poses off her feet
  // (all fours ≈ +80, bending to the floor, reclining ≈ −30), not the pelvic tilt of a standing woman (±12 there)
  { id: 'pelvis', parent: 'root', joint: 'pelvis', aim: 'spineLower', min: -45, max: 110 },
  { id: 'spineLower', parent: 'pelvis', joint: 'spineLower', aim: 'spineUpper', min: -12, max: 12 },
  { id: 'spineUpper', parent: 'spineLower', joint: 'spineUpper', aim: 'chest', min: -12, max: 12 },
  { id: 'chest', parent: 'spineUpper', joint: 'chest', aim: 'neck', min: -12, max: 12 },
  { id: 'neck', parent: 'chest', joint: 'neck', aim: 'head', min: -50, max: 30, cap: 0.14 },   // − = extension: on all fours she looks ahead with the neck bent back ≈ 45° off the trunk
  { id: 'head', parent: 'neck', joint: 'head', aim: 'headTip', min: -40, max: 40, cap: 0.14 },
  { id: 'belly', parent: 'pelvis', joint: 'bellyBase', aim: 'bellyApex', min: -6, max: 6 },
  ...['near', 'far'].flatMap((s) => {
    const S = s === 'near' ? 'Near' : 'Far';
    return [
      { id: `clavicle.${s}`, parent: 'chest', joint: `clavicle${S}`, aim: `shoulder${S}`, min: -22, max: 22, ...(s === 'far' ? { depthFrom: 'clavicleNear' } : {}) },
      { id: `shoulderAbd.${s}`, parent: `clavicle.${s}`, joint: `shoulder${S}`, aim: `elbow${S}`, min: -30, max: 30 },
      // 3D ARM (engine/rig.js arm3): upperArm = elevation (+ forward), armAbd = plane of elevation, armRot = humeral
      // rotation, forearm = elbow flexion, foreRot = pronation, hand = wrist deviation, wristFlex = wrist flexion/extension.
      // Parameter bones carry no drawing.
      { id: `armAbd.${s}`, parent: `shoulderAbd.${s}`, joint: `shoulder${S}`, aim: `elbow${S}`, param: true, min: -100, max: 130 },
      { id: `armRot.${s}`, parent: `shoulderAbd.${s}`, joint: `shoulder${S}`, aim: `elbow${S}`, param: true, min: -60, max: 95 },
      { id: `foreRot.${s}`, parent: `shoulderAbd.${s}`, joint: `elbow${S}`, aim: `wrist${S}`, param: true, min: -90, max: 90 },
      { id: `wristFlex.${s}`, parent: `shoulderAbd.${s}`, joint: `wrist${S}`, aim: `hand${S}Tip`, param: true, min: -60, max: 90 },   // + = extension (engine/rig.js arm3); 90: a palm flat on the floor under a straight arm (all fours) bears weight on an extended wrist
      { id: `upperArm.${s}`, parent: `shoulderAbd.${s}`, joint: `shoulder${S}`, aim: `elbow${S}`, plane: 'arm3', side: s, abd: `armAbd.${s}`, twist: `armRot.${s}`, min: -60, max: 170, cap: 0.2 },
      { id: `forearm.${s}`, parent: `upperArm.${s}`, joint: `elbow${S}`, aim: `wrist${S}`, plane: 'arm3', pron: `foreRot.${s}`, min: -5, max: 150, cap: 0.18 },
      { id: `hand.${s}`, parent: `forearm.${s}`, joint: `wrist${S}`, aim: `hand${S}Tip`, plane: 'arm3', flex: `wristFlex.${s}`, min: -50, max: 40, cap: 0.08 },
    ];
  }),
  ...hands.near.bones, ...hands.far.bones,
  ...['far', 'near'].flatMap((s) => {
    const S = s === 'near' ? 'Near' : 'Far';
    return [
      { id: `hipAbd.${s}`, parent: 'pelvis', joint: `hip${S}`, aim: `knee${S}`, min: -20, max: 20, ...(s === 'far' ? { depthFrom: 'hipNear' } : {}) },   // (engine/rig.js depthFrom: the far hip's offset is depth, not turned by the pelvis)
      { id: `thigh.${s}`, parent: `hipAbd.${s}`, joint: `hip${S}`, aim: `knee${S}`, plane: 'sagittal', restAnat: 0, min: -35, max: 165, cap: 0.3 },   // a deep squat flexes the hip ≈ 130°; with the knees out round the bump (abducted: side-on, the thigh's projection) up to ≈ 165°
      { id: `shin.${s}`, parent: `thigh.${s}`, joint: `knee${S}`, aim: `ankle${S}`, plane: 'sagittal', restAnat: 0, min: -175, max: 5, cap: 0.26 },   // (a full squat folds the knee ~155–160°, the calf against the thigh, and with the knee turned out round the bump the thigh's foreshortened projection folds further still; at −150 she couldn't get low enough to reach the floor)
      { id: `foot.${s}`, parent: `shin.${s}`, joint: `ankle${S}`, aim: `ball${S}`, plane: 'sagittal', restAnat: 90, min: -90, max: 40, cap: 0.12 },   // − = plantarflexion: kneeling lays the foot's top on the floor, in line with the shin
      { id: `toe.${s}`, parent: `foot.${s}`, joint: `ball${S}`, aim: `toe${S}`, plane: 'sagittal', restAnat: 90, min: -20, max: 60 },
    ];
  }),
];

const merge = (mod, ...extra) => ({ ANCHORS: Object.assign({}, mod.ANCHORS, ...extra), build: mod.build });
const X = params.P;

// a thigh SITTING on something flattens on it: its underside (full where it hangs, parts/legs.js) is pressed level with
// the chair's seat or the ball's top instead of passing through it (sit-chair: the thigh's root bulged 0.1 H under the seat)
function seatFlat(parts, floors) {
  if (!floors.length) return;
  for (const p of parts) if (/^leg\.(near|far)$/.test(p.id) && p.world) for (const A of [p.geom.P, p.geom.hin, p.geom.hout]) for (const q of A)
    for (const [x0, x1, y] of floors) if (q[0] >= x0 && q[0] <= x1 && q[1] > y && q[1] - y < 0.35) q[1] = y;
}

// the NEAR THIGH passes in FRONT of the bump: sitting, squatting or bending, the bump settles between her thighs and the near
// one is nearer us than its lower half (the stills: the near knee and thigh drawn over the bump, the dress lying on the
// thigh; under the dress, round 2 hid both thighs in "a balloon"). So the near leg is drawn over the dress, and the cloth
// lying on it (the skirt where it covers the leg) over the leg, edged in the dress's colour so the leg's anti-aliased rim
// never shows through. Standing, that is the old picture to the pixel: the skirt over the thigh, the leg below the hem.
// The cloth on the leg is the leg's own outline clipped to the skirt AND to everything on the hip's side of the hem (where
// the bump's bottom sinks below the thigh's top, the skirt's outline cuts across the thigh: a triangle of bare skin showed
// inside the dress).
function lapOver(parts, ctx) {
  const pal = ctx.P;
  const leg = parts.find((p) => p.id === 'leg.near'), sk = parts.find((p) => p.id === 'dress.skirt');
  if (!leg || !sk) return;
  for (const p of parts) if (/^(leg\.near(\.crease)?|shoe\.near)$/.test(p.id)) p.z += 10.1;   // 20 → 30.1: over the dress (30)
  // the line the cloth ends at on the leg: standing, the skirt's hem; with the thigh forward, the side's diagonal across
  // the thigh (engine/drape.js: side), blended by how far forward the thigh points
  const dr = sk.drape, sd = dr.side, hip = ctx.st['thigh.near'].pos;
  const a = sd ? lerp(dr.hem[0], sd.top, sd.w) : dr.hem[0], b = sd ? lerp(dr.hem[dr.hem.length - 1], sd.bot, sd.wb ?? sd.w) : dr.hem[dr.hem.length - 1];   // (sd.wb: the near thigh's own forwardness; kneeling on one knee it hangs upright and the back's hem stays put)
  const mid = sd && sd.w > 0.5 ? [] : dr.hem.slice(1, -1), t = norm(sub(a, b));
  let n = [t[1], -t[0]]; if ((hip[0] - b[0]) * n[0] + (hip[1] - b[1]) * n[1] < 0) n = [-n[0], -n[1]];
  // (the back end runs on past the seat: the thigh's root under the buttocks is under the cloth too; cut short there, it
  // showed below the seat as skin nubs, round 2)
  const D = 2.5, e = 0.3, A = add(a, mulS(t, e)), B = sub(b, mulS(t, 1.2));
  const cut = loop([A, a, ...mid, b, B, add(B, mulS(n, D)), add(A, mulS(n, D))].map((q) => [...q]));
  // the knee's side of the line, as far as the leg can reach: the leg shows there as skin
  const A2 = add(a, mulS(t, 5)), B2 = sub(b, mulS(t, 5)), knee = loop([A2, a, ...mid, b, B2, sub(B2, mulS(n, 5)), sub(A2, mulS(n, 5))].map((q) => [...q]));
  // On the hip's side the thigh is under the cloth: drawn as dress where it lies over the skirt or the bodice (the thigh
  // coming out over the bump), and not at all past them (its root showed below the seat as skin nubs, round 2: the cloth's
  // outline there is the skirt's, round the seat)
  leg.clip = ['dress.skirt', 'dress']; leg.clipGeom = [knee];
  // (inside the skirt it is cloth whatever side: the hem's rounded corners hang below the line)
  for (const [id, z, paint] of [['dress.lap', 30.12, { fill: pal.dress }], ['dress.lap.edge', 30.121, { fill: 'none', stroke: pal.dress, strokeW: 0.012 }]]) {
    parts.push({ id, bone: 'pelvis', z, ...paint, world: true, geom: leg.geom, M: leg.M, clip: ['dress.skirt'] },
      { id: id + '.bodice', bone: 'pelvis', z, ...paint, world: true, geom: leg.geom, M: leg.M, clip: ['dress'], clipAnd: [cut] });
  }
  // BETWEEN THE KNEES (squatting, bending: fx.kneesApart): the skirt's hem spans from the near knee's side to the far one
  // and sags between them, its inside seen below the near thigh from the hem on its underside back to the seat (the squat
  // and bend stills: a darker flap hanging to about mid-shin, behind the near shin, in front of the far leg; round 2 "a
  // closed balloon... a curtain between the knees")
  if (sd && sd.apart > 0.05) {
    const P1 = sd.bot, P2 = dr.Hb, ch = sub(P2, P1), L = len(ch), u = mulS(ch, 1 / L), up = [u[1], -u[0]][1] < 0 ? [u[1], -u[0]] : [-u[1], u[0]];
    // a HAMMOCK: the hem slung between the thigh's underside and the seat's bottom, sagging a little in one smooth curve
    // (sagging 0.45 of the span to a point it hung below the seat as a dark pointed tail, round 3: "a balloon with a dark
    // pointed tail"); the stills' curtain is a shallow dark crescent under the near thigh
    const sag = Math.min(0.16, 0.18 * L) * sd.apart, low = add(lerp(P1, P2, 0.55), [0, sag]), tl = angOf(sub(P1, P2));
    const geom = loop([[...add(P1, mulS(up, 0.08)), { c: true }], [...add(P2, mulS(up, 0.08)), { c: true }], [...P2, { ao: tl + 35, t: 0.8 }],
      [...low, { a: tl }], [...P1, { ai: tl - 35, c: true, t: 0.8 }]]);
    parts.push({ id: 'dress.curtain', bone: 'pelvis', z: 30.03, fill: pal.dressShade, world: true, geom, M: [1, 0, 0, 1, 0, 0] });
  }
  // where the near thigh passes in front of the bump the cloth folds: the squatting and bending stills draw the thigh's top
  // under the bump as a darker line, so the thigh reads as a form under the dress (dress on dress, it vanished: round 2's
  // "the thighs hidden in a balloon"). The thigh's top, where it lies over the bodice, as a tapered shade line; faded in
  // as the thigh comes forward (standing, the thigh's top is under the skirt, not the bump)
  const lg = legs.legFor(ctx, 'near'), bod = parts.find((p) => p.id === 'dress');
  const ang = Math.acos(Math.max(-1, Math.min(1, lg.u[1]))) * 180 / Math.PI, k = Math.max(0, Math.min(1, (ang - 40) / 30));
  if (!bod || k <= 0.01) return;
  const poly = flat(bod.geom), top = [];
  for (let f = 0; f <= 1.0001; f += 0.025) top.push(lg.TF(f));
  let run = [], cur = [];
  for (const q of top) { if (inside(q, poly)) cur.push(q); else { if (cur.length > run.length) run = cur; cur = []; } }
  if (cur.length > run.length) run = cur;
  if (run.length < 4) return;
  const m = run.length, wd = run.map((_, i) => 0.016 * Math.sin(Math.PI * Math.min(1, 1.6 * Math.min(i, m - 1 - i) / (m - 1))) ** 0.7);
  parts.push({ id: 'dress.lap.fold', bone: 'pelvis', z: 30.125, fill: pal.dressShade, world: true, geom: stroke(run, wd, 'point'), M: leg.M, opacity: k });
}
// where the near shoe overlaps the far one (kneeling, on all fours: the feet side by side behind her), a thin line of the
// near foot's skin parts them, as the stills draw it: the same dark brown, the two merged into one shoe (round 2 "the
// shoes merge"). An outline clipped to the far shoe: where they don't overlap (standing, walking) nothing shows
function shoeGap(parts, ctx) {
  const sn = parts.find((p) => p.id === 'shoe.near');
  if (sn && parts.some((p) => p.id === 'shoe.far')) parts.push({ id: 'shoe.near.ol', bone: sn.bone, z: sn.z - 0.005, stroke: ctx.P.skin, strokeW: 0.026, world: sn.world, geom: sn.geom, M: sn.M, clip: ['shoe.far'] });
}
// the chest skin never shows behind the dress's back line (blade → shoulder) below the strap's top: as the arm reaches
// forward its cap leaves the back of the shoulder, and a sliver of the skin there read as a knob behind the shoulder
// (side-on rounds 1–2). Above the strap it is the slope from the neck onto the shoulder and stays (cut there, the neck
// stood on the shoulders like a bottle's)
function backLine(parts, ctx) {
  const sk = parts.find((p) => p.id === 'chest.skin'), X = ctx.C.params.P, bk = X.back, M = ctx.st.chest.M, J0 = ctx.C.joints.chest;
  if (!sk) return;
  const pose = (q) => ap(M, sub(q, J0));   // (a rest-space point on the chest, posed)
  const lvY = X.strap.back[1], lvX = bk.shoulder[0] + (lvY - bk.shoulder[1]) * (bk.shoulder[0] - bk.blade[0]) / (bk.shoulder[1] - bk.blade[1]);
  const A = pose([bk.blade[0] - (bk.shoulder[0] - bk.blade[0]) * 4, bk.blade[1] + 2]), L = pose([lvX, lvY]);
  const fw = norm([M[0], M[1]]), up = norm([-M[2], -M[3]]);
  sk.clipGeom = [loop([A, L, sub(L, mulS(fw, 4)), add(sub(L, mulS(fw, 4)), mulS(up, 4)), add(add(L, mulS(fw, 4)), mulS(up, 4)), add(A, mulS(fw, 4))].map((q) => [...q, { c: true }]))];
}
// a cubic loop flattened (8 samples a span), and an even-odd point-in-polygon test
const flat = (g) => { const out = [], n = g.P.length; for (let i = 0; i < n; i++) { const j = (i + 1) % n; for (let t = 0; t < 1; t += 0.125) { const u = 1 - t;
  out.push([0, 1].map((c) => u * u * u * g.P[i][c] + 3 * u * u * t * g.hout[i][c] + 3 * u * t * t * g.hin[j][c] + t * t * t * g.P[j][c])); } } return out; };
const inside = (q, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j];
  if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };

export default {
  name: 'mum3',
  params, hands,
  handLibrary: ['relaxed', 'open', 'cup', 'press', 'grip', 'fist', 'point', 'cover', 'limp', 'lay', 'hang', 'wrap', 'flat', 'crest'],
  handSides: { near: { prefix: 'hand.near', spreadSign: hands.near.spreadSign }, far: { prefix: 'hand.far', spreadSign: hands.far.spreadSign } },
  joints: J,
  bones,
  palette: params.palette,
  design: { ...params.design, planes: { ...hands.near.planes, ...hands.far.planes } },
  modules: { hair: merge(hair), legs: merge(legs), body: merge(body), head: merge(head), arms: merge(arms, hands.near.ANCHORS, hands.far.ANCHORS) },
  // shoulder rhythm: past ~30° of arm flexion the clavicle lifts ≈ 1° per 5°
  drivers: [
    { bone: 'clavicle.near', from: 'upperArm.near', k: 0.18, start: 30, soft: 20, max: 60 },
    { bone: 'clavicle.far', from: 'upperArm.far', k: -0.18, start: 30, soft: 20, max: 60 },
  ],
  // a hand on her casts a faint near-hard shadow onto her dress and skin (reels: ~12 %, a few px, no blur)
  contactShadow: { opacity: 0.12, offset: [4, 6], color: '#5a1f12', groups: [{ match: '^hand\\.near\\.', gate: 'contact.near' }],   // pose.fx['contact.near']: the hanging hand casts none
    on: '^(dress|dress\\.bump|dress\\.shade|dress\\.skirt|dress\\.lap(\\.bodice)?|chest\\.skin)$' },
  // skin on skin (a hand over the face or over its own arm) reads only through a line where it overlaps
  outlineGroups: [
    { match: /^hand\.near\./, behind: /^(face|neck|chest\.skin|leg\.near)$/, material: params.palette.skin, line: params.palette.skinLine, w: 0.01 },   // not against its own arm (that drew a line round the wrist)
  ],
  // the bump and bust hang by their weight (parts/body.js sag); the props go under her (parts/props.js); then the SKIRT hangs from the posed bodice over the posed legs (parts/skirt.js, engine/drape.js)
  postBuild(parts, ctx) { body.sag(parts, ctx); body.lumbar(parts, ctx); body.rest(parts, ctx); backLine(parts, ctx); const pr = propsFor(parts, ctx); seatFlat(parts, pr.floors); parts.push(...pr.parts, skirtPart(parts, ctx, pr)); lapOver(parts, ctx); shoeGap(parts, ctx); },
  // fitting (tools/fit_pose.mjs): the far arm is hidden behind her by design; the estimator's guesses for it are skipped
  fit: { hidden: ['far.arm'] },
  frame: params.frame,
  ref: params.ref,
  roles: {
    spine: ['pelvis', 'spineLower', 'spineUpper', 'chest', 'neck', 'head'], belly: 'belly', breathBone: 'spineUpper',
    arms: Object.fromEntries(['near', 'far'].map((s) => { const S = s === 'near' ? 'Near' : 'Far';
      return [s, { clavicle: `clavicle.${s}`, abd: `shoulderAbd.${s}`, upper: `upperArm.${s}`, fore: `forearm.${s}`, hand: `hand.${s}`, shoulder: `shoulder${S}`, elbow: `elbow${S}`, wrist: `wrist${S}` }]; })),
    legs: Object.fromEntries(['near', 'far'].map((s) => { const S = s === 'near' ? 'Near' : 'Far';
      return [s, { abd: `hipAbd.${s}`, thigh: `thigh.${s}`, shin: `shin.${s}`, foot: `foot.${s}`, toe: `toe.${s}`, hip: `hip${S}`, knee: `knee${S}`, ankle: `ankle${S}`, ball: `ball${S}` }]; })),
  },
  /** flat contact shadow under whatever touches the floor (SVG string; model px): standing, one ellipse under both feet;
   *  side-on poses (kneeling, all fours, sitting, squatting), one under each group of contacts: the shins along the floor,
   *  each palm, each chair leg, the ball (a pose off its feet with the standing ellipse under empty floor reads as floating) */
  ground(pose, fill, Hpx, parts) {
    const flip = (pose.facing || 'right') === 'left' ? -1 : 1, rest = [X.shoe.near.heel[0] - 0.1, X.shoe.far.toe[0] + 0.1];
    const E = ([x0, x1], ry = 0.09, fl = 0) => `<ellipse cx="${(flip * (x0 + x1) / 2 * Hpx).toFixed(2)}" cy="${((fl - 0.05) * Hpx).toFixed(2)}" rx="${((x1 - x0) / 2 * Hpx).toFixed(2)}" ry="${(ry * Hpx).toFixed(2)}" fill="${fill}"/>`;
    if (!parts) return E(rest);
    // each part's stretch of floor (the x-span of its outline within a hair of the floor; a shoe's sole lifts at the heel),
    // then the stretches that touch or nearly touch merged into one shadow each
    const spans = [], low = (p) => p.geom.P.map((q) => ap(p.M, q));
    for (const p of parts) {
      if (!/^(shoe|leg|hand|prop)\./.test(p.id) || p.id.endsWith('.ol')) continue;
      const P = low(p), lo = Math.max(...P.map((q) => q[1])), shoe = p.id.startsWith('shoe.');
      const floor = p.id === 'shoe.far' && Math.abs(lo - X.shoe.far.sole) < 0.04 ? X.shoe.far.sole : 0;   // the far foot on its own floor line (she is turned a little toward us)
      const xs = P.filter((q) => q[1] > floor - (shoe ? 0.12 : 0.08)).map((q) => q[0]);
      if (xs.length) spans.push({ x0: Math.min(...xs), x1: Math.max(...xs), ids: [p.id], fl: floor });
    }
    if (!spans.length) return '';
    spans.sort((a, b) => a.x0 - b.x0);
    const groups = [spans[0]];
    // (a stretch on the far foot's floor line stays apart from the near ones: its shadow on that line, under the far shoe;
    // on the near floor it hung 0.16 H below a stepping far foot, which read as floating, critic R2 "the front heel up")
    for (const q of spans.slice(1)) { const g = groups[groups.length - 1]; if (q.x0 - g.x1 > 0.25 || (q.fl !== g.fl && q.x0 > g.x1 - 0.05)) groups.push({ ...q, ids: [...q.ids] }); else { g.x1 = Math.max(g.x1, q.x1); g.ids.push(...q.ids); g.fl = Math.max(g.fl, q.fl); } }
    return groups.map((g) => {
      let x0 = g.x0 - 0.1, x1 = g.x1 + 0.1;
      if (g.ids.every((id) => /^(shoe|leg)\./.test(id)) && Math.abs(x0 - rest[0]) < 0.12 && Math.abs(x1 - rest[1]) < 0.12) return E(rest);   // standing: the shadow it always had
      const ball = parts.find((p) => p.id === 'prop.ball');
      if (ball && g.ids.includes('prop.ball')) { const xs = low(ball).map((q) => q[0]), r = (Math.max(...xs) - Math.min(...xs)) / 2, c = (x0 + x1) / 2; x0 = Math.min(x0, c - 0.7 * r); x1 = Math.max(x1, c + 0.7 * r); }
      return E([x0, x1], x1 - x0 < 0.5 ? 0.06 : 0.09, g.fl);
    }).join('');
  },
};
