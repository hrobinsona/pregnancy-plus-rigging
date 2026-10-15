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
const SEAT = { c: [-0.04, -3.76], rx: 0.335, ry: 0.43, n: 14, grow: 0 };
// the skirt's top edge INSIDE her (rest H), back waist → bump: hidden under the bodice in any pose
const TOP = [[0.0, -4.36], [0.3, -4.17], [0.55, -3.86]];
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
    pitch: pitchOf(ctx), seat: seatOf(carry, flexOf(pose)), bump: bumpPts(dress.geom), under: underPts(dress.geom), apart: pose?.fx?.kneesApart ?? 0, swing: pose?.fx?.skirtSwing ?? 0, props: props.cloth, floors: props.floors, top: TOP.map(carry), cal: cal(ctx) });
  return { id: 'dress.skirt', bone: 'pelvis', z: 30.05, fill: pal.dress, world: true, geom: ensureCW(sk.geom), M: dress.M, module: 'body', anchors: sk.geom.P.length, drape: { Hf: sk.Hf, Hb: sk.Hb, pf: sk.pf, pb: sk.pb, hem: sk.hem, side: sk.side, fold: sk.fold } };
}
