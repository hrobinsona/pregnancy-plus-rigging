// geom.js — tiny 2D kit. Every drawable is a closed cubic Bézier loop with a FIXED anchor count,
// same start anchor, clockwise winding (on screen, y down). Smooth anchors get collinear handles
// (Catmull-Rom direction, chord-scaled lengths); corner anchors aim their handles at their neighbours.

export const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
export const mulS = (a, s) => [a[0] * s, a[1] * s];
export const len = (a) => Math.hypot(a[0], a[1]);
export const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };
export const perpL = (d) => [d[1], -d[0]]; // 90° counter-clockwise on screen
export const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const DEG = Math.PI / 180;
const dirOf = (deg) => [Math.cos(deg * DEG), Math.sin(deg * DEG)];

// ---------- affine matrices [a b c d e f] (SVG order) ----------
export const I = () => [1, 0, 0, 1, 0, 0];
export const mul = (m, n) => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
export const T = (x, y) => [1, 0, 0, 1, x, y];
export const R = (deg) => { const c = Math.cos(deg * DEG), s = Math.sin(deg * DEG); return [c, s, -s, c, 0, 0]; };
export const S = (sx, sy = sx) => [sx, 0, 0, sy, 0, 0];
export const ap = (m, p) => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];

// anchor flag: 'c' = corner | number = tension | {t, a (tangent deg), c, ti, to, ai/ao (corner handle angles, deg)}
function opts(f) {
  if (f === 'c') return { c: true };
  if (typeof f === 'number') return { t: f };
  return f || {};
}

/** Closed smooth loop through anchors [[x,y,flag?],...]. k = default tension. */
export function loop(anchors, k = 1.05) {
  const n = anchors.length;
  const P = anchors.map((a) => [a[0], a[1]]);
  const hin = new Array(n), hout = new Array(n);
  for (let i = 0; i < n; i++) {
    const p = P[i], prev = P[(i - 1 + n) % n], next = P[(i + 1) % n];
    const o = opts(anchors[i][2]);
    const dIn = len(sub(p, prev)), dOut = len(sub(next, p));
    if (o.c) {
      const tc = o.t ?? 0.5;
      hin[i] = add(p, mulS(o.ai !== undefined ? dirOf(o.ai) : norm(sub(prev, p)), dIn * (o.ti ?? tc) / 3));
      hout[i] = add(p, mulS(o.ao !== undefined ? dirOf(o.ao) : norm(sub(next, p)), dOut * (o.to ?? tc) / 3));
    } else {
      const t = o.t ?? k;
      const d = o.a !== undefined ? dirOf(o.a) : norm(sub(next, prev));
      hin[i] = sub(p, mulS(d, dIn * (o.ti ?? t) / 3));
      hout[i] = add(p, mulS(d, dOut * (o.to ?? t) / 3));
    }
  }
  return { P, hin, hout };
}

/** Tapered brush stroke along a centreline as a closed loop.
 *  cap 'point': 2n-2 anchors (tips are corners). cap 'round': 2n+2 anchors. */
export function stroke(pts, w, cap = 'point', k = 1.0) {
  const n = pts.length;
  const Tn = pts.map((p, i) => norm(sub(pts[Math.min(i + 1, n - 1)], pts[Math.max(i - 1, 0)])));
  const N = Tn.map(perpL);
  const L = pts.map((p, i) => add(p, mulS(N[i], w[i] / 2)));
  const Rr = pts.map((p, i) => sub(p, mulS(N[i], w[i] / 2)));
  let A;
  if (cap === 'point') {
    A = [[...pts[0], { c: true, t: 0.6 }], ...L.slice(1, n - 1), [...pts[n - 1], { c: true, t: 0.6 }], ...Rr.slice(1, n - 1).reverse()];
  } else {
    const e0 = sub(pts[0], mulS(Tn[0], w[0] / 2)), e1 = add(pts[n - 1], mulS(Tn[n - 1], w[n - 1] / 2));
    const ang = (v) => Math.atan2(v[1], v[0]) / DEG;
    A = [[...e0, { a: ang(N[0]) }], ...L, [...e1, { a: ang(mulS(N[n - 1], -1)) }], ...Rr.slice().reverse()];
  }
  return loop(A, k);
}

/** Ellipse, 4 anchors (top, right, bottom, left), exact kappa handles, optional rotation (deg). */
export function ellipse(c, rx, ry, rot = 0) {
  const K = 0.5522847498;
  const pts = [[0, -ry], [rx, 0], [0, ry], [-rx, 0]];
  const tang = [[rx, 0], [0, ry], [-rx, 0], [0, -ry]];
  const m = mul(T(c[0], c[1]), R(rot));
  const P = pts.map((p) => ap(m, p));
  const hout = pts.map((p, i) => ap(m, add(p, mulS(tang[i], K))));
  const hin = pts.map((p, i) => ap(m, sub(p, mulS(tang[i], K))));
  return { P, hin, hout };
}

export const count = (g) => g.P.length;

export function mapGeom(g, f) {
  return { P: g.P.map(f), hin: g.hin.map(f), hout: g.hout.map(f) };
}

/** Free-form deformation: bicubic Bernstein lattice (4x4) over box [x0,y0,x1,y1].
 *  offsets[j][i] = [dx,dy] for control point column i (x), row j (y). Zero offsets = identity. */
export function ffd(g, box, offsets) {
  if (!offsets) return g;
  const [x0, y0, x1, y1] = box;
  const B = (t) => [(1 - t) ** 3, 3 * t * (1 - t) ** 2, 3 * t * t * (1 - t), t ** 3];
  const f = (p) => {
    const s = (p[0] - x0) / (x1 - x0), t = (p[1] - y0) / (y1 - y0);
    const bs = B(s), bt = B(t);
    let dx = 0, dy = 0;
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      const w = bs[i] * bt[j];
      dx += w * offsets[j][i][0]; dy += w * offsets[j][i][1];
    }
    return [p[0] + dx, p[1] + dy];
  };
  return mapGeom(g, f);
}

const fmt = (v) => (Math.round(v * 100) / 100).toString();
/** Path data, scaling coordinates by s. */
export function pathD(g, s = 1) {
  const n = g.P.length;
  const q = (p) => fmt(p[0] * s) + ' ' + fmt(p[1] * s);
  let d = 'M' + q(g.P[0]);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    d += 'C' + q(g.hout[i]) + ' ' + q(g.hin[j]) + ' ' + q(g.P[j]);
  }
  return d + 'Z';
}

/** Approximate outward offset of a clockwise loop by d (anchors move along their outward normal, handles follow). */
export function outset(g, d, shift = [0, 0]) {
  const n = g.P.length;
  const P = [], hin = [], hout = [];
  for (let i = 0; i < n; i++) {
    let t = sub(g.hout[i], g.hin[i]);
    if (len(t) < 1e-9) t = sub(g.P[(i + 1) % n], g.P[(i - 1 + n) % n]);
    const nn = norm(perpL(t));
    const o = [nn[0] * d + shift[0], nn[1] * d + shift[1]];
    P.push(add(g.P[i], o)); hin.push(add(g.hin[i], o)); hout.push(add(g.hout[i], o));
  }
  return { P, hin, hout };
}
