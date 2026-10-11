// rig.js — assembles parts, applies bone transforms (parent -> child, degrees), emits <g id="mum">.
// Pure: output depends only on (pose, opts). No Date, no Math.random, no frame-to-frame state.
import * as prop from './proportions.js';
import { P } from './palette.js';
import { BONES, BONE } from './skeleton.js';
import { mul, T, R, S, I, pathD, ap } from './geom.js';
import * as hair from './parts/hair.js';
import * as head from './parts/head.js';
import * as torso from './parts/torso.js';
import * as belly from './parts/belly.js';
import * as cardigan from './parts/cardigan.js';
import * as hands from './parts/hands.js';
import * as legs from './parts/legs.js';

export const MODULES = { hair, head, torso, belly, cardigan, hands, legs };
const Hpx = prop.H; // model px per H unit (reference px)

/** World matrices per bone (H units). pose.bones[id] = degrees relative to rest. */
export function solve(pose = {}) {
  const W = {};
  const flip = (pose.facing || prop.design.facing) === 'left';
  for (const b of BONES) {
    const j = prop.joints[b.joint];
    const d = Math.max(b.min, Math.min(b.max, pose.bones?.[b.id] ?? 0));
    if (!b.parent) W[b.id] = mul(flip ? S(-1, 1) : I(), mul(T(j[0], j[1]), R(d)));
    else {
      const pj = prop.joints[BONE[b.parent].joint];
      W[b.id] = mul(W[b.parent], mul(T(j[0] - pj[0], j[1] - pj[1]), R(d)));
    }
  }
  return W;
}

export function jointWorld(pose = {}) {
  const W = solve(pose);
  return Object.fromEntries(BONES.map((b) => [b.id, ap(W[b.id], [0, 0])]));
}

/** All parts, z-sorted, with world matrix and anchor count. */
export function build(pose = {}) {
  const W = solve(pose);
  const ctx = { P, prop, pose };
  const parts = [];
  for (const [name, mod] of Object.entries(MODULES)) {
    for (const p of mod.build(ctx)) {
      const key = p.id.replace(/^mum\./, '');
      const want = mod.ANCHORS[key];
      if (want !== undefined && want !== p.geom.P.length) throw new Error(`${p.id}: ${p.geom.P.length} anchors, documented ${want}`);
      if (!W[p.bone]) throw new Error(`${p.id}: unknown bone ${p.bone}`);
      parts.push({ ...p, module: name, anchors: p.geom.P.length, M: W[p.bone] });
    }
  }
  // stable sort by z, then by module order of appearance
  return parts.map((p, i) => [p, i]).sort((a, b) => a[0].z - b[0].z || a[1] - b[1]).map((x) => x[0]);
}

const f2 = (v) => (Math.round(v * 1000) / 1000).toString();

/** SVG string. opts.frame: 'still' (1080x1920, figure 80% of height) | 'ref' (reference pixel frame). */
export function toSVG(pose = {}, opts = {}) {
  const frame = opts.frame || 'still';
  const parts = build(pose);
  let W, Ht, vb;
  if (frame === 'ref') {
    const [rw, rh] = prop.REF_SIZE;
    const g = prop.REF_GROUND;
    W = rw; Ht = rh; vb = [-g[0], -g[1], rw, rh];
  } else {
    W = opts.width || 1080; Ht = opts.height || 1920;
    const [[x0, y0], [x1, y1]] = prop.frame.bbox;
    const figH = (y1 - y0) * Hpx, s = (opts.fill || 0.8) * Ht / figH;
    const cx = (x0 + x1) / 2 * Hpx, cy = (y0 + y1) / 2 * Hpx;
    vb = [cx - W / s / 2, cy - Ht / s / 2, W / s, Ht / s];
  }
  const bg = opts.bg ?? '#ffffff';
  const sil = opts.silhouette;
  let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Ht}" viewBox="${vb.map(f2).join(' ')}" shape-rendering="geometricPrecision">`;
  if (bg !== 'none') out += `<rect x="${f2(vb[0])}" y="${f2(vb[1])}" width="${f2(vb[2])}" height="${f2(vb[3])}" fill="${bg}"/>`;
  out += '<g id="mum">';
  for (const p of parts) {
    const m = p.M;
    const tf = `matrix(${[m[0], m[1], m[2], m[3], m[4] * Hpx, m[5] * Hpx].map(f2).join(' ')})`;
    out += `<path id="${p.id}" d="${pathD(p.geom, Hpx)}" fill="${sil ? '#000' : p.fill}" transform="${tf}"/>`;
  }
  return out + '</g></svg>';
}
