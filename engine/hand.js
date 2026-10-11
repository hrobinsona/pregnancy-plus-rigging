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
import { limb, loop, tube } from './shapes.js';
import { ellipse } from './geom.js';

const DEG = Math.PI / 180;
const dirv = (deg) => [Math.cos(deg * DEG), Math.sin(deg * DEG)];
const rot = (v, deg) => { const c = Math.cos(deg * DEG), s = Math.sin(deg * DEG); return [c * v[0] - s * v[1], s * v[0] + c * v[1]]; };
export const HAND_DEFAULTS = {                // anatomical defaults (override per character in the spec)
  fingerLen: [0.9, 1.0, 0.94, 0.76], phalanx: [0.46, 0.3, 0.24], fingerW: [0.98, 1.0, 0.94, 0.82], knuckleArc: [0.965, 1.0, 0.975, 0.915],
  across: [0.37, 0.125, -0.125, -0.37], fan: [-5, -1, 3, 8], taper: [1.0, 0.93, 0.87, 0.82], fingerK: 0.9, rim: 0.015, rootIn: 0.03,
  thumb: { cmc: [0.1, 0.36], mcp: [0.42, 0.6], dir: 18, prox: 0.39, dist: 0.33, w: 1.18, taper: [1.0, 0.9, 0.8] },
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
    const kn = F.map((f) => f.k);
    const palm = [
      P(-0.02, -wW), P(palmL * 0.45, -pW * 0.95), P(palmL * S.knuckleArc[3] * 0.93, -pW * 0.84),   // tucks inside the pinky's outer edge (no palm sliver)
      add(kn[3], mulS(u, -0.01)), add(kn[2], mulS(u, 0.01)), add(kn[1], mulS(u, 0.012)), add(kn[0], mulS(u, 0.005)),
      P(palmL * S.knuckleArc[0] * 0.95, pW * 0.86), P(palmL * 0.62, pW * 0.9), P(palmL * 0.3, pW * 0.84), P(0.02, wW * 1.02), P(-0.03, 0),
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
      out.push({ id: `${fid}.j1`, bone: `${fid}b`, z: zf - 0.0005, fill, geom: ellipse(f.p, f.r[1] * 0.98, f.r[1] * 0.98) });
      out.push({ id: `${fid}.j2`, bone: `${fid}c`, z: zf - 0.0004, fill, geom: ellipse(f.q, f.r[2] * 0.98, f.r[2] * 0.98) });
      // separation rim: this finger's outline (outset by S.rim), shown ONLY over the fingers behind it
      if (behind.length) out.push({ id: `${fid}.rim`, bone: `${fid}c`, z: zf - 0.004, fill: line, geom: tubeOf([f.k, f.p, f.q, f.t], f.r, S.rim), skin, clip: [...behind] });
      behind.push(fid, `${fid}.j1`, `${fid}.j2`);
    });
    // thumb: one tube MCP → IP → tip over t1/t2 (in front of the fingers unless thumbBehind); its rim also shows over
    // the palm, so a thumb laid across the palm keeps its outline
    const zt = S.thumbZ ?? (S.thumbBehind ? z + 0.03 : z + 0.1), tskin = { chain: [`${id}.t1`, `${id}.t2`], zone: 0.5 };
    const tb0 = add(mcp, mulS(sub(cmc, mcp), 0.15));
    out.push({ id: `${id}.thumb`, bone: `${id}.t2`, z: zt, fill, geom: tubeOf([tb0, ip, tt], tr), skin: tskin });
    out.push({ id: `${id}.thumb.j`, bone: `${id}.t2`, z: zt - 0.0005, fill, geom: ellipse(ip, tr[1] * 0.98, tr[1] * 0.98) });
    if (!S.thumbBehind) out.push({ id: `${id}.thumb.rim`, bone: `${id}.t2`, z: zt - 0.004, fill: line, geom: tubeOf([lerp(mcp, ip, 0.4), ip, tt], [lerp([tr[0]], [tr[1]], 0.4)[0], tr[1], tr[2]], S.rim), skin: tskin, clip: [...behind, `${id}.palm`] });   // outlines only the FREE thumb (no arc across its root)
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
