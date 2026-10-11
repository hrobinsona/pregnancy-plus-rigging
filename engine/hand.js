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
import { ellipse, ap } from './geom.js';

const DEG = Math.PI / 180;
const polyLen = (pts) => pts.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
/** the first L of a polyline, as exactly n points (joint vertices kept while inside; the longest segment is split to pad) */
function truncPoly(pts, L, n) {
  const out = [pts[0]]; let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const sl = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (acc + sl >= L) { const t = (L - acc) / Math.max(sl, 1e-9); out.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]); break; }
    out.push(pts[i]); acc += sl;
  }
  while (out.length > n) out.splice(out.length - 2, 1);
  while (out.length < n) {
    let bi = 0, bl = -1;
    for (let i = 1; i < out.length; i++) { const l = Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]); if (l > bl) { bl = l; bi = i; } }
    out.splice(bi, 0, [(out[bi][0] + out[bi - 1][0]) / 2, (out[bi][1] + out[bi - 1][1]) / 2]);
  }
  return out;
}
const clamp01 = (x) => Math.max(0, Math.min(1, x)), smooth01 = (x) => { const t = clamp01(x); return t * t * (3 - 2 * t); };
const dirv = (deg) => [Math.cos(deg * DEG), Math.sin(deg * DEG)];
const rot = (v, deg) => { const c = Math.cos(deg * DEG), s = Math.sin(deg * DEG); return [c * v[0] - s * v[1], s * v[0] + c * v[1]]; };
export const HAND_DEFAULTS = {                // anatomical defaults (override per character in the spec)
  fingerLen: [0.9, 1.0, 0.94, 0.76], phalanx: [0.46, 0.3, 0.24], fingerW: [0.98, 1.0, 0.94, 0.82], knuckleArc: [0.965, 1.0, 0.975, 0.915],
  across: [0.37, 0.125, -0.125, -0.37], fan: 'touch', touch: 0.9, taper: [1.0, 0.94, 0.88, 0.82], tipK: 0.95, fingerK: 0.9, rim: 0.02, rootIn: 0.05,
  view: 'back', hypoWebStart: 0.35, hypo: 0.018, thenarEdge: [0.84, 0.9], webK: 0.3, lineTipGap: 1.0, lineEnd: 0.8, crease: [[0.1, 0.25]], creaseHook: [0.9, 0.45], thumbWeb: [0.95, 0.86],   // thenar crease (palm view): heel of the hand → under the thumb tip                                // 'back' (dorsal: curled phalanges fold BEHIND the hand) | 'palm' (they curl in front of it)
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
  // FINGERS TOGETHER BY CONSTRUCTION ('touch'): each finger is aimed so its tip sits beside its neighbours' tips
  // (centre spacing = touch × the two tip radii), i.e. the fingers converge just enough to cancel their taper and stay in
  // contact base to tip — a relaxed hand is one grouped mass with staggered tips, never a rake. Spread is then a pose
  // (the f{i}s bones), not a property of the drawing. fanAdd: small per-finger tweaks in degrees (+ = away from thumb).
  const Ls = [0, 1, 2, 3].map((i) => midL * S.fingerLen[i]), kLat = S.across.map((a) => S.palmW * a);
  const rTip = [0, 1, 2, 3].map((i) => (S.palmW / 4) * S.fingerW[i] * S.fingerK / 2 * S.taper[3]);
  let fan = S.fan;
  if (fan === 'touch') {
    const g = (i, j) => (rTip[i] + rTip[j]) * S.touch, mid = (kLat[1] + kLat[2]) / 2, lat = [];
    lat[1] = mid + g(1, 2) / 2; lat[2] = mid - g(1, 2) / 2; lat[0] = lat[1] + g(0, 1); lat[3] = lat[2] - g(2, 3);
    fan = [0, 1, 2, 3].map((i) => -Math.asin(Math.max(-1, Math.min(1, (lat[i] - kLat[i]) / Ls[i]))) / DEG);
  }
  fan = fan.map((v, i) => v + (S.fanAdd?.[i] ?? 0));
  const F = [0, 1, 2, 3].map((i) => {
    const k = P(palmL * S.knuckleArc[i], S.palmW * S.across[i]);
    const d = rot(u, fan[i] * S.thumbSide);                     // fan < 0 toward the thumb side, > 0 away
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
  for (let i = 1; i <= 4; i++) ANCHORS[`${id}.f${i}`] = 11;   // tube: 5 stations (root, MCP, PIP, mid, visible end) × 2 + tip cap (root flat, sunk in the palm)

  const cap = (a, b, ra, rb) => ensureCW(limb(a, b, [{ t: 0, r: ra, l: ra }, { t: 1, r: rb, l: rb }], { capK: 1.0 }));
  /** parts in rest world space. fill = skin, line = shade (rims) */
  function parts(ctx, { fill, line, zBase, nail = S.nails ? ctx.P?.nail : null }) {
    const out = [], z = zBase ?? S.z ?? 0, wW = S.wristW / 2;
    // palm: wrist → knuckle arc. Pinky side a long gentle curve; the heel of the hand on the thumb side is carried by
    // the thenar pad; the distal edge hides under the finger roots.
    const pd = norm(sub(F[3].p, F[3].k)), pinkyA = Math.atan2(pd[1], pd[0]) * 180 / Math.PI;
    const kn = F.map((f) => f.k), pinkyRoot = add(F[3].k, mulS(n, -F[3].r[0] * 0.95));   // pinky's outer edge AT its knuckle: inside the MCP disc, so a flexed pinky never exposes the palm's corner
    // incoming handle at a corner: between the chord back to the previous anchor and the given tangent, so an edge that
    // must arrive ALONG a finger never bulges sideways past the chord (exposed as a tongue when that finger curls)
    // w = 0: exactly the tangent (a straight pinky: palm edge flows into its edge) … w = 1: the chord (a curled pinky)
    const inA = (pt, prev, tanDeg, w) => { const c = Math.atan2(prev[1] - pt[1], prev[0] - pt[0]) * 180 / Math.PI; const dd = ((tanDeg - c + 540) % 360) - 180; return c + dd * (1 - w); };
    const pkCurl = clamp01(((ctx.pose?.bones?.[`${id}.f4a`] ?? 0) - 15) / 45);   // continuous in the pose: no pop
    const webAt = (j) => {   // web point between finger j and j−1 (toward the index)
      const a = F[j], b = F[j - 1], dd = norm(add(sub(a.p, a.k), sub(b.p, b.k))), La = (Math.hypot(a.p[0] - a.k[0], a.p[1] - a.k[1]) + Math.hypot(b.p[0] - b.k[0], b.p[1] - b.k[1])) / 2;
      return add(lerp(a.k, b.k, 0.5), mulS(dd, S.webK * La));
    };
    // the thumb-side envelope follows the thumb: as it ADDUCTS toward the palm (library ts < 0) the envelope pulls in with it
    // (continuous in the pose), so it never stands proud of a tucked thumb (R15 press kink)
    const tsLib = -(ctx.pose?.bones?.[`${id}.ts`] ?? 0) * S.thumbSide, tFoldE = ['t0', 't1', 't2'].reduce((acc, b) => acc + (ctx.pose?.bones?.[`${id}.${b}`] ?? 0), 0);
    const thE = S.thenarEdge.map((v, k) => (k === 0 ? v : v - (v - 1.0) * clamp01(Math.max(-tsLib / 12, tFoldE / 70))));   // follows adduction AND flexion of the thumb   // only the distal anchor: the proximal one sits over the thenar pad, which stays put
    const palm = [
      P(-0.7 * wW, -0.7 * wW), add(lerp(P(-0.04, -wW), pinkyRoot, 0.5), mulS(n, -S.hypo)), [...pinkyRoot, { c: true, ai: inA(pinkyRoot, add(lerp(P(-0.04, -wW), pinkyRoot, 0.5), mulS(n, -S.hypo)), pinkyA + 180, pkCurl), ti: 1.05 - 0.5 * pkCurl, ao: Math.atan2(F[3].k[1] - pinkyRoot[1], F[3].k[0] - pinkyRoot[0]) * 180 / Math.PI }],   // corner: arrives along the pinky's edge, leaves ACROSS the knuckle (never bulges past it when the pinky curls)   // arrives tangent to the pinky's outer edge   // R9: one convex edge from the wrist to the pinky's root (no dent, no step)
      ...[3, 2, 1].map(webAt), add(kn[0], mulS(u, 0.018)),   // WEBBING: between two knuckles the palm's edge dips to where the fingers meet (≈ webK of the first phalanx) — hidden when the fingers are together, the V of skin between spread fingers, and no enclosed gap at the roots
      P(palmL * S.knuckleArc[0] * S.thumbWeb[0], pW * S.thumbWeb[1]), P(palmL * 0.62, pW * thE[1]),   // thumbWeb: the thumb–index web (inside the chord index root → thumb: a round U, no shelf)
      P(palmL * 0.3, pW * thE[0]), P(-0.7 * wW, 0.7 * wW), P(-wW, 0),   // R12: the wrist end is a SEMICIRCLE about the wrist pivot (joint = circle: the hand stays inside the cuff at any flex). Thumb side envelops the ball of the thumb: one convex edge cuff → thumb (no corner where the thenar pad pokes out)   // wrist end tucks well under the cuff (its corners never peek past the cuff's rounded end)
    ];
    out.push({ id: `${id}.palm`, bone: S.parentBone, z, fill, geom: ensureCW(loop(palm)) });
    // HYPOTHENAR WEB (a corrective, skinned shape): a tube from the palm's outer edge (mid-palm) to the pinky's first joint,
    // its outer side flush with both. Chain-skinned palm → pinky, it bends WITH the pinky, so the outer edge of the hand stays
    // one curve as the pinky spreads or curls — a fixed palm edge can only meet the pinky cleanly in one pose (R14 kinks).
    if (S.hypoWeb !== false) {
      const f4 = F[3], rb = f4.r[0] * 0.62, d4 = norm(sub(f4.p, f4.k)), out4 = mulS(perpL(d4), Math.sign((-(n[0]) * perpL(d4)[0] - n[1] * perpL(d4)[1])) || 1);   // toward the pinky's OUTER side (−n)
      const raw = loop(palm), bz = (t) => { const [p0, p1, p2, p3] = [raw.P[1], raw.hout[1], raw.hin[2], raw.P[2]], u_ = 1 - t;
        return [0, 1].map((c) => u_ * u_ * u_ * p0[c] + 3 * u_ * u_ * t * p1[c] + 3 * u_ * t * t * p2[c] + t * t * t * p3[c]); };
      const eA = bz(S.hypoWebStart), tA = norm(sub(bz(S.hypoWebStart + 0.02), eA)), inA_ = mulS(perpL(tA), Math.sign(perpL(tA)[0] * n[0] + perpL(tA)[1] * n[1]) || 1);
      const hA = add(eA, mulS(inA_, rb)), hB = add(f4.p, mulS(out4, f4.r[1] - rb));   // outer side ON the palm's real edge … ON the pinky's outer edge
      out.push({ id: `${id}.hypo`, bone: `${id}.f4a`, z: z + 0.05 - 0.0008, fill, skin: { chain: [S.parentBone, `${id}.f4a`], zone: 0.6 },
                 geom: ensureCW(tube([hA, lerp(hA, hB, 0.5), hB], [rb, rb, rb].map((r) => ({ r, l: r })), { capK: 1.0 })) });
    }
    // thenar pad on the thumb metacarpal (moves with opposition)
    out.push({ id: `${id}.thenar`, bone: `${id}.t0`, z: z + 0.02, fill,
               geom: cap(add(cmc, mulS(n, pW * 0.05)), add(mcp, mulS(sub(cmc, mcp), 0.05)), tr[0] * 1.15, tr[0] * 1.02) });
    // fingers, back → front. Each finger is ONE tapered tube along its joints (root → PIP → DIP → tip), chain-skinned
    // over its three phalanx bones: a continuous outline that bends only at the joints (no bead/sausage segments).
    // Knuckle discs under the tube (circles centred on PIP/DIP) keep the outer corner round when the finger curls hard.
    const tubeOf = (pts, rs, extra = 0, k = 1.0, capA = 'round') => ensureCW(tube(pts, rs.map((r) => ({ r: r + extra, l: r + extra })), { capK: k, capA }));
    const order = S.order || [3, 2, 1, 0], behind = [];
    const ang = (j, k) => ctx.pose?.bones?.[`${id}.f${j + 1}${k}`] ?? 0, rimStart = [];
    order.forEach((i, rank) => {
      const f = F[i], fid = `${id}.f${i + 1}`, zf = z + 0.05 + rank * 0.01;
      const root = add(f.k, mulS(norm(sub(f.k, f.p)), S.rootIn)), chain = [`${fid}a`, `${fid}b`, `${fid}c`];
      const skin = { chain, zone: 0.5 };
      // DEPTH RULE: seen from the back of the hand, a phalanx that has turned past ~100° of total flexion
      // points back toward the palm side — it is BEHIND the hand, not drawn over it. The finger's visible length
      // shortens continuously (no pop) as the middle, then the distal phalanx folds away, so a fist from the back is the
      // knuckle row (round bumps) on a block, not a bag of fingertips.
      const Lb = Math.hypot(f.q[0] - f.p[0], f.q[1] - f.p[1]), Lc = Math.hypot(f.t[0] - f.q[0], f.t[1] - f.q[1]);
      const dP = norm(sub(f.t, f.p)), at = (dd) => add(f.p, mulS(dP, dd));
      const rAt = (dd) => (dd <= Lb ? lerp([f.r[1]], [f.r[2]], dd / Lb)[0] : lerp([f.r[2]], [f.r[3]], Math.min(1, (dd - Lb) / Lc))[0]);
      let sVis = 2;
      {   // both views: the palm view's hard curl folds a phalanx 180° onto its neighbour, which no skinned tube draws
          // cleanly — there too the folded part tucks away and the curled hand reads as a clean mitten with a knuckle row
        const a2 = ang(i, 'a') + ang(i, 'b'), a3 = a2 + (ctx.pose?.bones?.[`${fid}c`] ?? ang(i, 'b') * 0.67);
        const vD = clamp01(1 - (a3 - 115) / 50), vM = clamp01(1 - (a2 - 100) / 50);
        sVis = Math.min(1 + vD, 0.1 + 1.9 * vM);
      }
      const dE = sVis <= 1 ? sVis * Lb : Lb + (sVis - 1) * Lc, wq = sVis <= 1 ? 0 : smooth01((sVis - 1) / 0.5), dM = lerp([dE / 2], [Lb], wq)[0];
      // R16: the finger is built IN POSED SPACE — the joints are carried by the bones (so flexion foreshortens the finger), and a
      // tube of TRUE radius is drawn through them. Stretching a rest-space tube along its bones (skinning) sheared its cross-
      // section when the phalanx foreshortened: flat-cut ends, squashed caps, steps against the round joint discs.
      const La = Math.hypot(f.p[0] - f.k[0], f.p[1] - f.k[1]), dK = norm(sub(f.p, f.k));
      const posed = ctx.st ? (b, v, jv) => ap(ctx.st[b].M, sub(v, jv)) : (b, v) => v;
      const PK = posed(`${fid}a`, f.k, f.k), PP = posed(`${fid}b`, f.p, f.p), PQ = posed(`${fid}c`, f.q, f.q), PT = posed(`${fid}c`, f.t, f.q), PR = posed(`${fid}s`, root, f.k);
      const bdir = (b) => rot(dK, ctx.st ? ctx.st[b].rot : 0);
      /** rest distance along the finger from the knuckle → posed point + posed direction */
      const along = (dd) => dd <= La ? [lerp(PK, PP, clamp01(dd / La)), bdir(`${fid}a`)] : dd <= La + Lb ? [lerp(PP, PQ, (dd - La) / Lb), bdir(`${fid}b`)] : [lerp(PQ, PT, clamp01((dd - La - Lb) / Lc)), bdir(`${fid}c`)];
      const EP = along(La + dE)[0], MP = along(La + dM)[0];
      out.push({ id: fid, bone: `${fid}c`, z: zf, fill, world: true,
                 geom: tubeOf([PR, PK, PP, MP, EP], [f.r[0] * 0.8, f.r[0], f.r[1], rAt(dM), rAt(dE)], 0, S.tipK, 'none') });   // round fingertip pad; FLAT root sunk in the palm (a round root bulges past the palm's edge)
      out.push({ id: `${fid}.j0`, bone: `${fid}a`, z: zf - 0.0006, fill, world: true, geom: ellipse(PK, f.r[0] * 0.84, f.r[0] * 0.84) });   // MCP knuckle: round outer corner when the knuckle flexes hard (fist = a row of round knuckles, no teeth)
      out.push({ id: `${fid}.j1`, bone: `${fid}b`, z: zf - 0.0005, fill, world: true, geom: ellipse(PP, f.r[1], f.r[1]) });   // full tube width: a foreshortened next phalanx ends round
      const j2k = smooth01((dE - 0.5 * Lb) / (0.5 * Lb));   // DIP disc, shrinking away as the middle phalanx folds behind
      if (j2k > 0.05) out.push({ id: `${fid}.j2`, bone: `${fid}c`, z: zf - 0.0004, fill, world: true, geom: ellipse(PQ, f.r[2] * j2k, f.r[2] * j2k) });
      const eR = rAt(dE) * Math.min(1, S.tipK + 0.05);
      out.push({ id: `${fid}.j3`, bone: `${fid}c`, z: zf - 0.0003, fill, world: true, geom: ellipse(EP, eR, eR) });   // round visible end
      // separation line: ONE continuous round-capped stroke along the side that faces the finger behind, from the
      // knuckle to just before the tip arc, chain-skinned with the finger and clipped to the fingers behind — so it
      // shows only where this finger overlaps them (no outline against the background, no hooks round the tips)
      // hard-curled fingers (grip/fist) read by their knuckle silhouette and lines there only fragment: the line SHORTENS
      // continuously from its tip end as the finger curls past ~55° (no pop between frames), and is dropped below 0.03 H
      const curlOf = (j) => (ctx.pose?.bones?.[`${id}.f${j + 1}a`] ?? 0) + (ctx.pose?.bones?.[`${id}.f${j + 1}b`] ?? 0), bkI = order[Math.max(0, rank - 1)];
      const [cf0, cf1] = S.view === 'palm' ? [50, 35] : [55, 35], keepF = Math.max(0, Math.min(1, 1 - (Math.max(curlOf(i), curlOf(bkI)) - cf0) / cf1));   // palm view: curling fingers come forward over their own lines — the comb goes early (no fragments)   // fades if this finger OR the one behind curls (a curled hand reads by its knuckle row)
      if (behind.length && keepF > 0) {
        const bk = F[order[rank - 1]], d = norm(sub(f.t, f.k)), pl = perpL(d), side = Math.sign((bk.k[0] - f.k[0]) * pl[0] + (bk.k[1] - f.k[1]) * pl[1]) || 1;   // toward the finger behind
        const nn = mulS(perpL(d), side), off = (pt, r) => add(pt, mulS(nn, r + S.rim * 0.4));   // just OUTSIDE the edge (the finger itself is drawn over the line's inner half)
        const lineEndC = S.lineEnd * (1 - clamp01((curlOf(i) - 25) / 45)), s0 = S.lineStart ?? (S.view === 'palm' ? 0.14 : 0.15);   // palm: the round start cap sits inside the digital crease's width (no knob at the T)   // palm view: from the digital crease; back view: just below the knuckle
        // R12: the line runs INTO the distal segment (to lineEnd of it), ending just above the notch between the fingertips
        // as in the reference — stopping at the DIP made the hand a slab with slits (and the far palm comb an "E")
        const pts = [off(lerp(f.k, f.p, s0), lerp([f.r[0]], [f.r[1]], s0)[0]), off(f.p, f.r[1]), off(f.q, f.r[2]), off(lerp(f.q, f.t, lineEndC), rAt(Lb + lineEndC * Lc))];
        rimStart[i] = pts[0];
        // never past the TIP of the finger behind (a shorter finger, e.g. the pinky behind the ring): the line would cross its
        // tip outline and leave a crescent sliver — lines stop short of the tips, as in the reference
        const alongOf = (pt) => (pt[0] - f.k[0]) * d[0] + (pt[1] - f.k[1]) * d[1], aEnd = alongOf(bk.t) - S.lineTipGap * bk.r[3];
        const capF = clamp01((aEnd - alongOf(pts[0])) / Math.max(1e-6, alongOf(pts[3]) - alongOf(pts[0])));
        // spread fingers no longer overlap: the line fades (by length) as this finger and the one behind spread apart, so it is
        // never clipped into a needle wedge in the V between them
        const spr = Math.abs((ctx.pose?.bones?.[`${fid}s`] ?? 0) - (ctx.pose?.bones?.[`${id}.f${bkI + 1}s`] ?? 0)), keepS = clamp01(1 - (spr - 3) / 5);
        const Lk = polyLen(pts) * Math.min(keepF, capF, keepS), cut = truncPoly(pts, Lk, 4);
        const toPosed = (pt) => { const dd = alongOf(pt), lat = (pt[0] - f.k[0]) * nn[0] + (pt[1] - f.k[1]) * nn[1], [c, dir] = along(dd); return add(c, mulS(perpL(dir), side * lat)); };
        if (Lk >= 0.04) out.push({ id: `${fid}.rim`, bone: `${fid}c`, z: zf - 0.004, fill: line, world: true, geom: taper(cut.map(toPosed), cut.map(() => S.rim), 'round'), clip: [...behind] });
      }
      if (nail) {
        const tot = curlOf(i) + (ctx.pose?.bones?.[`${fid}c`] ?? curlOf(i) * 0.4), vis = Math.max(0, Math.min(1, 1 - (tot - 70) / 45));
        if (vis > 0.05) {
          const dq = norm(sub(f.t, f.q)), Lq = Math.hypot(f.t[0] - f.q[0], f.t[1] - f.q[1]), c = add(f.q, mulS(dq, Lq * 0.66));
          const nAng = Math.atan2(dq[1], dq[0]);
          out.push({ id: `${fid}.nail`, bone: `${fid}c`, z: zf + 0.003, fill: nail, clip: fid,
                     geom: ellipse(c, Lq * 0.36 * vis, f.r[3] * 0.62, nAng) });
        }
      }
      behind.push(fid, `${fid}.j0`, `${fid}.j1`, `${fid}.j2`, `${fid}.j3`);
    });
    // PALM VIEW creases (the two lines that make a hand read as a palm, as in the reference): the thenar crease sweeping
    // from the heel of the hand round the ball of the thumb to the thumb–index web, and the digital crease across the
    // finger roots (the palm's skin runs ~¼ up the first phalanx, so from the palm the fingers start there). Both are
    // clipped to the hand so their round ends never touch the silhouette; the digital crease shortens toward its middle
    // as the knuckles flex (curled fingers come forward over it), dropped below 0.04 H.
    if (S.view === 'palm' && S.palmLines !== false && line) {
      // R12: ONE stroke — heel of the hand → sweeping under the ball of the thumb → along the thumb's inner edge to past its
      // joint (the reference's single S-line). Skinned along the thumb chain (heel end rides the thenar), drawn ABOVE the thumb
      // so its outline can never cut it (no flat cut, no pointed start, no fork); shortens by length as the thumb folds.
      const tFlex = ['t0', 't1', 't2'].reduce((acc, b) => acc + (ctx.pose?.bones?.[`${id}.${b}`] ?? 0), 0);
      // folding the thumb across the palm: the whole crease shrinks away (no tadpole stub); spreading it: the thumb's edge
      // borders the background, so the stroke retreats to its palm part (never an outline against the background)
      const keepT = clamp01(1 - (tFlex - 50) / 30) * clamp01(1 - (-(ctx.pose?.bones?.[`${id}.ts`] ?? 0) * S.thumbSide - 4) / 6);   // only SPREADING (library ts > 0) removes it; an adducted, pressed thumb keeps it   // gone by |ts| 10 (no pill left on an open palm)
      const td0 = norm(sub(tt, ip)), tpl = perpL(td0), hcen = P(palmL * 0.9, 0), tside = Math.sign((hcen[0] - ip[0]) * tpl[0] + (hcen[1] - ip[1]) * tpl[1]) || 1, tnn = mulS(tpl, tside);
      const cA = P(palmL * S.crease[0][0], pW * S.crease[0][1]);
      const cC = add(lerp(mcp, ip, 0.4), mulS(tnn, lerp([tr[0]], [tr[1]], 0.4)[0] + S.rim * 0.4));
      const cD = add(lerp(ip, tt, 0.6), mulS(tnn, lerp([tr[1]], [tr[2]], 0.6)[0] + S.rim * 0.4));
      // R15: a J round the ball of the thumb — heel → down toward the index base → hooks at the thumb–index web → back UP the
      // thumb's inner edge (the reference's line encloses the thenar; a heel→thumb sweep made a "7")
      const cB = P(palmL * S.creaseHook[0], pW * S.creaseHook[1]), cC2 = add(ip, mulS(tnn, tr[1])), cD2 = add(lerp(ip, mcp, 0.75), mulS(tnn, lerp([tr[1]], [tr[0]], 0.75)[0]));   // up-arm ON the thumb's inner edge, most of the way to the MCP
      // one smooth quadratic through the hook (a U, never a V): control point such that the curve's midpoint IS the hook
      const ctl = sub(mulS(cB, 2), mulS(add(cA, cD2), 0.5)), q2 = (t) => add(add(mulS(cA, (1 - t) * (1 - t)), mulS(ctl, 2 * t * (1 - t))), mulS(cD2, t * t));
      const cpts = [0, 0.2, 0.4, 0.6, 0.8, 1].map(q2), cL = polyLen(cpts) * keepT;
      if (cL >= 0.04) out.push({ id: `${id}.crease`, bone: `${id}.t2`, z: (S.thumbZ ?? z + 0.1) + 0.005, fill: line, skin: { chain: [`${id}.t0`, `${id}.t1`], zone: 0.5 },
                                geom: taper(truncPoly(cpts, cL, 6), [S.rim * 0.8, S.rim, S.rim, S.rim, S.rim, S.rim], 'round'), clip: [`${id}.palm`, `${id}.thenar`, `${id}.thumb`] });
      const sprD = Math.max(...[1, 2, 3].map((j) => Math.abs((ctx.pose?.bones?.[`${id}.f${j + 1}s`] ?? 0) - (ctx.pose?.bones?.[`${id}.f${j}s`] ?? 0))));
      const mcpAvg = [0, 1, 2, 3].reduce((acc, j) => acc + ang(j, 'a'), 0) / 4, keepB = clamp01(1 - (mcpAvg - 15) / 15) * clamp01(1 - (sprD - 3) / 5);   // spread: the comb's teeth fade, so does its spine
      // spans exactly from the first to the last separation line (their round starts ARE its ends: T/L joins, as in the
      // reference's comb — never a "+" with a line poking through it)
      const rs = order.map((j) => rimStart[j]).filter(Boolean);
      const ok = rs.length >= 2, b0 = rs[rs.length - 1], b2 = rs[0], bm = !ok ? null : rs.length > 2 ? rs[1] : lerp(b0, b2, 0.5), half = (pt) => lerp(bm, pt, keepB);
      if (ok && Math.hypot(b0[0] - b2[0], b0[1] - b2[1]) * keepB >= 0.04)
        out.push({ id: `${id}.digital`, bone: S.parentBone, z: z + 0.09, fill: line, geom: taper([half(b0), bm, half(b2)], [S.rim, S.rim, S.rim], 'round'),
                   clip: [`${id}.palm`, ...[1, 2, 3, 4].map((j) => `${id}.f${j}`)] });
    }
    // thumb: one tube MCP → IP → tip over t1/t2 (in front of the fingers unless thumbBehind); its rim also shows over
    // the palm, so a thumb laid across the palm keeps its outline
    const tFold = ['t0', 't1', 't2'].reduce((acc, b) => acc + (ctx.pose?.bones?.[`${id}.${b}`] ?? 0), 0);
    const zt = S.thumbZ ?? (S.thumbBehind ? z + 0.03 : S.thumbTuck && tFold > S.thumbTuck ? z - 0.01 : z + 0.1), tskin = { chain: [`${id}.t1`, `${id}.t2`], zone: 0.5 };
    const tb0 = add(mcp, mulS(sub(cmc, mcp), 0.15));
    out.push({ id: `${id}.thumb`, bone: `${id}.t2`, z: zt, fill, geom: tubeOf([tb0, ip, tt], tr), skin: tskin });
    out.push({ id: `${id}.thumb.j`, bone: `${id}.t2`, z: zt - 0.0005, fill, rigid: true, geom: ellipse(ip, tr[1] * 0.98, tr[1] * 0.98) });
    if (!S.thumbBehind && S.thumbLine !== false) {
      // ONE straight line along the inner side of the free thumb tip (rigid on t2: it can never S-bend or hook
      // round the tip). It fades out as the thumb folds across the palm (grip/fist/point), where the thumb's own outline
      // against the fingers reads without it.
      const d = norm(sub(tt, ip)), hc = P(palmL * 0.9, 0), pl = perpL(d), side = Math.sign((hc[0] - ip[0]) * pl[0] + (hc[1] - ip[1]) * pl[1]) || 1, nn = mulS(pl, side);
      // fades by LENGTH (never by opacity — partial opacity renders off-palette tints): the line shortens toward its
      // base as the thumb folds, and is dropped below 0.03 H
      const flex = (ctx.pose?.bones?.[`${id}.t1`] ?? 0) + (ctx.pose?.bones?.[`${id}.t2`] ?? 0) + (ctx.pose?.bones?.[`${id}.t0`] ?? 0);
      const keep = Math.max(0, Math.min(1, 1 - (flex - 35) / 30)), t0 = S.view === 'palm' ? -0.7 : -0.25, t1 = t0 + (0.78 - t0) * keep;   // ends short of the notch: never shares an endpoint with a finger line (no λ fork)
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
