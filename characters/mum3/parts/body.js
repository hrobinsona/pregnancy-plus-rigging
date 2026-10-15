// body.js — mum3's neck, chest skin and dress (side view).
//  · neck: a column skinned chest → neck (throat straight under the jaw, nape curved), its top hidden under the face/hair
//  · chest skin: the décolletage and shoulder top above the dress, on the chest
//  · dress: the BODICE — strap → neckline → bust → under-bust notch → bump → (inside her) → back — chain-skinned up the
//    spine, its bump region carried by the belly bone (breath, bump nudges); the skirt hangs from it in posed space
//    (character.js postBuild, engine/drape.js): same colour, overlapping inside her, so the silhouette never seams
//  · the strap over the near shoulder is drawn in arms.js, on the arm's own contour
//  · the bump and the bust have WEIGHT (sag(), from postBuild): as she leans forward they hang toward the floor
import { loop } from '../../../engine/shapes.js';
import { ensureCW } from '../../../engine/hand.js';
import { lerp, add, sub, mulS, norm } from '../../../engine/geom.js';

const part = (id, bone, z, fill, geom, extra = {}) => ({ id, bone, z, fill, geom, ...extra });
export const ANCHORS = { 'neck': 8, 'chest.skin': 7, 'dress': 24 };
// the bodice's path inside her below the bump (rest H): within ≈ 0.3 H of the hip joint, so the skirt covers it in any pose
// (its way up to the back waist 0.1 H inside the back line: the skirt's back now curves IN at the small of the back
// (parts/skirt.js hug), and run up just inside the old straight back, the bodice stood out past it as two bumps on her
// back, leaning and on all fours, round 6)
export const SKIRT_IN = [[0.5, -3.55], [0.3, -3.47], [0.1, -3.44], [-0.08, -3.47], [-0.17, -3.56], [-0.17, -3.75], [-0.13, -4.0], [-0.1, -4.25], [-0.13, -4.44]];
export const DRESS_AT = { bot: 8, waist: 18 };
// the bodice's anchors that carry weight: the bump (under-bust notch → bottom) and the bust, with how much each moves
const SAG_W = { 2: ['bust', 0.4], 3: ['bust', 1], 4: ['bump', 0], 5: ['bump', 0.75], 6: ['bump', 1], 7: ['bump', 0.75], 8: ['bump', 0.25] };
const rest0 = new WeakMap();
/** The bump and the bust HANG (Harry 2026-10-14: the bump must look like a real woman's): the master draws them standing,
 *  their weight pulling down along her body. Pitched forward (all fours, leaning on a counter, bending over), the weight
 *  pulls toward the floor instead: relative to the trunk the mass moves floorward (the bump hangs deep under her, as every
 *  all-fours still draws it) and a little toward her chest (it no longer sags toward her hips). In posed space, by the
 *  trunk's pitch θ from standing: d = [toward the head · sin θ, toward the floor · (1 − cos θ)], weighted per anchor (the
 *  apex most, the notch and the bottom where it meets her body least); nothing below ~5° (standing poses are untouched).
 *  (θ signed: leaning back, sin θ < 0, it settles back toward her.) */
export function sag(parts, ctx) {
  const { C: char, st, rig } = ctx, S = char.params.P.bump.sag, dress = parts.find((p) => p.id === 'dress');
  if (!rest0.has(char)) rest0.set(char, rig.solve({}).spineLower.rot);
  const th = (st.spineLower.rot - rest0.get(char)) * Math.PI / 180, k = Math.abs(th) < 0.08 ? 0 : Math.min(1, (Math.abs(th) - 0.08) / 0.3);
  if (!k || !dress) return;
  const g = dress.geom;
  for (const [i, [what, w]] of Object.entries(SAG_W)) {
    // gravity in the trunk's frame, relative to standing: belly-ward (the trunk's forward normal, (cos θ, sin θ)) by
    // sin θ, and toward the head (along the trunk, (sin θ, −cos θ)) by 1 − cos θ. On all fours (θ = 90°) that is fy down
    // and hx forward; leaning 30° (a bend, a squat) the bump swings out in front of her (fy · 0.43 forward), where the
    // bend still draws it past her arm. (v1 moved it [hx sin θ, fy (1 − cos θ)]: at 30° a third of that, hidden behind the arm)
    const [hx, fy] = S[what], sn = Math.sin(th), cs = Math.cos(th), a = k * w * fy * sn, b = k * w * hx * (1 - cs);
    const d = [a * cs + b * sn, a * sn - b * cs];
    for (const A of [g.P, g.hin, g.hout]) A[i] = [A[i][0] + d[0], A[i][1] + d[1]];
  }
}   // the bodice's anchors the skirt hangs from   // the strap is in arms.js: it is built on the arm's contour

/** The bump RESTS ON HER THIGHS. Squatting or bending to the floor, her thighs come up toward her trunk; the bump, swung
 *  out and down by its weight (sag, above), would hang below them in front of her shins (round 4: the dress a blob where
 *  her knees should be). It can't: it sits between her spread thighs, on them, its lower half lifted and squashed against
 *  them. So no bump anchor of the bodice lies more than REST.sink below the near thigh's axis (hip → knee) where the
 *  thigh points forward; seated (the bump above the lap) and standing (the thighs down) nothing moves. */
export const REST = { sink: 0.22, idx: [5, 6, 7, 8] };
export function rest(parts, ctx) {
  const dress = parts.find((p) => p.id === 'dress'), st = ctx.st;
  if (!dress || !st['shin.near']) return;
  const H = st['thigh.near'].pos, K = st['shin.near'].pos, L = Math.hypot(K[0] - H[0], K[1] - H[1]), u = [(K[0] - H[0]) / L, (K[1] - H[1]) / L];
  const fw = Math.max(0, Math.min(1, (u[0] - 0.3) / 0.4));   // the thigh forward of straight down (cos 72° → 46°)
  if (!fw) return;
  const n = [u[1], -u[0]], g = dress.geom;   // n: up off the thigh's axis (the thigh points forward: u[0] > 0)
  for (const i of REST.idx) {
    const q = g.P[i], t = (q[0] - H[0]) * u[0] + (q[1] - H[1]) * u[1], h = (q[0] - H[0]) * n[0] + (q[1] - H[1]) * n[1];
    if (t < 0 || t > 0.95 * L || h > -REST.sink) continue;   // (past the knee the bump hangs free between the knees)
    const d = (-REST.sink - h) * fw, m = [n[0] * d, n[1] * d];
    for (const A of [g.P, g.hin, g.hout]) A[i] = [A[i][0] + m[0], A[i][1] + m[1]];
  }
}

/** The small of her back CURVES IN as her hips flex (leaning on a counter, sitting, squatting, bending): the pelvis tips
 *  forward under the trunk and the lumbar arches, so the back of a stretch dress dips in at the waist between her shoulder
 *  blades and the round of her buttocks. Drawn straight, the back ran in one line from the shoulder blade to the seat
 *  (critic R1, every pose: "a box, a tent or a cape… no lumbar curve, no buttocks under it"). The bodice's back waist
 *  (and the skirt that hangs from it) moves in along the trunk's forward normal by up to LORD.depth H, the blade a little;
 *  by the trunk's forward pitch (LORD.from° → LORD.to°): standing, kneeling up and sitting upright, LORD.base only. */
// (LORD.base, every pose: a pregnant woman's lumbar curves in even standing and kneeling up, the bump's weight carried by
// the arch; the side-on critics, round 4: "the back a ruler from the shoulder blade to the hem", the kneeling still "dips
// in ~25 px at the waist and rounds over the seat". The master's waist sits 0.08 H in from its seat; this makes it 0.14)
// (0.06 → 0.02, round 6: the seat's round now comes from the skirt fitted over it (parts/skirt.js hug), and upright the
// stills show no hollow below the arm, the back running straight down from the waist and rounding out over the seat as the
// master's does; at 0.06 the waist pinched in under a kneeling or seated arm, a wasp waist)
// (by the TRUNK'S PITCH, not the hips' flexion: leaning forward from the hips (a counter, a squat, picking something up)
// the pelvis tips forward and the lumbar arches; sitting upright the hips flex as far but the pelvis rolls back and the low
// back flattens. By the hips' flexion the seated back dipped 0.15 H in at the waist and the seat ballooned behind it, 0.1 H
// past the ball still's, round 5)
export const LORD = { base: 0.02, depth: 0.09, from: 5, to: 30, w: { 17: 0.6, 18: 1, 19: 0.35 } };
const lordRest = new WeakMap();
export function lumbar(parts, ctx) {
  const dress = parts.find((p) => p.id === 'dress'), { C: char, st, rig } = ctx;
  if (!dress) return;
  if (!lordRest.has(char)) lordRest.set(char, rig.solve({}).spineLower.rot);
  const pitch = st.spineLower.rot - lordRest.get(char), t = Math.max(0, Math.min(1, (pitch - LORD.from) / (LORD.to - LORD.from))), k = LORD.base + LORD.depth * t * t * (3 - 2 * t);
  if (!k) return;
  const M = ctx.st.spineLower.M, n = [M[0], M[1]], l = Math.hypot(...n) || 1, g = dress.geom;   // the trunk's forward direction, posed
  for (const [i, w] of Object.entries(LORD.w)) { const d = [k * w * n[0] / l, k * w * n[1] / l]; for (const A of [g.P, g.hin, g.hout]) A[i] = [A[i][0] + d[0], A[i][1] + d[1]]; }
}

/** The dress turns from her back over the shoulder (anchors 20 → 21 → 22): 21, the strap's end, follows the clavicle and
 *  20, the back, the chest. Reaching forward (a counter, a squat, a toy, on all fours) the clavicle carried 21 down past 20
 *  and the outline doubled back on itself: a spike behind the shoulder (side-on round 5 "strap tabs and hooks"). The back
 *  of the shoulder goes with the shoulder (the blade slides round the ribs as the arm reaches): 20 takes STRAP_W of the
 *  clavicle's move at 21 (kept where the chest carries it, 21 then rose above the strap and hooked over it, round 6). */
const STRAP_W = 0.9;
export function strapBack(parts, ctx) {
  const g = parts.find((p) => p.id === 'dress')?.geom, { st, C: char } = ctx, X = char.params.P;
  if (!g) return;
  const r21 = [X.strap.back[0] + 0.04, X.strap.back[1] + 0.05], M = st.chest.M, J = char.joints.chest;
  const onChest = [M[0] * (r21[0] - J[0]) + M[2] * (r21[1] - J[1]) + M[4], M[1] * (r21[0] - J[0]) + M[3] * (r21[1] - J[1]) + M[5]];
  const d = mulS(sub(g.P[21], onChest), STRAP_W);
  for (const A of [g.P, g.hin, g.hout]) A[20] = add(A[20], d);
}

export function build({ P: C, C: char }) {
  const X = char.params.P, J = char.joints, out = [];
  const N = X.neck, b = X.bump, bk = X.back, st = X.strap, nl = X.neckline;
  // ---- neck: nape top (under the hair) → throat top (under the jaw) → throat → base (inside the chest skin) → nape
  // (the base straight down under the throat, inside the chest skin: swung 0.08 H forward it stood out past the chest skin's
  // front as a little hook at the base of the throat, every pose; side-on round 4 "a hook at the base of the throat")
  out.push(part('neck', 'neck', 26, C.skin, ensureCW(loop([
    [N.napeTop[0], N.napeTop[1], { c: true, t: 0.5 }], [N.throatTop[0] - 0.12, N.napeTop[1] + 0.05], [N.throatTop[0], N.throatTop[1], { a: 95 }],
    [N.front[0] + 0.005, N.front[1], { a: 80 }], [N.front[0] + 0.01, N.front[1] + 0.14], [N.back[0] + 0.02, N.back[1] + 0.14],
    [N.back[0], N.back[1], { a: -80 }], [N.back[0] + 0.03, (N.back[1] + N.napeTop[1]) / 2, { a: -95 }]])),
    { skin: { parent: 'chest', child: 'neck', zone: 0.35 } }));
  // ---- chest skin: from the neck base forward and down to the neckline, back over the shoulder top behind the strap
  out.push(part('chest.skin', 'chest', 24, C.skin, ensureCW(loop([
    [N.front[0], N.front[1] - 0.02, { a: 85 }], [X.chestFront[0], X.chestFront[1], { a: 35 }], [nl.front[0] + 0.01, nl.front[1] + 0.02, { a: 60 }],
    [nl.front[0] - 0.05, nl.front[1] + 0.2], [bk.shoulder[0] + 0.05, nl.front[1] + 0.2], [st.back[0] + 0.1, st.back[1] - 0.01, { a: -35 }], [N.back[0] + 0.05, N.back[1] + 0.02, { a: -60 }]])),
    // (its shoulder end follows the clavicle as the dress's strap end does: left on the chest, it stayed behind when the
    // arm reached forward and showed past the dress's back as a skin knob, side-on round 2 "the far-shoulder knob")
    { skin: { chain: ['spineUpper', 'chest'], zone: 0.3, regions: [{ bone: 'clavicle.near', c: st.top, r: [0.14, 0.3] }] } }));   // the trapezius slopes from INSIDE the neck base onto the strap (at the neck's back line it jutted out as a notch once the neck bent forward) (inside it: the strap and the arm's cap make the shoulder's silhouette, as in the master)
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
    [bot[0], bot[1], { c: true, ai: -60, ti: 0.8, to: 0.5 }],                         // the bump meets the skirt: a soft inner corner
    // below the bump the bodice turns INSIDE her (round the hip joint, up behind the seat to the back waist): the skirt
    // (dress.skirt, character.js postBuild → engine/drape.js) draws the hips, buttocks and skirt in posed space, over this
    ...SKIRT_IN.map((q) => [q[0], q[1]]),
    [bk.waist[0], bk.waist[1], { a: -90 }],
    [bk.blade[0], bk.blade[1], { a: -90 }], [bk.shoulder[0], bk.shoulder[1], { a: -80 }],
    [st.back[0] + 0.04, st.back[1] + 0.05, { a: -55 }],                                // round over the shoulder's back, inside the arm's cap
    [st.top[0] + 0.03, st.top[1] + 0.045, { a: 0 }],                                   // under the strap, inside the arm's cap
    [st.front[0] - 0.08, st.front[1] - 0.02, { a: 18 }],
  ]));
  // the bump's points follow the belly bone (region skin), the rest rides the spine chain
  // and the strap's part of the outline follows the clavicle, as the strap itself does (else the two step apart when the
  // shoulder moves: a ragged tab at the back of the shoulder)
  const bumpC = [apex[0] - 0.25, apex[1]];
  out.push(part('dress', 'chest', 30, C.dress, dressG,
    { skin: { chain: ['pelvis', 'spineLower', 'spineUpper', 'chest'], zone: 0.3, regions: [{ bone: 'belly', c: bumpC, r: [0.35, 0.65] }, { bone: 'clavicle.near', c: st.top, r: [0.14, 0.3] }] } }));
  return out;
}
