// legs.js — mum3's bare legs, drawn in POSED space (engine/leg.js): one outline per leg from the hip (hidden under the
// skirt) down the thigh, round the knee, down the shin into the instep and back up the Achilles, calf and hamstring. The
// knee folds like a real one (a broad fillet in front, the calf pressing on the hamstring behind, a crease when deep),
// so a kneeling, sitting or all-fours leg reads as a leg, not two tubes on a pin (Harry 2026-10-14: "legs on hinges").
// Straight, it is the old tube (measured shin widths, the master's thigh below the hem). Ballet flats ride the foot and
// toe bones on top. Far leg behind the near one, one step darker, as in the master.
import { loop } from '../../../engine/shapes.js';
import { ensureCW } from '../../../engine/hand.js';
import { legOutline, carryPt, carryBlend } from '../../../engine/leg.js';

export const ANCHORS = { 'leg.near': 27, 'leg.far': 27, 'leg.near.crease': 4, 'leg.far.crease': 4, 'shoe.near': 8, 'shoe.far': 8 };

/** one leg's posed outline and its samplers (engine/leg.js), for the drawing here and the skirt's supports (drape.js) */
export function legFor({ C: char, st, rig }, side) {
  const J = char.joints, X = char.params.P, BONE = rig.BONE, S = side === 'near' ? 'Near' : 'Far';
  const ank = J['ankle' + S], sh = X.shoe[side], h = sh.heel, t = sh.toe, L = t[0] - h[0], LP = X.legProfile[side];
  const onFoot = (p) => carryPt(st, J, BONE, `foot.${side}`, p), onToe = (p) => carryPt(st, J, BONE, `toe.${side}`, p);
  // the foot, carried by its bones: the instep (measured, P.instep) into the shoe's opening; inside the shoe the toe
  // box, the sole and the heel; the instep and the back of the ankle blend between the shin and the foot (they bend)
  const back = [ank[0] - LP.shin.at(1).back * 0.92, ank[1] - 0.02];
  const foot = {
    instep: [...X.instep[side].map(([dx, dy], i) => carryBlend(st, J, BONE, `shin.${side}`, `foot.${side}`, [ank[0] + dx, ank[1] + dy], [0.35, 0.65, 0.9][i])), onFoot([h[0] + 0.75 * L + 0.01, sh.top + 0.177])],
    shoe: [onToe([t[0] - 0.14, sh.sole - 0.06]), onFoot([h[0] + 0.2, sh.sole - 0.1])],
    heel: onFoot([h[0] + 0.08, h[1] - 0.04]),
    achilles: carryBlend(st, J, BONE, `shin.${side}`, `foot.${side}`, back, 0.5),
  };
  return legOutline({ hip: st[`thigh.${side}`].pos, knee: st[`shin.${side}`].pos, ankle: st[`foot.${side}`].pos, thigh: LP.thigh.P, shin: LP.shin.P, foot, kneeRound: X.knee.round, top: 0.18 });
}

export function build(ctx) {
  const { P: C, C: char } = ctx, X = char.params.P, out = [];
  for (const side of ['far', 'near']) {
    const z = side === 'near' ? 20 : 16, fill = side === 'near' ? C.skin : C.skinFar;
    const sh = X.shoe[side], h = sh.heel, t = sh.toe, L = t[0] - h[0];
    const lg = legFor(ctx, side);
    out.push({ id: `leg.${side}`, bone: `shin.${side}`, z, fill, world: true, geom: ensureCW(lg.geom) });
    out.push({ id: `leg.${side}.crease`, bone: `shin.${side}`, z: z + 0.1, fill: C.skinLine, world: true, geom: lg.crease, opacity: lg.crease.k * (side === 'near' ? 0.9 : 0.6) });
    // ballet flat: heel counter → the low opening (steep at the heel, flattening to the vamp) → toe box → tip → a sole
    // that rises toward the heel (the master's flats rock up at the back) → round heel
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
