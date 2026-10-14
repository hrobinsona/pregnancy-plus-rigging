// arms.js — mum3's bare arms (¾ view: both drawn, the far one behind the dress; the near strap is in body.js). Each arm is ONE continuous skin tube shoulder → elbow → wrist, built in POSED space with the
// elbow as a fillet (a bend whose radius grows with the bend), so the arm flows through the elbow and the shoulder is the
// tube's own round end (the deltoid), tucked under the dress strap. Nothing pivots on a pin: there is no sleeve or cuff to
// slide over a joint (mum2's "pinned on" look came from cloth pieces hinged at the elbow and wrist).
// Near arm in front of the body; far arm behind it, one step darker (it is hidden in the master's pose).
import { tube, taper } from '../../../engine/shapes.js';
import { ensureCW } from '../../../engine/hand.js';
import { add, sub, mulS, norm, perpL, lerp, ellipse } from '../../../engine/geom.js';

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
    // the HEEL of a sharply bent wrist (P.arm/armFar.wristRound): a round pad over the outer corner where the forearm's
    // end meets the hand, as the stills draw it (q_k4_down_0: the far hand curled over the top of the bump, its heel a
    // round bulge over the bump's edge). Without it the tube's end and the palm's narrower heel left a pointed corner
    // sticking out of her silhouette (v6 draft, blind A/B: "a pointed wrist corner"). Grows in from a 25° bend.
    const wr = (side === 'far' && X.armFar ? X.armFar : X.arm).wristRound, Kp = st[`hand.${side}.f2a`]?.pos;
    if (wr && Kp) {
      const hd = norm(sub(Kp, Wp)), bw = Math.acos(Math.max(-1, Math.min(1, u2[0] * hd[0] + u2[1] * hd[1]))) * 180 / Math.PI;
      const k = Math.max(0, Math.min(1, (bw - 25) / 35));
      if (k > 0.01) {
        const W_ = { r: 1, out: 0.3, along: 0, ...(typeof wr === 'object' ? wr : {}) }, out_ = norm(sub(u2, hd));
        // never wider than the limb it ends: the pad's radius ≤ half the wrist's width (look-up v7 draft: r from the fuller back
        // edge alone drew it wider than the forearm, "a ball", "a swollen joint"; lesson 52)
        const r = Math.min(Math.max(w[4].front, w[4].back) * W_.r, (w[4].front + w[4].back) / 2) * (0.8 + 0.2 * k);
        const c0 = add(add(Wp, mulS(out_, W_.out * r * k)), mulS(hd, W_.along * r));
        out.push({ id: `arm.${side}.heel`, bone: `hand.${side}`, z: zb + 0.45 + (ctx.pose?.zBias?.[`arm.${side}.hand`] ?? 0), fill, world: true, geom: ellipse(c0, r, r) });
        // the wrist CREASE (wristRound.crease {span°, at × r, w H}): where the back of the hand bends off the round wrist, an arc
        // of the pad facing the fingers, drawn over the hand's base as the stills draw it (q_k4_down_0). Without it the pad
        // read as "a big rounded lump… a swollen joint, not a bent wrist" (look-up v7 blind A/B; lesson 52)
        if (W_.crease) {
          const Cr = { span: 55, at: 0.95, w: 0.009, ...W_.crease }, a0 = Math.atan2(hd[1], hd[0]);
          const pts = [-1, -0.5, 0, 0.5, 1].map((q) => { const a = a0 + q * Cr.span * Math.PI / 180; return add(c0, mulS([Math.cos(a), Math.sin(a)], r * Cr.at)); });
          out.push({ id: `arm.${side}.crease`, bone: `hand.${side}`, z: zb + 0.62 + (ctx.pose?.zBias?.[`arm.${side}.hand`] ?? 0), fill: C.skinLine, world: true,
                     opacity: Math.min(1, k * 1.5), geom: taper(pts, pts.map((_, i) => Cr.w * [0.4, 0.9, 1, 0.9, 0.4][i]), 'round') });
        }
      }
    }
    // hand (engine/hand.js) just above its arm: the palm's wrist end covers the tube's end. pose.zBias['arm.<side>.hand']
    // brings ONLY the hand forward: the far hand resting on the top of the bump lies on the dress while its forearm runs
    // behind her body (stills q_k2_*: the wrist comes out from behind the under-bust, the fingers curve over the bump)
    out.push(...char.hands[side].parts(ctx, { fill, line: C.skinLine, zBase: zb + 0.5 + (ctx.pose?.zBias?.[`arm.${side}.hand`] ?? 0) }));
  }
  return out;
}
