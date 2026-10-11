// body.js — neck + décolletage (skinned chest→neck), lilac top (chest), belly (belly bone, 4×4 lattice), hips block
// (pelvis), cardigan panels (spine) with fold lines. Construction points come from joints/landmarks + offsets.
import { loop, taper, egg } from '../../../engine/shapes.js';
import { ffd } from '../../../engine/geom.js';
import { ensureCW } from '../../../engine/hand.js';

const part = (id, bone, z, fill, geom, extra = {}) => ({ id, bone, z, fill, geom, ...extra });
export const ANCHORS = { 'neck': 7, 'top': 16, 'top.underbust': 4, 'belly': 8, 'belly.crease': 6, 'hips': 7,
  'cardigan.near': 13, 'cardigan.near.fold': 6, 'cardigan.far': 9, 'cardigan.far.fold': 6 };

export function bellyBox(X) {
  const c = bellyCentre(X);
  return [c[0] - 0.55, c[1] - 0.6, c[0] + 0.55, c[1] + 0.58];
}
const bellyCentre = (X) => [X.belly.apex[0] - 0.45, X.belly.apex[1] - 0.01];
const APEX_PUSH = 0.08;   // critic B R3: read 8 months, not 6–7 (the bump grows forward; the back of the egg stays)

export function build({ P: C, C: char, pose }) {
  const X = char.params.P, J = char.joints, out = [];
  const nb = X.neck, nl = X.neckline, nbase = nb.base;
  const collarN = [nbase[0] - 0.15, nbase[1] - 0.085], collarF = [nbase[0] + 0.17, nbase[1] - 0.085];   // collars hug the neck
  // neck + V of the chest down to the neckline; skinned so the throat follows the neck while the base stays on the chest
  out.push(part('neck', 'neck', 40, C.skin, ensureCW(loop([
    [nb.back[0] + 0.02, nb.back[1] - 0.08], [nb.front[0] - 0.05, nb.front[1] - 0.09], [nb.front[0] - 0.01, nb.front[1] + 0.12],
    [nl[0] + 0.26, nl[1] - 0.06], [nl[0], nl[1] + 0.07, { c: true, t: 0.7 }], [nl[0] - 0.3, nl[1] - 0.04], [nb.back[0] + 0.0, nb.back[1] + 0.17]])),
    { skin: { parent: 'chest', child: 'neck', zone: 0.35 } }));
  // lilac top: shoulders → hips under the cardigan; neckline scoop on top; bust on the far side
  const bu = X.bust, ub = X.underBust, sF = X.shoulderTop.far, sN = X.shoulderTop.near;
  out.push(part('top', 'chest', 35, C.top, ensureCW(loop([
    [sN[0] + 0.12, sN[1] + 0.08], [nl[0] - 0.26, nl[1] - 0.16], [nl[0] - 0.13, nl[1] - 0.03], [nl[0], nl[1] + 0.005],
    [nl[0] + 0.15, nl[1] - 0.06], [nl[0] + 0.28, nl[1] - 0.15], [sF[0] - 0.06, sF[1] + 0.16], [bu[0] - 0.05, bu[1] - 0.18],
    [bu[0] + 0.01, bu[1]], [ub[0] - 0.06, ub[1] + 0.02], [ub[0] - 0.15, ub[1] + 0.5], [0.45, -3.25],
    [0.15, -3.16], [-0.62, -3.0], [-0.7, -3.4], [-0.66, -4.25]])), { skin: { chain: ['spineLower', 'spineUpper', 'chest'], zone: 0.3 } }));
  out.push(part('top.underbust', 'chest', 36, C.topShade, taper([[-0.17, ub[1] + 0.005], [-0.01, ub[1] + 0.03], [0.17, ub[1] - 0.005]], [0.003, 0.02, 0.003])));   // under the near breast
  // belly: an egg (fuller lower curve), rising from the pubic line; 4×4 lattice from pose.lattice.belly
  const bc = bellyCentre(X), ap = X.belly.apex, bt = X.belly.bottom;
  const eggG = egg(bc, { rx: ap[0] - bc[0] + APEX_PUSH, rxl: 0.43, ryt: 0.54, ryb: bt[1] - bc[1] + 0.03, rot: -8 });
  out.push(part('belly', 'belly', 38, C.top, ffd(eggG, bellyBox(X), pose.lattice?.belly)));
  // form shadow on the bump's lower-front (4–5 o'clock), ~0.10 H at its thickest: heavier lower curve → egg, and value
  // separation from the far cardigan / sleeve
  out.push(part('belly.crease', 'belly', 39, C.topShade, ffd(ensureCW(loop([
    [ap[0] + APEX_PUSH - 0.03, ap[1] + 0.02], [ap[0] + APEX_PUSH - 0.06, ap[1] + 0.22], [bt[0] + 0.24, bt[1] - 0.03], [bt[0] - 0.08, bt[1] - 0.01, { c: true, t: 0.5 }],
    [bt[0] + 0.18, bt[1] - 0.1], [ap[0] + APEX_PUSH - 0.16, ap[1] + 0.17]])), bellyBox(X), pose.lattice?.belly)));
  // hips block (joggers top, between the legs' tops)
  out.push(part('hips', 'pelvis', 31, C.bottoms, ensureCW(loop([
    [-0.68, -3.2], [0.62, -3.2], [0.7, -2.45], [0.32, -2.27], [0.03, -2.2, { c: true, t: 0.7 }], [-0.3, -2.27], [-0.7, -2.42]]))));
  // cardigan near panel: shoulder → back contour → hem → front edge (open) → collar
  const hn = X.hem.near, hf = X.hem.front;
  out.push(part('cardigan.near', 'spineLower', 70, C.cardigan, ensureCW(loop([
    [collarN[0], collarN[1]], X.shoulderLine.near[0], X.shoulderLine.near[1], [hn[0] - 0.08, -4.15],
    [hn[0] - 0.0, -3.45], [hn[0] - 0.09, hn[1] - 0.32], [hn[0] - 0.04, hn[1] + 0.01, { c: true, t: 0.6 }], [(hn[0] + hf[0]) / 2, hf[1] + 0.035],
    [hf[0], hf[1], { c: true, t: 0.6 }], [hf[0] + 0.04, -3.2], [hf[0] + 0.03, -4.0], [nl[0] - 0.2, nl[1] + 0.02], [collarN[0] + 0.05, collarN[1] + 0.12]])),
    { skin: { chain: ['pelvis', 'spineLower', 'spineUpper', 'chest'], zone: 0.3 } }));
  out.push(part('cardigan.near.fold', 'spineLower', 71, C.cardiganShade, taper([[-0.42, -4.35], [-0.56, -3.7], [-0.66, -3.05], [-0.7, -2.8]], [0.003, 0.02, 0.016, 0.003]), { skin: { chain: ['pelvis', 'spineLower', 'spineUpper', 'chest'], zone: 0.3 } }));
  // far panel: hangs down the far side, mostly behind the belly; visible strip between belly and far sleeve
  const hfar = X.hem.far;
  out.push(part('cardigan.far', 'spineLower', 36.5, C.cardigan, ensureCW(loop([
    [collarF[0], collarF[1]], X.shoulderLine.far[0], X.shoulderLine.far[1], [hfar[0] + 0.04, -3.4], [hfar[0] + 0.06, hfar[1] - 0.05],
    [hfar[0] - 0.02, hfar[1] + 0.03, { c: true, t: 0.6 }], [hfar[0] - 0.24, hfar[1] + 0.02], [0.6, -3.3], [bu[0] + 0.05, bu[1] - 0.12]])),
    { skin: { chain: ['pelvis', 'spineLower', 'spineUpper', 'chest'], zone: 0.3 } }));
  out.push(part('cardigan.far.fold', 'spineLower', 37, C.cardiganShade, taper([[sF[0] + 0.02, sF[1] + 0.22], [bu[0] + 0.1, bu[1] - 0.02], [ub[0] + 0.11, ub[1] + 0.14], [ub[0] + 0.14, ub[1] + 0.34]], [0.003, 0.018, 0.016, 0.003]), { skin: { chain: ['pelvis', 'spineLower', 'spineUpper', 'chest'], zone: 0.3 } }));
  return out;
}
