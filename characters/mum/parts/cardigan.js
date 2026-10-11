// cardigan.js — sleeves on the arm bones, panels on the spine. Anchor counts:
//   cardigan.far.sleeve 17 · cardigan.far.fold.1,2,4 4 · cardigan.far.fold.3 (lapel) 6 · cardigan.far.hem 9 · cardigan.far.hemFold 6
//   cardigan.near.panel 19 · cardigan.near.panelFold 6 · cardigan.near.upper 13 · cardigan.near.fold.shoulder 4
//   cardigan.near.fold.seam 6 · cardigan.near.forearm 10 · cardigan.near.cuffRim 6 · cardigan.near.fold.elbow1 4 · cardigan.near.fold.elbow2 4
//   cardigan.far.cuff 6 (fold stroke) · cardigan.near.sleeveShadow 6 · cardigan.near.forearmEdge 6 (corrective, opacity = arm lift)
import { part, lp, st } from './_util.js';

const SH_NEAR = { parent: 'clavicle.near', child: 'upperArm.near', zone: 0.25 };

export const ANCHORS = { 'cardigan.far.sleeve': 17, 'cardigan.far.fold.1': 4, 'cardigan.far.fold.2': 4, 'cardigan.far.fold.3': 6,
  'cardigan.far.fold.4': 4, 'cardigan.far.hem': 9, 'cardigan.far.hemFold': 6, 'cardigan.near.sleeveShadow': 6,
  'cardigan.near.panel': 19, 'cardigan.near.panelFold': 6, 'cardigan.near.upper': 13, 'cardigan.near.fold.shoulder': 4,
  'cardigan.near.fold.seam': 6,  'cardigan.near.forearm': 10, 'cardigan.near.cuffRim': 6, 'cardigan.near.forearmEdge': 6, 'cardigan.far.cuff': 6,  'cardigan.near.fold.elbow1': 4, 'cardigan.near.fold.elbow2': 4 };

const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

export function build({ P, prop, pose }) {
  const c = prop.cardigan;
  // smart-bone driver: how far the near upper arm is lifted (deg, forward = negative)
  const lift = smooth(12, 35, -(pose.bones?.['upperArm.near'] ?? 0));
  return [
    part('cardigan.far.sleeve', 'upperArm.far', 14, P.cardigan, lp(c.farSleeve)),
    ...c.farSleeveFolds.map((f, i) => part('cardigan.far.fold.' + (i + 1), 'upperArm.far', 15, P.cardiganShade, st(f))),
    part('cardigan.far.hem', 'spineLower', 13, P.cardigan, lp(c.farHem)),
    part('cardigan.far.hemFold', 'spineLower', 13.5, P.cardiganShade, st(c.farHemFold)),
    part('cardigan.far.cuff', 'upperArm.far', 49, P.cardiganShade, st(c.farCuff)),   // fold under the forearm's end
    part('cardigan.near.panel', 'spineUpper', 54, P.cardigan, lp(c.nearPanel)),
    part('cardigan.near.panelFold', 'spineUpper', 55, P.cardiganShade, st(c.nearPanelFold)),
    part('cardigan.near.sleeveShadow', 'spineUpper', 55, P.cardiganShade, st(c.nearSleeveShadow)),
    // upper sleeve is skinned across the shoulder: the cap stays on the clavicle while the arm swings
    { ...part('cardigan.near.upper', 'upperArm.near', 56, P.cardigan, lp(c.nearUpper)), skin: SH_NEAR },
    { ...part('cardigan.near.fold.shoulder', 'upperArm.near', 57, P.cardiganShade, st(c.nearUpperFolds[0])), skin: SH_NEAR },
    { ...part('cardigan.near.fold.seam', 'upperArm.near', 57, P.cardiganShade, st(c.nearUpperFolds[1])), skin: SH_NEAR },
    // near forearm + hand draw above the face (z 88+) so the hand can cover the mouth; at rest nothing overlaps
    part('cardigan.near.forearm', 'forearm.near', 88, P.cardigan, lp(c.nearForearm)),
    part('cardigan.near.cuffRim', 'forearm.near', 88.05, P.cardiganShade, st(c.nearCuffRim)),
    { ...part('cardigan.near.forearmEdge', 'forearm.near', 88.1, P.cardiganShade, st(c.nearForearmEdge)), opacity: lift },
    part('cardigan.near.fold.elbow1', 'forearm.near', 89, P.cardiganShade, st(c.nearForearmFolds[0])),
    part('cardigan.near.fold.elbow2', 'forearm.near', 89, P.cardiganShade, st(c.nearForearmFolds[1])),
  ];
}
