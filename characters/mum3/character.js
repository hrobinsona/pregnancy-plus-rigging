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
import { ap } from '../../engine/geom.js';

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
      { id: `thigh.${s}`, parent: `hipAbd.${s}`, joint: `hip${S}`, aim: `knee${S}`, plane: 'sagittal', restAnat: 0, min: -35, max: 135, cap: 0.3 },   // a deep squat flexes the hip ≈ 130°
      { id: `shin.${s}`, parent: `thigh.${s}`, joint: `knee${S}`, aim: `ankle${S}`, plane: 'sagittal', restAnat: 0, min: -150, max: 5, cap: 0.26 },
      { id: `foot.${s}`, parent: `shin.${s}`, joint: `ankle${S}`, aim: `ball${S}`, plane: 'sagittal', restAnat: 90, min: -90, max: 40, cap: 0.12 },   // − = plantarflexion: kneeling lays the foot's top on the floor, in line with the shin
      { id: `toe.${s}`, parent: `foot.${s}`, joint: `ball${S}`, aim: `toe${S}`, plane: 'sagittal', restAnat: 90, min: -20, max: 60 },
    ];
  }),
];

const merge = (mod, ...extra) => ({ ANCHORS: Object.assign({}, mod.ANCHORS, ...extra), build: mod.build });
const X = params.P;

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
    on: '^(dress|dress\\.bump|dress\\.shade|dress\\.skirt|chest\\.skin)$' },
  // skin on skin (a hand over the face or over its own arm) reads only through a line where it overlaps
  outlineGroups: [
    { match: /^hand\.near\./, behind: /^(face|neck|chest\.skin|leg\.near)$/, material: params.palette.skin, line: params.palette.skinLine, w: 0.01 },   // not against its own arm (that drew a line round the wrist)
  ],
  // the bump and bust hang by their weight (parts/body.js sag); the props go under her (parts/props.js); then the SKIRT hangs from the posed bodice over the posed legs (parts/skirt.js, engine/drape.js)
  postBuild(parts, ctx) { body.sag(parts, ctx); const pr = propsFor(parts, ctx); parts.push(...pr.parts, skirtPart(parts, ctx, pr)); },
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
    const E = ([x0, x1], ry = 0.09) => `<ellipse cx="${(flip * (x0 + x1) / 2 * Hpx).toFixed(2)}" cy="${(-0.05 * Hpx).toFixed(2)}" rx="${((x1 - x0) / 2 * Hpx).toFixed(2)}" ry="${(ry * Hpx).toFixed(2)}" fill="${fill}"/>`;
    if (!parts) return E(rest);
    // each part's stretch of floor (the x-span of its outline within a hair of the floor; a shoe's sole lifts at the heel),
    // then the stretches that touch or nearly touch merged into one shadow each
    const spans = [], low = (p) => p.geom.P.map((q) => ap(p.M, q));
    for (const p of parts) {
      if (!/^(shoe|leg|hand|prop)\./.test(p.id) || p.id.endsWith('.ol')) continue;
      const P = low(p), lo = Math.max(...P.map((q) => q[1])), shoe = p.id.startsWith('shoe.');
      const floor = p.id === 'shoe.far' && Math.abs(lo - X.shoe.far.sole) < 0.04 ? X.shoe.far.sole : 0;   // the far foot on its own floor line (she is turned a little toward us)
      const xs = P.filter((q) => q[1] > floor - (shoe ? 0.12 : 0.08)).map((q) => q[0]);
      if (xs.length) spans.push({ x0: Math.min(...xs), x1: Math.max(...xs), ids: [p.id] });
    }
    if (!spans.length) return '';
    spans.sort((a, b) => a.x0 - b.x0);
    const groups = [spans[0]];
    for (const q of spans.slice(1)) { const g = groups[groups.length - 1]; if (q.x0 - g.x1 > 0.25) groups.push({ ...q }); else { g.x1 = Math.max(g.x1, q.x1); g.ids.push(...q.ids); } }
    return groups.map((g) => {
      let x0 = g.x0 - 0.1, x1 = g.x1 + 0.1;
      if (g.ids.every((id) => /^(shoe|leg)\./.test(id)) && Math.abs(x0 - rest[0]) < 0.12 && Math.abs(x1 - rest[1]) < 0.12) return E(rest);   // standing: the shadow it always had
      const ball = parts.find((p) => p.id === 'prop.ball');
      if (ball && g.ids.includes('prop.ball')) { const xs = low(ball).map((q) => q[0]), r = (Math.max(...xs) - Math.min(...xs)) / 2, c = (x0 + x1) / 2; x0 = Math.min(x0, c - 0.7 * r); x1 = Math.max(x1, c + 0.7 * r); }
      return E([x0, x1], x1 - x0 < 0.5 ? 0.06 : 0.09);
    }).join('');
  },
};
