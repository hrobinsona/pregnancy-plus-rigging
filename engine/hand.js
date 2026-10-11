// hand.js — parametric hand generator (four fingers + thumb, two segments each), research-backed:
//  · fingers are cut-out capsules whose round caps are circles centred on the pivots (joints never break) [Toon Boom]
//  · finger flexion is mostly OUT of the picture plane for a back/palm view, so each finger chain rotates in a plane
//    with a small x-factor (projected: shortens as it curls) — same projection as the 3/4 limbs
//  · hands are animated through a pose LIBRARY (relaxed, cup, flat, fist, …) blended in finger-angle space, with
//    per-finger lags so fingers settle at different times [Toon Boom swaps; Animation Mentor hands]
//  · four fingers, back-of-hand side straighter / palm side curved; creases between overlapping fingers [design refs]
// Everything is computed from the spec below; nothing is sampled from an image.
import { add, sub, mulS, norm, perpL, len } from './geom.js';
import { limb, taper, loop } from './shapes.js';

const DEG = Math.PI / 180;
const dirv = (deg) => [Math.cos(deg * DEG), Math.sin(deg * DEG)];
const rot = (v, deg) => { const c = Math.cos(deg * DEG), s = Math.sin(deg * DEG); return [c * v[0] - s * v[1], s * v[0] + c * v[1]]; };

/** spec: { id:'hand.near', parentBone:'hand.near', wrist:[x,y], dir:deg, length, palmFrac, wristW, palmW,
 *          thumbSide:+1|-1, fingers:[{len, w, spread, at, curl:[a,b]}]x4 (index→pinky), thumb:{at:[along,across], dir, len, w, curl:[a,b]},
 *          flexFx, order:[finger indices back→front], z, thumbZ, crease:true } */
export function makeHand(spec) {
  const id = spec.id, W = spec.wrist, u = dirv(spec.dir), n = mulS(perpL(u), spec.thumbSide);
  const P = (along, across) => add(add(W, mulS(u, along)), mulS(n, across));   // hand frame → world
  const palmL = spec.length * spec.palmFrac, fingL = spec.length - palmL;
  const joints = {}, bones = [];
  const plane = `${id}.flex`;
  // knuckles spread across the palm's end (index on the thumb side)
  spec.fingers.forEach((f, i) => {
    const across = spec.palmW * (0.5 - f.at) * 0.92, k = P(palmL * (1 - 0.06 * Math.abs(f.at - 0.35)), across);
    const d = rot(u, f.spread * spec.thumbSide * -1);
    const L = fingL * f.len, m = add(k, mulS(d, L * 0.52)), t = add(k, mulS(d, L));
    Object.assign(joints, { [`${id}.f${i + 1}k`]: k, [`${id}.f${i + 1}m`]: m, [`${id}.f${i + 1}t`]: t });
    bones.push({ id: `${id}.f${i + 1}a`, parent: spec.parentBone, joint: `${id}.f${i + 1}k`, aim: `${id}.f${i + 1}m`, plane, restAnat: 0, min: -20, max: 100 });
    bones.push({ id: `${id}.f${i + 1}b`, parent: `${id}.f${i + 1}a`, joint: `${id}.f${i + 1}m`, aim: `${id}.f${i + 1}t`, plane, restAnat: 0, min: -10, max: 110 });
  });
  const th = spec.thumb;
  if (th) {
    const b = P(palmL * th.at[0], spec.palmW * th.at[1]), d = rot(u, -th.dir * spec.thumbSide);
    const L = spec.length * th.len, m = add(b, mulS(d, L * 0.5)), t = add(b, mulS(d, L));
    Object.assign(joints, { [`${id}.tb`]: b, [`${id}.tm`]: m, [`${id}.tt`]: t });
    bones.push({ id: `${id}.t1`, parent: spec.parentBone, joint: `${id}.tb`, aim: `${id}.tm`, plane: `${id}.thumb`, restAnat: 0, min: -30, max: 70 });
    bones.push({ id: `${id}.t2`, parent: `${id}.t1`, joint: `${id}.tm`, aim: `${id}.tt`, plane: `${id}.thumb`, restAnat: 0, min: -20, max: 90 });
  }
  const planes = { [plane]: spec.flexFx, [`${id}.thumb`]: spec.thumbFx ?? spec.flexFx };

  const ANCHORS = { [`${id}.palm`]: 10 };
  spec.fingers.forEach((_, i) => { ANCHORS[`${id}.f${i + 1}a`] = 6; ANCHORS[`${id}.f${i + 1}b`] = 6; });
  if (th) { ANCHORS[`${id}.t1`] = 6; ANCHORS[`${id}.t2`] = 6; }

  /** parts in rest world space. ctx: {P (palette)} */
  function parts(ctx, { fill, line, zBase }) {
    const out = [];
    const z = zBase ?? spec.z;
    // palm: wrist (narrow) → knuckles (wide); back of hand straighter on the pinky side, fuller on the thumb side
    const wW = spec.wristW / 2, pW = spec.palmW / 2;
    // back of the hand straighter (pinky side), thumb side fuller (straights against curves)
    const palm = [
      P(-0.02, -wW), P(palmL * 0.45, -pW * 0.9), P(palmL * 0.92, -pW * 0.88),
      P(palmL * 1.02, -pW * 0.35), P(palmL * 1.04, pW * 0.15), P(palmL * 0.98, pW * 0.72),
      P(palmL * 0.62, pW * 0.92), P(palmL * 0.25, pW * 0.86), P(0.02, wW * 1.05), P(-0.03, 0),
    ];
    out.push({ id: `${id}.palm`, bone: spec.parentBone, z, fill, geom: ensureCW(loop(palm)) });
    const order = spec.order || [3, 2, 1, 0];
    order.forEach((i, rank) => {
      const f = spec.fingers[i], k = joints[`${id}.f${i + 1}k`], m = joints[`${id}.f${i + 1}m`], t = joints[`${id}.f${i + 1}t`];
      const w0 = f.w / 2, w1 = f.w * 0.46, w2 = f.w * 0.42;
      const zf = z + 0.05 + rank * 0.01;
      out.push({ id: `${id}.f${i + 1}a`, bone: `${id}.f${i + 1}a`, z: zf, fill, geom: ensureCW(limb(k, m, [{ t: 0, r: w0, l: w0 }, { t: 1, r: w1, l: w1 }], { capK: 1.0 })) });
      out.push({ id: `${id}.f${i + 1}b`, bone: `${id}.f${i + 1}b`, z: zf + 0.001, fill, geom: ensureCW(limb(m, t, [{ t: 0, r: w1, l: w1 }, { t: 1, r: w2, l: w2 }], { capK: 1.0 })) });
      // crease on the side facing the finger behind it (skinned across the middle joint so it bends with the finger)
      if (spec.crease !== false && rank > 0) {
        const side = mulS(norm(perpL(sub(t, k))), spec.creaseSide ?? -spec.thumbSide);
        const c0 = add(add(k, mulS(sub(m, k), 0.12)), mulS(side, w0 * 0.72)), c1 = add(m, mulS(side, w1 * 0.8)), c2 = add(add(m, mulS(sub(t, m), 0.8)), mulS(side, w2 * 0.72));
        out.push({ id: `${id}.f${i + 1}.crease`, bone: `${id}.f${i + 1}b`, z: zf + 0.002, fill: line,
                   geom: taper([c0, c1, c2], [0.003, f.w * 0.26, 0.004]),
                   skin: { parent: `${id}.f${i + 1}a`, child: `${id}.f${i + 1}b`, zone: 0.3 } });
      }
    });
    if (th) {
      const b = joints[`${id}.tb`], m = joints[`${id}.tm`], t = joints[`${id}.tt`], w = th.w / 2;
      const zt = spec.thumbZ ?? z + 0.1;
      out.push({ id: `${id}.t1`, bone: `${id}.t1`, z: zt, fill, geom: ensureCW(limb(b, m, [{ t: 0, r: w * 1.15, l: w * 1.15 }, { t: 1, r: w * 0.95, l: w * 0.95 }], { capK: 1.0 })) });
      out.push({ id: `${id}.t2`, bone: `${id}.t2`, z: zt + 0.001, fill, geom: ensureCW(limb(m, t, [{ t: 0, r: w * 0.95, l: w * 0.95 }, { t: 1, r: w * 0.8, l: w * 0.8 }], { capK: 1.0 })) });
    }
    return out;
  }
  return { joints, bones, planes, ANCHORS, parts };
}

/** keep every loop clockwise on screen (y down) so offsets/outsets behave; deterministic for a given construction */
export function ensureCW(g) {
  let a = 0;
  for (let i = 0; i < g.P.length; i++) { const p = g.P[i], q = g.P[(i + 1) % g.P.length]; a += p[0] * q[1] - q[0] * p[1]; }
  if (a > 0) return g;                                   // y-down: positive shoelace = clockwise on screen
  const n = g.P.length, idx = [0, ...Array.from({ length: n - 1 }, (_, i) => n - 1 - i)];
  return { P: idx.map((i) => g.P[i]), hin: idx.map((i) => g.hout[i]), hout: idx.map((i) => g.hin[i]) };
}
