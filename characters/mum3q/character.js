// character.js — mum3q: mum3 in a ¾ VIEW (the same woman, palette and skeleton; this view's own drawing). From mum3: bare arms (one
// continuous skinned tube from shoulder to wrist, no sleeve pivoting over a joint), a sleeveless dress, a clear neck. In
// ¾ the far arm shows: it hangs behind the bump, its hand below it. The character contract the engine expects (see characters/mum2/character.js):
//   name, joints, bones, modules {ANCHORS, build}, palette, design {facing, forwardX, planes}, frame, ref, roles, params.
import * as params from './params.js';
import { makeHand } from '../../engine/hand.js';
import { pitchWarp } from '../../engine/warp.js';
import * as head from './parts/head.js';
import * as hair from './parts/hair.js';
import * as body from './parts/body.js';
import * as arms from './parts/arms.js';
import * as legs from './parts/legs.js';

const J = { ...params.joints };
const hands = { near: makeHand(params.handSpecs.near), far: makeHand(params.handSpecs.far) };
Object.assign(J, hands.near.joints, hands.far.joints);
J.handNearTip = J['hand.near.f2t'];
J.handFarTip = J['hand.far.f2t'];

// angle limits: screen-plane bones in degrees relative to rest; sagittal bones are ANATOMICAL (+ = forward/flexion)
const bones = [
  { id: 'root', parent: null, joint: 'root', aim: 'pelvis', min: 0, max: 0 },
  { id: 'pelvis', parent: 'root', joint: 'pelvis', aim: 'spineLower', min: -12, max: 12 },
  { id: 'spineLower', parent: 'pelvis', joint: 'spineLower', aim: 'spineUpper', min: -12, max: 12 },
  { id: 'spineUpper', parent: 'spineLower', joint: 'spineUpper', aim: 'chest', min: -12, max: 12 },
  { id: 'chest', parent: 'spineUpper', joint: 'chest', aim: 'neck', min: -12, max: 12 },
  { id: 'neck', parent: 'chest', joint: 'neck', aim: 'head', min: -25, max: 25, cap: 0.14 },
  { id: 'head', parent: 'neck', joint: 'head', aim: 'headTip', min: -40, max: 40, cap: 0.14 },
  { id: 'belly', parent: 'pelvis', joint: 'bellyBase', aim: 'bellyApex', min: -6, max: 6 },
  ...['near', 'far'].flatMap((s) => {
    const S = s === 'near' ? 'Near' : 'Far';
    return [
      { id: `clavicle.${s}`, parent: 'chest', joint: `clavicle${S}`, aim: `shoulder${S}`, min: -22, max: 22 },
      { id: `shoulderAbd.${s}`, parent: `clavicle.${s}`, joint: `shoulder${S}`, aim: `elbow${S}`, min: -30, max: 30 },
      // 3D ARM (engine/rig.js arm3): upperArm = elevation (+ forward), armAbd = plane of elevation, armRot = humeral
      // rotation, forearm = elbow flexion, foreRot = pronation, hand = wrist deviation, wristFlex = wrist flexion/extension.
      // Parameter bones carry no drawing.
      { id: `armAbd.${s}`, parent: `shoulderAbd.${s}`, joint: `shoulder${S}`, aim: `elbow${S}`, param: true, min: -100, max: 130 },
      { id: `armRot.${s}`, parent: `shoulderAbd.${s}`, joint: `shoulder${S}`, aim: `elbow${S}`, param: true, min: -60, max: 95 },
      { id: `foreRot.${s}`, parent: `shoulderAbd.${s}`, joint: `elbow${S}`, aim: `wrist${S}`, param: true, min: -90, max: 90 },
      // + = extension (engine/rig.js arm3); flexion to 80° as a real wrist's (mum3's −60 left the hand draped over the bump's
      // top at the limit, so the reach's keepSize couldn't hold its size: 36–43%)
      { id: `wristFlex.${s}`, parent: `shoulderAbd.${s}`, joint: `wrist${S}`, aim: `hand${S}Tip`, param: true, min: -80, max: 70 },
      { id: `upperArm.${s}`, parent: `shoulderAbd.${s}`, joint: `shoulder${S}`, aim: `elbow${S}`, plane: 'arm3', side: s, abd: `armAbd.${s}`, twist: `armRot.${s}`, min: -60, max: 170, cap: 0.2 },
      { id: `forearm.${s}`, parent: `upperArm.${s}`, joint: `elbow${S}`, aim: `wrist${S}`, plane: 'arm3', pron: `foreRot.${s}`, min: -5, max: 150, cap: 0.18 },
      { id: `hand.${s}`, parent: `forearm.${s}`, joint: `wrist${S}`, aim: `hand${S}Tip`, plane: 'arm3', flex: `wristFlex.${s}`, min: -50, max: 40, cap: 0.08 },
    ];
  }),
  ...hands.near.bones, ...hands.far.bones,
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
const X = params.P;

export default {
  name: 'mum3q',
  params, hands,
  handLibrary: ['relaxed', 'open', 'cup', 'press', 'grip', 'fist', 'point', 'cover', 'limp', 'lay', 'hang', 'wrap', 'flat', 'crest', 'drape', 'atop', 'hold', 'cradle'],
  handSides: { near: { prefix: 'hand.near', spreadSign: hands.near.spreadSign }, far: { prefix: 'hand.far', spreadSign: hands.far.spreadSign } },
  joints: J,
  bones,
  palette: params.palette,
  design: { ...params.design, planes: { ...hands.near.planes, ...hands.far.planes } },
  modules: { hair: merge(hair), legs: merge(legs), body: merge(body), head: merge(head), arms: merge(arms, hands.near.ANCHORS, hands.far.ANCHORS) },
  // ¾: the head NODS (pose.fx.headPitch, deg, + = chin down) on its depth proxy's ellipsoid: the face slides down the
  // skull, the chin tucks toward the throat, the crown and bun come forward (engine/warp.js, as mum2); a head bone
  // rotation alone rolls a ¾ face sideways on its neck
  warps: { head: (pose) => { const h = params.depth.proxies.find((q) => q.name === 'head');
    return pitchWarp({ c: h.at, axes: h.axes, fx: params.design.forwardX }, pose.fx?.headPitch ?? 0); } },
  // shoulder rhythm: past ~30° of arm flexion the clavicle lifts ≈ 1° per 5°
  drivers: [
    { bone: 'clavicle.near', from: 'upperArm.near', k: 0.18, start: 30, soft: 20, max: 60 },
    { bone: 'clavicle.far', from: 'upperArm.far', k: -0.18, start: 30, soft: 20, max: 60 },
  ],
  // a hand on her casts a faint near-hard shadow onto her dress and skin (reels: ~12 %, a few px, no blur); the near forearm
  // lying across her front casts one too, onto the dress only (on chest.skin it drew a stripe inside the upper arm), at 16 %,
  // (5, 9) px as still q_k4_down_0 reads (lesson 52). A group holds every part of the hand INCLUDING the wrist pad: the shadow is
  // drawn just below the group's lowest part, so a pad left out got the hand's shadow painted over it ("a darker wedge on the heel")
  contactShadow: { opacity: 0.16, offset: [5, 9], color: '#5a1f12', groups: [{ match: '^(hand\\.near\\.|arm\\.near$|arm\\.near\\.heel$)', gate: 'contact.near', on: '^dress$' }, { match: '^(hand\\.far\\.|arm\\.far\\.heel$|arm\\.far\\.end$)', gate: 'contact.far', noCast: '^arm\\.far\\.end$' }],   // pose.fx['contact.near']: the hanging hand casts none
    on: '^(dress|dress\\.bump|dress\\.shade|dress\\.skirt|chest\\.skin)$' },
  // skin on skin (a hand over the face or over its own arm) reads only through a line where it overlaps
  outlineGroups: [
    { match: /^hand\.near\./, behind: /^(face|neck|chest\.skin|leg\.near)$/, material: params.palette.skin, line: params.palette.skinLine, w: 0.01 },   // not against its own arm (that drew a line round the wrist)

    // the far hand lying over its own upper arm (it comes down past her bust behind the hand): the still draws the hand's
    // top edge there as a fine line, so the back of the hand reads apart from the arm (q_k4_down_0; without it hand and arm
    // were one skin mass, lesson 53). The fade only rounds the line off at the wrist's joint (v8 draft: wider, it was a C
    // round the heel that read as a fist, when the forearm was a tube). The wrist's end-on mass lies OVER the hand's heel
    // and draws its own short line (params.armFar.endOn); outlining the hand over it ringed the hand's end with a crease,
    // "a round knob hanging off its right end" (v10–v11, lessons 54–55)
    { match: /^hand\.far\./, behind: /^arm\.far$/, material: params.palette.skin, line: params.palette.skinLine, w: 0.007, fade: { bone: 'hand.far', r: [0.02, 0.06] } },
  ],
  // handedness (tools/handed.mjs, lesson 53): the far hand is her LEFT hand drawn from the BACK, as it lies on the bump in
  // every shot; hanging, the 3D shows its palm (a sliver beside the skirt) and this drawing is its mirror there. Before a
  // shot shows it hanging it needs a palm drawing swapped in (handView, as mum2's farBack)
  qa: { handed: [{ side: 'far', view: 'palm', why: 'drawn from the back for the bump; hanging, only a sliver shows (no palm drawing yet)' }] },
  // fitting (tools/fit_pose.mjs): in ¾ both arms show (the far one hangs behind the bump, its hand below it)
  fit: { hidden: [] },
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
    const x0 = X.shoe.near.heel[0] - 0.1, x1 = X.shoe.far.toe[0] + 0.1, flip = (pose.facing || 'right') === 'left' ? -1 : 1;
    return `<ellipse cx="${(flip * (x0 + x1) / 2 * Hpx).toFixed(2)}" cy="${(-0.05 * Hpx).toFixed(2)}" rx="${((x1 - x0) / 2 * Hpx).toFixed(2)}" ry="${(0.09 * Hpx).toFixed(2)}" fill="${fill}"/>`;
  },
};
