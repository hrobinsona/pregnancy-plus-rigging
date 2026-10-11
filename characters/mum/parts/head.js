// head.js — bone: head. Face skin, ear, features. Anchor counts (fixed across every expression blend):
//   head.neckShadow 8 · head.face 14 · head.ear 7 · head.earInner 4
//   face.brow.* 8 (round caps) · face.eye.* 4 · face.lid.* 10 · face.nose 12 · face.cheek.* 4 · face.mouth 12 (round caps)
//
// Face rig: pose.face = { lid: {open|squeeze|soft: w}, brow: {neutral|worried|relaxed: w},
//                         mouth: {smile|neutral|queasy|exhale: w}, cheek: {blush|sick: w} }.
// Weights are normalised per channel; strokes blend point-to-point (same point counts). Legacy pose.expression still works.
import { part, lp, st, el, scaled } from './_util.js';
import { mapGeom } from '../geom.js';

export const ANCHORS = { 'head.neckShadow': 8, 'head.face': 14, 'head.ear': 7, 'head.earInner': 4,
  'face.brow.near': 8, 'face.brow.far': 8, 'face.eye.near': 4, 'face.eye.far': 4, 'face.lid.near': 10, 'face.lid.far': 10,
  'face.nose': 12, 'face.cheek.near': 4, 'face.cheek.far': 4, 'face.mouth': 12 };

const norm = (w, fallback) => {
  const e = Object.entries(w || {}).filter(([, v]) => v > 0);
  const s = e.reduce((a, [, v]) => a + v, 0);
  return s > 0 ? e.map(([k, v]) => [k, v / s]) : [[fallback, 1]];
};
const blendLine = (targets, weights) => {
  const [k0] = weights[0];
  const n = targets[k0].pts.length;
  const pts = [], w = [];
  for (let i = 0; i < n; i++) {
    let x = 0, y = 0, ww = 0;
    for (const [k, a] of weights) { x += a * targets[k].pts[i][0]; y += a * targets[k].pts[i][1]; ww += a * targets[k].w[i]; }
    pts.push([x, y]); w.push(ww);
  }
  return { pts, w };
};
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const mixHex = (a, b, t) => '#' + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t).toString(16).padStart(2, '0')).join('');

export function build({ P, prop, pose }) {
  const h = prop.head, s = prop.design.headScale, F = prop.faceShapes;
  const sc = (g) => scaled(g, s);
  const face = pose.face || {};
  const mouthW = face.mouth ? norm(face.mouth, 'smile') : [[pose.expression === 'neutral' ? 'neutral' : 'smile', 1]];
  const lidW = norm(face.lid, 'open'), browW = norm(face.brow, 'neutral'), cheekW = norm(face.cheek, 'blush');
  const open = lidW.reduce((a, [k, v]) => a + (k === 'open' ? v : 0), 0);
  const sick = cheekW.reduce((a, [k, v]) => a + (k === 'sick' ? v : 0), 0);
  const lid = (side) => blendLine(Object.fromEntries(Object.entries(F.lid).map(([k, v]) => [k, v[side]])), lidW);
  const brow = (side) => blendLine(Object.fromEntries(Object.entries(F.brow).map(([k, v]) => [k, v[side]])), browW);
  const mouth = blendLine(F.mouth, mouthW);
  // iris collapses toward the closed-lid line as the lid closes (same 4 anchors)
  const eye = (side) => {
    const d = h.eyes[side], g = el(d);
    if (open > 0.999) return g;
    const yc = F.eyeCloseY[side];
    const k = Math.max(0.04, open);
    return mapGeom(g, (p) => [p[0], yc + (p[1] - d.c[1]) * k + (d.c[1] - yc) * open]);
  };
  const cheekFill = mixHex(P.cheek, P.sick, sick);
  const ex = pose.face?.extra || {};
  return [
    part('head.neckShadow', 'head', 70, P.skinShade, sc(lp(h.neckShadow))),
    part('head.face', 'head', 71, P.skin, sc(lp(h.face))),
    part('face.cheek.near', 'head', 72, cheekFill, sc(el(h.cheeks.near))),
    part('face.cheek.far', 'head', 72, cheekFill, sc(el(h.cheeks.far))),
    part('face.nose', 'head', 73, P.skinLine, sc(st(h.nose, 'round'))),
    part('face.eye.near', 'head', 74, P.line, sc(eye('near'))),
    part('face.eye.far', 'head', 74, P.line, sc(eye('far'))),
    part('face.lid.near', 'head', 74.5, P.line, sc(st(lid('near'), 'round'))),
    part('face.lid.far', 'head', 74.5, P.line, sc(st(lid('far'), 'round'))),
    part('face.brow.near', 'head', 75, P.hair, sc(st(brow('near'), 'round'))),
    part('face.brow.far', 'head', 75, P.hair, sc(st(brow('far'), 'round'))),
    part('face.mouth', 'head', 76, P.mouth, sc(st(mouth, 'round'))),
    part('head.ear', 'head', 82, P.skin, sc(lp(h.ear))),
    part('head.earInner', 'head', 83, P.skinShade, sc(st(h.earInner))),
  ];
}
