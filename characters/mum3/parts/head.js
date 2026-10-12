// head.js — mum3's face in PROFILE (bone: head). The front edge IS the silhouette (forehead → nose → lips → chin), so the
// face is one skin shape through the measured profile points; the back of it hides under the hair and the ear.
// Face rig channels (pose.face): lid {open|closed|wide|smile|half} (normalised weights), gaze [dx,dy] (H), mouth {smile|neutral|warm|soft}, brow {worry|knit|soft}.
import { loop, taper, ellipse, egg } from '../../../engine/shapes.js';
import { ensureCW } from '../../../engine/hand.js';
import { mapGeom } from '../../../engine/geom.js';

const part = (id, z, fill, geom, extra = {}) => ({ id, bone: 'head', z, fill, geom, ...extra });
const wsum = (w, k) => { const e = Object.entries(w || {}); const s = e.reduce((a, [, v]) => a + Math.max(0, v), 0); return s > 0 ? Math.max(0, w[k] || 0) / s : 0; };

// mouth: a short line from the lips back into the cheek (profile). Offsets from the lips' front corner (H); same counts
const MOUTHS = {
  smile: { p: [[-0.115, -0.034], [-0.08, -0.012], [-0.04, 0.0], [-0.008, 0.0]], w: [0.012, 0.019, 0.02, 0.014] },
  warm: { p: [[-0.125, -0.05], [-0.085, -0.02], [-0.042, -0.002], [-0.008, 0.0]], w: [0.013, 0.021, 0.021, 0.014] },
  neutral: { p: [[-0.095, -0.006], [-0.065, 0.0], [-0.035, 0.002], [-0.008, 0.0]], w: [0.011, 0.016, 0.017, 0.013] },
  soft: { p: [[-0.08, 0.0], [-0.055, 0.006], [-0.03, 0.008], [-0.006, 0.004]], w: [0.01, 0.018, 0.022, 0.016] },   // parted for a slow breath out
};

export const ANCHORS = { 'face': 15, 'ear': 8, 'ear.inner': 4, 'eye': 4, 'brow': 8, 'mouth': 10, 'jaw.shade': 5 };

export function build({ P: C, C: char, pose }) {
  const X = char.params.P, f = X.face, out = [];
  // ---- face: hidden top/back → forehead (hairline) → nose bridge → nose tip → under the nose → lips → chin → jaw → under the ear
  const faceG = loop([
    [f.back[0], f.back[1] - 0.1], [f.hairFront[0] - 0.12, f.hairFront[1] - 0.2], [f.hairFront[0], f.hairFront[1], { a: 95 }],
    [f.bridge[0], f.bridge[1], { a: 100, t: 0.9 }],
    [f.nose[0], f.nose[1], { c: true, ai: -125, ao: 150, ti: 0.9, to: 0.7 }],   // nose tip: soft corner (button nose)
    [f.subnasal[0] + 0.004, f.subnasal[1] - 0.008, { c: true, ai: -20, ao: 85, ti: 0.6, to: 0.6 }],
    [f.lip[0] + 0.01, f.lip[1] + 0.022, { a: 100 }],
    [f.chinFront[0] - 0.004, f.chinFront[1] + 0.004, { a: 92 }],
    [f.chinFront[0] - 0.025, (f.chinFront[1] + f.chin[1]) / 2 + 0.03, { a: 115 }],   // the chin's round front-bottom
    [f.chin[0], f.chin[1], { a: 175 }],                                     // chin underside
    [(f.chin[0] + f.jaw[0]) / 2, (f.chin[1] + f.jaw[1]) / 2 + 0.005],
    [f.jaw[0], f.jaw[1], { a: -140, t: 0.8 }],                              // jaw angle under the ear
    [f.jaw[0] - 0.1, f.jaw[1] - 0.15], [f.back[0] - 0.1, f.back[1] + 0.2], [f.back[0] - 0.06, f.back[1] + 0.03],
  ]);
  out.push(part('face', 40, C.skin, ensureCW(faceG)));
  // shade under the jaw, cast on the throat (the master's one shading cue on the face): a wedge along the jaw, clipped to the neck
  const fj = f.jaw, fc = f.chin;
  out.push(part('jaw.shade', 27, C.skinShade, ensureCW(loop([
    [fj[0] - 0.02, fj[1] - 0.03], [fc[0] - 0.04, fc[1] - 0.03], [fc[0] - 0.12, fc[1] + 0.05, { c: true, t: 0.5 }], [fj[0] + 0.1, fj[1] + 0.2, { t: 0.9 }], [fj[0] + 0.02, fj[1] + 0.06]])),
    { clip: 'neck' }));
  // ear: in front of the hair, with one inner curl
  const e = X.ear;
  out.push(part('ear', 47, C.skin, egg(e.c, { rx: e.rx, rxl: e.rx * 0.9, ryt: e.ry, ryb: e.ry * 0.85, rot: e.rot })));
  out.push(part('ear.inner', 47.5, C.earIn, taper([[e.c[0] - 0.035, e.c[1] - 0.06], [e.c[0] - 0.005, e.c[1] - 0.005], [e.c[0] - 0.03, e.c[1] + 0.055]], [0.006, 0.02, 0.004])));
  // eye: a dark oval (profile: one eye); lids close by squashing toward its lower third, gaze slides it
  // lid.smile: the lower lid lifts into a crescent — the warm eye of a smile. A dot eye that only squashes reads as
  // alert, not tender, at phone size (mum3 v2 critics: "round, wide-open dots" through the look-down smile)
  // lid.half: the upper lid lowered to a flat line over the eye (a soft downward look, not a smaller dot)
  const lw = pose.face?.lid, sm = wsum(lw, 'smile'), hf = wsum(lw, 'half'), open = lw ? wsum(lw, 'open') + 1.2 * wsum(lw, 'wide') + sm + hf : 1, g = pose.face?.gaze || [0, 0];
  const E = X.eye, c = [E.c[0] + g[0], E.c[1] + g[1]];
  let geo = ellipse(c, E.rx, E.ry);
  if (open < 0.999) { const yc = c[1] + E.ry * 0.35, k = Math.max(0.08, open); geo = mapGeom(geo, (p) => [p[0], yc + (p[1] - c[1]) * k + (c[1] - yc) * open]); }
  else if (open > 1.001) geo = mapGeom(geo, (p) => [c[0] + (p[0] - c[0]) * (1 + (open - 1) * 0.4), c[1] + (p[1] - c[1]) * open]);
  if (sm > 0 || hf > 0) { const cy = c[1] + E.ry * 0.35 * (1 - Math.min(1, open)), fB = Math.max(-0.6, 1 - 2.2 * sm), fT = Math.max(0.06, 1 - 2.2 * hf);
    geo = mapGeom(geo, (p) => [p[0], cy + (p[1] - cy) * (p[1] > cy ? fB : fT)]); }
  out.push(part('eye', 53, C.eye, geo));
  // brow: a tapered arc that lifts with wide eyes and drops a little with closed ones; worry lifts its front end
  // soft: the brow relaxes — it drops toward the lid and its arch flattens (v3 critics: the tender face kept the neutral
  // face's high arch, "pleased and attentive more than melting")
  const B = X.brow.p, wo = wsum(pose.face?.brow, 'worry'), kn = wsum(pose.face?.brow, 'knit'), so = wsum(pose.face?.brow, 'soft');
  const dy = (open > 1 ? (1 - open) * 0.06 : (1 - open) * 0.022) + 0.008 * sm + 0.03 * hf + 0.018 * so;   // the brow follows a lowering lid (v2: the gap grew)
  out.push(part('brow', 54, C.brow, taper(B.map((p, i) => [p[0] + (i === 2 ? -0.01 * kn : 0), p[1] + dy + (i === 2 ? -0.025 * wo + 0.02 * kn + 0.004 * so : i === 1 ? -0.008 * wo + 0.014 * so : 0)]), X.brow.w, 'round')));
  // mouth: blend of library shapes from the lips' front corner
  let mw = pose.face?.mouth || { smile: 1 };
  const keys = Object.keys(MOUTHS);
  if (!keys.some((k) => (mw[k] || 0) > 0)) mw = { smile: 1 };
  const tot = keys.reduce((a, k) => a + Math.max(0, mw[k] || 0), 0), wt = (k) => Math.max(0, mw[k] || 0) / tot;
  const pts = MOUTHS.smile.p.map((_, i) => keys.reduce((a, k) => [a[0] + wt(k) * MOUTHS[k].p[i][0], a[1] + wt(k) * MOUTHS[k].p[i][1]], [0, 0]));
  const ws = MOUTHS.smile.w.map((_, i) => keys.reduce((a, k) => a + wt(k) * MOUTHS[k].w[i], 0));
  const m0 = [f.lip[0] - 0.005, f.lip[1] + 0.05];
  out.push(part('mouth', 55, C.mouth, taper(pts.map(([x, y]) => [m0[0] + x, m0[1] + y]), ws, 'round')));
  return out;
}
