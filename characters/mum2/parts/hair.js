// hair.js — bone: head. Back mass, bun + loop + flyaway, front cap with centre part, two loose strands (spring-bent).
import { loop, taper, egg, wave } from '../../../engine/shapes.js';
import { ensureCW } from '../../../engine/hand.js';

const part = (id, z, fill, geom, extra = {}) => ({ id, bone: 'head', z, fill, geom, ...extra });
export const ANCHORS = { 'hair.back': 11, 'hair.nape': 6, 'hair.bun': 8, 'hair.bun.shade': 6, 'hair.loop': 12, 'hair.front': 12,
  'hair.part': 4, 'hair.strand.near': 18, 'hair.strand.far': 18 };

/** bend a centreline as a chain about its root: segment i turns by deg·u^1.4 (tip moves most, root pinned) */
export function bend(pts, deg) {
  if (!deg) return pts;
  const DEG = Math.PI / 180, n = pts.length;
  const seg = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
  const L = seg.reduce((a, b) => a + b, 0), out = [pts[0]];
  let acc = 0;
  for (let i = 1; i < n; i++) {
    acc += seg[i - 1];
    const a = deg * Math.pow(acc / L, 1.4) * DEG, c = Math.cos(a), s = Math.sin(a);
    const d = [pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]];
    out.push([out[i - 1][0] + c * d[0] - s * d[1], out[i - 1][1] + s * d[0] + c * d[1]]);
  }
  return out;
}

export function build({ P: C, C: char, pose }) {
  const X = char.params.P, h = X.hair, f = X.face, out = [];
  const top = h.top, back = h.back;
  // back mass: round cranium + back of head, tucked behind the jaw/neck (z under face and neck)
  out.push(part('hair.back', 18, C.hair, ensureCW(loop([
    [top[0] + 0.02, top[1] - 0.005], [top[0] + 0.28, top[1] + 0.05], [f.far[0] + 0.05, f.part[1] + 0.06], [f.far[0] + 0.04, f.far[1] - 0.03],
    [f.far[0] - 0.2, f.chin[1] - 0.1], [-0.14, f.chin[1] - 0.07], [back[0] + 0.22, f.chin[1] - 0.12],
    [back[0] + 0.07, f.chin[1] - 0.3], [back[0] + 0.01, back[1] + 0.02], [back[0] + 0.02, top[1] + 0.2], [top[0] - 0.26, top[1] - 0.04]]))));   // last anchor tucks into the bun: no pinhole (detail audit)
  // nape hair: the lower edge of the back mass drawn OVER the neck top (hair falls over the nape), so the neck's top
  // corner always tucks under hair — no skin corner or seam where neck meets hair, whatever the head/neck rotation
  out.push(part('hair.nape', 41, C.hair, ensureCW(loop([
    [-0.16, f.chin[1] - 0.2], [-0.21, f.chin[1] - 0.085, { t: 0.9 }], [back[0] + 0.22, f.chin[1] - 0.112, { t: 1.1 }],   // R8: one convex edge meeting the nape once (no lobe on the neck)
    [back[0] + 0.075, f.chin[1] - 0.3], [back[0] + 0.12, f.chin[1] - 0.42], [-0.22, f.chin[1] - 0.36]]))));
  // bun + its shade crescent; loop above it; one flyaway
  const b = [h.bun[0] + 0.03, h.bun[1] + 0.05], r = h.bunR;
  out.push(part('hair.bun', 17, C.hair, egg(b, { rx: r * 1.02, rxl: r, ryt: r * 0.95, ryb: r * 0.9, rot: -15 })));
  out.push(part('hair.bun.shade', 17.5, C.hairShade, taper([[b[0] - r * 0.55, b[1] - r * 0.35], [b[0] - r * 0.05, b[1] - r * 0.62], [b[0] + r * 0.5, b[1] - r * 0.42], [b[0] + r * 0.7, b[1] + 0.02]], [0.004, 0.035, 0.03, 0.004])));
  const lt = h.loopTop, lc = [lt[0] - 0.01, lt[1] + 0.085 + (h.loopDrop ?? 0)];   // rooted: both ends sink into the bun
  const ring = Array.from({ length: 5 }, (_, i) => { const a = (110 + i * 80) * Math.PI / 180; return [lc[0] + Math.cos(a) * 0.055, lc[1] + Math.sin(a) * 0.085]; });   // both ends below the centre: rooted in the bun
  out.push(part('hair.loop', 16.5, C.hair, taper(ring, h.loopW ?? [0.02, 0.034, 0.036, 0.032, 0.022], 'round')));
  if (X.hair.fly) out.push(part('hair.fly', 16.6, C.hair, taper(wave([b[0] - r * 0.6, b[1] + r * 0.55], 168, 0.2, 4, { amp: 0.012, wl: 0.18, curl: 30 }), [0.035, 0.03, 0.018, 0.003])));
  // front cap: covers the skull top, centre part, sweeps to both temples (over the face)
  const part0 = f.part;
  out.push(part('hair.front', 60, C.hair, ensureCW(loop([
    [part0[0], part0[1], { c: true, t: 0.6 }], [part0[0] + 0.1, part0[1] + 0.02], [f.far[0] - 0.025, f.far[1] - 0.16], [f.far[0] + 0.01, f.far[1] - 0.115, { a: 20, t: 1.0 }],   // temple: rounded end, no needle
    [f.far[0] + 0.1, f.far[1] - 0.2], [top[0] + 0.32, top[1] + 0.1], [top[0] + 0.05, top[1] - 0.02], [top[0] - 0.3, top[1] + 0.07],
    [f.nearEye[0] - 0.09, f.nearEye[1] - 0.12], [f.nearEye[0] - 0.02, f.nearEye[1] + 0.06], [f.nearEye[0] + 0.03, f.nearEye[1] - 0.12],
    [part0[0] - 0.08, part0[1] + 0.06]]))));
  out.push(part('hair.part', 60.5, C.hairShade, taper([[part0[0] + 0.01, part0[1] + 0.005], [part0[0] - 0.03, part0[1] - 0.09], [part0[0] - 0.09, part0[1] - 0.17]], [0.002, 0.016, 0.003])));
  // loose strands: wavy tapered strokes from the temples; spring channel pose.fx.hair.{near,far} bends them
  const hx = pose.fx?.hair || {};
  const sN = bend(wave([f.nearEye[0] - 0.06, f.nearEye[1] + 0.06], 97, 0.32, 8, { amp: 0.015, wl: 0.4, ph: 0.4 }), hx.near || 0);   // R8: root on the hair edge, ends above the jaw (no knot at the nape), no jog   // curve radius > stroke half-width: no cusps
  const sF = bend(wave([f.far[0] + 0.035, f.far[1] - 0.1], 84, h.strandFar?.len ?? 0.56, 8, { amp: h.strandFar?.amp ?? 0.024, wl: 0.24, ph: 1.6 }), hx.far || 0);
  out.push(part('hair.strand.near', 61, C.hair, taper(sN, X.hair.strandW, 'round')));   // round tails, never needles
  out.push(part('hair.strand.far', 61, C.hair, taper(sF, X.hair.strandW, 'round')));
  return out;
}
