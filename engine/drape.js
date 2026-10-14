// drape.js — a skirt that HANGS and RIDES instead of moving as a rigid box with the hips (the review thread's stress
// sheet: "the skirt stays a tube, no lap", "a rigid box", "the dress is a stiff plank"). Side-on, in posed space:
//  · the FRONT and the BACK each HANG from the bodice (the bump's bottom, the back waist) by GRAVITY, with the cloth
//    length and the angle the master's skirt has standing (calibrate()), lying on whatever stands out in their way: the
//    front on the lap and over the knees when she sits, round a stepping knee; the back up and over the buttocks (on all
//    fours they rise above her back waist), down the backs of the thighs, onto a chair's seat or the floor
//  · the HEM runs from the front's end to the back's end, wrapping UNDER the thighs where they pass through it (sitting:
//    from the knee's top round under the thigh to the seat), with the master's rounded corners and gentle smile
//  · why not a ring round the thighs (v1): on all fours the front hangs from the bump in front of the thighs, not on them
//    (a full skirt's hem is far wider than her thighs); tied to the thighs, the hem rode up to her hips there
// Calibrated on the rest pose, so standing she keeps the master's skirt. Pure function of posed points.
import { loop, add, sub, mulS, norm, len, lerp } from './geom.js';

const DEG = 180 / Math.PI;
const front = (u) => [u[1], -u[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const ang = (v) => Math.atan2(v[1], v[0]) * DEG;

/** Shortest path P → Q keeping every point of `pts` on its inner side: the convex chain of the points that stand out past
 *  the chord PQ on the OUTER side (side +1: outer = the right of travel on screen, the front of a skirt going down a
 *  figure that faces right; −1: the left, its back). Points beyond either end of the chord don't bend it. */
export function wrap(P, Q, pts, side) {
  const d = sub(Q, P), L = len(d);
  if (L < 1e-9) return [P, Q];
  const t = mulS(d, 1 / L), n = mulS([t[1], -t[0]], side);
  const C = [[0, 0, P], [L, 0, Q]];
  for (const p of pts) { const r = sub(p, P), s = dot(r, t), h = dot(r, n); if (s > 1e-6 && s < L - 1e-6 && h > 1e-6) C.push([s, h, p]); }
  C.sort((a, b) => a[0] - b[0]);
  const H = [];
  for (const c of C) {
    while (H.length >= 2) { const a = H[H.length - 2], b = H[H.length - 1]; if ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) >= 0) H.pop(); else break; }
    H.push(c);
  }
  return H.map((c) => c[2]);
}
export const pathLen = (p) => p.slice(1).reduce((a, q, i) => a + len(sub(q, p[i])), 0);
/** n points evenly along a polyline by arc length (ends included) */
export function resample(p, n) {
  const L = pathLen(p), out = [];
  for (let k = 0; k < n; k++) {
    let s = (L * k) / (n - 1), i = 0;
    while (i < p.length - 2 && s > len(sub(p[i + 1], p[i]))) { s -= len(sub(p[i + 1], p[i])); i++; }
    const seg = len(sub(p[i + 1], p[i])) || 1;
    out.push(lerp(p[i], p[i + 1], Math.min(1, s / seg)));
  }
  return out;
}

/** Where a segment a → b first meets a floor (y = level, between x0 and x1): the parameter t, or 1 */
function hitFloor(a, b, floors) {
  let t = 1;
  for (const [x0, x1, y] of floors) {
    if ((a[1] - y) * (b[1] - y) >= 0 || a[1] >= y) continue;
    const u = (y - a[1]) / (b[1] - a[1]), x = a[0] + u * (b[0] - a[0]);
    if (x >= x0 && x <= x1 && u < t) t = u;
  }
  return t;
}
/** Cloth of length L hanging from W by gravity: it falls along g (straight down turned OUTWARD by phi: out = +1 the
 *  front, −1 the back), wrapping every support point that stands out past its line (the tangent from the current point
 *  to their convex hull, repeatedly), and stops on a floor (y = level between x0 and x1). Returns the path W → its end. */
export function hang(W, L, pts, out, phi, floors = []) {
  const g = [out * Math.sin(phi), Math.cos(phi)], n = [g[1] * out, -g[0] * out];
  const path = [W]; let cur = W, used = 0;
  for (let it = 0; it < 60; it++) {
    let best = null, bestA = 1e-4;
    for (const p of pts) {
      const r = sub(p, cur), s_ = dot(r, g), h = dot(r, n);
      // every support standing out past the line holds it, ABOVE the current point too: on all fours the buttocks rise
      // above the back waist and the cloth goes up over them (only below, it cut across the rump: a square corner)
      if (h <= 1e-6 || len(r) > L - used) continue;   // (a support beyond the cloth's end can't hold it)
      const a = Math.atan2(h, s_); if (a > bestA) { bestA = a; best = p; }
    }
    if (!best) break;
    const t = hitFloor(cur, best, floors), q = lerp(cur, best, t), d = len(sub(q, cur));
    if (used + d >= L) { path.push(add(cur, mulS(sub(q, cur), (L - used) / Math.max(d, 1e-9)))); return path; }
    path.push(q); used += d; cur = q;
    if (t < 1) return path;                                   // on a floor (sat on, or on the ground): it stops there
  }
  const end = add(cur, mulS(g, Math.max(0, L - used))), t = hitFloor(cur, end, floors);
  path.push(lerp(cur, end, t));
  return path;
}

/** what the cloth can lie on: the thighs' fronts and knees (front edge); the buttocks, the thighs' backs, the calves
 *  pressed under them and any props (back edge). Each stands off by `e` (the cloth over skin). */
export function supports(legs, seat, props, e) {
  const F = [], B = [...seat, ...(props || [])];
  for (const g of legs) {
    const nu = front(g.u);
    for (let f = 0; f <= 1.0001; f += 0.1) { F.push(add(g.TF(f), mulS(nu, e))); B.push(sub(g.TB(Math.min(f, g.fT)), mulS(nu, e))); }
    for (const k of g.knee) F.push(add(k, mulS(nu, e)));
    for (const f of [0.1, 0.25]) F.push(add(g.SF(f), mulS(front(norm(sub(g.SF(0.5), g.SF(0)))), e)));
    B.push(g.X); for (const f of [0.1, 0.25, 0.4]) B.push(g.SB(Math.max(f, g.fS)));
  }
  return { F, B };
}

/** the thighs' undersides inside the skirt (down to fraction fmax): what the hem wraps under (sitting: the lap's underside
 *  between the knee and the seat) */
function under(legs, fmax, e) {
  const B = [];
  for (const g of legs) { const nu = front(g.u); for (let f = 0.05; f <= fmax + 1e-9; f += 0.05) B.push(sub(g.TB(Math.min(f, g.fT)), mulS(nu, e))); if (fmax > 0.85) B.push(add(g.knee[1], mulS(nu, e))); }
  return B;
}
/** distance from p to a thigh's axis (hip → knee) and the nearest point on it */
const segDist = (p, g) => { const t = Math.max(0, Math.min(g.Lt, dot(sub(p, g.hip), g.u))), A = add(g.hip, mulS(g.u, t)); return [len(sub(p, A)), A]; };
const fracOn = (g, p) => Math.max(0, Math.min(1, dot(sub(p, g.hip), g.u) / g.Lt));

/**
 * @param o {Wf, Wb, legs, seat: [p] (the buttocks, posed), props: [p], floors: [[x0, x1, y]], top: [p] (inside her trunk,
 *   Wb → Wf), cal}   cal = {Lf, Lb, phiF, phiB, skin, hemDrop}: from calibrate() on the rest pose
 * @returns {{geom, Hf, Hb, pf, pb, hem}}   geom: a loop with 5 + nF + nB + top anchors
 */
export function skirt(o, nF = 6, nB = 10) {
  const { Wf, Wb, legs, cal } = o, S = supports(legs, o.seat, o.props, cal.skin), floors = [[-1e9, 1e9, 0], ...(o.floors || [])];
  const pf = hang(Wf, cal.Lf, S.F, 1, cal.phiF, floors), Hf = pf[pf.length - 1];
  let pb = hang(Wb, cal.Lb, S.B, -1, cal.phiB, floors), Hb = pb[pb.length - 1];
  // the TUBE: the skirt is a loop round her thighs, its hem only so much wider than them (cal.R: how far the master's back
  // hem stands off the nearer thigh's axis). Hung free, the back fell from the waist like a cape when she squats or bends
  // (the stills: the dress pulled taut over the buttocks, its hem round the thighs) and down the back of a birth ball
  // (the still: it rests on the ball's top). So its end is pulled in to that distance from the nearest thigh, and the back
  // runs taut from the waist over the buttocks to it. Standing, kneeling, on all fours, it hangs within reach: unchanged.
  if (cal.R) {
    const [d, A] = legs.map((g) => segDist(Hb, g)).sort((a, b) => a[0] - b[0])[0];
    if (d > cal.R) { Hb = add(A, mulS(sub(Hb, A), cal.R / d)); pb = wrap(Wb, Hb, S.B, -1); }
  }
  // the hem: the front's end round under any thigh that passes through it to the back's end (only the thighs above the
  // hem's front: standing, the legs below the hem stay outside)
  const fH = Math.max(...legs.map((g) => fracOn(g, Hf)));
  const hp = wrap(Hf, Hb, under(legs, fH, cal.skin), 1), hem = hp.length > 2 ? resample(hp, 5) : [Hf, lerp(Hf, Hb, 0.25), lerp(Hf, Hb, 0.5), lerp(Hf, Hb, 0.75), Hb];
  const F = resample(pf, nF), B = resample(pb, nB).reverse();   // F: Wf → Hf; B: Hb → Wb
  // the hem's shape: rounded corners and the smile under the skirt, on the side of the hem away from her (down at rest)
  const d = cal.hemDrop, nrm = (i) => { const q = norm(sub(hem[Math.min(4, i + 1)], hem[Math.max(0, i - 1)])); return [q[1], -q[0]]; };
  const t0 = norm(sub(hem[1], hem[0])), t4 = norm(sub(hem[4], hem[3])), n0 = nrm(0), n2 = nrm(2), n4 = nrm(4);
  const A_ = [];
  A_.push([...Wf, { c: true, ti: 0.4, to: 0.6 }]);
  for (let i = 1; i < nF - 1; i++) A_.push([...F[i]]);
  A_.push([...Hf, { a: ang(sub(Hf, F[nF - 2])) }]);
  A_.push([...add(add(Hf, mulS(n0, 0.85 * d)), mulS(t0, 0.04)), { a: ang(add(mulS(t0, 0.94), mulS(n0, 0.34))), t: 0.7 }]);
  A_.push([...add(hem[2], mulS(n2, 1.02 * d)), { a: ang(norm(sub(hem[3], hem[1]))) }]);
  A_.push([...add(add(Hb, mulS(n4, 0.6 * d)), mulS(t4, -0.04)), { a: ang(add(mulS(t4, 0.94), mulS(n4, -0.34))), t: 0.7 }]);
  A_.push([...Hb, { a: ang(sub(B[1], Hb)) }]);
  for (let i = 1; i < nB - 1; i++) A_.push([...B[i]]);
  A_.push([...Wb, { c: true, ti: 0.6, to: 0.4 }]);
  for (const p of o.top) A_.push([...p]);
  return { geom: loop(A_), Hf, Hb, pf, pb, hem };
}

/** Rest calibration: each edge's cloth length and the angle it leaves its last support at (the taut cloth from where it
 *  leaves the bodice to the master's hem corner, hemFront / hemBack, round the supports), and the hem's drop below them */
export function calibrate(o, { hemFront, hemBack, hemY, skin = 0.02 }) {
  const S = supports(o.legs, o.seat, [], skin);
  const edge = (W, H, side) => { const pw = wrap(W, H, side > 0 ? S.F : S.B, side), T = pw[pw.length - 2]; return { L: pathLen(pw), phi: Math.atan2(side * (H[0] - T[0]), H[1] - T[1]) }; };
  const ef = edge(o.Wf, hemFront, 1), eb = edge(o.Wb, hemBack, -1);
  const R = 1.15 * Math.min(...o.legs.map((g) => segDist(hemBack, g)[0]));
  return { Lf: ef.L, phiF: ef.phi, Lb: eb.L, phiB: eb.phi, skin, hemDrop: hemY - (hemFront[1] + hemBack[1]) / 2, R };
}
