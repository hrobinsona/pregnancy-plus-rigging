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

/** the thighs' undersides inside the skirt (down to fraction fmax): what the hem wraps under (sitting: the lap's underside
 *  between the knee and the seat) */
function under(legs, fmax, e) {
  const B = [];
  for (const g of legs) { const nu = front(g.u); for (let f = 0.05; f <= fmax + 1e-9; f += 0.05) B.push(sub(g.TB(Math.min(f, g.fT)), mulS(nu, e))); if (fmax > 0.85) B.push(add(g.knee[1], mulS(nu, e))); }
  return B;
}
const fracOn = (g, p) => Math.max(0, Math.min(1, dot(sub(p, g.hip), g.u) / g.Lt));

/**
 * @param o {Wf, Wb, legs, seat: [p] (the buttocks, posed), bump: [p] (the bump's outline below Wf, posed), props: [p], floors: [[x0, x1, y]], top: [p] (inside her trunk,
 *   Wb → Wf), cal}   cal = {Lf, Lb, phiF, phiB, skin, hemDrop}: from calibrate() on the rest pose
 * @returns {{geom, Hf, Hb, pf, pb, hem}}   geom: a loop with 5 + nF + nB + top anchors
 */
export function skirt(o, nF = 6, nB = 10) {
  const { Wf, Wb, legs, cal } = o, S = supports(legs, o.seat, o.props, cal.skin), floors = [[-1e9, 1e9, 0], ...(o.floors || [])];
  const SF = [...S.F, ...(o.bump || [])];   // the front lies over the bump below where it leaves the bodice (on all fours the bump's lowest point)
  // the STRIDE: walking, her legs apart spread the skirt inside: its hem is a ring of fixed length round both legs, so each
  // edge leaves its support at a wider angle, the back most (it swings out behind the back leg; the stills' walks flare
  // into an A, ours hung straight as a tube, critic R1 "no A-line flare or swing in the walks"). By the angle between the
  // thighs, standing (and folded poses, below) unchanged. o.swing (pose fx.skirtSwing, radians): the skirt trailing behind
  // her as she walks (momentum), which the stride alone can't show at the passing position (legs together, the still's
  // skirt still an A).
  const spread = legs.length > 1 ? Math.acos(Math.max(-1, Math.min(1, dot(legs[0].u, legs[1].u)))) : 0, sw = smooth(4 / DEG, 40 / DEG, spread) * spread;
  const sg = o.swing ?? 0, phiF = cal.phiF + 0.45 * sw + 0.25 * sg, phiB = cal.phiB + 0.9 * sw + 0.8 * sg;
  // GRAVITY: the front from the bump, the back from the back waist, each hanging over what stands out in its way
  let pf = hang(Wf, cal.Lf, SF, 1, phiF, floors, false), Hf = pf[pf.length - 1];
  let pb = hang(Wb, cal.Lb, S.B, -1, phiB, floors), Hb = pb[pb.length - 1];
  // the HEM is one ring: hanging, its front and back stay near one height. On all fours the back's cloth goes up over the
  // rump and ends at mid-thigh, so the front can't hang on from the bump to the floor (it did: a box); the ring holds it
  // up level with the back (the still: the hem level from the bump's bottom to the back of the thighs), the rest of the
  // front's cloth slack over the bump. Standing, the two ends are level already: unchanged.
  const level = (W, L, pts, out, phi, climb, y) => { let lo = 0.05 * L, hi = L;
    for (let it = 0; it < 24; it++) { const m = (lo + hi) / 2, e = hang(W, m, pts, out, phi, floors, climb); if (e[e.length - 1][1] > y) hi = m; else lo = m; }
    return hang(W, lo, pts, out, phi, floors, climb); };
  const SLACK = 0.12;
  if (Hf[1] > Hb[1] + SLACK) { pf = level(Wf, cal.Lf, SF, 1, phiF, false, Hb[1] + SLACK); Hf = pf[pf.length - 1]; }
  else if (Hb[1] > Hf[1] + SLACK) { pb = level(Wb, cal.Lb, S.B, -1, phiB, true, Hf[1] + SLACK); Hb = pb[pb.length - 1]; }
  // the TUBE: the skirt is a loop round her thighs. When they point forward (sitting, squatting, bending to the floor)
  // gravity no longer keeps the hem below them: hung free, the back fell from the waist like a cape behind a squat and the
  // front dropped over the knees and hid them (round 1: "a tent", "only the far knee comes forward"). The stills: the back
  // runs taut from the waist over the buttocks to under the thighs, the front lies along the thighs' tops, and the hem
  // crosses the thighs between where each runs out: each panel's cloth length fixes how far along the (near) thigh it
  // reaches (the squat still: the front halfway to the knee, the back at the buttocks' bottom, the hem a diagonal between).
  // Blended in by how far the thighs point forward of straight down (40° → 70°), so a sit-down move passes through it
  // smoothly; standing, kneeling, on all fours: unchanged.
  const w = Math.max(...legs.map((g) => smooth(40, 70, Math.acos(Math.max(-1, Math.min(1, g.u[1]))) * DEG)));
  let side = null;
  if (w > 0) {
    const g = legs[0], nu = front(g.u), back = (f) => sub(g.TB(Math.min(f, g.fT)), mulS(nu, cal.skin)), top = (f) => add(g.TF(f), mulS(nu, cal.skin));
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
    const fb = reach((f) => pathLen(wrap(Wb, back(f), S.B, -1)), cal.Lb, 0.05, 1);
    const ff = reach((f) => pathLen(wrap(Wf, top(f), SFt, 1)), cal.Lf, 0.05, 0.85);
    Hb = lerp(Hb, back(fb), w); Hf = lerp(Hf, top(ff), w);
    pb = wrap(Wb, Hb, S.B, -1); pf = w > 0.5 ? wrap(Wf, Hf, SFt, 1) : wrap(Wf, Hf, SF, 1);
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
    const dl = 0.25 * w, fsT = Math.min(0.92, cal.fs + dl) - 0.4 * bt, fsB = Math.max(0.05, cal.fs - dl - 0.2 * bt);
    side = { top: top(fsT), bot: back(fsB), w, apart: bt };
    if (globalThis.__DRAPE_DBG) globalThis.__drape = { w, fb, ff, f0, dn, bt, fs: cal.fs, Lf: cal.Lf, Lb: cal.Lb, thighL: g.Lt };
  }
  // ON ALL FOURS the back's cloth climbs from the back waist up over the buttocks (they stand above it) and the hem is a
  // ring far wider than her thighs: the skirt's outline behind her is its SIDE, hanging free from the buttocks' back and
  // flared a little, its hem crossing the thigh no lower than it does standing (cal.fs along it) nor than the front's end,
  // and rising a little to the back corner (the all-fours still: the skirt flares off the rump, the hem runs from that corner across the thigh down
  // to under the bump). Hung as the centre back, its cloth ran out at the top of the thigh and the hem ran down the
  // thigh's back: shorts, not a skirt (round 3). Standing, kneeling, sitting: the back never climbs, unchanged.
  const rise = Wb[1] - Math.min(...pb.map((q) => q[1])), cl = smooth(0.03, 0.15, rise) * (1 - w);
  if (cl > 0) {
    const g = legs[0], phi = phiB + 0.2, gv = [-Math.sin(phi), Math.cos(phi)], nb = [-gv[1], gv[0]];   // nb: out behind her, across the fall
    let k = 0; pb.forEach((q, i) => { if (dot(q, nb) > dot(pb[k], nb) + 1e-9) k = i; });
    const P = pb[k], yc = Math.min(g.TB(Math.min(cal.fs, g.fT))[1], Hf[1]) - 0.15, H2 = add(P, mulS(gv, Math.max(0, (yc - P[1]) / gv[1])));
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
  let fH = Math.max(...legs.map((g) => fracOn(g, Hf)));
  if (w > 0) { const g = legs[0], f = fracOn(g, Hf), dep = len(sub(g.TF(f), g.TB(Math.min(f, g.fT)))); fH = Math.max(0.05, fH - w * 0.95 * dep / g.Lt); }
  fH *= 1 - cl;   // (on all fours the hem crosses the thighs: it doesn't wrap them)
  const hp = wrap(Hf, Hb, under(legs, fH, cal.skin), 1), hem = hp.length > 2 ? resample(hp, 5) : [Hf, lerp(Hf, Hb, 0.25), lerp(Hf, Hb, 0.5), lerp(Hf, Hb, 0.75), Hb];
  const F = resample(pf, nF), B = resample(pb, nB).reverse();   // F: Wf → Hf; B: Hb → Wb
  // the hem's shape: rounded corners and the smile under the skirt, on the side of the hem away from her (down at rest)
  const d = cal.hemDrop * (1 - 0.8 * w), nrm = (i) => { const q = norm(sub(hem[Math.min(4, i + 1)], hem[Math.max(0, i - 1)])); return [q[1], -q[0]]; };
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
  // nothing of the cloth through what she sits or stands on (the hem's smile under a sitting thigh hung through the seat)
  for (const q of A_) for (const [x0, x1, y] of floors) if (q[0] >= x0 && q[0] <= x1 && q[1] > y && q[1] - y < 0.4) q[1] = y;
  for (const p of o.top) A_.push([...p]);
  return { geom: loop(A_), Hf, Hb, pf, pb, hem, side };
}

/** Rest calibration: each edge's cloth length and the angle it leaves its last support at (the taut cloth from where it
 *  leaves the bodice to the master's hem corner, hemFront / hemBack, round the supports), and the hem's drop below them */
export function calibrate(o, { hemFront, hemBack, hemY, skin = 0.02 }) {
  const S = supports(o.legs, o.seat, [], skin);
  const edge = (W, H, side) => { const pw = wrap(W, H, side > 0 ? S.F : S.B, side), T = pw[pw.length - 2]; return { L: pathLen(pw), phi: Math.atan2(side * (H[0] - T[0]), H[1] - T[1]) }; };
  const ef = edge(o.Wf, hemFront, 1), eb = edge(o.Wb, hemBack, -1);
  // the side's reach: how far along the near thigh the hem crosses it standing
  const g = o.legs[0], fs = Math.max(0.1, Math.min(0.9, (hemY - g.hip[1]) / (g.u[1] * g.Lt)));
  return { Lf: ef.L, phiF: ef.phi, Lb: eb.L, phiB: eb.phi, skin, hemDrop: hemY - (hemFront[1] + hemBack[1]) / 2, fs };
}
