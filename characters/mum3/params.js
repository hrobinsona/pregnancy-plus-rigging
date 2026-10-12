// params.js — mum3: every number the parts use. Units: H (head = skull top → chin), origin on the ground under the near
// shoe, y down, facing right. She is drawn near PROFILE (turned ~18° toward us), so limbs move across the frame, not at
// the camera. Landmarks come from ref/landmarks.json, measured by tools/master_measure.py (named points, joints and
// width profiles; no contour); everything else is a DESIGN parameter.
import L from './ref/landmarks.json' with { type: 'json' };

export const Hpx = L.Hpx;
const G = L.ground;
export const at = ([X, Y]) => [(X - G[0]) / Hpx, (Y - G[1]) / Hpx];
export const lm = (k) => at(L.points[k]);
const jt = (k) => at(L.joints[k]);
const W = (k, f) => { const s = L.widths[k].find((q) => Math.abs(q.f - f) < 0.01); return { front: s.l / Hpx, back: s.r / Hpx }; };   // measured half-widths across a limb (front = facing side)

// colours sampled from the master (tools/master_measure.py palette + darkest pixels of each small feature)
export const palette = {
  skin: '#fbbb8d', skinFar: '#f7ae7e',       // far limbs one step darker (the master's far leg)
  skinShade: '#f2a06f', skinLine: '#eb9161',  // jaw shade, finger gaps
  cheek: '#f8a685',
  hair: '#513027', hairShade: '#452821',
  dress: '#e5725c', dressShade: '#d4604b',
  shoe: '#4f2c22', shoeShade: '#3c1b11',   // the master's shoes are the hair colour (one palette cluster)
  eye: '#361e18', brow: '#452821', mouth: '#d56d4d', earIn: '#f2a06f',
  nail: '#fcc9a3',
};

// forwardX = cos(yaw): 0.95 ≈ 18° toward the camera (shoulders and hips measured 0.3 H apart on screen)
export const design = { facing: 'right', forwardX: 0.95, ground: '#efe0d0' };

const SH = jt('shoulderNear'), EL = jt('elbowNear'), WR = jt('wristNear'), farDx = 0.18, farDy = 0.06;   // the far arm: the near one moved across and down, so it stays hidden behind her chest (a design choice: the master shows no far shoulder)
// ---------------------------------------------------------------- joints (rest = the master's standing pose)
export const joints = {
  root: [0, 0],
  pelvis: [0.23, -3.7],
  spineLower: [0.14, -4.25], spineUpper: [0.08, -4.8], chest: [0.06, -5.3],
  neck: [-0.02, -5.92], head: [0.06, -6.28], headTip: lm('skullTop'),
  bellyBase: [0.42, -3.95], bellyApex: lm('bumpApex'),
  clavicleNear: [0.12, -5.82], shoulderNear: SH, elbowNear: EL, wristNear: WR,
  clavicleFar: [0.16, -5.82], shoulderFar: [SH[0] + farDx, SH[1] + farDy], elbowFar: [EL[0] + farDx, EL[1] + farDy], wristFar: [WR[0] + farDx, WR[1] + farDy],
  hipNear: jt('hipNear'), kneeNear: jt('kneeNear'), ankleNear: jt('ankleNear'), ballNear: [0.12, -0.05], toeNear: at(L.points.shoeNear.toe),
  hipFar: jt('hipFar'), kneeFar: jt('kneeFar'), ankleFar: jt('ankleFar'), ballFar: [0.6, -0.2], toeFar: at(L.points.shoeFar.toe),
};

// the dress's FRONT edge measured at stations down the torso (master_measure.py): the bump's curve passes through these
const front = L.torso.map((q) => at([q.front, q.y]));
const frontAt = (y) => front.reduce((a, q) => (Math.abs(q[1] - y) < Math.abs(a[1] - y) ? q : a));
const bump = { under: lm('underBust'), apex: lm('bumpApex'), bottom: lm('bumpBottom') };
bump.upper = frontAt(bump.under[1] + 0.55 * (bump.apex[1] - bump.under[1]));   // on the bump's upper slope
bump.lower = frontAt(bump.apex[1] + 0.6 * (bump.bottom[1] - bump.apex[1]));    // on its lower curve
// ---------------------------------------------------------------- shape parameters
export const P = {
  // FACE (head bone), profile: named points on the front edge (master_measure.py), the rest designed
  face: { hairFront: lm('hairFront'), bridge: lm('noseBridge'), nose: lm('noseTip'), subnasal: lm('subnasal'), lip: lm('lipUpper'),
          chinFront: lm('chinFront'), chin: lm('chin'), jaw: [0.06, -6.26], back: [-0.02, -6.8] },
  eye: { c: lm('eye'), rx: 0.037, ry: 0.06 },
  brow: { p: [[0.275, -6.675], [0.35, -6.725], [0.42, -6.705]], w: [0.012, 0.026, 0.014] },
  mouth: lm('mouth'),
  ear: { c: [-0.05, -6.49], rx: 0.1, ry: 0.122, rot: 8 },
  cheek: { c: [0.3, -6.38], r: 0.075 },
  // HAIR: the cap over the skull (an egg round the skull centre) with a designed hairline, and the low bun
  hair: { c: [0.04, -6.62], rx: 0.54, rxl: 0.5, ryt: 0.52, ryb: 0.46, front: lm('hairFront'), temple: [0.1, -6.62], earTop: [-0.07, -6.6],
          nape: [-0.12, -6.22], bun: lm('bun'), bunR: L.points.bunR / Hpx },
  neck: { back: lm('neckBack'), front: lm('neckFront'), throatTop: [0.15, -6.18], napeTop: [-0.13, -6.45] },   // tops tuck under the jaw, ear and hair
  // TORSO (dress): named points + the measured front stations; the back behind the arm is designed (a straight back)
  chestFront: [0.33, -5.75], bust: [0.59, -5.3], bump,
  back: { shoulder: [-0.3, -5.72], blade: [-0.33, -5.2], waist: [-0.29, -4.55], seat: [-0.37, -3.78] },
  hem: { back: lm('hemBack'), front: lm('hemFront'), y: (L.points.hem - G[1]) / Hpx },
  strap: { back: [-0.34, -5.85], top: [-0.15, -5.93], front: [0.04, -5.86], w: 0.065 },   // the dress's top edge over the shoulder (master: back silhouette → over the deltoid → into the neckline)
  neckline: { front: [0.5, -5.57], low: [0.25, -5.69] },   // a shallow curve from the shoulder down to the chest front (measured: crosses y −5.74 at x 0.12)
  // ARMS: measured half-widths (front / back of the arm) at the shoulder, mid upper arm, elbow, mid forearm, wrist
  arm: { w: [W('upperArmNear', 0.1), W('upperArmNear', 0.5), W('upperArmNear', 0.9), W('forearmNear', 0.5), W('forearmNear', 0.9)] },
  // LEGS: measured shin widths; thighs disappear under the skirt
  leg: { near: { knee: W('shinNear', 0.1), calf: W('shinNear', 0.23), low: W('shinNear', 0.77), ankle: W('shinNear', 0.9) },
         far: { knee: W('shinFar', 0.1), calf: W('shinFar', 0.37), low: W('shinFar', 0.77), ankle: W('shinFar', 0.9) } },
  shoe: { near: { heel: at(L.points.shoeNear.heel), toe: at(L.points.shoeNear.toe), top: (L.points.shoeNear.top - G[1]) / Hpx, sole: (L.points.shoeNear.sole - G[1]) / Hpx },
          far: { heel: at(L.points.shoeFar.heel), toe: at(L.points.shoeFar.toe), top: (L.points.shoeFar.top - G[1]) / Hpx, sole: (L.points.shoeFar.sole - G[1]) / Hpx } },
};

// ---------------------------------------------------------------- hands (engine/hand.js), measured from the master's hand
// landmarks and a side-by-side check: wrist → middle tip 0.6 H, palm half of it, 0.3 H across; long fingers
// held together; back of the hand toward us, thumb forward (her front = right)
const dirTo = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
export const handSpecs = {
  near: { id: 'hand.near', parentBone: 'hand.near', wrist: [joints.wristNear[0] - 0.03, joints.wristNear[1] + 0.03],   // the estimator's wrist sits near the wrist's FRONT edge (front 0.07 / back 0.12 H): the hand is centred on the wrist's width, BEHIND the joint (measured in the master: 7 px; v1 had the sign wrong and the forearm stuck out behind the hand as a shelf)
          dir: dirTo(joints.wristNear, lm('handTip')), view: 'back',
          length: 0.6, palmFrac: 0.5, wristW: 0.2, palmW: 0.3, thumbSide: 1, fingerK: 1.0, across: [0.3, 0.08, -0.15, -0.37], flexFx: 0.1,
          thumbFx: -0.15, thumb: { mcp: [0.4, 1.0], dir: 7, w: 0.95, taper: [1, 0.88, 0.76] }, thenarEdge: [1.08, 1.0],   /* the thumb-side edge seen from the BACK: the thenar pad is on the palm side (v3's 1.2 stood up as a knob on top of the hand at the wrist when it lay on the bump) */ thumbWeb: [0.88, 0.86], fingerLen: [0.9, 1.0, 0.94, 0.8], fingerW: [1.0, 1.0, 0.95, 0.82], hypo: 0, thumbLine: false, order: [3, 2, 1, 0] },
};
handSpecs.far = { ...handSpecs.near, id: 'hand.far', parentBone: 'hand.far', wrist: [joints.wristFar[0] - 0.03, joints.wristFar[1] + 0.03] };

// DEPTH PROXIES (engine/depth.js) for the 3D arm's draw order: the shoulder joints sit midL either side of the midline
export const depth = { midL: 0.6, proxies: [
  { name: 'trunk', kind: 'cylinder', bone: 'spineUpper', at: [0.12, -4.7], F: 0.0, axes: [0.42, 1.2, 0.55] },
  { name: 'bump', kind: 'ellipsoid', bone: 'belly', at: [0.55, -4.35], F: 0.0, axes: [0.45, 0.62, 0.5] },
  { name: 'neck', kind: 'cylinder', bone: 'neck', at: [0.0, -6.0], F: 0.0, axes: [0.18, 0.2, 0.18] },
  { name: 'head', kind: 'ellipsoid', bone: 'head', at: [0.12, -6.62], F: 0.0, axes: [0.5, 0.55, 0.42] },
] };
export const frame = { bbox: [[-1.1, -7.3], [1.3, 0.05]], fill: 0.86, dy: 0 };
export const ref = { sizePx: L.sizePx, groundPx: L.ground, Hpx, image: 'ref/master.png' };
