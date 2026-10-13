// params.js — mum3q: mum3 in a ¾ VIEW (turned ~40° toward us, facing right): the same woman, palette and skeleton as
// mum3's profile, drawn again for this view. Units: H, origin on the ground under the near shoe, y down. Landmarks come
// from ref/landmarks.json: tools/master_measure.py (joints, torso stations, limb widths, shoes) and tools/face_measure.py
// (the face's features, which a ¾ face has INSIDE it, not on its edge); everything else is a DESIGN parameter.
// ref/master.png is the ¾ still Harry's turnaround picked (refs/images/m3_view34_1.png on mum3), measurement only.
import L from './ref/landmarks.json' with { type: 'json' };
import { palette as PAL3, P as P3 } from '../mum3/params.js';

// ONE H for every view of mum3: the profile master's head (210 px). The ¾ still is the same height in the frame (skull top
// to sole 1499 px in both), so bones keep their lengths across views; its own skull→chin measures 220 px (the chin drops
// as the face turns toward us)
export const Hpx = 210;
const G = L.ground;
export const at = ([X, Y]) => [(X - G[0]) / Hpx, (Y - G[1]) / Hpx];
export const lm = (k) => at(L.points[k]);
const jt = (k) => at(L.joints[k]);
const F = L.face, fa = (k) => at(F[k]);
const W = (k, f) => { const s = L.widths[k].find((q) => Math.abs(q.f - f) < 0.01); return { front: s.l / Hpx, back: s.r / Hpx }; };   // measured half-widths across a limb (front = facing side)

export const palette = { ...PAL3, eyeHi: '#fbe9dc', noseLine: '#f2a06f', teeth: '#fcf6f2' };   // mum3's colours; the ¾ eyes carry a catch-light

// forwardX = cos(yaw): the shoulders measure 0.82 H apart on screen = 2·midL·sin(yaw) with midL 0.6 → yaw ≈ 43°, cos ≈ 0.74
export const design = { facing: 'right', forwardX: 0.74, ground: '#efe0d0', view: 'q' };

// ---------------------------------------------------------------- joints (rest = the ¾ still's standing pose)
// the spine is DESIGNED between the measured hips and shoulders (their midpoints), as on mum3
export const joints = {
  root: [0, 0],
  pelvis: [0.3, -3.75],
  spineLower: [0.22, -4.25], spineUpper: [0.16, -4.8], chest: [0.13, -5.3],
  neck: [0.06, -5.92], head: [0.1, -6.28], headTip: lm('skullTop'),
  bellyBase: [0.56, -3.95], bellyApex: lm('bumpApex'),
  // the near shoulder joint a touch above the estimator's, so the arm's round top meets the strap's corner (still: skin at
  // y −5.83 just left of it; the estimator's joint left a notch between the cap and the strap)
  clavicleNear: [0.06, -5.8], shoulderNear: [-0.3, -5.68], elbowNear: jt('elbowNear'), wristNear: jt('wristNear'),
  // the far arm: MediaPipe's far elbow (visibility 0.43) is a guess; the still hides the upper arm behind the bust, so the
  // elbow is set behind it and the wrist where the far forearm shows below the bump; the shoulder just inside the far strap
  clavicleFar: [0.18, -5.8], shoulderFar: [0.49, -5.66], elbowFar: [0.6, -4.62], wristFar: [0.93, -3.83],
  hipNear: jt('hipNear'), kneeNear: jt('kneeNear'), ankleNear: jt('ankleNear'), ballNear: [0.16, -0.1], toeNear: at(L.points.shoeNear.toe),
  hipFar: jt('hipFar'), kneeFar: jt('kneeFar'), ankleFar: jt('ankleFar'), ballFar: [0.79, -0.3], toeFar: at(L.points.shoeFar.toe),
};

const front = L.torso.map((q) => at([q.front, q.y]));
const back = L.torso.map((q) => at([q.back, q.y]));
const frontAt = (y) => front.reduce((a, q) => (Math.abs(q[1] - y) < Math.abs(a[1] - y) ? q : a));
const bump = { under: lm('underBust'), apex: lm('bumpApex'), bottom: lm('bumpBottom') };
bump.upper = frontAt(bump.under[1] + 0.55 * (bump.apex[1] - bump.under[1]));
bump.lower = frontAt(bump.apex[1] + 0.6 * (bump.bottom[1] - bump.apex[1]));
const edgeAt = (y) => at(F.edgeRight.reduce((a, q) => (Math.abs(q[1] - y) < Math.abs(a[1] - y) ? q : a)));
const hl = F.hairline.map(at), peak = hl.reduce((a, q) => (q[1] < a[1] ? q : a));
const eyeOf = (e) => ({ c: at(e.c), rx: e.rx / Hpx, ry: e.ry / Hpx, rot: e.rot, hi: at(e.highlight) });
const strokeOf = (s) => ({ p: s.p.map(at), w: s.w.map((v) => v / Hpx) });

// ---------------------------------------------------------------- shape parameters
const LEG_ST = [0.1, 0.23, 0.37, 0.5, 0.63, 0.77, 0.9];   // the shin stations master_measure measures (fraction knee → ankle)
export const P = {
  // FACE (head bone), ¾: named points on the far cheek's edge (measured row by row, each taken at its feature's row: the
  // eye, the mouth, halfway to the chin), the chin; the jaw designed from the chin round under the ear
  face: { cheek: edgeAt(F.eyes[1].c[1]), cheekLow: edgeAt(F.mouth.p[2][1]), jawFront: edgeAt((F.mouth.p[2][1] + F.chinLM[1]) / 2), chin: fa('chinLM'),
          jaw: [-0.02, -6.21], earLow: [-0.11, -6.33], back: [-0.2, -6.55], top: [0.2, -6.95] },
  eyes: { near: eyeOf(F.eyes[0]), far: eyeOf(F.eyes[1]) },   // left of the picture = her near eye (bigger), then the far one, narrower
  brows: { near: strokeOf(F.brows[0]), far: strokeOf(F.brows[1]) },
  mouth: strokeOf(F.mouth),
  nose: { tip: fa('noseTip'), bridge: fa('noseBridge') },
  ear: { c: [at(F.ear.c)[0] - 0.01, at(F.ear.c)[1]], rx: 1.15 * F.ear.ry / Hpx, ry: 1.12 * F.ear.rx / Hpx, rot: (F.ear.rot - 90) / 2 },   // measured long axis ~vertical; the blob is the ear's visible part (the hair and face cover its edges): drawn a little larger and more upright
  // HAIR: an egg over the skull (extents measured row by row), the hairline measured across the forehead (left temple →
  // the parting's peak → the far temple), the far side's lock down to the eye line, a low bun behind the near ear
  hair: { c: [0.13, -6.66], rx: 0.485, rxl: 0.48, ryt: 0.475, ryb: 0.42, line: { temple: hl[0], mid: hl[Math.floor(hl.length / 2) - 1], peak, far: hl[hl.length - 1] }, farLock: [0.535, -6.58], temple: [-0.06, -6.6],
          earTop: [-0.15, -6.6], nape: [-0.1, -6.18], bun: lm('bun'), bunR: 0.175 },   // the bun's extents (left −0.45, bottom −6.08 H); master_measure's bunR is the largest circle INSIDE it (0.156)
  neck: { back: [-0.12, -6.0], front: [0.225, -5.99], throatTop: [0.22, -6.1], napeTop: [-0.105, -6.34], baseBack: [-0.19, -5.88], baseFront: [0.29, -5.85] },   // the throat's top hides under the chin (measured: the neck's front edge reaches 0.2 H under it)
  // TORSO (dress), ¾: the neckline is a U we see INTO (the near strap wide, the far one foreshortened), the bust and bump on
  // the right edge are the measured front stations, the back on the left hides behind the near arm (designed where hidden)
  bump, front, back,
  hem: { back: lm('hemBack'), front: lm('hemFront'), y: (L.points.hem - G[1]) / Hpx },
  // measured on the rows across the shoulders: the near strap's top on the shoulder (left end, inner corner) and its armhole
  // edge; the neckline's U; the far strap (foreshortened) and the far armhole running into the bust
  strapNear: { top: [-0.3, -5.838], front: [-0.152, -5.857], edge: [[-0.181, -5.8], [-0.124, -5.743], [-0.09, -5.686], [-0.062, -5.6]] },
  neckline: { near: [-0.048, -5.771], low: [0.119, -5.629], bottom: [0.35, -5.552], up: [0.471, -5.629], far: [0.41, -5.743] },
  strapFar: { inner: [0.371, -5.8], top: [0.4, -5.8], outer: [0.519, -5.657], arm: [0.6, -5.543] },
  bust: [0.733, -5.29],
  // ARMS: half-widths (front = right of a hanging arm / back = left) at the shoulder, mid upper arm, elbow, mid forearm,
  // wrist: the near arm's left and right edges measured row by row about its axis (master_measure's own widths swallow the
  // armpit's skin at the shoulder).
  //  · near: the upper arm's FRONT is the deltoid bulging into the armhole, meeting the dress down to y −4.97 where the
  //    still's white gap opens (the armpit's crease ends at y −5.28); its back is narrower at the joint (0.155) under a
  //    taller round end (capA 1.0 × the mean half-width), so the cap's top meets the strap's corner and its outline runs
  //    (−0.41, −5.75) → (−0.47, −5.65) → (−0.5, −5.55) as the still's does (parts/arms.js flattens it as the arm rises)
  //  · far: narrower; its cap is the dome past the far strap, from the strap's top corner ((0.44, −5.79) → (0.54, −5.74) →
  //    (0.6, −5.64) → (0.63, −5.51)), lit like the near arm (the still's far shoulder and hand sample the chest's skin; only
  //    the far leg is a step darker). Its forearm's back edge is fuller toward the wrist (0.165, 0.15): drawn behind her
  //    bust, it fills the notch under the bust as the hand on top of the bump caresses (look-up v6: a white gap up to 73 px
  //    opened between bust, arm and hand; now ≤ 13)
  arm: { capA: 1.0, w: [{ front: 0.18, back: 0.155 }, { front: 0.18, back: 0.18 }, { front: 0.115, back: 0.16 }, { front: 0.096, back: 0.144 }, { front: 0.083, back: 0.107 }] },
  armFar: { capA: 1.0, fill: 'skin', wristRound: { r: 1.0, out: 0, along: 0.5 }, w: [{ front: 0.12, back: 0.15 }, { front: 0.12, back: 0.15 }, { front: 0.105, back: 0.14 }, { front: 0.09, back: 0.165 }, { front: 0.08, back: 0.15 }] },
  // legs: the shin's half-widths at every measured station; above the knee, read off the still's rows (hem → knee): the near
  // thigh 0.28 in front / 0.19 behind at y −2.3, its knee 0.24 / 0.21; the far thigh 0.20 / 0.25, its knee 0.155 / 0.245
  legStations: LEG_ST,
  leg: { near: { thigh: { front: 0.27, back: 0.21 }, thighLow: { front: 0.28, back: 0.19 }, knee: { front: 0.235, back: 0.215 },
                 shin: LEG_ST.map((f) => W('shinNear', f)), ankle: W('shinNear', 0.9) },
         far: { thigh: { front: 0.21, back: 0.26 }, thighLow: { front: 0.195, back: 0.25 }, knee: { front: 0.16, back: 0.245 },
                shin: LEG_ST.map((f) => W('shinFar', f)), ankle: W('shinFar', 0.9) } },
  // the INSTEP (front edge of the foot from the shin to the shoe's opening) as offsets from the ankle, measured row by row
  instep: { near: [[0.114, 0.086], [0.171, 0.162], [0.257, 0.238]], far: [[0.152, 0.086], [0.229, 0.162], [0.343, 0.238]] },
  shoe: { near: { heel: at(L.points.shoeNear.heel), toe: at(L.points.shoeNear.toe), top: (L.points.shoeNear.top - G[1]) / Hpx, sole: (L.points.shoeNear.sole - G[1]) / Hpx },
          far: { heel: at(L.points.shoeFar.heel), toe: at(L.points.shoeFar.toe), top: (L.points.shoeFar.top - G[1]) / Hpx, sole: (L.points.shoeFar.sole - G[1]) / Hpx } },
};

// ---------------------------------------------------------------- hands (engine/hand.js): mum3's hand spec, on this view's
// wrists (the hand is centred on the wrist's WIDTH, behind the estimator's wrist point, as on mum3)
const dirTo = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
export const handSpecs = {
  near: { id: 'hand.near', parentBone: 'hand.near', wrist: [joints.wristNear[0] - 0.03, joints.wristNear[1] + 0.03],
          dir: dirTo(joints.wristNear, lm('handTip')), view: 'back',
          length: 0.6, palmFrac: 0.5, wristW: 0.2, palmW: 0.3, thumbSide: 1, fingerK: 1.0, across: [0.3, 0.08, -0.15, -0.37], flexFx: { from: 'hand.near' },
          thumbFx: -0.15, thumb: { mcp: [0.4, 1.0], dir: 7, w: 0.95, taper: [1, 0.88, 0.76] }, thenarEdge: [1.08, 1.0], thumbWeb: [0.88, 0.86], fingerLen: [0.9, 1.0, 0.94, 0.8], fingerW: [1.0, 1.0, 0.95, 0.82], hypo: 0, thumbLine: false, order: [3, 2, 1, 0] },
};
handSpecs.far = { ...handSpecs.near, id: 'hand.far', parentBone: 'hand.far', wrist: [joints.wristFar[0] - 0.03, joints.wristFar[1] + 0.03], dir: 95, flexFx: { from: 'hand.far' } };   // hangs straight down beside the skirt (the estimator found only the near hand)

// DEPTH PROXIES (engine/depth.js): mum3's shapes, placed on this view's screen (a body's silhouette edge sits
// √((a·fx)² + (c·sinYaw)²) from its centre: the bump's centre is 0.47 H inside its apex here)
export const depth = { midL: 0.6, proxies: [
  { name: 'trunk', kind: 'cylinder', bone: 'spineUpper', at: [0.2, -4.7], F: 0.0, axes: [0.42, 1.2, 0.55] },
  { name: 'bump', kind: 'ellipsoid', bone: 'belly', at: [0.58, -4.35], F: 0.0, axes: [0.45, 0.62, 0.5] },
  { name: 'neck', kind: 'cylinder', bone: 'neck', at: [0.05, -6.0], F: 0.0, axes: [0.18, 0.2, 0.18] },
  { name: 'head', kind: 'ellipsoid', bone: 'head', at: [0.15, -6.6], F: 0.0, axes: [0.5, 0.55, 0.42] },
] };
export const frame = { bbox: [[-1.1, -7.3], [1.3, 0.05]], fill: 0.86, dy: 0 };
export const ref = { sizePx: L.sizePx, groundPx: L.ground, Hpx, image: 'ref/master.png' };
