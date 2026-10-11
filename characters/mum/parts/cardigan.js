// cardigan.js — sleeves on the arm bones, panels on the spine. Anchor counts:
//   cardigan.far.sleeve 17 · cardigan.far.fold.1,2,4 4 · cardigan.far.fold.3 (lapel) 6 · cardigan.far.hem 9 · cardigan.far.hemFold 6
//   cardigan.near.panel 19 · cardigan.near.panelFold 6 · cardigan.near.upper 13 · cardigan.near.fold.shoulder 4
//   cardigan.near.fold.seam 6 · cardigan.near.forearm 10 · cardigan.near.cuffRim 6 · cardigan.near.fold.elbow1 4 · cardigan.near.fold.elbow2 4
//   cardigan.far.cuff 6 (fold stroke) · cardigan.near.sleeveShadow 6
import { part, lp, st } from './_util.js';

export const ANCHORS = { 'cardigan.far.sleeve': 17, 'cardigan.far.fold.1': 4, 'cardigan.far.fold.2': 4, 'cardigan.far.fold.3': 6,
  'cardigan.far.fold.4': 4, 'cardigan.far.hem': 9, 'cardigan.far.hemFold': 6, 'cardigan.near.sleeveShadow': 6,
  'cardigan.near.panel': 19, 'cardigan.near.panelFold': 6, 'cardigan.near.upper': 13, 'cardigan.near.fold.shoulder': 4,
  'cardigan.near.fold.seam': 6,  'cardigan.near.forearm': 10, 'cardigan.near.cuffRim': 6, 'cardigan.far.cuff': 6,  'cardigan.near.fold.elbow1': 4, 'cardigan.near.fold.elbow2': 4 };

export function build({ P, prop }) {
  const c = prop.cardigan;
  return [
    part('cardigan.far.sleeve', 'upperArm.far', 14, P.cardigan, lp(c.farSleeve)),
    ...c.farSleeveFolds.map((f, i) => part('cardigan.far.fold.' + (i + 1), 'upperArm.far', 15, P.cardiganShade, st(f))),
    part('cardigan.far.hem', 'spineLower', 13, P.cardigan, lp(c.farHem)),
    part('cardigan.far.hemFold', 'spineLower', 13.5, P.cardiganShade, st(c.farHemFold)),
    part('cardigan.far.cuff', 'upperArm.far', 49, P.cardiganShade, st(c.farCuff)),   // fold under the forearm's end
    part('cardigan.near.panel', 'spineUpper', 54, P.cardigan, lp(c.nearPanel)),
    part('cardigan.near.panelFold', 'spineUpper', 55, P.cardiganShade, st(c.nearPanelFold)),
    part('cardigan.near.sleeveShadow', 'spineUpper', 55, P.cardiganShade, st(c.nearSleeveShadow)),
    part('cardigan.near.upper', 'upperArm.near', 56, P.cardigan, lp(c.nearUpper)),
    part('cardigan.near.fold.shoulder', 'upperArm.near', 57, P.cardiganShade, st(c.nearUpperFolds[0])),
    part('cardigan.near.fold.seam', 'upperArm.near', 57, P.cardiganShade, st(c.nearUpperFolds[1])),
    part('cardigan.near.forearm', 'forearm.near', 58, P.cardigan, lp(c.nearForearm)),
    part('cardigan.near.cuffRim', 'forearm.near', 58.05, P.cardiganShade, st(c.nearCuffRim)),
    part('cardigan.near.fold.elbow1', 'forearm.near', 59, P.cardiganShade, st(c.nearForearmFolds[0])),
    part('cardigan.near.fold.elbow2', 'forearm.near', 59, P.cardiganShade, st(c.nearForearmFolds[1])),
  ];
}
