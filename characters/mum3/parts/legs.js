// legs.js — mum3's bare legs, drawn in POSED space (engine/leg.js): one outline per leg from the hip (hidden under the
// skirt) down the thigh, round the knee, down the shin into the instep and back up the Achilles, calf and hamstring. The
// knee folds like a real one (a broad fillet in front, the calf pressing on the hamstring behind, a crease when deep),
// so a kneeling, sitting or all-fours leg reads as a leg, not two tubes on a pin (Harry 2026-10-14: "legs on hinges").
// Straight, it is the old tube (measured shin widths, the master's thigh below the hem). Ballet flats ride the foot and
// toe bones on top. Far leg behind the near one, one step darker, as in the master.
import { loop } from '../../../engine/shapes.js';
import { ensureCW } from '../../../engine/hand.js';
import { legOutline, carryPt, carryBlend } from '../../../engine/leg.js';

export const ANCHORS = { 'leg.near': 27, 'leg.far': 27, 'leg.near.crease': 4, 'leg.far.crease': 4, 'shoe.near': 15, 'shoe.far': 15 };

/** one leg's posed outline and its samplers (engine/leg.js), for the drawing here and the skirt's supports (drape.js) */
// the back of the ankle just above the shoe (rest H), and where the leg's back line (it → the heel inside the shoe) crosses
// the shoe's top: the heel counter sits ON that line
const achillesRest = (char, side) => { const ank = char.joints[side === 'near' ? 'ankleNear' : 'ankleFar'], LP = char.params.P.legProfile[side]; return [ank[0] - LP.shin.at(1).back * 0.92, ank[1] - 0.02]; };
const heelRest = (sh) => [sh.heel[0] + 0.08, sh.heel[1] - 0.04];
const counterX = (char, side) => { const sh = char.params.P.shoe[side], a = achillesRest(char, side), b = heelRest(sh), u = (sh.top - a[1]) / (b[1] - a[1]); return a[0] + u * (b[0] - a[0]); };

export function legFor({ C: char, st, rig }, side) {
  const J = char.joints, X = char.params.P, BONE = rig.BONE, S = side === 'near' ? 'Near' : 'Far';
  const ank = J['ankle' + S], sh = X.shoe[side], h = sh.heel, t = sh.toe, L = t[0] - h[0], LP = X.legProfile[side];
  const onFoot = (p) => carryPt(st, J, BONE, `foot.${side}`, p), onToe = (p) => carryPt(st, J, BONE, `toe.${side}`, p);
  // the foot, carried by its bones: the instep (measured, P.instep) into the shoe's opening; inside the shoe the toe
  // box, the sole and the heel; the instep and the back of the ankle blend between the shin and the foot (they bend)
  const back = achillesRest(char, side);
  const foot = {
    instep: [...X.instep[side].map(([dx, dy], i) => carryBlend(st, J, BONE, `shin.${side}`, `foot.${side}`, [ank[0] + dx, ank[1] + dy], [0.35, 0.65, 0.9][i])), onFoot([h[0] + 0.75 * L + 0.01, sh.top + 0.177])],
    shoe: [onToe([t[0] - 0.14, sh.sole - 0.06]), onFoot([h[0] + 0.2, sh.sole - 0.1])],
    heel: onFoot(heelRest(sh)),
    achilles: carryBlend(st, J, BONE, `shin.${side}`, `foot.${side}`, back, 0.5),
  };
  // FLESH HANGS: a thigh held level (sitting, squatting, bending) is deeper than a hanging one, its underside sagging and
  // spreading (on a seat, squashed): every sitting and squatting still draws the thigh ≈ 1.3× the standing one's depth
  // (side-on round 1: "the near thigh a thin, straight-sided tube… spindly under that torso and bump"). By how far the
  // thigh points from straight down (30° → 80°): the underside (back) up to +30 %, the top +10 %; a hanging thigh
  // (standing, kneeling, on all fours) keeps the drawn one.
  const H = st[`thigh.${side}`].pos, K = st[`shin.${side}`].pos, dv = [K[0] - H[0], K[1] - H[1]];
  const a = Math.acos(Math.max(-1, Math.min(1, dv[1] / Math.hypot(...dv)))) * 180 / Math.PI, s1 = Math.max(0, Math.min(1, (a - 30) / 50)), k = s1 * s1 * (3 - 2 * s1);
  const thigh = LP.thigh.P.map(([f, fr, bk]) => [f, fr * (1 + 0.1 * k * (1 - f * 0.6)), bk * (1 + 0.3 * k * (1 - f * 0.5))]);
  return legOutline({ hip: H, knee: K, ankle: st[`foot.${side}`].pos, thigh, shin: LP.shin.P, foot, kneeRound: X.knee.round, top: 0.18 });
}

export function build(ctx) {
  const { P: C, C: char } = ctx, X = char.params.P, out = [];
  for (const side of ['far', 'near']) {
    const z = side === 'near' ? 20 : 16, fill = side === 'near' ? C.skin : C.skinFar;
    const sh = X.shoe[side], h = sh.heel, t = sh.toe, L = t[0] - h[0];
    // a POINTED foot (kneeling, on all fours: 55–70° from the shin) draws the shoe's heel slimmer, its back tucked in by up
    // to 0.045 H: the round heel stood up past the leg's line as "a dark cap", round 6; the stills taper it into the calf
    const fr = Math.max(0, Math.min(1, ((ctx.st[`foot.${side}`].rot - ctx.st[`shin.${side}`].rot) - 25) / 35)), hk = 0.045 * fr * fr * (3 - 2 * fr);
    const lg = legFor(ctx, side);
    out.push({ id: `leg.${side}`, bone: `shin.${side}`, z, fill, world: true, geom: ensureCW(lg.geom) });
    out.push({ id: `leg.${side}.crease`, bone: `shin.${side}`, z: z + 0.1, fill: C.skinLine, world: true, geom: lg.crease, opacity: lg.crease.k * (side === 'near' ? 0.9 : 0.6) });
    // ballet flat, traced from the master's (characters/mum3/ref/master.png, its dark outline in H): the heel counter →
    // the OPENING, a deep scoop that falls steeply from the heel and runs low along the foot (0.22 H below the counter's
    // top at mid-foot) → the vamp → a slim toe box → the tip → the sole, which rocks up toward the heel → a round heel
    // that leans back. (Drawn before as a straight opening from the counter to the vamp over a fat toe box and a slab of a
    // heel, 0.07 H too high mid-foot: "thick, high-backed clogs or booties", side-on round 5, every lens.) The named
    // anchors are the floor contacts (tools/floor_pose.mjs --touch shoe.near:vamp): kneeling, the vamp and the tip lie
    // on the floor; standing or sitting, the ball and the heel
    const N = { vamp: 5, tip: 8, ball: 10, heel: 12 };
    out.push({ id: `shoe.${side}`, bone: `toe.${side}`, z: z + 0.6, fill: C.shoe, names: N, geom: ensureCW(loop([
      [counterX(char, side), sh.top, { c: true, ai: 112, ao: 48, ti: 0.5, to: 0.6 }],    // the heel counter's top, ON the leg's back line (0.04 H behind it, it stood up behind the ankle as a pointed tab, "a snag", round 6 blind A/B)
      [h[0] + 0.137 * L, sh.top + 0.081, { a: 40 }],                                    // the opening falls steeply…
      [h[0] + 0.313 * L, sh.top + 0.167, { a: 24 }],
      [h[0] + 0.53 * L, sh.top + 0.222, { a: 2 }],                                      // …and runs low along the foot
      [h[0] + 0.7 * L, sh.top + 0.205, { a: -24 }],
      [h[0] + 0.758 * L, sh.top + 0.172, { c: true, ai: 140, ao: 21, ti: 0.6, to: 0.6 }],   // the vamp
      [t[0] - 0.086, t[1] - 0.081, { a: 30 }],                                          // the toe box's top
      [t[0] - 0.006, t[1] - 0.03, { a: 72 }],
      [t[0] + 0.002, t[1] + 0.01, { a: 100 }],                                          // the tip
      [t[0] - 0.04, sh.sole - 0.012, { a: 162 }],
      [t[0] - 0.215, sh.sole, { a: 180 }],                                               // the ball
      [h[0] + 0.433, sh.sole - 0.019, { a: 188 }],
      [h[0] + 0.067 + hk / 2, h[1] + 0.095, { a: 205 }],                                // the sole rocks up to the heel
      [h[0] + 0.006 + hk, h[1] + 0.05, { a: 250 }],
      [h[0] + hk, h[1] - 0.02, { a: 278 }]])),                                           // the heel's round back
      skin: { parent: `foot.${side}`, child: `toe.${side}`, zone: 0.35 } });
  }
  return out;
}
