// skirt.js — mum3's skirt, hung in POSED space from the bodice (parts/body.js) over her posed legs (parts/legs.js) by
// engine/drape.js: the front falls from the bump, the back over the buttocks, each by gravity with the cloth length the
// master's skirt has standing, the hem wrapping under the thighs. Built in the character's postBuild: it needs the
// bodice already skinned (where the cloth leaves the bump, the back waist) and any props (a chair's seat: pose.props).
import { skirt, calibrate } from '../../../engine/drape.js';
import { ensureCW } from '../../../engine/hand.js';
import { ap, sub } from '../../../engine/geom.js';
import { legFor } from './legs.js';
import { DRESS_AT } from './body.js';

// the buttocks (rest H): the gluteal mass behind the hip joint, from the back waist's curve to the fold under it; the
// master's seat point (−0.37, −3.78) is its back. Carried by the pelvis. The back of the skirt passes over it.
const SEAT = { c: [-0.04, -3.76], rx: 0.335, ry: 0.43, n: 14 };
// the skirt's top edge INSIDE her (rest H), back waist → bump: hidden under the bodice in any pose
const TOP = [[0.0, -4.36], [0.3, -4.17], [0.55, -3.86]];
const cache = new WeakMap();

const seatOf = (carry) => Array.from({ length: SEAT.n }, (_, i) => { const a = (2 * Math.PI * i) / SEAT.n; return carry([SEAT.c[0] + SEAT.rx * Math.cos(a), SEAT.c[1] + SEAT.ry * Math.sin(a)]); });
/** the buttocks' outline, posed (what a chair's seat or a ball goes under: parts/props.js) */
export const seatPts = ({ st, C: char }) => seatOf((p) => ap(st.pelvis.M, sub(p, char.joints.pelvis)));

function cal(ctx) {
  const { C: char, rig } = ctx;
  if (cache.has(char)) return cache.get(char);
  const X = char.params.P, st0 = rig.solve({}), c0 = { ...ctx, st: st0 }, J = char.joints;
  const carry0 = (p) => ap(st0.pelvis.M, sub(p, J.pelvis));
  const k = calibrate({ Wf: X.bump.bottom, Wb: X.back.waist, legs: ['near', 'far'].map((s) => legFor(c0, s)), seat: seatOf(carry0) },
    { hemFront: X.hem.front, hemBack: X.hem.back, hemY: X.hem.y, skin: 0.02 });
  cache.set(char, k);
  return k;
}

export function skirtPart(parts, ctx, props = { floors: [], cloth: [] }) {
  const { C: char, st, pose, P: pal } = ctx, J = char.joints;
  const dress = parts.find((p) => p.id === 'dress');
  const carry = (p) => ap(st.pelvis.M, sub(p, J.pelvis));
  const sk = skirt({ Wf: dress.geom.P[DRESS_AT.bot], Wb: dress.geom.P[DRESS_AT.waist], legs: ['near', 'far'].map((s) => legFor(ctx, s)),
    seat: seatOf(carry), props: props.cloth, floors: props.floors, top: TOP.map(carry), cal: cal(ctx) });
  return { id: 'dress.skirt', bone: 'pelvis', z: 30.05, fill: pal.dress, world: true, geom: ensureCW(sk.geom), M: dress.M, module: 'body', anchors: sk.geom.P.length, drape: { Hf: sk.Hf, Hb: sk.Hb, pf: sk.pf, pb: sk.pb, hem: sk.hem } };
}
