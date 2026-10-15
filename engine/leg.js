// leg.js — a side-on LEG drawn in posed space, so the knee folds like a real one instead of hinging (Harry, 2026-10-14:
// "the legs look unnatural… overlapping so they look like they're on hinges rather than a real rig"). One outline
// hip → thigh → knee → shin → ankle → instep → (inside the shoe) → heel → Achilles → calf → knee → thigh → hip:
//  · FRONT of the knee: the thigh's and the shin's front lines joined by a FILLET whose radius grows with the bend (a
//    kneeling knee is a broad round corner on the floor, the patella riding the femur's end), not a pin with a round cap
//  · BACK of the knee: the hamstring line and the calf line meet where they INTERSECT (soft tissue pressing together),
//    a concave corner with a short CREASE running in toward the knee once the bend is deep (the stills draw it)
//  · the shin's front flows into the instep, the Achilles into the heel, both carried by the foot bone, so a pointed
//    foot (kneeling: the foot's top on the floor) stays one line from shin to toes
// Widths come from the character's measured profiles (front / back of the bone's axis, H units). With the leg straight
// the outline is the old tube's: standing poses keep their shape. Pure function of the posed state (ctx.st).
import { loop, stroke, add, sub, mulS, norm, len, lerp, ap } from './geom.js';

const DEG = 180 / Math.PI;
const front = (u) => [u[1], -u[0]];                       // the bone's FRONT normal for a figure facing right (y down)
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const ang = (v) => Math.atan2(v[1], v[0]) * DEG;
const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
/** width profile [[f, front, back], ...] → {front, back} at f (linear between stations) */
export function prof(P, f) {
  if (f <= P[0][0]) return { front: P[0][1], back: P[0][2] };
  for (let i = 1; i < P.length; i++) if (f <= P[i][0]) { const t = (f - P[i - 1][0]) / (P[i][0] - P[i - 1][0]); return { front: P[i - 1][1] + t * (P[i][1] - P[i - 1][1]), back: P[i - 1][2] + t * (P[i][2] - P[i - 1][2]) }; }
  const q = P[P.length - 1]; return { front: q[1], back: q[2] };
}
// first crossing of polylines a and b (each [[x,y]...]): {i, j, t, s, p} or null
function crossing(a, b) {
  for (let i = 0; i < a.length - 1; i++) for (let j = 0; j < b.length - 1; j++) {
    const p = a[i], r = sub(a[i + 1], p), q = b[j], s = sub(b[j + 1], q), d = cross(r, s);
    if (Math.abs(d) < 1e-12) continue;
    const t = cross(sub(q, p), s) / d, u = cross(sub(q, p), r) / d;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return { i, j, t, u, p: add(p, mulS(r, t)) };
  }
  return null;
}

/**
 * @param {object} o
 *   hip, knee, ankle      posed joints (H)
 *   thigh, shin           width profiles [[f, front, back]] along hip→knee and knee→ankle (f 0..1)
 *   foot                  posed points of the foot carried by its bones: {instep: [p…] (shin front → shoe), shoe: [p…]
 *                         (inside the shoe: toe box top, toe, sole front, sole back), heel: p (inside the shoe, at the
 *                         back), achilles: p (the back of the ankle just above the shoe)}
 *   kneeRound             extra fillet radius (H) at a 90° bend: a broad knee, not a pin (default 0.12)
 *   top                   how far above the hip the outline closes (inside the pelvis, hidden under the dress)
 * @returns {{geom, crease, bend, X}}   geom: the loop (fixed anchor count); crease: a tapered stroke (fixed count) with
 *   its opacity in crease.k (0 when the knee is nearly straight)
 */
export function legOutline(o) {
  const { hip: H, knee: K, ankle: A, thigh: TP, shin: SP, foot } = o;
  const Lt = len(sub(K, H)), Ls = len(sub(A, K)), u = norm(sub(K, H)), v = norm(sub(A, K)), nu = front(u), nv = front(v);
  const bend = Math.atan2(cross(u, v), u[0] * v[0] + u[1] * v[1]) * DEG;   // + = knee flexion (the heel toward the seat)
  const TF = (f) => add(add(H, mulS(u, f * Lt)), mulS(nu, prof(TP, f).front)), TB = (f) => sub(add(H, mulS(u, f * Lt)), mulS(nu, prof(TP, f).back));
  const SF = (f) => add(add(K, mulS(v, f * Ls)), mulS(nv, prof(SP, f).front)), SB = (f) => sub(add(K, mulS(v, f * Ls)), mulS(nv, prof(SP, f).back));
  // ---- front: the knee's fillet. Offset lines at the knee's front half-width meet at the miter point M; an arc of radius
  // rho tangent to both, rho = the half-width (a plain round join) plus kneeRound as the knee bends
  const wfk = prof(SP, 0).front, ph = Math.max(0, bend) / DEG; let rho = wfk + (o.kneeRound ?? 0.12) * smooth(0, 90, Math.max(0, bend));
  const half = ph / 2, M = add(K, mulS(norm(add(nu, nv)), wfk / Math.max(0.2, Math.cos(half))));
  // (a deep bend shrinks the radius so the arc stays within the knee's end of each bone: tangent ≤ 0.28 of the shorter)
  if (rho * Math.tan(half) > 0.28 * Math.min(Lt, Ls)) rho = Math.max(wfk * 0.6, 0.28 * Math.min(Lt, Ls) / Math.tan(half));
  const tTan = Math.max(rho * Math.tan(half), 0.02), C = add(M, mulS(norm(add(mulS(nu, -1), mulS(nv, -1))), rho / Math.max(0.2, Math.cos(half))));
  const kA = sub(M, mulS(u, tTan)), kC = add(M, mulS(v, tTan));
  const kB = ph > 1e-3 ? add(C, mulS(norm(sub(M, C)), rho)) : M;   // the arc's middle (straight leg: the knee's front point)
  // ---- back: where the hamstring line meets the calf line
  const nS = 24, tb = [], sb = [];
  for (let i = 0; i <= nS; i++) tb.push(TB(1 - 0.75 * i / nS));         // knee → up the thigh
  for (let i = 0; i <= nS; i++) sb.push(SB(0.75 * i / nS));             // knee → down the calf
  let fT = 1, fS = 0, X = lerp(TB(1), SB(0), 0.5);
  if (bend > 0) { const c = crossing(tb, sb); if (c) { fT = 1 - 0.75 * (c.i + c.t) / nS; fS = 0.75 * (c.j + c.u) / nS; X = c.p; } }
  // ---- the outline (anchor count fixed: 2 + 3 + 3 + instep + shoe + 2 + 5 + 1 + 5)
  const A_ = [];
  const top = add(H, mulS(u, -(o.top ?? 0.18)));
  // straight, the three knee anchors close up into one whose tangent is the chord thigh → shin (the old tube's knee: the
  // patella stands proud of the taper above it); bent, they spread into the fillet with its own tangents
  const chord = norm(sub(SF(0.23), TF(0.5))), fil = smooth(8, 40, bend), tg = (d) => ang(norm(lerp(chord, d, fil)));
  // (the thigh's front leaves the hip ALONG the thigh: auto-tangent from the closing point on the axis, it set off 16° outward
  // and bulged 0.02 H past the stations, out past the skirt's front edge under a standing bump, round 5's blind A/B)
  A_.push([...TF(0), { a: ang(u) }]); A_.push([...TF(0.5)]);
  A_.push([...kA, { a: tg(u) }]); A_.push([...kB, { a: tg(norm(lerp(u, v, 0.5))) }]); A_.push([...kC, { a: tg(v) }]);
  A_.push([...SF(0.23)]); A_.push([...SF(0.5)]); A_.push([...SF(0.77)]);
  for (const p of foot.instep) A_.push([...p]);
  for (const p of foot.shoe) A_.push([...p]);
  A_.push([...foot.heel]); A_.push([...foot.achilles]);
  for (const g of [0.93, 0.78, 0.6, 0.4, 0.2]) A_.push([...SB(fS + (0.97 - fS) * g)]);   // calf, ankle → knee
  // the junction: a soft concave corner (a straight leg: a smooth point at the back of the knee)
  const sharp = smooth(15, 60, bend);
  A_.push([...X, sharp > 0.5 ? { c: true, t: 0.35 } : {}]);
  for (const g of [0.25, 0.5, 0.78]) A_.push([...TB(fT * (1 - g))]);   // thigh back, knee → hip
  A_.push([...TB(0)]); A_.push([...top, { a: ang(nu) }]);
  const geom = loop(A_);
  // crease: from the junction in toward the knee (the calf pressing on the hamstring), fading in with the bend
  const into = norm(sub(K, X)), cl = Math.min(0.16, 0.5 * len(sub(K, X)));
  const cp = [X, add(X, mulS(into, cl * 0.5)), add(X, mulS(into, cl))];
  const crease = stroke(cp, [0.016, 0.012, 0.002], 'point');
  crease.k = smooth(40, 75, bend);
  return { geom, crease, bend, X, fT, fS, TF, TB, SF, SB, knee: [kA, kB, kC], hip: H, kneeJ: K, u, Lt };
}

/** carry a REST point by a bone's posed transform (rig.carry for arbitrary points) */
export const carryPt = (st, J, BONE, bone, p) => ap(st[bone].M, sub(p, J[BONE[bone].joint]));
/** carry a REST point by the parent bone, then turn it about the child's joint by w of the child's rotation relative to
 *  the parent (a skin blend across a joint, per point): the instep between shin and foot. Pointing the foot (kneeling)
 *  the instep turned rigidly with the foot stood out as a lump above the shoe; blended, the shin's front runs on into
 *  the top of the foot as one line, as a pointed foot's does. */
export function carryBlend(st, J, BONE, parent, child, p, w) {
  const q = carryPt(st, J, BONE, parent, p), c = st[child].pos, a = w * (st[child].rot - st[parent].rot) * Math.PI / 180;
  const d = sub(q, c), co = Math.cos(a), si = Math.sin(a);
  return [c[0] + co * d[0] - si * d[1], c[1] + si * d[0] + co * d[1]];
}
