// body.js — neck + décolletage (skinned chest→neck), lilac top (chest), belly (belly bone, 4×4 lattice), hips block
// (pelvis), cardigan panels (spine) with fold lines. Construction points come from joints/landmarks + offsets.
import { loop, taper, egg } from '../../../engine/shapes.js';
import { ffd } from '../../../engine/geom.js';
import { ensureCW } from '../../../engine/hand.js';

const part = (id, bone, z, fill, geom, extra = {}) => ({ id, bone, z, fill, geom, ...extra });
export const ANCHORS = { 'neck': 7, 'top': 16, 'top.underbust': 4, 'belly': 8, 'belly.crease': 6, 'hips': 7,
  'cardigan.near': 12, 'cardigan.near.fold': 6, 'cardigan.far': 9, 'cardigan.far.fold': 6 };

export function bellyBox(X) {
  const c = bellyCentre(X);
  return [c[0] - 0.55, c[1] - 0.6, c[0] + 0.55, c[1] + 0.58];
}
const bellyCentre = (X) => [X.belly.apex[0] - 0.45, X.belly.apex[1] - 0.01];

export function build({ P: C, C: char, pose }) {
  const X = char.params.P, J = char.joints, out = [];
  const nb = X.neck, nl = X.neckline;
  // neck + V of the chest down to the neckline; skinned so the throat follows the neck while the base stays on the chest
  out.push(part('neck', 'neck', 40, C.skin, ensureCW(loop([
    [nb.back[0] - 0.01, nb.back[1] - 0.08], [nb.front[0] - 0.02, nb.front[1] - 0.09], [nb.front[0] + 0.03, nb.front[1] + 0.12],
    [nl[0] + 0.26, nl[1] - 0.06], [nl[0], nl[1] + 0.07, { c: true, t: 0.7 }], [nl[0] - 0.3, nl[1] - 0.04], [nb.back[0] - 0.03, nb.back[1] + 0.17]])),
    { skin: { parent: 'chest', child: 'neck', zone: 0.35 } }));
  // lilac top: shoulders → hips under the cardigan; neckline scoop on top; bust on the far side
  const bu = X.bust, ub = X.underBust, sF = X.shoulderTop.far, sN = X.shoulderTop.near;
  out.push(part('top', 'spineUpper', 35, C.top, ensureCW(loop([
    [sN[0] + 0.12, sN[1] + 0.04], [nl[0] - 0.26, nl[1] - 0.16], [nl[0] - 0.13, nl[1] - 0.03], [nl[0], nl[1] + 0.005],
    [nl[0] + 0.15, nl[1] - 0.06], [nl[0] + 0.3, nl[1] - 0.18], [sF[0] - 0.1, sF[1] + 0.04], [bu[0] - 0.04, bu[1] - 0.2],
    [bu[0] + 0.01, bu[1]], [ub[0] - 0.02, ub[1] + 0.01], [ub[0] - 0.15, ub[1] + 0.5], [0.5, -3.02],
    [0.2, -3.06], [-0.62, -3.02], [-0.7, -3.4], [-0.66, -4.25]]))));
  out.push(part('top.underbust', 'spineUpper', 36, C.topShade, taper([[ub[0] - 0.36, ub[1] + 0.02], [ub[0] - 0.2, ub[1] + 0.035], [ub[0] - 0.08, ub[1] + 0.005]], [0.003, 0.02, 0.003])));
  // belly: an egg (fuller lower curve), rising from the pubic line; 4×4 lattice from pose.lattice.belly
  const bc = bellyCentre(X), ap = X.belly.apex, bt = X.belly.bottom;
  const eggG = egg(bc, { rx: ap[0] - bc[0], rxl: 0.43, ryt: 0.53, ryb: bt[1] - bc[1] + 0.02, rot: -8 });
  out.push(part('belly', 'belly', 38, C.top, ffd(eggG, bellyBox(X), pose.lattice?.belly)));
  out.push(part('belly.crease', 'belly', 39, C.topShade, ffd(taper([[ap[0] - 0.01, ap[1] + 0.12], [ap[0] - 0.08, ap[1] + 0.34], [bt[0] + 0.15, bt[1] + 0.015], [bt[0] - 0.08, bt[1] + 0.005]], [0.003, 0.026, 0.028, 0.003]), bellyBox(X), pose.lattice?.belly)));
  // hips block (joggers top, between the legs' tops)
  out.push(part('hips', 'pelvis', 31, C.bottoms, ensureCW(loop([
    [-0.68, -3.2], [0.62, -3.2], [0.7, -2.45], [0.32, -2.27], [0.03, -2.2, { c: true, t: 0.7 }], [-0.3, -2.27], [-0.7, -2.42]]))));
  // cardigan near panel: shoulder → back contour → hem → front edge (open) → collar
  const hn = X.hem.near, hf = X.hem.front;
  out.push(part('cardigan.near', 'spineLower', 70, C.cardigan, ensureCW(loop([
    [nl[0] - 0.3, nl[1] - 0.24], [sN[0], sN[1] + 0.03], [sN[0] - 0.12, sN[1] + 0.35], [hn[0] - 0.12, -3.6],
    [hn[0] - 0.1, hn[1] - 0.3], [hn[0] - 0.04, hn[1] + 0.01, { c: true, t: 0.6 }], [(hn[0] + hf[0]) / 2, hf[1] + 0.035],
    [hf[0], hf[1], { c: true, t: 0.6 }], [hf[0] + 0.04, -3.2], [hf[0] + 0.03, -4.0], [nl[0] - 0.2, nl[1] + 0.02], [nl[0] - 0.22, nl[1] - 0.12]]))));
  out.push(part('cardigan.near.fold', 'spineLower', 71, C.cardiganShade, taper([[-0.44, -4.4], [-0.6, -3.65], [-0.72, -3.0], [-0.74, -2.75]], [0.003, 0.022, 0.018, 0.003])));
  // far panel: hangs down the far side, mostly behind the belly; visible strip between belly and far sleeve
  const hfar = X.hem.far;
  out.push(part('cardigan.far', 'spineLower', 36.5, C.cardigan, ensureCW(loop([
    [nl[0] + 0.14, nl[1] - 0.27], [sF[0] + 0.02, sF[1] + 0.17], [sF[0] + 0.2, sF[1] + 0.25], [hfar[0] + 0.04, -3.4], [hfar[0] + 0.06, hfar[1] - 0.05],
    [hfar[0] - 0.02, hfar[1] + 0.03, { c: true, t: 0.6 }], [hfar[0] - 0.24, hfar[1] + 0.02], [0.55, -3.3], [bu[0] - 0.06, bu[1] - 0.25]]))));
  out.push(part('cardigan.far.fold', 'spineLower', 37, C.cardiganShade, taper([[sF[0] - 0.06, sF[1] + 0.18], [bu[0] + 0.07, bu[1] - 0.05], [ub[0] + 0.08, ub[1] + 0.12], [ub[0] + 0.12, ub[1] + 0.32]], [0.003, 0.018, 0.016, 0.003])));
  return out;
}
