// body.js — neck + décolletage (skinned chest→neck), lilac top (chest), belly (belly bone, 4×4 lattice), hips block
// (pelvis), cardigan panels (spine) with fold lines. Construction points come from joints/landmarks + offsets.
import { loop, taper, egg } from '../../../engine/shapes.js';
import { ffd } from '../../../engine/geom.js';
import { ensureCW } from '../../../engine/hand.js';

const part = (id, bone, z, fill, geom, extra = {}) => ({ id, bone, z, fill, geom, ...extra });
export const ANCHORS = { 'neck': 7, 'top': 15, 'top.underbust': 4, 'belly': 11, 'belly.shade': 24, 'belly.cast': 16, 'hips': 10,
  'cardigan.near': 13, 'cardigan.far': 10, 'cardigan.far.lapel': 9 };

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
  // neck + V of the chest down to the neckline; skinned so the throat follows the neck while the base stays on the chest
  out.push(part('neck', 'neck', 40, C.skin, ensureCW(loop([
    [nb.back[0] + 0.03, nb.back[1] - 0.2], [nb.front[0] - 0.05, nb.front[1] - 0.09], [nb.front[0] - 0.01, nb.front[1] + 0.12],
    [nl[0] + 0.26, nl[1] - 0.06], [nl[0], nl[1] + 0.07, { c: true, t: 0.7 }], [nl[0] - 0.3, nl[1] - 0.04], [nb.back[0] + 0.0, nb.back[1] + 0.17]])),
    { skin: { parent: 'chest', child: 'neck', zone: 0.35 } }));

  // ---- upper torso (top): neckline scoop, far contour = lapel line → bust → notch. Its lower edge is hidden inside the
  // bump (same fill) and under the near cardigan, so the only visible contours are the neckline and bust.
  const bz = X.bump, bu = X.bust;
  out.push(part('top', 'chest', 35, C.top, ensureCW(loop([
    [X.shoulderTop.near[0] + 0.12, X.shoulderTop.near[1] + 0.08], [nl[0] - 0.26, nl[1] - 0.16], [nl[0] - 0.13, nl[1] - 0.03], [nl[0], nl[1] + 0.005],
    [nl[0] + 0.15, nl[1] - 0.06], [nl[0] + 0.28, nl[1] - 0.15],
    [bu[0] - 0.11, bu[1] - 0.37], [bu[0] - 0.025, bu[1] - 0.16], [bu[0], bu[1], { a: 95 }], [bz.dip[0] + 0.05, bz.dip[1] - 0.035], [bz.dip[0] - 0.02, bz.dip[1] + 0.012, { c: true, t: 0.7 }],
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
  const cl = along(bellyG, iU, iU + 4, 3), nC = cl.length;
  const wS = cl.map((_, i) => { const s = i / (nC - 1); return 0.004 + 2 * bz.shade * Math.sin(Math.PI * Math.min(1, s * 1.25)) ** 1.2; });
  out.push(part('belly.shade', 'belly', 34.2, C.topShade, ffd(taper(cl, wS), box, lat), { clip: 'belly' }));
  // the bump's cast shadow on the joggers, right under the hem (weight: the bump overhangs), clipped to the hips
  const iF = iU + 3, hm = along(bellyG, iF, iF + 2, 4), nH = hm.length;
  const wC = hm.map((_, i) => { const s = i / (nH - 1); return 0.004 + 2 * bz.cast * Math.max(0, Math.sin(Math.PI * Math.min(1, 0.12 + s * 1.3))) ** 0.8; });
  out.push(part('belly.cast', 'belly', 31.5, C.bottomsShade, ffd(taper(hm, wC), box, lat), { clip: 'hips' }));
  // hips block (joggers top, between the legs' tops); its top edge hides under the bump's hem
  out.push(part('hips', 'pelvis', 31, C.bottoms, ensureCW(loop([
    [-0.68, -3.3], [0.66, -3.3], [0.74, -2.95], [0.66, -2.45], [0.3, -2.15], [0.095, -2.03, { c: true, ao: -95, to: 1.1 }], [0.045, -2.15, { a: 180, t: 1.0 }], [-0.006, -2.03, { c: true, ai: -85, ti: 1.1 }], [-0.3, -2.15], [-0.7, -2.42]]))));   // crotch: rounded arch, no notch
  // cardigan near panel: shoulder → back contour → hem → front edge (open) → collar
  const hn = X.hem.near, hf = X.hem.front;
  out.push(part('cardigan.near', 'spineLower', 70, C.cardigan, ensureCW(loop([
    [collarN[0], collarN[1]], X.shoulderLine.near[0], X.shoulderLine.near[1], [hn[0] - 0.08, -4.15],
    [hn[0] - 0.0, -3.45], [hn[0] - 0.09, hn[1] - 0.32], [hn[0] - 0.04, hn[1] + 0.01, { c: true, t: 0.6 }], [(hn[0] + hf[0]) / 2, hf[1] + 0.035],
    [hf[0], hf[1], { c: true, t: 0.6 }], [hf[0] + 0.04, -3.2], [hf[0] + 0.03, -4.0], [nl[0] - 0.2, nl[1] + 0.02], [collarN[0] + 0.05, collarN[1] + 0.12]])),
    { skin: spineSkin }));
  // far panel: hangs on the far side BEHIND the bust and bump (they project past it); its inner edge is hidden behind
  // the torso except below the bump. The lapel (over the top) carries the visible edge above the bust.
  const hfar = X.hem.far;
  out.push(part('cardigan.far', 'spineLower', 33, C.cardigan, ensureCW(loop([
    [collarF[0], collarF[1]], X.shoulderLine.far[0], X.shoulderLine.far[1], [hfar[0] - 0.12, -3.4], [hfar[0] - 0.05, hfar[1] - 0.08],
    [hfar[0] - 0.11, hfar[1] + 0.03, { t: 0.9 }], [0.6, hfar[1] + 0.02, { c: true, t: 0.6 }], [0.6, bz.hemFront[1] + 0.12], [0.42, -3.4], [0.3, -4.4]])),
    { skin: spineSkin }));
  out.push(part('cardigan.far.lapel', 'spineLower', 36.5, C.cardigan, ensureCW(loop([
    [collarF[0], collarF[1]], X.shoulderLine.far[0], X.shoulderLine.far[1], [bu[0] - 0.02, bu[1] - 0.26], [bu[0] - 0.03, bu[1] - 0.1, { t: 0.7 }],
    [bu[0] - 0.01, bu[1] - 0.1, { t: 0.7 }], [bu[0] - 0.04, bu[1] - 0.17], [bu[0] - 0.13, bu[1] - 0.36], [nl[0] + 0.26, nl[1] - 0.16]])),
    { skin: spineSkin }));
  return out;
}
