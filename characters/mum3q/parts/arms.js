// arms.js — mum3's bare arms (¾ view: both drawn, the far one behind the dress; the near strap is in body.js). Each arm is ONE continuous skin tube shoulder → elbow → wrist, built in POSED space with the
// elbow as a fillet (a bend whose radius grows with the bend), so the arm flows through the elbow and the shoulder is the
// tube's own round end (the deltoid), tucked under the dress strap. Nothing pivots on a pin: there is no sleeve or cuff to
// slide over a joint (mum2's "pinned on" look came from cloth pieces hinged at the elbow and wrist).
// Near arm in front of the body; far arm behind it, one step darker (it is hidden in the master's pose).
import { tube } from '../../../engine/shapes.js';
import { ensureCW } from '../../../engine/hand.js';
import { add, sub, mulS, norm, perpL, lerp } from '../../../engine/geom.js';

export const ANCHORS = { 'arm.near': 16, 'arm.far': 16 };


export function build(ctx) {
  const { P: C, C: char, st } = ctx, X = char.params.P, out = [];
  for (const side of ['near', 'far']) {
    // an arm hidden by design (C.fit.hidden) is not drawn: kept behind her, it still slid out past her back as she leaned
    // (v1, 8.2 s: a skin sliver down the back of the dress)
    if (char.fit?.hidden?.includes(`${side}.arm`)) continue;
    const zb = (side === 'near' ? 55 : 8) + (ctx.pose?.zBias?.[`arm.${side}`] ?? 0);
    const fill = C[(side === 'far' && X.armFar?.fill) || (side === 'near' ? 'skin' : 'skinFar')];   // ¾: the far arm in the light (P.armFar.fill)
    const Sp = st[`upperArm.${side}`].pos, Ep = st[`forearm.${side}`].pos, Wp = st[`hand.${side}`].pos;
    const L1 = Math.hypot(Ep[0] - Sp[0], Ep[1] - Sp[1]), L2 = Math.hypot(Wp[0] - Ep[0], Wp[1] - Ep[1]);
    const u1 = norm(sub(Ep, Sp)), u2 = norm(sub(Wp, Ep)), bend = Math.atan2(u1[0] * u2[1] - u1[1] * u2[0], u1[0] * u2[0] + u1[1] * u2[1]) * 180 / Math.PI;
    const w = (side === 'far' && X.armFar ? X.armFar : X.arm).w, wE = w[2];
    const bk = Math.min(1, Math.abs(bend) / 110);
    // the bend radius stays larger than the inner half-width, or the inside contour folds over itself (a notch at the elbow)
    const fr = Math.min(0.45 * Math.min(L1, L2), Math.max((0.12 + 0.26 * bk) * Math.min(L1, L2), 2.2 * Math.max(wE.front, wE.back) * bk));
    const A = sub(Ep, mulS(u1, fr)), B = add(Ep, mulS(u2, fr)), q = (t) => add(add(mulS(A, (1 - t) ** 2), mulS(Ep, 2 * t * (1 - t))), mulS(B, t * t));
    const axis = [Sp, lerp(Sp, A, 0.5), A, q(0.5), B, lerp(B, Wp, 0.5), Wp];
    const mix = (a, b, t) => ({ front: a.front + (b.front - a.front) * t, back: a.back + (b.back - a.back) * t });
    const ws = [w[0], w[1], mix(w[1], w[2], 0.7), w[2], mix(w[2], w[3], 0.5), w[3], w[4]];
    // r = the tube's +normal side = the arm's FRONT (anterior: the inside of an elbow bend); the inner side compresses
    const dirE = norm(sub(B, A)), concR = (perpL(dirE)[0] * (u2[0] - u1[0]) + perpL(dirE)[1] * (u2[1] - u1[1])) > 0;
    const widths = ws.map((v, i) => {
      let r = v.front, l = v.back;
      const e = [0, 0, 0.5, 1, 0.5, 0, 0][i] * bk;
      if (concR) { r *= 1 - 0.18 * e; l *= 1 + 0.06 * e; } else { l *= 1 - 0.18 * e; r *= 1 + 0.06 * e; }
      return { r, l };
    });
    // the wrist end barely rounds past the wrist: the palm's end covers it, and a full round end bulged out under a
    // bent wrist (v1 8.2 s: "a lump under the wrist")
    // the shoulder's round end is the deltoid hanging over the arm: tall while the arm hangs (P.arm.capA), it flattens as
    // the arm rises (an arm raised forward pushed a full round end out BEHIND the shoulder: a lump, ¾ stress pose x-reach)
    const cap0 = (side === 'far' && X.armFar ? X.armFar : X.arm).capA ?? 0.75, elev = Math.acos(Math.max(-1, Math.min(1, u1[1]))) * 180 / Math.PI;
    const ke = Math.min(1, Math.max(0, (elev - 20) / 60)), kA = cap0 + (Math.min(cap0, 0.5) - cap0) * ke * ke * (3 - 2 * ke);
    const g = tube(axis, widths, { capK: [kA, 0.3] });
    out.push({ id: `arm.${side}`, bone: `forearm.${side}`, z: zb, fill, world: true, geom: ensureCW(g) });
    // hand (engine/hand.js) just above its arm: the palm's wrist end covers the tube's end. pose.zBias['arm.<side>.hand']
    // brings ONLY the hand forward: the far hand resting on the top of the bump lies on the dress while its forearm runs
    // behind her body (stills q_k2_*: the wrist comes out from behind the under-bust, the fingers curve over the bump)
    out.push(...char.hands[side].parts(ctx, { fill, line: C.skinLine, zBase: zb + 0.5 + (ctx.pose?.zBias?.[`arm.${side}.hand`] ?? 0) }));
  }
  return out;
}
