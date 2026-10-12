// legs.js — mum3's bare legs (one skin tube hip → knee → ankle each, skinned across the knee; the thighs disappear
// under the skirt), the foot's top above the shoe, and ballet flats (skinned foot → toe at the ball). Far leg behind the
// near one, one step darker, as in the master.
import { tube, loop } from '../../../engine/shapes.js';
import { ensureCW } from '../../../engine/hand.js';
import { add, lerp } from '../../../engine/geom.js';

export const ANCHORS = { 'leg.near': 16, 'leg.far': 16, 'foot.near': 7, 'foot.far': 7, 'shoe.near': 8, 'shoe.far': 8 };

export function build({ P: C, C: char }) {
  const J = char.joints, X = char.params.P, out = [];
  for (const side of ['far', 'near']) {
    const S = side === 'near' ? 'Near' : 'Far', z = side === 'near' ? 20 : 16, fill = side === 'near' ? C.skin : C.skinFar, w = X.leg[side];
    const hip = J['hip' + S], knee = J['knee' + S], ank = J['ankle' + S];
    // axis down the leg: r = the tube's +normal (screen right on a downward axis) = the leg's FRONT; l = its back (calf)
    const axis = [add(hip, [0, -0.15]), lerp(hip, knee, 0.5), knee, lerp(knee, ank, 0.23), lerp(knee, ank, 0.5), lerp(knee, ank, 0.77), ank];
    const thigh = side === 'near' ? { front: 0.21, back: 0.22 } : { front: 0.22, back: 0.2 };
    const ws = [thigh, thigh, { front: w.knee.front * 1.05, back: w.knee.back * 0.92 }, w.calf, { front: (w.calf.front + w.low.front) / 2, back: (w.calf.back + w.low.back) / 2 }, w.low, { front: w.ankle.front, back: w.ankle.back * 0.95 }]
      .map((v) => ({ r: v.front, l: v.back }));
    out.push({ id: `leg.${side}`, bone: `shin.${side}`, z, fill, geom: ensureCW(tube(axis, ws, { capK: 0.6 })),
      skin: { parent: `thigh.${side}`, child: `shin.${side}`, zone: 0.25 } });
    // the foot's top, visible above the low-cut shoe: ankle → instep → toes (the rest inside the shoe)
    const sh = X.shoe[side], h = sh.heel, t = sh.toe;
    out.push({ id: `foot.${side}`, bone: `toe.${side}`, z: z + 0.3, fill, geom: ensureCW(loop([
      [ank[0] - 0.13, ank[1] - 0.05], [ank[0] + 0.07, ank[1] - 0.05, { a: 82 }], [ank[0] + 0.2, sh.top + 0.02, { a: 45 }], [h[0] + 0.75 * (t[0] - h[0]), sh.top + 0.17, { a: 20 }],   // the instep: steep below the ankle, flattening toward the toes
      [t[0] - 0.14, sh.sole - 0.06], [h[0] + 0.2, sh.sole - 0.1], [h[0] + 0.08, h[1] - 0.04]])),
      skin: { parent: `foot.${side}`, child: `toe.${side}`, zone: 0.35 } });
    // ballet flat: heel counter → the low opening (steep at the heel, flattening to the vamp) → toe box → tip → a sole
    // that rises toward the heel (the master's flats rock up at the back) → round heel
    const L = t[0] - h[0];
    out.push({ id: `shoe.${side}`, bone: `toe.${side}`, z: z + 0.6, fill: C.shoe, geom: ensureCW(loop([
      [h[0] + 0.035, sh.top, { c: true, ai: 250, ao: 40, ti: 0.5, to: 0.7 }],
      [h[0] + 0.4 * L, sh.top + 0.125, { a: 14 }],
      [h[0] + 0.75 * L, sh.top + 0.165, { c: true, ai: 190, ao: 5, ti: 0.7, to: 0.6 }],   // the opening's front end meets the toe box
      [(h[0] + 0.75 * L + t[0]) / 2, (sh.top + 0.165 + t[1]) / 2 - 0.03, { a: 22 }],   // the toe box's top: below the line vamp → tip (no hump)
      [t[0], t[1], { a: 90, t: 0.9 }],
      [t[0] - 0.16, sh.sole, { a: 180 }],
      [h[0] + 0.2, sh.sole - 0.045, { a: 190 }],
      [h[0] + 0.02, h[1] + 0.1, { a: 245 }]])),
      skin: { parent: `foot.${side}`, child: `toe.${side}`, zone: 0.35 } });
  }
  return out;
}
