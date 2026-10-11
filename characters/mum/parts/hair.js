// hair.js — bone: head. Anchor counts (fixed):
//   hair.back 27 · hair.loop 10 · hair.shade.nape 8 · hair.shade.bunCurl 8 · hair.shade.bunBase 12 · hair.shade.crownNotch 3
//   hair.fringe 18 · hair.strand.sweep 4 · hair.strand.far 14 · hair.strand.near 18
//
// Secondary motion: pose.fx.hair = { near: deg, far: deg } (baked springs, see anim.js). Each loose strand's centreline
// is bent as a chain about its root: segment i turns by deg·u_i^1.4 (u = arc fraction), so the root stays pinned and the
// tip travels furthest and settles last. Widths and point counts are untouched (topology fixed).
import { part, lp, st, scaled } from './_util.js';

export const ANCHORS = { 'hair.back': 27, 'hair.loop': 10, 'hair.shade.nape': 8, 'hair.shade.bunCurl': 8, 'hair.shade.bunBase': 12, 'hair.shade.crownNotch': 3,
  'hair.fringe': 18, 'hair.strand.sweep': 4, 'hair.strand.far': 14, 'hair.strand.near': 18 };

const DEG = Math.PI / 180;
export function bend(ln, deg) {
  if (!deg) return ln;
  const p = ln.pts, n = p.length;
  const seg = p.slice(1).map((q, i) => Math.hypot(q[0] - p[i][0], q[1] - p[i][1]));
  const L = seg.reduce((a, b) => a + b, 0);
  const out = [p[0]];
  let acc = 0;
  for (let i = 1; i < n; i++) {
    acc += seg[i - 1];
    const a = deg * Math.pow(acc / L, 1.4) * DEG, c = Math.cos(a), s = Math.sin(a);
    const d = [p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]];
    const prev = out[i - 1];
    out.push([prev[0] + c * d[0] - s * d[1], prev[1] + s * d[0] + c * d[1]]);
  }
  return { ...ln, pts: out };
}

export function build({ P, prop, pose }) {
  const h = prop.head, s = prop.design.headScale;
  const sc = (g) => scaled(g, s);
  const hx = pose.fx?.hair || {};
  return [
    part('hair.back', 'head', 10, P.hair, sc(lp(h.hairBack))),
    part('hair.loop', 'head', 11, P.hair, sc(st(h.hairLoop))),
    part('hair.shade.nape', 'head', 12, P.hairShade, sc(st(h.hairShade[0]))),
    part('hair.shade.bunCurl', 'head', 12, P.hairShade, sc(st(h.hairShade[1]))),
    part('hair.shade.bunBase', 'head', 81, P.hairShade, sc(st(h.hairShade[2]))),
    part('hair.shade.crownNotch', 'head', 81, P.hairShade, sc(lp(h.crownNotch))),
    part('hair.fringe', 'head', 80, P.hair, sc(lp(h.fringe))),
    part('hair.strand.sweep', 'head', 81, P.hairShade, sc(st(h.fringeStrands[0]))),
    part('hair.strand.far', 'head', 84, P.hair, sc(st(bend(h.strandFar, hx.far || 0)))),
    part('hair.strand.near', 'head', 84, P.hair, sc(st(bend(h.strandNear, hx.near || 0)))),
  ];
}
