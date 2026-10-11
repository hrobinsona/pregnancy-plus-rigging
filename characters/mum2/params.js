// params.js — Mum v2: every number the parts use. Units: H (head = skull top → chin), origin on the ground between
// the feet, y down, facing right (¾ view). Landmarks come from ref/landmarks.json (named points only); everything
// else is a DESIGN parameter, chosen against the design language (docs/research.md §4) and tuned by the critic.
import L from './ref/landmarks.json' with { type: 'json' };

export const Hpx = L.Hpx;
const G = L.ground;
export const at = ([X, Y]) => [(X - G[0]) / Hpx, (Y - G[1]) / Hpx];
export const lm = (k) => at(L.points[k]);

export const palette = {
  skin: '#d48055', skinShade: '#c76a47', skinLine: '#c76a47', cheek: '#e37158',   // skinLine = skinShade: one base + one shade
  hair: '#5e3424', hairShade: '#4a2718',
  top: '#b99dd7', topShade: '#a685cb',            // lilac top (value ladder: cardigan 81 > top 69 > joggers 50 > hair 27)
  bottoms: '#896ba3', bottomsShade: '#74578d',     // mauve joggers
  cardigan: '#feb8c3', cardiganShade: '#f79caf',   // pink cardigan: one base + one shade
  sock: '#f2cf6e', sockShade: '#dcaa45',            // lower chroma than the face's focal colours; ΔL* ≈ 6 vs floor           // yellow socks
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
  hipNear: lm('hipNear'), kneeNear: lm('kneeNear'), ankleNear: lm('ankleNear'), ballNear: [-0.03, -0.01], toeNear: [lm('toeNear')[0] - 0.18, lm('toeNear')[1] + 0.05],
  hipFar: lm('hipFar'), kneeFar: [lm('kneeFar')[0], lm('kneeFar')[1] - 0.03], ankleFar: [lm('ankleFar')[0], lm('ankleFar')[1] - 0.07], ballFar: [0.75, -0.17], toeFar: [lm('toeFar')[0], lm('toeFar')[1] - 0.07],   // far foot sits back in depth
};

// ---------------------------------------------------------------- shape parameters
export const P = {
  // head (head bone): face built from landmark-anchored construction points
  face: { chin: lm('chin'), jawNear: lm('jawNear'), far: lm('faceFar'), nearEye: lm('faceNearAtEyes'), part: lm('hairPart') },
  eyes: { near: { c: lm('eyeNear'), rx: 0.03, ry: 0.039 }, far: { c: lm('eyeFar'), rx: 0.026, ry: 0.038 } },
  brows: { near: lm('browNear'), far: lm('browFar'), len: [0.12, 0.09], w: 0.026 },
  nose: lm('noseTip'), mouth: lm('mouth'), cheeks: { near: lm('cheekNear'), far: lm('cheekFar') }, ear: lm('ear'),
  hair: { bun: lm('bunCentre'), bunR: 0.19, loopTop: lm('loopTop'), back: lm('hairBack'), top: lm('skullTop') },
  neck: { back: lm('neckBack'), front: lm('neckFront'), base: lm('neckBase'), w: 0.28 },
  shoulderCap: { near: 0.2, far: 0.19 },    // circle radius at the shoulder pivot (joint = circle) = sleeve half-width
  // trapezius slope (measured as silhouette extents at three heights, then used as construction points)
  shoulderLine: { near: [[-0.42, -4.97], [-0.69, -4.83]], far: [[0.26, -4.97], [0.53, -4.84]] },
  // torso (top), belly, cardigan
  neckline: lm('necklineFront'), bust: lm('bustFar'), underBust: lm('underBust'),
  belly: { apex: lm('bellyApex'), bottom: lm('bellyBottom') },
  hem: { near: lm('hemNear'), front: lm('hemFront'), far: lm('hemFar') },
  shoulderTop: { near: lm('shoulderTopNear'), far: lm('shoulderTopFar') },
  // sleeves: half-widths along shoulder → elbow → cuff
  sleeve: { near: [0.2, 0.2, 0.19, 0.2], far: [0.19, 0.19, 0.18, 0.19], outer: [1.0, 1.1, 1.04, 1.0], inner: [1.0, 0.92, 0.88, 1.0] },
  // legs (jogger half-widths at hip, knee, above cuff) and centre offsets measured as widths
  leg: { near: { hip: 0.34, knee: 0.285, cuff: 0.2, outer: 1.08, inner: 0.92 }, far: { hip: 0.3, knee: 0.245, cuff: 0.17, outer: 1.08, inner: 0.92 } },  // far ≈ 0.88× near (no twins); outer side fuller, inner straighter
  foot: { near: { heel: [lm('heelNear')[0] + 0.04, lm('heelNear')[1]], toe: [lm('toeNear')[0] - 0.18, lm('toeNear')[1] + 0.05], round: 1.3 }, far: { heel: [lm('heelFar')[0], lm('heelFar')[1] - 0.07], toe: [lm('toeFar')[0], lm('toeFar')[1] - 0.07], round: 1 } },   // near foot toward camera (shorter, toe lower); far foot back in depth
};

// ---------------------------------------------------------------- hands (generator specs; finger counts fixed at 4)
// length 0.48 H: the reference hand measures 0.45 H; nudged toward "hand ≈ face" (design research §4) without
// leaving the style. Fingers: index→pinky; `at` = position across the knuckle line from the thumb side.
const fingers = (w) => [
  { len: 0.92, w: w * 1.0, spread: -5, at: 0.12 }, { len: 1.0, w: w * 1.04, spread: -2, at: 0.38 },
  { len: 0.95, w: w * 0.98, spread: 2, at: 0.62 }, { len: 0.8, w: w * 0.9, spread: 6, at: 0.86 },
];
const dirTo = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
// Critic B R1–R3: hands grew toward 'hand ≈ face' (0.64 H near, 0.58 far); fingers narrower than their spacing so gaps can open; fingertips turned
// 10° away from the body so the thumb never touches the cardigan (keeps the arm–body negative space).
export const handSpecs = {
  near: { id: 'hand.near', parentBone: 'hand.near', wrist: joints.wristNear, dir: dirTo(joints.wristNear, lm('fingertipNear')) + 10,
          length: 0.64, palmFrac: 0.52, wristW: 0.18, palmW: 0.29, thumbSide: 1, fingers: fingers(0.064), crease: 'one',
          thumb: { at: [0.26, 0.42], dir: -14, len: 0.26, w: 0.072 }, flexFx: 0.45, order: [3, 2, 1, 0] },
  far: { id: 'hand.far', parentBone: 'hand.far', wrist: joints.wristFar, dir: dirTo(joints.wristFar, lm('fingertipFar')) - 10,
         length: 0.58, palmFrac: 0.52, wristW: 0.17, palmW: 0.27, thumbSide: -1, fingers: fingers(0.06), crease: 'one',
         thumb: { at: [0.3, 0.42], dir: -4, len: 0.3, w: 0.064 }, flexFx: -0.45, order: [0, 1, 2, 3], creaseSide: -1 },
};

export const frame = { bbox: [[-1.25, -6.5], [1.3, 0.05]], fill: 0.86, dy: 0 };
export const ref = { sizePx: L.sizePx, groundPx: L.ground, Hpx, image: 'ref/standing_34.jpg' };
