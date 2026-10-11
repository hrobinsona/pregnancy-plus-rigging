// hand.js — parametric hand generator v2: anatomy-proportioned, separate fingers. Built from first principles of hand
// construction (Loomis / Bridgman / Hampton) and cut-out practice (Toon Boom / Moho):
//  · palm ≈ middle-finger length; palm width ≈ 0.85 × palm length; knuckles (MCP) sit on an ARC — middle furthest,
//    pinky set back; finger lengths index 0.9 · middle 1 · ring 0.94 · pinky 0.76 (pinky tip ≈ ring's last joint)
//  · THREE phalanges per finger, ratio ≈ 0.46 : 0.30 : 0.24; fingers taper base → tip; rounded tips
//  · each finger is one tapered tube chain-skinned over its 3 phalanx bones (continuous outline, bends at the joints),
//    with knuckle discs (circles centred on PIP/DIP) under it so hard curls keep a round outer corner
//  · finger flexion is mostly out of the picture plane in ¾, so it is projected (shortens as it curls); spread is
//    a picture-plane rotation at the knuckle. The DIP is coupled to the PIP (≈ 2/3) like a real finger, unless posed.
//  · thumb = CMC (deep, near the wrist) → MCP → IP; its metacarpal carries the THENAR pad (the fleshy thumb base),
//    so opposition moves the pad with the thumb
//  · SEPARATE FINGERS: every finger keeps its own outline; where it overlaps a finger behind it, a thin shade rim
//    (its outline, clipped to the fingers behind) separates them — exactly at the overlaps, in any pose, never against
//    the background. No crease "lines" painted onto fingers.
//  · hands are animated through a pose LIBRARY (relaxed, open, cup, press, grip, fist, point), blended in angle space.
// Everything is computed from the spec; nothing is sampled from an image.
import { add, sub, mulS, norm, perpL, lerp } from './geom.js';
import { limb, loop, tube, taper } from './shapes.js';
import { ellipse } from './geom.js';

const DEG = Math.PI / 180;
const dirv = (deg) => [Math.cos(deg * DEG), Math.sin(deg * DEG)];
const rot = (v, deg) => { const c = Math.cos(deg * DEG), s = Math.sin(deg * DEG); return [c * v[0] - s * v[1], s * v[0] + c * v[1]]; };
export const HAND_DEFAULTS = {                // anatomical defaults (override per character in the spec)
  fingerLen: [0.9, 1.0, 0.94, 0.76], phalanx: [0.46, 0.3, 0.24], fingerW: [0.98, 1.0, 0.94, 0.82], knuckleArc: [0.965, 1.0, 0.975, 0.915],
  across: [0.37, 0.125, -0.125, -0.37], fan: [-5, -1, 3, 8], taper: [1.0, 0.93, 0.87, 0.82], fingerK: 0.9, rim: 0.022, rootIn: 0.05,
  thumb: { cmc: [0.1, 0.36], mcp: [0.42, 0.6], dir: 18, prox: 0.37, dist: 0.3, w: 1.18, taper: [1.0, 0.9, 0.8] },   // free thumb ≈ 0.75 × index
};

/** spec: { id, parentBone, wrist:[x,y], dir:deg (wrist→middle tip), length, palmFrac, wristW, palmW, thumbSide:+1|-1,
 *          flexFx, thumbFx?, order:[back→front finger indices], z?, thumbZ?, thumbBehind?, + any key of HAND_DEFAULTS }
 *  across: knuckle offsets as fractions of palmW (+ = thumb side); thumb.cmc/mcp: [× palmL, × palmW/2] */
export function makeHand(spec) {
  const S = { ...HAND_DEFAULTS, ...spec, thumb: { ...HAND_DEFAULTS.thumb, ...(spec.thumb || {}) } };
  const id = S.id, W = S.wrist, u = dirv(S.dir), n = mulS(perpL(u), S.thumbSide);
  const P = (along, across) => add(add(W, mulS(u, along)), mulS(n, across));   // hand frame → world
  const palmL = S.length * S.palmFrac, midL = S.length - palmL, pW = S.palmW / 2;
  const joints = {}, bones = [], plane = `${id}.flex`, tplane = `${id}.thumb`;
  const F = [0, 1, 2, 3].map((i) => {
    const k = P(palmL * S.knuckleArc[i], S.palmW * S.across[i]);
    const d = rot(u, S.fan[i] * S.thumbSide);                   // fan < 0 toward the thumb side, > 0 away
    const L = midL * S.fingerLen[i], [a, b, c] = S.phalanx;
    const p = add(k, mulS(d, L * a)), q = add(p, mulS(d, L * b)), t = add(q, mulS(d, L * c));
    const w0 = (S.palmW / 4) * S.fingerW[i] * S.fingerK;          // base WIDTH (full)
    const r = S.taper.map((f) => (w0 / 2) * f);                   // half-widths at MCP, PIP, DIP, tip
    const f = `${id}.f${i + 1}`;
    Object.assign(joints, { [`${f}k`]: k, [`${f}m`]: p, [`${f}d`]: q, [`${f}t`]: t });
    bones.push({ id: `${f}s`, parent: S.parentBone, joint: `${f}k`, aim: `${f}m`, min: -25, max: 25 });
    bones.push({ id: `${f}a`, parent: `${f}s`, joint: `${f}k`, aim: `${f}m`, plane, restAnat: 0, min: -25, max: 95 });
    bones.push({ id: `${f}b`, parent: `${f}a`, joint: `${f}m`, aim: `${f}d`, plane, restAnat: 0, min: -5, max: 110 });
    bones.push({ id: `${f}c`, parent: `${f}b`, joint: `${f}d`, aim: `${f}t`, plane, restAnat: 0, min: -10, max: 90 });
    return { i, k, p, q, t, r };
  });
  // thumb: CMC deep in the palm near the wrist → MCP at the palm's thumb edge → IP → tip
  const th = S.thumb, idxW = (S.palmW / 4) * S.fingerW[0] * S.fingerK;
  const cmc = P(palmL * th.cmc[0], pW * th.cmc[1]), mcp = P(palmL * th.mcp[0], pW * th.mcp[1]);
  const td = rot(u, -th.dir * S.thumbSide);                       // thumb hangs off the hand axis toward its own side
  const ip = add(mcp, mulS(td, midL * th.prox)), tt = add(ip, mulS(td, midL * th.dist));
  const tr = th.taper.map((f) => (idxW / 2) * th.w * f);
  Object.assign(joints, { [`${id}.tc`]: cmc, [`${id}.tb`]: mcp, [`${id}.tm`]: ip, [`${id}.tt`]: tt });
  bones.push({ id: `${id}.ts`, parent: S.parentBone, joint: `${id}.tc`, aim: `${id}.tb`, min: -50, max: 50 });
  bones.push({ id: `${id}.t0`, parent: `${id}.ts`, joint: `${id}.tc`, aim: `${id}.tb`, plane: tplane, restAnat: 0, min: -20, max: 50 });
  bones.push({ id: `${id}.t1`, parent: `${id}.t0`, joint: `${id}.tb`, aim: `${id}.tm`, plane: tplane, restAnat: 0, min: -30, max: 70 });
  bones.push({ id: `${id}.t2`, parent: `${id}.t1`, joint: `${id}.tm`, aim: `${id}.tt`, plane: tplane, restAnat: 0, min: -25, max: 90 });
  const planes = { [plane]: S.flexFx, [tplane]: S.thumbFx ?? S.flexFx };

  const ANCHORS = { [`${id}.palm`]: 12, [`${id}.thenar`]: 6, [`${id}.thumb`]: 8 };
  for (let i = 1; i <= 4; i++) ANCHORS[`${id}.f${i}`] = 10;

  const cap = (a, b, ra, rb) => ensureCW(limb(a, b, [{ t: 0, r: ra, l: ra }, { t: 1, r: rb, l: rb }], { capK: 1.0 }));
  /** parts in rest world space. fill = skin, line = shade (rims) */
  function parts(ctx, { fill, line, zBase }) {
    const out = [], z = zBase ?? S.z ?? 0, wW = S.wristW / 2;
    // palm: wrist → knuckle arc. Pinky side a long gentle curve; the heel of the hand on the thumb side is carried by
    // the thenar pad; the distal edge hides under the finger roots.
    const pd = norm(sub(F[3].p, F[3].k)), pinkyA = Math.atan2(pd[1], pd[0]) * 180 / Math.PI;
    const kn = F.map((f) => f.k), pinkyRoot = sub(add(F[3].k, mulS(n, -F[3].r[0] * 0.98)), mulS(norm(sub(F[3].p, F[3].k)), 0.06));   // pinky's outer edge, just below its knuckle
    const palm = [
      P(-0.06, -wW), add(lerp(P(-0.02, -wW), pinkyRoot, 0.5), mulS(n, -0.006)), [...pinkyRoot, { a: pinkyA }],   // arrives tangent to the pinky's outer edge   // R9: one convex edge from the wrist to the pinky's root (no dent, no step)
      add(kn[3], mulS(u, -0.01)), add(kn[2], mulS(u, 0.01)), add(kn[1], mulS(u, 0.012)), add(kn[0], mulS(u, 0.005)),
      P(palmL * S.knuckleArc[0] * 0.95, pW * 0.86), P(palmL * 0.62, pW * 0.9), P(palmL * 0.3, pW * 0.84), P(-0.06, wW * 1.0), P(-0.07, 0),   // wrist end tucks 0.04 H under the cuff
    ];
    out.push({ id: `${id}.palm`, bone: S.parentBone, z, fill, geom: ensureCW(loop(palm)) });
    // thenar pad on the thumb metacarpal (moves with opposition)
    out.push({ id: `${id}.thenar`, bone: `${id}.t0`, z: z + 0.02, fill,
               geom: cap(add(cmc, mulS(n, pW * 0.05)), add(mcp, mulS(sub(cmc, mcp), 0.05)), tr[0] * 1.15, tr[0] * 1.02) });
    // fingers, back → front. Each finger is ONE tapered tube along its joints (root → PIP → DIP → tip), chain-skinned
    // over its three phalanx bones: a continuous outline that bends only at the joints (no bead/sausage segments).
    // Knuckle discs under the tube (circles centred on PIP/DIP) keep the outer corner round when the finger curls hard.
    const tubeOf = (pts, rs, extra = 0) => ensureCW(tube(pts, rs.map((r) => ({ r: r + extra, l: r + extra })), { capK: 1.0 }));
    const order = S.order || [3, 2, 1, 0], behind = [];
    order.forEach((i, rank) => {
      const f = F[i], fid = `${id}.f${i + 1}`, zf = z + 0.05 + rank * 0.01;
      const root = add(f.k, mulS(norm(sub(f.k, f.p)), S.rootIn)), chain = [`${fid}a`, `${fid}b`, `${fid}c`];
      const skin = { chain, zone: 0.5 };
      out.push({ id: fid, bone: `${fid}c`, z: zf, fill, geom: tubeOf([root, f.p, f.q, f.t], f.r), skin });
      out.push({ id: `${fid}.j1`, bone: `${fid}b`, z: zf - 0.0005, fill, geom: ellipse(f.p, f.r[1] * 0.8, f.r[1] * 0.8) });
      out.push({ id: `${fid}.j2`, bone: `${fid}c`, z: zf - 0.0004, fill, geom: ellipse(f.q, f.r[2] * 0.8, f.r[2] * 0.8) });
      // separation line: ONE continuous round-capped stroke along the side that faces the finger behind, from the
      // knuckle to just before the tip arc, chain-skinned with the finger and clipped to the fingers behind — so it
      // shows only where this finger overlaps them (no outline against the background, no hooks round the tips)
      // hard-curled fingers (grip/fist) read by their knuckle silhouette and lines there only fragment: the line SHORTENS
      // continuously from its tip end as the finger curls past ~55° (no pop between frames), and is dropped below 0.03 H
      const curlOf = (j) => (ctx.pose?.bones?.[`${id}.f${j + 1}a`] ?? 0) + (ctx.pose?.bones?.[`${id}.f${j + 1}b`] ?? 0), bkI = order[Math.max(0, rank - 1)];
      const keepF = Math.max(0, Math.min(1, 1 - (Math.max(curlOf(i), curlOf(bkI)) - 55) / 35));   // fades if this finger OR the one behind curls
      if (behind.length && keepF > 0) {
        const bk = F[order[rank - 1]], d = norm(sub(f.t, f.k)), pl = perpL(d), side = Math.sign((bk.k[0] - f.k[0]) * pl[0] + (bk.k[1] - f.k[1]) * pl[1]) || 1;   // toward the finger behind
        const nn = mulS(perpL(d), side), off = (pt, r) => add(pt, mulS(nn, r + S.rim * 0.4));   // just OUTSIDE the edge (the finger itself is drawn over the line's inner half)
        const pts = [off(lerp(f.k, f.p, 0.42), lerp([f.r[0]], [f.r[1]], 0.42)[0]), off(f.p, f.r[1]), off(f.q, f.r[2])];   // R9: from 30% down the first segment to the DIP — no tip curl (no J/S), no clutter at the knuckles
        const segL = [0, 1].map((j) => Math.hypot(pts[j + 1][0] - pts[j][0], pts[j + 1][1] - pts[j][1])), Lk = (segL[0] + segL[1]) * keepF;
        const cut = Lk <= segL[0] ? [pts[0], lerp(pts[0], pts[1], Lk / segL[0] * 0.5), lerp(pts[0], pts[1], Lk / segL[0])] : [pts[0], pts[1], lerp(pts[1], pts[2], (Lk - segL[0]) / segL[1])];
        if (Lk >= 0.04) out.push({ id: `${fid}.rim`, bone: `${fid}c`, z: zf - 0.004, fill: line, geom: taper(cut, cut.map(() => S.rim), 'round'), skin, clip: [...behind] });
      }
      behind.push(fid, `${fid}.j1`, `${fid}.j2`);
    });
    // thumb: one tube MCP → IP → tip over t1/t2 (in front of the fingers unless thumbBehind); its rim also shows over
    // the palm, so a thumb laid across the palm keeps its outline
    const zt = S.thumbZ ?? (S.thumbBehind ? z + 0.03 : z + 0.1), tskin = { chain: [`${id}.t1`, `${id}.t2`], zone: 0.5 };
    const tb0 = add(mcp, mulS(sub(cmc, mcp), 0.15));
    out.push({ id: `${id}.thumb`, bone: `${id}.t2`, z: zt, fill, geom: tubeOf([tb0, ip, tt], tr), skin: tskin });
    out.push({ id: `${id}.thumb.j`, bone: `${id}.t2`, z: zt - 0.0005, fill, geom: ellipse(ip, tr[1] * 0.98, tr[1] * 0.98) });
    if (!S.thumbBehind && S.thumbLine !== false) {
      // ONE straight line along the inner side of the free thumb tip (rigid on t2: it can never S-bend or hook
      // round the tip). It fades out as the thumb folds across the palm (grip/fist/point), where the thumb's own outline
      // against the fingers reads without it.
      const d = norm(sub(tt, ip)), hc = P(palmL * 0.9, 0), pl = perpL(d), side = Math.sign((hc[0] - ip[0]) * pl[0] + (hc[1] - ip[1]) * pl[1]) || 1, nn = mulS(pl, side);
      // fades by LENGTH (never by opacity — partial opacity renders off-palette tints): the line shortens toward its
      // base as the thumb folds, and is dropped below 0.03 H
      const flex = (ctx.pose?.bones?.[`${id}.t1`] ?? 0) + (ctx.pose?.bones?.[`${id}.t2`] ?? 0) + (ctx.pose?.bones?.[`${id}.t0`] ?? 0);
      const keep = Math.max(0, Math.min(1, 1 - (flex - 35) / 30)), t0 = -0.25, t1 = t0 + (0.78 - t0) * keep;   // ends short of the notch: never shares an endpoint with a finger line (no λ fork)
      const Ltip = Math.hypot(tt[0] - ip[0], tt[1] - ip[1]) * (t1 - t0);
      const pts = [t0, (t0 + t1) / 2, t1].map((t) => add(lerp(ip, tt, t), mulS(nn, lerp([tr[1]], [tr[2]], Math.max(0, t))[0] + S.rim * 0.4)));
      if (Ltip >= 0.03) out.push({ id: `${id}.thumb.rim`, bone: `${id}.t2`, z: zt - 0.004, fill: line, geom: taper(pts, pts.map(() => S.rim), 'round'), clip: [...behind, `${id}.palm`] });
    }
    return out;
  }
  // library spread values are 'away from the thumb'; this sign maps them onto screen rotation for this hand
  const spreadSign = S.thumbSide;
  return { joints, bones, planes, ANCHORS, parts, spreadSign, id };
}

/** keep every loop clockwise on screen (y down) so offsets/outsets behave; deterministic for a given construction */
export function ensureCW(g) {
  let a = 0;
  for (let i = 0; i < g.P.length; i++) { const p = g.P[i], q = g.P[(i + 1) % g.P.length]; a += p[0] * q[1] - q[0] * p[1]; }
  if (a > 0) return g;                                   // y-down: positive shoelace = clockwise on screen
  const n = g.P.length, idx = [0, ...Array.from({ length: n - 1 }, (_, i) => n - 1 - i)];
  return { P: idx.map((i) => g.P[i]), hin: idx.map((i) => g.hout[i]), hout: idx.map((i) => g.hin[i]) };
}
