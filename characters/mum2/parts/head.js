// head.js — face, ear, features (bone: head). Construction points come from landmarks + design offsets.
// Face rig channels (pose.face): lid {open|closed}, gaze [dx,dy] (H), mouth {smile|neutral|warm|open}, cheek {blush|sick}.
import { loop, taper, ellipse, egg } from '../../../engine/shapes.js';
import { ensureCW } from '../../../engine/hand.js';
import { mapGeom } from '../../../engine/geom.js';

const part = (id, z, fill, geom, extra = {}) => ({ id, bone: 'head', z, fill, geom, ...extra });
const wsum = (w, k) => { const e = Object.entries(w || {}); const s = e.reduce((a, [, v]) => a + Math.max(0, v), 0); return s > 0 ? Math.max(0, w[k] || 0) / s : 0; };

const MOUTHS = {   // offsets from the mouth landmark (H): 5 centreline points + widths; same counts for blending
  smile: { p: [[-0.07, -0.013], [-0.036, 0.011], [0.004, 0.02], [0.044, 0.01], [0.08, -0.018]], w: [0.016, 0.02, 0.022, 0.02, 0.016] },
  neutral: { p: [[-0.06, 0.004], [-0.03, 0.01], [0.004, 0.012], [0.038, 0.009], [0.068, 0.002]], w: [0.016, 0.019, 0.02, 0.019, 0.016] },
  warm: { p: [[-0.078, -0.022], [-0.04, 0.012], [0.004, 0.024], [0.048, 0.011], [0.088, -0.026]], w: [0.017, 0.022, 0.024, 0.022, 0.017] },
};

export const ANCHORS = { 'face': 9, 'ear': 8, 'ear.inner': 4, 'eye.near': 4, 'eye.far': 4, 'brow.near': 8, 'brow.far': 8,
  'nose': 6, 'mouth': 12, 'cheek.near': 4, 'cheek.far': 4, 'jaw.shadow': 14 };

export function build({ P: C, C: char, pose }) {
  const X = char.params.P, f = X.face, out = [];
  // ---- face skin: 9 construction anchors (top hidden under the fringe)
  const faceA = [
    [f.part[0] - 0.05, f.part[1] - 0.03], [f.far[0] - 0.04, f.part[1] + 0.09], [f.far[0], f.far[1], 1.1],
    [f.far[0] - 0.07, f.chin[1] - 0.11], [f.chin[0], f.chin[1], 0.9], [f.jawNear[0] - 0.02, f.jawNear[1] + 0.005, 1.0],
    [X.ear[0] + 0.06, f.far[1] + 0.06], [X.ear[0] + 0.05, f.nearEye[1] - 0.07], [f.part[0] - 0.22, f.part[1] + 0.06],
  ];
  const faceG = loop(faceA, 1.05);
  out.push(part('face', 50, C.skin, ensureCW(faceG)));
  // chin shadow on the throat: a crescent that follows the ACTUAL jaw contour (sampled from the face's own Bézier
  // segments far-cheek → chin → jaw corner) offset downward: deepest (~0.07 H) under the chin, because the chin projects
  // past the throat in ¾, thinning to ~0.02 at the jaw corner. Top edge sits inside the face (hidden); clipped to the neck.
  const js = X.jawShade, seg = (i, t) => { const n = faceG.P.length, j = (i + 1) % n, a = faceG.P[i], b = faceG.hout[i], c = faceG.hin[j], d = faceG.P[j], u = 1 - t;
    return [0, 1].map((k) => u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * d[k]); };
  const jaw = [[3, 0.55], [3, 0.8], [4, 0], [4, 0.3], [4, 0.6], [4, 0.85], [5, 0], [5, 0.15]].map(([i, t]) => seg(i, t));
  const dep = [js.front, js.front, js.front, js.front * 0.8, js.front * 0.55, js.back * 1.4, js.back, 0.004];
  out.push(part('jaw.shadow', 41, C.skinShade, ensureCW(loop([
    ...jaw.map((p, k) => [p[0], p[1] - 0.015, k === 0 || k === jaw.length - 1 ? { c: true, t: 0.5 } : undefined]),
    ...jaw.map((p, k) => [p[0], p[1] + dep[k]]).reverse().slice(1, -1)])),
    { clip: 'neck' }));
  // ear (near side), inner fold
  out.push(part('ear', 49, C.skin, egg(X.ear, { rx: 0.06, rxl: 0.055, ryt: 0.095, ryb: 0.085, rot: 12 })));
  out.push(part('ear.inner', 49.5, C.skinShade, taper([[X.ear[0] - 0.012, X.ear[1] - 0.05], [X.ear[0] + 0.012, X.ear[1] - 0.005], [X.ear[0] - 0.005, X.ear[1] + 0.045]], [0.006, 0.022, 0.004])));
  // cheeks
  const sick = wsum(pose.face?.cheek, 'sick'), warm = wsum(pose.face?.mouth, 'warm');
  const cheekFill = mix(C.cheek, C.sick, sick), lift = -0.012 * warm;
  // cheeks are clipped to the face; the far cheek sits clearly inside the far contour (no tangent with the face edge)
  out.push(part('cheek.near', 51, cheekFill, ellipse([X.cheeks.near[0], X.cheeks.near[1] + lift], 0.068, 0.042), { clip: 'face' }));
  out.push(part('cheek.far', 51, cheekFill, ellipse([X.cheeks.far[0] - 0.045, X.cheeks.far[1] + lift], 0.042, 0.038), { clip: 'face' }));
  // nose: small hook (skinLine)
  const n = X.nose;
  out.push(part('nose', 52, C.skinShade, taper([[n[0] - 0.025, n[1] - 0.13], [n[0] - 0.008, n[1] - 0.06], [n[0] + 0.004, n[1] - 0.012], [n[0] - 0.04, n[1] + 0.006]], [0.004, 0.02, 0.024, 0.012])));
  // eyes: dark ovals; lids close by squashing toward the eye's lower third; gaze slides them inside the socket
  const open = pose.face?.lid ? wsum(pose.face.lid, 'open') : 1, g = pose.face?.gaze || [0, 0];
  for (const side of ['near', 'far']) {
    const e = X.eyes[side], c = [e.c[0] + g[0], e.c[1] + g[1]];
    let geo = ellipse(c, e.rx, e.ry);
    if (open < 0.999) { const yc = c[1] + e.ry * 0.35, k = Math.max(0.06, open); geo = mapGeom(geo, (p) => [p[0], yc + (p[1] - c[1]) * k + (c[1] - yc) * open]); }
    out.push(part(`eye.${side}`, 53, C.eye, geo));
    // brows: tapered arcs, follow the lids a little
    const b = X.brows[side], L = X.brows.len[side === 'near' ? 0 : 1], dy = (1 - open) * 0.012;
    out.push(part(`brow.${side}`, 54, C.hair, taper([[b[0] - L / 2, b[1] + 0.012 + dy], [b[0], b[1] - 0.008 + dy], [b[0] + L / 2, b[1] + 0.006 + dy]], [0.014, X.brows.w, 0.012], 'round')));
  }
  // mouth: blend of library shapes (same point counts)
  let mw = pose.face?.mouth || { smile: 1 };
  const keys = Object.keys(MOUTHS);
  if (!keys.some((k) => (mw[k] || 0) > 0)) mw = { smile: 1 };
  const tot = keys.reduce((a, k) => a + Math.max(0, mw[k] || 0), 0);
  const pts = MOUTHS.smile.p.map((_, i) => keys.reduce((a, k) => [a[0] + (Math.max(0, mw[k] || 0) / tot) * MOUTHS[k].p[i][0], a[1] + (Math.max(0, mw[k] || 0) / tot) * MOUTHS[k].p[i][1]], [0, 0]));
  const ws = MOUTHS.smile.w.map((_, i) => keys.reduce((a, k) => a + (Math.max(0, mw[k] || 0) / tot) * MOUTHS[k].w[i], 0));
  out.push(part('mouth', 55, C.mouth, taper(pts.map(([x, y]) => [X.mouth[0] + x, X.mouth[1] + y]), ws, 'round')));
  return out;
}

function mix(a, b, t) {
  const h = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  return '#' + h(a).map((v, i) => Math.round(v + (h(b)[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
