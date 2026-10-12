// head.js — mum3's face in ¾ VIEW (bone: head). Unlike the profile, the features sit INSIDE the face: two eyes (the far
// one narrower), two brows, a nose drawn as one shade line down the far side of the nose, a mouth seen from the front. The
// face is one skin shape: hidden under the hair at the top, the far cheek's edge (measured named points) on the right, the
// chin, and the jaw back under the near ear on the left. Face rig channels as mum3 (pose.face): lid {open|closed|wide|
// smile|half}, gaze [dx,dy] (H), mouth {smile|neutral|warm|soft|beam (open, teeth)}, brow {worry|knit|soft}, so mum3's face poses carry over.
import { loop, taper, ellipse, egg } from '../../../engine/shapes.js';
import { ensureCW } from '../../../engine/hand.js';
import { mapGeom } from '../../../engine/geom.js';

const part = (id, z, fill, geom, extra = {}) => ({ id, bone: 'head', z, fill, geom, ...extra });
const wsum = (w, k) => { const e = Object.entries(w || {}); const s = e.reduce((a, [, v]) => a + Math.max(0, v), 0); return s > 0 ? Math.max(0, w[k] || 0) / s : 0; };

// mouth shapes as offsets from the measured mouth's centre (H): smile = the master's open smile, the rest designed from it
const mouthLib = (m) => {
  const c = m.p[2], off = m.p.map((q) => [q[0] - c[0], q[1] - c[1]]);
  const mk = (sx, sy, sw, lift = 0) => ({ p: off.map(([x, y], i) => [x * sx, y * sy - (i === 0 || i === 4 ? lift : 0)]), w: m.w.map((v) => v * sw) });
  return { smile: mk(1, 1, 1), warm: mk(1.08, 1.25, 1.1, 0.008), neutral: mk(0.9, 0.35, 0.42), soft: mk(0.62, 0.3, 1.05), beam: mk(1.12, 1.3, 0.5, 0.012) };
};

export const ANCHORS = { 'face': 11, 'ear': 4, 'ear.inner': 4, 'eye.near': 4, 'eye.far': 4, 'eye.near.hi': 4, 'eye.far.hi': 4, 'brow.near': 12, 'brow.far': 12, 'nose': 12, 'mouth': 12, 'mouth.open': 8, 'mouth.teeth': 8, 'jaw.shade': 6, 'lash.near': 14, 'lash.far': 14 };

export function build({ P: C, C: char, pose }) {
  const X = char.params.P, f = X.face, out = [];
  // ---- face: under the hair at the top → the far temple → the far cheek's edge → chin → the jaw under the near ear → back
  out.push(part('face', 40, C.skin, ensureCW(loop([
    [f.top[0], f.top[1]], [f.cheek[0] - 0.01, f.top[1] + 0.12, { a: 80 }],
    [f.cheek[0], f.cheek[1], { a: 92 }],
    [f.cheekLow[0], f.cheekLow[1], { a: 112 }],
    [f.jawFront[0], f.jawFront[1], { a: 140 }],
    [f.chin[0], f.chin[1], { a: 185, t: 0.8 }],                  // the chin: round, turning into the jaw
    [0.09, -6.112, { a: 212 }],                                  // the jaw is a bowl (measured: flat under the chin, steep under the ear)
    [f.jaw[0], f.jaw[1], { a: 232 }],                            // the jaw runs back up toward the near ear
    [f.earLow[0], f.earLow[1], { a: 240 }],
    [f.back[0], f.back[1]], [f.back[0] + 0.05, f.top[1] + 0.05],
  ]))));
  // shade under the jaw, cast on the throat: a crescent from a point under the ear, widening to 0.08 H at the throat's
  // front under the chin, clipped to the neck (its top hides under the face, so the jaw's bowl is its upper edge; the lower
  // edge measured at x 0.087 / 0.167 / 0.226: y −6.081 / −6.024 / −6.0)
  out.push(part('jaw.shade', 27, C.skinShade, ensureCW(loop([
    [f.jaw[0] + 0.01, f.jaw[1] - 0.02], [f.chin[0] - 0.01, f.chin[1] - 0.03], [0.25, -5.985, { c: true, t: 0.5 }],
    [0.167, -6.024, { a: 210 }], [0.087, -6.083, { a: 221 }], [-0.005, -6.18, { c: true, t: 0.5 }]])), { clip: 'neck' }));
  // ear: the near ear, in front of the hair, with one inner curl
  const e = X.ear;
  out.push(part('ear', 47, C.skin, ellipse(e.c, e.rx, e.ry, e.rot)));
  out.push(part('ear.inner', 47.5, C.earIn, taper([[e.c[0] + 0.01, e.c[1] - 0.075], [e.c[0] + 0.035, e.c[1] - 0.005], [e.c[0] + 0.015, e.c[1] + 0.07]], [0.006, 0.02, 0.004])));
  // eyes: dark ovals with a catch-light; the lid channels squash each toward its lower third (as mum3), gaze slides both
  const lw = pose.face?.lid, sm = wsum(lw, 'smile'), hf = wsum(lw, 'half'), open = lw ? wsum(lw, 'open') + 1.2 * wsum(lw, 'wide') + sm + hf : 1, g = pose.face?.gaze || [0, 0];
  for (const side of ['near', 'far']) {
    const E = X.eyes[side], c = [E.c[0] + g[0], E.c[1] + g[1]], ry = Math.max(E.rx, E.ry) * Math.abs(Math.sin(E.rot * Math.PI / 180)) + Math.min(E.rx, E.ry) * Math.abs(Math.cos(E.rot * Math.PI / 180));
    const fx = [];   // the lid channels as point maps, applied to the eye AND its lash line
    if (open < 0.999) { const yc = c[1] + ry * 0.35, k = Math.max(0.08, open); fx.push((p) => [p[0], yc + (p[1] - c[1]) * k + (c[1] - yc) * open]); }
    else if (open > 1.001) fx.push((p) => [c[0] + (p[0] - c[0]) * (1 + (open - 1) * 0.4), c[1] + (p[1] - c[1]) * open]);
    if (sm > 0 || hf > 0) { const cy = c[1] + ry * 0.35 * (1 - Math.min(1, open)), fB = Math.max(-0.6, 1 - 2.2 * sm), fT = Math.max(0.06, 1 - 2.2 * hf);
      fx.push((p) => [p[0], cy + (p[1] - cy) * (p[1] > cy ? fB : fT)]); }
    const lid = (p) => fx.reduce((q, f) => f(q), p);
    const ft = { warp: 'feature', warpAt: c };   // a nod moves the eye, its catch-light and lashes as one, without shearing them (engine/rig.js)
    out.push(part(`eye.${side}`, 53, C.eye, mapGeom(ellipse(c, E.rx, E.ry, E.rot), lid), ft));
    // the upper lid's lash line, as in the still: over the eye's top from the inner corner, thickening to the outer corner and
    // flicking out past it (the near eye's outer corner is on the left, toward the ear; the far eye's on the right)
    const ca = Math.cos(E.rot * Math.PI / 180), sa = Math.sin(E.rot * Math.PI / 180);
    const onEye = (a) => { const t = a * Math.PI / 180, dx = Math.cos(t), dy = Math.sin(t), lx = ca * dx + sa * dy, ly = -sa * dx + ca * dy;
      const r = 1 / Math.sqrt((lx / E.rx) ** 2 + (ly / E.ry) ** 2) + 0.004; return [c[0] + r * dx, c[1] + r * dy]; };   // just outside the eye's edge
    const s = side === 'near' ? -1 : 1, angs = side === 'near' ? [-25, -60, -95, -135, -172] : [-158, -122, -85, -48, -10];
    const lash = angs.map(onEye), o = lash[4];
    lash.push([o[0] + s * 0.03, o[1] - 0.012]);
    out.push(part(`lash.${side}`, 53.6, C.eye, taper(lash.map(lid), [0.005, 0.012, 0.016, 0.019, 0.017, 0.005], 'round'), ft));
    // the catch-light shrinks away as the lid closes or the smile lifts the lower lid
    const hk = Math.max(0, Math.min(1, open) - 0.6 * sm - 0.7 * hf) ** 1.5, hr = 0.014 * (side === 'near' ? 1 : 0.85) * hk;
    out.push(part(`eye.${side}.hi`, 53.5, C.eyeHi, ellipse([E.hi[0] + g[0], E.hi[1] + g[1] - (1 - Math.min(1, open)) * 0.01], Math.max(1e-4, hr), Math.max(1e-4, hr)), ft));
  }
  // brows: tapered arcs through the measured brows (measured thickness + the anti-aliased pixel on each edge that the
  // dark-run scan leaves out), lifting with wide eyes, dropping with closed ones; worry lifts the inner
  // ends (toward the nose: the near brow's right end, the far brow's left end), soft drops and flattens them
  const wo = wsum(pose.face?.brow, 'worry'), kn = wsum(pose.face?.brow, 'knit'), so = wsum(pose.face?.brow, 'soft');
  const dy = (open > 1 ? (1 - open) * 0.06 : (1 - open) * 0.022) + 0.008 * sm + 0.03 * hf + 0.018 * so;
  for (const side of ['near', 'far']) {
    const B = X.brows[side], n = B.p.length, inner = side === 'near' ? n - 1 : 0;
    const pts = B.p.map((p, i) => { const tIn = 1 - Math.abs(i - inner) / (n - 1);
      return [p[0] + (side === 'near' ? 1 : -1) * 0.01 * kn * tIn, p[1] + dy - 0.025 * wo * tIn ** 2 + 0.02 * kn * tIn + 0.006 * so * (i === 2 ? 1 : 0)]; });
    out.push(part(`brow.${side}`, 54, C.brow, taper(pts, B.w.map((v) => Math.max(v + 0.008, 0.008)), 'round')));
  }
  // nose: one shade line down the far side of the nose (bridge → the tip's round → the hook along the nostril's base)
  const nt = X.nose.tip, nb = X.nose.bridge;
  out.push(part('nose', 52, C.noseLine, taper([[nb[0] + 0.028, nb[1] + 0.06], [nt[0] + 0.036, nt[1] - 0.055], [nt[0] + 0.03, nt[1] - 0.012], [nt[0] + 0.012, nt[1] + 0.008], [nt[0] - 0.035, nt[1] + 0.012]], [0.004, 0.011, 0.012, 0.011, 0.006], 'round')));
  // mouth: blend of the library shapes about the measured mouth centre
  const lib = mouthLib(X.mouth), keys = Object.keys(lib);
  let mw = pose.face?.mouth || { smile: 1 };
  if (!keys.some((k) => (mw[k] || 0) > 0)) mw = { smile: 1 };
  const tot = keys.reduce((a, k) => a + Math.max(0, mw[k] || 0), 0), wt = (k) => Math.max(0, mw[k] || 0) / tot;
  const mc = X.mouth.p[2];
  const pts = lib.smile.p.map((_, i) => keys.reduce((a, k) => [a[0] + wt(k) * lib[k].p[i][0], a[1] + wt(k) * lib[k].p[i][1]], [0, 0]));
  const ws = lib.smile.w.map((_, i) => keys.reduce((a, k) => a + wt(k) * lib[k].w[i], 0));
  const M = pts.map(([x, y]) => [mc[0] + x, mc[1] + y]);
  out.push(part('mouth', 55, C.mouth, taper(M, ws, 'round')));
  // beam: the smile OPENS (stills q_k_mid/up): below the lip line a crescent of lip, 0.06 H deep at full beam, a band of
  // teeth across its top (60% of the depth). Both grow from zero area with the beam's weight, so the mouth opens, never pops
  const b = wt('beam'), dep = [0, 0.75, 1, 0.8, 0].map((v) => v * 0.065 * b), tee = dep.map((v) => v * 0.6);
  const under = (d, o = 0) => [3, 2, 1].map((i) => [M[i][0], M[i][1] + o + d[i]]);
  out.push(part('mouth.open', 54.8, C.mouth, loop([[...M[0], { c: true }], ...M.slice(1, 4), [...M[4], { c: true }], ...under(dep)])));
  out.push(part('mouth.teeth', 54.9, C.teeth, loop([[...M[0], { c: true }], ...M.slice(1, 4).map(([x, y]) => [x, y + 0.004 * b]), [...M[4], { c: true }], ...under(tee, 0.004 * b)])));
  return out;
}
