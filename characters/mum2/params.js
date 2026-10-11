// params.js — Mum v2: every number the parts use. Units: H (head = skull top → chin), origin on the ground between
// the feet, y down, facing right (¾ view). Landmarks come from ref/landmarks.json (named points only); everything
// else is a DESIGN parameter, chosen against the design language (docs/research.md §4) and tuned by the critic.
import L from './ref/landmarks.json' with { type: 'json' };

export const Hpx = L.Hpx;
const G = L.ground;
export const at = ([X, Y]) => [(X - G[0]) / Hpx, (Y - G[1]) / Hpx];
export const lm = (k) => at(L.points[k]);

export const palette = {
  skin: '#d48055', skinShade: '#c76a47', skinLine: '#b56645', cheek: '#e37158',
  hair: '#5e3424', hairShade: '#4a2718',
  top: '#cbaee9', topShade: '#b695dc',            // lilac top
  bottoms: '#b294c9', bottomsShade: '#9d7db8',     // mauve joggers (one step darker than the top: separates the masses)
  cardigan: '#feb8c3', cardiganShade: '#f79caf',   // pink cardigan
  sock: '#fee076', sockShade: '#f5c94a',           // yellow socks
  eye: '#2a1611', mouth: '#7a3a1e',                // no pure black (ONS / Headspace practice)
  sick: '#b3ad6c',
};

export const design = { facing: 'right', forwardX: 0.72, ground: '#efe0d0' };

// ---------------------------------------------------------------- joints (rest = relaxed standing ¾)
export const joints = {
  root: [0, 0],
  pelvis: [0.0, -2.78],
  spineLower: [-0.05, -3.25], spineUpper: [-0.08, -3.8], chest: [-0.07, -4.32],
  neck: [-0.07, -4.86], head: [-0.08, -5.1], headTip: lm('skullTop'),
  bellyBase: [0.22, -3.42], bellyApex: lm('bellyApex'),
  clavicleNear: [-0.16, -4.76], shoulderNear: lm('shoulderNear'), elbowNear: lm('elbowNear'), wristNear: lm('wristNear'),
  clavicleFar: [0.06, -4.76], shoulderFar: lm('shoulderFar'), elbowFar: lm('elbowFar'), wristFar: lm('wristFar'),
  hipNear: lm('hipNear'), kneeNear: lm('kneeNear'), ankleNear: lm('ankleNear'), ballNear: [0.0, -0.07], toeNear: lm('toeNear'),
  hipFar: lm('hipFar'), kneeFar: lm('kneeFar'), ankleFar: lm('ankleFar'), ballFar: [0.75, -0.1], toeFar: lm('toeFar'),
};

// ---------------------------------------------------------------- shape parameters
export const P = {
  // head (head bone): face built from landmark-anchored construction points
  face: { chin: lm('chin'), jawNear: lm('jawNear'), far: lm('faceFar'), nearEye: lm('faceNearAtEyes'), part: lm('hairPart') },
  eyes: { near: { c: lm('eyeNear'), rx: 0.03, ry: 0.039 }, far: { c: lm('eyeFar'), rx: 0.026, ry: 0.038 } },
  brows: { near: lm('browNear'), far: lm('browFar'), len: [0.12, 0.09], w: 0.026 },
  nose: lm('noseTip'), mouth: lm('mouth'), cheeks: { near: lm('cheekNear'), far: lm('cheekFar') }, ear: lm('ear'),
  hair: { bun: lm('bunCentre'), bunR: 0.19, loopTop: lm('loopTop'), back: lm('hairBack'), top: lm('skullTop') },
  neck: { back: lm('neckBack'), front: lm('neckFront'), base: lm('neckBase'), w: 0.34 },
  // torso (top), belly, cardigan
  neckline: lm('necklineFront'), bust: lm('bustFar'), underBust: lm('underBust'),
  belly: { apex: lm('bellyApex'), bottom: lm('bellyBottom') },
  hem: { near: lm('hemNear'), front: lm('hemFront'), far: lm('hemFar') },
  shoulderTop: { near: lm('shoulderTopNear'), far: lm('shoulderTopFar') },
  // sleeves: half-widths along shoulder → elbow → cuff
  sleeve: { near: [0.2, 0.2, 0.19, 0.2], far: [0.19, 0.19, 0.18, 0.19] },
  // legs (jogger half-widths at hip, knee, above cuff) and centre offsets measured as widths
  leg: { near: { hip: 0.34, knee: 0.285, cuff: 0.2 }, far: { hip: 0.335, knee: 0.275, cuff: 0.19 } },
  foot: { near: { heel: lm('heelNear'), toe: lm('toeNear') }, far: { heel: lm('heelFar'), toe: lm('toeFar') } },
};

// ---------------------------------------------------------------- hands (generator specs; finger counts fixed at 4)
// length 0.48 H: the reference hand measures 0.45 H; nudged toward "hand ≈ face" (design research §4) without
// leaving the style. Fingers: index→pinky; `at` = position across the knuckle line from the thumb side.
const fingers = (w) => [
  { len: 0.92, w: w * 1.0, spread: -2, at: 0.12 }, { len: 1.0, w: w * 1.04, spread: 0, at: 0.38 },
  { len: 0.95, w: w * 0.98, spread: 2, at: 0.62 }, { len: 0.78, w: w * 0.86, spread: 5, at: 0.86 },
];
const dirTo = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
export const handSpecs = {
  near: { id: 'hand.near', parentBone: 'hand.near', wrist: joints.wristNear, dir: dirTo(joints.wristNear, lm('fingertipNear')),
          length: 0.5, palmFrac: 0.47, wristW: 0.15, palmW: 0.23, thumbSide: 1, fingers: fingers(0.062),
          thumb: { at: [0.26, 0.46], dir: 14, len: 0.38, w: 0.072 }, flexFx: 0.45, order: [3, 2, 1, 0] },
  far: { id: 'hand.far', parentBone: 'hand.far', wrist: joints.wristFar, dir: dirTo(joints.wristFar, lm('fingertipFar')),
         length: 0.44, palmFrac: 0.47, wristW: 0.14, palmW: 0.21, thumbSide: -1, fingers: fingers(0.058),
         thumb: { at: [0.3, 0.46], dir: 30, len: 0.34, w: 0.066 }, flexFx: -0.45, order: [0, 1, 2, 3], creaseSide: -1 },
};

export const frame = { bbox: [[-1.25, -6.5], [1.3, 0.05]], fill: 0.86, dy: 0 };
export const ref = { sizePx: L.sizePx, groundPx: L.ground, Hpx, image: 'ref/standing_34.jpg' };
