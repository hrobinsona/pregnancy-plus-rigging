// drape.js — a skirt that HANGS and RIDES instead of moving as a rigid box with the hips (the review thread's stress
// sheet: "the skirt stays a tube, no lap", "a rigid box", "the dress is a stiff plank"). Side-on, in posed space:
//  · the FRONT and the BACK each HANG from the bodice (the bump's bottom, the back waist) by GRAVITY, with the cloth
//    length and the angle the master's skirt has standing (calibrate()), lying on whatever stands out in their way: the
//    front on the lap and over the knees when she sits, round a stepping knee; the back up and over the buttocks (on all
//    fours they rise above her back waist), down the backs of the thighs, onto a chair's seat or the floor
//  · the HEM runs from the front's end to the back's end, wrapping UNDER the thighs where they pass through it (sitting:
//    from the knee's top round under the thigh to the seat), with the master's rounded corners and gentle smile
//  · the TUBE: when the thighs point forward (sitting, squatting, bending), the hem goes round them where the back's cloth
//    runs out along their undersides, and the front lies taut on them (skirt(): gravity alone made a cape and a tent)
//  · why not always a ring round the thighs (v1): on all fours the front hangs from the bump in front of the thighs, not
//    on them (a full skirt's hem is far wider than her thighs); tied to the thighs, the hem rode up to her hips there
// Calibrated on the rest pose, so standing she keeps the master's skirt. Pure function of posed points.
import { loop, add, sub, mulS, norm, len, lerp } from './geom.js';

const DEG = 180 / Math.PI;
const front = (u) => [u[1], -u[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const ang = (v) => Math.atan2(v[1], v[0]) * DEG;
const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

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
export function hang(W, L, pts, out, phi, floors = [], climb = true) {
  const g = [out * Math.sin(phi), Math.cos(phi)], n = [g[1] * out, -g[0] * out];
  const path = [W]; let cur = W, used = 0;
  for (let it = 0; it < 60; it++) {
    let best = null, bestA = 1e-4;
    for (const p of pts) {
      const r = sub(p, cur), s_ = dot(r, g), h = dot(r, n);
      // every support standing out past the line holds it, ABOVE the current point too: on all fours the buttocks rise
      // above the back waist and the cloth goes up over them (only below, it cut across the rump: a square corner)
      if (h <= 1e-6 || len(r) > L - used) continue;   // (a support beyond the cloth's end can't hold it)
      if (!climb && s_ < -1e-6) continue;              // (the front can't climb: on all fours the thighs stand above the bump's bottom, and the cloth went up to them)
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

/** the thighs' undersides inside the skirt (down to fraction fmax, one per leg or one for both): what the hem wraps under (sitting: the lap's underside
 *  between the knee and the seat) */
function under(legs, fmax, e) {
  const B = [];
  legs.forEach((g, i) => { const fm = Array.isArray(fmax) ? fmax[i] : fmax, nu = front(g.u);
    for (let f = 0.05; f <= fm + 1e-9; f += 0.05) B.push(sub(g.TB(Math.min(f, g.fT)), mulS(nu, e))); if (fm > 0.85) B.push(add(g.knee[1], mulS(nu, e))); });
  return B;
}
const fracOn = (g, p) => Math.max(0, Math.min(1, dot(sub(p, g.hip), g.u) / g.Lt));

/** where the front leaves the bump: walking down its underside `u` (posed points, apex → the bodice's bottom W), the cloth
 *  follows it while it turns back from plumb by less than LEAVE and falls from where it turns further (interpolated, so a
 *  move slides it smoothly). Standing the underside turns back 34° at most (the master's skirt from W, unchanged); leaning
 *  on a counter 73°, squatting 68°, on all fours over 90° (it rises again behind the bump's lowest point). Faded in over
 *  the first LEAVE_FADE degrees past LEAVE (a pitch that just crosses doesn't jump the skirt up the bump). */
export const LEAVE = 55, LEAVE_FADE = 10;
/** ON ALL FOURS (skirt(), below): how far the side panel's hem hangs below the bump's lowest point (H), and how far down the
 *  thigh its back corner rides, as a fraction of the standing reach (cal.fs), and how far behind the bump's lowest point the
 *  panel's front edge leaves its underside; flare: how far its back edge turns out from plumb (rad; 0.2 hung it straight
 *  down, the still flares ~16°): measured on the all-fours still */
export const AF = { drop: 0.25, back: 0.62, edge: 0.35, flare: 0.3 };
// KNEES APART (squatting): how much less of the near thigh the side's hem covers than sitting, top and underside (as a
// fraction of the thigh). 0.4 / 0.2 left the thigh bare from its root, "a balloon, the whole near thigh bare back to the
// seat", round 6, every lens: the squat still's hem crosses the thigh's top ~0.75 along and its underside ~0.5; at 0.1
// the hem covered the thigh nearly to the knee, round 10: 0.2 picked beside the still at film size)
export const SQ = { top: 0.2, bot: 0.05, bow: 0.08 };
// ... and the TAIL: the skirt's slack hangs below the thighs as a point, the back falling from the seat's fullest point
// to it and the side panel's front edge a fold from the hem's crossing on the thigh's underside down to it (the squat
// still: 0.15 H behind that crossing and 0.39 H below it, the inside of the skirt dark in front of the fold). Wrapped round
// the seat's bottom to the thigh's underside, the back drew the buttocks as a round bag with a knob at its corner, "a
// balloon", round 6. (H, screen axes: back, down.) At 0.15 behind and 0.39 below the tail hung to mid-shin, "a sack with
// a tail… the still's cloth taut over the seat, the hem just below the thighs" (round 10, every lens): 0.05 and 0.22
// picked beside the still at film size (side_zoom --try, clothTry.sq)
SQ.tail = [-0.05, 0.22];
export const KP = { pull: 0.27, bow: 0.06 };
export const SEATED = { drop: 0.45 };
// (each of SQ, KP, AF, SEATED is overridden for one pose by pose.fx.clothTry.sq / .kp / .af / .seated: fitted to the pose's
// still's dress outline with tools/cloth_fit.py; KP.drop lowers or raises the kneeling back corner, H)
// the back's cloth from its fullest point (screen back) to a hem point T below: a cubic leaving the seat straight down and
// arriving along its chord, its second handle bowed in toward her by `bow` of the chord (the stills' outline turns in
// under the buttocks: the seat rounds into one long diagonal, an S)
function toward(pb, T, bow) {
  let k = 0; pb.forEach((q, i) => { if (q[0] < pb[k][0] - 1e-9) k = i; });
  const P = pb[k], c = len(sub(T, P)) || 1e-6, ch = mulS(sub(T, P), 1 / c), C1 = add(P, [0, 0.4 * c]), C2 = add(lerp(T, P, 0.35), mulS([ch[1], -ch[0]], bow * c)), cub = [];
  for (let i = 1; i <= 6; i++) { const u = i / 6, v = 1 - u; cub.push([0, 1].map((j) => v * v * v * P[j] + 3 * v * v * u * C1[j] + 3 * v * u * u * C2[j] + u * u * u * T[j])); }
  return [...pb.slice(0, k + 1), ...cub];
}
export function leave(u, W) {
  if (!u || u.length < 3) return W;
  const a = u.map((_, k) => { const d = sub(u[Math.min(k + 1, u.length - 1)], u[Math.max(k - 1, 0)]); return Math.atan2(-d[0], d[1]) * DEG; });
  const mx = Math.max(...a), w = smooth(0, LEAVE_FADE, mx - LEAVE);
  if (w <= 0) return W;
  let p = u[0];
  if (a[0] < LEAVE) for (let k = 1; k < u.length; k++) if (a[k] >= LEAVE) { p = lerp(u[k - 1], u[k], (LEAVE - a[k - 1]) / (a[k] - a[k - 1])); break; }
  return lerp(W, p, w);
}

/**
 * @param o {Wf, Wb, legs, pitch (the trunk's forward pitch from standing, radians; optional), seat: [p] (the buttocks, posed), bump: [p] (the bump's outline below Wf, posed), props: [p], floors: [[x0, x1, y]], top: [p] (inside her trunk,
 *   Wb → Wf), hug: [p] (optional: the back's cloth fitted to her, Wb → the seat's fullest point, from where it hangs), hugFrom
 *   (the hug's first point on the seat), tuck: [x, y] (the bump's underside's direction where it meets the skirt), cal}
 *   cal = {Lf, Lb, phiF, phiB, skin, hemDrop}: from calibrate() on the rest pose (with the same hug)
 * @returns {{geom, Hf, Hb, pf, pb, hem}}   geom: a loop with 5 + nF + nB + top anchors
 */
export function skirt(o, nF = 6, nB = 16) {   // (nB: the back runs over the hug and the seat, ~2 H on all fours: at 10 the round of the seat fell between samples)
  const { Wb, legs, cal } = o, S = supports(legs, o.seat, o.props, cal.skin), floors = [[-1e9, 1e9, 0], ...(o.floors || [])];
  // the HUG: a stretch dress is FITTED down her back, in at the small of the back and round the buttocks to their fullest
  // point, and hangs free only below that (o.hug, the character's: Wb → B). Hung from the back waist, the taut cloth ran
  // straight from the waist to the seat's tangent: the back a ramp, a ruler from the waist to the hem (side-on round 5,
  // every lens). The back's cloth below B is what's left of its length.
  // (o.hugFrom: where the hug starts to lie ON the seat. From the seat's fullest point the cloth went straight on over a
  // support standing out below it (the top of the thigh's back, on all fours 0.07 H past it): a notch at the junction, the
  // rump read as a knob. Taut, it leaves the seat where one straight line touches both)
  const hug = o.hug?.length > 1 ? o.hug : [Wb], B0 = hug[hug.length - 1], LbF = Math.max(0.05, cal.Lb - pathLen(hug));
  const withHug = (p) => { const q = [...hug.slice(0, -1), ...p], i0 = o.hugFrom, j = hug.length;
    if (!(i0 >= 0 && i0 < j - 1) || q.length <= j) return q;
    return [...q.slice(0, i0), ...wrap(q[i0], q[j], q.slice(i0 + 1, j), -1), ...q.slice(j + 1)]; };
  // where the front LEAVES the bump (leave()): standing, the cloth follows the bump's underside in to the bodice's bottom
  // (o.Wf); with the trunk pitched forward (leaning on a counter, squatting, on all fours) that underside turns back under
  // her, the cloth can't follow it in, and hung from the bodice's bottom the skirt tucked back under the bump: a hard
  // inward corner (critic R3: "the front falls plumb from the bump"). The skirt drawn over the bodice covers the hollow
  // behind that point (same cloth). The hem keeps its height: the front's cloth is longer by the height it leaves above.
  let Wf = leave(o.under, o.Wf); const Lf = cal.Lf + (o.Wf[1] - Wf[1]);
  const SF = [...S.F, ...(o.bump || [])];   // the front lies over the bump below where it leaves the bodice (on all fours the bump's lowest point)
  // ONE THIGH FORWARD (kneeling on one knee, the far foot planted ahead): the front lies along the forward thigh and the
  // back hangs down the upright near one as standing; with both forward (sitting, squatting) the near thigh carries both
  // (the near one alone drove it: a kneeling near thigh took the lap's diagonal, the hem a column down it to the floor)
  const wl = legs.map((g) => smooth(40, 70, Math.acos(Math.max(-1, Math.min(1, g.u[1]))) * DEG)), w = Math.max(...wl);
  // (the back on the near thigh, unless the near leg is the forward one and the far one kneels: then it hangs down the far)
  const iF = wl.length > 1 && wl[1] > wl[0] + 1e-9 ? 1 : 0, iB = wl.length > 1 && wl[0] > wl[1] + 0.3 ? 1 : 0, wB = wl[iB];
  // the STRIDE: walking, her legs apart spread the skirt inside: its hem is a ring of fixed length round both legs, so each
  // edge leaves its support at a wider angle, the back most (it swings out behind the back leg; the stills' walks flare
  // into an A, ours hung straight as a tube, critic R1 "no A-line flare or swing in the walks"). By the angle between the
  // thighs, standing (and folded poses, below) unchanged. o.swing (pose fx.skirtSwing, radians): the skirt trailing behind
  // her as she walks (momentum), which the stride alone can't show at the passing position (legs together, the still's
  // skirt still an A).
  const spread = legs.length > 1 ? Math.acos(Math.max(-1, Math.min(1, dot(legs[0].u, legs[1].u)))) : 0, sw = smooth(4 / DEG, 40 / DEG, spread) * spread * (1 - w);
  // (a stride of HANGING legs: with a thigh forward the spread is a kneel or a lunge, not a step, and the flare threw the back
  // out level behind her)
  // The flare turns the cloth out only BELOW the body it hangs on: the back over the back waist and round the buttocks as
  // standing, the front over the bump, and from where each leaves them it falls turned out by the stride, round the legs
  // (turned out from the waist, the back cleared the buttocks and fell straight from the back waist: a cape, a lampshade,
  // critic R3)
  // (0.9·sw + 0.8·sg flared the back 22° from plumb in walk-pass and the front 6°: an A-line lampshade with no seat under
  // it; the walk stills hang the back ~10° from her seat's round and the front about plumb from the bump, round 6)
  // WALKING the front flares too (o.frontWalk, radians, by the stride or the swing): the forward thigh and the swing carry
  // the front out, and below where it leaves the bump it falls turned forward, the hem's front nearly under the bump's
  // (the walk stills: 3–20 px behind it at film size); at 0.15·sw + 0.1·sg it fell plumb from the tuck, 35–40 px behind,
  // "the front slants in under the bump" (side-on round 10, every lens; 0.2 picked beside the stills with side_zoom --try).
  // Standing: no stride, no swing, unchanged
  const walk = Math.max(smooth(4 / DEG, 25 / DEG, spread) * (1 - w), smooth(0, 0.1, o.swing ?? 0));
  const sg = o.swing ?? 0, flF = 0.15 * sw + 0.1 * sg + (o.frontWalk ?? 0) * walk, flB = 0.4 * sw + 0.5 * sg, phiB = cal.phiB + flB;
  const upB = [...(o.seat || []), ...(o.props || [])], upF = o.bump || [];
  const drop = (W, L, up, all, out, phi, fl, climb) => {
    if (!fl) return hang(W, L, all, out, phi, floors, climb);
    // (below the body it hangs on the turned-out cloth falls, it can't climb: turned out by the stride, the line leaned back
    // so far that the buttock it had just left stood "out past" it, and the back went down the seat and back UP it, then
    // ran out at the top of the thighs: walk-pass's hem 0.4 H below her hip, a mini skirt, round 5)
    const a = hang(W, L, up, out, phi, floors, climb), head = a.length > 2 ? a.slice(0, -1) : [W], used = pathLen(head);
    return [...head, ...hang(head[head.length - 1], L - used, all, out, phi + fl, floors, false).slice(1)];
  };
  // GRAVITY: the front from the bump, the back from the back waist, each hanging over what stands out in its way
  let pf = drop(Wf, Lf, upF, SF, 1, cal.phiF, flF, false), Hf = pf[pf.length - 1];
  let pb = withHug(drop(B0, LbF, upB, S.B, -1, cal.phiB, flB, true)), Hb = pb[pb.length - 1];
  // the HEM is one ring: hanging, its front and back stay near one height. On all fours the back's cloth goes up over the
  // rump and ends at mid-thigh, so the front can't hang on from the bump to the floor (it did: a box); the ring holds it
  // up level with the back (the still: the hem level from the bump's bottom to the back of the thighs), the rest of the
  // front's cloth slack over the bump. Standing, the two ends are level already: unchanged.
  const level = (W, L, up, pts, out, phi, fl, climb, y, k = 0) => { let lo = 0.05 * L, hi = L;
    for (let it = 0; it < 24; it++) { const m = (lo + hi) / 2, e = drop(W, m, up, pts, out, phi, fl, climb); if (e[e.length - 1][1] > y) hi = m; else lo = m; }
    return drop(W, lo + (L - lo) * k, up, pts, out, phi, fl, climb); };
  // (the forward thigh holds up only the FRONT of the ring: kneeling on one knee, the back hangs free down the upright near
  // thigh and the hem runs from the forward thigh down and back across it, as the still draws it; levelled, the back rode
  // up above her hip)
  const free = smooth(0.3, 0.8, wl[iF] - wB);
  const SLACK = 0.12;
  if (Hf[1] > Hb[1] + SLACK) { pf = level(Wf, Lf, upF, SF, 1, cal.phiF, flF, false, Hb[1] + SLACK); Hf = pf[pf.length - 1]; }
  else if (Hb[1] > Hf[1] + SLACK) { pb = withHug(level(B0, LbF, upB, S.B, -1, cal.phiB, flB, true, Hf[1] + SLACK, free)); Hb = pb[pb.length - 1]; }
  // the TUBE: the skirt is a loop round her thighs. When they point forward (sitting, squatting, bending to the floor)
  // gravity no longer keeps the hem below them: hung free, the back fell from the waist like a cape behind a squat and the
  // front dropped over the knees and hid them (round 1: "a tent", "only the far knee comes forward"). The stills: the back
  // runs taut from the waist over the buttocks to under the thighs, the front lies along the thighs' tops, and the hem
  // crosses the thighs between where each runs out: each panel's cloth length fixes how far along the (near) thigh it
  // reaches (the squat still: the front halfway to the knee, the back at the buttocks' bottom, the hem a diagonal between).
  // Blended in by how far the thighs point forward of straight down (40° → 70°), so a sit-down move passes through it
  // smoothly; standing, kneeling, on all fours: unchanged.
  let side = null;
  if (w > 0) {
    const g = legs[iF], gB = legs[iB], nu = front(g.u), back = (f) => sub(gB.TB(Math.min(f, gB.fT)), mulS(front(gB.u), cal.skin)), top = (f) => add(g.TF(f), mulS(nu, cal.skin));
    const reach = (Lfn, L, f0, f1) => { let a = f0, b = f1;   // how far along the thigh a panel of length L reaches (taut)
      if (Lfn(b) <= L) return b; if (Lfn(a) >= L) return a;
      for (let it = 0; it < 30; it++) { const m = (a + b) / 2; if (Lfn(m) < L) a = m; else b = m; }
      return (a + b) / 2; };
    // the front lies over the bump only BELOW where it leaves the bodice (above, the bodice is the bump): sitting, the bump's
    // bottom sinks into the lap and the taut front went back up over the bump's front to reach the thigh, so its cloth ran
    // out at the hip (round 2: "the skirt stops at the hip crease, the whole thigh bare"; the stills: it lies along the thigh
    // to 40–60 px short of the knee)
    // and on the thigh only AHEAD of where the bump meets it: the bump's bottom sits down in the lap, below the near thigh's
    // top in profile, and the cloth runs on forward from there (wrapping the thigh's top behind it, it went back to the hip)
    const f0 = fracOn(g, Wf), SFt = [...S.F.filter((p) => fracOn(g, p) >= f0), ...(o.bump || []).filter((p) => p[1] >= Wf[1] - 1e-6)];
    const fb = reach((f) => pathLen(wrap(B0, back(f), S.B, -1)), LbF, 0.05, 1);
    // (the cloth from the bump's bottom up to the thigh's top is TUCKED in the fold where the bump sits on her lap: it isn't
    // spent along the thigh. Counted, the skirt ended a third of the way along the thigh, the rest bare to the knee; the
    // sitting stills cover it to 40–60 px short of the knee, round 6)
    const tuck = Math.max(0, dot(sub(Wf, top(f0)), mulS(nu, -1)));
    const ff = reach((f) => pathLen(wrap(Wf, top(f), SFt, 1)) - tuck, Lf, Math.min(0.85, Math.max(0.05, f0)), 0.85);   // (ahead of where the bump meets the thigh: behind it the path grows back toward the hip)
    Hb = lerp(Hb, back(fb), wB); Hf = lerp(Hf, top(ff), w);
    if (wB > 0) pb = withHug(wrap(B0, Hb, S.B, -1));
    pf = w > 0.5 ? wrap(Wf, Hf, SFt, 1) : wrap(Wf, Hf, SF, 1);
    // BETWEEN THE KNEES: squatting or bending, the bump settles down between the thighs, its bottom below the near thigh's
    // top; the front's cloth can't lie on a lap there (it went back to the hip: bend-pick's skirt a box round the seat), it
    // spans from knee to knee as a curtain just under the bump (the stills: the dark inside of the skirt between the knees)
    // (knees together, sitting, the bump rests on the lap and the front lies along it: o.apart, the knees' spread, is a 3D
    // fact the profile can't show, set by the pose: fx.kneesApart)
    const dn = dot(sub(Wf, top(f0)), mulS(nu, -1)), bt = smooth(0.05, 0.3, dn) * w * (o.apart ?? 0);
    // (the curtain itself is drawn by the character, from side.apart: the dark inside of the skirt hanging below the near
    // thigh between the knees; dropped 0.15 here, the front stuck out below the bump as a little flap, round 3)
    if (bt > 0) { const C = add(Wf, [0, 0.02]); Hf = lerp(Hf, C, bt); pf = bt > 0.5 ? [Wf, Hf] : pf.map((q, i) => (i === pf.length - 1 ? Hf : q)); }
    // the SIDE: the cloth on the near thigh's outer face hangs from her side (her waist above the hip) and reaches along the
    // thigh as far as it does standing (cal.fs); with the thigh forward the hem crosses it on a DIAGONAL, from the thigh's top
    // ahead of that point down and back to its underside (the sitting and squatting stills: the hem from ~0.85 of the thigh
    // on top to ~0.4 below). What of the near leg the cloth covers (parts: the lap) is decided by this line.
    // (knees apart, squatting or bending: the cloth is drawn up round the bump and the seat and crosses the near thigh about
    // halfway, its outer half and the knee bare, as both stills draw it; at the sitting reach the dress hid the thighs to the
    // knee and the folded legs read as a dress blob, round 4)
    const sq = { ...SQ, ...(o.sq || {}) };   // (o.sq: one pose's or one character's squat shape, e.g. pose.fx.clothTry)
    const dl = 0.25 * w, fsT = Math.min(0.92, cal.fs + dl) - sq.top * bt, fsB = Math.max(0.05, cal.fs - dl - sq.bot * bt);
    // (bot: where the hem crosses the NEAR thigh's underside, what parts draw the lap from; kneeling on one knee with the
    // near leg forward the back hangs down the far one, and a hem end on the far leg cut a wedge out of the near thigh)
    let g0 = legs[0], bot = iB === 0 ? back(fsB) : sub(g0.TB(Math.min(fsB, g0.fT)), mulS(front(g0.u), cal.skin));
    // SEATED ON SOMETHING (a ball, a chair: o.floors, not the ground) the side panel doesn't stop at the thigh's underside:
    // it falls from there onto what she sits on, its hem corner resting on it and the hem running back along it to the
    // seat (the sit-ball still: 0.35 H below the thigh, down the ball's front; ended at the thigh, the seat sat on a shelf,
    // "a balloon on a ball", round 6). Only within SEATED.drop below the thigh
    const fl = (o.floors || []).filter(([x0, x1, y]) => bot[0] >= x0 && bot[0] <= x1 && y > bot[1] && y - bot[1] < (o.seated?.drop ?? SEATED.drop));
    const rest = fl.length ? [bot[0], Math.min(...fl.map((f) => f[2]))] : null;
    if (rest && w > 0.5) bot = rest;
    side = { top: top(fsT), bot, w, wb: wl[0], apart: bt, backOff: iB !== 0, rest: rest && w > 0.5 ? rest : null };
    if (bt > 0) { const T = lerp(Hb, add(bot, sq.tail), bt); pb = toward(pb, T, sq.bow); Hb = T; side.tail = T; }
    // kneeling on ONE knee with the near thigh forward (the back on the kneeling far leg, iB 1): the forward thigh lifts the
    // tube's front and pulls its back in under the seat, the hem's back corner KP.pull ahead of the seat's fullest point
    // (the kneel-pick still: 0.27 H; hung plumb from the seat the back read as "a cape", round 6)
    else if (iB !== 0) { const kp = { ...KP, ...(o.kp || {}) }, T = add(Hb, [kp.pull * free, kp.drop ?? 0]); pb = toward(pb, T, kp.bow); Hb = T; }
    if (globalThis.__DRAPE_DBG) globalThis.__drape = { w, fb, ff, f0, dn, bt, fs: cal.fs, Lf: Lf, Lb: cal.Lb, thighL: g.Lt };
  }
  // ON ALL FOURS the back's cloth climbs from the back waist up over the buttocks (they stand above it) and the hem is a
  // ring far wider than her thighs: the skirt's outline behind her is its SIDE, hanging free from the buttocks' back and
  // flared a little, its hem crossing the thigh no lower than it does standing (cal.fs along it) nor than the front's end,
  // and rising a little to the back corner (the all-fours still: the skirt flares off the rump, the hem runs from that corner across the thigh down
  // to under the bump). Hung as the centre back, its cloth ran out at the top of the thigh and the hem ran down the
  // thigh's back: shorts, not a skirt (round 3). Standing, kneeling, sitting: the back never climbs, unchanged.
  // (by the trunk's pitch, o.pitch, when the character gives it: by how far the back's cloth rose above the back waist it
  // hung on how deep the lumbar curve was drawn, and a shallower lumbar turned all fours back into a box, its hem level
  // from the bump's bottom to the back of the knees)
  const rise = Wb[1] - Math.min(...pb.map((q) => q[1])), cl = (o.pitch === undefined ? smooth(0.03, 0.15, rise) : smooth(50 / DEG, 70 / DEG, o.pitch)) * (1 - w);
  // ... and its FRONT is that side panel too, hanging BELOW the bump: the still's hem runs on down from the back corner to
  // ~0.3 H under the bump's round bottom, the panel's front edge a fold falling from the bump's underside, the bump round
  // in front of it. Levelled at the bump's bottom (round 4), the hem ran flat from the bump to the back of the knees and
  // bump, skirt and thighs read as one box ("bump and skirt one wedge"). The back corner rides up the thigh to ~0.45 of it
  // (the still), the hem a diagonal down to the front; the front no lower than the thigh at its standing reach (cal.fs).
  let fold = null;
  if (cl > 0) {
    const af = { ...AF, ...(o.af || {}) }, g = legs[0], phi = phiB + af.flare, gv = [-Math.sin(phi), Math.cos(phi)], nb = [-gv[1], gv[0]];   // nb: out behind her, across the fall
    // (the panel's front edge AF.edge behind the bump's lowest point, on its underside: the still shows the bump's whole round
    // bottom in front of the cloth; at the lowest point the panel hid its back half and the bump read as a wedge's corner)
    const lowB = (o.bump || []).reduce((m, q) => (q[1] > m[1] ? q : m), Wf), u = o.under || [];
    const e = u.find((q) => q[0] < lowB[0] - af.edge && q[1] < lowB[1]) || Wf;
    Wf = lerp(Wf, e, cl);
    const HfA = [Wf[0] - 0.04, Math.min(lowB[1] + af.drop, g.TB(Math.min(cal.fs, g.fT))[1])];
    Hf = lerp(Hf, HfA, cl); pf = [Wf, Hf];
    fold = { a: Wf, b: Hf, k: cl };
    let k = 0; pb.forEach((q, i) => { if (dot(q, nb) > dot(pb[k], nb) + 1e-9) k = i; });
    const P = pb[k], yc = g.TB(Math.min(cal.fs, g.fT) * af.back)[1], H2 = add(P, mulS(gv, Math.max(0, (yc - P[1]) / gv[1])));
    const onLine = (q) => add(P, mulS(gv, dot(sub(q, P), gv)));
    pb = pb.map((q, i) => (i <= k ? q : i === pb.length - 1 ? lerp(q, H2, cl) : lerp(q, onLine(q), cl)));
    if (k === pb.length - 1) pb.push(lerp(P, H2, cl));
    Hb = pb[pb.length - 1];
    if (globalThis.__DRAPE_DBG) globalThis.__drape = { cl, rise, k, P, yc, fs: cal.fs, phiB };
  }
  // the hem: the front's end round under any thigh that passes through it to the back's end (only the thighs above the
  // hem's front: standing, the legs below the hem stay outside)
  // ... and in the TUBE the hem crosses the thigh on a DIAGONAL: the skirt's side hangs from the hip down the thigh's outer
  // face, shorter along the thigh than its front, so the hem runs from the front's end on the thigh's top down and back to
  // its underside about a thigh's depth behind (the sitting and squatting stills: ~0.6 H back over the thigh's ~0.6 H
  // depth); straight down from the front's end, the cloth drew a box round the lap
  // (each thigh as far down as the hem's front reaches along IT: by the furthest of the two, kneeling up the higher far
  // hip carried the near thigh's back 0.2 H below the hem and the hem wrapped under it, a bowl with its back corner
  // kicked up, round 6)
  const fH = legs.map((g) => { let f = fracOn(g, Hf);
    if (w > 0) { const dep = len(sub(g.TF(f), g.TB(Math.min(f, g.fT)))); f = Math.max(0.05, f - w * 0.95 * dep / g.Lt); }
    return f * (1 - cl); });   // (on all fours the hem crosses the thighs: it doesn't wrap them)
  // (with a tail the hem runs under the thighs to its crossing on the near one's underside, then down the fold to the point;
  // straight from the bump's bottom to that crossing it left the far thigh showing in a sliver above the near one)
  // (resting on a seat, from the thigh's top down to where the panel rests, then back along the seat's floors to the back)
  const onSeat = () => { const out = [Hf, side.rest], n = 6; for (let i = 1; i < n; i++) { const x = lerp(side.rest, Hb, i / n)[0], f = (o.floors || []).filter(([x0, x1]) => x >= x0 && x <= x1);
    out.push([x, f.length ? Math.min(...f.map((q) => q[2])) : lerp(side.rest, Hb, i / n)[1]]); } out.push(Hb); return out; };
  const hp = side?.tail && side.apart > 0.5 ? [...wrap(Hf, side.bot, under(legs, fH, cal.skin), 1), Hb] : side?.rest ? onSeat() : wrap(Hf, Hb, under(legs, fH, cal.skin), 1), hem = hp.length > 2 ? resample(hp, 5) : [Hf, lerp(Hf, Hb, 0.25), lerp(Hf, Hb, 0.5), lerp(Hf, Hb, 0.75), Hb];
  const F = resample(pf, nF), B = resample(pb, nB).reverse();   // F: Wf → Hf; B: Hb → Wb
  // the hem's shape: rounded corners and the smile under the skirt, on the side of the hem away from her (down at rest)
  const d = cal.hemDrop * (1 - 0.8 * w), nrm = (i) => { const q = norm(sub(hem[Math.min(4, i + 1)], hem[Math.max(0, i - 1)])); return [q[1], -q[0]]; };
  const t0 = norm(sub(hem[1], hem[0])), t4 = norm(sub(hem[4], hem[3])), n0 = nrm(0), n2 = nrm(2), n4 = nrm(4);
  const A_ = [];
  // the TUCK: where the bump meets the skirt the cloth runs on along the bump's underside (o.tuck, its direction there) and
  // turns down into the skirt's front, a soft inner round as the master draws it; set off straight down from the bump's
  // bottom it met the bump at a hard inner corner (side-on round 5 "a soft tuck where the bump meets the skirt")
  // (halfway between the bump's line and the skirt's own: along the bump's alone, the front dipped in past the thigh,
  // which showed through as a sliver, then bulged back out, round 6)
  // (where the cloth LEAVES the bump higher up (leaning on a counter, squatting) the same: along the underside there, o.under)
  let tuck = o.tuck;
  if (o.under?.length > 2 && len(sub(Wf, o.Wf)) >= 0.01) { const u = o.under; let k = 1; u.forEach((q, i) => { if (i > 0 && i < u.length - 1 && len(sub(q, Wf)) < len(sub(u[k], Wf))) k = i; }); tuck = norm(sub(u[k + 1], u[k - 1])); }
  const tk = tuck && cl < 0.5 ? { ao: ang(norm(add(tuck, norm(sub(F[1], Wf))))), to: 0.7 } : {};
  A_.push([...Wf, { c: true, ti: 0.4, to: 0.6, ...tk }]);
  for (let i = 1; i < nF - 1; i++) A_.push([...F[i]]);
  A_.push([...Hf, { a: ang(sub(Hf, F[nF - 2])) }]);
  // the CORNERS are crisp, the side edges running straight on down into them (the master's hem: a small round at each
  // corner; the stills' too): rounded off over 0.04 H, with the tangent already along the hem, they read as a bowl, a
  // lampshade, a sack (side-on round 4, all three lenses)
  A_.push([...add(add(Hf, mulS(n0, 0.85 * d)), mulS(t0, 0.012)), { c: true, ti: 0.3, to: 0.6 }]);
  // (RESTING ON A SEAT, o.seatCorner 0..1: the panel's corner where it meets the seat is a corner too, the hem running
  // straight from the thigh down to it and straight back along the seat (the sit-ball still: a V under the thigh); one
  // smooth point midway drew a U, "a pouch under the thigh", round 10)
  const sc = side?.rest ? (o.seatCorner ?? 0) : 0;
  if (sc > 0) A_.push([...lerp(add(hem[2], mulS(n2, 1.02 * d)), side.rest, sc), { c: true, ti: 0.6 - 0.3 * sc, to: 0.6 - 0.3 * sc }]);
  else A_.push([...add(hem[2], mulS(n2, 1.02 * d)), { a: ang(norm(sub(hem[3], hem[1]))) }]);
  // (a squat's TAIL, o.tailRound 0..1: the back's cloth leaves the tail's point turned from straight up the back toward
  // level, by tailRound, so the curtain's bottom is ONE round from the back into the inside's lower edge (the character
  // draws the inside, its point leaving level too: side.tailDir), the fold meeting it at a crisp inner corner, as the
  // squat still draws it; with the back's own line the two met at ~40° and drew a pointed tail, "a sack with a tail")
  A_.push([...add(add(Hb, mulS(n4, 0.6 * d)), mulS(t4, -0.012)), { c: true, ti: 0.6, to: 0.3 }]);
  const tr = side?.tail && side.apart > 0.5 ? (o.tailRound ?? 0) : 0;
  if (tr > 0) {
    const dB = norm(sub(B[1], Hb)), lv = [dB[0] < 0 ? -1 : 1, 0], dl = norm(lerp(dB, lv, tr)); side.tailDir = dl;
    A_.push([...Hb, { a: ang(dl), t: o.tailK ?? 1.2 }]);
  } else A_.push([...Hb, { a: ang(sub(B[1], Hb)) }]);
  for (let i = 1; i < nB - 1; i++) A_.push([...B[i]]);
  A_.push([...Wb, { c: true, ti: 0.6, to: 0.4 }]);
  // nothing of the cloth through what she sits or stands on (the hem's smile under a sitting thigh hung through the seat)
  for (const q of A_) for (const [x0, x1, y] of floors) if (q[0] >= x0 && q[0] <= x1 && q[1] > y && q[1] - y < 0.4) q[1] = y;
  for (const p of o.top) A_.push([...p]);
  return { geom: loop(A_), Hf, Hb, pf, pb, hem, side, fold };
}

/** Rest calibration: each edge's cloth length and the angle it leaves its last support at (the taut cloth from where it
 *  leaves the bodice to the master's hem corner, hemFront / hemBack, round the supports), and the hem's drop below them */
export function calibrate(o, { hemFront, hemBack, hemY, skin = 0.02 }) {
  const S = supports(o.legs, o.seat, [], skin), hug = o.hug?.length > 1 ? o.hug : [o.Wb];
  const edge = (W, H, side, L0 = 0) => { const pw = wrap(W, H, side > 0 ? S.F : S.B, side), T = pw[pw.length - 2]; return { L: L0 + pathLen(pw), phi: Math.atan2(side * (H[0] - T[0]), H[1] - T[1]) }; };
  const ef = edge(o.Wf, hemFront, 1), eb = edge(hug[hug.length - 1], hemBack, -1, pathLen(hug));
  // the side's reach: how far along the near thigh the hem crosses it standing
  const g = o.legs[0], fs = Math.max(0.1, Math.min(0.9, (hemY - g.hip[1]) / (g.u[1] * g.Lt)));
  return { Lf: ef.L, phiF: ef.phi, Lb: eb.L, phiB: eb.phi, skin, hemDrop: hemY - (hemFront[1] + hemBack[1]) / 2, fs };
}
