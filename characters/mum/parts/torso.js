// torso.js — neck (bone neck), chest skin (chest), tank top (spineUpper). Anchor counts:
//   neck 10 · chest.skin 10 · chest.cleavage 4 · top.body 20 · top.underBust.near 6 · top.underBust.far 8 · top.lapCrease 10
import { part, lp, st } from './_util.js';

export const ANCHORS = { neck: 10, 'chest.skin': 10, 'chest.cleavage': 4, 'top.body': 20,
  'top.underBust.near': 6, 'top.underBust.far': 8, 'top.lapCrease': 10 };

export function build({ P, prop }) {
  const t = prop.top;
  return [
    part('neck', 'neck', 40, P.skin, lp(prop.neck.neck)),
    part('chest.skin', 'chest', 41, P.skin, lp(prop.chest.skin)),
    part('chest.cleavage', 'chest', 42, P.skinShade, st(prop.chest.cleavage)),
    part('top.body', 'spineUpper', 44, P.garment, lp(t.body)),
    part('top.lapCrease', 'spineUpper', 45, P.garmentShade, st(t.lapCrease)),
    part('top.underBust.near', 'spineUpper', 48, P.garmentShade, st(t.underBustNear)),
    part('top.underBust.far', 'spineUpper', 48, P.garmentShade, st(t.underBustFar)),
  ];
}
