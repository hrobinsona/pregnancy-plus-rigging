// hair.js — mum3's hair (bone: head): one cap over the skull with a designed hairline (forehead → temple → behind the
// ear → nape) and a round low bun. Flat, two shapes, as in the master: no strands, no shading.
import { loop, ellipse } from '../../../engine/shapes.js';
import { ensureCW } from '../../../engine/hand.js';

const part = (id, z, fill, geom, extra = {}) => ({ id, bone: 'head', z, fill, geom, ...extra });
export const ANCHORS = { 'hair.cap': 15, 'hair.bun': 4 };

export function build({ P: C, C: char }) {
  const h = char.params.P.hair, out = [];
  // a point on the skull egg at screen angle a (deg: 0 = front, 90 = down, 270 = top)
  const E = (a) => { const t = a * Math.PI / 180, cx = Math.cos(t), sy = Math.sin(t), rx = cx >= 0 ? h.rx : h.rxl, ry = sy >= 0 ? h.ryb : h.ryt;
    const r = 1 / Math.sqrt((cx / rx) ** 2 + (sy / ry) ** 2); return [h.c[0] + cx * r, h.c[1] + sy * r]; };
  const fr = h.front, tp = h.temple, n = h.nape;
  out.push(part('hair.cap', 45, C.hair, ensureCW(loop([
    E(160), E(200), E(235), E(270), E(305), E(338),
    [fr[0], fr[1], { c: true, ai: -80, ao: 190, ti: 0.7, to: 0.8 }],               // hairline meets the forehead: a soft point
    [fr[0] - 0.16, fr[1] - 0.18], [tp[0] + 0.13, tp[1] - 0.17, { t: 1.1 }],   // the hairline arches up over the forehead
    [tp[0], tp[1], { a: 125 }],                                                     // temple: the line turns down toward the ear
    [h.earTop[0] + 0.05, h.earTop[1] + 0.08], [h.earTop[0] + 0.06, h.earTop[1] + 0.24],   // hidden under the ear
    [n[0], n[1], { c: true, ai: 60, ao: 190, ti: 0.6, to: 0.6 }],                  // nape: hair ends in a soft point on the neck
    [n[0] - 0.14, n[1] - 0.06], [E(150)[0] + 0.05, E(150)[1] + 0.12],
  ]))));
  out.push(part('hair.bun', 12, C.hair, ellipse(h.bun, h.bunR * 1.02, h.bunR)));
  return out;
}
