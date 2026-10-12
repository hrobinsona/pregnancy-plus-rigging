// shapes.js — parametric shape generators. Every generator returns a closed cubic loop {P, hin, hout}
// (clockwise on screen, y down) with an anchor count that depends ONLY on its arguments' lengths, never on values,
// so a part keeps a fixed topology across every pose and blend.
//
// Rule of the pipeline: shapes are COMPUTED from joints, landmarks and design parameters. Nothing here takes a contour
// sampled from a reference image.
import { loop, stroke, ellipse, add, sub, mulS, norm, perpL, len, lerp, mapGeom } from './geom.js';

const DEG = Math.PI / 180;
export const pt = (p, flag) => (flag === undefined ? [p[0], p[1]] : [p[0], p[1], flag]);

/** Limb / tube around the axis a→b. stations: [{t, r, l, f?}] — t along the axis (0..1), r = half-width on the
 *  screen-right side of a downward axis (perpL side), l = the other side; f = optional anchor flag for both side points.
 *  caps: 'round' adds one anchor beyond each end (cap bulge = capK × end half-width), 'flat' adds none.
 *  Anchors: 2·stations + (capA round) + (capB round). Clockwise. */
export function limb(a, b, stations, { capA = 'round', capB = 'round', capK = 0.9, k } = {}) {
  const L = len(sub(b, a)), u = norm(sub(b, a)), n = perpL(u);
  const at = (s, side) => add(add(a, mulS(u, s.t * L)), mulS(n, side * (side > 0 ? s.r : s.l)));
  const A = [];
  const s0 = stations[0], s1 = stations[stations.length - 1];
  if (capA === 'round') A.push([...sub(add(a, mulS(u, s0.t * L)), mulS(u, capK * (s0.r + s0.l) / 2)), { a: Math.atan2(n[1], n[0]) / DEG }]);
  for (const s of stations) A.push(s.f === undefined ? at(s, 1) : [...at(s, 1), s.f]);
  if (capB === 'round') A.push([...add(add(a, mulS(u, s1.t * L)), mulS(u, capK * (s1.r + s1.l) / 2)), { a: Math.atan2(-n[1], -n[0]) / DEG }]);
  for (const s of [...stations].reverse()) A.push(s.f === undefined ? at(s, -1) : [...at(s, -1), s.f]);
  return loop(A, k);
}

/** Tube along a polyline axis (e.g. shoulder→elbow→wrist). widths: [{r, l, f?}] per axis point (half-widths on the
 *  perpL side / other side of the local direction). Interior normals average the neighbouring segments.
 *  caps 'round' add one anchor beyond each end. Anchors: 2·axis.length + caps. Clockwise for a downward axis. */
export function tube(axis, widths, { capA = 'round', capB = 'round', capK = 0.9, k } = {}) {
  const n = axis.length, [kA, kB] = Array.isArray(capK) ? capK : [capK, capK];   // capK: one bulge for both ends, or [start, end]
  const dirs = axis.map((p, i) => norm(sub(axis[Math.min(i + 1, n - 1)], axis[Math.max(i - 1, 0)])));
  const nrm = dirs.map(perpL);
  const side = (i, s) => add(axis[i], mulS(nrm[i], s * (s > 0 ? widths[i].r : widths[i].l)));
  const A = [];
  if (capA === 'round') A.push([...sub(axis[0], mulS(dirs[0], kA * (widths[0].r + widths[0].l) / 2)), { a: Math.atan2(nrm[0][1], nrm[0][0]) / DEG }]);
  for (let i = 0; i < n; i++) A.push(widths[i].f === undefined ? side(i, 1) : [...side(i, 1), widths[i].f]);
  if (capB === 'round') A.push([...add(axis[n - 1], mulS(dirs[n - 1], kB * (widths[n - 1].r + widths[n - 1].l) / 2)), { a: Math.atan2(-nrm[n - 1][1], -nrm[n - 1][0]) / DEG }]);
  for (let i = n - 1; i >= 0; i--) A.push(widths[i].f === undefined ? side(i, -1) : [...side(i, -1), widths[i].f]);
  return loop(A, k);
}

/** Polar blob around c: radii[i] at angles[i] (deg, screen: 0 = +x, 90 = down). Anchor count = radii.length. */
export function blob(c, angles, radii, { rot = 0, flags = [], k } = {}) {
  const A = angles.map((a, i) => {
    const t = (a + rot) * DEG;
    const p = [c[0] + Math.cos(t) * radii[i], c[1] + Math.sin(t) * radii[i]];
    return flags[i] === undefined ? p : [...p, flags[i]];
  });
  return loop(A, k);
}

/** Egg: ellipse with different radii above/below and left/right of c, rotated. 8 anchors. */
export function egg(c, { rx, rxl = rx, ryt, ryb, rot = 0, k } = {}) {
  const angs = [0, 45, 90, 135, 180, 225, 270, 315];
  const R = angs.map((a) => {
    const t = a * DEG, ex = Math.cos(t) >= 0 ? rx : rxl, ey = Math.sin(t) >= 0 ? ryb : ryt;
    return 1 / Math.sqrt((Math.cos(t) / ex) ** 2 + (Math.sin(t) / ey) ** 2);
  });
  return blob(c, angs, R, { rot, k });
}

/** Tapered stroke along a centreline (re-export with a name that reads well in part code). */
export const taper = (pts, w, cap = 'point', k) => stroke(pts, w, cap, k);

/** Wavy centreline: n points from p0 along direction dir (deg), length L, sine wave of amplitude amp and
 *  wavelength wl, phase ph. Used for hair strands. */
export function wave(p0, dir, L, n, { amp = 0, wl = 1, ph = 0, curl = 0 } = {}) {
  // base path: a curve whose heading turns by `curl` degrees over its length; sine offset grows in from the root
  const out = [];
  let base = [p0[0], p0[1]];
  for (let i = 0; i < n; i++) {
    const s = i / (n - 1), d = (dir + curl * s) * DEG;
    if (i > 0) { const dp = (dir + curl * (i - 0.5) / (n - 1)) * DEG; base = add(base, [Math.cos(dp) * L / (n - 1), Math.sin(dp) * L / (n - 1)]); }
    const nn = [-Math.sin(d), Math.cos(d)];
    const off = amp * Math.sin((s * L / wl) * 2 * Math.PI + ph) * Math.min(1, s * 3);
    out.push(add(base, mulS(nn, off)));
  }
  return out;
}

/** Quadratic-ish arc through 3 points sampled to n points (for creases, hems, seams). */
export function arc3(a, m, b, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), u = 1 - t;
    // quadratic Bézier with control chosen so the curve passes through m at t = 0.5
    const c = sub(mulS(m, 2), mulS(add(a, b), 0.5));
    out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
  }
  return out;
}

/** Translate a geometry into the local frame of a pivot (parts are authored in world rest space, stored local). */
export const toLocal = (g, pivot) => mapGeom(g, (p) => sub(p, pivot));
export const shift = (g, d) => mapGeom(g, (p) => add(p, d));
export { loop, stroke, ellipse, lerp };
