// character.js — Mum v2 (standing master, ¾ view facing right). The character contract the engine expects:
//   name, joints, bones (parent-first, with plane/restAnat for projected limbs), modules {ANCHORS, build},
//   palette, design {facing, forwardX, planes}, frame, ref, roles (which bones play spine/arm/leg roles), params.
import * as params from './params.js';
import { makeHand } from '../../engine/hand.js';
import * as head from './parts/head.js';
import * as hair from './parts/hair.js';
import * as body from './parts/body.js';
import * as arms from './parts/arms.js';
import * as legs from './parts/legs.js';

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
  { id: 'head', parent: 'neck', joint: 'head', aim: 'headTip', min: -30, max: 30, cap: 0.14 },
  { id: 'belly', parent: 'pelvis', joint: 'bellyBase', aim: 'bellyApex', min: -6, max: 6 },
  ...['near', 'far'].flatMap((s) => {
    const S = s === 'near' ? 'Near' : 'Far';
    return [
      { id: `clavicle.${s}`, parent: 'chest', joint: `clavicle${S}`, aim: `shoulder${S}`, min: -10, max: 10 },
      // abduction (frontal plane ≈ picture plane in ¾) as a screen rotation, then flexion/extension in the sagittal plane
      { id: `shoulderAbd.${s}`, parent: `clavicle.${s}`, joint: `shoulder${S}`, aim: `elbow${S}`, min: -30, max: 30 },
      { id: `upperArm.${s}`, parent: `shoulderAbd.${s}`, joint: `shoulder${S}`, aim: `elbow${S}`, plane: 'sagittal', restAnat: 0, min: -60, max: 170, cap: 0.2 },
      { id: `forearm.${s}`, parent: `upperArm.${s}`, joint: `elbow${S}`, aim: `wrist${S}`, plane: 'sagittal', restAnat: 0, min: -5, max: 150, cap: 0.18 },
      { id: `hand.${s}`, parent: `forearm.${s}`, joint: `wrist${S}`, aim: `hand${S}Tip`, plane: 'sagittal', restAnat: 0, min: -70, max: 70, cap: 0.08 },
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
  handLibrary: ['relaxed', 'open', 'cup', 'press', 'grip', 'fist', 'point'],
  handSides: { near: { prefix: 'hand.near', spreadSign: hands.near.spreadSign }, far: { prefix: 'hand.far', spreadSign: hands.far.spreadSign, back: { prefix: 'hand.farB', spreadSign: hands.farBack.spreadSign } } },
  joints: J,
  bones,
  palette: params.palette,
  design: { ...params.design, planes: { ...hands.near.planes, ...hands.far.planes, ...hands.farBack.planes } },
  modules: { hair: merge(hair), legs: merge(legs), body: merge(body), head: merge(head), arms: merge(arms, hands.near.ANCHORS, hands.far.ANCHORS, hands.farBack.ANCHORS) },
  // same-material overlaps: hands get a skinLine edge where they lie over skin (face, neck, the other hand)
  outlineGroups: [
    { match: /^(hand\.near\.|wrist\.near$)/, material: params.palette.skin, line: params.palette.skinLine, w: 0.012 },
    { match: /^(hand\.far\.|hand\.farB\.|wrist\.far$)/, material: params.palette.skin, line: params.palette.skinLine, w: 0.012 },
    // the near jogger leg where it crosses the far one (walk, crossed legs): same purple, told apart by the shade line
    // the near sleeve where it crosses the cardigan front (an arm raised across the body): pink on pink, told apart by the shade
    { match: /^(sleeve\.near|sleeve\.near\.fore|cuff\.near)$/, material: params.palette.cardigan, line: params.palette.cardiganShade, w: 0.014 },
    { match: /^(leg\.near|cuffleg\.near)$/, material: params.palette.bottoms, line: params.palette.bottomsShade, w: 0.014 },
  ],
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
