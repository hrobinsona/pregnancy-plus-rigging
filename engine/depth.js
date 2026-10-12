// depth.js — 2.5D draw-order decisions from the 3D arm (rig plane 'arm3').
// A cut-out limb must be drawn either behind or in front of the body, and the right answer changes as it moves (a far
// hand leaving the far side of the bump comes round in front of the chest to the mouth). Keyed swaps pop or leave the
// limb hidden behind the torso mid-move. Instead: cast the camera ray through points of the limb against simple 3D
// PROXIES of the body (ellipsoids / vertical elliptic cylinders, placed on the body's midline and carried by their bones)
// and ask which is nearer. A physical limb can only change sides by going round a silhouette edge, where nothing
// overlaps — so a correct answer flips exactly when the flip is invisible. Pure function of the pose.
//
// Character data, params.depth = { midL, proxies }. midL is the lateral offset of the body midline from a shoulder joint
// (H). Each proxy has name, bone, at (a rest point on the midline), F (forward offset of the centre from that point),
// axes (semi-axes F, D, L) and kind (ellipsoid, or cylinder: vertical, cut at ±aD).
const DEG = Math.PI / 180;

/** Local (F, D, L) frame of one arm, relative to its shoulder joint, with the screen mapping the rig uses, and a BODY frame
 *  (same origin, upright with the chest) for comparing the arm with the body proxies. The arm's own frame also carries
 *  its 2D shoulder rotation (shoulderAbd); going through the screen keeps the two consistent with what is drawn. */
export function armFrame(rig, st, side) {
  const C = rig.C, fx = rig.fx, SQ = Math.sqrt(1 - fx * fx), s = side === 'near' ? -1 : 1;
  // the arm frame's 'down' is the upper arm's REST direction on screen (the rest art hangs the arm out at an angle): the
  // rig turns a bone relative to its rest angle, so the frame's screen rotation = base + (rest angle − 90°)
  const ua = st[`upperArm.${side}`], S = ua.pos, b = ((ua.baseRot ?? 0) + rig.restAngle(rig.BONE[`upperArm.${side}`]) - 90) * DEG, cb = Math.cos(b), sb = Math.sin(b);
  const k = (st.chest?.rot ?? 0) * DEG, ck = Math.cos(k), sk = Math.sin(k);
  const toScreen = (p) => { const x = fx * p[0] + s * SQ * p[2], y = p[1]; return [S[0] + cb * x - sb * y, S[1] + sb * x + cb * y]; };
  const depthOf = (p) => -SQ * p[0] + s * fx * p[2];                       // + = away from the camera (rotation-invariant)
  const midL = -(C.params.depth?.midL ?? 0.73);
  const upright = (q) => { const dx = q[0] - S[0], dy = q[1] - S[1]; return [ck * dx + sk * dy, -sk * dx + ck * dy]; };
  // screen point + depth (relative to the shoulder) → body (F, D, L); the projection is a rotation, its inverse the transpose
  const toBody = (q, z) => { const [x, y] = upright(q); return [fx * x - SQ * z, y, s * (SQ * x + fx * z)]; };
  const armToBody = (p) => toBody(toScreen(p), depthOf(p));
  const fromScreen = (q, z) => { const dx = q[0] - S[0], dy = q[1] - S[1], x = cb * dx + sb * dy, y = -sb * dx + cb * dy; return [fx * x - SQ * z, y, s * (SQ * x + fx * z)]; };   // screen + depth → ARM local
  const fromScreenMid = (q) => { const [x, y] = upright(q); return [(x - s * SQ * midL) / fx, y, midL]; };
  return { side, s, S, toScreen, depthOf, fromScreen, toBody, armToBody, fromScreenMid, view: [-SQ, 0, s * fx], midL };   // view: the camera ray in body coords
}

/** 3D joint positions (local) of an arm: shoulder, elbow, wrist, hand tip — from the rig's a3 frames and rest lengths. */
export function armPoints(rig, st, side) {
  const J = rig.J, S = side === 'near' ? 'Near' : 'Far', L = (a, b) => Math.hypot(J[b][0] - J[a][0], J[b][1] - J[a][1]);
  const v1 = st[`upperArm.${side}`].a3.v, v2 = st[`forearm.${side}`].a3.v, v3 = st[`hand.${side}`].a3.v;
  const el = v1.map((x) => x * L('shoulder' + S, 'elbow' + S)), wr = el.map((x, i) => x + v2[i] * L('elbow' + S, 'wrist' + S));
  const tip = wr.map((x, i) => x + v3[i] * L('wrist' + S, `hand${S}Tip`));
  return { sh: [0, 0, 0], el, wr, tip };
}

/** The body proxies of this pose, in an arm's local frame. */
export function proxies(rig, st, fr) {
  const P = rig.C.params.depth?.proxies || [], J = rig.J, BONE = rig.BONE;
  return P.map((q) => {
    const M = st[q.bone].M, j = J[BONE[q.bone].joint], at = [M[0] * (q.at[0] - j[0]) + M[2] * (q.at[1] - j[1]) + M[4], M[1] * (q.at[0] - j[0]) + M[3] * (q.at[1] - j[1]) + M[5]];
    const c = fr.fromScreenMid(at); c[0] += q.F ?? 0;
    return { ...q, c };
  });
}

/** Where the camera ray through local point p meets proxy q: null (miss) or [tNear, tFar] (t = depth past p). */
function hit(p, d, q) {
  const [aF, aD, aL] = q.axes, o = [p[0] - q.c[0], p[1] - q.c[1], p[2] - q.c[2]];
  if (q.kind === 'cylinder') {                                              // vertical: the ray is horizontal (d[1] = 0)
    if (Math.abs(o[1]) > aD) return null;
    const A = (d[0] / aF) ** 2 + (d[2] / aL) ** 2, B = 2 * (o[0] * d[0] / aF ** 2 + o[2] * d[2] / aL ** 2), Cc = (o[0] / aF) ** 2 + (o[2] / aL) ** 2 - 1;
    const disc = B * B - 4 * A * Cc; if (disc < 0) return null;
    const r = Math.sqrt(disc); return [(-B - r) / (2 * A), (-B + r) / (2 * A)];
  }
  const A = (d[0] / aF) ** 2 + (d[1] / aD) ** 2 + (d[2] / aL) ** 2, B = 2 * (o[0] * d[0] / aF ** 2 + o[1] * d[1] / aD ** 2 + o[2] * d[2] / aL ** 2), Cc = (o[0] / aF) ** 2 + (o[1] / aD) ** 2 + (o[2] / aL) ** 2 - 1;
  const disc = B * B - 4 * A * Cc; if (disc < 0) return null;
  const r = Math.sqrt(disc); return [(-B - r) / (2 * A), (-B + r) / (2 * A)];
}

/** Every proxy the camera ray through p crosses: [{name, t0, t1}] (t along the ray from p; t < 0 = nearer the camera). */
export function rayHits(p, fr, prox) { const out = []; for (const q of prox) { const h = hit(p, fr.view, q); if (h) out.push({ name: q.name, t0: h[0], t1: h[1] }); } return out; }

/** OVERLAP-ORDER penalty for fitting (the order SEEN in a reference: a hand over the mouth is in front of the face, a hand
 *  wrapped round the bump is behind it). A point is BEHIND a proxy when it lies deeper than the proxy's middle along its
 *  ray ((t0 + t1)/2 < 0: also right for points inside a proxy), in front otherwise. want is 'front' | 'behind' |
 *  'onfront' | 'onback', optionally ':name+name' to name the proxies (default all): 'front:jaw' = a hand over the mouth,
 *  'behind:bump' = a hand round the far side of the bump, 'onfront:bump' = resting on it. Squared violation in H². */
export function orderPenalty(p, fr, prox, want, margin = 0.05) {
  const [w, names] = want.split(':'), sel = names ? prox.filter((q) => names.split('+').includes(q.name)) : prox;
  // a ray that MISSES a proxy must not satisfy the constraint for free (the solver just slides the limb off the silhouette
  // edge): test against the proxy grown until the ray hits it — the order is then judged against its extended surface
  const hitGrow = (q) => { for (const g of [1, 1.4, 2, 3, 5]) { const h = hit(p, fr.view, { ...q, axes: q.axes.map((x) => x * g) }); if (h) return { name: q.name, t0: h[0], t1: h[1], g }; } return null; };
  const hs = sel.map(hitGrow).filter(Boolean), mid = (h) => (h.t0 + h.t1) / 2;
  if (!hs.length) return 0;
  if (w === 'onfront' || w === 'onback') return hs.reduce((a, h) => a + (w === 'onback' ? h.t1 : h.t0) ** 2, 0);
  if (w === 'front') return hs.reduce((a, h) => a + Math.max(0, margin - mid(h)) ** 2, 0);
  return hs.reduce((a, h) => a + Math.max(0, mid(h) + margin) ** 2, 0);   // behind EACH named proxy
}

/** +1 = p is in front of every proxy its ray crosses, −1 = it lies behind one (deeper than that proxy's middle along the
 *  ray — a point inside a proxy counts by the nearer surface), 0 = the ray misses the body. */
export function front(p, fr, prox) {
  let any = false;
  for (const q of prox) { const h = hit(p, fr.view, q); if (!h) continue; any = true; if ((h[0] + h[1]) / 2 < 0) return -1; }
  return any ? 1 : 0;
}

// ---- SWIVEL: the elbow's angle round the shoulder→wrist axis (0 = elbow as low as it can be, the natural hang). A 3D
// reach interpolates the wrist position AND the swivel between keys, so the elbow never jumps to the mirror branch.
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm3 = (a) => { const l = Math.hypot(...a) || 1; return a.map((x) => x / l); };
function swivelBasis(W) {
  const u = nrm3(W); let a = sub3([0, 1, 0], u.map((x) => x * u[1]));
  if (Math.hypot(...a) < 1e-6) a = sub3([1, 0, 0], u.map((x) => x * u[0]));
  a = nrm3(a); return { u, a, b: cross3(u, a) };
}
export function swivelOf(el, wr) { const { u, a, b } = swivelBasis(wr), e = sub3(el, u.map((x) => x * dot3(el, u))); return Math.atan2(dot3(e, b), dot3(e, a)); }
/** 2-bone 3D IK: shoulder at the origin, wrist target W, segment lengths L1, L2, swivel φ → elbow position (and the
 *  wrist actually reached, pulled in if W is out of reach). */
export function ik2(W, L1, L2, phi) {
  let r = Math.hypot(...W); const rMax = (L1 + L2) * 0.999, rMin = Math.abs(L1 - L2) * 1.001 + 1e-6;
  const Wr = r > rMax ? W.map((x) => (x * rMax) / r) : r < rMin ? W.map((x) => (x * rMin) / (r || 1)) : W; r = Math.min(rMax, Math.max(rMin, r));
  const { u, a, b } = swivelBasis(Wr), c0 = (L1 * L1 - L2 * L2 + r * r) / (2 * r), rho = Math.sqrt(Math.max(0, L1 * L1 - c0 * c0));
  return { el: [0, 1, 2].map((i) => c0 * u[i] + rho * (Math.cos(phi) * a[i] + Math.sin(phi) * b[i])), wr: Wr };
}
/** The rig's arm angles (degrees) for an elbow/wrist in ARM-local coords: elevation, plane of elevation, humeral
 *  rotation, elbow flexion — choosing the (±elevation) representation nearest the keyed values (continuity). */
export function armAngles(el, wr, L1, L2, keyed, lims = {}) {
  const DEGr = 180 / Math.PI, v1 = nrm3(el), v2 = nrm3(sub3(wr, el));
  const c = Math.acos(Math.max(-1, Math.min(1, dot3(v1, v2))));
  let e = Math.acos(Math.max(-1, Math.min(1, v1[1]))), al = Math.atan2(v1[2], v1[0]);
  const wrapD = (x) => ((x + 540) % 360) - 180;
  const cand = [[e, al], [-e, al + Math.PI]].map(([E, A]) => [E * DEGr, wrapD(A * DEGr)]);
  // continuity with the keyed values — but never a representation the rig would CLAMP (near zero elevation the plane of
  // elevation is arbitrary: a clamped plane would silently move the drawn arm away from the 3D solution)
  const out = (v, l) => (l ? Math.max(0, l[0] - v, v - l[1]) : 0);
  const cost = ([E, A]) => (E - (keyed.e ?? 0)) ** 2 + wrapD(A - (keyed.al ?? 0)) ** 2 + 1e4 * (out(E, lims.e) + out(A, lims.al));
  const [E, A] = cost(cand[0]) <= cost(cand[1]) ? cand[0] : cand[1];
  // humeral rotation: the swing of D→v1 carries F to g0; the forearm's flexion direction g must be reached by twisting
  const D3 = [0, 1, 0], k = cross3(D3, v1), kl = Math.hypot(...k);
  const rot = (v, kk, ang) => { const cs = Math.cos(ang), sn = Math.sin(ang), kv = dot3(kk, v), kx = cross3(kk, v); return [0, 1, 2].map((i) => v[i] * cs + kx[i] * sn + kk[i] * kv * (1 - cs)); };
  const g0 = kl > 1e-9 ? rot([1, 0, 0], k.map((x) => x / kl), Math.atan2(kl, dot3(D3, v1))) : (v1[1] > 0 ? [1, 0, 0] : [-1, 0, 0]);
  const sc = Math.sin(c);
  let tau = keyed.tau ?? 0;
  if (sc > 1e-3) { const g = v2.map((x, i) => (x - Math.cos(c) * v1[i]) / sc); tau = Math.atan2(dot3(cross3(g0, g), v1), dot3(g0, g)) * DEGr; }
  return { e: E, al: A, tau, c: c * DEGr };
}
