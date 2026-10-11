// head.js — bone: head. Face skin, ear, features. Anchor counts (fixed across expressions):
//   head.neckShadow 8 · head.face 14 · head.ear 7 · head.earInner 4
//   face.brow.* 8 (round caps) · face.eye.* 4 · face.lid.* 10 · face.nose 12 · face.cheek.* 4 · face.mouth 12 (round caps)
import { part, lp, st, el, scaled } from './_util.js';
import { mapGeom } from '../geom.js';

export const ANCHORS = { 'head.neckShadow': 8, 'head.face': 14, 'head.ear': 7, 'head.earInner': 4,
  'face.brow.near': 8, 'face.brow.far': 8, 'face.eye.near': 4, 'face.eye.far': 4, 'face.lid.near': 10, 'face.lid.far': 10,
  'face.nose': 12, 'face.cheek.near': 4, 'face.cheek.far': 4, 'face.mouth': 12 };

export function build({ P, prop, pose }) {
  const h = prop.head, s = prop.design.headScale;
  const ex = prop.expressions[pose.expression || 'soft-smile'];
  const sc = (g) => scaled(g, s);
  // eye squash about the eye centre (expressions like eyes-closed-content reuse the same 4 anchors)
  const eye = (d) => {
    const g = el(d);
    return ex.eyeSquash === 1 ? g : mapGeom(g, (p) => [p[0], d.c[1] + (p[1] - d.c[1]) * ex.eyeSquash]);
  };
  return [
    part('head.neckShadow', 'head', 70, P.skinShade, sc(lp(h.neckShadow))),
    part('head.face', 'head', 71, P.skin, sc(lp(h.face))),
    part('face.cheek.near', 'head', 72, P.cheek, sc(el(h.cheeks.near))),
    part('face.cheek.far', 'head', 72, P.cheek, sc(el(h.cheeks.far))),
    part('face.nose', 'head', 73, P.skinLine, sc(st(h.nose, 'round'))),
    part('face.eye.near', 'head', 74, P.line, sc(eye(h.eyes.near))),
    part('face.eye.far', 'head', 74, P.line, sc(eye(h.eyes.far))),
    part('face.lid.near', 'head', 74.5, P.line, sc(st(h.lids.near, 'round'))),
    part('face.lid.far', 'head', 74.5, P.line, sc(st(h.lids.far, 'round'))),
    part('face.brow.near', 'head', 75, P.hair, sc(st(h.brows.near, 'round'))),
    part('face.brow.far', 'head', 75, P.hair, sc(st(h.brows.far, 'round'))),
    part('face.mouth', 'head', 76, P.mouth, sc(st(ex.mouth, 'round'))),
    part('head.ear', 'head', 82, P.skin, sc(lp(h.ear))),
    part('head.earInner', 'head', 83, P.skinShade, sc(st(h.earInner))),
  ];
}
