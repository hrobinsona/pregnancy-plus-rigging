// shared helpers for part modules: geometry in bone-local H units, scaled to px by the rig.
import { loop, stroke, ellipse, mapGeom, mulS } from '../geom.js';
import { design } from '../proportions.js';

export const part = (id, bone, z, fill, geom) => ({ id: 'mum.' + id, bone, z, fill, geom });
export const lp = (anchors, k = design.tension) => loop(anchors, k);
export const st = (ln, cap = 'point') => stroke(ln.pts, ln.w, cap);
export const el = (d) => ellipse(d.c, d.rx, d.ry);
export const scaled = (g, s) => (s === 1 ? g : mapGeom(g, (p) => mulS(p, s)));
