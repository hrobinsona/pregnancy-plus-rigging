// body.js — mum3's neck, chest skin and dress in ¾ VIEW. Every edge below is a measured named point of the ¾ still
// (rows across the shoulders and the torso stations), joined by designed curves:
//  · neck: a column skinned chest → neck, its top under the jaw and hair
//  · chest skin: the décolletage we see INTO the neckline's U, and the shoulder tops either side of the straps
//  · dress: ONE outline — the near strap's top → the neckline's U → the far strap → the bust → under-bust notch → bump →
//    skirt → hem → the back (behind the near arm) → the near armhole — chain-skinned up the spine, the bump on the belly bone
//  · the near strap again OVER the near arm's cap (same colour, no seam), so the arm never covers it
import { loop } from '../../../engine/shapes.js';
import { ensureCW } from '../../../engine/hand.js';

const part = (id, bone, z, fill, geom, extra = {}) => ({ id, bone, z, fill, geom, ...extra });
export const ANCHORS = { 'neck': 8, 'chest.skin': 11, 'dress': 36, 'dress.strap': 7 };

export function build({ P: C, C: char }) {
  const X = char.params.P, out = [];
  const N = X.neck, b = X.bump, hm = X.hem, sn = X.strapNear, sf = X.strapFar, nl = X.neckline;
  out.push(part('neck', 'neck', 26, C.skin, ensureCW(loop([
    [N.napeTop[0], N.napeTop[1], { c: true, t: 0.5 }], [N.throatTop[0] - 0.1, N.napeTop[1] + 0.03], [N.throatTop[0], N.throatTop[1], { a: 75 }],
    [N.front[0], N.front[1], { a: 70 }], [N.baseFront[0], N.baseFront[1], { a: 30 }], [N.baseFront[0] - 0.15, N.baseFront[1] + 0.12],
    [N.baseBack[0], N.baseBack[1], { a: -70 }], [N.back[0], N.back[1], { a: -95 }]])),
    { skin: { parent: 'chest', child: 'neck', zone: 0.35 } }));
  // chest skin: from the near shoulder's top over the neck's base to the far strap, down inside the neckline's U
  // (it also fills the armpit: her side between the arm's crease and the armhole, down to y −5.25 where the crease ends;
  // below that the arm's front meets the dress. With the arm raised it is the side of her chest above the armhole)
  out.push(part('chest.skin', 'chest', 24, C.skin, ensureCW(loop([
    [sn.top[0] + 0.005, sn.top[1] - 0.005, { a: -28 }], [N.baseBack[0] + 0.02, N.baseBack[1] - 0.015, { a: -10 }], [N.baseFront[0], N.baseFront[1] - 0.01, { a: 15 }],
    [sf.top[0], sf.top[1] - 0.01, { a: 40 }], [sf.outer[0], sf.outer[1], { a: 70 }], [nl.up[0] + 0.03, nl.bottom[1] + 0.06],
    [nl.bottom[0], nl.bottom[1] + 0.08], [nl.low[0], nl.low[1] + 0.1], [-0.08, -5.25], [-0.17, -5.22], [-0.25, -5.6, { a: -80 }]]))));
  // ---- dress
  const st = X.front, sb = X.back, near = (arr, y) => arr.reduce((a, q) => (Math.abs(q[1] - y) < Math.abs(a[1] - y) ? q : a));
  const E = sn.edge;
  const dressG = ensureCW(loop([
    [sn.top[0], sn.top[1], { a: -22 }],                                                        // the near strap's top: its outer corner on the shoulder, the edge rising along the slope
    [sn.front[0], sn.front[1], { c: true, ai: 0, ao: 40, ti: 0.5, to: 0.8 }],                  // its inner corner turns into the neckline
    [nl.near[0], nl.near[1], { a: 38 }],                                                       // the neckline's U, measured row by row
    [nl.low[0], nl.low[1], { a: 28 }],
    [nl.bottom[0], nl.bottom[1], { a: 0 }],
    [nl.up[0], nl.up[1], { a: -80 }],
    [nl.far[0], nl.far[1], { a: -122 }],
    [sf.inner[0], sf.inner[1], { c: true, ai: -125, ao: 0, ti: 0.6, to: 0.4 }],                // the far strap's top
    [sf.top[0], sf.top[1], { c: true, ai: 0, ao: 52, ti: 0.4, to: 0.6 }],
    [sf.outer[0], sf.outer[1], { a: 50 }],                                                     // its outer edge, down to the far armhole
    [sf.arm[0], sf.arm[1], { a: 45 }],
    [X.bust[0] - 0.03, X.bust[1] - 0.11, { a: 62 }], [X.bust[0], X.bust[1], { a: 97 }],
    [b.under[0] + 0.018, b.under[1] + 0.04, { c: true, ai: -120, ao: 40, ti: 0.7, to: 0.8 }], // under-bust notch: the bump starts here (rows: deepest 0.662 at y −5.05)
    [b.upper[0], b.upper[1], { a: 55 }],
    [b.apex[0], b.apex[1], { a: 90 }],
    [b.lower[0], b.lower[1], { a: 125 }],
    [b.bottom[0], b.bottom[1], { c: true, ai: -55, ao: 95, ti: 0.8, to: 0.6 }],               // the bump meets the skirt
    [near(st, -3.2)[0], -3.2, { a: 95 }],
    [hm.front[0], hm.front[1], { a: 100 }], [hm.front[0] - 0.04, hm.y - 0.01, { a: 160, t: 0.7 }],
    [(hm.front[0] + hm.back[0]) / 2, hm.y + 0.01, { a: 180 }],                                // hem: a gentle smile under the skirt
    [hm.back[0] + 0.04, hm.y - 0.025, { a: 200, t: 0.7 }], [hm.back[0], hm.back[1], { a: -90 }],
    [near(sb, -3.04)[0], -3.04, { a: -88 }],
    [-0.44, -3.68, { a: -80 }],                                                                // the seat, behind the near hand (it shows either side)
    [-0.235, -4.32, { a: -95 }],
    [near(sb, -4.71)[0], -4.71, { a: -100 }],                                                  // the back, seen in the gap under the near arm
    [-0.19, -4.97, { a: -95 }],
    [-0.155, -5.25, { a: -60 }], [-0.07, -5.38, { a: -55 }], [-0.05, -5.47, { a: -88 }],      // up into the near armhole (measured rows)
    [E[3][0], E[3][1], { a: -100 }], [E[2][0], E[2][1], { a: -125 }], [E[1][0], E[1][1], { a: -138 }], [E[0][0], E[0][1], { a: -145 }],
  ]));
  const bumpC = [b.apex[0] - 0.3, b.apex[1]];
  out.push(part('dress', 'chest', 30, C.dress, dressG,
    { skin: { chain: ['pelvis', 'spineLower', 'spineUpper', 'chest'], zone: 0.3, regions: [{ bone: 'belly', c: bumpC, r: [0.4, 0.65] },
      { bone: 'clavicle.near', c: sn.top, r: [0.16, 0.3] }, { bone: 'clavicle.far', c: sf.top, r: [0.1, 0.25] }] } }));
  // the near strap again, over the near arm's cap: its top on the shoulder, the neckline, back up the armhole edge
  out.push(part('dress.strap', 'clavicle.near', 62, C.dress, ensureCW(loop([
    [sn.top[0], sn.top[1], { a: -22 }],
    [sn.front[0], sn.front[1], { c: true, ai: 0, ao: 40, ti: 0.5, to: 0.8 }],
    [nl.near[0], nl.near[1], { a: 38 }],
    [nl.near[0] + 0.06, nl.near[1] + 0.07, { c: true, ai: 38, ao: 200, ti: 0.5, to: 0.5 }],
    [E[2][0], E[2][1], { a: -125 }], [E[1][0], E[1][1], { a: -138 }], [E[0][0], E[0][1], { a: -145 }]]))));
  return out;
}
