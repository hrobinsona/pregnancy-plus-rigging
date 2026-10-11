// rig.js — assembles parts, applies bone transforms (parent -> child, degrees), emits <g id="mum">.
// Pure: output depends only on (pose, opts). No Date, no Math.random, no frame-to-frame state.
//
// Bones: rotation (deg, relative to rest) + optional bone-aligned stretch [along, across] (foreshortening / breath).
// Children inherit the parent's rotation and the (stretched) pivot position, NOT its stretch.
// Parts are either rigid (one bone) or skinned: angle-blended across a joint (see skinGeom), which keeps volume
// where plain matrix LBS would collapse ("blend rotations as angles, not matrices").
import * as prop from './proportions.js';
import { P } from './palette.js';
import { BONES, BONE, restAngle } from './skeleton.js';
import { mul, T, R, S, I, pathD, ap, sub, add } from './geom.js';
import * as hair from './parts/hair.js';
import * as head from './parts/head.js';
import * as torso from './parts/torso.js';
import * as belly from './parts/belly.js';
import * as cardigan from './parts/cardigan.js';
import * as hands from './parts/hands.js';
import * as legs from './parts/legs.js';

export const MODULES = { hair, head, torso, belly, cardigan, hands, legs };
const Hpx = prop.H; // model px per H unit (reference px)
const DEG = Math.PI / 180;

const boneStretch = (b, sc) => {
  if (!sc || (sc[0] === 1 && sc[1] === 1)) return I();
  const a0 = restAngle(b);
  return mul(R(a0), mul(S(sc[0], sc[1]), R(-a0)));
};

/** Per-bone world state (H units): pos (pivot), rot (deg), lin (2x2 as matrix, rotation*stretch), M (full matrix). */
export function solve(pose = {}) {
  const st = {};
  for (const b of BONES) {
    const j = prop.joints[b.joint];
    const d = Math.max(b.min, Math.min(b.max, pose.bones?.[b.id] ?? 0));
    const Sb = boneStretch(b, pose.scale?.[b.id]);
    let pos, rot;
    if (!b.parent) {
      const r0 = pose.root || [0, 0];
      pos = [j[0] + r0[0], j[1] + r0[1]]; rot = d;
    } else {
      const pb = BONE[b.parent], ps = st[b.parent];
      const pj = prop.joints[pb.joint];
      pos = ap(ps.M, [j[0] - pj[0], j[1] - pj[1]]);
      rot = ps.rot + d;
    }
    const lin = mul(R(rot), Sb);
    st[b.id] = { pos, rot, Sb, lin, M: mul(T(pos[0], pos[1]), lin) };
  }
  return st;
}

export function jointWorld(pose = {}) {
  const st = solve(pose);
  const flip = (pose.facing || prop.design.facing) === 'left' ? -1 : 1;
  return Object.fromEntries(BONES.map((b) => [b.id, [st[b.id].pos[0] * flip, st[b.id].pos[1]]]));
}

const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

/** Skinned part: anchors live in rest-world space; each anchor blends parent/child by its position along the child bone.
 *  v' = Jw + R(θ_blend)·S_blend·(v − Jr), applied to the anchor and its two handles (keeps handles collinear). */
function skinGeom(g, sk, st) {
  const cb = BONE[sk.child], pbId = sk.parent;
  const Jr = prop.joints[cb.joint], aim = prop.joints[cb.aim];
  const L = Math.hypot(aim[0] - Jr[0], aim[1] - Jr[1]);
  const dir = [(aim[0] - Jr[0]) / L, (aim[1] - Jr[1]) / L];
  const z = (sk.zone ?? 0.2) * L, bias = (sk.bias ?? 0) * L;
  const Jw = st[sk.child].pos;
  const out = { P: [], hin: [], hout: [] };
  g.P.forEach((v, k) => {
    const s = (v[0] - Jr[0]) * dir[0] + (v[1] - Jr[1]) * dir[1] - bias;
    const wc = smooth(-z, z, s), wp = 1 - wc;
    const th = wp * st[pbId].rot + wc * st[sk.child].rot;
    const Sp = st[pbId].Sb, Sc = st[sk.child].Sb;
    const Sbl = Sp.map((x, i) => wp * x + wc * Sc[i]);
    const A = mul(R(th), Sbl);
    const f = (p) => add(Jw, ap(A, sub(p, Jr)));
    out.P.push(f(v)); out.hin.push(f(g.hin[k])); out.hout.push(f(g.hout[k]));
  });
  return out;
}

const toRestWorld = (g, j) => ({ P: g.P.map((p) => add(p, j)), hin: g.hin.map((p) => add(p, j)), hout: g.hout.map((p) => add(p, j)) });

/** All parts, z-sorted, with world matrix (rigid) or world geometry (skinned) and anchor count. */
export function build(pose = {}) {
  const st = solve(pose);
  const flip = (pose.facing || prop.design.facing) === 'left';
  const F = flip ? S(-1, 1) : I();
  const ctx = { P, prop, pose, st };
  const parts = [];
  for (const [name, mod] of Object.entries(MODULES)) {
    for (const p of mod.build(ctx)) {
      const key = p.id.replace(/^mum\./, '');
      const want = mod.ANCHORS[key];
      if (want !== undefined && want !== p.geom.P.length) throw new Error(`${p.id}: ${p.geom.P.length} anchors, documented ${want}`);
      if (!st[p.bone]) throw new Error(`${p.id}: unknown bone ${p.bone}`);
      if (p.skin) {
        const g = skinGeom(toRestWorld(p.geom, prop.joints[BONE[p.bone].joint]), p.skin, st);
        parts.push({ ...p, module: name, anchors: p.geom.P.length, geom: g, M: F });
      } else {
        parts.push({ ...p, module: name, anchors: p.geom.P.length, M: mul(F, st[p.bone].M) });
      }
    }
  }
  // stable sort by z, then by module order of appearance
  return parts.map((p, i) => [p, i]).sort((a, b) => a[0].z - b[0].z || a[1] - b[1]).map((x) => x[0]);
}

const f2 = (v) => (Math.round(v * 1000) / 1000).toString();

/** SVG string. opts.frame: 'still' (1080x1920, figure 80% of height) | 'ref' (reference pixel frame). */
/** Output frame: pixel size and viewBox (model px). Fixed per frame mode, so every pose/time frames identically. */
export function view(opts = {}) {
  const frame = opts.frame || 'still';
  if (frame === 'ref') {
    const [rw, rh] = prop.REF_SIZE, g = prop.REF_GROUND;
    return { W: rw, Ht: rh, vb: [-g[0], -g[1], rw, rh] };
  }
  const W = opts.width || 1080, Ht = opts.height || 1920;
  const [[x0, y0], [x1, y1]] = prop.frame.bbox;
  const figH = (y1 - y0) * Hpx, s = (opts.fill || 0.8) * Ht / figH;
  const cx = (x0 + x1) / 2 * Hpx, cy = (y0 + y1) / 2 * Hpx;
  return { W, Ht, vb: [cx - W / s / 2, cy - Ht / s / 2, W / s, Ht / s] };
}
/** H-unit model point -> output pixel. */
export function toScreen(p, opts = {}) {
  const { W, vb } = view(opts), k = W / vb[2];
  return [(p[0] * Hpx - vb[0]) * k, (p[1] * Hpx - vb[1]) * k];
}

export function toSVG(pose = {}, opts = {}) {
  const parts = build(pose);
  const { W, Ht, vb } = view(opts);
  const bg = opts.bg ?? '#ffffff';
  const sil = opts.silhouette;
  let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Ht}" viewBox="${vb.map(f2).join(' ')}" shape-rendering="geometricPrecision">`;
  if (bg !== 'none') out += `<rect x="${f2(vb[0])}" y="${f2(vb[1])}" width="${f2(vb[2])}" height="${f2(vb[3])}" fill="${bg}"/>`;
  if (opts.ground && !sil) {
    // flat contact shadow on the floor under the socks (fixed: the feet never leave the floor in this rig)
    const J = prop.joints, xs = [J.toeNear[0], J.toeFar[0], J.ankleNear[0], J.ankleFar[0]];
    const x0 = Math.min(...xs), x1 = Math.max(...xs), flip = (pose.facing || prop.design.facing) === 'left' ? -1 : 1;
    const cx = flip * (x0 + x1) / 2 * Hpx, rx = ((x1 - x0) / 2 + 0.32) * Hpx;
    out += `<ellipse id="ground.shadow" cx="${f2(cx)}" cy="${f2(-0.02 * Hpx)}" rx="${f2(rx)}" ry="${f2(0.075 * Hpx)}" fill="${opts.ground}"/>`;
  }
  out += '<g id="mum">';
  for (const p of parts) {
    if (p.opacity !== undefined && p.opacity <= 0.002) continue;
    const m = p.M;
    const tf = `matrix(${[m[0], m[1], m[2], m[3], m[4] * Hpx, m[5] * Hpx].map(f2).join(' ')})`;
    const op = !sil && p.opacity !== undefined && p.opacity < 0.998 ? ` opacity="${f2(p.opacity)}"` : '';
    out += `<path id="${p.id}" d="${pathD(p.geom, Hpx)}" fill="${sil ? '#000' : p.fill}" transform="${tf}"${op}/>`;
  }
  return out + '</g></svg>';
}
