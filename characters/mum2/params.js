// params.js — Mum v2: every number the parts use. Units: H (head = skull top → chin), origin on the ground between
// the feet, y down, facing right (¾ view). Landmarks come from ref/landmarks.json (named points only); everything
// else is a DESIGN parameter, chosen against the design language (docs/research.md §4) and tuned by the critic.
import L from './ref/landmarks.json' with { type: 'json' };

export const Hpx = L.Hpx;
const G = L.ground;
export const at = ([X, Y]) => [(X - G[0]) / Hpx, (Y - G[1]) / Hpx];
export const lm = (k) => at(L.points[k]);

export const palette = {
  skin: '#d48055', skinShade: '#c76a47', skinLine: '#b05a3a', cheek: '#e37158', nail: '#e7a27c',   // nail: a light tint of the skin (back-of-hand views only)   // skinLine: drawn creases (finger lines, nose) — darker than the shade, as sampled from the reference (#a14e32 on #c87754)
  hair: '#5e3424', hairShade: '#4a2718',
  top: '#b99dd7', topShade: '#a685cb',            // lilac top (value ladder: cardigan 81 > top 69 > joggers 50 > hair 27)
  bottoms: '#9c7fb5', bottomsShade: '#8467a0',     // mauve joggers (lightened 11 Oct: large area, keep the ladder gentle)
  cardigan: '#feb8c3', cardiganShade: '#f79caf',   // pink cardigan: one base + one shade
  sock: '#e0c079', sockShade: '#cea155',            // lower chroma than the face's focal colours; ΔL* ≈ 6 vs floor           // yellow socks
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
  // detail budget (BUCK/Headspace bar: big simple shapes carry the read; no wrinkles or hair-thin lines). Each flag is a
  // small line-like detail; keep the count low and spend it where it explains form (bust fold, bump shade).
  detail: { sleeveFold: false, cuffRib: false, legCuffLine: false, sockSeams: false, sockBand: true },
  // head (head bone): face built from landmark-anchored construction points
  face: { chin: lm('chin'), jawNear: lm('jawNear'), far: lm('faceFar'), nearEye: lm('faceNearAtEyes'), part: lm('hairPart') },
  eyes: { near: { c: lm('eyeNear'), rx: 0.03, ry: 0.039 }, far: { c: lm('eyeFar'), rx: 0.026, ry: 0.038 } },
  brows: { near: lm('browNear'), far: lm('browFar'), len: [0.12, 0.09], w: 0.026 },
  nose: lm('noseTip'), mouth: lm('mouth'), cheeks: { near: lm('cheekNear'), far: lm('cheekFar') }, ear: lm('ear'),
  hair: { bun: lm('bunCentre'), bunR: 0.19, loopTop: lm('loopTop'), back: lm('hairBack'), top: lm('skullTop'),
          fly: false, strandW: [0.066, 0.062, 0.057, 0.052, 0.047, 0.042, 0.036, 0.03],   // tail ≥ 0.03 H
          loopW: [0.042, 0.056, 0.06, 0.056, 0.042], loopDrop: 0.1, strandFar: { amp: 0.014, len: 0.42 } },   // chunkify: no hair-thin strokes (BUCK/Blender 'illusion of simplicity')
  neck: { back: lm('neckBack'), front: lm('neckFront'), base: lm('neckBase'), w: 0.28 },
  // neck column (rebuilt 11 Oct after "the neck looks messed up"): throat straight under the chin, nape gently curved, ~0.3 H
  // wide; tops hidden under the face/hair, base hidden in the décolletage / under the near collar
  neckCol: { backTop: [lm('neckBack')[0] + 0.02, lm('jawNear')[1] + 0.045], frontTop: [lm('neckFront')[0] + 0.02, lm('chin')[1] - 0.04],
             frontBase: [lm('neckFront')[0] + 0.1, lm('neckBase')[1] + 0.05], backBase: [lm('neckBack')[0] - 0.1, lm('neckBase')[1] + 0.03],
             nape: 0.05 },   // R7: wider base (nape sweeps back into the trapezius under the strand tail; throat flares into the far collar), concave nape
  // jaw/chin shadow on the throat: thickest at the front under the chin (the chin projects), thin toward the ear
  jawShade: { front: 0.1, back: 0.04 },
  shoulderCap: { near: 0.2, far: 0.205 },   // R8: far cap a touch larger: collar → cap → sleeve reads as one convex shoulder arc    // circle radius at the shoulder pivot (joint = circle) = sleeve half-width
  // trapezius slope (measured as silhouette extents at three heights, then used as construction points)
  shoulderLine: { near: [[-0.42, -4.965], [-0.725, -4.845, { a: 150 }]], far: [[0.26, -4.965], [0.54, -4.8, { a: 47 }]] },   // zoom tour: slopes DOWN from the high collar to the cap (no hump)   // R6: end points ON the cap circles with the cap's tangent → one convex shoulder arc   // R4: end points sit inside the cap circles (no step)
  // torso (top), belly, cardigan
  neckline: lm('necklineFront'), bust: lm('bustFar'), underBust: lm('underBust'),
  belly: { apex: lm('bellyApex'), bottom: lm('bellyBottom') },
  // bump (rebuilt 11 Oct): the bump IS the lower front of the torso, not an egg glued on. Front contour = bust →
  // small notch (dip) → flatter upper slope (fundus high under the ribs at ~36 wk) → apex just below mid-height →
  // fuller, near-elliptical lower curve → hem wraps under it as a "smile" (lowest under the bump, rising to both
  // sides) = the cross-section line that sells the volume. upperFull < 1 flattens the upper slope (egg, small end up).
  bump: { dip: lm('underBustDip'), apex: [lm('bellyApex')[0] + 0.02, lm('bellyApex')[1] + 0.06], hemFront: [lm('hemBumpFront')[0] - 0.04, lm('hemBumpFront')[1]],
          hemLow: [lm('bellyBottom')[0] - 0.05, lm('bellyBottom')[1] - 0.01], hemBack: lm('topHemBack'), upperFull: 0.85, lowerFull: 1.15, dipAngle: 28,   // R4: egg, not a symmetric D
          shade: 0.055, cast: 0.05 },
  hem: { near: lm('hemNear'), front: lm('hemFront'), far: lm('hemFar') },
  shoulderTop: { near: lm('shoulderTopNear'), far: lm('shoulderTopFar') },
  // sleeves: half-widths along shoulder → elbow → cuff
  cuffEnd: { near: 0.92, far: 0.84 },   // cuff's flat end as a fraction elbow→wrist (its rounded end then lands on the reference cuff edge)
  sleeve: { near: [0.2, 0.2, 0.19, 0.2], far: [0.19, 0.19, 0.18, 0.19], outer: [1.0, 1.1, 1.04, 1.0], inner: [1.0, 0.92, 0.88, 1.0] },
  // legs (jogger half-widths at hip, knee, above cuff) and centre offsets measured as widths
  leg: { near: { hip: 0.34, knee: 0.3, cuff: 0.2, calfK: 1.06, outer: [1.06, 1.2, 1.06, 1.0, 1], inner: [1.12, 1.16, 1.08, 0.94, 1] }, far: { hip: 0.32, knee: 0.28, cuff: 0.18, cuffK: 0.92, calfK: 1.06, outer: [1.02, 1.16, 1.02, 0.94, 1], inner: [1.0, 1.08, 1.05, 0.94, 1] } },   // ¾: legs nearly touch at the crotch and open as a narrow wedge (measured ref gap 0.05 H @-2.0 → 0.16 @-1.2); far ≈ 0.94× near; the near knee bulges inward
  foot: { near: { heel: [lm('heelNear')[0] + 0.04, lm('heelNear')[1]], toe: [lm('toeNear')[0] - 0.18, lm('toeNear')[1] + 0.05], round: 1.3 }, far: { heel: [lm('heelFar')[0], lm('heelFar')[1] - 0.07], toe: [lm('toeFar')[0] - 0.1, lm('toeFar')[1] - 0.07], round: 1.3 } },   // near foot toward camera (shorter, toe lower); far foot back in depth
};

// ---------------------------------------------------------------- hands (generator v2: engine/hand.js anatomy defaults)
// Hands — history: v2 (separate fingers) → v3 (pointed, nails: judged by eye) → v4 (MEASURED against the reference with
// tools/hand_fit.py; critic rounds R12–R14). What holds now:
//  · proportions from the reference: chunky grouped fingers (≈1:3), round tips, no nails, separate thumb with a notch
//  · fingers TOGETHER by construction ('touch' fan) — spread is a pose; webbing between knuckles
//  · flexion mostly foreshortens (flexFx 0.10 near / −0.14 far): curls never swing sideways; past ~100° a phalanx folds
//    away (depth rule) so a fist is a knuckle block; knuckle discs are rigid
//  · lines (skinLine) run from just below the knuckles to just above the tip notches, shorten for a shorter finger behind,
//    fade with curl and spread; the palm view adds one S/C crease (heel → thumb's inner edge) and a comb at the finger roots
//  · the palm's wrist end is a semicircle about the pivot; its thumb side envelops the thenar (one convex edge cuff → thumb)
const dirTo = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
export const handSpecs = {
  // Measured, not eyeballed (tools/hand_fit.py vs the reference): wrist(cuff)→fingertip 0.45 H near / 0.38 H far; palm
  // incl. thumb ≈ 0.33 H wide; fingers grouped (one skin run across them), chunky (width ≈ 0.075 H, ≈ 1:3), round tips.
  // near (her right) hand hangs beside the thigh: back of the hand toward us, thumb forward (toward her front = right)
  near: { id: 'hand.near', parentBone: 'hand.near', wrist: joints.wristNear, dir: dirTo(joints.wristNear, lm('fingertipNear')) + 7, view: 'back',
          length: 0.47, palmFrac: 0.5, wristW: 0.29, palmW: 0.29, thumbSide: 1, fingerK: 1.0, across: [0.3, 0.08, -0.15, -0.37], flexFx: 0.1,
          thumbFx: -0.15, thumb: { mcp: [0.4, 1.05], dir: 15, w: 1.05 }, thenarEdge: [1.25, 1.15], thumbWeb: [0.9, 0.7], hypo: 0, thumbLine: false, order: [3, 2, 1, 0] },   // thumb separates by its notch (no line); seen from the back its flexion goes INTO the picture (small in-plane share: a fist keeps the thumb on its side, never sweeping across the knuckles); thumb flexion runs ACROSS the palm (toward the pinky): mostly in-plane, opposite sense to finger curl
  // far (her left) hand: palm toward us, thumb on the OUTER edge (her front = right), lying in front of the palm; its
  // inner edge is drawn as a line over the palm (as in the reference)
  far: { id: 'hand.far', parentBone: 'hand.far', wrist: joints.wristFar, dir: dirTo(joints.wristFar, lm('fingertipFar')) - 4, view: 'palm',
         length: 0.38, palmFrac: 0.52, wristW: 0.25, palmW: 0.265, hypo: 0.0, thumbSide: 1, fingerK: 1.08, fingerLen: [0.84, 1.0, 0.9, 0.72], across: [0.3, 0.08, -0.15, -0.37], flexFx: -0.14,
         thumbFx: -0.35, thumb: { cmc: [0.0, 0.6], mcp: [0.3, 1.15], dir: -3, w: 1.05 }, thenarEdge: [1.25, 1.2], thumbLine: false, order: [3, 2, 1, 0] },   // its inner edge is drawn by the crease stroke   // thumb lies ALONG the outer edge in front of the palm (adducted), tip at ~45% of the hand
};

export const frame = { bbox: [[-1.45, -6.5], [1.5, 0.05]], fill: 0.86, dy: 0 };   // fits the A-pose hands (detail audit)
export const ref = { sizePx: L.sizePx, groundPx: L.ground, Hpx, image: 'ref/standing_34.jpg' };
