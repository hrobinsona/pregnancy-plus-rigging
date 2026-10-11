// arms.js — cardigan sleeves (tube along shoulder→elbow→wrist, skinned across the elbow), bunched cuffs, wrist skin,
// hands (generator). Near arm is in front of everything on the body; far arm behind the body.
import { tube, limb, taper } from '../../../engine/shapes.js';
import { ensureCW } from '../../../engine/hand.js';
import { add, sub, mulS, norm, perpL, lerp } from '../../../engine/geom.js';

export const ANCHORS = { 'sleeve.near': 10, 'sleeve.far': 10, 'cuff.near': 6, 'cuff.far': 6, 'cuff.near.rib': 4, 'cuff.far.rib': 4,
  'wrist.near': 6, 'wrist.far': 6, 'sleeve.near.fold': 6, 'sleeve.far.fold': 6 };

export function build(ctx) {
  const { P: C, C: char } = ctx, J = char.joints, X = char.params.P, out = [];
  for (const side of ['near', 'far']) {
    const S = side === 'near' ? 'Near' : 'Far', zb = side === 'near' ? 80 : 10;
    const sh = J['shoulder' + S], el = J['elbow' + S], wr = J['wrist' + S], w = X.sleeve[side];
    const cuffEnd = lerp(el, wr, 0.84), axis = [sh, lerp(sh, el, 0.55), el, cuffEnd];
    out.push({ id: `sleeve.${side}`, bone: `forearm.${side}`, z: zb, fill: C.cardigan,
      geom: ensureCW(tube(axis, w.map((v, i) => ({ r: i === 0 ? v * 0.85 : v, l: v })), { capK: 0.55 })),
      skin: { parent: `upperArm.${side}`, child: `forearm.${side}`, zone: 0.22 } });
    // inner fold line along the sleeve (reads the arm against the cardigan of the same colour)
    const u = norm(sub(el, sh)), n = perpL(u), inner = side === 'near' ? 1 : -1;
    const f0 = add(lerp(sh, el, 0.15), mulS(n, inner * w[0] * 0.55)), f1 = add(lerp(sh, el, 0.75), mulS(n, inner * w[1] * 0.62)), f2 = add(lerp(el, wr, 0.25), mulS(perpL(norm(sub(wr, el))), inner * w[2] * 0.6)), f3 = add(lerp(el, wr, 0.6), mulS(perpL(norm(sub(wr, el))), inner * w[2] * 0.5));
    out.push({ id: `sleeve.${side}.fold`, bone: `forearm.${side}`, z: zb + 0.2, fill: C.cardiganShade, geom: taper([f0, f1, f2, f3], [0.003, 0.02, 0.016, 0.003]),
      skin: { parent: `upperArm.${side}`, child: `forearm.${side}`, zone: 0.22 } });
    // bunched cuff + rib line
    const c0 = lerp(el, wr, 0.8), c1 = lerp(el, wr, 0.97), cw = w[3] * 1.04;
    out.push({ id: `cuff.${side}`, bone: `forearm.${side}`, z: zb + 0.4, fill: C.cardigan, geom: ensureCW(limb(c0, c1, [{ t: 0, r: cw, l: cw }, { t: 1, r: cw * 0.92, l: cw * 0.92 }], { capK: 0.5 })) });
    const cn = perpL(norm(sub(c1, c0))), cm = lerp(c0, c1, 0.3);
    out.push({ id: `cuff.${side}.rib`, bone: `forearm.${side}`, z: zb + 0.5, fill: C.cardiganShade, geom: taper([add(cm, mulS(cn, cw * 0.8)), lerp(cm, add(cm, [0, 0.012]), 1), add(cm, mulS(cn, -cw * 0.8))], [0.003, 0.016, 0.003]) });
    // wrist skin between cuff and palm, skinned across the wrist so a bent wrist stays filled (wrist corrective base)
    out.push({ id: `wrist.${side}`, bone: `hand.${side}`, z: zb + 0.3, fill: C.skin,
      geom: ensureCW(limb(lerp(el, wr, 0.9), add(wr, mulS(norm(sub(wr, el)), 0.05)), [{ t: 0, r: 0.075, l: 0.075 }, { t: 1, r: 0.072, l: 0.072 }], { capK: 0.8 })),
      skin: { parent: `forearm.${side}`, child: `hand.${side}`, zone: 0.5 } });
    // hand
    const hand = char.hands[side];
    out.push(...hand.parts(ctx, { fill: C.skin, line: C.skinLine, zBase: zb + 0.6 }));
  }
  return out;
}
