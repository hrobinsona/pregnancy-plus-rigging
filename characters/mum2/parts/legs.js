// legs.js — joggers (tube hip→knee→ballooned calf→gathered cuff, skinned across the knee), cuff bands, ankle skin,
// socks (skinned foot→toe at the ball) with rib band. Far leg behind the near leg.
import { tube, limb, taper, loop } from '../../../engine/shapes.js';
import { ensureCW } from '../../../engine/hand.js';
import { add, sub, mulS, norm, perpL, lerp } from '../../../engine/geom.js';

export const ANCHORS = { 'sock.near.heel': 4, 'sock.far.heel': 4, 'sock.near.toe': 4, 'sock.far.toe': 4, 'leg.near': 12, 'leg.far': 12, 'cuffleg.near': 6, 'cuffleg.far': 6, 'cuffleg.near.line': 4, 'cuffleg.far.line': 4,
  'ankle.near': 6, 'ankle.far': 6, 'sock.near': 10, 'sock.far': 10, 'sock.near.band': 4, 'sock.far.band': 4 };

export function build({ P: C, C: char }) {
  const J = char.joints, X = char.params.P, out = [];
  for (const side of ['far', 'near']) {
    const S = side === 'near' ? 'Near' : 'Far', z = side === 'near' ? 26 : 20, w = X.leg[side];
    const hip = J['hip' + S], knee = J['knee' + S], ank = J['ankle' + S];
    const cuffTop = lerp(knee, ank, 0.84), calf = lerp(knee, ank, 0.62);
    const axis = [add(hip, [0, -0.1]), lerp(hip, knee, 0.5), knee, calf, cuffTop];
    // straights against curves: the inner side tapers straight, the outer side carries the thigh/calf curve
    const inR = side === 'near';   // axis points down: r = screen right = inner for the near leg, outer for the far leg
    const ws = [w.hip, w.hip * 0.93, w.knee, w.knee * (w.calfK ?? 1.02), w.cuff * 1.12].map((v, i) => {
      const pick = (f) => (Array.isArray(f) ? f[i] : i < 4 ? f : 1);   // per-station factor, or one factor for the top 4
      const o = pick(w.outer), n = pick(w.inner);
      return inR ? { r: v * n, l: v * o } : { r: v * o, l: v * n };
    });
    out.push({ id: `leg.${side}`, bone: `shin.${side}`, z, fill: C.bottoms, geom: ensureCW(tube(axis, ws, { capK: 0.6 })),
      skin: { parent: `thigh.${side}`, child: `shin.${side}`, zone: 0.25 } });
    // gathered cuff band
    const c0 = lerp(knee, ank, 0.83), c1 = lerp(knee, ank, 0.95);
    out.push({ id: `cuffleg.${side}`, bone: `shin.${side}`, z: z + 1, fill: C.bottoms, geom: ensureCW(limb(c0, c1, [{ t: 0, r: w.cuff, l: w.cuff }, { t: 1, r: w.cuff * 0.97, l: w.cuff * 0.97 }], { capK: 0.4, capB: 'round' })) });
    const n = perpL(norm(sub(c1, c0))), m = lerp(c0, c1, 0.15);
    if (X.detail.legCuffLine) out.push({ id: `cuffleg.${side}.line`, bone: `shin.${side}`, z: z + 1.1, fill: C.bottomsShade, geom: taper([add(m, mulS(n, w.cuff * 0.85)), add(m, [0, 0.012]), add(m, mulS(n, -w.cuff * 0.85))], [0.003, 0.016, 0.003]) });
    // ankle skin
    out.push({ id: `ankle.${side}`, bone: `shin.${side}`, z: z - 0.5, fill: C.skin, geom: ensureCW(limb(lerp(knee, ank, 0.9), add(ank, [0, 0.03]), [{ t: 0, r: 0.13, l: 0.13 }, { t: 1, r: 0.125, l: 0.125 }], { capK: 0.5 })) });
    // sock: ankle top → heel → sole → toe (built from heel/toe landmarks and the ankle joint), skinned at the ball
    const heel = X.foot[side].heel, toe = X.foot[side].toe, top = add(ank, [0, 0.0]);
    // ankle-top rib band is a bit wider than the ankle; heel bulges back; instep slopes to a rounded toe
    // rib cuff a little narrower than the foot; waist at the ankle; heel bulges back; instep slopes to a rounded toe
    const fw = (toe[0] - heel[0]), cw = 0.13;
    const sock = [
      [top[0] - cw, top[1] - 0.055], [top[0] + cw, top[1] - 0.055], [top[0] + cw * 0.95, top[1] + 0.2], [heel[0] + fw * 0.7, toe[1] - 0.15],
      [toe[0] + 0.005, toe[1] - 0.045 * (X.foot[side].round || 1)], [toe[0] - 0.03 * (X.foot[side].round || 1), toe[1] + 0.03], [heel[0] + fw * 0.45, heel[1] + 0.135], [heel[0] + 0.05, heel[1] + 0.105],
      [heel[0] - 0.015, heel[1] + 0.01], [top[0] - cw * 0.92, top[1] + 0.22]];
    out.push({ id: `sock.${side}`, bone: `toe.${side}`, z: z + 0.5, fill: C.sock, geom: ensureCW(loop(sock)),
      skin: { parent: `foot.${side}`, child: `toe.${side}`, zone: 0.35 } });
    out.push({ id: `sock.${side}.band`, bone: `foot.${side}`, z: z + 0.6, fill: C.sockShade, geom: taper([[top[0] - cw * 0.92, top[1] + 0.13], [top[0], top[1] + 0.145], [top[0] + cw * 0.92, top[1] + 0.125]], [0.003, 0.018, 0.003]) });
    // heel and toe seams (short arcs), as in the reference's sock construction
    if (X.detail.sockSeams) out.push({ id: `sock.${side}.heel`, bone: `foot.${side}`, z: z + 0.6, fill: C.sockShade, geom: taper([[heel[0] + 0.0, heel[1] - 0.06], [heel[0] + 0.1, heel[1] + 0.0], [heel[0] + 0.14, heel[1] + 0.11]], [0.003, 0.02, 0.003]) });
    if (X.detail.sockSeams) out.push({ id: `sock.${side}.toe`, bone: `toe.${side}`, z: z + 0.6, fill: C.sockShade, geom: taper([[toe[0] - 0.13, toe[1] + 0.03], [toe[0] - 0.12, toe[1] - 0.05], [toe[0] - 0.05, toe[1] - 0.12]], [0.003, 0.02, 0.003]) });
  }
  return out;
}
