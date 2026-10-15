// arms.js — mum3's bare arms. Each arm is ONE continuous skin tube shoulder → elbow → wrist, built in POSED space with the
// elbow as a fillet (a bend whose radius grows with the bend), so the arm flows through the elbow and the shoulder is the
// tube's own round end (the deltoid), tucked under the dress strap. Nothing pivots on a pin: there is no sleeve or cuff to
// slide over a joint (mum2's "pinned on" look came from cloth pieces hinged at the elbow and wrist).
// Near arm in front of the body; far arm behind it, one step darker (it is hidden in the master's pose).
import { tube } from '../../../engine/shapes.js';
import { ensureCW } from '../../../engine/hand.js';
import { add, sub, mulS, norm, perpL, lerp, loop, ap } from '../../../engine/geom.js';

export const ANCHORS = { 'arm.near': 16, 'arm.far': 16, 'dress.strap': 8, 'dress.strap.far': 8 };

const bez = (p0, c1, c2, p3, t) => { const u = 1 - t; return [0, 1].map((k) => u * u * u * p0[k] + 3 * u * u * t * c1[k] + 3 * u * t * t * c2[k] + t * t * t * p3[k]); };
const bezD = (p0, c1, c2, p3, t) => { const u = 1 - t; return [0, 1].map((k) => 3 * u * u * (c1[k] - p0[k]) + 6 * u * t * (c2[k] - c1[k]) + 3 * t * t * (p3[k] - c2[k])); };
const deg = (v) => Math.atan2(v[1], v[0]) * 180 / Math.PI;

export function build(ctx) {
  const { P: C, C: char, st } = ctx, X = char.params.P, out = [];
  for (const side of ['near', 'far']) {
    // an arm hidden by design (C.fit.hidden) is not drawn: kept behind her, it still slid out past her back as she leaned
    // (v1, 8.2 s: a skin sliver down the back of the dress)
    // (a pose that shows it, e.g. on all fours, sets fx['show.far.arm'] = 1: drawn behind her body, a darker step)
    if (char.fit?.hidden?.includes(`${side}.arm`) && !((ctx.pose?.fx?.[`show.${side}.arm`] ?? 0) > 0.5)) continue;
    const zb = (side === 'near' ? 55 : 8) + (ctx.pose?.zBias?.[`arm.${side}`] ?? 0);
    const fill = side === 'near' ? C.skin : C.skinFar;
    const Sp = st[`upperArm.${side}`].pos, Ep = st[`forearm.${side}`].pos, Wp = st[`hand.${side}`].pos;
    const L1 = Math.hypot(Ep[0] - Sp[0], Ep[1] - Sp[1]), L2 = Math.hypot(Wp[0] - Ep[0], Wp[1] - Ep[1]);
    const u1 = norm(sub(Ep, Sp)), u2 = norm(sub(Wp, Ep)), bend = Math.atan2(u1[0] * u2[1] - u1[1] * u2[0], u1[0] * u2[0] + u1[1] * u2[1]) * 180 / Math.PI;
    const w = X.arm.w, wE = w[2];
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
    const g = tube(axis, widths, { capK: [0.75, 0.3] });
    // the far shoulder's round end stays behind her back: seen a little from above (fx.farUp) it rose past her back line as a
    // skin knob over the near strap (side-on all fours, round 4); below her shoulder blades the far arm may show behind her
    // back (a walk's back swing), so only the corner above the blades and behind the back line is cut, in the chest's frame
    // (only when raised: hanging or swinging back from a shoulder at its own height, the arm's top is behind her body
    // anyway, and the cut drew a flat top on a walking far arm swung back past her back, round 4)
    const farCut = side === 'far' && (ctx.pose?.fx?.farUp ?? 0) > 0 ? (() => {
      const M = st.chest.M, j = char.joints.chest, W = (v) => [...ap(M, sub(v, j)), { c: true }], xb = X.back.shoulder[0] + 0.05, ys = X.back.blade[1], B = 9;
      return [ensureCW(loop([W([xb, -B]), W([B, -B]), W([B, B]), W([-B, B]), W([-B, ys]), W([xb, ys])]))];
    })() : undefined;
    out.push({ id: `arm.${side}`, bone: `forearm.${side}`, z: zb, fill, world: true, geom: ensureCW(g), ...(farCut ? { clipAnd: farCut } : {}) });
    // (the far strap too: seen a little from above, fx.farUp, the far shoulder's top shows between her near shoulder and
    // her neck, and it is dressed: bare, it read as a skin knob over the near strap, side-on all fours, round 4)
    out.push(strap(ctx, g, side, side === 'near' ? 62 : zb + 0.3));
    // hand (engine/hand.js) just above its arm: the palm's wrist end covers the tube's end
    out.push(...char.hands[side].parts(ctx, { fill, line: C.skinLine, zBase: zb + 0.5 }));
  }
  return out;
}

// The dress strap over the near shoulder, drawn OVER the arm. Its outer edge from the back of the shoulder up to the
// top IS the arm's own contour (the tube's segment back-at-shoulder → cap top), so it can never step off the arm or
// stick out past it as the arm swings (mum3 v1: a ragged tab at 8.2 s, the strap and the arm on different bones).
// Its back end tapers to a point on that contour, as in the master; the front runs over the shoulder top into the
// dress in front of the arm (same colour: no seam), carried by the clavicle.
function strap({ P: C, C: char, st }, g, side = 'near', z = 62) {
  const X = char.params.P, sw = X.strap.w, n = g.P.length, J = char.joints, F = side === 'far';
  // the far strap: the near one's rest points moved with the far clavicle (params.js FD), a step darker, behind her body
  const D = F ? sub(J.clavicleFar, J.clavicleNear) : [0, 0], mv = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Array.isArray(v) ? add(v, D) : v]));
  const nl = mv(X.neckline), S = mv(X.strap);
  const p0 = g.P[n - 1], c1 = g.hout[n - 1], c2 = g.hin[0], p3 = g.P[0];   // tube anchors: 0 = cap tip, n-1 = back side at the shoulder
  const at = (t) => bez(p0, c1, c2, p3, t), tan = (t) => deg(bezD(p0, c1, c2, p3, t));
  const M = st[`clavicle.${side}`].M, j = F ? J.clavicleFar : J.clavicleNear, W = (v) => ap(M, sub(v, j)), rot = st[`clavicle.${side}`].rot ?? 0;
  const mid = at(0.5), inw = norm(sub(st[`upperArm.${side}`].pos, mid)), inner = add(mid, mulS(inw, sw * 0.9));
  return { id: F ? 'dress.strap.far' : 'dress.strap', bone: `clavicle.${side}`, z, fill: F ? C.dressShade : C.dress, world: true, geom: ensureCW(loop([
    [...p0, { c: true, ao: tan(0), ai: deg(sub(inner, p0)), to: 0.9, ti: 0.6 }],                      // the tail: a point on the arm's back contour
    [...mid, { a: tan(0.5) }], [...p3, { a: tan(1) }],
    [...W(S.front), { a: 30 + rot }], [...W([nl.low[0] - 0.08, nl.low[1] + 0.02])],
    [...W([S.front[0] - 0.02, S.front[1] + sw * 1.4])], [...W([S.top[0] + 0.03, S.top[1] + sw + 0.03]), { a: 180 + rot }],
    [...inner, { a: tan(0.5) + 180 }]])) };
}
