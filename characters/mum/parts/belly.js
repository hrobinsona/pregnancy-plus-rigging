// belly.js — bone: belly (hangs off pelvis). 4x4 Bernstein lattice exposed as pose.lattice.belly[row][col] = [dx,dy] (H units).
//   belly.body 14 · belly.underside 10 · belly.shade.nearHand 6 · belly.shade.farHand 6
import { part, lp, st } from './_util.js';
import { ffd } from '../geom.js';

export const ANCHORS = { 'belly.body': 14, 'belly.underside': 10, 'belly.shade.nearHand': 6, 'belly.shade.farHand': 6 };

export function latticeBox(prop) {
  const xs = prop.belly.body.map((a) => a[0]), ys = prop.belly.body.map((a) => a[1]);
  const pad = 0.05;
  return [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) + pad, Math.max(...ys) + pad];
}

export function build({ P, prop, pose }) {
  const box = latticeBox(prop);
  const off = pose.lattice?.belly || null;
  return [
    part('belly.body', 'belly', 46, P.garment, ffd(lp(prop.belly.body), box, off)),
    part('belly.underside', 'belly', 47, P.garmentShade, ffd(st(prop.belly.underside), box, off)),
    part('belly.shade.nearHand', 'belly', 47, P.garmentShade, ffd(st(prop.belly.shadeNearHand), box, off)),
    part('belly.shade.farHand', 'belly', 47, P.garmentShade, ffd(st(prop.belly.shadeFarHand), box, off)),
  ];
}
