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
// how far the upper arm is RAISED forward from hanging down her side, in her trunk's frame (deg): lifting it (a worktop, a
// chair's back, all fours) turns the arm's round end back and down under the strap
export const armRaise = (st, side) => {
  const S = st[`upperArm.${side}`].pos, E = st[`forearm.${side}`].pos, sp = st.spineUpper.pos, nk = st.neck.pos;
  const up = norm(sub(nk, sp)), a = norm(sub(E, S)), down = [-up[0], -up[1]], fwd = [-up[1], up[0]];
  const e = Math.acos(Math.max(-1, Math.min(1, a[0] * down[0] + a[1] * down[1]))) * 180 / Math.PI;
  return a[0] * fwd[0] + a[1] * fwd[1] > 0 ? e : 0;
};
function strap({ P: C, C: char, st }, g, side = 'near', z = 62) {
  const X = char.params.P, sw = X.strap.w, n = g.P.length, J = char.joints, F = side === 'far';
  // A RAISED ARM (30° → 60° forward of hanging, k 0 → 1; the standing shots stay under 20°, unchanged): the strap is the
  // armhole's edge, one band of even width round the arm's root, as every still draws it: its outer edge on the arm's own
  // contour from the back (the tail) over the round end (the cap tip, tube anchor 0) and on down the arm's front (anchor 1)
  // to a point a third of the way to anchor 2, where it tapers out; its inner edge a strap's width inside. Lifted, the rest
  // strap's outer edge lay exactly on the arm's round end (a light seam beside the dress's back), its front ran on into the
  // neckline as a dark hook over the arm, and the bodice's shoulder (strapDress) stood out above it as a sliver: "the top of
  // the arm isn't connected smoothly to the shoulder", "the blend between the top arm and shoulder looks jagged and rough
  // where as the reference still is small and clean" (Harry, side-on round 8, lean-counter and squat; lesson 69)
  const e0 = armRaise(st, side), k0 = Math.max(0, Math.min(1, (e0 - 30) / 30)), k = k0 * k0 * (3 - 2 * k0);
  // the far strap: the near one's rest points moved with the far clavicle (params.js FD), a step darker, behind her body
  const D = F ? sub(J.clavicleFar, J.clavicleNear) : [0, 0], mv = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Array.isArray(v) ? add(v, D) : v]));
  const nl = mv(X.neckline), S = mv(X.strap);
  const p0 = g.P[n - 1], c1 = g.hout[n - 1], c2 = g.hin[0], p3 = g.P[0];   // tube anchors: 0 = cap tip, n-1 = back side at the shoulder
  const at0 = (t) => bez(p0, c1, c2, p3, t), tan = (t) => deg(bezD(p0, c1, c2, p3, t));
  const Sp = st[`upperArm.${side}`].pos, outN = (q, d) => { const nn = norm([d[1], -d[0]]); return nn[0] * (q[0] - Sp[0]) + nn[1] * (q[1] - Sp[1]) > 0 ? nn : mulS(nn, -1); };
  const at = (t) => add(at0(t), mulS(outN(at0(t), bezD(p0, c1, c2, p3, t)), 0.016 * k * Math.min(1, t / 0.35)));   // (raised: just outside the arm's end; the tail stays on it)
  const M = st[`clavicle.${side}`].M, j = F ? J.clavicleFar : J.clavicleNear, W = (v) => ap(M, sub(v, j)), rot = st[`clavicle.${side}`].rot ?? 0;
  const mid = at(0.5), inw = norm(sub(Sp, at0(0.5))), inner = add(at0(0.5), mulS(inw, sw * 0.9));
  // the raised band's front: on the arm's front contour at anchor 1 (Rf) and its tip a third of the way on to anchor 2 (Rt)
  const seg = (i, t) => bez(g.P[i], g.hout[i], g.hin[i + 1], g.P[i + 1], t), segD = (i, t) => bezD(g.P[i], g.hout[i], g.hin[i + 1], g.P[i + 1], t);
  const dC = bezD(p0, c1, c2, p3, 1), nC = outN(p3, dC), dF = segD(1, 0.02), nF = outN(g.P[1], dF), Rt = seg(1, 0.33), dT = segD(1, 0.33);
  const Rf = add(g.P[1], mulS(nF, 0.012)), If = add(g.P[1], mulS(nF, -sw * 0.85)), Ic = add(p3, mulS(nC, -sw));
  // the rest strap's points, and the directions loop() gives them by itself (next − prev), so k = 0 draws exactly as before
  const R = [W(S.front), W([nl.low[0] - 0.08, nl.low[1] + 0.02]), W([S.front[0] - 0.02, S.front[1] + sw * 1.4]), W([S.top[0] + 0.03, S.top[1] + sw + 0.03])];
  const L = (a, b) => lerp(a, b, k), angL = (a, b) => a + k * ((((b - a) % 360) + 540) % 360 - 180), dg = (a, b) => deg(sub(b, a));
  const front = L(R[0], Rf), tip = L(R[1], Rt), fr2 = L(R[2], If), top2 = L(R[3], Ic);
  const aTip = dg(R[0], R[2]);   // (the rest strap's fr1 is smooth: drawn here as a corner whose two handles line up)
  return { id: F ? 'dress.strap.far' : 'dress.strap', bone: `clavicle.${side}`, z, fill: F ? C.dressShade : C.dress, world: true, geom: ensureCW(loop([
    [...p0, { c: true, ao: tan(0), ai: deg(sub(inner, p0)), to: 0.9, ti: 0.6 }],                      // the tail: a point on the arm's back contour
    [...mid, { a: tan(0.5) }], [...at(1), { a: tan(1) }],
    [...front, { a: angL(30 + rot, deg(dF)) }],
    [...tip, { c: true, ai: angL(aTip + 180, deg(dT) + 180), ao: angL(aTip, dg(Rt, If)), ti: 1.05 - 0.15 * k, to: 1.05 - 0.45 * k }],   // raised: the front tip, a point on the arm's front contour
    [...fr2, { a: angL(dg(R[1], R[3]), deg(dF) + 180) }], [...top2, { a: angL(180 + rot, deg(dC) + 180) }],
    [...inner, { a: tan(0.5) + 180 }]])) };
}
/** The bodice's own shoulder points (dress anchors 21, 22, 23, 0: round the shoulder's back, under the strap, over the
 *  shoulder's top, into the neckline) ride the clavicle and the chest while the strap rides the arm's contour, so wherever
 *  the shoulder turns (raised, or the trunk bent over a hanging arm) they stood out past the strap: an "ear" of dress at
 *  the back of the shoulder, a sliver with skin between at the front, the lumps Harry called "jagged and rough" (side-on
 *  round 8, squat, lean-counter; lesson 69). Raised, they go inside the strap's band (22 under the cap, 23 under the front,
 *  0 just inside the tip, so the neckline leaves the arm where the strap ends); in every pose, one still outside the strap
 *  is pulled onto it, a little inside (at rest none is: the standing shots are unchanged). */
export function strapDress(parts, ctx) {
  const d = parts.find((p) => p.id === 'dress')?.geom, sp = parts.find((p) => p.id === 'dress.strap'), s = sp?.geom;
  if (!d || !s) return;
  const e0 = armRaise(ctx.st, 'near'), k0 = Math.max(0, Math.min(1, (e0 - 30) / 30)), k = k0 * k0 * (3 - 2 * k0);
  if (k > 0) {
    const T = { 22: lerp(s.P[2], s.P[6], 0.55), 23: lerp(s.P[3], s.P[5], 0.55), 0: lerp(s.P[4], s.P[5], 0.3) };
    for (const [i, q] of Object.entries(T)) { const dv = mulS(sub(q, d.P[i]), k); for (const A of [d.P, d.hin, d.hout]) A[i] = add(A[i], dv); }
  }
  const n = s.P.length, poly = [];
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; for (let t = 0; t < 1; t += 1 / 24) poly.push(bez(s.P[i], s.hout[i], s.hin[j], s.P[j], t)); }
  const inside = (q) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  // (and the chest skin's shoulder end, anchor 5, where the trapezius meets the strap: past it, the skin's edge on down to
  // her back showed as a skin wedge between the dress's back and the strap, squat, round 8)
  const cs = parts.find((p) => p.id === 'chest.skin')?.geom;
  for (const [G, i] of [[d, 21], [d, 22], [d, 23], [d, 0], ...(cs ? [[cs, 5]] : [])]) {
    const q = G.P[i]; if (inside(q)) continue;
    const m = poly.reduce((b, p) => (Math.hypot(p[0] - q[0], p[1] - q[1]) < Math.hypot(b[0] - q[0], b[1] - q[1]) ? p : b)), v = sub(m, q), l = Math.hypot(...v);
    // onto the strap, as far inside as it was outside (≤ 0.012 H); within 0.003 H it is on the strap already (the rest
    // strap's front IS the dress's anchor 0) and is left, then eased in over the next 0.006 H so nothing jumps
    const r = Math.max(0, Math.min(1, (l - 0.003) / 0.006));
    if (r > 0) { const dv = mulS(add(v, mulS(v, Math.min(0.012, l) / l)), r); for (const A of [G.P, G.hin, G.hout]) A[i] = add(A[i], dv); }
  }
  // raised, the trapezius' end goes on in to the band's middle behind the arm's root, so the skin's edge down her back
  // (5 → 4) runs under the dress and the strap: ended at the strap's outer edge it still crossed the gap between the
  // dress's back and the band (a skin wedge behind the squat's shoulder)
  if (cs && k > 0) { const dv = mulS(sub(lerp(s.P[1], s.P[7], 0.6), cs.P[5]), k); for (const A of [cs.P, cs.hin, cs.hout]) A[5] = add(A[5], dv); }
}
