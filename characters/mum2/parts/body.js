// body.js — neck + décolletage (skinned chest→neck), lilac top (chest), belly (belly bone, 4×4 lattice), hips block
// (pelvis), cardigan panels (spine) with fold lines. Construction points come from joints/landmarks + offsets.
import { loop, taper, egg } from '../../../engine/shapes.js';
import { ffd, add, lerp } from '../../../engine/geom.js';
import { ensureCW } from '../../../engine/hand.js';

const part = (id, bone, z, fill, geom, extra = {}) => ({ id, bone, z, fill, geom, ...extra });
export const ANCHORS = { 'neck': 8, 'decollete': 6, 'top': 15, 'top.underbust': 4, 'belly': 11, 'belly.shade': 40, 'belly.cast': 48, 'hips': 10,
  'cardigan.near': 13, 'cardigan.far': 13, 'cardigan.far.lapel': 8 };

/** Lattice box for the bump's 4×4 FFD (pose.lattice.belly): covers the whole lower-front torso the belly bone carries. */
export function bellyBox(X) {
  const b = X.bump;
  return [-0.45, b.dip[1] - 0.2, b.apex[0] + 0.12, b.hemLow[1] + 0.12];
}

// point on segment i of a Bézier loop at parameter t (for building strokes that hug a contour)
const bez = (g, i, t) => {
  const n = g.P.length, j = (i + 1) % n, a = g.P[i], b = g.hout[i], c = g.hin[j], d = g.P[j], u = 1 - t;
  return [0, 1].map((k) => u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * d[k]);
};
const along = (g, i0, i1, per = 3) => { const out = []; for (let i = i0; i < i1; i++) for (let s = 0; s < per; s++) out.push(bez(g, i, s / per)); out.push(g.P[i1 % g.P.length]); return out; };

export function build({ P: C, C: char, pose }) {
  const X = char.params.P, J = char.joints, out = [];
  const nb = X.neck, nl = X.neckline, nbase = nb.base;
  const collarN = [nbase[0] - 0.15, nbase[1] - 0.13], collarF = [nbase[0] + 0.11, nbase[1] - 0.13];   // collars hug the neck (R5: higher, far collar tucks behind the throat)
  const spineSkin = { chain: ['pelvis', 'spineLower', 'spineUpper', 'chest'], zone: 0.3 };
  // ---- neck = a simple column (straight throat, gently curved nape) + a décolletage UNDER the top: the visible neckline
  // is the top's own smooth U-scoop, never the skin shape (design bar: one clean shape per form, no lobes).
  //  · column (z 40): above the far collar (which wraps behind the neck), below the near cardigan collar and the face.
  //    Its bottom ends inside the décolletage (same fill), so it never paints over the top or the lapel.
  //  · décolletage (z 34.8, chest): skin behind the top; only the scoop shows it. The lapel (36.5) lies on top of it.
  const nc = X.neckCol;
  const napeA = Math.atan2(nc.backTop[1] - nc.backBase[1], nc.backTop[0] - nc.backBase[0]) * 180 / Math.PI;
  const napeMid = add(lerp(nc.backTop, nc.backBase, 0.5), [nc.nape, 0]);   // concave: the nape dips in, then sweeps out into the shoulders
  out.push(part('neck', 'neck', 40, C.skin, ensureCW(loop([
    [nc.backTop[0], nc.backTop[1], { c: true, t: 0.5 }], [nc.frontTop[0] - 0.1, nc.frontTop[1] - 0.12], [nc.frontTop[0], nc.frontTop[1], { a: 92 }],
    [nc.frontTop[0] + 0.012, nc.frontTop[1] + 0.13, { a: 86 }],                                            // throat: the straight side
    [nc.frontBase[0], nc.frontBase[1], { c: true, t: 0.6 }], [(nc.frontBase[0] + nc.backBase[0]) / 2, nc.frontBase[1] + 0.03],
    [nc.backBase[0], nc.backBase[1], { c: true, t: 0.6 }], [napeMid[0], napeMid[1], { a: napeA, t: 1.2 }]])),   // nape: the curved side
    { skin: { parent: 'chest', child: 'neck', zone: 0.35 } }));
  out.push(part('decollete', 'chest', 34.8, C.skin, ensureCW(loop([
    [-0.3, nc.frontBase[1] - 0.08], [0.2, nc.frontBase[1] - 0.1], [0.42, -4.82], [0.3, nl[1] + 0.08], [0.0, nl[1] + 0.1], [-0.3, nl[1] + 0.06]]))));

  // ---- upper torso (top): neckline scoop, far contour = lapel line → bust → notch. Its lower edge is hidden inside the
  // bump (same fill) and under the near cardigan, so the only visible contours are the neckline and bust.
  const bz = X.bump, bu = X.bust;
  out.push(part('top', 'chest', 35, C.top, ensureCW(loop([
    [X.shoulderTop.near[0] + 0.12, X.shoulderTop.near[1] + 0.08], [nl[0] - 0.27, nl[1] - 0.1], [nl[0] - 0.15, nl[1] - 0.045], [nl[0] - 0.01, nl[1] + 0.01, { a: 0 }],   // near arm of the U meets the cardigan edge near-perpendicular (no lilac wedge)
    [nl[0] + 0.15, nl[1] - 0.045], [nl[0] + 0.28, nl[1] - 0.19],   // far arm of the U runs into the lapel at a wide angle (no skin sliver)
    [bu[0] - 0.11, bu[1] - 0.37], [bu[0] - 0.025, bu[1] - 0.16], [bu[0], bu[1], { a: 95 }], [bz.dip[0] + 0.065, bz.dip[1] - 0.015], [bz.dip[0] + 0.02, bz.dip[1] + 0.06, { c: true, t: 0.7 }],   // bust rolls straight into the bump: a soft dip, no enclosed notch
    [0.3, -4.0], [0.1, -3.8], [-0.55, -3.75], [-0.66, -4.25]])), { skin: { chain: ['spineLower', 'spineUpper', 'chest'], zone: 0.3 } }));
  // near breast fold (rises toward the far side)
  out.push(part('top.underbust', 'chest', 35.5, C.topShade, taper([[-0.12, bz.dip[1] + 0.08], [0.03, bz.dip[1] + 0.105], [0.18, bz.dip[1] + 0.055]], [0.003, 0.02, 0.003])));

  // ---- bump = lower front torso on the belly bone (child of pelvis) with the 4×4 lattice. Under the top (the bust
  // overlaps it at the notch); its bottom edge IS the top's hem.
  const ry = bz.apex[1] - bz.dip[1], rx = bz.apex[0] - bz.dip[0], th = 50 * Math.PI / 180;
  const upper = [bz.dip[0] + rx * Math.sin(th) * bz.upperFull, bz.apex[1] - ry * Math.cos(th)];
  const lrx = bz.apex[0] - bz.hemFront[0], lry = bz.hemFront[1] - bz.apex[1];
  const lower = [bz.hemFront[0] + lrx * Math.SQRT1_2 * bz.lowerFull, bz.apex[1] + lry * Math.SQRT1_2];
  const box = bellyBox(X), lat = pose.lattice?.belly;
  const bellyG = ensureCW(loop([
    [-0.38, bz.dip[1] - 0.12], [0.2, bz.dip[1] - 0.17], [bz.dip[0] - 0.07, bz.dip[1] - 0.11], [bz.dip[0], bz.dip[1], { a: bz.dipAngle, ti: 0.3, to: 1.1 }],
    upper, [bz.apex[0], bz.apex[1], { a: 90 }], lower, [bz.hemFront[0], bz.hemFront[1], { t: 0.9 }],
    bz.hemLow, bz.hemBack, [-0.4, bz.hemBack[1] - 0.02]]));
  out.push(part('belly', 'belly', 34, C.top, ffd(bellyG, box, lat)));
  // form shade on the turning (lower-front) side: a stroke centred on the contour, clipped to the bump → crescent
  const iU = bellyG.P.findIndex((p) => p[0] === upper[0] && p[1] === upper[1]);
  const cl = along(bellyG, iU, iU + 3, 8).slice(4), nC = cl.length;   // from just above the apex to hemFront: no hairline tails
  const wS = cl.map((_, i) => { const s = i / (nC - 1); return 0.006 + 2 * bz.shade * Math.sin(Math.PI * (0.08 + 0.84 * s)) ** 0.9; });
  out.push(part('belly.shade', 'belly', 34.2, C.topShade, ffd(taper(cl, wS), box, lat), { clip: 'belly' }));
  // the bump's cast shadow on the joggers, right under the hem (weight: the bump overhangs), clipped to the hips
  const iF = iU + 3, hm = along(bellyG, iF, iF + 3, 8), nH = hm.length;   // hemFront → hemLow → hemBack → under the cardigan
  const wC = hm.map((_, i) => { const s = i / (nH - 1); return i === 0 ? 0.01 : 2 * bz.cast * Math.max(0, 1 - s / 0.5) ** 0.6 + 0.002; });   // crescent under the overhang: short tip, no hairline tail
  out.push(part('belly.cast', 'belly', 31.5, C.bottomsShade, ffd(taper(hm, wC), box, lat), { clip: 'hips' }));
  // hips block (joggers top, between the legs' tops); its top edge hides under the bump's hem
  out.push(part('hips', 'pelvis', 31, C.bottoms, ensureCW(loop([
    [-0.68, -3.3], [0.66, -3.3], [0.74, -2.95], [0.66, -2.45], [0.3, -2.15], [0.1, -2.02, { c: true, ao: -100, to: 1.2 }], [0.045, -2.12, { a: 180, t: 1.0 }], [-0.01, -2.02, { c: true, ai: -80, ti: 1.2 }], [-0.3, -2.15], [-0.7, -2.42]]))));   // crotch: rounded arch, no notch
  // cardigan near panel: shoulder → back contour → hem → front edge (open) → collar
  const hn = X.hem.near, hf = X.hem.front;
  out.push(part('cardigan.near', 'spineLower', 70, C.cardigan, ensureCW(loop([
    [collarN[0], collarN[1]], X.shoulderLine.near[0], X.shoulderLine.near[1], [hn[0] - 0.08, -4.15],
    [hn[0] - 0.0, -3.45], [hn[0] - 0.09, hn[1] - 0.32], [hn[0] - 0.04, hn[1] + 0.01, { c: true, t: 0.6 }], [(hn[0] + hf[0]) / 2, hf[1] + 0.035],
    [hf[0], hf[1], { c: true, t: 0.6 }], [hf[0] + 0.04, -3.2], [hf[0] + 0.03, -4.0], [nl[0] - 0.2, nl[1] + 0.02], [collarN[0] + 0.05, collarN[1] + 0.12]])),
    { skin: spineSkin }));
  // far panel: hangs on the far side BEHIND the bust and bump (they project past it); its inner edge is hidden behind
  // the torso except below the bump. The lapel (over the top) carries the visible edge above the bust.
  const hfar = X.hem.far, shF = J.shoulderFar, capF = X.shoulderCap.far;
  out.push(part('cardigan.far', 'spineLower', 33, C.cardigan, ensureCW(loop([
    [collarF[0], collarF[1]], X.shoulderLine.far[0], X.shoulderLine.far[1], [bu[0] - 0.15, bu[1] - 0.17], [bz.dip[0] - 0.04, bz.dip[1]], [bz.apex[0] - 0.2, bz.apex[1]], [hfar[0] - 0.12, -3.3], [hfar[0] - 0.05, hfar[1] - 0.08],
    [hfar[0] - 0.11, hfar[1] + 0.03, { t: 0.9 }], [0.6, hfar[1] + 0.02, { c: true, t: 0.6 }], [0.6, bz.hemFront[1] + 0.12], [0.42, -3.4], [0.3, -4.4]])),
    { skin: spineSkin }));
  out.push(part('cardigan.far.lapel', 'spineLower', 36.5, C.cardigan, ensureCW(loop([
    // a confident collar band over the far shoulder that ENDS above the bust with one rounded end (no tooth on the bust);
    // R8: the rounded end stays INSIDE the cap/sleeve silhouette (no knob, no tangent notch)
    [collarF[0], collarF[1]], X.shoulderLine.far[0], X.shoulderLine.far[1], [shF[0] + capF * 0.8, shF[1] - 0.03, { a: 95 }],
    [shF[0] + capF * 0.72, shF[1] + 0.04], [bu[0] - 0.08, bu[1] - 0.31, { t: 0.9 }], [bu[0] - 0.15, bu[1] - 0.39], [nl[0] + 0.21, nl[1] - 0.225]])),   // R7: tapers from ~0.05 H at the collar to ~0.12 over the cap; rounded end sits ON the shoulder
    { skin: spineSkin }));
  return out;
}
