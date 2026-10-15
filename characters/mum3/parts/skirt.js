// skirt.js — mum3's skirt, hung in POSED space from the bodice (parts/body.js) over her posed legs (parts/legs.js) by
// engine/drape.js: the front falls from the bump, the back over the buttocks, each by gravity with the cloth length the
// master's skirt has standing, the hem wrapping under the thighs. Built in the character's postBuild: it needs the
// bodice already skinned (where the cloth leaves the bump, the back waist) and any props (a chair's seat: pose.props).
import { skirt, calibrate } from '../../../engine/drape.js';
import { ensureCW } from '../../../engine/hand.js';
import { ap, sub, add, mulS, norm, len } from '../../../engine/geom.js';
import { legFor } from './legs.js';
import { DRESS_AT, LORD } from './body.js';

// the buttocks (rest H): the gluteal mass behind the hip joint, from the back waist's curve to the fold under it; the
// master's seat point (−0.37, −3.78) is its back. Carried by the pelvis. The back of the skirt passes over it.
const SEAT = { c: [-0.04, -3.76], rx: 0.335, ry: 0.43, n: 14, grow: 0 };
// the skirt's top edge INSIDE her (rest H), back waist → bump: hidden under the bodice in any pose
const TOP = [[0.3, -4.17], [0.55, -3.86]];
// ... and before them a point inside her trunk just above the back waist, carried as the bodice is: the bodice's hidden
// path now runs up 0.1 H inside her back (parts/body.js SKIRT_IN), and a pelvis-carried point behind the waist swung
// with the hips; leaning on the counter it landed beside the bodice's hidden corner and left a white sliver there, round 6
const IN = { fw: 0.16, up: 0.06 };
// cloth shape options for engine/drape.js skirt() (pose.fx.clothTry overrides them for one pose: side_zoom.py --try)
export const CLOTH = { tailRound: 0.75, frontWalk: 0.2, seatCorner: 0.6 };
const cache = new WeakMap(), rest0 = new WeakMap();
// the trunk's forward pitch from standing (radians): on all fours ≈ 80°, leaning on a counter ≈ 25–30°
const pitchOf = ({ C: char, st, rig }) => { if (!rest0.has(char)) rest0.set(char, rig.solve({}).spineLower.rot); return (st.spineLower.rot - rest0.get(char)) * Math.PI / 180; };

// with the hips flexed the buttocks round out behind (the glutes stretched over the sitting bones; every sitting, squatting
// and bending still draws a full round seat past the back of the thighs, round 1: "no seat mass"): by the mean hip
// flexion, the seat grows backward by up to SEAT.grow (its front, inside her, and its bottom stay put: a chair's seat and
// a ball still go under the same place; 0.16 drew it twice the stills' depth behind her back, round 3: "the seat too full")
const flexOf = (pose) => { const b = pose?.bones || {}; return ((b['thigh.near'] || 0) + (b['thigh.far'] || 0)) / 2; };
const seatOf = (carry, flex = 0) => {
  const t = Math.max(0, Math.min(1, flex / 90)), g = SEAT.grow * t * t * (3 - 2 * t), rx = SEAT.rx + g / 2, cx = SEAT.c[0] - g / 2;
  return Array.from({ length: SEAT.n }, (_, i) => { const a = (2 * Math.PI * i) / SEAT.n; return carry([cx + rx * Math.cos(a), SEAT.c[1] + SEAT.ry * Math.sin(a)]); });
};
// the HUG (engine/drape.js): the back's cloth fitted from the back waist, in at the small of her back and round the
// buttocks to their fullest point (where it would leave them for plumb), hanging free only below. A cubic from the waist,
// leaving it along the bodice's back line (down: the lumbar curving in), into the seat's outline at A0°, then along the
// outline while it still turns out. Hung from the waist, the taut cloth ran straight to the seat's tangent: a ramp, a
// ruler from the waist to the hem (side-on round 5, every lens). The outline's UPPER back is taller than the seat's
// support (ry 0.6, not SEAT.ry): the master's buttocks round out over 0.6 H from the waist (−0.29 at y −4.2, −0.35 at
// −4.0, fullest −0.37 at −3.8); on the support's own curve the cubic dived in to make the turn: a wasp waist, round 6.
// k0, k1: the cubic's handles as fractions of its chord (the waist's, the seat's)
const HUG = { a0: 225, ry: 0.6, k0: 0.35, k1: 0.35, n: 6, step: 6, min: 30 };   // (n: the cubic's points)
const hugOf = (carry, flex, Wb, dn) => {
  const t = Math.max(0, Math.min(1, flex / 90)), g = SEAT.grow * t * t * (3 - 2 * t), rx = SEAT.rx + g / 2, cx = SEAT.c[0] - g / 2;
  const E = (a) => { const r = a * Math.PI / 180, s = Math.sin(r); return carry([cx + rx * Math.cos(r), SEAT.c[1] + (s < 0 ? HUG.ry : SEAT.ry) * s]); };
  const tan = (a) => norm(sub(E(a - 0.5), E(a + 0.5)));   // (posed, along the outline with the angle falling: down the back)
  // (leaving the waist halfway between the bodice's line and the seat: along the bodice's line alone the cloth dipped in
  // below a lifted arm, a dent where the stills run straight out into the seat's round; round 6)
  const P3 = E(HUG.a0), c = len(sub(P3, Wb)), d0 = norm(add(dn, mulS(sub(P3, Wb), 1 / c))), P1 = add(Wb, mulS(d0, HUG.k0 * c)), P2 = sub(P3, mulS(tan(HUG.a0), HUG.k1 * c));
  const out = [];
  for (let i = 0; i < HUG.n; i++) { const u = i / HUG.n, v = 1 - u; out.push([0, 1].map((k) => v * v * v * Wb[k] + 3 * v * v * u * P1[k] + 3 * v * u * u * P2[k] + u * u * u * P3[k])); }
  // round the seat while the outline still turns OUT (back, −x): from its fullest point the cloth falls (drape.js hang)
  for (let a = HUG.a0; a >= HUG.min; a -= HUG.step) {
    if (tan(a)[0] < 0) { out.push(E(a)); continue; }
    let lo = a, hi = a + HUG.step;   // (the fullest point between: where the outline turns plumb)
    for (let it = 0; it < 12; it++) { const m = (lo + hi) / 2; if (tan(m)[0] < 0) hi = m; else lo = m; }
    if (hi < HUG.a0) out.push(E(hi));
    break;
  }
  return out;
};
/** the buttocks' outline, posed (what a chair's seat or a ball goes under: parts/props.js) */
export const seatPts = ({ st, C: char, pose }) => seatOf((p) => ap(st.pelvis.M, sub(p, char.joints.pelvis)), flexOf(pose));
// the bump's outline below where the skirt leaves it (bodice anchors: 6 apex, 7 lower, 8 the bottom = DRESS_AT.bot), with
// points along its curves: what the front lies over when the bump hangs lower than that (on all fours)
const bumpPts = (g) => { const out = [g.P[6], g.P[7]], bz = (i, t) => { const a = g.P[i], b = g.hout[i], c = g.hin[i + 1], d = g.P[i + 1], u = 1 - t;
  return [0, 1].map((k) => u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * d[k]); };
  for (const t of [0.25, 0.5, 0.75]) out.push(bz(6, t), bz(7, t)); return out; };
// the same underside IN ORDER, apex → the bodice's bottom (engine/drape.js leave(): where the front leaves the bump)
const underPts = (g) => { const out = [], bz = (i, t) => { const a = g.P[i], b = g.hout[i], c = g.hin[i + 1], d = g.P[i + 1], u = 1 - t;
  return [0, 1].map((k) => u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * d[k]); };
  for (const i of [6, 7]) for (let k = 0; k < 12; k++) out.push(bz(i, k / 12)); out.push(g.P[8]); return out; };

function cal(ctx) {
  const { C: char, rig } = ctx;
  if (cache.has(char)) return cache.get(char);
  const X = char.params.P, st0 = rig.solve({}), c0 = { ...ctx, st: st0 }, J = char.joints;
  const carry0 = (p) => ap(st0.pelvis.M, sub(p, J.pelvis));
  // (the back waist where the bodice puts it at rest: parts/body.js lumbar moves it in by LORD.base, its back line straight down)
  const n0 = norm([st0.spineLower.M[0], st0.spineLower.M[1]]), Wb0 = add(X.back.waist, mulS(n0, LORD.base));
  const k = calibrate({ Wf: X.bump.bottom, Wb: Wb0, hug: hugOf(carry0, 0, Wb0, [0, 1]), legs: ['near', 'far'].map((s) => legFor(c0, s)), seat: seatOf(carry0) },
    { hemFront: X.hem.front, hemBack: X.hem.back, hemY: X.hem.y, skin: 0.02 });
  cache.set(char, k);
  return k;
}

export function skirtPart(parts, ctx, props = { floors: [], cloth: [] }) {
  const { C: char, st, pose, P: pal } = ctx, J = char.joints;
  const dress = parts.find((p) => p.id === 'dress');
  const carry = (p) => ap(st.pelvis.M, sub(p, J.pelvis));
  const g = dress.geom, iW = DRESS_AT.waist, Wb = g.P[iW], dn = norm(sub(Wb, g.hout[iW]));   // (down the bodice's back line: it runs up from the waist)
  const sk = skirt({ Wf: g.P[DRESS_AT.bot], Wb, hug: hugOf(carry, flexOf(pose), Wb, dn), hugFrom: HUG.n, tuck: norm(sub(g.P[DRESS_AT.bot], g.hin[DRESS_AT.bot])), legs: ['near', 'far'].map((s) => legFor(ctx, s)),
    pitch: pitchOf(ctx), seat: seatOf(carry, flexOf(pose)), bump: bumpPts(dress.geom), under: underPts(dress.geom), apart: pose?.fx?.kneesApart ?? 0, swing: pose?.fx?.skirtSwing ?? 0, props: props.cloth, floors: props.floors, ...CLOTH, ...(pose?.fx?.clothTry || {}), top: [add(Wb, add(mulS([dn[1], -dn[0]], IN.fw), mulS(dn, -IN.up))), ...TOP.map(carry)], cal: cal(ctx) });
  return { id: 'dress.skirt', bone: 'pelvis', z: 30.05, fill: pal.dress, world: true, geom: ensureCW(sk.geom), M: dress.M, module: 'body', anchors: sk.geom.P.length, drape: { Hf: sk.Hf, Hb: sk.Hb, pf: sk.pf, pb: sk.pb, hem: sk.hem, side: sk.side, fold: sk.fold } };
}
