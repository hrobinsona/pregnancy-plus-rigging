// body.js — mum3's neck, chest skin and dress (side view).
//  · neck: a column skinned chest → neck (throat straight under the jaw, nape curved), its top hidden under the face/hair
//  · chest skin: the décolletage and shoulder top above the dress, on the chest
//  · dress: ONE outline — strap → neckline → bust → under-bust notch → bump → skirt → hem → back — chain-skinned up the
//    spine, its bump region carried by the belly bone (breath, bump nudges), so the silhouette never seams
//  · strap: the band over the shoulder, drawn OVER the near arm's top (the arm comes out from under it, as in the master)
import { loop } from '../../../engine/shapes.js';
import { ensureCW } from '../../../engine/hand.js';
import { lerp } from '../../../engine/geom.js';

const part = (id, bone, z, fill, geom, extra = {}) => ({ id, bone, z, fill, geom, ...extra });
export const ANCHORS = { 'neck': 8, 'chest.skin': 7, 'dress': 24, 'dress.strap': 7 };

export function build({ P: C, C: char }) {
  const X = char.params.P, J = char.joints, out = [];
  const N = X.neck, b = X.bump, bk = X.back, hm = X.hem, st = X.strap, nl = X.neckline;
  // ---- neck: nape top (under the hair) → throat top (under the jaw) → throat → base (inside the chest skin) → nape
  out.push(part('neck', 'neck', 26, C.skin, ensureCW(loop([
    [N.napeTop[0], N.napeTop[1], { c: true, t: 0.5 }], [N.throatTop[0] - 0.12, N.napeTop[1] + 0.05], [N.throatTop[0], N.throatTop[1], { a: 95 }],
    [N.front[0] + 0.005, N.front[1], { a: 80 }], [N.front[0] + 0.08, N.front[1] + 0.12], [N.back[0] + 0.02, N.back[1] + 0.14],
    [N.back[0], N.back[1], { a: -80 }], [N.back[0] + 0.03, (N.back[1] + N.napeTop[1]) / 2, { a: -95 }]])),
    { skin: { parent: 'chest', child: 'neck', zone: 0.35 } }));
  // ---- chest skin: from the neck base forward and down to the neckline, back over the shoulder top behind the strap
  out.push(part('chest.skin', 'chest', 24, C.skin, ensureCW(loop([
    [N.front[0], N.front[1] - 0.02, { a: 85 }], [X.chestFront[0], X.chestFront[1], { a: 35 }], [nl.front[0] + 0.01, nl.front[1] + 0.02, { a: 60 }],
    [nl.front[0] - 0.05, nl.front[1] + 0.2], [bk.shoulder[0] + 0.05, nl.front[1] + 0.2], [st.back[0], st.back[1] + 0.02, { a: -60 }], [N.back[0], N.back[1] - 0.02, { a: -20 }]]))));   // the trapezius slopes from the nape to the strap's back end
  // ---- dress
  const under = b.under, apex = b.apex, bot = b.bottom;
  const dressG = ensureCW(loop([
    [st.front[0], st.front[1], { a: 30 }],                                              // strap runs on into the neckline
    [nl.low[0], nl.low[1], { a: 20 }],                                                  // neckline: a shallow curve down to the chest front
    [nl.front[0], nl.front[1], { c: true, ai: 160, ao: 70, ti: 0.7, to: 0.8 }],        // neckline meets the chest front
    [X.bust[0], X.bust[1], { a: 95 }],
    [under[0], under[1], { c: true, ai: -120, ao: 30, ti: 0.7, to: 0.9 }],             // under-bust notch: the bump starts here
    [b.upper[0], b.upper[1], { a: 55 }],
    [apex[0], apex[1], { a: 90 }],
    [b.lower[0], b.lower[1], { a: 125 }],
    [bot[0], bot[1], { c: true, ai: -60, ao: 95, ti: 0.8, to: 0.6 }],                  // the bump meets the skirt: a soft inner corner
    [bot[0] - 0.02, (bot[1] + hm.front[1]) / 2, { a: 93 }],
    [hm.front[0], hm.front[1], { a: 100 }], [hm.front[0] - 0.04, hm.y - 0.01, { a: 160, t: 0.7 }],
    [(hm.front[0] + hm.back[0]) / 2, hm.y + 0.005, { a: 180 }],                        // hem: a gentle smile under the skirt
    [hm.back[0] + 0.04, hm.y - 0.03, { a: 200, t: 0.7 }], [hm.back[0], hm.back[1], { a: -95 }],
    [hm.back[0] - 0.01, (hm.back[1] + bk.seat[1]) / 2, { a: -95 }],
    [bk.seat[0], bk.seat[1], { a: -90 }], [bk.seat[0] + 0.05, bk.seat[1] - 0.4],
    [bk.waist[0], bk.waist[1], { a: -90 }],
    [bk.blade[0], bk.blade[1], { a: -90 }], [bk.shoulder[0], bk.shoulder[1], { a: -80 }],
    [st.back[0], st.back[1], { c: true, ai: -100, ao: -20, ti: 0.6, to: 0.6 }],
    [st.top[0], st.top[1], { a: 0 }],
    [st.front[0] - 0.08, st.front[1] - 0.04, { a: 18 }],
  ]));
  // the bump's points follow the belly bone (region skin), the rest rides the spine chain
  const bumpC = [apex[0] - 0.25, apex[1]];
  out.push(part('dress', 'chest', 30, C.dress, dressG,
    { skin: { chain: ['pelvis', 'spineLower', 'spineUpper', 'chest'], zone: 0.3, regions: [{ bone: 'belly', c: bumpC, r: [0.35, 0.65] }] } }));
  // ---- strap over the near shoulder, above the arm: from the back edge over the top, its front end sinking into the
  // dress in front of the arm (same colour: no seam)
  // the strap: the same top edge, drawn over the arm, its lower edge the line where the arm comes out from under it;
  // its front end sinks into the dress in front of the arm (same colour, no seam)
  const sw = st.w;
  out.push(part('dress.strap', 'clavicle.near', 62, C.dress, ensureCW(loop([
    [st.back[0] - 0.01, st.back[1] + sw, { c: true, t: 0.5 }], [st.back[0], st.back[1], { c: true, ai: -100, ao: -20, ti: 0.6, to: 0.6 }],
    [st.top[0], st.top[1], { a: 0 }], [st.front[0], st.front[1], { a: 30 }], [nl.low[0] - 0.08, nl.low[1] + 0.02],
    [st.front[0] - 0.02, st.front[1] + sw * 1.4], [st.top[0], st.top[1] + sw, { a: 180 }]]))));
  return out;
}
