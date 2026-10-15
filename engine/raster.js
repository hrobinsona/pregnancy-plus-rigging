// raster.js — BROWSER-side material-class rasteriser + silhouette fit (used by tools/sil_fit.mjs through a page).
// Renders a pose's parts (same geometry, transforms and clips as rig.toSVG) into a small canvas where every part is
// painted with its MATERIAL CLASS code (skin, hair, top, bottoms, cardigan, sock) instead of its colour, then compares
// with a reference class map (tools/seg_ref.py) in rig units. Measurement only: the reference never reaches a frame.
import { pathD } from './geom.js';

export const CLASS_OF_PALETTE = {
  skin: 1, skinShade: 1, skinLine: 1, cheek: 1, nail: 1, mouth: 1, sick: 1, hair: 2, hairShade: 2, top: 3, topShade: 3,
  bottoms: 4, bottomsShade: 4, cardigan: 5, cardiganShade: 5, sock: 6, sockShade: 6, eye: 7,
  // mum3: a dress (the 'top' class); her flats are the hair's colour, so they share its class (a still can't tell them apart)
  skinFar: 1, earIn: 1, dress: 3, dressShade: 3, shoe: 2, shoeShade: 2, brow: 2,
};
const code = (c) => [c * 30, 255 - c * 30, (c * 70) % 256];   // a code no anti-aliased blend of two codes can imitate exactly

export function makeRaster(rig, C, { box, res }) {
  const [x0, y0, x1, y1] = box, w = Math.round((x1 - x0) / res), h = Math.round((y1 - y0) / res);
  const cv = new OffscreenCanvas(w, h), ctx = cv.getContext('2d', { willReadFrequently: true });
  const Hpx = C.ref?.Hpx ?? 210, k = 1 / (Hpx * res);
  const cls = {}; for (const [n, v] of Object.entries(C.palette)) cls[v.toLowerCase()] = CLASS_OF_PALETTE[n] ?? 7;
  const pathCache = new Map();
  const P2 = (p) => new Path2D(pathD(p.geom, Hpx));
  const setM = (M) => { ctx.setTransform(k, 0, 0, k, -x0 / res, -y0 / res); ctx.transform(M[0], M[1], M[2], M[3], M[4] * Hpx, M[5] * Hpx); };
  function render(pose) {
    const parts = rig.build(pose), byId = Object.fromEntries(parts.map((p) => [p.id, p]));
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = 'rgb(0,255,0)'; ctx.fillRect(0, 0, w, h);
    for (const p of parts) {
      if (p.stroke || !p.fill || p.fill === 'none' || (p.opacity !== undefined && p.opacity < 0.5)) continue;
      const c = p.id.startsWith('prop.') ? 7 : cls[p.fill.toLowerCase()]; if (c === undefined) continue;   // a prop (a chair, a counter): drawn as 'ignore', it hides her where the still's does
      const clips = [...(Array.isArray(p.clip) ? p.clip : p.clip ? [p.clip] : []).map((id) => byId[id]).filter(Boolean), ...(p.clipGeom || []).map((geom) => ({ geom, M: p.M }))];
      ctx.save();
      if (clips.length) {
        const U = new Path2D();
        for (const q of clips) { const m = q.M; U.addPath(P2(q), new DOMMatrix([m[0], m[1], m[2], m[3], m[4] * Hpx, m[5] * Hpx])); }
        setM([1, 0, 0, 1, 0, 0]); ctx.clip(U);
      }
      for (const g of p.clipAnd || []) { setM(p.M); ctx.clip(P2({ geom: g })); }   // (each one intersects)
      setM(p.M); const col = code(c); ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`; ctx.fill(P2(p));
      ctx.restore();
    }
    const d = ctx.getImageData(0, 0, w, h).data, out = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const r = d[4 * i], g = d[4 * i + 1], b = d[4 * i + 2]; let best = 255;
      for (let c = 0; c < 8; c++) { const q = code(c); if (Math.abs(r - q[0]) + Math.abs(g - q[1]) + Math.abs(b - q[2]) < 12) { best = c; break; } }
      out[i] = best;                                                         // 255 = an anti-aliased edge pixel: ignored
    }
    return out;
  }
  return { w, h, render };
}

/** Silhouette + landmark fit, entirely in the page (one evaluate call). cfg = {box, res, ref: [classes], pose0, vars,
 *  lims: {var: [lo, hi]}, targets: [{bone, rest, to, w}], lam, steps, roi: [x0,y0,x1,y1] (H, optional), prior(x) via
 *  priorW: {var: [centre, weight]}}. Returns {pose, x, loss, parts: {lm, sil}}. */
export function silFit(rig, C, cfg) {
  const R = makeRaster(rig, C, cfg), ref = cfg.ref, J = rig.J, BONE = rig.BONE;
  const roiM = new Uint8Array(R.w * R.h).fill(1);
  if (cfg.roi) { const [a, b, c, d] = cfg.roi; for (let j = 0; j < R.h; j++) for (let i = 0; i < R.w; i++) { const X = cfg.box[0] + (i + 0.5) * cfg.res, Y = cfg.box[1] + (j + 0.5) * cfg.res; roiM[j * R.w + i] = X >= a && X <= c && Y >= b && Y <= d ? 1 : 0; } }
  const poseOf = (x) => { const p = structuredClone(cfg.pose0); cfg.vars.forEach((v, i) => { if (v.startsWith('root.')) (p.root ||= [0, 0])[+v.slice(5)] = x[i]; else p.bones[v] = x[i]; }); return p; };
  const carry = (st, bone, q) => { const M = st[bone].M, j = J[BONE[bone].joint]; return [M[0] * (q[0] - j[0]) + M[2] * (q[1] - j[1]) + M[4], M[1] * (q[0] - j[0]) + M[3] * (q[1] - j[1]) + M[5]]; };
  const W8 = cfg.classW || [1, 1.5, 1, 1, 1, 1, 1, 0];
  function loss(x) {
    const pose = poseOf(x), st = rig.solve(pose);
    let lm = 0; for (const t of cfg.targets || []) { const a = carry(st, t.bone, t.rest); lm += t.w * ((a[0] - t.to[0]) ** 2 + (a[1] - t.to[1]) ** 2); }
    const ours = R.render(pose); let mis = 0;
    for (let i = 0; i < ours.length; i++) { if (!roiM[i]) continue; const a = ours[i], b = ref[i]; if (a === 255 || b === 7 || a === 7) continue; if (a !== b) mis += Math.max(W8[a], W8[b]); }
    const sil = mis * cfg.res * cfg.res;
    let pr = 0; for (const [v, [c, wt]] of Object.entries(cfg.priorW || {})) { const i = cfg.vars.indexOf(v); if (i >= 0) pr += wt * (x[i] - c) ** 2; }
    return { L: lm + (cfg.lam ?? 0.2) * sil + pr, lm, sil, pr };
  }
  let x = cfg.vars.map((v) => (v.startsWith('root.') ? (cfg.pose0.root || [0, 0])[+v.slice(5)] : cfg.pose0.bones[v] ?? 0)), best = loss(x), evals = 1;
  for (const step of cfg.steps || [8, 4, 2, 1, 0.5]) {
    for (let pass = 0, imp = true; imp && pass < 30; pass++) {
      imp = false;
      for (let i = 0; i < x.length; i++) {
        const sc = cfg.vars[i].startsWith('root.') ? 0.004 : 1, [lo, hi] = cfg.lims[cfg.vars[i]] || [-180, 180];
        for (const sg of [1, -1]) {
          const y = x.slice(); y[i] = Math.max(lo, Math.min(hi, y[i] + sg * step * sc)); if (y[i] === x[i]) continue;
          const e = loss(y); evals++;
          if (e.L < best.L) { x = y; best = e; imp = true; break; }
        }
      }
    }
  }
  return { pose: poseOf(x), x, loss: best, evals };
}

/** Class map of a pose (for previews / diffs). */
export function classMap(rig, C, pose, box, res) { const R = makeRaster(rig, C, { box, res }); return { w: R.w, h: R.h, data: Array.from(R.render(pose)) }; }
