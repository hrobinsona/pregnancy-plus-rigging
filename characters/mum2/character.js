// character.js — Mum v2 (standing master, ¾ view facing right). The character contract the engine expects:
//   name, joints, bones (parent-first, with plane/restAnat for projected limbs), modules {ANCHORS, build},
//   palette, design {facing, forwardX, planes}, frame, ref, roles (which bones play spine/arm/leg roles), params.
import * as params from './params.js';
import { makeHand } from '../../engine/hand.js';
import * as head from './parts/head.js';
import { pitchWarp } from '../../engine/warp.js';
import * as hair from './parts/hair.js';
import * as body from './parts/body.js';
import * as arms from './parts/arms.js';
import * as legs from './parts/legs.js';
import * as wrap from './parts/wrap.js';

const J = { ...params.joints };
const hands = { near: makeHand(params.handSpecs.near), far: makeHand(params.handSpecs.far), farBack: makeHand(params.handSpecs.farBack) };
Object.assign(J, hands.near.joints, hands.far.joints, hands.farBack.joints);
J.handNearTip = J['hand.near.f2t'];
J.handFarTip = J['hand.far.f2t'];

// angle limits: screen-plane bones in degrees relative to rest; sagittal bones are ANATOMICAL (+ = forward/flexion)
const bones = [
  { id: 'root', parent: null, joint: 'root', aim: 'pelvis', min: 0, max: 0 },
  { id: 'pelvis', parent: 'root', joint: 'pelvis', aim: 'spineLower', min: -12, max: 12 },
  { id: 'spineLower', parent: 'pelvis', joint: 'spineLower', aim: 'spineUpper', min: -12, max: 12 },
  { id: 'spineUpper', parent: 'spineLower', joint: 'spineUpper', aim: 'chest', min: -12, max: 12 },
  { id: 'chest', parent: 'spineUpper', joint: 'chest', aim: 'neck', min: -12, max: 12 },
  { id: 'neck', parent: 'chest', joint: 'neck', aim: 'head', min: -20, max: 20, cap: 0.14 },
  { id: 'head', parent: 'neck', joint: 'head', aim: 'headTip', min: -40, max: 40, cap: 0.14 },
  { id: 'belly', parent: 'pelvis', joint: 'bellyBase', aim: 'bellyApex', min: -6, max: 6 },
  ...['near', 'far'].flatMap((s) => {
    const S = s === 'near' ? 'Near' : 'Far';
    return [
      { id: `clavicle.${s}`, parent: 'chest', joint: `clavicle${S}`, aim: `shoulder${S}`, min: -22, max: 22 },   // ±22°: a full breath shrug / gag jump (±10 clamped the R3 shrug to ~20 px)
      // abduction (frontal plane ≈ picture plane in ¾) as a screen rotation, then flexion/extension in the sagittal plane
      { id: `shoulderAbd.${s}`, parent: `clavicle.${s}`, joint: `shoulder${S}`, aim: `elbow${S}`, min: -30, max: 30 },
      // 3D ARM (engine/rig.js arm3): upperArm = elevation (+ forward), armAbd = plane of elevation turned out to the side
      // (0 = straight forward, 90 = pure abduction), armRot = humeral rotation (+ internal: forearm swings across the body),
      // forearm = elbow flexion, foreRot = pronation (turns the wrist's bend plane and the palm). armAbd = armRot = foreRot = 0
      // is the old sagittal arm. Parameter bones carry no drawing.
      { id: `armAbd.${s}`, parent: `shoulderAbd.${s}`, joint: `shoulder${S}`, aim: `elbow${S}`, param: true, min: -100, max: 130 },
      { id: `armRot.${s}`, parent: `shoulderAbd.${s}`, joint: `shoulder${S}`, aim: `elbow${S}`, param: true, min: -60, max: 95 },
      { id: `foreRot.${s}`, parent: `shoulderAbd.${s}`, joint: `elbow${S}`, aim: `wrist${S}`, param: true, min: -90, max: 90 },
      { id: `upperArm.${s}`, parent: `shoulderAbd.${s}`, joint: `shoulder${S}`, aim: `elbow${S}`, plane: 'arm3', side: s, abd: `armAbd.${s}`, twist: `armRot.${s}`, min: -60, max: 170, cap: 0.2 },
      { id: `forearm.${s}`, parent: `upperArm.${s}`, joint: `elbow${S}`, aim: `wrist${S}`, plane: 'arm3', pron: `foreRot.${s}`, min: -5, max: 150, cap: 0.18 },
      { id: `hand.${s}`, parent: `forearm.${s}`, joint: `wrist${S}`, aim: `hand${S}Tip`, plane: 'arm3', min: -50, max: 40, cap: 0.08 },   // ±70 drew broken wrists (client flag 1). The in-plane bend is deviation (≈30°) with the palm to the body, but flexion/extension when the palm turns to the face (hand over mouth), which the 2D rig can't tell apart: −50…40 covers both without the impossible extremes
    ];
  }),
  ...hands.near.bones, ...hands.far.bones, ...hands.farBack.bones,
  ...['far', 'near'].flatMap((s) => {
    const S = s === 'near' ? 'Near' : 'Far';
    return [
      { id: `hipAbd.${s}`, parent: 'pelvis', joint: `hip${S}`, aim: `knee${S}`, min: -20, max: 20 },
      { id: `thigh.${s}`, parent: `hipAbd.${s}`, joint: `hip${S}`, aim: `knee${S}`, plane: 'sagittal', restAnat: 0, min: -35, max: 115, cap: 0.3 },
      { id: `shin.${s}`, parent: `thigh.${s}`, joint: `knee${S}`, aim: `ankle${S}`, plane: 'sagittal', restAnat: 0, min: -150, max: 5, cap: 0.26 },
      { id: `foot.${s}`, parent: `shin.${s}`, joint: `ankle${S}`, aim: `ball${S}`, plane: 'sagittal', restAnat: 90, min: -45, max: 40, cap: 0.12 },
      { id: `toe.${s}`, parent: `foot.${s}`, joint: `ball${S}`, aim: `toe${S}`, plane: 'sagittal', restAnat: 90, min: -20, max: 60 },
    ];
  }),
];

const merge = (mod, ...extra) => ({ ANCHORS: Object.assign({}, mod.ANCHORS, ...extra), build: mod.build });

export default {
  name: 'mum2',
  params, hands,
  handLibrary: ['relaxed', 'open', 'cup', 'press', 'grip', 'fist', 'point', 'cover', 'limp'],
  handSides: { near: { prefix: 'hand.near', spreadSign: hands.near.spreadSign }, far: { prefix: 'hand.far', spreadSign: hands.far.spreadSign, back: { prefix: 'hand.farB', spreadSign: hands.farBack.spreadSign } } },
  joints: J,
  bones,
  palette: params.palette,
  design: { ...params.design, planes: { ...hands.near.planes, ...hands.far.planes, ...hands.farBack.planes } },
  modules: { hair: merge(hair), legs: merge(legs), body: merge(body), head: merge(head), arms: merge(arms, hands.near.ANCHORS, hands.far.ANCHORS, hands.farBack.ANCHORS) },
  // same-material overlaps: hands get a skinLine edge where they lie over skin (face, neck, the other hand)
  // shoulder rhythm: past ~30° of arm flexion the clavicle lifts ≈ 1° per 4° (near: + is up; far: − is up)
  drivers: [
    { bone: 'clavicle.near', from: 'upperArm.near', k: 0.18, start: 30, soft: 20, max: 60 },
    { bone: 'clavicle.far', from: 'upperArm.far', k: -0.18, start: 30, soft: 20, max: 60 },
  ],
  postBuild: (parts, ctx) => wrap.post(parts, ctx),
  // a hand on her casts a faint near-hard shadow onto her clothes and skin (reels: ~12 %, a few px, no blur)
  contactShadow: { opacity: 0.12, offset: [4, 6], color: '#3b1a2b', groups: [{ match: '^hand\\.near\\.' }, { match: '^hand\\.farB?\\.' }, { match: '^wrap\\.far\\.', on: '^(belly|belly\\.shade)$' }],
    on: '^(belly|belly\\.shade|belly\\.cast|top|top\\.underbust|cardigan\\.(near|far)|cardigan\\.far\\.lapel|cast\\.near|decollete|neck|face|cheek\\.(near|far)|jaw\\.shadow|hips)$' },
  // the head NODS (pose.fx.headPitch, deg, + = chin down): face slides down the skull, chin tucks, crown and bun come
  // forward — instead of the flat drawing rolling on the neck (engine/warp.js; ellipsoid = the head's depth proxy)
  warps: { head: (pose) => pitchWarp({ c: [-0.05, -5.6], axes: [0.5, 0.65, 0.42], fx: params.design.forwardX ?? 0.72 }, pose.fx?.headPitch ?? 0) },
  outlineGroups: [
    { match: /^(hand\.near\.|wrist\.near$)/, material: params.palette.skin, line: params.palette.skinLine, w: 0.012 },
    { match: /^(hand\.far\.|hand\.farB\.|wrist\.far$)/, material: params.palette.skin, line: params.palette.skinLine, w: 0.012 },
    // the near jogger leg where it crosses the far one (walk, crossed legs): same purple, told apart by the shade line
    // the near sleeve where it crosses the cardigan front (an arm raised across the body): pink on pink, told apart by the shade
    { match: /^(sleeve\.near|sleeve\.near\.fore|cuff\.near)$/, behind: /^cardigan\./, fade: { bone: 'upperArm.near', r: [0.2, 0.4] }, material: params.palette.cardigan, line: params.palette.cardiganShade, w: 0.014 },
    // the far forearm brought up in front over its own upper arm and the cardigan (hand to the mouth): the elbow corner and
    // the forearm's edge read only through the shade line (refs k3–k6 draw it)
    // (and over the cardigan's own far panel: an arm rising at her far side merged with the panel into one pink column —
    // "the cardigan edge swells", critic R23)
    { match: /^(sleeve\.far\.fore|cuff\.far)$/, behind: /^(sleeve\.far|cap\.far|cardigan\.)/, minZ: 30, material: params.palette.cardigan, line: params.palette.cardiganShade, w: 0.014 },
    // the far UPPER sleeve when it comes in front of the torso (arms.js auto.upper): its edge over the cardigan panel
    { match: /^(sleeve\.far|cap\.far)$/, behind: /^cardigan\./, minZ: 30, fade: { bone: 'upperArm.far', r: [0.2, 0.4] }, material: params.palette.cardigan, line: params.palette.cardiganShade, w: 0.014 },
    { match: /^(leg\.near|cuffleg\.near)$/, material: params.palette.bottoms, line: params.palette.bottomsShade, w: 0.014 },
  ],
  // QA (tools/qa_checks.mjs): her ¾ shot brings the far hand to her mouth, which points that forearm at the camera; the
  // limb-length gate would only restate the paused shot's known fault (PIPELINE lesson 24), so it is off for mum2
  // handedness (tools/handed.mjs): mum2 turns its far hand by drawing swaps (farBack) more than with its 3D arm, so the check
  // flags 20 poses where the two disagree — the paused shot's known far-hand faults (the palm flip, lesson 24), not a hand
  // copied from the other side (its near hand passes everywhere)
  qa: { limbMin: 0, handed: [{ side: 'far', why: 'paused: the far hand turns by drawing swaps (farBack), its palm flip a known fault (lesson 24)' }] },
  frame: params.frame,
  ref: params.ref,
  roles: {
    spine: ['pelvis', 'spineLower', 'spineUpper', 'chest', 'neck', 'head'], belly: 'belly', breathBone: 'spineUpper',
    arms: Object.fromEntries(['near', 'far'].map((s) => { const S = s === 'near' ? 'Near' : 'Far';
      return [s, { clavicle: `clavicle.${s}`, abd: `shoulderAbd.${s}`, upper: `upperArm.${s}`, fore: `forearm.${s}`, hand: `hand.${s}`, shoulder: `shoulder${S}`, elbow: `elbow${S}`, wrist: `wrist${S}` }]; })),
    legs: Object.fromEntries(['near', 'far'].map((s) => { const S = s === 'near' ? 'Near' : 'Far';
      return [s, { abd: `hipAbd.${s}`, thigh: `thigh.${s}`, shin: `shin.${s}`, foot: `foot.${s}`, toe: `toe.${s}`, hip: `hip${S}`, knee: `knee${S}`, ankle: `ankle${S}`, ball: `ball${S}` }]; })),
  },
  /** flat contact shadow under the feet (SVG string; model px) */
  ground(pose, fill, Hpx) {
    const xs = [J.heelNear?.[0] ?? -0.55, J.toeFar[0], J.toeNear[0], -0.55];
    const x0 = Math.min(...xs), x1 = Math.max(...xs), flip = (pose.facing || 'right') === 'left' ? -1 : 1;
    return `<ellipse cx="${(flip * (x0 + x1) / 2 * Hpx).toFixed(2)}" cy="${(0.0 * Hpx).toFixed(2)}" rx="${(((x1 - x0) / 2 + 0.3) * Hpx).toFixed(2)}" ry="${(0.07 * Hpx).toFixed(2)}" fill="${fill}"/>`;
  },
};
