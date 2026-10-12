// wrap.js — the far hand WRAPPED round the far side of the bump (refs k1/k2/k8). From the front you see ONE hand
// straddling the rim: the back of the hand as a thin crescent just OUTSIDE the bump's outline (it comes out of the cuff
// above), and the fingers curling over the rim onto the near side of the bump, tips just inside it, with the lines
// between them. A cut-out hand pushed there read as a "tab" (feel rounds 3–6); three separate fingertips read as a
// "ridged grub" / a "clip-on bracket" standing proud of the outline with no hand behind them (rounds 7–8). This is a
// REPLACEMENT DRAWING (pipeline lesson 3): when the 3D arm puts the hand on the bump's back surface (arms.js marks its
// parts wrapHand) the hand is hidden and this is drawn at the nearest point of the bump's posed outline, following its
// curve — so it rides the breath with the bump — and its fingers curl more or less with the hidden hand's own finger
// bones (keys and fidgets on hand.far.f*: the hand stays alive). Runs after all modules (character.postBuild).
import { taper } from '../../../engine/shapes.js';
import { loop } from '../../../engine/geom.js';
const ap = (M, v) => [M[0] * v[0] + M[2] * v[1] + M[4], M[1] * v[0] + M[3] * v[1] + M[5]];
const bez = (a, h1, h2, b, t) => { const u = 1 - t; return [0, 1].map((i) => u * u * u * a[i] + 3 * u * u * t * h1[i] + 3 * u * t * t * h2[i] + t * t * t * b[i]); };

export function post(parts, ctx) {
  const hand = parts.filter((p) => p.wrapHand || p.wrapGrow); if (!hand.length) return;
  const gw = hand[0].wrapHand ? hand[0].wrapCupW ?? 1 : hand[0].wrapGrow;          // how far round the rim the hand has gone (arms.js)
  const belly = parts.find((p) => p.id === 'belly'); if (!belly) return;
  const C = ctx.P, X = ctx.C.params.P.wrapFingers || {}, B = ctx.pose?.bones || {};
  // where the hand is: centre of its posed anchors (skinned parts carry posed geometry with M = flip)
  const pts = hand.flatMap((p) => p.geom.P.map((v) => ap(p.M, v)));
  const c = pts.reduce((a, v) => [a[0] + v[0] / pts.length, a[1] + v[1] / pts.length], [0, 0]);
  for (const p of hand) if (p.wrapHand) p.opacity = 0;
  // the bump's posed outline, sampled along its cubic segments
  const g = belly.geom, n = g.P.length, O = [];
  for (let i = 0; i < n; i++) { const a = ap(belly.M, g.P[i]), b = ap(belly.M, g.P[(i + 1) % n]), h1 = ap(belly.M, g.hout[i]), h2 = ap(belly.M, g.hin[(i + 1) % n]); for (let k = 0; k < 12; k++) O.push(bez(a, h1, h2, b, k / 12)); }
  const cen = O.reduce((a, v) => [a[0] + v[0] / O.length, a[1] + v[1] / O.length], [0, 0]);
  let iq = 0, best = Infinity; O.forEach((v, i) => { const d = Math.hypot(v[0] - c[0], v[1] - c[1]); if (d < best) { best = d; iq = i; } });
  const frame = (p, i) => {
    const a = O[(i - 1 + O.length) % O.length], b = O[(i + 1) % O.length], t = [b[0] - a[0], b[1] - a[1]], tl = Math.hypot(...t) || 1;
    let nI = [-t[1] / tl, t[0] / tl]; if ((cen[0] - p[0]) * nI[0] + (cen[1] - p[1]) * nI[1] < 0) nI = [-nI[0], -nI[1]];
    return { p, nI };
  };
  const along = (s) => {   // the outline point s (H, arc length) from the nearest point, with its inward normal
    let i = iq, left = Math.abs(s); const dir = s >= 0 ? 1 : -1;
    while (left > 0) { const j = (i + dir + O.length) % O.length, L = Math.hypot(O[j][0] - O[i][0], O[j][1] - O[i][1]); if (L >= left) { const t = left / L; return frame([O[i][0] + t * (O[j][0] - O[i][0]), O[i][1] + t * (O[j][1] - O[i][1])], i); } left -= L; i = j; }
    return frame(O[i], i);
  };
  const up = along(0.05).p[1] < along(-0.05).p[1] ? 1 : -1;   // which way along the outline is UP (the wrist end, toward the cuff)
  // the hidden hand's finger curl drives the drawing: more flexed → the fingers reach further round the rim
  const flex = ['f1a', 'f2a', 'f3a', 'f4a'].map((f) => B['hand.far.' + f] ?? X.restFlex ?? 23);
  const curl = Math.max(0.7, Math.min(1.35, 1 + 0.01 * (flex.reduce((a, v) => a + v, 0) / 4 - (X.restFlex ?? 23))));
  // CUP (pose.fx['cup.far'], 0–1): the hand arriving round the rim, before it settles to k8's fingertip row — measured on
  // refs h_fore1_0 / h_fore2_*: the back of the hand stands further outside the rim and the fingers reach further over it
  const cup = Math.max(0, Math.min(1, ctx.pose?.fx?.['cup.far'] ?? 0)), K = X.cup || {};
  const L = (X.span ?? 0.36) * (1 + (K.span ?? 0) * cup), back = (X.back ?? 0.06) * gw * (1 + (K.back ?? 0) * cup), sh = X.shift ?? 0;
  const lens = (X.lens ?? [0.1, 0.112, 0.105, 0.085]).map((v) => v * curl * gw * (1 + (K.len ?? 0) * cup)), ws = (X.widths ?? [0.054, 0.057, 0.054, 0.047]).map((v) => v * Math.sqrt(gw) * (1 + (K.width ?? 0) * cup)), nf = lens.length;
  const st = (u) => along(sh + up * (u - 0.5) * L);            // u = 0 at the wrist end (up), 1 below the little finger
  const z = 34.45, M1 = [1, 0, 0, 1, 0, 0];
  // the BACK of the hand: a thin crescent just outside the rim (thickest at the knuckles, thin at the wrist end where the
  // cuff hides it), its inner edge tucked just inside the rim so no background shows between hand and bump
  const outer = [], inner = [];
  for (let k = 0; k <= 8; k++) {
    const u = k / 8, { p, nI } = st(u), o = back * Math.pow(Math.sin(Math.PI * (0.06 + 0.88 * u)), 0.7) * (u < 0.2 ? 0.45 + 2.75 * u : 1);
    outer.push([p[0] - nI[0] * o, p[1] - nI[1] * o]);
    inner.unshift([p[0] + nI[0] * 0.012, p[1] + nI[1] * 0.012]);
  }
  parts.push({ id: 'wrap.far.back', bone: 'belly', z, fill: C.skin, world: true, M: M1, geom: loop([...outer, ...inner], 1.0) });
  // the FINGERS: overlapping, each a rounded finger from the knuckle line at the rim curling in and down over the bump
  // (the upper finger lies over the one below; its lower edge is drawn as the skin line between them, as in k1/k8)
  for (let j = nf - 1; j >= 0; j--) {
    const u = 0.3 + 0.62 * j / (nf - 1), { p, nI } = st(u), d0 = [nI[0], nI[1] + (X.down ?? 0.9)], dl = Math.hypot(...d0), d = [d0[0] / dl, d0[1] / dl];
    const A = [p[0] - nI[0] * back * 0.4, p[1] - nI[1] * back * 0.4], Ln = lens[j], w = ws[j];
    const Mid = [A[0] + nI[0] * Ln * 0.55, A[1] + nI[1] * Ln * 0.55], Bt = [Mid[0] + d[0] * Ln * 0.5, Mid[1] + d[1] * Ln * 0.5];
    const zf = z + 0.002 * (nf - j);
    parts.push({ id: `wrap.far.f${j + 1}`, bone: 'belly', z: zf, fill: C.skin, world: true, M: M1, geom: taper([A, Mid, Bt], [w, w * 0.96, w * 0.8], 'round') });
    if (j < nf - 1) {   // the line under this finger, where it lies over the next
      const side = (q, dir, f) => { const s_ = up > 0 ? -1 : 1; return [q[0] + s_ * -dir[1] * w * f, q[1] + s_ * dir[0] * w * f]; };
      parts.push({ id: `wrap.far.f${j + 1}.line`, bone: 'belly', z: zf + 0.0005, fill: C.skinLine, world: true, M: M1, geom: taper([side(Mid, nI, 0.45), side(lerp2(Mid, Bt, 0.5), d, 0.44), side(Bt, d, 0.3)], [0.002, 0.006, 0.002]) });
    }
  }
}
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
