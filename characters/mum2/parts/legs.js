// legs.js — joggers (tube hip→knee→ballooned calf→gathered cuff, skinned across the knee), cuff bands, ankle skin,
// socks (skinned foot→toe at the ball) with rib band. Far leg behind the near leg.
import { tube, limb, taper, loop } from '../../../engine/shapes.js';
import { ensureCW } from '../../../engine/hand.js';
import { add, sub, mulS, norm, perpL, lerp } from '../../../engine/geom.js';

export const ANCHORS = { 'leg.near': 12, 'leg.far': 12, 'cuffleg.near': 6, 'cuffleg.far': 6, 'cuffleg.near.line': 4, 'cuffleg.far.line': 4,
  'ankle.near': 6, 'ankle.far': 6, 'sock.near': 10, 'sock.far': 10, 'sock.near.band': 4, 'sock.far.band': 4 };

export function build({ P: C, C: char }) {
  const J = char.joints, X = char.params.P, out = [];
  for (const side of ['far', 'near']) {
    const S = side === 'near' ? 'Near' : 'Far', z = side === 'near' ? 26 : 20, w = X.leg[side];
    const hip = J['hip' + S], knee = J['knee' + S], ank = J['ankle' + S];
    const cuffTop = lerp(knee, ank, 0.84), calf = lerp(knee, ank, 0.62);
    const axis = [add(hip, [0, -0.1]), lerp(hip, knee, 0.5), knee, calf, cuffTop];
    const ws = [w.hip, w.hip * 0.93, w.knee, w.knee * 1.02, w.cuff * 1.12].map((v) => ({ r: v, l: v }));
    out.push({ id: `leg.${side}`, bone: `shin.${side}`, z, fill: C.bottoms, geom: ensureCW(tube(axis, ws, { capK: 0.6 })),
      skin: { parent: `thigh.${side}`, child: `shin.${side}`, zone: 0.25 } });
    // gathered cuff band
    const c0 = lerp(knee, ank, 0.83), c1 = lerp(knee, ank, 0.95);
    out.push({ id: `cuffleg.${side}`, bone: `shin.${side}`, z: z + 1, fill: C.bottoms, geom: ensureCW(limb(c0, c1, [{ t: 0, r: w.cuff, l: w.cuff }, { t: 1, r: w.cuff * 0.97, l: w.cuff * 0.97 }], { capK: 0.4 })) });
    const n = perpL(norm(sub(c1, c0))), m = lerp(c0, c1, 0.15);
    out.push({ id: `cuffleg.${side}.line`, bone: `shin.${side}`, z: z + 1.1, fill: C.bottomsShade, geom: taper([add(m, mulS(n, w.cuff * 0.85)), add(m, [0, 0.012]), add(m, mulS(n, -w.cuff * 0.85))], [0.003, 0.016, 0.003]) });
    // ankle skin
    out.push({ id: `ankle.${side}`, bone: `shin.${side}`, z: z - 0.5, fill: C.skin, geom: ensureCW(limb(lerp(knee, ank, 0.9), add(ank, [0, 0.03]), [{ t: 0, r: 0.13, l: 0.13 }, { t: 1, r: 0.125, l: 0.125 }], { capK: 0.5 })) });
    // sock: ankle top → heel → sole → toe (built from heel/toe landmarks and the ankle joint), skinned at the ball
    const heel = X.foot[side].heel, toe = X.foot[side].toe, top = add(ank, [0, 0.0]);
    // ankle-top rib band is a bit wider than the ankle; heel bulges back; instep slopes to a rounded toe
    const fw = (toe[0] - heel[0]);
    const sock = [
      [top[0] - 0.15, top[1] - 0.015], [top[0] + 0.15, top[1] - 0.015], [top[0] + 0.15, top[1] + 0.2], [heel[0] + fw * 0.7, toe[1] - 0.16],
      [toe[0] + 0.005, toe[1] - 0.04], [toe[0] - 0.03, toe[1] + 0.03], [heel[0] + fw * 0.45, heel[1] + 0.135], [heel[0] + 0.04, heel[1] + 0.1],
      [heel[0] - 0.02, heel[1] + 0.0], [top[0] - 0.13, top[1] + 0.24]];
    out.push({ id: `sock.${side}`, bone: `toe.${side}`, z: z + 0.5, fill: C.sock, geom: ensureCW(loop(sock)),
      skin: { parent: `foot.${side}`, child: `toe.${side}`, zone: 0.35 } });
    out.push({ id: `sock.${side}.band`, bone: `foot.${side}`, z: z + 0.6, fill: C.sockShade, geom: taper([[top[0] - 0.14, top[1] + 0.12], [top[0], top[1] + 0.135], [top[0] + 0.15, top[1] + 0.115]], [0.003, 0.018, 0.003]) });
  }
  return out;
}
