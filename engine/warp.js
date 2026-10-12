// warp.js — 2.5D WARPS of a flat-drawn part group: the drawing is lifted onto a simple 3D proxy, turned in 3D, and
// projected back, so a ¾ head can NOD (pitch) instead of only rolling in the picture plane. A 2D rotation of a ¾ head
// reads as a sideways roll on a stalk of neck (critic, retch); a real nod slides the face down the front of the skull,
// tucks the chin back toward the throat, brings the crown and bun forward — exactly what turning the head's ellipsoid
// about its ear-to-ear axis does to the points drawn on it. Pure function of the angle; used by engine/rig.js on every
// rigid part of the warped bone (C.warps) and by engine/anim.js on contacts riding that bone (a hand over the mouth).
const DEG = Math.PI / 180;

/** Pitch warp (deg > 0 = chin down) of points drawn on an ellipsoid head: c = centre (rest coords of the bone's parts),
 *  axes = [forward, down, lateral] semi-axes, fx = the rig's ¾ projection (screen x = fx·F + √(1−fx²)·L, depth away =
 *  −√(1−fx²)·F + fx·L). Each point is put on the nearest visible surface along its camera ray (or at the silhouette's
 *  depth when it lies outside it — hair, bun, strands move as if fixed to the skull), rotated about the lateral axis,
 *  and projected back. Returns q → q' (identity when deg = 0). */
export function pitchWarp({ c, axes: [rF, rD, rL], fx }, deg) {
  if (!deg) return (q) => q;
  const SQ = Math.sqrt(1 - fx * fx), ct = Math.cos(deg * DEG), st = Math.sin(deg * DEG);
  const A = (SQ / rF) ** 2 + (fx / rL) ** 2;
  return (q) => {
    const x = q[0] - c[0], D = q[1] - c[1];
    // along the ray: F = fx·x − SQ·d, L = SQ·x + fx·d (d = depth away); on the ellipsoid → A d² + B d + C = 0
    const B = 2 * x * fx * SQ * (1 / rL ** 2 - 1 / rF ** 2), C0 = (fx * x / rF) ** 2 + (SQ * x / rL) ** 2 + (D / rD) ** 2 - 1;
    const disc = B * B - 4 * A * C0, d = disc >= 0 ? (-B - Math.sqrt(disc)) / (2 * A) : -B / (2 * A);
    const F = fx * x - SQ * d, L = SQ * x + fx * d, F2 = F * ct - D * st, D2 = D * ct + F * st;
    return [c[0] + fx * F2 + SQ * L, c[1] + D2];
  };
}
