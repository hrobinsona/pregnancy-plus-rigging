// hair.js — mum3's hair in ¾ VIEW (bone: head): one cap over the skull (an egg, extents measured row by row) with the
// measured hairline (near temple → across the forehead → the parting's peak → the far temple), the far side's lock down
// the far cheek to the eye line, the near side down behind the ear to the nape, and the round low bun behind it.
import { loop, ellipse } from '../../../engine/shapes.js';
import { ensureCW } from '../../../engine/hand.js';

const part = (id, z, fill, geom, extra = {}) => ({ id, bone: 'head', z, fill, geom, ...extra });
export const ANCHORS = { 'hair.cap': 17, 'hair.bun': 4 };

export function build({ P: C, C: char }) {
  const h = char.params.P.hair, l = h.line, out = [];
  // a point on the skull egg at screen angle a (deg: 0 = right, 90 = down, 270 = top)
  const E = (a) => { const t = a * Math.PI / 180, cx = Math.cos(t), sy = Math.sin(t), rx = cx >= 0 ? h.rx : h.rxl, ry = sy >= 0 ? h.ryb : h.ryt;
    const r = 1 / Math.sqrt((cx / rx) ** 2 + (sy / ry) ** 2); return [h.c[0] + cx * r, h.c[1] + sy * r]; };
  const fl = h.farLock;
  out.push(part('hair.cap', 45, C.hair, ensureCW(loop([
    E(165), E(200), E(235), E(270), E(305), E(335),
    [E(2)[0] - 0.005, E(2)[1], { a: 95 }],                                            // the far lock's outer edge, down the far side
    [fl[0], fl[1], { c: true, ai: 70, ao: -80, ti: 0.7, to: 0.6 }],                  // the lock ends in a soft point at the eye line
    [l.far[0] + 0.01, l.far[1] + 0.06, { a: -110 }],                                 // its inner edge rises to the far temple
    [l.peak[0], l.peak[1], { a: 185 }],                                              // the parting's peak
    [l.mid[0], l.mid[1], { a: 155 }],                                                // the hairline sweeps down across the forehead
    [l.temple[0], l.temple[1], { a: 125 }],                                          // the near temple: the line turns down to the ear
    [h.earTop[0] + 0.05, h.earTop[1] + 0.06], [h.earTop[0] + 0.04, h.earTop[1] + 0.26],   // hidden under the ear
    [h.nape[0], h.nape[1], { c: true, ai: 70, ao: 190, ti: 0.6, to: 0.6 }],          // nape: a soft point on the neck
    [h.nape[0] - 0.14, h.nape[1] - 0.08], [E(150)[0] + 0.05, E(150)[1] + 0.1],
  ]))));
  out.push(part('hair.bun', 12, C.hair, ellipse(h.bun, h.bunR * 1.02, h.bunR)));
  return out;
}
